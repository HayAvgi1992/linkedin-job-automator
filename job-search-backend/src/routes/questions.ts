import express, { Request, Response } from 'express';

import { UserProfile } from '../models/UserProfile';
import { QuestionAnswer } from '../models/QuestionAnswer';
import { hashQuestion } from '../utils/questionNormalizer';
import { generateAIAnswer } from '../services/aiAnswerService';

const router = express.Router();

// Helper: Get answer from profile for common application fields
function getCommonFieldAnswer(
  question: string,
  profile: any,
  options?: string[]
): { answer: string; confidence: number } | null {
  if (!profile) return null;

  // Common question patterns and their profile field mappings
  const patterns: Array<{
    keywords: string[];
    field: string;
    getValue: (p: any) => string;
  }> = [
    {
      keywords: ['city', 'location', 'where are you located', 'current location'],
      field: 'city',
      getValue: (p) => p.city || '',
    },
    {
      keywords: ['state', 'province'],
      field: 'state',
      getValue: (p) => p.state || '',
    },
    {
      keywords: ['country'],
      field: 'country',
      getValue: (p) => p.country || 'United States',
    },
    {
      keywords: ['phone', 'mobile', 'contact number', 'telephone'],
      field: 'phoneNumber',
      getValue: (p) => p.phoneNumber || '',
    },
    {
      keywords: ['email', 'e-mail'],
      field: 'email',
      getValue: (p) => p.email || '',
    },
    {
      keywords: ['linkedin', 'linkedin profile', 'linkedin url'],
      field: 'linkedInUrl',
      getValue: (p) => p.linkedInUrl || '',
    },
    {
      keywords: ['portfolio', 'website', 'personal site'],
      field: 'portfolioUrl',
      getValue: (p) => p.portfolioUrl || '',
    },
    {
      keywords: ['authorized', 'work authorization', 'legally authorized', 'require sponsorship', 'visa'],
      field: 'workAuthorization',
      getValue: (p) => {
        // Bug 6 fix: Country-aware work authorization
        // If the question mentions a specific country, check if it matches the profile country
        const profileCountry = (p.country || 'United States').toLowerCase();
        const questionLower = question.toLowerCase();

        // Common country patterns in authorization questions
        const countryPatterns: Array<{ keywords: string[]; country: string }> = [
          { keywords: ['united states', 'u.s.', 'us', 'usa'], country: 'united states' },
          { keywords: ['canada', 'canadian'], country: 'canada' },
          { keywords: ['united kingdom', 'uk', 'britain'], country: 'united kingdom' },
          { keywords: ['australia', 'australian'], country: 'australia' },
          { keywords: ['india', 'indian'], country: 'india' },
          { keywords: ['germany', 'german'], country: 'germany' },
        ];

        let questionCountry: string | null = null;
        for (const cp of countryPatterns) {
          if (cp.keywords.some(k => questionLower.includes(k))) {
            questionCountry = cp.country;
            break;
          }
        }

        // If question mentions a specific country that doesn't match profile → return empty (flag for user)
        if (questionCountry && !profileCountry.includes(questionCountry) && !questionCountry.includes(profileCountry)) {
          console.log(`⚠️ Work auth question for "${questionCountry}" but profile country is "${profileCountry}" — flagging for user input`);
          return '';
        }

        return p.workAuthorization || 'Yes';
      },
    },
    {
      keywords: ['start date', 'when can you start', 'availability', 'available to start'],
      field: 'startDate',
      getValue: (p) => p.startDate || 'Immediately',
    },
    {
      keywords: ['years of experience', 'how many years', 'experience with', 'years experience'],
      field: 'yearsExperience',
      getValue: (p) => p.resume?.yearsExperience?.toString() || '',
    },
  ];

  for (const pattern of patterns) {
    const matches = pattern.keywords.some(kw => question.includes(kw));
    if (matches) {
      const value = pattern.getValue(profile);
      if (value) {
        console.log(`📋 Matched profile field "${pattern.field}" for question: "${question.substring(0, 40)}..."`);

        // For select/radio questions, the profile value must match an option.
        // Otherwise skip — returning "phone number" for a Yes/No question is wrong.
        if (options && options.length > 0) {
          const matchedOption = options.find(opt =>
            opt.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(opt.toLowerCase())
          );
          if (matchedOption) {
            return { answer: matchedOption, confidence: 0.95 };
          }
          // Value doesn't match any option — skip this match
          console.log(`⚠️ Profile field "${pattern.field}" value "${value}" doesn't match options [${options.join(', ')}] — skipping`);
          continue;
        }

        return { answer: value, confidence: 0.95 };
      }
    }
  }

  return null;
}

// Get all stored questions for a user
router.get('/questions/:visitorId', async (req: Request, res: Response) => {
  try {
    const { visitorId } = req.params;
    const questions = await QuestionAnswer.find({ visitorId }).sort({ lastUsedAt: -1 });

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error('Get questions error:', error.message);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Lookup answer for a question (used during auto-apply)
router.post('/questions/lookup', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, options } = req.body;

    if (!visitorId || !questionText) {
      return res.status(400).json({ error: 'visitorId and questionText are required' });
    }

    // Get user profile first - needed for common field lookups
    const profile = await UserProfile.findOne({ visitorId });
    const normalizedQuestion = questionText.toLowerCase().trim();
    const qHash = hashQuestion(questionText);
    const hasOptions = options && options.length > 0;

    // ---- Step 1: Always check stored answers first (user-provided are most reliable) ----
    const existing = await QuestionAnswer.findOne({
      visitorId,
      questionHash: qHash,
    });

    if (existing) {
      // For select fields, validate stored answer matches an option
      if (hasOptions) {
        const matchedOption = options!.find((opt: string) =>
          opt.toLowerCase() === existing.answer.toLowerCase() ||
          opt.toLowerCase().includes(existing.answer.toLowerCase()) ||
          existing.answer.toLowerCase().includes(opt.toLowerCase())
        );
        if (matchedOption) {
          existing.timesUsed += 1;
          existing.lastUsedAt = new Date();
          await existing.save();
          console.log(`✅ Found stored answer for: "${questionText.substring(0, 50)}..." → "${matchedOption}"`);
          return res.json({ success: true, found: true, answer: matchedOption, source: existing.answerSource });
        }
        // Stored answer doesn't match options — skip it, try AI
        console.log(`⚠️ Stored answer "${existing.answer}" doesn't match options [${options!.join(', ')}] — skipping`);
      } else {
        existing.timesUsed += 1;
        existing.lastUsedAt = new Date();
        await existing.save();
        console.log(`✅ Found stored answer for: "${questionText.substring(0, 50)}..."`);
        return res.json({ success: true, found: true, answer: existing.answer, source: existing.answerSource });
      }
    }

    // ---- Step 2: For non-select fields, try profile field matching ----
    // For select/radio with options, skip — the greedy keyword matcher returns
    // garbage like phone numbers for Yes/No questions. Let the AI handle these.
    if (!hasOptions) {
      const commonFieldAnswer = getCommonFieldAnswer(normalizedQuestion, profile, options);
      if (commonFieldAnswer) {
        console.log(`📋 Found common field answer for: "${questionText.substring(0, 50)}..."`);
        return res.json({
          success: true,
          found: true,
          answer: commonFieldAnswer.answer,
          source: 'profile',
          confidence: commonFieldAnswer.confidence,
        });
      }
    }

    // ---- Step 3: AI generation (always gets options for select fields) ----
    console.log(`🤖 Generating AI response for: "${questionText.substring(0, 50)}..."${hasOptions ? ` with options [${options!.join(', ')}]` : ''}`);

    const previousAnswers = await QuestionAnswer.find({ visitorId }).limit(10);

    const aiResult = await generateAIAnswer(
      questionText,
      questionType || 'text',
      profile?.resume ? {
        rawText: profile.resume.rawText,
        skills: profile.resume.skills,
        yearsExperience: profile.resume.yearsExperience,
      } : null,
      previousAnswers,
      options
    );

    // For select fields, validate AI answer matches an option
    let finalAnswer = aiResult.answer;
    if (hasOptions && finalAnswer) {
      const matchedOption = options!.find((opt: string) =>
        opt.toLowerCase() === finalAnswer.toLowerCase() ||
        opt.toLowerCase().includes(finalAnswer.toLowerCase()) ||
        finalAnswer.toLowerCase().includes(opt.toLowerCase())
      );
      if (matchedOption) {
        finalAnswer = matchedOption; // Use exact option text
      } else {
        console.log(`⚠️ AI answer "${finalAnswer}" doesn't match options [${options!.join(', ')}] — returning first option as fallback`);
        // Don't return garbage — let the extension ask the user
        finalAnswer = '';
      }
    }

    res.json({
      success: true,
      found: false,
      suggestedAnswer: finalAnswer,
      confidence: finalAnswer ? aiResult.confidence : 0,
      reasoning: aiResult.reasoning,
      source: 'ai',
    });
  } catch (error: any) {
    console.error('Question lookup error:', error.message);
    res.status(500).json({ error: 'Failed to lookup question' });
  }
});

// Save a new question-answer pair
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, answer, answerSource } = req.body;

    if (!visitorId || !questionText || !answer) {
      return res.status(400).json({ error: 'visitorId, questionText, and answer are required' });
    }

    const qHash = hashQuestion(questionText);

    // Upsert - update if exists, create if not
    const result = await QuestionAnswer.findOneAndUpdate(
      { visitorId, questionHash: qHash },
      {
        $set: {
          questionText,
          questionType: questionType || 'text',
          answer,
          answerSource: answerSource || 'user',
          lastUsedAt: new Date(),
        },
        $inc: { timesUsed: 1 },
        $setOnInsert: {
          visitorId,
          questionHash: qHash,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    console.log(`💾 Saved answer for: "${questionText.substring(0, 50)}..."`);
    res.json({ success: true, question: result });
  } catch (error: any) {
    console.error('Save question error:', error.message);
    res.status(500).json({ error: 'Failed to save question' });
  }
});

// Delete a stored question
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await QuestionAnswer.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete question error:', error.message);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Bulk lookup for multiple questions (used during auto-apply)
router.post('/questions/bulk-lookup', async (req: Request, res: Response) => {
  try {
    const { visitorId, questions } = req.body;

    if (!visitorId || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'visitorId and questions array are required' });
    }

    const profile = await UserProfile.findOne({ visitorId });
    const previousAnswers = await QuestionAnswer.find({ visitorId }).limit(20);

    const results: Record<string, { answer: string; source: string; confidence: number }> = {};

    for (const q of questions) {
      const qHash = hashQuestion(q.text);

      // Check for stored answer
      const existing = await QuestionAnswer.findOne({ visitorId, questionHash: qHash });

      if (existing) {
        results[q.text] = {
          answer: existing.answer,
          source: 'stored',
          confidence: 1.0,
        };
        // Update usage
        existing.timesUsed += 1;
        existing.lastUsedAt = new Date();
        await existing.save();
      } else {
        // Generate AI answer
        const aiResult = await generateAIAnswer(
          q.text,
          q.type || 'text',
          profile?.resume ? {
            rawText: profile.resume.rawText,
            skills: profile.resume.skills,
            yearsExperience: profile.resume.yearsExperience,
          } : null,
          previousAnswers,
          q.options
        );

        results[q.text] = {
          answer: aiResult.answer,
          source: 'ai',
          confidence: aiResult.confidence,
        };
      }
    }

    res.json({ success: true, answers: results });
  } catch (error: any) {
    console.error('Bulk lookup error:', error.message);
    res.status(500).json({ error: 'Failed to lookup questions' });
  }
});

export const questionRoutes = router;

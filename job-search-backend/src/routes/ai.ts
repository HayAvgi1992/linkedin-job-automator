import express, { Request, Response } from 'express';

import { UserProfile } from '../models/UserProfile';
import { QuestionAnswer } from '../models/QuestionAnswer';
import { generateAIAnswer } from '../services/aiAnswerService';

const router = express.Router();

// Generate AI answer for a question
router.post('/ai/answer', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, options } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    // Get user profile for context
    const profile = visitorId ? await UserProfile.findOne({ visitorId }) : null;
    const previousAnswers = visitorId
      ? await QuestionAnswer.find({ visitorId }).limit(10)
      : [];

    const result = await generateAIAnswer(
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

    res.json({
      success: true,
      answer: result.answer,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  } catch (error: any) {
    console.error('AI answer error:', error.message);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

export const aiRoutes = router;

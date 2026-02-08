import { IQuestionAnswer } from '../models/QuestionAnswer';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ResumeData {
  rawText: string;
  skills: string[];
  yearsExperience: number;
}

interface AIAnswerResult {
  answer: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Generate an answer for a job application question using OpenAI
 */
export async function generateAIAnswer(
  question: string,
  questionType: string,
  resume: ResumeData | null,
  previousAnswers: IQuestionAnswer[],
  options?: string[]
): Promise<AIAnswerResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

const systemPrompt = `
You are a job application assistant answering form questions.

Context:
- Question types may be: numeric, yes_no, dropdown, or free_text.

Rules:
- Use resume + previous answers only
- numeric → return only the number
- yes_no → return exactly "Yes" or "No"
- dropdown → return ONE option exactly as provided
- free_text → concise, professional
- If data is missing, make a reasonable professional assumption

Return STRICT JSON only:
{"answer":string,"confidence":number,"reasoning":string}
`;


  let userPrompt = '';

  if (resume) {
    userPrompt += `CANDIDATE RESUME:
Skills: ${resume.skills.join(', ')}
Years of Experience: ${resume.yearsExperience}
Full Resume Text: ${resume.rawText.substring(0, 2000)}...

`;
  }

  if (previousAnswers.length > 0) {
    userPrompt += `PREVIOUS ANSWERS (for consistency):
${previousAnswers.slice(0, 5).map(a => `Q: ${a.questionText}\nA: ${a.answer}`).join('\n\n')}

`;
  }

  userPrompt += `QUESTION TO ANSWER:
Type: ${questionType}
Question: ${question}`;

  if (options && options.length > 0) {
    userPrompt += `\nOptions: ${options.join(', ')}`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const result = JSON.parse(content);

    return {
      answer: result.answer,
      confidence: result.confidence ?? 0.7,
      reasoning: result.reasoning,
    };
  } catch (error: any) {
    console.error('AI answer generation error:', error.message);

    // Return a low-confidence default
    return {
      answer: '',
      confidence: 0,
      reasoning: 'Failed to generate answer',
    };
  }
}

/**
 * Parse resume text to extract structured data
 */
export async function parseResumeWithAI(resumeText: string): Promise<{
  skills: string[];
  yearsExperience: number;
}> {
  if (!OPENAI_API_KEY) {
    // Fallback to basic parsing
    return basicResumeParse(resumeText);
  }

  const prompt = `Extract key information from this resume:

${resumeText.substring(0, 4000)}

Return JSON only:
{
  "skills": ["skill1", "skill2", ...],
  "yearsExperience": <total years as number>
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return basicResumeParse(resumeText);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      const parsed = JSON.parse(content);
      return {
        skills: parsed.skills || [],
        yearsExperience: parsed.yearsExperience || 0,
      };
    }
  } catch (error) {
    console.error('Resume parsing error:', error);
  }

  return basicResumeParse(resumeText);
}

/**
 * Basic resume parsing without AI
 */
function basicResumeParse(text: string): { skills: string[]; yearsExperience: number } {
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'nodejs',
    'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'postgresql', 'git',
    'html', 'css', 'vue', 'angular', 'express', 'fastapi', 'django', 'flask',
    'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'machine learning', 'ai', 'deep learning', 'tensorflow', 'pytorch',
  ];

  const textLower = text.toLowerCase();
  const skills = commonSkills.filter(skill => textLower.includes(skill.toLowerCase()));

  // Try to extract years of experience
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
  const yearsExperience = yearsMatch ? parseInt(yearsMatch[1], 10) : 2;

  return { skills, yearsExperience };
}

import { IQuestionAnswer } from '../models/QuestionAnswer';

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
 * Strip markdown code block wrappers from OpenAI responses.
 * OpenAI sometimes returns ```json\n{...}\n``` instead of raw JSON.
 */
function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  return match ? match[1].trim() : raw.trim();
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

const systemPrompt = `
You are a job application assistant answering form questions.

Rules:
- Use resume + previous answers to determine the best answer
- If Options are provided, you MUST return one of the exact option values — never paraphrase or return indices
- For numeric questions (years of experience, salary), return ONLY the number (e.g. "3", "95000")
- For yes/no or select questions with Options, pick the most appropriate option based on the candidate's resume
- For free text, be concise and professional (1-2 sentences max)
- If unsure, make a reasonable professional assumption — never return empty

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
    userPrompt += `\nAvailable Options (you MUST pick exactly one of these): ${options.join(', ')}`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    // Parse JSON response (strip markdown wrappers if present)
    const result = JSON.parse(extractJSON(content));

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
  if (!process.env.OPENAI_API_KEY) {
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
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
      const parsed = JSON.parse(extractJSON(content));
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

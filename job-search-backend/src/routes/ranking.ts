import express, { Request, Response } from 'express';
import { UserProfile } from '../models/UserProfile';

const router = express.Router();

interface RankJobInput {
  jobId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: { min: number; max: number };
}

interface JobScore {
  jobId: string;
  overall: number;
  skills: number;
  experience: number;
  fit: number;
  reasoning: string;
}

function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  return match ? match[1].trim() : raw.trim();
}

router.post('/jobs/rank', async (req: Request, res: Response) => {
  try {
    const { visitorId, jobs } = req.body as { visitorId: string; jobs: RankJobInput[] };

    if (!visitorId || !jobs?.length) {
      return res.status(400).json({ error: 'visitorId and jobs array required' });
    }

    const profile = await UserProfile.findOne({ visitorId });
    if (!profile?.resume?.rawText) {
      return res.json({ success: true, scores: [] });
    }

    const resumeContext = `Skills: ${profile.resume.skills?.join(', ') || 'N/A'}
Years of Experience: ${profile.resume.yearsExperience || 'N/A'}
Resume: ${profile.resume.rawText.substring(0, 2000)}`;

    const jobList = jobs.map((j, i) =>
      `[Job ${i + 1}] ID: ${j.jobId}
Title: ${j.title} at ${j.company} (${j.location})${j.salary ? ` | $${j.salary.min}-${j.salary.max}` : ''}
Description: ${j.description.substring(0, 2000)}`
    ).join('\n\n');

    const systemPrompt = `You are a job matching assistant. Score how well a candidate matches each job posting.

For each job, provide:
- skills: 0-100 (how well candidate's skills match job requirements)
- experience: 0-100 (how well candidate's experience level matches)
- fit: 0-100 (overall cultural/role fit based on description)
- reasoning: one sentence explaining the score

Return STRICT JSON array only:
[{"jobId":"string","skills":number,"experience":number,"fit":number,"reasoning":"string"},...]`;

    const userPrompt = `CANDIDATE RESUME:\n${resumeContext}\n\nJOBS TO SCORE:\n${jobList}`;

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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI ranking error:', await response.text());
      return res.json({ success: true, scores: [] });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return res.json({ success: true, scores: [] });
    }

    const parsed = JSON.parse(extractJSON(content)) as Array<{
      jobId: string; skills: number; experience: number; fit: number; reasoning: string;
    }>;

    const scores: JobScore[] = parsed.map(p => ({
      jobId: p.jobId,
      skills: Math.min(100, Math.max(0, p.skills || 0)),
      experience: Math.min(100, Math.max(0, p.experience || 0)),
      fit: Math.min(100, Math.max(0, p.fit || 0)),
      overall: Math.round((p.skills || 0) * 0.4 + (p.experience || 0) * 0.3 + (p.fit || 0) * 0.3),
      reasoning: p.reasoning || '',
    }));

    console.log(`🎯 Ranked ${scores.length} jobs for visitor ${visitorId.substring(0, 8)}...`);
    res.json({ success: true, scores });
  } catch (error: any) {
    console.error('Ranking error:', error.message);
    res.json({ success: true, scores: [] });
  }
});

export const rankingRoutes = router;

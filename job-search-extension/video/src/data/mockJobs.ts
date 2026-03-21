export interface MockJob {
  title: string;
  company: string;
  salary: { min: number; max: number; confidence: number; source: string };
  location: string;
  remote: boolean;
  matchScore?: { overall: number; skills: number; experience: number; fit: number; reasoning: string };
  easyApply: boolean;
}

export const mockJobs: MockJob[] = [
  {
    title: "Senior Frontend Engineer",
    company: "Stripe",
    salary: { min: 180000, max: 220000, confidence: 0.98, source: "linkedin" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 94, skills: 92, experience: 88, fit: 97,
      reasoning: "Strong React/TypeScript match, 5+ years aligns with senior role" },
    easyApply: true,
  },
  {
    title: "Full Stack Developer",
    company: "Vercel",
    salary: { min: 160000, max: 200000, confidence: 0.90, source: "coresignal" },
    location: "San Francisco, CA",
    remote: false,
    matchScore: { overall: 87, skills: 90, experience: 82, fit: 85,
      reasoning: "Next.js expertise valued, location flexible" },
    easyApply: true,
  },
  {
    title: "React Engineer",
    company: "Linear",
    salary: { min: 170000, max: 210000, confidence: 0.80, source: "openai" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 72, skills: 78, experience: 70, fit: 65,
      reasoning: "Good technical fit, less experience with desktop apps" },
    easyApply: true,
  },
  {
    title: "Software Engineer II",
    company: "Notion",
    salary: { min: 150000, max: 190000, confidence: 0.75, source: "algorithm" },
    location: "New York, NY",
    remote: false,
    matchScore: { overall: 65, skills: 72, experience: 60, fit: 58,
      reasoning: "Solid skills but role requires more backend focus" },
    easyApply: true,
  },
  {
    title: "Frontend Developer",
    company: "Figma",
    salary: { min: 140000, max: 175000, confidence: 0.90, source: "coresignal" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 45, skills: 50, experience: 42, fit: 40,
      reasoning: "Canvas/WebGL heavy — different specialization" },
    easyApply: true,
  },
  {
    title: "UI Engineer",
    company: "Shopify",
    salary: { min: 130000, max: 165000, confidence: 0.80, source: "openai" },
    location: "Toronto, ON",
    remote: false,
    matchScore: { overall: 38, skills: 45, experience: 35, fit: 30,
      reasoning: "Ruby on Rails stack, limited frontend React scope" },
    easyApply: false,
  },
  {
    title: "Platform Engineer",
    company: "Datadog",
    salary: { min: 155000, max: 195000, confidence: 0.75, source: "algorithm" },
    location: "Boston, MA",
    remote: false,
    easyApply: true,
  },
  {
    title: "Staff Engineer",
    company: "Airbnb",
    salary: { min: 210000, max: 280000, confidence: 0.98, source: "linkedin" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 82, skills: 85, experience: 78, fit: 80,
      reasoning: "Strong overall fit, experience level slightly under staff bar" },
    easyApply: true,
  },
];

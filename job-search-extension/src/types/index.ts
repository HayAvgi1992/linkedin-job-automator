export interface Job {
  linkedinJobId: string;
  title: string;
  company: {
    name: string;
    linkedinUrl: string;
  };
  location: {
    city: string;
    remote: boolean;
  };
  postedDate: Date;
  description: string;
  applicants: number;
  easyApply?: boolean;
  salary?: {
    min: number;
    max: number;
    confidence: number;
    source?: string; // 'linkedin', 'coresignal', 'openai', 'algorithm'
  };
}

export type JobStatus = 'queued' | 'saved' | 'applying' | 'applied' | 'failed' | 'rejected' | 'skipped';

export interface ProfileSettings {
  city: string;
  state: string;
  country: string;
  phoneNumber: string;
  email: string;
  workAuthorization: string;
  startDate: string;
}

export interface ResumeInfo {
  fileName: string;
  skills: string[];
  yearsExperience: number;
}

export interface SavedQuestion {
  _id: string;
  questionText: string;
  answer: string;
  timesUsed: number;
}

export interface MissingInputState {
  field: string;
  type: string;
  options?: string[];
  tabId: number;
  jobTitle: string;
  jobId?: string;
}

export interface BulkApplyProgress {
  current: number;
  total: number;
}

export interface BulkApplyJobResult {
  jobId: string;
  title: string;
  company: string;
  status: 'pending' | 'applying' | 'applied' | 'failed' | 'skipped' | 'cancelled';
  error?: string;
  duration?: number;
}

export interface BulkApplyState {
  isRunning: boolean;
  shouldStop: boolean;
  currentIndex: number;
  total: number;
  currentJobId: string;
  currentJobTitle: string;
  currentJobCompany: string;
  startedAt: number;
  results: BulkApplyJobResult[];
}

export type AutoApplyStatus = 'idle' | 'running' | 'paused';
export type JobFilter = 'queue' | 'saved' | 'applied';
export type ViewType = 'search' | 'jobs' | 'autoApply';

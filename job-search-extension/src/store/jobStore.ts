import { create } from 'zustand';
import type { Job, JobStatus, JobFilter } from '../types';

interface JobState {
  jobs: Job[];
  jobStatuses: Record<string, JobStatus>;
  hydrated: boolean;
  enriching: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setEnriching: (enriching: boolean) => void;
  setJobs: (jobs: Job[]) => void;
  addJobs: (jobs: Job[]) => void;
  updateJobSalary: (jobId: string, salary: Job['salary']) => void;
  updateJobsSalary: (updates: Array<{ id: string; salary: Job['salary'] }>) => void;
  updateStatus: (jobId: string, status: JobStatus) => void;
  toggleSave: (jobId: string) => void;
  markApplied: (jobId: string) => void;
  markRejected: (jobId: string) => void;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;
  getFilteredJobs: (filter: JobFilter) => Job[];
  getJobStatus: (jobId: string) => JobStatus;
}

// Write tracking: stamp each local write with a unique ID so the onChanged
// listener can distinguish our own echoes from external writes (background).
// The old pendingWrites counter could misattribute background writes as echoes
// when events arrived interleaved. Stamps are 1:1 with the write that caused them.
let writeStamp = 0;
const pendingStamps = new Set<number>();

// Debounced persistence for bulk updates (salary, search results)
let persistTimeout: ReturnType<typeof setTimeout> | null = null;
function persistDebounced(jobs: Job[], jobStatuses: Record<string, JobStatus>) {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    const stamp = ++writeStamp;
    pendingStamps.add(stamp);
    chrome.storage.local.set({ jobs, jobStatuses, _jobStoreStamp: stamp });
  }, 300);
}

// Immediate persistence for critical status changes (applied, rejected, saved)
// These must survive popup closure — no debounce
function persistNow(jobs: Job[], jobStatuses: Record<string, JobStatus>) {
  if (persistTimeout) clearTimeout(persistTimeout);
  const stamp = ++writeStamp;
  pendingStamps.add(stamp);
  chrome.storage.local.set({ jobs, jobStatuses, _jobStoreStamp: stamp });
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  jobStatuses: {},
  hydrated: false,
  enriching: false,

  setEnriching: (enriching) => set({ enriching }),

  hydrate: async () => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.get(
        ['jobs', 'jobStatuses', 'savedJobs', 'appliedJobs', 'rejectedJobs', 'viewedJobs', 'cachedJobs'],
        (result: Record<string, any>) => {
          // Check for new format first
          if (result.jobStatuses && typeof result.jobStatuses === 'object') {
            set({
              jobs: (result.jobs as Job[]) || [],
              jobStatuses: result.jobStatuses as Record<string, JobStatus>,
              hydrated: true,
            });
            resolve();
            return;
          }

          // Migration from old format: separate arrays → unified jobStatuses map
          const statuses: Record<string, JobStatus> = {};
          const oldApplied = (result.appliedJobs as string[]) || [];
          const oldSaved = (result.savedJobs as string[]) || [];
          const oldRejected = (result.rejectedJobs as string[]) || [];

          // Applied takes priority over saved
          for (const id of oldApplied) statuses[id] = 'applied';
          for (const id of oldSaved) {
            if (!statuses[id]) statuses[id] = 'saved';
          }
          for (const id of oldRejected) statuses[id] = 'rejected';

          const jobs = (result.cachedJobs as Job[]) || [];

          // Persist new format and clean up old keys
          chrome.storage.local.set({ jobs, jobStatuses: statuses });
          chrome.storage.local.remove(['savedJobs', 'appliedJobs', 'rejectedJobs', 'viewedJobs', 'cachedJobs']);

          set({ jobs, jobStatuses: statuses, hydrated: true });
          resolve();
        }
      );
    });
  },

  setJobs: (newJobs) => {
    // Dedup by linkedinJobId, keep existing statuses
    const seen = new Set<string>();
    const deduped: Job[] = [];
    for (const job of newJobs) {
      if (job.linkedinJobId && !seen.has(job.linkedinJobId)) {
        seen.add(job.linkedinJobId);
        // Skip rejected jobs
        if (get().jobStatuses[job.linkedinJobId] !== 'rejected') {
          deduped.push(job);
        }
      }
    }
    set({ jobs: deduped });
    persistDebounced(deduped, get().jobStatuses);
  },

  addJobs: (newJobs) => {
    const { jobs, jobStatuses } = get();
    const existingIds = new Set(jobs.map(j => j.linkedinJobId));
    const unique = newJobs.filter(
      j => j.linkedinJobId && !existingIds.has(j.linkedinJobId) && jobStatuses[j.linkedinJobId] !== 'rejected'
    );
    if (unique.length === 0) return;
    const updated = [...jobs, ...unique];
    set({ jobs: updated });
    persistDebounced(updated, jobStatuses);
  },

  updateJobSalary: (jobId, salary) => {
    const jobs = get().jobs.map(j =>
      j.linkedinJobId === jobId ? { ...j, salary } : j
    );
    set({ jobs });
    persistDebounced(jobs, get().jobStatuses);
  },

  updateJobsSalary: (updates) => {
    const map = new Map(updates.map(u => [u.id, u.salary]));
    const jobs = get().jobs.map(j => {
      const salary = map.get(j.linkedinJobId);
      return salary ? { ...j, salary } : j;
    });
    set({ jobs });
    persistDebounced(jobs, get().jobStatuses);
  },

  updateStatus: (jobId, status) => {
    const jobStatuses = { ...get().jobStatuses, [jobId]: status };
    set({ jobStatuses });
    persistNow(get().jobs, jobStatuses);
  },

  toggleSave: (jobId) => {
    const current = get().jobStatuses[jobId];
    const newStatus: JobStatus = current === 'saved' ? 'queued' : 'saved';
    const jobStatuses = { ...get().jobStatuses, [jobId]: newStatus };
    set({ jobStatuses });
    persistNow(get().jobs, jobStatuses);
  },

  markApplied: (jobId) => {
    const jobStatuses = { ...get().jobStatuses, [jobId]: 'applied' as JobStatus };
    set({ jobStatuses });
    persistNow(get().jobs, jobStatuses);
  },

  markRejected: (jobId) => {
    const jobStatuses = { ...get().jobStatuses, [jobId]: 'rejected' as JobStatus };
    const jobs = get().jobs.filter(j => j.linkedinJobId !== jobId);
    set({ jobs, jobStatuses });
    persistNow(jobs, jobStatuses);
  },

  removeJob: (jobId) => {
    const jobs = get().jobs.filter(j => j.linkedinJobId !== jobId);
    set({ jobs });
    persistDebounced(jobs, get().jobStatuses);
  },

  clearJobs: () => {
    set({ jobs: [] });
    persistNow([], get().jobStatuses);
  },

  getFilteredJobs: (filter) => {
    const { jobs, jobStatuses } = get();
    switch (filter) {
      case 'saved':
        return jobs.filter(j => jobStatuses[j.linkedinJobId] === 'saved');
      case 'applied':
        return jobs.filter(j => jobStatuses[j.linkedinJobId] === 'applied');
      case 'queue':
      default:
        return jobs.filter(j => {
          const status = jobStatuses[j.linkedinJobId];
          return status !== 'applied' && status !== 'rejected' && status !== 'skipped';
        });
    }
  },

  getJobStatus: (jobId) => {
    return get().jobStatuses[jobId] || 'queued';
  },
}));

// Sync external chrome.storage changes (e.g. from background script) into zustand.
// Uses write stamps to skip echoes of our own writes — only applies truly external changes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const state = useJobStore.getState();
  if (!state.hydrated) return; // Don't sync before initial hydration

  // Check if this event is an echo of our own write by matching the stamp.
  // Background writes don't include _jobStoreStamp, so they always pass through.
  const stamp = changes._jobStoreStamp?.newValue as number | undefined;
  if (stamp != null && pendingStamps.has(stamp)) {
    pendingStamps.delete(stamp);
    console.log('🔇 jobStore: Skipping own write (stamp:', stamp, ')');
    return; // Our own write — skip
  }

  // External change (from background script) — merge into zustand.
  // For jobStatuses, merge rather than replace to avoid clobbering recent local changes.
  if (changes.jobStatuses?.newValue) {
    console.log('📬 jobStore: External jobStatuses change detected. Changed keys:', Object.keys(changes));
    const incoming = changes.jobStatuses.newValue as Record<string, JobStatus>;
    const current = useJobStore.getState().jobStatuses;
    const merged = { ...current };
    let changed = false;
    for (const [id, status] of Object.entries(incoming)) {
      if (current[id] !== status) {
        merged[id] = status;
        changed = true;
      }
    }
    if (changed) {
      useJobStore.setState({ jobStatuses: merged });
    }
  }
  if (changes.jobs?.newValue) {
    useJobStore.setState({ jobs: changes.jobs.newValue as Job[] });
  }
});

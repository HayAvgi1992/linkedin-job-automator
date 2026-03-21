import { create } from 'zustand';
import type { AutoApplyStatus, MissingInputState, BulkApplyProgress, BulkApplyJobResult, BulkApplyState } from '../types';
import { useJobStore } from './jobStore';

interface SingleApplyResult {
  success?: boolean;
  error?: string;
  message?: string;
  needsInput?: { field: string; type: string; options?: string[] };
  tabId?: number;
  jobTitle?: string;
  jobId?: string;
  timestamp?: number;
}

interface AutoApplyState {
  status: AutoApplyStatus;
  message: string;
  missingInput: MissingInputState | null;
  missingInputValue: string;

  // Bulk apply state — synced from chrome.storage (background writes, popup reads)
  bulkProgress: BulkApplyProgress;
  bulkResults: BulkApplyJobResult[];
  bulkStartedAt: number | null;
  shouldStop: boolean;
  currentJobTitle: string;
  currentJobCompany: string;

  // Actions
  setStatus: (status: AutoApplyStatus) => void;
  setMessage: (message: string) => void;
  setMissingInput: (input: MissingInputState | null) => void;
  setMissingInputValue: (value: string) => void;
  setBulkProgress: (progress: BulkApplyProgress) => void;
  syncFromBulkState: (state: BulkApplyState) => void;
  hydrate: () => Promise<void>;
  reset: () => void;
}

export const useAutoApplyStore = create<AutoApplyState>((set, get) => ({
  status: 'idle',
  message: '',
  missingInput: null,
  missingInputValue: '',
  bulkProgress: { current: 0, total: 0 },
  bulkResults: [],
  bulkStartedAt: null,
  shouldStop: false,
  currentJobTitle: '',
  currentJobCompany: '',

  setStatus: (status) => set({ status }),
  setMessage: (message) => set({ message }),
  setMissingInput: (input) => set({ missingInput: input }),
  setMissingInputValue: (value) => set({ missingInputValue: value }),
  setBulkProgress: (progress) => set({ bulkProgress: progress }),

  syncFromBulkState: (state: BulkApplyState) => {
    const updates: Partial<AutoApplyState> = {
      bulkProgress: { current: state.currentIndex, total: state.total },
      bulkResults: state.results,
      bulkStartedAt: state.startedAt,
      shouldStop: state.shouldStop,
      currentJobTitle: state.currentJobTitle,
      currentJobCompany: state.currentJobCompany,
    };

    if (state.isRunning) {
      updates.status = 'running';
      if (state.currentJobTitle) {
        updates.message = `Applying to ${state.currentJobTitle} (${state.currentIndex}/${state.total})...`;
      }
    } else if (get().status === 'running' && state.total > 0) {
      // Bulk apply just finished
      const applied = state.results.filter(r => r.status === 'applied').length;
      const failed = state.results.filter(r => r.status === 'failed').length;
      const skipped = state.results.filter(r => r.status === 'skipped').length;
      const cancelled = state.results.filter(r => r.status === 'cancelled').length;

      const parts = [`${applied} applied`];
      if (failed > 0) parts.push(`${failed} failed`);
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (cancelled > 0) parts.push(`${cancelled} cancelled`);

      updates.status = 'idle';
      updates.message = `Bulk apply complete: ${parts.join(', ')}`;
    }

    set(updates);
  },

  hydrate: async () => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.get(['bulkApplyState', 'lastSingleApplyResult'], (result: Record<string, any>) => {
        const bulkState = result.bulkApplyState as BulkApplyState | undefined;
        if (bulkState) {
          get().syncFromBulkState(bulkState);
        }

        // Restore single-apply state from background
        const singleResult = result.lastSingleApplyResult as SingleApplyResult | undefined;
        if (singleResult?.needsInput) {
          set({
            missingInput: {
              field: singleResult.needsInput.field,
              type: singleResult.needsInput.type,
              options: singleResult.needsInput.options,
              tabId: singleResult.tabId!,
              jobTitle: singleResult.jobTitle || 'Job',
              jobId: singleResult.jobId,
            },
            status: 'paused',
            message: `Need input: ${singleResult.needsInput.field}`,
          });
        } else if (singleResult?.success) {
          set({
            status: 'idle',
            message: `Applied to ${singleResult.jobTitle || 'job'}!`,
          });
          // Clean up — result has been consumed
          chrome.storage.local.remove('lastSingleApplyResult');
        } else if (singleResult?.error) {
          set({
            status: 'idle',
            message: `Failed: ${singleResult.error}`,
          });
          chrome.storage.local.remove('lastSingleApplyResult');
        }

        resolve();
      });
    });
  },

  reset: () => set({
    status: 'idle',
    message: '',
    missingInput: null,
    missingInputValue: '',
    bulkProgress: { current: 0, total: 0 },
    bulkResults: [],
    bulkStartedAt: null,
    shouldStop: false,
    currentJobTitle: '',
    currentJobCompany: '',
  }),
}));

// Sync bulk apply state from chrome.storage (background writes it)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.bulkApplyState?.newValue) {
    useAutoApplyStore.getState().syncFromBulkState(changes.bulkApplyState.newValue as BulkApplyState);
  }

  // Single apply result from background
  if (changes.lastSingleApplyResult?.newValue) {
    const result = changes.lastSingleApplyResult.newValue as SingleApplyResult;
    console.log('📬 autoApplyStore: Received lastSingleApplyResult via onChanged:', JSON.stringify(result));
    const store = useAutoApplyStore.getState();

    if (result.needsInput) {
      store.setMissingInput({
        field: result.needsInput.field,
        type: result.needsInput.type,
        options: result.needsInput.options,
        tabId: result.tabId!,
        jobTitle: result.jobTitle || 'Job',
        jobId: result.jobId,
      });
      store.setMessage(`Need input: ${result.needsInput.field}`);
      store.setStatus('paused');
    } else if (result.success) {
      if (result.jobId) {
        useJobStore.getState().markApplied(result.jobId);
      }
      store.setMessage(`Applied to ${result.jobTitle || 'job'}!`);
      store.setStatus('idle');
      chrome.storage.local.remove('lastSingleApplyResult');
    } else if (result.error) {
      store.setMessage(`Failed: ${result.error}`);
      store.setStatus('idle');
      chrome.storage.local.remove('lastSingleApplyResult');
    }
  }
});

import { useJobStore } from '../store/jobStore';
import { useProfileStore } from '../store/profileStore';
import { useAutoApplyStore } from '../store/autoApplyStore';
import { useQuestionStore } from '../store/questionStore';
import type { Job } from '../types';

export function useAutoApply() {
  const { visitorId } = useProfileStore();
  const store = useAutoApplyStore();
  const { loadQuestions } = useQuestionStore();

  /**
   * Apply to the job on the currently active LinkedIn tab.
   * Routed through background to survive popup closure (fixes Bug 2).
   */
  const startAutoApply = async () => {
    store.setStatus('running');
    store.setMessage('Starting auto-apply...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'autoApplyCurrentTab',
        visitorId,
      });

      if (response?.needsInput) {
        store.setMissingInput({
          field: response.needsInput.field,
          type: response.needsInput.type,
          options: response.needsInput.options,
          tabId: response.tabId,
          jobTitle: 'Current Job',
        });
        store.setMessage(`Need input: ${response.needsInput.field}`);
        store.setStatus('paused');
        return;
      }

      if (response?.success) {
        store.setMessage(`Applied successfully! Answered ${response.questionsAnswered || 0} questions.`);
        loadQuestions(visitorId);
      } else {
        store.setMessage('Failed: ' + (response?.error || 'Unknown error'));
      }
    } catch (err: any) {
      // Popup may have closed mid-operation — background still completes.
      // On next open, hydrate picks up the result via lastSingleApplyResult.
      store.setMessage('Error: ' + err.message);
    } finally {
      if (useAutoApplyStore.getState().status !== 'paused') {
        useAutoApplyStore.getState().setStatus('idle');
      }
    }
  };

  /**
   * Apply to a specific job by opening a new tab.
   * Fire-and-forget: background manages the full tab lifecycle and writes
   * results to chrome.storage.local. The popup picks up state changes via
   * the autoApplyStore onChanged listener (same pattern as bulk apply).
   */
  const applyToJob = (job: Job) => {
    if (!job.easyApply) {
      chrome.tabs.create({ url: `https://www.linkedin.com/jobs/view/${job.linkedinJobId}` });
      return;
    }

    store.setStatus('running');
    store.setMessage(`Applying to ${job.title}...`);

    // Fire-and-forget — background writes result to chrome.storage
    chrome.runtime.sendMessage({
      action: 'autoApplyToJob',
      jobId: job.linkedinJobId,
      jobTitle: job.title,
      visitorId,
    });
  };

  /**
   * Start bulk auto-apply.
   * Sends the job list to background and returns immediately.
   * Background does all the work, popup syncs via chrome.storage listener.
   * Fixes Bugs 4 and 5.
   */
  const startBulkAutoApply = async () => {
    const { jobs, jobStatuses } = useJobStore.getState();
    const easyApplyJobs = jobs.filter(j => {
      const s = jobStatuses[j.linkedinJobId];
      return j.easyApply && s !== 'applied' && s !== 'rejected' && s !== 'skipped';
    });

    if (easyApplyJobs.length === 0) {
      store.setMessage('No Easy Apply jobs to apply to');
      return;
    }

    store.setStatus('running');
    store.setBulkProgress({ current: 0, total: easyApplyJobs.length });
    store.setMessage(`Starting bulk apply to ${easyApplyJobs.length} jobs...`);

    // Send job list to background — it handles the entire lifecycle
    chrome.runtime.sendMessage({
      action: 'startBulkApply',
      jobs: easyApplyJobs.map(j => ({
        linkedinJobId: j.linkedinJobId,
        title: j.title,
        company: j.company?.name || '',
      })),
      visitorId,
    });
  };

  /**
   * Stop bulk apply gracefully (Bug 6).
   * Sets shouldStop flag — background finishes current job then stops.
   */
  const stopBulkApply = async () => {
    store.setMessage('Stopping after current job...');
    chrome.runtime.sendMessage({ action: 'stopBulkApply' });
  };

  /**
   * Clear bulk apply results (dismiss the summary).
   */
  const clearBulkResults = () => {
    chrome.storage.local.remove('bulkApplyState');
    store.reset();
  };

  /**
   * Submit user's answer for a missing field and resume apply.
   * Fire-and-forget: saves the answer, then routes through background to
   * resume the apply on the open tab. Result comes via chrome.storage.
   */
  const submitMissingInput = async () => {
    const { missingInput, missingInputValue } = store;
    if (!missingInput || !missingInputValue.trim()) return;

    store.setStatus('running');
    store.setMessage('Saving answer and resuming...');
    store.setMissingInput(null);
    store.setMissingInputValue('');

    try {
      // Save the answer to the bank first
      await chrome.runtime.sendMessage({
        action: 'easyApply_saveAnswer',
        visitorId,
        questionText: missingInput.field,
        questionType: missingInput.type,
        answer: missingInputValue.trim(),
        answerSource: 'user',
      });

      // Resume apply via background — fire-and-forget.
      // Pass the user's answer as an override so the content script uses it
      // directly instead of relying on the bank lookup (which can return wrong
      // answers due to fuzzy matching).
      chrome.runtime.sendMessage({
        action: 'resumeApplyOnTab',
        tabId: missingInput.tabId,
        visitorId,
        jobId: missingInput.jobId,
        jobTitle: missingInput.jobTitle,
        previousField: missingInput.field,
        answerOverride: { field: missingInput.field, value: missingInputValue.trim() },
      });
    } catch (err: any) {
      store.setMessage(`Error saving answer: ${err.message}`);
      store.setStatus('idle');
    }
  };

  const cancelMissingInput = () => {
    store.setMissingInput(null);
    store.setMissingInputValue('');
    store.setStatus('idle');
    store.setMessage('Application paused - missing input not provided');
    // Clear the stored result
    chrome.storage.local.remove('lastSingleApplyResult');
  };

  return {
    startAutoApply,
    applyToJob,
    startBulkAutoApply,
    stopBulkApply,
    clearBulkResults,
    submitMissingInput,
    cancelMissingInput,
  };
}

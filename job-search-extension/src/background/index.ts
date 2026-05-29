/**
 * Background Service Worker
 * Manages ALL apply orchestration (single + bulk) — survives popup closure.
 * Syncs state to chrome.storage so popup can read progress on (re)open.
 */

console.log('Job Search Extension - Background Service Worker Started');

const API_BASE = 'http://localhost:3001';

// Delay between bulk apply jobs (ms) — avoids LinkedIn rate limiting
const BULK_APPLY_DELAY = 4000;

// ============================================
// SEND MESSAGE WITH ERROR HANDLING
// ============================================

function sendTabMessage(tabId: number, message: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send easyApply_start to a tab and wait for the content script to send
 * back an easyApply_complete message. This avoids the MV3 message channel
 * timeout that kills long-running sendResponse callbacks.
 */
function sendApplyAndWaitForComplete(
  tabId: number,
  visitorId: string,
  maxWait = 120000,
  answerOverride?: { field: string; value: string },
): Promise<any> {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(listener);
      chrome.tabs.onUpdated.removeListener(tabListener);
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ success: false, error: 'Apply timed out waiting for content script response' });
      }
    }, maxWait);

    // Listen for the completion message from the content script
    function listener(request: any, sender: chrome.runtime.MessageSender) {
      if (request.action === 'easyApply_complete' && sender.tab?.id === tabId) {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(request.result || { success: false, error: 'No result from content script' });
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener);

    // Watch for tab navigating AWAY from /apply/ — means LinkedIn accepted
    // the submission and redirected. The content script is destroyed so it
    // can't send easyApply_complete, but the navigation IS the success signal.
    let wasOnApplyPage = false;
    function tabListener(updatedId: number, info: { url?: string; status?: string }) {
      if (updatedId !== tabId || resolved) return;
      if (info.url?.includes('/apply')) {
        wasOnApplyPage = true;
      } else if (wasOnApplyPage && info.url && !info.url.includes('/apply')) {
        console.log(`✅ Background: Tab ${tabId} navigated away from /apply/ → treating as successful submit`);
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ success: true, questionsAnswered: 0, navigatedAway: true });
        }
      }
    }
    chrome.tabs.onUpdated.addListener(tabListener);

    // Also check current URL to set wasOnApplyPage
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.url?.includes('/apply')) wasOnApplyPage = true;
    });

    // Fire easyApply_start — content script will acknowledge immediately
    // and send easyApply_complete when done
    sendTabMessage(tabId, { action: 'easyApply_start', visitorId, answerOverride });
  });
}

// ============================================
// CONTENT SCRIPT RE-INJECTION (Bug 8)
// ============================================

async function ensureContentScript(tabId: number): Promise<boolean> {
  // Try ping first
  const pong = await sendTabMessage(tabId, { action: 'ping' });
  if (pong?.pong) return true;

  // Content script not responding — try re-injecting
  console.log(`🔧 Background: Re-injecting content script into tab ${tabId}`);
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/index.ts'],
    });
    // Wait for it to initialize
    await new Promise(r => setTimeout(r, 1000));
    const retryPong = await sendTabMessage(tabId, { action: 'ping' });
    return !!retryPong?.pong;
  } catch (err) {
    console.error('❌ Background: Content script re-injection failed:', err);
    return false;
  }
}

// ============================================
// WAIT FOR TAB READY + JOB PAGE RENDERED (Bug 4/5)
// ============================================

type PageState = 'easy_apply' | 'already_applied' | 'external_apply' | 'no_longer_accepting' | 'loading';

interface TabReadyResult {
  ready: boolean;
  pageState: PageState;
}

/** Wait for tab to load AND job page to fully render (not just status=complete) */
function waitForJobPageReady(tabId: number, maxWait = 30000): Promise<TabReadyResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`⏰ Background: Tab ${tabId} page ready timeout after ${maxWait}ms`);
        resolve({ ready: false, pageState: 'loading' });
      }
    }, maxWait);

    const checkPage = async () => {
      if (resolved) return;
      if (Date.now() - startTime > maxWait) return;

      // First ensure content script is available
      const hasContentScript = await ensureContentScript(tabId);
      if (!hasContentScript) {
        if (!resolved) setTimeout(checkPage, 1000);
        return;
      }

      // Now ask content script what's on the page
      const result = await sendTabMessage(tabId, { action: 'easyApply_checkPage' });

      if (result?.ready && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`✅ Background: Tab ${tabId} page ready, state: ${result.pageState} (${Date.now() - startTime}ms)`);
        resolve({ ready: true, pageState: result.pageState });
        return;
      }

      // Not ready yet — retry
      if (!resolved) {
        setTimeout(checkPage, 500);
      }
    };

    // Wait for tab status=complete, then start checking page content
    chrome.tabs.onUpdated.addListener(function listener(updatedId, info) {
      if (updatedId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Give SPA a moment to start rendering
        setTimeout(checkPage, 1000);
      }
    });

    // Also check immediately in case tab is already loaded
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.status === 'complete') {
        setTimeout(checkPage, 500);
      }
    });
  });
}

/** Simple content-script-ready check (for SDUI pages / non-job pages) */
function waitForContentScriptReady(tabId: number, maxWait = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(false); }
    }, maxWait);

    const check = async () => {
      if (resolved) return;
      const ok = await ensureContentScript(tabId);
      if (ok && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(true);
      } else if (!resolved) {
        setTimeout(check, 500);
      }
    };

    chrome.tabs.onUpdated.addListener(function listener(updatedId, info) {
      if (updatedId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(check, 500);
      }
    });

    chrome.tabs.get(tabId, (tab) => {
      if (tab?.status === 'complete') setTimeout(check, 500);
    });
  });
}

// ============================================
// EXTRACT JOB ID FROM URL
// ============================================

function extractJobIdFromUrl(url: string): string | null {
  const match = url.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

// ============================================
// SINGLE JOB APPLY (opens tab, applies, closes tab)
// ============================================

async function handleApplyToJob(
  jobId: string,
  visitorId: string,
): Promise<{ success: boolean; error?: string; questionsAnswered?: number; needsInput?: any; tabId?: number; skipped?: boolean; skipReason?: string }> {
  let tabId: number | undefined;
  let originalTabId: number | undefined;
  try {
    // Record the original active tab so we can focus back to it after apply
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    originalTabId = activeTab?.id;

    const tab = await chrome.tabs.create({
      url: `https://www.linkedin.com/jobs/view/${jobId}`,
      active: true,
    });
    tabId = tab.id;
    if (!tabId) return { success: false, error: 'Failed to open tab' };

    console.log(`🚀 Background: Apply to job ${jobId}, tab ${tabId}`);

    // Bug 4 fix: Wait for FULL page render, not just content script ping
    const pageReady = await waitForJobPageReady(tabId, 30000);

    if (!pageReady.ready) {
      return { success: false, error: 'Page took too long to load' };
    }

    // Bug 7: Handle non-EA and already-applied pages
    if (pageReady.pageState === 'already_applied') {
      return { success: false, skipped: true, skipReason: 'Already applied to this job' };
    }
    if (pageReady.pageState === 'external_apply') {
      return { success: false, skipped: true, skipReason: 'Not Easy Apply (external application)' };
    }
    if (pageReady.pageState === 'no_longer_accepting') {
      return { success: false, error: 'No longer accepting applications' };
    }

    let response = await sendApplyAndWaitForComplete(tabId, visitorId);
    console.log(`🔍 Background: [${jobId}] Initial easyApply_start response:`, JSON.stringify(response));

    // Handle SDUI flow — content script detected the apply form is on a different page
    if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
      console.log(`📋 Background: [${jobId}] SDUI flow, navigating to`, response.navigatingTo);
      await chrome.tabs.update(tabId, { url: response.navigatingTo });
      console.log(`🔍 Background: [${jobId}] Waiting 3s for SDUI page load...`);
      await new Promise(r => setTimeout(r, 3000));

      const applyReady = await waitForContentScriptReady(tabId);
      console.log(`🔍 Background: [${jobId}] SDUI content script ready: ${applyReady}`);
      if (!applyReady) {
        return { success: false, error: 'Apply page took too long to load' };
      }

      response = await sendApplyAndWaitForComplete(tabId, visitorId);
      console.log(`🔍 Background: [${jobId}] SDUI easyApply_start response:`, JSON.stringify(response));
    }

    // Handle needsInput — keep tab open (for single-job flow, modal shows on page via Bug 3)
    if (response?.needsInput) {
      console.log(`🔍 Background: [${jobId}] Needs input: ${response.needsInput.field}`);
      const keepTabId = tabId;
      tabId = undefined; // Don't close tab in finally
      return { ...response, tabId: keepTabId };
    }

    // Update chrome.storage with applied status
    if (response?.success) {
      const result = await chrome.storage.local.get('jobStatuses');
      const jobStatuses = (result.jobStatuses as Record<string, string>) || {};
      jobStatuses[jobId] = 'applied';
      await chrome.storage.local.set({ jobStatuses });
      console.log(`✅ Background: [${jobId}] Marked as applied in storage`);
    } else {
      console.log(`❌ Background: [${jobId}] Apply failed. success=${response?.success}, error=${response?.error}`);
    }

    const finalResult = response || { success: false, error: 'No response from content script' };
    console.log(`🔍 Background: [${jobId}] Final result:`, JSON.stringify(finalResult));
    return finalResult;
  } catch (err: any) {
    console.error('❌ Background: Apply error:', err);
    return { success: false, error: err.message };
  } finally {
    if (tabId) {
      try { await chrome.tabs.remove(tabId); } catch {}
    }
    // Focus back to the tab the user was on before we opened the apply tab
    if (originalTabId) {
      try { await chrome.tabs.update(originalTabId, { active: true }); } catch {}
    }
  }
}

// ============================================
// APPLY ON CURRENT TAB (Bug 2 fix — extracts jobId, persists status)
// ============================================

async function handleApplyOnCurrentTab(
  visitorId: string,
): Promise<any> {
  try {
    const tabs = await chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' });
    const tab = tabs[0];
    if (!tab?.id) return { success: false, error: 'Please open a LinkedIn job page first' };

    // Extract jobId from the current tab URL
    const jobId = tab.url ? extractJobIdFromUrl(tab.url) : null;

    let response = await sendApplyAndWaitForComplete(tab.id, visitorId);

    // Handle SDUI flow
    if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
      console.log('📋 Background: SDUI on current tab, navigating to', response.navigatingTo);
      await chrome.tabs.update(tab.id, { url: response.navigatingTo });
      await new Promise(r => setTimeout(r, 3000));

      const applyReady = await waitForContentScriptReady(tab.id);
      if (!applyReady) return { success: false, error: 'Apply page took too long to load' };

      response = await sendApplyAndWaitForComplete(tab.id, visitorId);
    }

    if (response?.needsInput) {
      return { ...response, tabId: tab.id, jobId };
    }

    // Bug 2 fix: Persist applied status to chrome.storage
    if (response?.success && jobId) {
      const result = await chrome.storage.local.get('jobStatuses');
      const jobStatuses = (result.jobStatuses as Record<string, string>) || {};
      jobStatuses[jobId] = 'applied';
      await chrome.storage.local.set({ jobStatuses });
      console.log(`✅ Background: Current-tab job ${jobId} marked as applied in storage`);
    }

    if (!response) return { success: false, error: 'No response from content script' };
    return { ...response, jobId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// BULK APPLY ORCHESTRATION (Bugs 4, 5, 7, 8)
// ============================================

interface BulkJob {
  linkedinJobId: string;
  title: string;
  company: string;
}

interface BulkApplyStorageState {
  isRunning: boolean;
  shouldStop: boolean;
  currentIndex: number;
  total: number;
  currentJobId: string;
  currentJobTitle: string;
  currentJobCompany: string;
  startedAt: number;
  results: Array<{
    jobId: string;
    title: string;
    company: string;
    status: 'pending' | 'applying' | 'applied' | 'failed' | 'skipped' | 'cancelled';
    error?: string;
    duration?: number;
  }>;
}

let bulkApplyRunning = false;
let shouldStopRequested = false;

(async () => {
  try {
    const { bulkApplyState } = await chrome.storage.local.get('bulkApplyState');
    const state = bulkApplyState as BulkApplyStorageState | undefined;
    if (state?.isRunning && !bulkApplyRunning) {
      state.isRunning = false;
      state.shouldStop = false;
      state.currentJobId = '';
      state.currentJobTitle = '';
      state.currentJobCompany = '';
      await chrome.storage.local.set({ bulkApplyState: state });
      console.warn('🧟 Reconciled zombie bulkApplyState on SW startup');
    }
  } catch {}
})();

async function handleBulkApply(jobs: BulkJob[], visitorId: string): Promise<void> {
  if (bulkApplyRunning) {
    console.warn('⚠️ Bulk apply already running, ignoring request');
    return;
  }
  bulkApplyRunning = true;
  shouldStopRequested = false;

  // Record the original active tab to focus back after all jobs are done
  let originalTabId: number | undefined;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    originalTabId = activeTab?.id;
  } catch {}

  const state: BulkApplyStorageState = {
    isRunning: true,
    shouldStop: false,
    currentIndex: 0,
    total: jobs.length,
    currentJobId: '',
    currentJobTitle: '',
    currentJobCompany: '',
    startedAt: Date.now(),
    results: jobs.map(j => ({
      jobId: j.linkedinJobId,
      title: j.title,
      company: j.company,
      status: 'pending' as const,
    })),
  };

  await chrome.storage.local.set({ bulkApplyState: state });
  console.log(`🚀 Background: Starting bulk apply for ${jobs.length} jobs`);

  try {
  for (let i = 0; i < jobs.length; i++) {
    if (shouldStopRequested) {
      console.log('🛑 Background: Stop signal received, cancelling remaining jobs');
      for (let j = i; j < jobs.length; j++) {
        state.results[j].status = 'cancelled';
      }
      break;
    }

    const job = jobs[i];
    const jobStart = Date.now();

    // Update progress
    state.currentIndex = i + 1;
    state.currentJobId = job.linkedinJobId;
    state.currentJobTitle = job.title;
    state.currentJobCompany = job.company;
    state.results[i].status = 'applying';
    await chrome.storage.local.set({ bulkApplyState: state });

    console.log(`📋 Background: [${i + 1}/${jobs.length}] Opening: ${job.title}`);

    let tabId: number | undefined;
    try {
      // Open tab — active so user can see any modals (Bug 3)
      const tab = await chrome.tabs.create({
        url: `https://www.linkedin.com/jobs/view/${job.linkedinJobId}`,
        active: true,
      });
      tabId = tab.id;

      if (!tabId) {
        state.results[i] = { ...state.results[i], status: 'failed', error: 'Failed to open tab', duration: Date.now() - jobStart };
        await chrome.storage.local.set({ bulkApplyState: state });
        continue;
      }

      // Bug 4 fix: Wait for FULL page render with element detection
      console.log(`📋 Background: [${i + 1}/${jobs.length}] Waiting for page to render...`);
      const pageReady = await waitForJobPageReady(tabId, 30000);

      if (!pageReady.ready) {
        state.results[i] = { ...state.results[i], status: 'failed', error: 'Page load timeout', duration: Date.now() - jobStart };
        await chrome.storage.local.set({ bulkApplyState: state });
        try { await chrome.tabs.remove(tabId); } catch {}
        continue;
      }

      // Bug 7: Handle non-EA and already-applied as 'skipped'
      if (pageReady.pageState === 'already_applied') {
        console.log(`⏭️ Background: Skipping ${job.title} — already applied`);
        state.results[i] = { ...state.results[i], status: 'skipped', error: 'Already applied', duration: Date.now() - jobStart };
        // Also update jobStatuses
        const sr = await chrome.storage.local.get('jobStatuses');
        const js = (sr.jobStatuses as Record<string, string>) || {};
        js[job.linkedinJobId] = 'applied';
        await chrome.storage.local.set({ jobStatuses: js });
        await chrome.storage.local.set({ bulkApplyState: state });
        try { await chrome.tabs.remove(tabId); } catch {}
        continue;
      }

      if (pageReady.pageState === 'no_longer_accepting') {
        console.log(`🚫 Background: ${job.title} — no longer accepting applications`);
        state.results[i] = { ...state.results[i], status: 'failed', error: 'No longer accepting applications', duration: Date.now() - jobStart };
        const sr = await chrome.storage.local.get('jobStatuses');
        const js = (sr.jobStatuses as Record<string, string>) || {};
        js[job.linkedinJobId] = 'failed';
        await chrome.storage.local.set({ jobStatuses: js });
        await chrome.storage.local.set({ bulkApplyState: state });
        try { await chrome.tabs.remove(tabId); } catch {}
        continue;
      }

      if (pageReady.pageState === 'external_apply') {
        console.log(`⏭️ Background: Skipping ${job.title} — not Easy Apply`);
        state.results[i] = { ...state.results[i], status: 'skipped', error: 'Not Easy Apply', duration: Date.now() - jobStart };
        const sr = await chrome.storage.local.get('jobStatuses');
        const js = (sr.jobStatuses as Record<string, string>) || {};
        js[job.linkedinJobId] = 'skipped';
        await chrome.storage.local.set({ jobStatuses: js });
        await chrome.storage.local.set({ bulkApplyState: state });
        try { await chrome.tabs.remove(tabId); } catch {}
        continue;
      }

      // Send apply command
      console.log(`📋 Background: [${i + 1}/${jobs.length}] Applying to ${job.title}...`);
      let response = await sendApplyAndWaitForComplete(tabId, visitorId);

      // Handle SDUI flow
      if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
        await chrome.tabs.update(tabId, { url: response.navigatingTo });
        await new Promise(r => setTimeout(r, 3000));
        const applyReady = await waitForContentScriptReady(tabId);
        if (!applyReady) {
          state.results[i] = { ...state.results[i], status: 'failed', error: 'Apply page timeout', duration: Date.now() - jobStart };
          await chrome.storage.local.set({ bulkApplyState: state });
          try { await chrome.tabs.remove(tabId); } catch {}
          continue;
        }
        response = await sendApplyAndWaitForComplete(tabId, visitorId);
      }

      // Handle needs input — skip in bulk mode
      if (response?.needsInput) {
        state.results[i] = { ...state.results[i], status: 'skipped', error: `Needs input: ${response.needsInput.field}`, duration: Date.now() - jobStart };
        await chrome.storage.local.set({ bulkApplyState: state });
        try { await chrome.tabs.remove(tabId); } catch {}
        continue;
      }

      if (response?.success) {
        // Mark applied in jobStatuses
        const storageResult = await chrome.storage.local.get('jobStatuses');
        const jobStatuses = (storageResult.jobStatuses as Record<string, string>) || {};
        jobStatuses[job.linkedinJobId] = 'applied';
        await chrome.storage.local.set({ jobStatuses });

        state.results[i] = { ...state.results[i], status: 'applied', duration: Date.now() - jobStart };
        console.log(`✅ Background: [${i + 1}/${jobs.length}] Applied to ${job.title}`);
      } else {
        // Retry once
        console.log(`🔄 Background: [${i + 1}/${jobs.length}] Retrying ${job.title}...`);
        await new Promise(r => setTimeout(r, 3000));
        const retryResponse = await sendApplyAndWaitForComplete(tabId, visitorId);

        if (retryResponse?.success) {
          const storageResult = await chrome.storage.local.get('jobStatuses');
          const jobStatuses = (storageResult.jobStatuses as Record<string, string>) || {};
          jobStatuses[job.linkedinJobId] = 'applied';
          await chrome.storage.local.set({ jobStatuses });

          state.results[i] = { ...state.results[i], status: 'applied', duration: Date.now() - jobStart };
          console.log(`✅ Background: [${i + 1}/${jobs.length}] Applied to ${job.title} (retry)`);
        } else {
          const errorMsg = retryResponse?.error || response?.error || 'Unknown error';
          state.results[i] = { ...state.results[i], status: 'failed', error: errorMsg, duration: Date.now() - jobStart };
          console.log(`❌ Background: [${i + 1}/${jobs.length}] Failed: ${job.title} — ${errorMsg}`);
        }
      }

      // Close tab
      try { await chrome.tabs.remove(tabId); } catch {}

      // Persist progress
      await chrome.storage.local.set({ bulkApplyState: state });

      if (i < jobs.length - 1) {
        if (shouldStopRequested) {
          for (let j = i + 1; j < jobs.length; j++) {
            state.results[j].status = 'cancelled';
          }
          break;
        }
        await new Promise(r => setTimeout(r, BULK_APPLY_DELAY));
      }
    } catch (err: any) {
      state.results[i] = { ...state.results[i], status: 'failed', error: err.message, duration: Date.now() - jobStart };
      await chrome.storage.local.set({ bulkApplyState: state });
      if (tabId) {
        try { await chrome.tabs.remove(tabId); } catch {}
      }
    }
  }

  } finally {
    state.isRunning = false;
    state.shouldStop = false;
    state.currentJobId = '';
    state.currentJobTitle = '';
    state.currentJobCompany = '';
    await chrome.storage.local.set({ bulkApplyState: state });
    bulkApplyRunning = false;
    shouldStopRequested = false;

    const applied = state.results.filter(r => r.status === 'applied').length;
    const failed = state.results.filter(r => r.status === 'failed').length;
    const skipped = state.results.filter(r => r.status === 'skipped').length;
    console.log(`🏁 Background: Bulk apply complete. ${applied} applied, ${failed} failed, ${skipped} skipped out of ${jobs.length}`);

    if (originalTabId) {
      try { await chrome.tabs.update(originalTabId, { active: true }); } catch {}
    }
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request.action);

  // ---- Debug relay from content script ----
  if (request.action === '_debug') {
    console.log('🔬 Content:', request.msg);
    return false;
  }

  // ---- Keepalive from content script (prevents MV3 SW death during form automation) ----
  if (request.action === '_keepalive') {
    return false;
  }

  // Forward description fetch to content script on a specific tab
  if (request.action === 'fetchJobDescriptions') {
    const tabId = request.tabId;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'fetchJobDescriptions',
        jobIds: request.jobIds,
      }, (response: any) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    } else {
      sendResponse({ success: false, error: 'No tabId provided' });
    }
    return true;
  }

  if (request.action === 'rankJobs') {
    fetch(`${API_BASE}/api/jobs/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: request.visitorId, jobs: request.jobs }),
    })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(`API returned ${response.status}`);
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === '_descriptionProgress') {
    chrome.storage.local.set({
      _descriptionProgress: { fetched: request.fetched, total: request.total },
    });
    return false;
  }

  // ---- Salary enrichment ----
  if (request.action === 'enrichSalary') {
    fetch(`${API_BASE}/api/enrich-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: request.jobs }),
    })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(`API returned ${response.status}`);
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ---- LinkedIn API forwarding ----
  if (request.action === 'searchLinkedInJobs' || request.action === 'getJobDetails') {
    chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ success: false, error: 'Please open a LinkedIn page first' });
      }
    });
    return true;
  }

  // ---- Profile save ----
  if (request.action === 'profile_save') {
    fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
    })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ---- Profile get ----
  if (request.action === 'profile_get') {
    fetch(`${API_BASE}/api/profile/${request.visitorId}`)
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ---- Resume upload ----
  if (request.action === 'profile_uploadResume') {
    try {
      const byteCharacters = atob(request.fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: request.fileType || 'application/pdf' });

      const formData = new FormData();
      formData.append('visitorId', request.visitorId);
      formData.append('resume', blob, request.fileName || 'resume.pdf');

      fetch(`${API_BASE}/api/profile/resume`, {
        method: 'POST',
        body: formData,
      })
        .then(r => r.json())
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ success: false, error: err.message }));
    } catch (err: any) {
      sendResponse({ success: false, error: 'Failed to process file: ' + err.message });
    }
    return true;
  }

  // ---- Answer lookup ----
  if (request.action === 'easyApply_lookupAnswer') {
    fetch(`${API_BASE}/api/questions/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: request.visitorId,
        questionText: request.questionText,
        questionType: request.questionType,
        options: request.options,
      }),
    })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ---- Answer save ----
  if (request.action === 'easyApply_saveAnswer') {
    fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: request.visitorId,
        questionText: request.questionText,
        questionType: request.questionType,
        answer: request.answer,
        answerSource: request.answerSource,
      }),
    })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ---- Get all questions ----
  if (request.action === 'questions_getAll') {
    fetch(`${API_BASE}/api/questions/${request.visitorId}`)
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ---- Delete question ----
  if (request.action === 'questions_delete') {
    fetch(`${API_BASE}/api/questions/${request.questionId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ============================================
  // APPLY ORCHESTRATION
  // ============================================

  // Single job apply (from job card click) — fire-and-forget
  // Background writes result to chrome.storage; popup picks it up via onChanged.
  if (request.action === 'autoApplyToJob') {
    sendResponse({ acknowledged: true });
    handleApplyToJob(request.jobId, request.visitorId)
      .then(result => {
        const storagePayload = {
          lastSingleApplyResult: {
            ...result,
            jobId: request.jobId,
            jobTitle: request.jobTitle,
            timestamp: Date.now(),
          },
        };
        console.log(`📦 Background: Writing lastSingleApplyResult to storage:`, JSON.stringify(storagePayload.lastSingleApplyResult));
        chrome.storage.local.set(storagePayload);
      })
      .catch(err => {
        const errorPayload = {
          success: false,
          error: err.message,
          jobId: request.jobId,
          jobTitle: request.jobTitle,
          timestamp: Date.now(),
        };
        console.log(`📦 Background: Writing error lastSingleApplyResult:`, JSON.stringify(errorPayload));
        chrome.storage.local.set({ lastSingleApplyResult: errorPayload });
      });
    return false;
  }

  // Apply on current tab (Bug 2 fix)
  if (request.action === 'autoApplyCurrentTab') {
    handleApplyOnCurrentTab(request.visitorId)
      .then(result => {
        chrome.storage.local.set({
          lastSingleApplyResult: {
            ...result,
            jobTitle: 'Current Job',
            timestamp: Date.now(),
          },
        });
        sendResponse(result);
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Resume apply on a specific tab (after user provides missing input)
  // Fire-and-forget: writes result to lastSingleApplyResult storage.
  // Includes loop detection: if the same needsInput field comes back,
  // the user's answer was rejected by LinkedIn — fail instead of looping.
  if (request.action === 'resumeApplyOnTab') {
    sendResponse({ acknowledged: true });
    const { tabId, visitorId: vid, jobId, jobTitle, previousField, answerOverride } = request;
    sendApplyAndWaitForComplete(tabId, vid, 120000, answerOverride)
      .then(result => {
        // Loop detection: same field asked again means the answer didn't work
        if (result?.needsInput && previousField && result.needsInput.field === previousField) {
          console.log(`🔄 Background: Loop detected — "${previousField}" asked again. Failing.`);
          const failPayload = {
            success: false,
            error: `LinkedIn rejected your answer for "${previousField}". Try applying manually.`,
            jobId, jobTitle, timestamp: Date.now(),
          };
          chrome.storage.local.set({ lastSingleApplyResult: failPayload });
          try { chrome.tabs.remove(tabId); } catch {}
          return;
        }

        const payload = { ...result, jobId, jobTitle, tabId: result?.needsInput ? tabId : undefined, timestamp: Date.now() };
        console.log('📦 Background: resumeApplyOnTab result:', JSON.stringify(payload));

        // If successful, persist status and close the tab
        if (result?.success && jobId) {
          chrome.storage.local.get('jobStatuses', (sr) => {
            const jobStatuses = ((sr.jobStatuses as Record<string, string>) || {});
            jobStatuses[jobId] = 'applied';
            chrome.storage.local.set({ jobStatuses, lastSingleApplyResult: payload });
          });
          try { chrome.tabs.remove(tabId); } catch {}
        } else {
          chrome.storage.local.set({ lastSingleApplyResult: payload });
          // Keep tab open if needsInput again
          if (!result?.needsInput) {
            try { chrome.tabs.remove(tabId); } catch {}
          }
        }
      })
      .catch(err => {
        chrome.storage.local.set({
          lastSingleApplyResult: {
            success: false, error: err.message, jobId, jobTitle, timestamp: Date.now(),
          },
        });
      });
    return false;
  }

  // Bulk apply — start
  if (request.action === 'startBulkApply') {
    sendResponse({ acknowledged: true });
    handleBulkApply(request.jobs, request.visitorId);
    return false;
  }

  // Bulk apply — stop
  if (request.action === 'stopBulkApply') {
    if (bulkApplyRunning) {
      shouldStopRequested = true;
    }
    chrome.storage.local.get('bulkApplyState', (result) => {
      const state = result.bulkApplyState as BulkApplyStorageState | undefined;
      if (state) {
        if (bulkApplyRunning) {
          state.shouldStop = true;
        } else {
          state.isRunning = false;
          state.shouldStop = false;
          state.currentJobId = '';
          state.currentJobTitle = '';
          state.currentJobCompany = '';
        }
        chrome.storage.local.set({ bulkApplyState: state });
      }
      sendResponse({ acknowledged: true });
    });
    return true;
  }

  // Forward Easy Apply actions to content script (legacy)
  if (request.action === 'easyApply_start' || request.action === 'easyApply_close') {
    chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ success: false, error: 'Please open a LinkedIn job page first' });
      }
    });
    return true;
  }

  return false;
});

// Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

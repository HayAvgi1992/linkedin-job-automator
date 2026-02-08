/**
 * Background Service Worker
 * Forwards messages to content script for LinkedIn API calls
 */

console.log('Job Search Extension - Background Service Worker Started');

const API_BASE = 'http://localhost:3001';

// Message handler - forwards API requests to content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request.action);

  // Handle salary enrichment API call (background worker has host permissions)
  if (request.action === 'enrichSalary') {
    console.log('🔄 Background: Enriching', request.jobs?.length, 'jobs with salary data');

    fetch(`${API_BASE}/api/enrich-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: request.jobs }),
    })
      .then(response => {
        console.log('📡 Background: API response status:', response.status);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      })
      .then(data => {
        console.log('✅ Background: Successfully enriched jobs');
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('❌ Background: Enrichment failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  // Forward API calls to content script on active LinkedIn tab
  if (request.action === 'searchLinkedInJobs' || request.action === 'getJobDetails') {
    chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({
          success: false,
          error: 'Please open a LinkedIn page first',
        });
      }
    });
    return true; // Keep channel open for async response
  }

  // ============================================
  // AUTO-APPLY API HANDLERS
  // ============================================

  // Get or save user profile
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

  if (request.action === 'profile_get') {
    fetch(`${API_BASE}/api/profile/${request.visitorId}`)
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Upload resume (receives base64-encoded file from popup)
  if (request.action === 'profile_uploadResume') {
    try {
      // Convert base64 back to Blob
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

  // Lookup answer for a question
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

  // Save answer
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

  // Get all saved questions
  if (request.action === 'questions_getAll') {
    fetch(`${API_BASE}/api/questions/${request.visitorId}`)
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Delete a question
  if (request.action === 'questions_delete') {
    fetch(`${API_BASE}/api/questions/${request.questionId}`, {
      method: 'DELETE',
    })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Forward Easy Apply actions to content script
  if (request.action === 'easyApply_start' || request.action === 'easyApply_close' || request.action === 'easyApply_applyToJob') {
    chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({
          success: false,
          error: 'Please open a LinkedIn job page first',
        });
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

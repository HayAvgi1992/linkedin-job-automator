import { useState, useEffect } from 'react';
import { Search, Briefcase, MapPin, DollarSign, Star, Check, X, Loader2, Upload, Zap, FileText, Trash2 } from 'lucide-react';

interface Job {
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
  status?: 'new' | 'viewed' | 'saved' | 'applied' | 'rejected';
}

interface JobStorage {
  savedJobs: string[];
  appliedJobs: string[];
  rejectedJobs: string[];
  viewedJobs: string[];
}

// Location options matching GEO_IDS in content script
const LOCATIONS = [
  { value: '', label: 'Any Location' },
  // Countries
  { value: 'united states', label: 'United States' },
  { value: 'india', label: 'India' },
  { value: 'united kingdom', label: 'United Kingdom' },
  { value: 'canada', label: 'Canada' },
  { value: 'australia', label: 'Australia' },
  { value: 'germany', label: 'Germany' },
  { value: 'france', label: 'France' },
  // US Cities
  { value: 'new york', label: 'New York, US' },
  { value: 'san francisco', label: 'San Francisco, US' },
  { value: 'los angeles', label: 'Los Angeles, US' },
  { value: 'seattle', label: 'Seattle, US' },
  { value: 'austin', label: 'Austin, US' },
  { value: 'boston', label: 'Boston, US' },
  { value: 'chicago', label: 'Chicago, US' },
  { value: 'denver', label: 'Denver, US' },
  { value: 'atlanta', label: 'Atlanta, US' },
  { value: 'miami', label: 'Miami, US' },
  { value: 'washington dc', label: 'Washington DC, US' },
  // India Cities
  { value: 'bangalore', label: 'Bangalore, India' },
  { value: 'mumbai', label: 'Mumbai, India' },
  { value: 'delhi', label: 'Delhi, India' },
  { value: 'hyderabad', label: 'Hyderabad, India' },
  { value: 'pune', label: 'Pune, India' },
  { value: 'chennai', label: 'Chennai, India' },
  { value: 'gurgaon', label: 'Gurgaon, India' },
  { value: 'noida', label: 'Noida, India' },
  // UK Cities
  { value: 'london', label: 'London, UK' },
  // Canada Cities
  { value: 'toronto', label: 'Toronto, Canada' },
  { value: 'vancouver', label: 'Vancouver, Canada' },
];

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);
  const [view, setView] = useState<'search' | 'jobs' | 'autoApply'>('search');
  const [filter, setFilter] = useState<'all' | 'saved' | 'applied'>('all');
  const [enriching, setEnriching] = useState(false);

  // Pagination state for "Load More"
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(4); // We load 4 pages (100 jobs) initially
  const [hasMoreJobs, setHasMoreJobs] = useState(true);

  // Auto-Apply state
  const [visitorId] = useState(() => {
    // Generate or retrieve visitor ID
    let id = localStorage.getItem('visitorId');
    if (!id) {
      id = 'visitor_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('visitorId', id);
    }
    return id;
  });
  const [resumeInfo, setResumeInfo] = useState<{ fileName: string; skills: string[]; yearsExperience: number } | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<Array<{ _id: string; questionText: string; answer: string; timesUsed: number }>>([]);
  const [autoApplyStatus, setAutoApplyStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [autoApplyMessage, setAutoApplyMessage] = useState('');

  // Missing input state - when a field can't be auto-filled
  const [missingInput, setMissingInput] = useState<{
    field: string;
    type: string;
    options?: string[];
    tabId: number;
    jobTitle: string;
  } | null>(null);
  const [missingInputValue, setMissingInputValue] = useState('');

  // Profile settings state
  const [profileSettings, setProfileSettings] = useState({
    city: '',
    state: '',
    country: 'United States',
    phoneNumber: '',
    email: '',
    workAuthorization: 'Yes',
    startDate: 'Immediately',
  });
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Job storage state
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [rejectedJobs, setRejectedJobs] = useState<string[]>([]);
  const [viewedJobs, setViewedJobs] = useState<string[]>([]);

  // Load saved jobs from Chrome storage on mount
  useEffect(() => {
    chrome.storage.local.get(['savedJobs', 'appliedJobs', 'rejectedJobs', 'viewedJobs'], (result) => {
      setSavedJobs((result.savedJobs as string[] | undefined) || []);
      setAppliedJobs((result.appliedJobs as string[] | undefined) || []);
      setRejectedJobs((result.rejectedJobs as string[] | undefined) || []);
      setViewedJobs((result.viewedJobs as string[] | undefined) || []);
    });
  }, []);

  // Load persisted data on mount
  useEffect(() => {
    // Load cached data from Chrome storage first (instant)
    chrome.storage.local.get(['resumeInfo', 'cachedQuestions', 'cachedJobs', 'lastView', 'profileSettings'], (result) => {
      const cached = result as {
        resumeInfo?: { fileName: string; skills: string[]; yearsExperience: number };
        cachedQuestions?: Array<{ _id: string; questionText: string; answer: string; timesUsed: number }>;
        cachedJobs?: Job[];
        lastView?: 'search' | 'jobs' | 'autoApply';
        profileSettings?: typeof profileSettings;
      };
      if (cached.resumeInfo?.fileName) {
        setResumeInfo(cached.resumeInfo);
      }
      if (cached.cachedQuestions && Array.isArray(cached.cachedQuestions)) {
        setSavedQuestions(cached.cachedQuestions);
      }
      // Restore jobs if we have them
      if (cached.cachedJobs && Array.isArray(cached.cachedJobs) && cached.cachedJobs.length > 0) {
        setJobs(cached.cachedJobs);
        // If we had jobs, restore the jobs view
        if (cached.lastView === 'jobs') {
          setView('jobs');
        }
      }
      // Restore profile settings
      if (cached.profileSettings) {
        setProfileSettings(p => ({ ...p, ...cached.profileSettings }));
      }
    });
  }, []);

  // Refresh from backend when switching to Auto Apply view
  useEffect(() => {
    if (view === 'autoApply') {
      loadProfile();
      loadQuestions();
    }
  }, [view]);

  const loadProfile = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'profile_get',
        visitorId,
      });
      if (response?.success && response.profile) {
        // Load resume info
        if (response.profile.resume) {
          const resumeData = {
            fileName: response.profile.resume.fileName,
            skills: response.profile.resume.skills,
            yearsExperience: response.profile.resume.yearsExperience,
          };
          setResumeInfo(resumeData);
          chrome.storage.local.set({ resumeInfo: resumeData });
        }
        // Load profile settings
        setProfileSettings({
          city: response.profile.city || '',
          state: response.profile.state || '',
          country: response.profile.country || 'United States',
          phoneNumber: response.profile.phoneNumber || '',
          email: response.profile.email || '',
          workAuthorization: response.profile.workAuthorization || 'Yes',
          startDate: response.profile.startDate || 'Immediately',
        });
        chrome.storage.local.set({ profileSettings: response.profile });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const saveProfileSettings = async () => {
    try {
      setAutoApplyMessage('Saving profile...');
      const response = await chrome.runtime.sendMessage({
        action: 'profile_save',
        data: {
          visitorId,
          ...profileSettings,
        },
      });
      if (response?.success) {
        setAutoApplyMessage('Profile saved!');
        chrome.storage.local.set({ profileSettings });
        setTimeout(() => setAutoApplyMessage(''), 2000);
      } else {
        setAutoApplyMessage('Failed to save profile');
      }
    } catch (err: any) {
      setAutoApplyMessage('Error: ' + err.message);
    }
  };

  const loadQuestions = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'questions_getAll',
        visitorId,
      });
      if (response?.success) {
        setSavedQuestions(response.questions || []);
        // Cache in Chrome storage for persistence
        chrome.storage.local.set({ cachedQuestions: response.questions || [] });
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAutoApplyMessage('Uploading and parsing resume...');

    try {
      // Convert file to base64 (Chrome messaging can't send File objects)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:application/pdf;base64,")
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await chrome.runtime.sendMessage({
        action: 'profile_uploadResume',
        visitorId,
        fileName: file.name,
        fileBase64: base64,
        fileType: file.type,
      });

      if (response?.success) {
        setResumeInfo(response.resume);
        // Save to Chrome storage for persistence
        chrome.storage.local.set({ resumeInfo: response.resume });
        setAutoApplyMessage('Resume uploaded successfully!');
        setTimeout(() => setAutoApplyMessage(''), 3000);
      } else {
        setAutoApplyMessage('Failed to upload resume: ' + (response?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setAutoApplyMessage('Error: ' + err.message);
    }
  };

  const startAutoApply = async () => {
    setAutoApplyStatus('running');
    setAutoApplyMessage('Starting auto-apply...');

    try {
      // Get the current active LinkedIn tab
      const tabs = await chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' });
      const tab = tabs[0];

      if (!tab?.id) {
        setAutoApplyMessage('Please open a LinkedIn job page first');
        setAutoApplyStatus('idle');
        return;
      }

      let response = await chrome.tabs.sendMessage(tab.id, {
        action: 'easyApply_start',
        visitorId,
      });

      // Handle SDUI flow - the content script found an anchor to the apply page
      // We need to navigate the tab to that URL and re-run
      if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
        console.log('SDUI flow detected for single apply, navigating to:', response.navigatingTo);
        setAutoApplyMessage('Navigating to apply page...');

        // Navigate the tab to the apply URL
        await chrome.tabs.update(tab.id, { url: response.navigatingTo });

        // Wait for the navigation to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Wait for the new page to be ready
        const isReady = await waitForTabReady(tab.id);
        if (!isReady) {
          setAutoApplyMessage('Apply page took too long to load');
          setAutoApplyStatus('idle');
          return;
        }

        setAutoApplyMessage('Filling application...');

        // Re-send the command now that we're on the apply page
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'easyApply_start',
          visitorId,
        });
      }

      // Handle missing input - show modal for user to provide the value
      if (response?.needsInput) {
        setMissingInput({
          field: response.needsInput.field,
          type: response.needsInput.type,
          options: response.needsInput.options,
          tabId: tab.id,
          jobTitle: 'Current Job',
        });
        setAutoApplyMessage(`Need input: ${response.needsInput.field}`);
        setAutoApplyStatus('paused');
        return;
      }

      if (response?.success) {
        setAutoApplyMessage(`Applied successfully! Answered ${response.questionsAnswered || 0} questions.`);
        // Refresh questions list
        loadQuestions();
      } else {
        setAutoApplyMessage('Failed: ' + (response?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setAutoApplyMessage('Error: ' + err.message);
    } finally {
      setAutoApplyStatus('idle');
    }
  };

  // Helper: Wait for tab to fully load and content script to be ready
  const waitForTabReady = (tabId: number, maxWait = 15000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;

      const checkContentScript = async () => {
        if (resolved) return;
        if (Date.now() - startTime > maxWait) {
          resolved = true;
          resolve(false);
          return;
        }

        try {
          // Try to ping the content script
          const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
          if (response?.pong && !resolved) {
            resolved = true;
            resolve(true);
            return;
          }
        } catch {
          // Content script not ready yet, wait and retry
        }

        if (!resolved) {
          setTimeout(checkContentScript, 500);
        }
      };

      // Check current tab status first
      chrome.tabs.get(tabId, (tab) => {
        if (resolved) return;

        if (tab?.status === 'complete') {
          // Tab already loaded, start checking for content script
          setTimeout(checkContentScript, 500);
        } else {
          // Wait for tab to complete loading
          const listener = (updatedTabId: number, info: { status?: string }) => {
            if (resolved) {
              chrome.tabs.onUpdated.removeListener(listener);
              return;
            }
            if (updatedTabId === tabId && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              // Give content script a moment to initialize after page load
              setTimeout(checkContentScript, 500);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);

          // Also set a backup to start checking after a brief delay
          // in case onUpdated fires before we add the listener
          setTimeout(() => {
            if (!resolved) {
              checkContentScript();
            }
          }, 2000);
        }
      });
    });
  };

  // One-click apply to a specific job (opens job and auto-applies)
  const applyToJob = async (job: Job) => {
    if (!job.easyApply) {
      // Not an Easy Apply job - just open it
      openJob(job.linkedinJobId);
      return;
    }

    setAutoApplyStatus('running');
    setAutoApplyMessage(`Opening ${job.title}...`);

    try {
      // Open the job in a new tab
      const tab = await chrome.tabs.create({
        url: `https://www.linkedin.com/jobs/view/${job.linkedinJobId}`,
        active: true,
      });

      if (!tab.id) {
        setAutoApplyMessage('Failed to open tab');
        setAutoApplyStatus('idle');
        return;
      }

      setAutoApplyMessage(`Waiting for page to load...`);

      // Wait for tab to be ready
      let isReady = await waitForTabReady(tab.id);
      if (!isReady) {
        setAutoApplyMessage('Page took too long to load');
        setAutoApplyStatus('idle');
        return;
      }

      setAutoApplyMessage(`Applying to ${job.title}...`);

      let response = await chrome.tabs.sendMessage(tab.id, {
        action: 'easyApply_start',
        visitorId,
      });

      // Handle SDUI flow - the content script found an anchor to the apply page
      // We need to navigate the tab to that URL and re-run
      if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
        console.log('SDUI flow detected, navigating to:', response.navigatingTo);
        setAutoApplyMessage(`Navigating to apply page...`);

        // Navigate the tab to the apply URL
        await chrome.tabs.update(tab.id, { url: response.navigatingTo });

        // Wait for the navigation to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Wait for the new page to be ready
        isReady = await waitForTabReady(tab.id);
        if (!isReady) {
          setAutoApplyMessage('Apply page took too long to load');
          setAutoApplyStatus('idle');
          return;
        }

        setAutoApplyMessage(`Filling application for ${job.title}...`);

        // Re-send the command now that we're on the apply page
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'easyApply_start',
          visitorId,
        });
      }

      // Handle missing input - show modal for user to provide the value
      if (response?.needsInput) {
        setMissingInput({
          field: response.needsInput.field,
          type: response.needsInput.type,
          options: response.needsInput.options,
          tabId: tab.id,
          jobTitle: job.title,
        });
        setAutoApplyMessage(`Need input: ${response.needsInput.field}`);
        setAutoApplyStatus('paused');
        return;
      }

      if (response?.success) {
        markAsApplied(job.linkedinJobId);
        setAutoApplyMessage(`Applied to ${job.title}!`);
        loadQuestions();
      } else {
        setAutoApplyMessage(`Failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setAutoApplyMessage(`Error: ${err.message}`);
    } finally {
      setAutoApplyStatus('idle');
    }
  };

  // Bulk auto-apply to all Easy Apply jobs
  const [bulkApplyProgress, setBulkApplyProgress] = useState({ current: 0, total: 0 });

  const startBulkAutoApply = async () => {
    const easyApplyJobs = jobs.filter(j => j.easyApply && !appliedJobs.includes(j.linkedinJobId));

    if (easyApplyJobs.length === 0) {
      setAutoApplyMessage('No Easy Apply jobs to apply to');
      return;
    }

    setAutoApplyStatus('running');
    setBulkApplyProgress({ current: 0, total: easyApplyJobs.length });
    setAutoApplyMessage(`Starting bulk apply to ${easyApplyJobs.length} jobs...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < easyApplyJobs.length; i++) {
      const job = easyApplyJobs[i];
      setBulkApplyProgress({ current: i + 1, total: easyApplyJobs.length });
      setAutoApplyMessage(`Opening ${job.title} (${i + 1}/${easyApplyJobs.length})...`);

      try {
        // Open job in new tab
        const tab = await chrome.tabs.create({
          url: `https://www.linkedin.com/jobs/view/${job.linkedinJobId}`,
          active: true,
        });

        if (!tab.id) {
          console.log(`Failed to open tab for ${job.title}`);
          failCount++;
          continue;
        }

        setAutoApplyMessage(`Waiting for ${job.title} to load...`);

        // Wait for tab to be ready using proper detection
        const isReady = await waitForTabReady(tab.id, 20000);

        if (!isReady) {
          console.log(`Tab took too long to load for ${job.title}`);
          failCount++;
          // Close tab before continuing
          try { await chrome.tabs.remove(tab.id); } catch {}
          continue;
        }

        setAutoApplyMessage(`Applying to ${job.title} (${i + 1}/${easyApplyJobs.length})...`);

        let response = await chrome.tabs.sendMessage(tab.id, {
          action: 'easyApply_start',
          visitorId,
        });

        // Handle SDUI flow - navigate to apply page and retry
        if (response?.error === 'NAVIGATION_TO_APPLY_PAGE' && response?.navigatingTo) {
          console.log(`SDUI flow for ${job.title}, navigating to:`, response.navigatingTo);
          setAutoApplyMessage(`Navigating to apply page for ${job.title}...`);

          // Navigate the tab to the apply URL
          await chrome.tabs.update(tab.id, { url: response.navigatingTo });
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Wait for the new page to be ready
          const applyPageReady = await waitForTabReady(tab.id);
          if (!applyPageReady) {
            console.log(`Apply page took too long to load for ${job.title}`);
            failCount++;
            try { await chrome.tabs.remove(tab.id); } catch {}
            continue;
          }

          // Re-send the command
          response = await chrome.tabs.sendMessage(tab.id, {
            action: 'easyApply_start',
            visitorId,
          });
        }

        // Handle missing input - skip this job in bulk mode (can't prompt)
        if (response?.needsInput) {
          console.log(`Skipping ${job.title} - needs input: ${response.needsInput.field}`);
          failCount++;
          // Close the tab
          try { await chrome.tabs.remove(tab.id); } catch {}
          continue;
        }

        if (response?.success) {
          markAsApplied(job.linkedinJobId);
          successCount++;
        } else {
          console.log(`Failed to apply to ${job.title}: ${response?.error}`);
          failCount++;
        }

        // Close the tab
        try { await chrome.tabs.remove(tab.id); } catch {}

        // Wait between applications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error(`Error applying to ${job.title}:`, err);
        failCount++;
      }
    }

    setAutoApplyStatus('idle');
    setBulkApplyProgress({ current: 0, total: 0 });
    setAutoApplyMessage(`Bulk apply complete! ${successCount} succeeded, ${failCount} failed.`);
    loadQuestions();
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'questions_delete',
        questionId,
      });
      setSavedQuestions(prev => prev.filter(q => q._id !== questionId));
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Handle submitting the missing input and resuming
  const submitMissingInput = async () => {
    if (!missingInput || !missingInputValue.trim()) return;

    setAutoApplyStatus('running');
    setAutoApplyMessage(`Saving answer and resuming...`);

    try {
      // Save the answer to the backend
      await chrome.runtime.sendMessage({
        action: 'easyApply_saveAnswer',
        visitorId,
        questionText: missingInput.field,
        questionType: missingInput.type,
        answer: missingInputValue.trim(),
        answerSource: 'user',
      });

      // Resume the application on the same tab
      const response = await chrome.tabs.sendMessage(missingInput.tabId, {
        action: 'easyApply_start',
        visitorId,
      });

      if (response?.success) {
        setAutoApplyMessage(`Applied to ${missingInput.jobTitle}!`);
        loadQuestions();
      } else if (response?.needsInput) {
        // Still needs more input
        setMissingInput({
          field: response.needsInput.field,
          type: response.needsInput.type,
          options: response.needsInput.options,
          tabId: missingInput.tabId,
          jobTitle: missingInput.jobTitle,
        });
        setMissingInputValue('');
        setAutoApplyMessage(`Need input: ${response.needsInput.field}`);
        setAutoApplyStatus('paused');
        return;
      } else {
        setAutoApplyMessage(`Failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setAutoApplyMessage(`Error: ${err.message}`);
    } finally {
      setMissingInput(null);
      setMissingInputValue('');
      setAutoApplyStatus('idle');
    }
  };

  // Cancel missing input and close modal
  const cancelMissingInput = () => {
    setMissingInput(null);
    setMissingInputValue('');
    setAutoApplyStatus('idle');
    setAutoApplyMessage('Application paused - missing input not provided');
  };

  // Save job storage helpers
  const saveToStorage = (key: keyof JobStorage, value: string[]) => {
    chrome.storage.local.set({ [key]: value });
  };

  const toggleSaveJob = (jobId: string) => {
    const newSaved = savedJobs.includes(jobId)
      ? savedJobs.filter(id => id !== jobId)
      : [...savedJobs, jobId];
    setSavedJobs(newSaved);
    saveToStorage('savedJobs', newSaved);
  };

  const markAsApplied = (jobId: string) => {
    if (!appliedJobs.includes(jobId)) {
      const newApplied = [...appliedJobs, jobId];
      setAppliedJobs(newApplied);
      saveToStorage('appliedJobs', newApplied);
    }
  };

  const rejectJob = (jobId: string) => {
    if (!rejectedJobs.includes(jobId)) {
      const newRejected = [...rejectedJobs, jobId];
      setRejectedJobs(newRejected);
      saveToStorage('rejectedJobs', newRejected);
    }
  };

  const markAsViewed = (jobId: string) => {
    if (!viewedJobs.includes(jobId)) {
      const newViewed = [...viewedJobs, jobId];
      setViewedJobs(newViewed);
      saveToStorage('viewedJobs', newViewed);
    }
  };

  const searchJobs = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setError('');

    // Reset pagination state for new search
    setCurrentPage(4);
    setHasMoreJobs(true);

    try {
      const allJobs: Job[] = [];
      const maxPages = 4; // Fetch 100 jobs (4 pages of 25)

      for (let page = 0; page < maxPages; page++) {
        setLoadingProgress(((page + 1) / maxPages) * 100);

        const response = await chrome.runtime.sendMessage({
          action: 'searchLinkedInJobs',
          params: {
            keywords,
            location,
            remote: remoteOnly,
            easyApply: easyApplyOnly,
            count: 25,
            start: page * 25,
          },
        });

        if (response && response.success) {
          const batch = response.data || [];
          allJobs.push(...batch);
        } else {
          console.error('Failed to fetch page', page, response?.error);
        }

        // Small delay between requests to avoid rate limiting
        if (page < maxPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('Total jobs fetched:', allJobs.length);

      // Filter out rejected jobs
      const filteredJobs = allJobs.filter(job => !rejectedJobs.includes(job.linkedinJobId));

      setJobs(filteredJobs);
      setView('jobs');

      // Cache jobs in Chrome storage for persistence
      chrome.storage.local.set({ cachedJobs: filteredJobs, lastView: 'jobs' });

      // Enrich jobs with salary data
      enrichJobsWithSalary(filteredJobs);

    } catch (error: any) {
      console.error('Search error:', error);
      const errorMsg = error?.message || 'Failed to communicate with extension';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Load more jobs (pagination)
  const loadMoreJobs = async () => {
    if (loadingMore || !hasMoreJobs) return;

    setLoadingMore(true);

    try {
      const newJobs: Job[] = [];
      const pagesToLoad = 2; // Load 50 more jobs (2 pages of 25)

      for (let i = 0; i < pagesToLoad; i++) {
        const page = currentPage + i;

        const response = await chrome.runtime.sendMessage({
          action: 'searchLinkedInJobs',
          params: {
            keywords,
            location,
            remote: remoteOnly,
            easyApply: easyApplyOnly,
            count: 25,
            start: page * 25,
          },
        });

        if (response && response.success) {
          const batch = response.data || [];
          newJobs.push(...batch);

          // If we got fewer than 25, there are no more jobs
          if (batch.length < 25) {
            setHasMoreJobs(false);
            break;
          }
        } else {
          console.error('Failed to fetch page', page, response?.error);
          break;
        }
      }

      if (newJobs.length > 0) {
        // Filter out duplicates and rejected jobs
        const existingIds = new Set(jobs.map(j => j.linkedinJobId));
        const uniqueNewJobs = newJobs.filter(
          job => !existingIds.has(job.linkedinJobId) && !rejectedJobs.includes(job.linkedinJobId)
        );

        const allJobs = [...jobs, ...uniqueNewJobs];
        setJobs(allJobs);
        setCurrentPage(currentPage + pagesToLoad);

        // Cache updated jobs
        chrome.storage.local.set({ cachedJobs: allJobs });

        // Enrich new jobs with salary
        if (uniqueNewJobs.length > 0) {
          enrichJobsWithSalary(uniqueNewJobs);
        }
      } else {
        setHasMoreJobs(false);
      }
    } catch (error: any) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const enrichJobsWithSalary = async (jobsToEnrich: Job[]) => {
    // Separate jobs: those with LinkedIn salary data vs those needing enrichment
    const jobsWithLinkedInSalary = jobsToEnrich.filter(j => j.salary?.source === 'linkedin');
    const jobsNeedingEnrichment = jobsToEnrich.filter(j => !j.salary);

    console.log(`💰 LinkedIn salary data: ${jobsWithLinkedInSalary.length} jobs`);
    console.log(`🔄 Need enrichment: ${jobsNeedingEnrichment.length} jobs`);

    // If no jobs need enrichment, we're done
    if (jobsNeedingEnrichment.length === 0) {
      console.log('✅ All jobs have LinkedIn salary data - no external API calls needed');
      return;
    }

    setEnriching(true);
    console.log('🔄 Popup: Starting salary enrichment for', jobsNeedingEnrichment.length, 'jobs (skipping', jobsWithLinkedInSalary.length, 'with LinkedIn data)');

    try {
      // Call background worker to enrich ONLY jobs without LinkedIn salary data
      const response = await chrome.runtime.sendMessage({
        action: 'enrichSalary',
        jobs: jobsNeedingEnrichment.map(j => ({
          id: j.linkedinJobId,
          title: j.title,
          company: j.company.name,
          location: j.location.city
        }))
      });

      console.log('📡 Popup: Enrichment response:', response?.success ? 'success' : 'failed');

      if (response?.success) {
        const enrichedData = response.data;
        console.log('✅ Popup: Successfully enriched', enrichedData.jobs.length, 'jobs with salary data');

        setJobs(prevJobs => {
          const updatedJobs = prevJobs.map(job => {
            // Skip jobs that already have LinkedIn salary data
            if (job.salary?.source === 'linkedin') {
              return job;
            }
            const enriched = enrichedData.jobs.find((e: any) => e.id === job.linkedinJobId);
            if (enriched) {
              console.log(`💰 ${job.title}: $${enriched.salary.min/1000}k-$${enriched.salary.max/1000}k (enriched)`);
            }
            return enriched ? { ...job, salary: enriched.salary } : job;
          });
          // Update cache with enriched salary data
          chrome.storage.local.set({ cachedJobs: updatedJobs });
          return updatedJobs;
        });
      } else {
        console.error('❌ Popup: Enrichment failed:', response?.error);
      }
    } catch (error: any) {
      console.error('❌ Popup: Salary enrichment failed:', error.message);
      console.error('Full error:', error);
    } finally {
      setEnriching(false);
    }
  };

  const openJob = (jobId: string) => {
    markAsViewed(jobId);
    chrome.tabs.create({
      url: `https://www.linkedin.com/jobs/view/${jobId}`,
    });
  };

  // Get filtered jobs based on current filter
  const getFilteredJobs = () => {
    switch (filter) {
      case 'saved':
        return jobs.filter(job => savedJobs.includes(job.linkedinJobId));
      case 'applied':
        return jobs.filter(job => appliedJobs.includes(job.linkedinJobId));
      default:
        // "All" tab shows only non-applied jobs (the queue to apply to)
        return jobs.filter(job => !appliedJobs.includes(job.linkedinJobId));
    }
  };

  const filteredJobs = getFilteredJobs();

  // Get job status
  const getJobStatus = (jobId: string): 'new' | 'viewed' | 'saved' | 'applied' => {
    if (appliedJobs.includes(jobId)) return 'applied';
    if (savedJobs.includes(jobId)) return 'saved';
    if (viewedJobs.includes(jobId)) return 'viewed';
    return 'new';
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div className="text-white shadow-sm" style={{ backgroundColor: '#090c05' }}>
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5" />
            <h1 className="text-sm font-medium tracking-wide">LinkedIn Job Search</h1>
          </div>
          <div className="flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
            <DollarSign className="w-3 h-3" />
            <span className="font-medium">$100k+</span>
          </div>
        </div>
        {/* Navigation Tabs */}
        <div className="flex border-t border-gray-700">
          <button
            onClick={() => {
              // Show jobs view if we have jobs, otherwise show search form
              const targetView = jobs.length > 0 ? 'jobs' : 'search';
              setView(targetView);
              chrome.storage.local.set({ lastView: targetView });
            }}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              view === 'search' || view === 'jobs' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-3 h-3" />
            {jobs.length > 0 ? `Jobs (${jobs.length})` : 'Search'}
          </button>
          <button
            onClick={() => { setView('autoApply'); chrome.storage.local.set({ lastView: 'autoApply' }); }}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              view === 'autoApply' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            Auto Apply
          </button>
        </div>
      </div>

      {/* Search Form */}
      {view === 'search' && (
        <div className="flex-1 overflow-auto" style={{ backgroundColor: '#f9f9f9', padding: '14px' }}>
          <div className="space-y-3">
            {/* Keywords */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#090c05' }}>
                Job Title or Keywords *
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Software Engineer, Data Scientist"
                className="input-fraser w-full"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#090c05' }}>
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-fraser w-full"
                style={{ cursor: 'pointer' }}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Remote Filter */}
            <div className="flex items-center space-x-2.5 py-1">
              <input
                type="checkbox"
                id="remote"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="checkbox-fraser"
              />
              <label htmlFor="remote" className="text-sm" style={{ color: '#090c05', fontWeight: 500 }}>
                Remote only
              </label>
            </div>

            {/* Easy Apply Filter */}
            <div className="flex items-center space-x-2.5 py-1">
              <input
                type="checkbox"
                id="easyApply"
                checked={easyApplyOnly}
                onChange={(e) => setEasyApplyOnly(e.target.checked)}
                className="checkbox-fraser"
              />
              <label htmlFor="easyApply" className="text-sm" style={{ color: '#090c05', fontWeight: 500 }}>
                Easy Apply only
              </label>
            </div>


            {/* Error Display */}
            {error && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#fee', border: '1px solid #fcc' }}>
                <p className="text-xs" style={{ color: '#c00' }}>{error}</p>
              </div>
            )}

            {/* Search Button */}
            <button
              onClick={searchJobs}
              disabled={loading || !keywords}
              className="btn-fraser-primary w-full flex items-center justify-center space-x-2 mt-4"
              style={{ height: '40px', fontSize: '14px' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching... {Math.round(loadingProgress)}%</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Jobs</span>
                </>
              )}
            </button>

            {/* Loading Progress Bar */}
            {loading && (
              <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${loadingProgress}%`,
                    backgroundColor: '#0d0a00'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job List */}
      {view === 'jobs' && (
        <div className="flex-1 flex flex-col bg-white">
          {/* Results Header */}
          <div className="px-3.5 py-3" style={{ borderBottom: '1px solid #dad6d6', backgroundColor: '#f9f9f9' }}>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => { setView('search'); chrome.storage.local.set({ lastView: 'search' }); }}
                className="text-xs font-medium transition-colors"
                style={{ color: '#090c05' }}
              >
                ← Back to Search
              </button>
              <div className="text-xs font-medium" style={{ color: '#7f8192' }}>
                {filter === 'all'
                  ? `${filteredJobs.length} jobs to apply`
                  : filter === 'applied'
                    ? `${filteredJobs.length} applied`
                    : `${filteredJobs.length} saved`}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className="text-xs px-3 py-1.5 rounded transition-all"
                style={{
                  backgroundColor: filter === 'all' ? '#0d0a00' : 'white',
                  color: filter === 'all' ? 'white' : '#090c05',
                  border: '1px solid #dad6d6',
                  fontWeight: 500
                }}
              >
                Queue ({jobs.filter(j => !appliedJobs.includes(j.linkedinJobId)).length})
              </button>
              <button
                onClick={() => setFilter('saved')}
                className="text-xs px-3 py-1.5 rounded transition-all flex items-center gap-1"
                style={{
                  backgroundColor: filter === 'saved' ? '#0d0a00' : 'white',
                  color: filter === 'saved' ? 'white' : '#090c05',
                  border: '1px solid #dad6d6',
                  fontWeight: 500
                }}
              >
                <Star className="w-3 h-3" />
                Saved ({savedJobs.length})
              </button>
              <button
                onClick={() => setFilter('applied')}
                className="text-xs px-3 py-1.5 rounded transition-all flex items-center gap-1"
                style={{
                  backgroundColor: filter === 'applied' ? '#0d0a00' : 'white',
                  color: filter === 'applied' ? 'white' : '#090c05',
                  border: '1px solid #dad6d6',
                  fontWeight: 500
                }}
              >
                <Check className="w-3 h-3" />
                Applied ({appliedJobs.length})
              </button>
            </div>

            {/* Enriching indicator */}
            {enriching && (
              <div className="mt-2 text-xs" style={{ color: '#7f8192' }}>
                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                Enriching with salary data...
              </div>
            )}
          </div>

          {/* Job Cards */}
          <div className="flex-1 overflow-auto p-3" style={{ backgroundColor: '#f9f9f9' }}>
            {filteredJobs.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 mx-auto mb-3" style={{ color: '#dad6d6' }} />
                <p className="text-sm font-medium mb-1" style={{ color: '#090c05' }}>
                  {filter === 'saved' ? 'No saved jobs yet' : filter === 'applied' ? 'No applications yet' : 'No jobs found'}
                </p>
                <p className="text-xs" style={{ color: '#7f8192', fontWeight: 300 }}>
                  {filter === 'all' ? 'Try different search terms' : 'Start saving or applying to jobs'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredJobs.map((job, index) => {
                  const status = getJobStatus(job.linkedinJobId);
                  const isSaved = savedJobs.includes(job.linkedinJobId);
                  const isApplied = appliedJobs.includes(job.linkedinJobId);

                  return (
                    <div
                      key={job.linkedinJobId || index}
                      className="card-fraser relative"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {status === 'new' && !isSaved && !isApplied && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} title="New" />
                        )}
                        {isApplied && (
                          <div className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                            Applied
                          </div>
                        )}
                      </div>

                      {/* Job Title - Clickable */}
                      <h3
                        className="font-medium text-sm mb-1.5 leading-snug cursor-pointer hover:underline pr-16"
                        style={{ color: '#090c05' }}
                        onClick={() => openJob(job.linkedinJobId)}
                      >
                        {job.title || 'Untitled Position'}
                      </h3>

                      <p className="text-xs mb-2" style={{ color: '#7f8192', fontWeight: 300 }}>
                        {job.company.name || 'Company Name Not Available'}
                      </p>

                      {/* Salary Range */}
                      {job.salary && (
                        <div className="mb-2 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" style={{ color: job.salary.source === 'linkedin' ? '#0a66c2' : '#22c55e' }} />
                          <span className="text-xs font-medium" style={{ color: '#090c05' }}>
                            ${(job.salary.min / 1000).toFixed(0)}k - ${(job.salary.max / 1000).toFixed(0)}k
                          </span>
                          <span className="text-[9px]" style={{ color: '#7f8192' }}>
                            {job.salary.source === 'linkedin' ? '(LinkedIn)' : `(${Math.round(job.salary.confidence * 100)}% est.)`}
                          </span>
                        </div>
                      )}

                      {/* Location & Remote Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {job.location.city && (
                          <div className="flex items-center space-x-1 px-2 py-0.5 rounded" style={{ backgroundColor: '#f3f3f3', color: '#7f8192', fontSize: '10px' }}>
                            <MapPin className="w-3 h-3" />
                            <span>{job.location.city}</span>
                          </div>
                        )}

                        {job.location.remote && (
                          <span className="tag-fraser" style={{ backgroundColor: '#dceafe' }}>
                            Remote
                          </span>
                        )}

                        {job.easyApply && (
                          <span className="tag-fraser" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                            Easy Apply
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid #f3f3f3' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveJob(job.linkedinJobId);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs transition-all"
                          style={{
                            backgroundColor: isSaved ? '#dceafe' : 'white',
                            border: '1px solid #dad6d6',
                            color: '#090c05',
                            fontWeight: 500
                          }}
                        >
                          <Star className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} />
                          {isSaved ? 'Saved' : 'Save'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (job.easyApply && !isApplied) {
                              // One-click auto-apply for Easy Apply jobs
                              applyToJob(job);
                            } else {
                              // Just open the job page for non-Easy Apply
                              markAsApplied(job.linkedinJobId);
                              openJob(job.linkedinJobId);
                            }
                          }}
                          disabled={isApplied || autoApplyStatus === 'running'}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs transition-all"
                          style={{
                            backgroundColor: isApplied ? '#22c55e' : job.easyApply ? '#0a66c2' : '#0d0a00',
                            border: 'none',
                            color: 'white',
                            fontWeight: 500,
                            opacity: isApplied ? 0.7 : 1
                          }}
                        >
                          {job.easyApply && !isApplied ? (
                            <>
                              <Zap className="w-3 h-3" />
                              Auto Apply
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              {isApplied ? 'Applied' : 'Apply'}
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectJob(job.linkedinJobId);
                            setJobs(prevJobs => prevJobs.filter(j => j.linkedinJobId !== job.linkedinJobId));
                          }}
                          className="flex items-center justify-center p-1.5 rounded text-xs transition-all"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #dad6d6',
                            color: '#7f8192'
                          }}
                          title="Hide this job"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Load More Button - only show in "All" tab when there are more jobs */}
                {filter === 'all' && hasMoreJobs && filteredJobs.length > 0 && (
                  <button
                    onClick={loadMoreJobs}
                    disabled={loadingMore}
                    className="w-full py-3 mt-3 rounded text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: loadingMore ? '#f3f3f3' : 'white',
                      border: '1px solid #dad6d6',
                      color: '#090c05'
                    }}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more jobs...
                      </>
                    ) : (
                      <>Load More Jobs</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto Apply View */}
      {view === 'autoApply' && (
        <div className="flex-1 overflow-auto" style={{ backgroundColor: '#f9f9f9', padding: '14px' }}>
          <div className="space-y-4">
            {/* Resume Section */}
            <div className="card-fraser">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#090c05' }}>
                <FileText className="w-4 h-4" />
                Resume
              </h3>

              {resumeInfo ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: '#090c05' }}>{resumeInfo.fileName}</span>
                    <label className="text-xs cursor-pointer" style={{ color: '#0066cc' }}>
                      Change
                      <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                    </label>
                  </div>
                  <div className="text-xs" style={{ color: '#7f8192' }}>
                    <p>{resumeInfo.yearsExperience} years experience</p>
                    <p className="mt-1">Skills: {resumeInfo.skills.slice(0, 5).join(', ')}{resumeInfo.skills.length > 5 ? '...' : ''}</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: '#dad6d6' }}>
                  <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: '#7f8192' }} />
                  <label className="cursor-pointer">
                    <span className="text-xs font-medium" style={{ color: '#0066cc' }}>Upload Resume (PDF)</span>
                    <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] mt-1" style={{ color: '#7f8192' }}>Max 2MB</p>
                </div>
              )}
            </div>

            {/* Profile Settings - Collapsible */}
            <div className="card-fraser">
              <button
                onClick={() => setShowProfileSettings(!showProfileSettings)}
                className="w-full text-sm font-semibold flex items-center justify-between"
                style={{ color: '#090c05' }}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Profile Settings
                </span>
                <span style={{ color: '#7f8192' }}>{showProfileSettings ? '▼' : '▶'}</span>
              </button>

              {showProfileSettings && (
                <div className="mt-3 space-y-3">
                  <p className="text-[10px]" style={{ color: '#7f8192' }}>
                    These are used to auto-fill common application questions.
                  </p>

                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>Country</label>
                    <select
                      value={profileSettings.country}
                      onChange={(e) => setProfileSettings(p => ({ ...p, country: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs rounded border"
                      style={{ borderColor: '#dad6d6' }}
                    >
                      <option value="United States">United States</option>
                      <option value="India">India</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Ireland">Ireland</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>City</label>
                      <input
                        type="text"
                        value={profileSettings.city}
                        onChange={(e) => setProfileSettings(p => ({ ...p, city: e.target.value }))}
                        placeholder="New York"
                        className="w-full px-2 py-1.5 text-xs rounded border"
                        style={{ borderColor: '#dad6d6' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>State/Province</label>
                      <input
                        type="text"
                        value={profileSettings.state}
                        onChange={(e) => setProfileSettings(p => ({ ...p, state: e.target.value }))}
                        placeholder="NY"
                        className="w-full px-2 py-1.5 text-xs rounded border"
                        style={{ borderColor: '#dad6d6' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>Phone Number</label>
                    <input
                      type="tel"
                      value={profileSettings.phoneNumber}
                      onChange={(e) => setProfileSettings(p => ({ ...p, phoneNumber: e.target.value }))}
                      placeholder="+1 555-123-4567"
                      className="w-full px-2 py-1.5 text-xs rounded border"
                      style={{ borderColor: '#dad6d6' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>Email</label>
                    <input
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@email.com"
                      className="w-full px-2 py-1.5 text-xs rounded border"
                      style={{ borderColor: '#dad6d6' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>
                        Authorized in {profileSettings.country}?
                      </label>
                      <select
                        value={profileSettings.workAuthorization}
                        onChange={(e) => setProfileSettings(p => ({ ...p, workAuthorization: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs rounded border"
                        style={{ borderColor: '#dad6d6' }}
                      >
                        <option value="Yes">Yes (Authorized)</option>
                        <option value="No">No (Need Sponsorship)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: '#7f8192' }}>Start Date</label>
                      <select
                        value={profileSettings.startDate}
                        onChange={(e) => setProfileSettings(p => ({ ...p, startDate: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs rounded border"
                        style={{ borderColor: '#dad6d6' }}
                      >
                        <option value="Immediately">Immediately</option>
                        <option value="2 weeks">2 weeks</option>
                        <option value="1 month">1 month</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={saveProfileSettings}
                    className="w-full py-1.5 text-xs font-medium rounded"
                    style={{ backgroundColor: '#0d0a00', color: 'white' }}
                  >
                    Save Profile
                  </button>
                </div>
              )}
            </div>

            {/* Bulk Auto Apply */}
            <div className="card-fraser">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#090c05' }}>
                <Zap className="w-4 h-4" />
                Bulk Auto Apply
              </h3>
              <p className="text-xs mb-3" style={{ color: '#7f8192' }}>
                Auto-apply to all Easy Apply jobs from your search results. Make sure you've searched for jobs first.
              </p>

              {/* Stats */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 p-2 rounded text-center" style={{ backgroundColor: '#f3f3f3' }}>
                  <div className="text-lg font-bold" style={{ color: '#090c05' }}>
                    {jobs.filter(j => j.easyApply && !appliedJobs.includes(j.linkedinJobId)).length}
                  </div>
                  <div className="text-[10px]" style={{ color: '#7f8192' }}>Ready to Apply</div>
                </div>
                <div className="flex-1 p-2 rounded text-center" style={{ backgroundColor: '#d1fae5' }}>
                  <div className="text-lg font-bold" style={{ color: '#065f46' }}>
                    {appliedJobs.length}
                  </div>
                  <div className="text-[10px]" style={{ color: '#065f46' }}>Applied</div>
                </div>
              </div>

              <button
                onClick={startBulkAutoApply}
                disabled={autoApplyStatus === 'running' || jobs.filter(j => j.easyApply && !appliedJobs.includes(j.linkedinJobId)).length === 0}
                className="btn-fraser-primary w-full flex items-center justify-center gap-2"
                style={{ height: '40px', backgroundColor: '#0a66c2' }}
              >
                {autoApplyStatus === 'running' && bulkApplyProgress.total > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying {bulkApplyProgress.current}/{bulkApplyProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Auto Apply to All ({jobs.filter(j => j.easyApply && !appliedJobs.includes(j.linkedinJobId)).length} jobs)</span>
                  </>
                )}
              </button>

              {autoApplyMessage && (
                <p className="text-xs mt-2 text-center" style={{ color: autoApplyMessage.includes('Error') || autoApplyMessage.includes('Failed') ? '#dc2626' : '#059669' }}>
                  {autoApplyMessage}
                </p>
              )}
            </div>

            {/* Single Job Apply */}
            <div className="card-fraser">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#090c05' }}>
                <Briefcase className="w-4 h-4" />
                Single Job Apply
              </h3>
              <p className="text-xs mb-3" style={{ color: '#7f8192' }}>
                Navigate to a LinkedIn job with Easy Apply, then click below to auto-fill and submit.
              </p>
              <button
                onClick={startAutoApply}
                disabled={autoApplyStatus === 'running'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs transition-all"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #dad6d6',
                  color: '#090c05',
                  fontWeight: 500
                }}
              >
                {autoApplyStatus === 'running' && bulkApplyProgress.total === 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Apply to Current Job</span>
                  </>
                )}
              </button>
            </div>

            {/* Saved Answers Section */}
            <div className="card-fraser">
              <h3 className="text-sm font-semibold mb-3 flex items-center justify-between" style={{ color: '#090c05' }}>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Saved Answers ({savedQuestions.length})
                </span>
              </h3>

              {savedQuestions.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#7f8192' }}>
                  No saved answers yet. They'll appear here as you apply to jobs.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {savedQuestions.slice(0, 10).map((q) => (
                    <div key={q._id} className="p-2 rounded" style={{ backgroundColor: '#f3f3f3' }}>
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-medium" style={{ color: '#090c05' }}>
                          {q.questionText.length > 50 ? q.questionText.substring(0, 50) + '...' : q.questionText}
                        </p>
                        <button
                          onClick={() => deleteQuestion(q._id)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" style={{ color: '#7f8192' }} />
                        </button>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: '#7f8192' }}>
                        A: {q.answer.length > 40 ? q.answer.substring(0, 40) + '...' : q.answer}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#a0a0a0' }}>
                        Used {q.timesUsed}x
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Input Modal */}
      {missingInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#090c05' }}>
              Input Required
            </h3>
            <p className="text-xs mb-3" style={{ color: '#7f8192' }}>
              We need your input to continue applying to <strong>{missingInput.jobTitle}</strong>
            </p>

            <label className="block text-xs font-medium mb-1.5" style={{ color: '#090c05' }}>
              {missingInput.field} *
            </label>

            {missingInput.type === 'select' && missingInput.options ? (
              <select
                value={missingInputValue}
                onChange={(e) => setMissingInputValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border mb-3"
                style={{ borderColor: '#dad6d6' }}
              >
                <option value="">Select an option</option>
                {missingInput.options.map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            ) : missingInput.type === 'radio' && missingInput.options ? (
              <div className="space-y-2 mb-3">
                {missingInput.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="missingInput"
                      value={opt}
                      checked={missingInputValue === opt}
                      onChange={(e) => setMissingInputValue(e.target.value)}
                      className="w-4 h-4"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : missingInput.type === 'textarea' ? (
              <textarea
                value={missingInputValue}
                onChange={(e) => setMissingInputValue(e.target.value)}
                placeholder={`Enter ${missingInput.field.toLowerCase()}`}
                className="w-full px-3 py-2 text-sm rounded border mb-3"
                style={{ borderColor: '#dad6d6' }}
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={missingInputValue}
                onChange={(e) => setMissingInputValue(e.target.value)}
                placeholder={`Enter ${missingInput.field.toLowerCase()}`}
                className="w-full px-3 py-2 text-sm rounded border mb-3"
                style={{ borderColor: '#dad6d6' }}
              />
            )}

            <p className="text-[10px] mb-3" style={{ color: '#7f8192' }}>
              This will be saved for future applications with similar questions.
            </p>

            <div className="flex gap-2">
              <button
                onClick={cancelMissingInput}
                className="flex-1 py-2 text-xs font-medium rounded"
                style={{ backgroundColor: '#f3f3f3', color: '#090c05' }}
              >
                Cancel
              </button>
              <button
                onClick={submitMissingInput}
                disabled={!missingInputValue.trim()}
                className="flex-1 py-2 text-xs font-medium rounded"
                style={{
                  backgroundColor: missingInputValue.trim() ? '#0a66c2' : '#dad6d6',
                  color: 'white'
                }}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

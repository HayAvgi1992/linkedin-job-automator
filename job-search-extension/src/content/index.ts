/**
 * Content Script - Injects Job Search Panel into LinkedIn
 * Similar to Fraser extension pattern
 */

console.log('Job Search Extension - Content Script Loaded');

// Check if we're on a LinkedIn page
if (window.location.hostname.includes('linkedin.com')) {
  initializeJobSearchPanel();
}

function initializeJobSearchPanel() {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPanel);
  } else {
    injectPanel();
  }
}

function injectPanel() {
  // Check if panel already exists
  if (document.getElementById('job-search-panel')) {
    return;
  }

  // Create panel container - Fraser-inspired design
  const panel = document.createElement('div');
  panel.id = 'job-search-panel';
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: -380px;
    width: 380px;
    height: 100vh;
    background: white;
    box-shadow: -3px 3px 7px rgba(1, 2, 36, 0.11);
    z-index: 999999;
    transition: right 0.3s linear;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #dad6d6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create toggle button - Fraser-inspired design
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'job-search-toggle';
  toggleBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  `;
  toggleBtn.style.cssText = `
    position: fixed;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
    width: 52px;
    height: 52px;
    background: #0d0a00;
    border: none;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0px 4px 12px rgba(13, 10, 0, 0.24);
    z-index: 999998;
    transition: all 0.3s linear;
  `;

  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.transform = 'translateY(-50%) scale(1.05)';
    toggleBtn.style.backgroundColor = '#000000';
  });

  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.transform = 'translateY(-50%) scale(1)';
    toggleBtn.style.backgroundColor = '#0d0a00';
  });

  // Toggle panel visibility
  let isPanelOpen = false;
  toggleBtn.addEventListener('click', () => {
    isPanelOpen = !isPanelOpen;
    if (isPanelOpen) {
      panel.style.right = '0';
      toggleBtn.style.right = '396px';
      loadPanelContent(panel);
    } else {
      panel.style.right = '-380px';
      toggleBtn.style.right = '16px';
    }
  });

  // Add to page
  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  console.log('Job Search Panel injected successfully');
}

function loadPanelContent(panel: HTMLElement) {
  // Create iframe to load popup
  if (panel.querySelector('iframe')) {
    return; // Already loaded
  }

  try {
    const iframe = document.createElement('iframe');
    const extensionUrl = chrome.runtime.getURL('index.html');

    console.log('Loading extension UI from:', extensionUrl);

    iframe.src = extensionUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    // Add error handler
    iframe.onerror = (error) => {
      console.error('Failed to load extension UI:', error);
    };

    iframe.onload = () => {
      console.log('Extension UI loaded successfully');
    };

    panel.appendChild(iframe);
  } catch (error) {
    console.error('Error creating iframe:', error);
  }
}

/**
 * Get CSRF token from cookie (content scripts can access document.cookie)
 */
function getCSRFToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'JSESSIONID') {
      // Remove quotes if present
      return value.replace(/^"|"$/g, '');
    }
  }
  return '';
}

// Common LinkedIn Geo IDs for location filtering
const GEO_IDS: Record<string, string> = {
  // Countries
  'united states': '103644278',
  'usa': '103644278',
  'us': '103644278',
  'india': '102713980',
  'united kingdom': '101165590',
  'uk': '101165590',
  'canada': '101174742',
  'australia': '101452733',
  'germany': '101282230',
  'france': '105015875',
  'israel': '101620260',

  // US Cities/Metro Areas
  'new york': '90000070',
  'new york city': '90000070',
  'nyc': '90000070',
  'san francisco': '90000084',
  'sf': '90000084',
  'san francisco bay area': '90000084',
  'bay area': '90000084',
  'los angeles': '90000049',
  'la': '90000049',
  'seattle': '90000085',
  'austin': '90000001',
  'boston': '90000009',
  'chicago': '90000015',
  'denver': '90000022',
  'atlanta': '90000002',
  'miami': '90000053',
  'washington dc': '90000099',
  'dc': '90000099',

  // India Cities
  'bangalore': '105214831',
  'bengaluru': '105214831',
  'mumbai': '115884833',
  'delhi': '116758833',
  'new delhi': '116758833',
  'hyderabad': '105556991',
  'pune': '114806696',
  'chennai': '106319178',
  'gurgaon': '115884335',
  'gurugram': '115884335',
  'noida': '104869687',

  // UK Cities
  'london': '90009496',

  // Canada Cities
  'toronto': '100025096',
  'vancouver': '103366113',

  // Israel Cities
  'tel aviv': '101570771',
  'tel aviv-yafo': '101570771',
  'jerusalem': '104977092',
  'haifa': '106166099',
  'herzliya': '103818433',
  'ramat gan': '103818433',
  'petach tikva': '103818433',
  'petah tikva': '103818433',
  'kfar saba': '103818433',
  'beer sheva': '104492884',
  'beersheba': '104492884',
};

/**
 * Get LinkedIn Geo ID for a location string
 */
function getGeoId(location: string): string | null {
  const locationLower = location.toLowerCase().trim();

  // Direct match
  if (GEO_IDS[locationLower]) {
    return GEO_IDS[locationLower];
  }

  // Partial match
  for (const [key, geoId] of Object.entries(GEO_IDS)) {
    if (locationLower.includes(key) || key.includes(locationLower)) {
      return geoId;
    }
  }

  return null;
}

/**
 * Search LinkedIn jobs - runs in page context for same-origin requests
 */
async function searchLinkedInJobs(params: {
  keywords?: string;
  location?: string;
  remote?: boolean;
  easyApply?: boolean;
  start?: number;
  count?: number;
}): Promise<any> {
  try {
    const { keywords = '', location = '', remote = false, easyApply = false, start = 0, count = 25 } = params;
    const csrfToken = getCSRFToken();

    if (!csrfToken) {
      throw new Error('Not logged into LinkedIn - CSRF token missing');
    }

    // Build query using LinkedIn's correct format
    const queryParts = ['origin:JOB_SEARCH_PAGE_JOB_FILTER'];

    // Keywords filter
    if (keywords) {
      queryParts.push(`keywords:${keywords}`);
    }

    // Location filter - use geoId format
    const geoId = location ? getGeoId(location) : null;
    if (geoId) {
      queryParts.push(`locationUnion:(geoId:${geoId})`);
    }

    // Build selectedFilters - LinkedIn's format for filters
    const filters: string[] = [];
    filters.push('sortBy:List(R)'); // Sort by relevance

    // Easy Apply filter
    if (easyApply) {
      filters.push('applyWithLinkedin:List(true)');
    }

    // Remote filter (workplaceType: 1=On-site, 2=Remote, 3=Hybrid)
    if (remote) {
      filters.push('workplaceType:List(2)');
    }

    if (filters.length > 0) {
      queryParts.push(`selectedFilters:(${filters.join(',')})`);
    }

    queryParts.push('spellCorrectionEnabled:true');
    const queryValue = `(${queryParts.join(',')})`;

    // Manually construct URL - decorationId encoded, query NOT encoded (LinkedIn's format)
    const decorationId = 'com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-220';
    const url = `https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards?` +
      `decorationId=${encodeURIComponent(decorationId)}&` +
      `count=${count}&` +
      `q=jobSearch&` +
      `query=${queryValue}&` +
      `start=${start}`;

    console.log('Fetching jobs from:', url);
    console.log('Search params:', { keywords, location, geoId, remote, easyApply });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.linkedin.normalized+json+2.1',
        'accept-language': 'en-US,en;q=0.9',
        'csrf-token': csrfToken,
        'x-restli-protocol-version': '2.0.0',
        'x-li-lang': 'en_US',
        'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_jobs;jobSearchExtension',
        'x-li-pem-metadata': 'Voyager - Careers - Jobs Search=jobs-search-results,Voyager - Careers - Critical - careers-api=jobs-search-results',
        'x-li-track': JSON.stringify({
          clientVersion: '1.13.42216',
          mpVersion: '1.13.42216',
          osName: 'web',
          timezoneOffset: new Date().getTimezoneOffset() / -60,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceFormFactor: 'DESKTOP',
          mpName: 'voyager-web',
          displayDensity: 1,
          displayWidth: 1920,
          displayHeight: 1080,
        }),
      },
      credentials: 'include', // Important: includes cookies automatically
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn API Error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
      });
      throw new Error(`LinkedIn API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched jobs:', data.data?.paging?.total || 0);

    const { jobs: pageJobs, appliedJobIds: pageApplied } = parseJobSearchResults(data);
    return {
      success: true,
      data: pageJobs,
      appliedJobIds: pageApplied,
    };
  } catch (error: any) {
    console.error('Error searching jobs:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Parse salary string from LinkedIn format
 * Examples: "$140K/yr - $155K/yr · 3 benefits", "$45/hr - $51/hr", "Up to $125K/yr"
 */
function parseLinkedInSalary(salaryText: string): { min: number; max: number; isHourly: boolean } | null {
  if (!salaryText || !salaryText.includes('$')) return null;

  try {
    // Remove benefits text (everything after ·)
    const salaryPart = salaryText.split('·')[0].trim();

    const isHourly = salaryText.toLowerCase().includes('/hr');

    // Match salary patterns like "$140K", "$45", "$140,000"
    const amounts = salaryPart.match(/\$[\d,]+(?:\.\d+)?K?/gi) || [];

    if (amounts.length === 0) return null;

    // Parse each amount to number
    const parsedAmounts = amounts.map(amt => {
      let num = parseFloat(amt.replace(/[$,]/g, ''));
      // Handle K suffix (e.g., $140K = 140000)
      if (amt.toUpperCase().includes('K')) {
        num *= 1000;
      }
      return num;
    });

    if (parsedAmounts.length === 1) {
      // "Up to $125K" format
      if (salaryText.toLowerCase().includes('up to')) {
        return { min: parsedAmounts[0] * 0.8, max: parsedAmounts[0], isHourly };
      }
      // Single value - use as both min and max
      return { min: parsedAmounts[0], max: parsedAmounts[0], isHourly };
    }

    // Range format: "$140K - $155K"
    return {
      min: Math.min(...parsedAmounts),
      max: Math.max(...parsedAmounts),
      isHourly
    };
  } catch (error) {
    console.error('Error parsing salary:', error);
    return null;
  }
}

/**
 * Parse LinkedIn job search results
 */
function parseJobSearchResults(data: any): { jobs: any[]; appliedJobIds: string[] } {
  const jobs: any[] = [];
  const appliedJobIds: string[] = [];

  try {
    const included = data.included || [];

    // Build JobSeekerJobState map: jobId → actions
    const jobStateMap = new Map<string, any[]>();
    for (const el of included) {
      if (el.$type === 'com.linkedin.voyager.dash.jobs.JobSeekerJobState' ||
          el.entityUrn?.includes('fsd_jobSeekerJobState')) {
        const jobId = el.entityUrn?.match(/\d+$/)?.[0];
        if (jobId) {
          jobStateMap.set(jobId, el.jobSeekerJobStateActions || []);
        }
      }
    }

    // Find job posting cards (not the base job postings)
    for (const element of included) {
      if (
        element.entityUrn &&
        element.entityUrn.includes('fsd_jobPostingCard') &&
        element.entityUrn.includes('JOBS_SEARCH')
      ) {
        // Extract job ID from the job posting reference
        const jobPostingUrn = element.jobPostingUrn || element['*jobPosting'];
        if (!jobPostingUrn) continue;

        const jobId = extractJobId(jobPostingUrn);

        // Extract real postedDate from footerItems
        const footerItems = element.footerItems || [];
        const listedDateItem = footerItems.find((item: any) => item.type === 'LISTED_DATE');
        const postedDate = listedDateItem?.timeAt ? new Date(listedDateItem.timeAt) : new Date();

        // Check applied status via jobStateMap
        const actions = jobStateMap.get(jobId) || [];
        const isApplied = actions.some((a: any) => a.jobSeekerJobStateEnums === 'APPLIED');
        if (isApplied) {
          appliedJobIds.push(jobId);
        }

        // Parse salary from tertiaryDescription (LinkedIn's native salary data)
        const salaryText = element.tertiaryDescription?.text || '';
        const linkedInSalary = parseLinkedInSalary(salaryText);

        // Build salary object if LinkedIn provides it
        let salary: { min: number; max: number; confidence: number; source: string } | undefined;
        if (linkedInSalary) {
          let annualMin = linkedInSalary.min;
          let annualMax = linkedInSalary.max;

          // Convert hourly to annual (assuming 40hr/week, 52 weeks)
          if (linkedInSalary.isHourly) {
            annualMin = linkedInSalary.min * 40 * 52;
            annualMax = linkedInSalary.max * 40 * 52;
          }

          salary = {
            min: Math.round(annualMin),
            max: Math.round(annualMax),
            confidence: 0.98, // Very high confidence - directly from LinkedIn
            source: 'linkedin',
          };

          console.log(`💰 LinkedIn salary for ${element.title?.text}: $${(annualMin/1000).toFixed(0)}k-$${(annualMax/1000).toFixed(0)}k`);
        }

        // Check for Easy Apply by looking at footerItems for EASY_APPLY_TEXT type
        const isEasyApply = footerItems.some((item: any) =>
          item.type === 'EASY_APPLY_TEXT' ||
          item.text?.text?.toLowerCase().includes('easy apply')
        );

        const job = {
          linkedinJobId: jobId,
          title: element.title?.text || element.jobPostingTitle || '',
          company: {
            name: element.primaryDescription?.text || '',
            linkedinUrl: '',
          },
          location: {
            city: element.secondaryDescription?.text || '',
            remote: element.secondaryDescription?.text?.toLowerCase().includes('remote') || false,
          },
          postedDate,
          description: '',
          applicants: 0,
          easyApply: isEasyApply,
          // Include LinkedIn salary data if available
          salary,
        };

        if (isEasyApply) {
          console.log(`✨ Easy Apply job: ${job.title}`);
        }

        if (job.linkedinJobId && job.title) {
          jobs.push(job);
        }
      }
    }

    console.log('Parsed jobs:', jobs.length, '| Already applied:', appliedJobIds.length);
  } catch (error) {
    console.error('Error parsing jobs:', error);
  }

  return { jobs, appliedJobIds };
}

/**
 * Extract job ID from LinkedIn URN
 */
function extractJobId(urn: string): string {
  const match = urn.match(/\d+$/);
  return match ? match[0] : '';
}

// Import Easy Apply Controller
import { createEasyApplyController, EasyApplyController } from './easyApply/EasyApplyController';

// Easy Apply controller instance
let easyApplyController: EasyApplyController | null = null;

async function fetchJobDescriptions(jobIds: string[]): Promise<Record<string, string>> {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('JSESSIONID='))
    ?.split('=')[1]?.replace(/"/g, '') || '';

  const descriptions: Record<string, string> = {};
  const CONCURRENCY = 5;
  const DELAY_BETWEEN_BATCHES = 200;
  const MAX_DESC_LENGTH = 2000;

  for (let i = 0; i < jobIds.length; i += CONCURRENCY) {
    const batch = jobIds.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (jobId) => {
        const jobUrn = encodeURIComponent(`urn:li:fsd_jobPosting:${jobId}`);
        const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(jobPostingUrn:${jobUrn})&queryId=voyagerJobsDashJobPostings.891aed7916d7453a37e4bbf5f1f60de4`;

        let retries = 0;
        while (retries < 3) {
          const response = await fetch(url, {
            headers: {
              accept: 'application/vnd.linkedin.normalized+json+2.1',
              'csrf-token': csrfToken,
              'x-restli-protocol-version': '2.0.0',
              'x-li-lang': 'en_US',
              'x-li-track': JSON.stringify({
                clientVersion: '1.13.42962',
                mpVersion: '1.13.42962',
                osName: 'web',
                timezoneOffset: new Date().getTimezoneOffset() / -60,
                deviceFormFactor: 'DESKTOP',
                mpName: 'voyager-web',
              }),
            },
          });

          if (response.status === 429) {
            retries++;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
            continue;
          }

          if (!response.ok) return { jobId, description: '' };

          const data = await response.json();
          const included = data.included || [];
          for (const el of included) {
            if (el.description?.text) {
              return {
                jobId,
                description: el.description.text.substring(0, MAX_DESC_LENGTH),
              };
            }
          }
          return { jobId, description: '' };
        }
        return { jobId, description: '' };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        descriptions[result.value.jobId] = result.value.description;
      }
    }

    // Report progress back to background
    try {
      chrome.runtime.sendMessage({
        action: '_descriptionProgress',
        fetched: Object.keys(descriptions).length,
        total: jobIds.length,
      });
    } catch {}

    // Delay between batches
    if (i + CONCURRENCY < jobIds.length) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  return descriptions;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Ping handler - used to verify content script is loaded and ready
  if (message.action === 'ping') {
    sendResponse({ pong: true });
    return false;
  }

  if (message.action === 'togglePanel') {
    const toggleBtn = document.getElementById('job-search-toggle') as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.click();
    }
    return false;
  }

  if (message.action === 'fetchJobDescriptions') {
    fetchJobDescriptions(message.jobIds).then(sendResponse);
    return true;
  }

  if (message.action === 'searchLinkedInJobs') {
    searchLinkedInJobs(message.params).then(sendResponse);
    return true; // Keep channel open for async response
  }

  // Check page state: what apply button/badge is present?
  // Used by background to wait for page to fully render before applying (Bug 4 fix)
  if (message.action === 'easyApply_checkPage') {
    // --- Check 1: "Already applied" badge ---
    // LinkedIn shows this in many forms — broad search
    const alreadyAppliedSelectors = [
      '.artdeco-inline-feedback--success',
      '[class*="applied-badge"]',
      'span.artdeco-inline-feedback__message',
      // LinkedIn 2026 UI: "Applied" pill/badge near top card
      '.job-details-jobs-unified-top-card__primary-description-container [class*="applied"]',
      '.jobs-unified-top-card [class*="applied"]',
    ];

    let alreadyApplied = false;
    for (const sel of alreadyAppliedSelectors) {
      if (document.querySelector(sel)) {
        alreadyApplied = true;
        break;
      }
    }

    // Also search for "Applied" text anywhere in the top card / job header area
    if (!alreadyApplied) {
      const headerAreas = document.querySelectorAll(
        '.job-details-jobs-unified-top-card__primary-description-container, ' +
        '.jobs-unified-top-card, ' +
        '.jobs-details-top-card, ' +
        '.job-details-jobs-unified-top-card__container--two-pane, ' +
        // Broader: any element near the job title
        '.scaffold-layout__detail'
      );
      for (const area of headerAreas) {
        const spans = area.querySelectorAll('span, div, li');
        for (const el of spans) {
          const text = el.textContent?.trim().toLowerCase() || '';
          // Match "Applied" but not "applicants" or "apply"
          if (text === 'applied' || text === 'applied ✓' || text.startsWith('applied ')) {
            alreadyApplied = true;
            break;
          }
        }
        if (alreadyApplied) break;
      }
    }

    if (alreadyApplied) {
      sendResponse({ ready: true, pageState: 'already_applied' });
      return false;
    }

    // --- Check 2: Easy Apply button ---
    const easyApplySelectors = [
      '[aria-label="Easy Apply to this job"]',
      '[aria-label*="Easy Apply"]',
      'a[href*="/apply/"]',
      'button.jobs-apply-button',
      '.jobs-apply-button--top-card button',
    ];
    for (const sel of easyApplySelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent?.toLowerCase() || '';
        const aria = el.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('easy apply') || aria.includes('easy apply') || el.getAttribute('href')?.includes('/apply/')) {
          sendResponse({ ready: true, pageState: 'easy_apply' });
          return false;
        }
      }
    }

    // --- Check 3: Regular "Apply" button (external) ---
    const allClickables = document.querySelectorAll('button, a');
    for (const btn of allClickables) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      const aria = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if ((text === 'apply' || text === 'apply now' || aria === 'apply' || aria.includes('apply on company')) && !text.includes('easy')) {
        sendResponse({ ready: true, pageState: 'external_apply' });
        return false;
      }
    }

    // --- Fallback: Page loaded but no recognized apply element ---
    // If the job title is visible, the page HAS rendered — there's just no apply button
    // (could be: already applied with a different UI, job closed, or unrecognized layout)
    const jobTitleEl = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, ' +
      '.jobs-unified-top-card__job-title, ' +
      'h1.t-24, h1.t-20, ' +
      '.scaffold-layout__detail h1, h2.t-24'
    );
    if (jobTitleEl && jobTitleEl.textContent?.trim()) {
      // Page is loaded, just no apply element found — treat as "already applied" or unknown
      console.log('📄 Page loaded (job title found) but no apply element — treating as already_applied');
      sendResponse({ ready: true, pageState: 'already_applied' });
      return false;
    }

    // Page genuinely not ready yet
    sendResponse({ ready: false, pageState: 'loading' });
    return false;
  }

  // Auto-Apply: Start automation on current page
  // Fire-and-forget: acknowledge immediately, send result back as a new message
  // when done. The old sendResponse pattern broke because the multi-step form
  // filling (answer lookups, DOM interactions, page transitions) takes too long
  // and Chrome MV3 kills the message channel before sendResponse is called.
  if (message.action === 'easyApply_start') {
    const { visitorId, answerOverride } = message;
    if (!easyApplyController) {
      easyApplyController = createEasyApplyController(visitorId);
    }
    sendResponse({ acknowledged: true });
    console.log('🔍 Content: easyApply_start received, URL:', window.location.href);
    if (answerOverride) console.log('🔍 Content: answerOverride:', JSON.stringify(answerOverride));
    console.log('🔍 Content: Starting startAutoApply()...');

    const sendComplete = (result: any) => {
      console.log('🔍 Content: Sending easyApply_complete:', JSON.stringify(result));
      try {
        chrome.runtime.sendMessage({ action: 'easyApply_complete', result })
          .then(() => console.log('🔍 Content: easyApply_complete sent successfully'))
          .catch((err: any) => console.error('🔍 Content: easyApply_complete send FAILED:', err));
      } catch (err) {
        console.error('🔍 Content: easyApply_complete send threw:', err);
      }
    };

    easyApplyController.startAutoApply(answerOverride)
      .then(result => {
        console.log('🔍 Content: startAutoApply() resolved:', JSON.stringify(result));
        sendComplete(result);
      })
      .catch(err => {
        console.error('🔍 Content: startAutoApply() rejected:', err);
        sendComplete({ success: false, error: err?.message || 'Apply failed' });
      });
    return false;
  }

  // Auto-Apply: Apply to a specific job by ID
  if (message.action === 'easyApply_applyToJob') {
    const { visitorId, jobId } = message;
    if (!easyApplyController) {
      easyApplyController = createEasyApplyController(visitorId);
    }

    // Check if we're already on this job's page
    const currentUrl = window.location.href;
    const targetJobUrl = `https://www.linkedin.com/jobs/view/${jobId}`;

    if (currentUrl.includes(`/jobs/view/${jobId}`)) {
      // Already on the right page, just apply
      easyApplyController.startAutoApply()
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err?.message || 'Apply failed' }));
    } else {
      // Need to navigate first - tell popup to open the job and retry
      sendResponse({
        success: false,
        needsNavigation: true,
        jobUrl: targetJobUrl,
        error: 'Please navigate to the job page first',
      });
    }
    return true;
  }

  // Auto-Apply: Close modal
  if (message.action === 'easyApply_close') {
    if (easyApplyController) {
      easyApplyController.closeModal().then(() => sendResponse({ success: true }));
    } else {
      sendResponse({ success: false });
    }
    return true;
  }

  return false;
});

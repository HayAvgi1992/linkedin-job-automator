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

    return {
      success: true,
      data: parseJobSearchResults(data),
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
function parseJobSearchResults(data: any): any[] {
  const jobs: any[] = [];

  try {
    const included = data.included || [];

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
        const footerItems = element.footerItems || [];
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
          postedDate: new Date(),
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

    console.log('Parsed jobs:', jobs.length);
  } catch (error) {
    console.error('Error parsing jobs:', error);
  }

  return jobs;
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

  if (message.action === 'searchLinkedInJobs') {
    searchLinkedInJobs(message.params).then(sendResponse);
    return true; // Keep channel open for async response
  }

  // Auto-Apply: Start automation on current page
  if (message.action === 'easyApply_start') {
    const { visitorId } = message;
    if (!easyApplyController) {
      easyApplyController = createEasyApplyController(visitorId);
    }
    easyApplyController.startAutoApply().then(sendResponse);
    return true;
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
      easyApplyController.startAutoApply().then(sendResponse);
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

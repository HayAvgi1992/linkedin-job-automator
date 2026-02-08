/**
 * Easy Apply Controller
 * Automates LinkedIn Easy Apply form filling
 */

import { SELECTORS } from './selectors';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'file';
  required: boolean;
  options?: string[];
  element: HTMLElement;
  currentValue?: string;
}

interface AutoApplyResult {
  success: boolean;
  error?: string;
  questionsAnswered?: number;
  needsInput?: {
    field: string;
    type: string;
    options?: string[];
  };
  canResume?: boolean;
  navigatingTo?: string; // URL to navigate to for SDUI flow
}

// Utility to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility to wait for element with multiple selector fallbacks
async function waitForElement(selector: string, timeout = 5000): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
        if (isVisible) {
          console.log(`✅ Found element via: ${selector}`);
          return element;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
    await sleep(200);
  }
  return null;
}

// Re-export for potential use
void waitForElement;

// Global reference to the Shadow DOM root where the modal lives
let currentShadowRoot: ShadowRoot | null = null;

// Find a button by text content (case-insensitive)
// Searches both main document and Shadow DOM
function findButtonByText(texts: string[], searchRoot?: Element | ShadowRoot | Document): HTMLElement | null {
  const roots: (Element | ShadowRoot | Document)[] = [];

  // Add provided search root
  if (searchRoot) roots.push(searchRoot);

  // Add Shadow DOM if available
  if (currentShadowRoot) roots.push(currentShadowRoot);

  // Add main document as fallback
  roots.push(document);

  for (const root of roots) {
    const allButtons = root.querySelectorAll('button');
    for (const btn of allButtons) {
      const btnText = btn.textContent?.trim().toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

      for (const text of texts) {
        const searchText = text.toLowerCase();
        if (btnText === searchText || btnText.includes(searchText) ||
            ariaLabel.includes(searchText)) {
          // Make sure it's visible
          if ((btn as HTMLElement).offsetParent !== null) {
            console.log(`✅ Found button "${text}" via text/aria in ${root === document ? 'document' : 'shadow root'}`);
            return btn as HTMLElement;
          }
        }
      }
    }
  }
  return null;
}

// Find Next button - searches Shadow DOM first, then main document
function findNextButton(): HTMLElement | null {
  const selectors = [
    'button[data-easy-apply-next-button]',
    'button[aria-label="Continue to next step"]',
    'button[aria-label="Next"]',
    'footer button.artdeco-button--primary',
    'button.artdeco-button--primary', // Generic primary button
  ];

  // Search Shadow DOM first
  if (currentShadowRoot) {
    for (const selector of selectors) {
      const btn = currentShadowRoot.querySelector(selector) as HTMLElement;
      if (btn && btn.offsetParent !== null) {
        console.log(`✅ Found Next button in Shadow DOM via: ${selector}`);
        return btn;
      }
    }
  }

  // Then search main document
  for (const selector of selectors) {
    const btn = document.querySelector(selector) as HTMLElement;
    if (btn && btn.offsetParent !== null) {
      console.log(`✅ Found Next button in document via: ${selector}`);
      return btn;
    }
  }

  // Fallback to text search (which now checks Shadow DOM too)
  return findButtonByText(['next', 'continue']);
}

// Find Submit button - searches Shadow DOM first, then main document
function findSubmitButton(): HTMLElement | null {
  const selectors = [
    'button[aria-label="Submit application"]',
    'button[aria-label="Submit"]',
    'button[type="submit"]',
  ];

  // Search Shadow DOM first
  if (currentShadowRoot) {
    for (const selector of selectors) {
      const btn = currentShadowRoot.querySelector(selector) as HTMLElement;
      if (btn && btn.offsetParent !== null) {
        console.log(`✅ Found Submit button in Shadow DOM via: ${selector}`);
        return btn;
      }
    }
  }

  // Then search main document
  for (const selector of selectors) {
    const btn = document.querySelector(selector) as HTMLElement;
    if (btn && btn.offsetParent !== null) {
      console.log(`✅ Found Submit button in document via: ${selector}`);
      return btn;
    }
  }

  // Fallback to text search (which now checks Shadow DOM too)
  return findButtonByText(['submit application', 'submit']);
}

// Find modal or apply form using multiple strategies
// LinkedIn uses both traditional modals AND full-page SDUI apply flows
function findModal(): HTMLElement | null {
  // DEBUG: Log what we can find
  console.log('🔍 findModal() - Checking DOM for modal elements...');

  // RAW CHECK: Does the HTML even contain modal-related strings?
  const bodyHTML = document.body.innerHTML;
  console.log('  RAW HTML contains "easy-apply-modal":', bodyHTML.includes('easy-apply-modal'));
  console.log('  RAW HTML contains "data-test-modal":', bodyHTML.includes('data-test-modal'));
  console.log('  RAW HTML contains "artdeco-modal":', bodyHTML.includes('artdeco-modal'));

  // Check for Shadow DOM elements that might contain the modal
  const allElements = document.querySelectorAll('*');
  let shadowRoots = 0;
  let modalInShadow: HTMLElement | null = null;

  for (const el of allElements) {
    if ((el as any).shadowRoot) {
      shadowRoots++;
      const shadow = (el as any).shadowRoot as ShadowRoot;
      // Try to find modal inside shadow DOM
      const shadowModal = shadow.querySelector('[data-test-modal], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]');
      if (shadowModal) {
        console.log('  🔔 Found modal inside Shadow DOM!', el.tagName, el.className);
        modalInShadow = shadowModal as HTMLElement;
        // Store the shadow root for button finding
        currentShadowRoot = shadow;
        console.log('  📌 Stored Shadow DOM root for button searches');
      }
    }
  }
  console.log('  Elements with shadowRoot:', shadowRoots);

  if (modalInShadow) {
    return modalInShadow;
  }

  console.log('  [data-test-modal]:', !!document.querySelector('[data-test-modal]'));
  console.log('  [data-test-modal-id="easy-apply-modal"]:', !!document.querySelector('[data-test-modal-id="easy-apply-modal"]'));
  console.log('  .jobs-easy-apply-modal:', !!document.querySelector('.jobs-easy-apply-modal'));
  console.log('  .artdeco-modal:', document.querySelectorAll('.artdeco-modal').length);
  console.log('  [role="dialog"]:', document.querySelectorAll('[role="dialog"]').length);
  console.log('  .artdeco-modal-overlay:', document.querySelectorAll('.artdeco-modal-overlay').length);

  // Log all elements with "modal" in class name
  const allModalElements = document.querySelectorAll('[class*="modal"]');
  console.log('  Elements with "modal" in class:', allModalElements.length);
  if (allModalElements.length > 0 && allModalElements.length < 10) {
    allModalElements.forEach((el, i) => {
      console.log(`    [${i}] ${el.tagName}.${el.className.split(' ').slice(0, 3).join('.')}`);
    });
  }

  // Log all dialogs
  const allDialogs = document.querySelectorAll('[role="dialog"]');
  if (allDialogs.length > 0) {
    allDialogs.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      console.log(`    dialog[${i}]: ${rect.width}x${rect.height}, hasForm: ${!!el.querySelector('form')}, class: ${el.className.substring(0, 50)}`);
    });
  }

  // Strategy 1a: Find by data-test-modal attribute (newer LinkedIn UI uses empty value)
  const dataTestModal = document.querySelector('[data-test-modal]') as HTMLElement;
  if (dataTestModal) {
    const rect = dataTestModal.getBoundingClientRect();
    console.log(`  Found [data-test-modal], rect: ${rect.width}x${rect.height}`);
    if (rect.width > 0 && rect.height > 0) {
      console.log('✅ Found modal via [data-test-modal]');
      return dataTestModal;
    }
  }

  // Strategy 1b: Find the Easy Apply modal by data-test-modal-id (older LinkedIn UI)
  const easyApplyOverlay = document.querySelector('[data-test-modal-id="easy-apply-modal"]') as HTMLElement;
  if (easyApplyOverlay) {
    console.log('  Found easyApplyOverlay, checking inside...');
    // Get the actual dialog inside the overlay
    const dialog = easyApplyOverlay.querySelector('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal') as HTMLElement;
    if (dialog) {
      console.log('✅ Found Easy Apply modal via data-test-modal-id > dialog');
      return dialog;
    }
    // If no dialog inside, the overlay itself contains the form
    if (easyApplyOverlay.querySelector('form')) {
      console.log('✅ Found Easy Apply modal via data-test-modal-id (overlay with form)');
      return easyApplyOverlay;
    }
    // Even if no form yet, return the overlay if it has content
    if (easyApplyOverlay.children.length > 0) {
      console.log('✅ Found Easy Apply overlay with content (no form yet)');
      return easyApplyOverlay;
    }
  }

  // Strategy 2: Find .jobs-easy-apply-modal directly
  const jobsModal = document.querySelector('.jobs-easy-apply-modal') as HTMLElement;
  if (jobsModal) {
    const rect = jobsModal.getBoundingClientRect();
    console.log(`  .jobs-easy-apply-modal rect: ${rect.width}x${rect.height}`);
    if (rect.width > 0 && rect.height > 0) {
      console.log('✅ Found modal via .jobs-easy-apply-modal');
      return jobsModal;
    }
  }

  // Strategy 3: Find any artdeco-modal with a form inside
  const artdecoModals = document.querySelectorAll('.artdeco-modal');
  for (const modal of artdecoModals) {
    const htmlEl = modal as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    console.log(`  .artdeco-modal rect: ${rect.width}x${rect.height}, hasForm: ${!!htmlEl.querySelector('form')}`);
    if (rect.width > 0 && rect.height > 0 && htmlEl.querySelector('form')) {
      console.log('✅ Found modal via .artdeco-modal with form');
      return htmlEl;
    }
    // Even without a form, if it's visible, it might be loading
    if (rect.width > 0 && rect.height > 0) {
      console.log('✅ Found visible .artdeco-modal (no form yet, might be loading)');
      return htmlEl;
    }
  }

  // Strategy 4: Find dialog with role="dialog" that has form content
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const dialog of dialogs) {
    const htmlEl = dialog as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && htmlEl.querySelector('form, input, select')) {
      console.log('✅ Found modal via [role="dialog"] with form content');
      return htmlEl;
    }
    // Even without form content, if visible, return it
    if (rect.width > 0 && rect.height > 0) {
      console.log('✅ Found visible [role="dialog"] (checking for any inputs...)');
      return htmlEl;
    }
  }

  // Strategy 5: Check if we're on an SDUI apply page (full-page flow)
  if (window.location.href.includes('/apply')) {
    const form = document.querySelector('main form, form') as HTMLElement;
    if (form) {
      console.log('✅ Found SDUI apply form');
      return form;
    }
  }

  console.log('❌ No modal/form found');
  return null;
}

/**
 * Main Easy Apply Controller
 */
export class EasyApplyController {
  private visitorId: string;
  private isRunning = false;

  constructor(visitorId: string) {
    this.visitorId = visitorId;
  }

  /**
   * Find Easy Apply button on the page using multiple strategies
   * LinkedIn uses both <button> and <a> elements for Easy Apply
   */
  private findEasyApplyButton(): HTMLElement | null {
    // Strategy 1: Find by aria-label (works for both button and anchor)
    const ariaSelectors = [
      '[aria-label="Easy Apply to this job"]',
      '[aria-label*="Easy Apply"]',
      '[data-view-name="job-apply-button"]',
    ];

    for (const selector of ariaSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log(`Found Easy Apply element via aria selector: ${selector}`);
        return element;
      }
    }

    // Strategy 2: Direct button/anchor selectors (new and old LinkedIn UI)
    const selectors = [
      SELECTORS.easyApplyAnchor,
      SELECTORS.easyApplyAnchorAlt,
      SELECTORS.easyApplyAnchorHref,
      SELECTORS.easyApplyButton,
      SELECTORS.easyApplyButtonAlt,
      SELECTORS.jobDetailApplyButton,
      '.jobs-apply-button',
      'button.jobs-apply-button--top-card',
      'a[href*="/apply/"]',
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector) as HTMLElement;
      if (btn) {
        // Verify it's an Easy Apply button by checking text or aria
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('easy apply') || ariaLabel.includes('easy apply') ||
            btn.classList.contains('jobs-apply-button')) {
          console.log(`Found Easy Apply button via selector: ${selector}`);
          return btn;
        }
      }
    }

    // Strategy 3: Find by text content in buttons
    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      if (text === 'easy apply' || text.includes('easy apply')) {
        console.log('Found Easy Apply button via button text content');
        return btn as HTMLElement;
      }
    }

    // Strategy 4: Find by text content in anchors (new LinkedIn UI)
    const allAnchors = document.querySelectorAll('a');
    for (const anchor of allAnchors) {
      const text = anchor.textContent?.trim().toLowerCase() || '';
      const href = anchor.getAttribute('href') || '';
      if ((text.includes('easy apply') || href.includes('/apply/')) &&
          !href.includes('offsite')) {
        console.log('Found Easy Apply anchor via text/href');
        return anchor as HTMLElement;
      }
    }

    // Strategy 5: Find by span inside any clickable element
    const spans = document.querySelectorAll('button span, a span');
    for (const span of spans) {
      if (span.textContent?.trim().toLowerCase() === 'easy apply') {
        console.log('Found Easy Apply via span text');
        const parent = span.closest('button') || span.closest('a');
        return parent as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Apply to a specific job by navigating to it first
   */
  async applyToJob(jobId: string): Promise<AutoApplyResult> {
    console.log(`🎯 Applying to job: ${jobId}`);

    // Navigate to the job page
    const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}`;
    window.location.href = jobUrl;

    // Wait for page to load
    await sleep(3000);

    // Now start the auto-apply
    return this.startAutoApply();
  }

  /**
   * Start auto-apply process for current job
   */
  async startAutoApply(): Promise<AutoApplyResult> {
    if (this.isRunning) {
      return { success: false, error: 'Auto-apply already in progress' };
    }

    this.isRunning = true;
    let questionsAnswered = 0;

    // CRITICAL: Reset Shadow DOM reference at the start of each application
    // This prevents stale references from previous applications causing issues
    currentShadowRoot = null;
    console.log('🔄 Reset currentShadowRoot to null for fresh start');

    try {
      console.log('🚀 Starting Easy Apply automation');
      console.log('📍 Current URL:', window.location.href);

      // Check if we're already on an apply page (SDUI flow)
      const isApplyPage = window.location.href.includes('/apply');
      console.log(`Is apply page: ${isApplyPage}`);

      // Step 1: Check if modal/form is already available
      let modal = findModal();
      console.log(`Initial modal/form check: ${modal ? 'FOUND' : 'NOT FOUND'}`);

      // If we're on an apply page and found a form, we can proceed directly
      if (isApplyPage && modal) {
        console.log('📋 Already on apply page with form, proceeding to fill');
      } else if (!modal) {
        // Step 2: Find and click Easy Apply button
        const easyApplyBtn = this.findEasyApplyButton();
        if (!easyApplyBtn) {
          // If we're on an apply page but couldn't find the form, wait a bit more
          if (isApplyPage) {
            console.log('⏳ On apply page but form not ready, waiting...');
            await sleep(2000);
            modal = findModal();
            if (!modal) {
              return { success: false, error: 'Application form not found on apply page. Try refreshing.' };
            }
          } else {
            return { success: false, error: 'Easy Apply button not found. Make sure you are on a job page with Easy Apply.' };
          }
        } else {
          console.log(`Found Easy Apply element: ${easyApplyBtn.tagName}, text: "${easyApplyBtn.textContent?.trim().substring(0, 30)}"`);
          console.log(`  href: ${easyApplyBtn.getAttribute('href')}`);
          console.log(`  aria-label: ${easyApplyBtn.getAttribute('aria-label')}`);

          // Check if this is an SDUI anchor (new LinkedIn flow that navigates to a separate apply page)
          const href = easyApplyBtn.getAttribute('href');
          if (easyApplyBtn.tagName === 'A' && href && href.includes('/apply/')) {
            console.log('📋 SDUI flow detected - anchor tag with apply URL');
            console.log('   Returning navigation URL for popup to handle');
            // Return special response so popup can navigate the tab to the apply page
            return {
              success: false,
              error: 'NAVIGATION_TO_APPLY_PAGE',
              navigatingTo: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
            };
          }

          console.log('🖱️ Clicking Easy Apply button using multiple strategies...');

          // Set up MutationObserver to detect modal being added to DOM
          let modalDetected = false;
          let modalElement: HTMLElement | null = null;
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              // Log ALL mutations for debugging
              if (mutation.addedNodes.length > 0) {
                console.log(`🔔 MutationObserver: ${mutation.addedNodes.length} nodes added`);
              }
              for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                  console.log(`   Added: ${node.tagName} class="${(node.className || '').substring?.(0, 60)}"`);
                  // Check if modal was added
                  if (node.matches?.('[data-test-modal], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]') ||
                      node.querySelector?.('[data-test-modal], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]')) {
                    console.log('🔔🔔🔔 MODAL ELEMENT DETECTED IN DOM!');
                    modalDetected = true;
                    modalElement = node.matches?.('[data-test-modal], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]')
                      ? node
                      : node.querySelector('[data-test-modal], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]') as HTMLElement;
                  }
                }
              }
            }
          });
          // Observe EVERYTHING - body AND documentElement
          observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

          // Strategy 1: Native .click() method
          console.log('  Strategy 1: Native click()');
          easyApplyBtn.click();
          await sleep(500);

          if (!modalDetected) {
            // Strategy 2: Focus + Enter key (simulates keyboard navigation)
            console.log('  Strategy 2: Focus + Enter key');
            easyApplyBtn.focus();
            await sleep(100);
            easyApplyBtn.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }));
            easyApplyBtn.dispatchEvent(new KeyboardEvent('keyup', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }));
            await sleep(500);
          }

          if (!modalDetected) {
            // Strategy 3: Full mouse event sequence (mousedown -> mouseup -> click)
            console.log('  Strategy 3: Full mouse event sequence');
            const rect = easyApplyBtn.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const mouseEventInit = {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: 1,
              clientX: centerX,
              clientY: centerY,
              screenX: centerX,
              screenY: centerY,
            };

            easyApplyBtn.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
            await sleep(50);
            easyApplyBtn.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));
            await sleep(50);
            easyApplyBtn.dispatchEvent(new MouseEvent('click', mouseEventInit));
            await sleep(500);
          }

          if (!modalDetected && easyApplyBtn.tagName === 'A') {
            // Strategy 4: Click inner span element
            console.log('  Strategy 4: Click inner span');
            const innerSpan = easyApplyBtn.querySelector('span');
            if (innerSpan) {
              (innerSpan as HTMLElement).click();
              await sleep(500);
            }
          }

          // DON'T stop observing yet - keep watching for a bit longer
          console.log(`  MutationObserver result so far: modalDetected = ${modalDetected}`);

          // If we caught the modal via observer, use it directly
          if (modalDetected && modalElement) {
            console.log('✅ Using modal element captured by MutationObserver');
            observer.disconnect();
            modal = modalElement;
          } else {
            // CRITICAL DEBUG: Can we even access the DOM at all?
            const totalElements = document.querySelectorAll('*').length;
            console.log(`  🔬 Total elements in DOM: ${totalElements}`);

            // Check overlay container directly
            const overlayContainer = document.querySelector('.application-outlet__overlay-container');
            if (overlayContainer) {
              console.log(`  🔬 Found overlay container, children: ${overlayContainer.children.length}`);
              Array.from(overlayContainer.children).forEach((child, i) => {
                const el = child as HTMLElement;
                console.log(`    child[${i}]: ${el.tagName} class="${el.className?.substring(0, 50)}"`);
              });
            } else {
              console.log('  🔬 overlay container NOT found');
            }

            // Wait additional time for modal animation/rendering
            console.log('⏳ Waiting for modal to appear (keeping observer active)...');
            await sleep(2000);  // Increased wait time

            // Check observer results again
            console.log(`  MutationObserver final result: modalDetected = ${modalDetected}`);
            if (modalDetected && modalElement) {
              console.log('✅ Modal appeared during extended wait!');
              modal = modalElement;
            }

            // Now stop observing
            observer.disconnect();
          }

          // Check if URL changed (SDUI navigation happened)
          if (window.location.href.includes('/apply')) {
            console.log('📋 Navigation to apply page detected, re-running detection');
            await sleep(1000);
            modal = findModal();
            if (modal) {
              console.log('✅ Found form on apply page');
            }
          }

          // Try multiple times to find the modal
          if (!modal) {
            for (let attempt = 1; attempt <= 10; attempt++) {
              modal = findModal();
              if (modal) {
                console.log(`✅ Modal found on attempt ${attempt}`);
                break;
              }
              console.log(`⏳ Modal not found, attempt ${attempt}/10...`);

              // Extra debug: check for any overlay or modal-like elements
              if (attempt === 5) {
                console.log('🔍 Debug dump at attempt 5:');
                console.log('  document.activeElement:', document.activeElement?.tagName, document.activeElement?.className);
                const overlays = document.querySelectorAll('[class*="overlay"]');
                console.log('  Overlay elements:', overlays.length);
                const dialogs = document.querySelectorAll('[role="dialog"]');
                console.log('  Dialog elements:', dialogs.length);
                dialogs.forEach((d, i) => {
                  const el = d as HTMLElement;
                  console.log(`    dialog[${i}]: visible=${el.offsetParent !== null}, class=${el.className.substring(0, 60)}`);
                });
              }

              await sleep(800);
            }
          }

          if (!modal) {
            // Final debug output
            console.log('❌ Modal never appeared. Final DOM state:');
            console.log('  URL:', window.location.href);
            console.log('  [data-test-modal]:', document.querySelectorAll('[data-test-modal]').length);
            console.log('  .jobs-easy-apply-modal:', document.querySelectorAll('.jobs-easy-apply-modal').length);
            console.log('  .artdeco-modal:', document.querySelectorAll('.artdeco-modal').length);
            console.log('  [role="dialog"]:', document.querySelectorAll('[role="dialog"]').length);

            // Check execution context
            console.log('  window === window.top:', window === window.top);
            console.log('  document.domain:', document.domain);
            console.log('  Number of iframes:', document.querySelectorAll('iframe').length);

            // Final raw HTML check
            const finalHTML = document.body.innerHTML;
            console.log('  FINAL RAW HTML contains "easy-apply":', finalHTML.includes('easy-apply'));
            console.log('  FINAL RAW HTML contains "modal":', finalHTML.includes('modal'));

            // Try to find ANY visible overlay/dialog-like element
            const visibleOverlays = Array.from(document.querySelectorAll('div')).filter(div => {
              const style = window.getComputedStyle(div);
              const rect = div.getBoundingClientRect();
              return (
                style.position === 'fixed' &&
                rect.width > 300 &&
                rect.height > 300 &&
                style.zIndex && parseInt(style.zIndex) > 100
              );
            });
            console.log('  Fixed divs with high z-index (possible modals):', visibleOverlays.length);
            visibleOverlays.forEach((el, i) => {
              console.log(`    [${i}]: ${el.className.substring(0, 80)}`);
            });

            // Check if there's a "not available" message
            const notAvailable = document.querySelector('.jobs-apply-button--disabled, [class*="not-available"]');
            if (notAvailable) {
              return {
                success: false,
                error: 'Easy Apply not available for this job (may be closed or already applied).',
                canResume: false
              };
            }

            return {
              success: false,
              error: 'Easy Apply modal did not open. The button was clicked but no modal appeared. This may be due to LinkedIn detecting automated interaction.',
              canResume: false
            };
          }
        }
      }

      console.log('📋 Modal opened, starting form automation');

      // Process each step until we reach submit
      let maxSteps = 10; // Safety limit
      let currentStep = 0;

      while (currentStep < maxSteps) {
        currentStep++;
        console.log(`📄 Processing step ${currentStep}`);

        // Get current section type
        const sectionTitle = this.getCurrentSectionTitle();
        console.log(`Section: ${sectionTitle}`);

        // Check if we're on the SUCCESS/confirmation page
        // LinkedIn shows "Application sent" dialog after successful submission
        const shadowRoot = currentShadowRoot as ShadowRoot | null; // Local ref for TypeScript
        const successHeader = shadowRoot?.querySelector('h2#post-apply-modal, h3.jpac-modal-header');
        const successText = successHeader?.textContent?.toLowerCase() || '';
        if (successText.includes('application sent') || successText.includes('applied')) {
          console.log('🎉 Application submitted successfully! (detected success dialog)');

          // Click "Done" button to close the modal
          const doneBtn = findButtonByText(['done']);
          if (doneBtn) {
            console.log('🖱️ Clicking Done button to close success dialog');
            doneBtn.click();
            await sleep(500);
          }

          return { success: true, questionsAnswered };
        }

        // Check if we're on review page
        if (sectionTitle.toLowerCase().includes('review')) {
          console.log('✅ Reached review page');
          const submitBtn = findSubmitButton();

          if (submitBtn) {
            console.log('🖱️ Clicking Submit button');
            submitBtn.click();
            await sleep(2000);

            // Verify submission succeeded (modal should close or show success)
            const modalStillOpen = findModal();
            if (!modalStillOpen) {
              console.log('🎉 Application submitted! (modal closed)');
              return { success: true, questionsAnswered };
            }

            // Check for success message
            const successMsg = document.querySelector('[class*="success"], [class*="submitted"]');
            if (successMsg) {
              console.log('🎉 Application submitted! (success message found)');
              return { success: true, questionsAnswered };
            }

            // Modal still open, might have errors
            const errorMsg = document.querySelector('.artdeco-inline-feedback--error');
            if (errorMsg) {
              return {
                success: false,
                error: `Submission error: ${errorMsg.textContent?.trim()}`,
                questionsAnswered
              };
            }

            // Assume success if we clicked submit
            console.log('🎉 Application submitted! (assumed)');
            return { success: true, questionsAnswered };
          }
        }

        // Detect and fill form fields
        const fields = this.detectFormFields();
        console.log(`Found ${fields.length} form fields`);

        for (const field of fields) {
          // Skip if already filled
          if (field.currentValue && field.currentValue !== 'Select an option') {
            console.log(`Skipping already filled: ${field.label}`);
            continue;
          }

          // Get answer for this field
          const answer = await this.getAnswerForField(field);

          if (answer) {
            await this.fillField(field, answer);
            questionsAnswered++;
            console.log(`✅ Filled: ${field.label} = ${answer}`);
          } else if (field.required) {
            console.log(`⚠️ No answer for required field: ${field.label}`);
            // Return with info needed for user to provide input
            const fieldLower = field.label.toLowerCase();
            let hint = '';

            if (fieldLower.includes('city') || fieldLower.includes('location')) {
              hint = 'Set your city in Profile Settings';
            } else if (fieldLower.includes('phone')) {
              hint = 'Set your phone in Profile Settings';
            } else if (fieldLower.includes('email')) {
              hint = 'Set your email in Profile Settings';
            } else if (fieldLower.includes('first name')) {
              hint = 'First name is pre-filled from LinkedIn';
            } else if (fieldLower.includes('last name')) {
              hint = 'Last name is pre-filled from LinkedIn';
            }

            return {
              success: false,
              error: `Need user input for: ${field.label}${hint ? ` (${hint})` : ''}`,
              questionsAnswered,
              needsInput: {
                field: field.label,
                type: field.type,
                options: field.options,
              },
              canResume: true, // Modal is still open, can resume after user provides input
            };
          }
        }

        // Handle resume selection if on resume step
        if (sectionTitle.includes('Resume')) {
          await this.handleResumeStep();
        }

        // Click Next button using the helper function
        const nextBtn = findNextButton();

        if (!nextBtn) {
          console.log('No next button found, checking for submit or review');

          // Check for review button first
          const reviewBtn = findButtonByText(['review', 'review your application']);
          if (reviewBtn) {
            console.log('🖱️ Clicking Review button');
            reviewBtn.click();
            await sleep(1500);
            continue; // Go to next iteration to process review page
          }

          // Try submit button
          const submitBtn = findSubmitButton();

          if (submitBtn) {
            console.log('🖱️ Clicking Submit button');
            submitBtn.click();
            await sleep(2000);

            // Verify submission
            const modalStillOpen = findModal();
            if (!modalStillOpen) {
              console.log('🎉 Application submitted! (modal closed)');
              return { success: true, questionsAnswered };
            }

            console.log('🎉 Application submitted!');
            return { success: true, questionsAnswered };
          }

          console.log('⚠️ No navigation button found - may be stuck');
          break;
        }

        console.log('🖱️ Clicking Next button');
        nextBtn.click();
        await sleep(1500);

        // Check for validation errors
        const errors = document.querySelectorAll(SELECTORS.errorMessage);
        if (errors.length > 0) {
          const errorText = (errors[0] as HTMLElement).textContent?.trim();
          console.log(`❌ Validation error: ${errorText}`);
          return { success: false, error: errorText, questionsAnswered };
        }
      }

      return { success: true, questionsAnswered };

    } catch (error: any) {
      console.error('Auto-apply error:', error);
      return { success: false, error: error.message, questionsAnswered };
    } finally {
      this.isRunning = false;
      // Reset Shadow DOM reference for clean state on next run
      currentShadowRoot = null;
      console.log('🔄 Cleanup: Reset currentShadowRoot');
    }
  }

  /**
   * Get current section title from modal
   */
  private getCurrentSectionTitle(): string {
    const titleEl = document.querySelector(SELECTORS.sectionTitle);
    return titleEl?.textContent?.trim() || '';
  }

  /**
   * Detect all form fields on current page
   */
  private detectFormFields(): FormField[] {
    const fields: FormField[] = [];

    // Strategy 1: Standard LinkedIn form elements - check Shadow DOM first
    let formElements: NodeListOf<Element>;
    if (currentShadowRoot) {
      formElements = currentShadowRoot.querySelectorAll(SELECTORS.formElement);
      console.log(`Found ${formElements.length} form elements via standard selector in Shadow DOM`);
    } else {
      formElements = document.querySelectorAll(SELECTORS.formElement);
      console.log(`Found ${formElements.length} form elements via standard selector in document`);
    }

    formElements.forEach((element, index) => {
      const field = this.parseFormElement(element, index);
      if (field) fields.push(field);
    });

    // Strategy 2: If no fields found, try broader selectors
    if (fields.length === 0) {
      console.log('No fields via standard selector, trying broader search...');

      // Find all inputs/selects/textareas within the modal or form
      const modal = findModal();
      // Check Shadow DOM for form if no modal found
      let container: Element | null = modal;
      if (!container && currentShadowRoot) {
        container = currentShadowRoot.querySelector('form');
        console.log('  Searching for form in Shadow DOM:', !!container);
      }
      if (!container) {
        container = document.querySelector('form');
      }

      if (container) {
        // Find selects
        container.querySelectorAll('select').forEach((select, idx) => {
          const field = this.parseSelectElement(select as HTMLSelectElement, idx);
          if (field) fields.push(field);
        });

        // Find text inputs
        container.querySelectorAll('input[type="text"], input:not([type])').forEach((input, idx) => {
          const field = this.parseInputElement(input as HTMLInputElement, fields.length + idx);
          if (field) fields.push(field);
        });

        // Find textareas
        container.querySelectorAll('textarea').forEach((textarea, idx) => {
          const field = this.parseTextareaElement(textarea as HTMLTextAreaElement, fields.length + idx);
          if (field) fields.push(field);
        });

        // Find radio groups
        const radioGroups = new Set<string>();
        container.querySelectorAll('input[type="radio"]').forEach(radio => {
          const name = (radio as HTMLInputElement).name;
          if (name && !radioGroups.has(name)) {
            radioGroups.add(name);
            const field = this.parseRadioGroup(container, name, fields.length);
            if (field) fields.push(field);
          }
        });
      }

      console.log(`Found ${fields.length} fields via broader search`);
    }

    return fields;
  }

  /**
   * Parse a form element container
   */
  private parseFormElement(element: Element, index: number): FormField | null {
    const labelEl = element.querySelector('label');
    const label = labelEl?.textContent?.trim() || '';

    // Skip if no label
    if (!label) return null;

    const isRequired = element.querySelector(SELECTORS.requiredIndicator) !== null;
    let type: FormField['type'] = 'text';
    let inputElement: HTMLElement | null = null;
    let options: string[] | undefined;
    let currentValue: string | undefined;

    // Check for select dropdown
    const select = element.querySelector('select') as HTMLSelectElement;
    if (select) {
      type = 'select';
      inputElement = select;
      options = Array.from(select.options)
        .map(opt => opt.textContent?.trim() || '')
        .filter(text => text && text !== 'Select an option');
      currentValue = select.value;
    }
    // Check for textarea
    else if (element.querySelector('textarea')) {
      type = 'textarea';
      inputElement = element.querySelector('textarea');
      currentValue = (inputElement as HTMLTextAreaElement)?.value;
    }
    // Check for radio buttons
    else if (element.querySelector('input[type="radio"]')) {
      type = 'radio';
      inputElement = element as HTMLElement;
      const radios = element.querySelectorAll('input[type="radio"]');
      options = Array.from(radios).map(radio => {
        const labelText = radio.nextElementSibling?.textContent?.trim() ||
                         (radio as HTMLInputElement).value;
        return labelText;
      });
      const checked = element.querySelector('input[type="radio"]:checked') as HTMLInputElement;
      currentValue = checked?.nextElementSibling?.textContent?.trim();
    }
    // Check for checkbox
    else if (element.querySelector('input[type="checkbox"]')) {
      type = 'checkbox';
      inputElement = element as HTMLElement;
    }
    // Default to text input
    else {
      const input = element.querySelector('input') as HTMLInputElement;
      if (input) {
        type = 'text';
        inputElement = input;
        currentValue = input.value;
      }
    }

    if (inputElement) {
      return {
        id: `field_${index}`,
        label,
        type,
        required: isRequired,
        options,
        element: inputElement,
        currentValue,
      };
    }

    return null;
  }

  /**
   * Parse a standalone select element
   */
  private parseSelectElement(select: HTMLSelectElement, index: number): FormField | null {
    // Try to find associated label
    const labelFor = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;
    const parentLabel = select.closest('label');
    const ariaLabel = select.getAttribute('aria-label');
    const label = labelFor?.textContent?.trim() || parentLabel?.textContent?.trim() || ariaLabel || `Select ${index + 1}`;

    const options = Array.from(select.options)
      .map(opt => opt.textContent?.trim() || '')
      .filter(text => text && text !== 'Select an option');

    return {
      id: `select_${index}`,
      label,
      type: 'select',
      required: select.required || select.getAttribute('aria-required') === 'true',
      options,
      element: select,
      currentValue: select.value,
    };
  }

  /**
   * Parse a standalone input element
   */
  private parseInputElement(input: HTMLInputElement, index: number): FormField | null {
    // Skip hidden or submit inputs
    if (input.type === 'hidden' || input.type === 'submit') return null;

    // Try to find associated label
    const labelFor = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
    const parentLabel = input.closest('label');
    const ariaLabel = input.getAttribute('aria-label');
    const placeholder = input.placeholder;
    const label = labelFor?.textContent?.trim() || parentLabel?.textContent?.trim() || ariaLabel || placeholder || `Input ${index + 1}`;

    return {
      id: `input_${index}`,
      label,
      type: 'text',
      required: input.required || input.getAttribute('aria-required') === 'true',
      element: input,
      currentValue: input.value,
    };
  }

  /**
   * Parse a standalone textarea element
   */
  private parseTextareaElement(textarea: HTMLTextAreaElement, index: number): FormField | null {
    // Try to find associated label
    const labelFor = textarea.id ? document.querySelector(`label[for="${textarea.id}"]`) : null;
    const parentLabel = textarea.closest('label');
    const ariaLabel = textarea.getAttribute('aria-label');
    const placeholder = textarea.placeholder;
    const label = labelFor?.textContent?.trim() || parentLabel?.textContent?.trim() || ariaLabel || placeholder || `Text ${index + 1}`;

    return {
      id: `textarea_${index}`,
      label,
      type: 'textarea',
      required: textarea.required || textarea.getAttribute('aria-required') === 'true',
      element: textarea,
      currentValue: textarea.value,
    };
  }

  /**
   * Parse a radio button group
   */
  private parseRadioGroup(container: Element, name: string, index: number): FormField | null {
    const radios = container.querySelectorAll(`input[type="radio"][name="${name}"]`);
    if (radios.length === 0) return null;

    // Try to find the group label
    const firstRadio = radios[0] as HTMLInputElement;
    const fieldset = firstRadio.closest('fieldset');
    const legend = fieldset?.querySelector('legend');
    const groupContainer = firstRadio.closest('[role="radiogroup"]');
    const ariaLabel = groupContainer?.getAttribute('aria-label');

    const label = legend?.textContent?.trim() || ariaLabel || `Choice ${index + 1}`;

    const options = Array.from(radios).map(radio => {
      const labelEl = radio.nextElementSibling as HTMLElement;
      return labelEl?.textContent?.trim() || (radio as HTMLInputElement).value;
    });

    const checked = container.querySelector(`input[type="radio"][name="${name}"]:checked`) as HTMLInputElement;

    return {
      id: `radio_${index}`,
      label,
      type: 'radio',
      required: firstRadio.required || firstRadio.getAttribute('aria-required') === 'true',
      options,
      element: groupContainer as HTMLElement || firstRadio.closest('div') as HTMLElement,
      currentValue: checked?.nextElementSibling?.textContent?.trim(),
    };
  }

  /**
   * Get answer for a form field from backend
   */
  private async getAnswerForField(field: FormField): Promise<string | null> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'easyApply_lookupAnswer',
        visitorId: this.visitorId,
        questionText: field.label,
        questionType: field.type,
        options: field.options,
      });

      if (response?.success) {
        if (response.found) {
          return response.answer;
        } else if (response.suggestedAnswer && response.confidence >= 0.7) {
          // Auto-use high confidence AI answers
          // Save for future use
          await chrome.runtime.sendMessage({
            action: 'easyApply_saveAnswer',
            visitorId: this.visitorId,
            questionText: field.label,
            questionType: field.type,
            answer: response.suggestedAnswer,
            answerSource: 'ai',
          });
          return response.suggestedAnswer;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting answer:', error);
      return null;
    }
  }

  /**
   * Fill a form field with a value
   */
  private async fillField(field: FormField, value: string): Promise<void> {
    const element = field.element;

    switch (field.type) {
      case 'select': {
        const select = element as HTMLSelectElement;
        // Find matching option
        const option = Array.from(select.options).find(
          opt => opt.value === value ||
                 opt.textContent?.trim().toLowerCase() === value.toLowerCase() ||
                 opt.textContent?.includes(value)
        );
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'text':
      case 'textarea': {
        const input = element as HTMLInputElement | HTMLTextAreaElement;
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        break;
      }

      case 'radio': {
        const radios = element.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
          const radioInput = radio as HTMLInputElement;
          const labelText = radioInput.nextElementSibling?.textContent?.trim() ||
                           radioInput.value;
          if (labelText.toLowerCase() === value.toLowerCase() ||
              labelText.includes(value) ||
              value.includes(labelText)) {
            radioInput.checked = true;
            radioInput.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
        break;
      }

      case 'checkbox': {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]');
        const values = value.split(',').map(v => v.trim().toLowerCase());
        for (const checkbox of checkboxes) {
          const checkboxInput = checkbox as HTMLInputElement;
          const labelText = checkboxInput.nextElementSibling?.textContent?.trim().toLowerCase() ||
                           checkboxInput.value.toLowerCase();
          checkboxInput.checked = values.some(v => labelText.includes(v) || v.includes(labelText));
          checkboxInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }
    }

    await sleep(100);
  }

  /**
   * Handle resume selection step
   */
  private async handleResumeStep(): Promise<void> {
    // Check if a resume is already selected
    const selectedResume = document.querySelector(SELECTORS.resumeCardSelected);
    if (selectedResume) {
      console.log('Resume already selected');
      return;
    }

    // Select the first available resume
    const resumeCards = document.querySelectorAll(SELECTORS.resumeCard);
    if (resumeCards.length > 0) {
      const firstCard = resumeCards[0] as HTMLElement;
      const radioLabel = firstCard.querySelector(SELECTORS.resumeToggleLabel) as HTMLElement;
      if (radioLabel) {
        radioLabel.click();
        await sleep(500);
        console.log('Selected first resume');
      }
    }
  }

  /**
   * Close the modal
   */
  async closeModal(): Promise<void> {
    const dismissBtn = document.querySelector(SELECTORS.dismissButton) as HTMLElement;
    if (dismissBtn) {
      dismissBtn.click();
      await sleep(500);
    }
  }
}

/**
 * Export singleton instance creator
 */
export function createEasyApplyController(visitorId: string): EasyApplyController {
  return new EasyApplyController(visitorId);
}

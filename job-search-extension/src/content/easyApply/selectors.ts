/**
 * LinkedIn Easy Apply DOM Selectors
 * Based on actual LinkedIn HTML structure (2026)
 */

export const SELECTORS = {
  // Modal container (both old and new LinkedIn UI) - multiple fallbacks
  modal: '[data-test-modal-id="easy-apply-modal"], .jobs-easy-apply-modal, .artdeco-modal, [role="dialog"][aria-labelledby*="apply"], .artdeco-modal--layer-default',
  modalOverlay: '.artdeco-modal-overlay, [data-test-modal-container]',
  modalDialog: '.jobs-easy-apply-modal, .artdeco-modal, [role="dialog"]',
  modalContent: '.jobs-easy-apply-modal__content, .artdeco-modal__content, [role="dialog"] form',
  modalHeader: '.artdeco-modal__header, [id="jobs-apply-header"]',
  dismissButton: 'button.artdeco-modal__dismiss, button[aria-label="Dismiss"], button[aria-label="Close"], [data-test-modal-close-btn]',

  // Progress indicator
  progressBar: 'progress.artdeco-completeness-meter-linear__progress-element',
  progressText: '[aria-label*="job application progress"]',

  // Form container
  formContainer: '.jobs-easy-apply-content, form',
  formSection: '.BWWQXYQstElWAtCRSBDiNFbfUHScrPIQE',

  // Form elements
  formElement: '.fb-dash-form-element',
  selectDropdown: 'select.fb-dash-form-element__select-dropdown',
  textInput: 'input.artdeco-text-input--input',
  textInputContainer: '.artdeco-text-input--container',
  textarea: 'textarea',

  // Labels
  label: 'label.artdeco-text-input--label, label.fb-dash-form-element__label',
  labelTitle: '[data-test-text-entity-list-form-title]',
  requiredIndicator: '[aria-required="true"], [required]',

  // Radio and checkbox
  radioGroup: '[role="radiogroup"]',
  radioInput: 'input[type="radio"]',
  checkboxInput: 'input[type="checkbox"]',

  // Resume section
  resumeSection: '.jobs-document-upload',
  resumeCard: '.jobs-document-upload-redesign-card__container',
  resumeCardSelected: '.jobs-document-upload-redesign-card__container--selected',
  resumeRadioInput: '.jobs-document-upload-redesign-card__container input[type="radio"]',
  resumeToggleLabel: '.jobs-document-upload-redesign-card__toggle-label',
  resumeFileName: '.jobs-document-upload-redesign-card__file-name',
  resumeUploadInput: 'input[type="file"][accept*="pdf"]',
  resumeUploadButton: '.jobs-document-upload__upload-button',

  // Navigation buttons (multiple selectors for old and new UI)
  nextButton: 'button[data-easy-apply-next-button]',
  nextButtonAlt: 'button[aria-label="Continue to next step"], button[aria-label="Next"]',
  backButton: 'button[aria-label="Back to previous step"], button[aria-label="Back"]',
  submitButton: 'button[aria-label="Submit application"], button[aria-label="Submit"]',
  reviewButton: 'button[aria-label="Review your application"], button[aria-label="Review"]',
  // Footer buttons (new UI often puts buttons in footer)
  footerNextButton: 'footer button[type="button"]:not([aria-label*="Back"])',
  footerSubmitButton: 'footer button[type="submit"]',

  // Section titles (to identify current step)
  sectionTitle: 'h3.t-16.t-bold, h3.t-18',

  // Review page
  reviewSection: '.form-section-preview',
  editButton: 'button[aria-label^="Edit"]',

  // Easy Apply button on job page (multiple selectors for compatibility)
  // New LinkedIn UI uses <a> tags with aria-label
  easyApplyAnchor: 'a[aria-label="Easy Apply to this job"]',
  easyApplyAnchorAlt: 'a[data-view-name="job-apply-button"]',
  easyApplyAnchorHref: 'a[href*="/apply/?openSDUIApplyFlow"]',
  // Old LinkedIn UI uses <button> tags
  easyApplyButton: '.jobs-apply-button--top-card button',
  easyApplyButtonAlt: 'button.jobs-apply-button',
  easyApplyButtonText: 'button.jobs-apply-button span.artdeco-button__text',
  // Job detail panel button
  jobDetailApplyButton: '.job-details-jobs-unified-top-card__primary-description-container button.jobs-apply-button',
  // Generic fallback - any clickable with Easy Apply
  easyApplyGeneric: '[aria-label*="Easy Apply"], button:has(span:contains("Easy Apply"))',

  // Error messages
  errorMessage: '.artdeco-inline-feedback--error',
  formError: '[id$="-error"]',

  // Footer
  footer: 'footer[role="presentation"]',
  footerInfo: '.jobs-easy-apply-footer__info',
};

/**
 * Section types based on title text
 */
export const SECTION_TYPES = {
  contactInfo: 'Contact info',
  resume: 'Resume',
  additionalQuestions: 'Additional Questions',
  workExperience: 'Work experience',
  education: 'Education',
  review: 'Review your application',
};

/**
 * Button text patterns
 */
export const BUTTON_TEXT = {
  next: 'Next',
  back: 'Back',
  submit: 'Submit application',
  review: 'Review',
};

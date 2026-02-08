/**
 * Normalize question text for deduplication
 */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove trailing punctuation
    .replace(/[?!.:]+$/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Common variations
    .replace(/years? of experience/gi, 'years experience')
    .replace(/do you have/gi, 'have')
    .replace(/are you (willing|able) to/gi, 'willing to')
    .replace(/will you be/gi, 'willing to')
    .replace(/how many/gi, '')
    .replace(/please (provide|enter|specify)/gi, '')
    .replace(/what is your/gi, 'your')
    // Remove company-specific text in brackets/parens
    .replace(/\([^)]*company[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();
}

/**
 * Generate hash for question lookup
 */
export function hashQuestion(text: string): string {
  const normalized = normalizeQuestion(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Common question patterns for categorization
 */
export const QUESTION_PATTERNS = {
  yearsExperience: /(?:years?|yrs?).*experience|experience.*(?:years?|yrs?)/i,
  workAuthorization: /(?:authorized|legally? allowed|eligible).*work/i,
  sponsorship: /(?:require|need).*sponsorship|visa.*(?:require|need)/i,
  relocate: /(?:willing|open|able).*relocate/i,
  salaryExpectation: /(?:salary|compensation|pay).*(?:expectation|requirement|range)/i,
  startDate: /(?:when|earliest).*(?:start|join|begin)/i,
  remoteWork: /(?:willing|able|open).*(?:remote|work from home|wfh)/i,
  linkedin: /linkedin.*(?:profile|url)/i,
  github: /github.*(?:profile|url)/i,
  website: /(?:personal|portfolio).*(?:website|url)/i,
  education: /(?:highest|education|degree|bachelor|master|phd)/i,
  currentlyEmployed: /(?:currently|presently).*(?:employed|working)/i,
};

/**
 * Detect question category
 */
export function categorizeQuestion(text: string): string {
  const normalized = text.toLowerCase();

  for (const [category, pattern] of Object.entries(QUESTION_PATTERNS)) {
    if (pattern.test(normalized)) {
      return category;
    }
  }

  return 'other';
}

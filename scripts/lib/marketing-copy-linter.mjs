/**
 * Marketing Copy Anti-Buzzword & Organic Data Static Linter
 * Grounded in elayadesign landing page guidelines:
 * - Banned AI marketing clichés: elevate, seamless, unleash, game-changer, delve, tapestry
 * - Banned generic placeholder names: Acme Corp, John Doe, SmartFlow, Nexus
 * - Organic numbers invariant: reject round fake statistics (99.99%, 50%, $100.00)
 */

export const BANNED_AI_BUZZWORDS = Object.freeze([
  'elevate',
  'seamless',
  'unleash',
  'next gen',
  'next-gen',
  'game changer',
  'game-changer',
  'delve',
  'tapestry',
  'in the world of',
  'in today\'s fast-paced world'
]);

export const BANNED_PLACEHOLDER_NAMES = Object.freeze([
  'acme corp',
  'acme',
  'john doe',
  'jane doe',
  'smartflow',
  'nexus'
]);

const NON_ORGANIC_PATTERNS = [
  { regex: /\b99\.99%\b/g, label: '99.99%' },
  { regex: /\b50%\b/g, label: '50%' },
  { regex: /\$100\.00\b/g, label: '$100.00' }
];

/**
 * Lints marketing copy string for buzzword, placeholder, and non-organic metrics.
 * @param {string} text 
 * @returns {{ valid: boolean, violations: Array<{ type: string, message: string }> }}
 */
export function lintMarketingCopyStrings(text) {
  const violations = [];
  const lower = text.toLowerCase();

  // Check 1: AI buzzwords
  for (const buzzword of BANNED_AI_BUZZWORDS) {
    const regex = new RegExp(`\\b${buzzword}\\b`, 'i');
    if (regex.test(lower)) {
      violations.push({
        type: 'BANNED_AI_BUZZWORD',
        message: `Marketing copy contains banned AI buzzword: "${buzzword}". Use concrete, grounded action verbs.`
      });
    }
  }

  // Check 2: Generic placeholder brands
  for (const brand of BANNED_PLACEHOLDER_NAMES) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(lower)) {
      violations.push({
        type: 'GENERIC_PLACEHOLDER_BRAND',
        message: `Marketing copy contains placeholder brand/name: "${brand}". Use realistic, contextual customer references.`
      });
    }
  }

  // Check 3: Non-organic fake numbers
  for (const pattern of NON_ORGANIC_PATTERNS) {
    if (pattern.regex.test(text)) {
      violations.push({
        type: 'NON_ORGANIC_METRIC',
        message: `Marketing copy contains round fake metric (${pattern.label}). Use organic, credible data.`
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

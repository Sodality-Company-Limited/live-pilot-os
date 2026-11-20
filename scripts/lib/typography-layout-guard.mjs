/**
 * Typography Layout & Anti-Orphan Guard
 * Grounded in elayadesign landing-page-design standards:
 * - Anti-orphan: text-wrap: balance on headings, text-wrap: pretty on body text
 * - Hero width constraint: max 680px for hero headline / subhead
 * - Anti-hyphenation: zero hyphens in marketing display copy
 */

export const MAX_HERO_WIDTH_PX = 680;

/**
 * Validates JSX/HTML layout strings for typography invariants.
 * @param {string} source 
 * @returns {{ valid: boolean, violations: Array<{ type: string, message: string }> }}
 */
export function validateTypographyLayoutRules(source) {
  const violations = [];

  // Check 1: Heading elements missing text-wrap: balance / text-balance
  const headingRegex = /<h[1-3][^>]*className=["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = headingRegex.exec(source)) !== null) {
    const classList = match[1];
    if (!/text-balance|text-wrap:\s*balance/.test(classList)) {
      violations.push({
        type: 'MISSING_TEXT_WRAP_BALANCE',
        message: 'Heading element is missing "text-balance" or "text-wrap: balance" anti-orphan rule.'
      });
    }
  }

  // Check 2: Paragraph elements missing text-wrap: pretty / text-pretty
  const paragraphRegex = /<p[^>]*className=["']([^"']*)["'][^>]*>/gi;
  while ((match = paragraphRegex.exec(source)) !== null) {
    const classList = match[1];
    if (!/text-pretty|text-wrap:\s*pretty/.test(classList)) {
      violations.push({
        type: 'MISSING_TEXT_WRAP_PRETTY',
        message: 'Paragraph body is missing "text-pretty" or "text-wrap: pretty" anti-orphan rule.'
      });
    }
  }

  // Check 3: Hero container width constraint
  const heroWidthMatch = source.match(/hero-container[^>]*max-w-\[(\d+)px\]/i);
  if (heroWidthMatch) {
    const widthPx = parseInt(heroWidthMatch[1], 10);
    if (widthPx > MAX_HERO_WIDTH_PX) {
      violations.push({
        type: 'HERO_WIDTH_EXCEEDED',
        message: `Hero container width ${widthPx}px exceeds maximum allowed ${MAX_HERO_WIDTH_PX}px.`
      });
    }
  }

  // Check 4: Hyphenated words in marketing copy text
  // Matches words with hyphens (e.g. AI-driven, High-impact) inside heading tags
  const headingTextRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  while ((match = headingTextRegex.exec(source)) !== null) {
    const innerText = match[1].trim();
    if (/\b\w+-\w+\b/.test(innerText)) {
      violations.push({
        type: 'FORBIDDEN_COPY_HYPHEN',
        message: `Marketing heading contains hyphenated phrase: "${innerText}". Rephrase to avoid awkward hyphen breaks.`
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

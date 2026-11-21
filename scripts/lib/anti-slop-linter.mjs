/**
 * @file anti-slop-linter.mjs
 * @description Zero-Slop AST & Text Linter enforcing concise, maintainer-focused communication,
 * stripping conversational filler, defensive apologies, and redundant inline comments.
 * Adheres to Article I (Zero Mocks), Article VI (Zero-Float integer math), and Article III structured reporting.
 */

export const SLOP_PATTERNS = [
  {
    category: 'conversational_preamble',
    severity: 'error',
    weight: 10n,
    regex: /^(certainly|sure thing|absolutely|gladly|of course|as requested|great question|i'd be happy to|here is|here's the code|allow me to)\b/i,
    hint: 'Remove conversational preamble. Start directly with the technical answer or structured report.'
  },
  {
    category: 'defensive_apology',
    severity: 'error',
    weight: 15n,
    regex: /\b(i apologize|my apologies|sorry about that|sorry for the confusion|pardon the oversight|my mistake)\b/i,
    hint: 'Eliminate apologetic filler. State the defect, root cause, and remediation factually.'
  },
  {
    category: 'ai_signoff',
    severity: 'warning',
    weight: 5n,
    regex: /\b(let me know if you (need|have|want)|hope this helps|feel free to ask|don't hesitate to reach out)\b/i,
    hint: 'Remove closing conversational sign-offs. Conclude with verification commands or next actions.'
  },
  {
    category: 'redundant_comment',
    severity: 'error',
    weight: 8n,
    regex: /\/\/\s*(here we (import|define|declare|initialize)|this function will|return the result of|added by ai|modified by assistant)\b/i,
    hint: 'Remove self-narrating or obvious code comments. Document why, not what.'
  },
  {
    category: 'hedge_filler',
    severity: 'warning',
    weight: 5n,
    regex: /\b(in order to|as you may know|it should be noted that|please note that|needless to say)\b/i,
    hint: 'Trim wordy filler phrases for direct technical communication.'
  }
];

/**
 * Lints markdown text or code strings for AI conversational filler and redundant slop.
 *
 * @param {string|null|undefined} content - Content to analyze.
 * @param {object} [options] - Options configuring parser behavior.
 * @param {'markdown'|'code'|'auto'} [options.type='auto'] - Content type.
 * @returns {{ clean: boolean, violations: Array<object>, slopScore: bigint, totalChars: bigint, violationCount: bigint }}
 */
export function lintAntiSlop(content, options = {}) {
  if (content === null || content === undefined || typeof content !== 'string' || content.trim().length === 0) {
    return {
      clean: true,
      violations: [],
      slopScore: 0n,
      totalChars: 0n,
      violationCount: 0n
    };
  }

  const lines = content.split('\n');
  const violations = [];
  let slopScore = 0n;
  const totalChars = BigInt(content.length);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const trimmedLine = rawLine.trim();

    if (trimmedLine.length === 0) continue;

    for (const pattern of SLOP_PATTERNS) {
      if (pattern.regex.test(trimmedLine)) {
        violations.push({
          line: lineIndex + 1,
          category: pattern.category,
          severity: pattern.severity,
          matchedText: trimmedLine.slice(0, 80),
          hint: pattern.hint
        });
        slopScore += pattern.weight;
      }
    }
  }

  return {
    clean: violations.length === 0,
    violations,
    slopScore,
    totalChars,
    violationCount: BigInt(violations.length)
  };
}

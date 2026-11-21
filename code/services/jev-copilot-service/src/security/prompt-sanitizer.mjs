// Prompt Sanitizer & Injection Defense for jev-copilot-service
// Detects and neutralizes prompt injections, jailbreak patterns, system instruction overrides,
// markdown executable exploits, and format string delimiters.

export class PromptSecurityError extends Error {
  /**
   * @param {string} message
   * @param {string} [pattern]
   */
  constructor(message, pattern = 'INJECTION_DETECTED') {
    super(`PromptSecurityError [LP05001]: ${message}`);
    this.name = 'PromptSecurityError';
    this.code = 'LP05001';
    this.pattern = pattern;
  }
}

// Known adversarial prompt injection / jailbreak markers
const ADVERSARIAL_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+(?:instructions|prompts|directives)/i,
  /disregard\s+(?:all\s+)?(?:prior|previous)\s+rules/i,
  /you\s+are\s+now\s+(?:in\s+)?(?:dan|developer|jailbreak|god)\s+mode/i,
  /act\s+as\s+(?:an?\s+)?unfiltered|unrestricted|jailbroken/i,
  /bypass\s+(?:all\s+)?(?:safety|content|policy)\s+filters?/i,
  /reveal\s+(?:your\s+)?(?:system\s+prompt|instructions|initial\s+prompt)/i,
  /print\s+(?:the\s+)?(?:system\s+prompt|initial\s+directives)/i,
  /<\|(?:im_start|im_end|endoftext)\|>/i,
  /\[SYSTEM_PROMPT\]/i,
  /\[INST\]/i,
  /\{\{\s*system\s*\}\}/i
];

// Dangerous system delimiter injection tags
const DELIMITER_TAGS = [
  /<\/?system_policy>/gi,
  /<\/?catalog_facts>/gi,
  /<\/?untrusted_stream_signals>/gi,
  /<\/?grounding_context>/gi
];

/**
 * Validates prompt against adversarial prompt injections.
 * Fails closed by throwing PromptSecurityError (LP05001) if injection pattern is detected.
 *
 * @param {string} promptText
 * @throws {PromptSecurityError}
 */
export function validatePromptSafety(promptText) {
  if (typeof promptText !== 'string') {
    return;
  }

  for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
    if (pattern.test(promptText)) {
      throw new PromptSecurityError(
        `Prompt contains forbidden adversarial injection pattern: ${pattern.toString()}`,
        pattern.toString()
      );
    }
  }
}

/**
 * Sanitizes user input or untrusted stream signals before embedding into prompt templates.
 * Escapes angle brackets and XML boundary delimiters, removes null bytes, and trims abnormal whitespace.
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitizePromptInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // 1. Remove null bytes and control characters (except newline, tab, carriage return)
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Neutralize XML boundary delimiter tags
  for (const tag of DELIMITER_TAGS) {
    cleaned = cleaned.replace(tag, '[TAG_STRIPPED]');
  }

  // 3. Escape XML/HTML special characters to prevent breakout
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return cleaned.trim();
}

/**
 * Structured sandbox builder: Wraps prompts in isolated, non-executable delimiter blocks.
 *
 * @param {object} params
 * @param {string} params.systemPolicy
 * @param {string} [params.catalogFacts]
 * @param {string} params.untrustedSignals
 * @returns {string}
 */
export function buildSandboxedPrompt({ systemPolicy, catalogFacts = '', untrustedSignals }) {
  // Validate safety first
  validatePromptSafety(untrustedSignals);

  const cleanSignals = sanitizePromptInput(untrustedSignals);
  const cleanFacts = catalogFacts ? catalogFacts.trim() : 'NONE';

  return [
    '<system_policy>',
    systemPolicy.trim(),
    '</system_policy>',
    '<catalog_facts>',
    cleanFacts,
    '</catalog_facts>',
    '<untrusted_stream_signals>',
    cleanSignals,
    '</untrusted_stream_signals>'
  ].join('\n');
}

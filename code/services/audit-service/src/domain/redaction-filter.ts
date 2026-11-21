/**
 * Audit Redaction Filter (G-AUDI-004)
 *
 * Pure, zero-dependency redaction engine that recursively scrubs sensitive credentials,
 * tokens, API keys, secrets, COGS/costs, and credit card numbers from evidence and audit
 * payloads prior to cryptographic hashing and ledger commit.
 */

export const REDACTED_PLACEHOLDER = '[REDACTED]' as const;

/**
 * Key name patterns that must be unconditionally redacted.
 */
const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = Object.freeze([
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /api[_-]?key/i,
  /cogs/i,
  /cost/i,
  /margin/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /cvc/i,
  /private[_-]?key/i,
]);

/**
 * String value patterns that indicate Bearer tokens or credit card PANs.
 */
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/-]+=*/i;
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/;

/**
 * Determines whether a given property/field key name is sensitive.
 */
export function isSensitiveKey(key: string): boolean {
  if (typeof key !== 'string') {
    return false;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Checks whether an arbitrary string contains known sensitive token or card patterns.
 */
export function containsSensitivePattern(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return BEARER_TOKEN_PATTERN.test(value) || CREDIT_CARD_PATTERN.test(value);
}

/**
 * Sanitizes an arbitrary string value by replacing Bearer tokens and credit cards with `[REDACTED]`.
 */
function sanitizeStringValue(value: string): string {
  let sanitized = value;
  // Replace Bearer token with [REDACTED]
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._~+/-]+={0,2}/gi, REDACTED_PLACEHOLDER);
  // Credit card matching: matches 13 to 19 digits separated by single space or hyphen
  sanitized = sanitized.replace(/\b(?:\d[ -]?){12,18}\d\b/g, REDACTED_PLACEHOLDER);
  return sanitized;
}

/**
 * Recursively deep-redacts sensitive fields in an arbitrary data structure.
 * Pure function: never mutates the input argument.
 */
export function redactSensitiveData<T>(input: T, seen = new WeakSet<object>()): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeStringValue(input) as unknown as T;
  }

  if (typeof input !== 'object') {
    return input;
  }

  if (input instanceof Date) {
    return input.toISOString() as unknown as T;
  }

  if (seen.has(input)) {
    return '[CIRCULAR]' as unknown as T;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    const redactedArray = input.map((item) => redactSensitiveData(item, seen));
    return redactedArray as unknown as T;
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>);

  for (const [key, value] of entries) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED_PLACEHOLDER;
    } else {
      result[key] = redactSensitiveData(value, seen);
    }
  }

  return result as unknown as T;
}

export const AuditRedactionFilter = Object.freeze({
  redact: redactSensitiveData,
  isSensitiveKey,
  containsSensitivePattern,
  REDACTED_PLACEHOLDER,
});

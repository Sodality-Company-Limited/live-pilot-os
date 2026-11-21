// PII & Secret Redactor for jev-copilot-service
// Scrubs emails, phone numbers, national IDs, Bearer tokens, API keys,
// credit card numbers, and confidential margin/COGS data from prompts, payloads, and logs.

import { createHash } from 'node:crypto';

export const REDACTED_MARKER = Object.freeze({
  EMAIL: '[REDACTED_EMAIL]',
  PHONE: '[REDACTED_PHONE]',
  NATIONAL_ID: '[REDACTED_NATIONAL_ID]',
  CREDENTIAL: '[REDACTED_CREDENTIAL]',
  CREDIT_CARD: '[REDACTED_CREDIT_CARD]',
  COGS: '[REDACTED_COGS]'
});

// Regex Patterns for Scrubbing
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
// International & Thai phone patterns (e.g. +66 81 234 5678, 081-234-5678, 0812345678, +1-555-123-4567)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
// National IDs (Thai 13-digit ID: x-xxxx-xxxxx-xx-x or 13 digits continuous, US SSN: xxx-xx-xxxx)
const THAI_NATIONAL_ID_REGEX = /\b\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1}\b/g;
const US_SSN_REGEX = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;
// Credentials (Bearer tokens, API keys, JWTs, password assignments)
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi;
const API_KEY_REGEX = /(?:api[_-]?key|secret|token|password|auth(?:entication)?)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{8,})["']?/gi;
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g;
// Credit Card (Visa, MasterCard, Amex, Discover, 13-19 digits with spaces/dashes)
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g;
// Business Confidential COGS / Margins / Internal Cost Pricing
const COGS_REGEX = /(?:cogs|cost[_\s-]?price|internal[_\s-]?cost|margin[_\s-]?pct|supplier[_\s-]?cost|procurement[_\s-]?price)\s*[:=]\s*["']?(\d+(?:\.\d+)?%?|THB\s*\d+|USD\s*\d+)["']?/gi;

/**
 * Redact sensitive PII and confidential patterns from a raw text string.
 * @param {string} text
 * @returns {string}
 */
export function redactSensitiveText(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // 1. Scrub credentials & JWTs first
  sanitized = sanitized.replace(BEARER_REGEX, `Bearer ${REDACTED_MARKER.CREDENTIAL}`);
  sanitized = sanitized.replace(JWT_REGEX, REDACTED_MARKER.CREDENTIAL);
  sanitized = sanitized.replace(API_KEY_REGEX, (match, p1) => {
    return match.replace(p1, REDACTED_MARKER.CREDENTIAL);
  });

  // 2. Scrub financial cards
  sanitized = sanitized.replace(CREDIT_CARD_REGEX, REDACTED_MARKER.CREDIT_CARD);

  // 3. Scrub internal COGS / supplier cost
  sanitized = sanitized.replace(COGS_REGEX, (match, p1) => {
    return match.replace(p1, REDACTED_MARKER.COGS);
  });

  // 4. Scrub national IDs
  sanitized = sanitized.replace(THAI_NATIONAL_ID_REGEX, REDACTED_MARKER.NATIONAL_ID);
  sanitized = sanitized.replace(US_SSN_REGEX, REDACTED_MARKER.NATIONAL_ID);

  // 5. Scrub emails
  sanitized = sanitized.replace(EMAIL_REGEX, REDACTED_MARKER.EMAIL);

  // 6. Scrub phone numbers (avoid matching standalone short numbers or dates)
  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    // Only redact if string contains >= 8 digits
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return REDACTED_MARKER.PHONE;
    }
    return match;
  });

  return sanitized;
}

/**
 * Deep recursive redaction of arbitrary JSON data structures (objects, arrays, primitives).
 * @param {any} data
 * @returns {any}
 */
export function redactSensitiveData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return redactSensitiveText(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'bigint') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const sensitiveFieldNames = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'cogs',
      'cost_price',
      'internal_cost',
      'ssn',
      'national_id',
      'credit_card',
      'card_number'
    ];

    const result = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isDirectSecretKey = sensitiveFieldNames.some((field) => lowerKey === field || lowerKey.includes(field));

      if (isDirectSecretKey && typeof value === 'string') {
        result[key] = REDACTED_MARKER.CREDENTIAL;
      } else if (isDirectSecretKey && typeof value === 'number') {
        result[key] = 0; // zero out numeric secret / cost
      } else {
        result[key] = redactSensitiveData(value);
      }
    }
    return result;
  }

  return data;
}

/**
 * Computes deterministic physical SHA-256 digest of clean data.
 * @param {any} data
 * @returns {string}
 */
export function computeSha256Digest(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data) || '';
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Trajectory PII & Secret Redaction Sanitizer.
 * Scrubs API keys, bearer tokens, private keys, and authorization secrets
 * from CLI agent prompt and response streams before persistence.
 */

const REDACTION_PATTERNS = [
  // OpenAI Project / Service API Keys
  { pattern: /sk-proj-[a-zA-Z0-9_\-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, replacement: '[REDACTED_API_KEY]' },
  // Anthropic API Keys
  { pattern: /sk-ant-api\d{2}-[a-zA-Z0-9_\-]{30,}/g, replacement: '[REDACTED_API_KEY]' },
  // GitHub Personal Access Tokens
  { pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/g, replacement: '[REDACTED_TOKEN]' },
  // Generic Bearer / JWT Tokens
  { pattern: /Bearer\s+eyJ[a-zA-Z0-9_\-\.]+/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  { pattern: /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/g, replacement: '[REDACTED_TOKEN]' },
  // AWS / Cloud Access Keys
  { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, replacement: '[REDACTED_CLOUD_KEY]' },
  // RSA / PEM Private Keys
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
  // Generic API / Secret Key assignments
  { pattern: /(?:api_key|apiKey|secret_key|private_key|auth_token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{16,})["']?/gi, replacement: '$1: [REDACTED_SECRET]' },
];

/**
 * Sanitizes a string by replacing all sensitive patterns with redaction placeholders.
 * @param {string} text 
 * @returns {string} Sanitized string
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  let result = text;
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Recursively traverses and sanitizes object/array properties in a trajectory payload.
 * @param {*} data 
 * @returns {*} Sanitized copy of data
 */
export function sanitizeTrajectory(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeText(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeTrajectory(item));
  }

  if (typeof data === 'object') {
    const copy = {};
    for (const [key, value] of Object.entries(data)) {
      copy[key] = sanitizeTrajectory(value);
    }
    return copy;
  }

  return data;
}

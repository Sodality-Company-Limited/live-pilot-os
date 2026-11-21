/**
 * Copilot Service - F02 Guidance Freshness, Redaction, and Withdrawal
 * Enforces safety boundaries, PII redaction, freshness TTL, and pause fail-closed.
 */

export enum GuidanceSafetyStatus {
  VALID = 'VALID',
  WITHDRAWN_STALE = 'WITHDRAWN_STALE',
  WITHDRAWN_OUT_OF_STOCK = 'WITHDRAWN_OUT_OF_STOCK',
  WITHDRAWN_PAUSED = 'WITHDRAWN_PAUSED',
}

export interface GuidanceEvaluationRequest {
  readonly suggestionId: string;
  readonly generatedAt: Date;
  readonly currentStock: number;
  readonly emergencyPaused: boolean;
  readonly text: string;
}

export interface GuidanceEvaluationResult {
  readonly status: GuidanceSafetyStatus;
  readonly redactedText: string;
  readonly reason?: string;
}

const FRESHNESS_TTL_MS = 30 * 1000; // 30 seconds max lifetime for live suggestions

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;

/**
 * Strips PII (email, phone) using standard redaction markers.
 */
export function redactGuidanceText(text: string): string {
  if (!text) return '';
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]');
}

/**
 * Evaluates guidance safety against freshness, stock, pause states, and redacts PII.
 * Fail-closed by design.
 */
export function evaluateGuidanceSafety(request: GuidanceEvaluationRequest): GuidanceEvaluationResult {
  const { generatedAt, currentStock, emergencyPaused, text } = request;

  // 1. Emergency Pause check
  if (emergencyPaused) {
    return {
      status: GuidanceSafetyStatus.WITHDRAWN_PAUSED,
      redactedText: '',
      reason: 'Emergency pause is currently active',
    };
  }

  // 2. Freshness TTL check
  const now = Date.now();
  if (now - generatedAt.getTime() > FRESHNESS_TTL_MS) {
    return {
      status: GuidanceSafetyStatus.WITHDRAWN_STALE,
      redactedText: '',
      reason: 'Guidance freshness TTL exceeded (stale suggestion)',
    };
  }

  // 3. Stock availability check
  if (currentStock <= 0) {
    return {
      status: GuidanceSafetyStatus.WITHDRAWN_OUT_OF_STOCK,
      redactedText: '',
      reason: 'Target product is out of stock',
    };
  }

  // 4. Redaction pass
  const cleanText = redactGuidanceText(text);

  return {
    status: GuidanceSafetyStatus.VALID,
    redactedText: cleanText,
  };
}

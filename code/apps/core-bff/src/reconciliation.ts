/**
 * Core BFF Timeout and Reconciliation Policy
 * Classifies transient, permanent, pending, unknown, and reconciliation-required outcomes
 * without blind retries, ensuring idempotency and fail-closed safety.
 */

export type OutcomeClassification =
  | 'SUCCESS'
  | 'TRANSIENT_RETRYABLE'
  | 'PERMANENT_REJECTED'
  | 'PENDING'
  | 'UNKNOWN_RECONCILIATION_REQUIRED';

export interface OperationErrorInput {
  code?: string;
  statusCode?: number;
  message?: string;
  isTimeout?: boolean;
  isNetworkDisconnect?: boolean;
}

export interface ClassificationResult {
  classification: OutcomeClassification;
  canRetryImmediately: boolean;
  requiresReconciliation: boolean;
  problemCode: string;
  userFacingMessage: string;
  recommendedBackoffMs?: number;
}

export class CoreBffReconciliationPolicy {
  public static classify(error: OperationErrorInput, attemptCount = 1): ClassificationResult {
    // 1. Timeout or Network Disconnect during Mutation -> UNKNOWN_RECONCILIATION_REQUIRED
    if (error.isTimeout || error.code === 'LP03007' || error.statusCode === 504) {
      return {
        classification: 'UNKNOWN_RECONCILIATION_REQUIRED',
        canRetryImmediately: false,
        requiresReconciliation: true,
        problemCode: 'LP03007',
        userFacingMessage: 'Upstream service timed out. Outcome is unknown; must reconcile before retrying mutation.',
      };
    }

    if (error.isNetworkDisconnect || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      if (attemptCount < 3) {
        return {
          classification: 'TRANSIENT_RETRYABLE',
          canRetryImmediately: true,
          requiresReconciliation: false,
          problemCode: 'LP03008',
          userFacingMessage: 'Transient connection glitch. Safe to retry with exponential backoff.',
          recommendedBackoffMs: Math.min(100 * Math.pow(2, attemptCount), 2000),
        };
      }
      return {
        classification: 'UNKNOWN_RECONCILIATION_REQUIRED',
        canRetryImmediately: false,
        requiresReconciliation: true,
        problemCode: 'LP03008',
        userFacingMessage: 'Exceeded retry budget on connection failure. Manual or saga reconciliation required.',
      };
    }

    // 2. HTTP 429 Too Many Requests -> TRANSIENT_RETRYABLE
    if (error.statusCode === 429 || error.code === 'LP03009') {
      return {
        classification: 'TRANSIENT_RETRYABLE',
        canRetryImmediately: false,
        requiresReconciliation: false,
        problemCode: 'LP03009',
        userFacingMessage: 'Rate limited by upstream gateway. Slow down request frequency.',
        recommendedBackoffMs: 1000,
      };
    }

    // 3. Client errors 4xx (except 408/429) -> PERMANENT_REJECTED
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return {
        classification: 'PERMANENT_REJECTED',
        canRetryImmediately: false,
        requiresReconciliation: false,
        problemCode: error.code || 'LP03002',
        userFacingMessage: error.message || 'Client validation error. Retrying without modification will fail.',
      };
    }

    // 4. Pending state (202 Accepted or explicit pending)
    if (error.statusCode === 202 || error.code === 'PENDING') {
      return {
        classification: 'PENDING',
        canRetryImmediately: false,
        requiresReconciliation: false,
        problemCode: 'LP03010',
        userFacingMessage: 'Operation is actively processing asynchronously.',
      };
    }

    // 5. Default 5xx -> PERMANENT_REJECTED unless explicitly transient
    return {
      classification: 'PERMANENT_REJECTED',
      canRetryImmediately: false,
      requiresReconciliation: true,
      problemCode: error.code || 'LP03000',
      userFacingMessage: error.message || 'Upstream service failure. Fail closed.',
    };
  }
}

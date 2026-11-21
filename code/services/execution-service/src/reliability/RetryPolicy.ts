export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class RetryPolicy {
  private readonly config: RetryConfig;

  constructor(config: RetryConfig = { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 2000 }) {
    this.config = config;
  }

  isRetryable(errorCode?: string | null): boolean {
    if (!errorCode) return false;
    // Transient network, rate limits, timeouts, and dependency unavailability are retryable
    const retryableCodes = ['LP06001', 'LP07001', 'LP07002', 'LP07003', 'LP09001'];
    return retryableCodes.includes(errorCode);
  }

  calculateBackoffMs(attempt: number): number {
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt);
    const bounded = Math.min(exponential, this.config.maxDelayMs);
    // Full jitter
    return Math.floor(Math.random() * bounded);
  }
}

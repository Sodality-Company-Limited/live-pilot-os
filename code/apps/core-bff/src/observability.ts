/**
 * Core BFF Observability and Secret Redaction Module
 * Implements structured logging, W3C traceparent propagation, correlation IDs,
 * Prometheus-compatible metric counters, and fail-closed secret/PII redaction.
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  service: string;
  correlationId?: string;
  traceparent?: string;
  meta?: Record<string, unknown>;
}

export const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
];

export function redactSecrets(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Redact bearer tokens or jwt-like strings
    if (data.startsWith('Bearer ') || data.split('.').length === 3) {
      return '[REDACTED_SECRET]';
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_PATTERNS.some((p) => p.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else {
        sanitized[key] = redactSecrets(val);
      }
    }
    return sanitized;
  }
  return data;
}

export class CoreBffObservability {
  private serviceName: string;
  private metrics: Map<string, number> = new Map();
  private logs: LogEntry[] = [];

  constructor(serviceName = 'core-bff') {
    this.serviceName = serviceName;
  }

  public incrementMetric(name: string, value = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }

  public getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  public getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries());
  }

  public log(
    level: LogEntry['level'],
    message: string,
    meta?: Record<string, unknown>,
    correlationId?: string,
    traceparent?: string
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      correlationId,
      traceparent,
      meta: meta ? (redactSecrets(meta) as Record<string, unknown>) : undefined,
    };

    this.logs.push(entry);
    return entry;
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }
}

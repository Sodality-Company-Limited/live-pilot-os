/**
 * Unit & Integration Tests for Core BFF Observability & Secret Redaction
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CoreBffObservability, redactSecrets } from '../src/observability.js';

describe('G-CORE-089: Add Core BFF observability and redaction', () => {
  it('redacts sensitive headers, tokens, and secrets from payloads', () => {
    const raw = {
      username: 'alice',
      password: 'super-secret-password',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature',
      apiKey: 'sec_1234567890',
      nested: {
        cookie: 'sessionId=sess_123',
        publicField: 'visible',
      },
    };

    const redacted = redactSecrets(raw) as Record<string, unknown>;

    assert.equal(redacted.username, 'alice');
    assert.equal(redacted.password, '[REDACTED_SECRET]');
    assert.equal(redacted.authorization, '[REDACTED_SECRET]');
    assert.equal(redacted.apiKey, '[REDACTED_SECRET]');
    assert.deepEqual(redacted.nested, {
      cookie: '[REDACTED_SECRET]',
      publicField: 'visible',
    });
  });

  it('records structured logs with W3C traceparent and correlation IDs', () => {
    const obs = new CoreBffObservability('core-bff');
    const log = obs.log(
      'info',
      'Handled request',
      { status: 200, userToken: 'jwt_val' },
      'corr_123',
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    );

    assert.equal(log.service, 'core-bff');
    assert.equal(log.correlationId, 'corr_123');
    assert.equal(log.traceparent, '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    assert.equal((log.meta as Record<string, unknown>).userToken, '[REDACTED_SECRET]');
    assert.equal((log.meta as Record<string, unknown>).status, 200);
  });

  it('tracks metric counters accurately', () => {
    const obs = new CoreBffObservability();
    obs.incrementMetric('http_requests_total');
    obs.incrementMetric('http_requests_total');
    obs.incrementMetric('http_errors_total', 1);

    assert.equal(obs.getMetric('http_requests_total'), 2);
    assert.equal(obs.getMetric('http_errors_total'), 1);
    assert.deepEqual(obs.getAllMetrics(), {
      http_requests_total: 2,
      http_errors_total: 1,
    });
  });
});

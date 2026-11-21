/**
 * Contract Specification Tests for Core BFF
 * Verifies RFC 7807 problem details, CloudEvents payload schema envelopes, and HTTP/NATS contract boundaries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCoreBffServer } from '../../code/apps/core-bff/src/main.js';
import { NatsRequestReplyClient } from '../../code/apps/core-bff/src/nats.js';

describe('G-CORE-098: Core BFF Contract Verification Suite', () => {
  it('enforces RFC 7807 problem details contract on error states', async () => {
    const server = createCoreBffServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    // 404 test
    const res404 = await fetch(`http://localhost:${address.port}/api/v1/invalid-route`);
    assert.equal(res404.status, 404);
    assert.equal(res404.headers.get('content-type'), 'application/problem+json');
    const body404 = await res404.json();
    assert.equal(body404.code, 'LP03001');
    assert.ok(body404.type);
    assert.ok(body404.title);
    assert.ok(body404.detail);

    // 400 validation error test
    const res400 = await fetch(`http://localhost:${address.port}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res400.status, 400);
    assert.equal(res400.headers.get('content-type'), 'application/problem+json');
    const body400 = await res400.json();
    assert.equal(body400.code, 'LP03002');
    assert.ok(body400.errors);

    server.close();
  });

  it('validates NATS CloudEvents 1.0 envelope contract parity', () => {
    const client = new NatsRequestReplyClient({ serviceName: 'core-bff' });
    const envelope = client.createEnvelope('livepilot.test.event', { sample: 123 }, 'corr_contract');

    assert.equal(envelope.specversion, '1.0');
    assert.equal(envelope.datacontenttype, 'application/json');
    assert.equal(envelope.correlationId, 'corr_contract');
    assert.ok(envelope.id);
    assert.ok(envelope.time);
  });
});

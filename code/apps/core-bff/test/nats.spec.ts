/**
 * Unit & Integration Tests for Core BFF NATS Request-Reply Adapter
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NatsRequestReplyClient } from '../src/nats.js';

describe('G-CORE-084: Core BFF NATS Request-Reply Adapter', () => {
  it('creates valid CloudEvents-compliant envelope with correlationId', () => {
    const client = new NatsRequestReplyClient({ serviceName: 'core-bff' });
    const envelope = client.createEnvelope('live.session.create', { hostId: 'host_1' });

    assert.ok(envelope.id);
    assert.equal(envelope.source, 'urn:livepilot:service:core-bff');
    assert.equal(envelope.type, 'live.session.create');
    assert.ok(envelope.correlationId);
    assert.deepEqual(envelope.data, { hostId: 'host_1' });
  });

  it('successfully executes request-reply roundtrip', async () => {
    const client = new NatsRequestReplyClient();
    client.subscribe('session.v1.get', async (subject, payload) => {
      const parsed = JSON.parse(Buffer.from(payload).toString('utf-8'));
      assert.equal(parsed.data.sessionId, 'sess_123');
      return Buffer.from(JSON.stringify({ status: 'ACTIVE', hostId: 'host_42' }));
    });

    const response = await client.request<{ sessionId: string }, { status: string; hostId: string }>(
      'session.v1.get',
      'session.get.query',
      { sessionId: 'sess_123' }
    );

    assert.equal(response.ok, true);
    assert.ok(response.correlationId);
    assert.deepEqual(response.data, { status: 'ACTIVE', hostId: 'host_42' });
  });

  it('fails closed with LP03007 when request times out', async () => {
    const client = new NatsRequestReplyClient();
    // Simulate slow/hanging service
    client.subscribe('session.v1.slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return Buffer.from(JSON.stringify({ ok: true }));
    });

    const response = await client.request('session.v1.slow', 'session.slow.query', {}, 50);

    assert.equal(response.ok, false);
    assert.equal(response.code, 'LP03007');
    assert.ok(response.message?.includes('timed out'));
  });

  it('returns LP03005 when no handler or subject route exists', async () => {
    const client = new NatsRequestReplyClient();
    const response = await client.request('nonexistent.subject', 'test.type', {});

    assert.equal(response.ok, false);
    assert.equal(response.code, 'LP03005');
  });
});

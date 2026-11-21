/**
 * Unit & Integration Tests for Adapter Safety Service Runtime
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdapterSafetyRuntime } from '../src/main.js';

describe('G-CORE-094: Bootstrap adapter safety runtime', () => {
  it('exposes health probe', async () => {
    const runtime = new AdapterSafetyRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'adapter-safety-service');

    await runtime.stop();
  });

  it('safely handles simulated dispatch and guarantees idempotency', async () => {
    const runtime = new AdapterSafetyRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const payload = {
      commandId: 'cmd_123',
      platform: 'TIKTOK',
      action: 'PIN_PRODUCT',
      sessionId: 'sess_live_1',
      isSimulated: true,
      payload: { productId: 'prod_9' },
    };

    // First call
    const res1 = await fetch(`http://localhost:${address.port}/api/v1/adapter/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.status, 'SIMULATED');
    assert.equal(data1.commandId, 'cmd_123');

    // Duplicate call (idempotent)
    const res2 = await fetch(`http://localhost:${address.port}/api/v1/adapter/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.executedAt, data1.executedAt);

    await runtime.stop();
  });
});

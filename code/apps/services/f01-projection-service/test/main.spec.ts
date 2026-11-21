/**
 * Unit & Integration Tests for F01 Projection Service Runtime
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { F01ProjectionRuntime } from '../src/main.js';

describe('G-CORE-095: Bootstrap F01 projection runtime', () => {
  it('exposes health probe', async () => {
    const runtime = new F01ProjectionRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'f01-projection-service');

    await runtime.stop();
  });

  it('ingests events, checkpoints cursors, and updates projected view', async () => {
    const runtime = new F01ProjectionRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    // Ingest event 1
    const res1 = await fetch(`http://localhost:${address.port}/api/v1/projections/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        sequence: 1,
        sessionId: 'sess_live_10',
        eventType: 'VIEWER_JOIN',
        payload: {},
        timestamp: new Date().toISOString(),
      }),
    });
    assert.equal(res1.status, 200);

    // Ingest event 2
    const res2 = await fetch(`http://localhost:${address.port}/api/v1/projections/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_2',
        sequence: 2,
        sessionId: 'sess_live_10',
        eventType: 'SALE_COMPLETED',
        payload: { amount: 100 },
        timestamp: new Date().toISOString(),
      }),
    });
    assert.equal(res2.status, 200);

    // Query Projection
    const queryRes = await fetch(`http://localhost:${address.port}/api/v1/projections/session/sess_live_10`);
    assert.equal(queryRes.status, 200);
    const projection = await queryRes.json();
    assert.equal(projection.lastSequence, 2);
    assert.equal(projection.activeViewers, 1);
    assert.equal(projection.salesCount, 1);

    await runtime.stop();
  });
});

/**
 * Integration Tests for F04 Control & Audit Service Runtimes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EmergencyControlRuntime } from '../../code/apps/services/emergency-control-service/src/main.js';
import { AuditServiceRuntime } from '../../code/apps/services/audit-service/src/main.js';

describe('G-CORE-092: Bootstrap F04 control and audit runtimes', () => {
  it('triggers emergency pause and reflects in control status', async () => {
    const control = new EmergencyControlRuntime(0);
    const server = control.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const pauseRes = await fetch(`http://localhost:${address.port}/api/v1/control/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess_live_44',
        triggeredBy: 'operator_1',
        reason: 'Policy violation detected',
        timestamp: new Date().toISOString(),
      }),
    });

    assert.equal(pauseRes.status, 200);
    const pauseData = await pauseRes.json();
    assert.equal(pauseData.status, 'PAUSED');

    const statusRes = await fetch(`http://localhost:${address.port}/api/v1/control/status/sess_live_44`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.isPaused, true);

    await control.stop();
  });

  it('appends audit records with cryptographic SHA-256 hash chaining', async () => {
    const audit = new AuditServiceRuntime(0);
    const server = audit.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const entry1Res = await fetch(`http://localhost:${address.port}/api/v1/audit/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'SESSION_STARTED',
        actorId: 'host_9',
        payload: { channel: 'tiktok' },
      }),
    });
    assert.equal(entry1Res.status, 201);
    const entry1 = await entry1Res.json();

    const entry2Res = await fetch(`http://localhost:${address.port}/api/v1/audit/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'EMERGENCY_PAUSED',
        actorId: 'operator_1',
        payload: { reason: 'Violation' },
      }),
    });
    assert.equal(entry2Res.status, 201);
    const entry2 = await entry2Res.json();

    // Verify hash chain
    assert.equal(entry2.previousHash, entry1.hash);
    assert.notEqual(entry1.hash, entry2.hash);

    await audit.stop();
  });
});

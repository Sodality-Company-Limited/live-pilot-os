/**
 * Unit & Integration Tests for Core BFF Health & Graceful Shutdown
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CoreBffHealthManager } from '../src/health.js';

describe('G-CORE-088: Add Core BFF health and graceful shutdown', () => {
  it('reports healthy liveness and tracks uptime', () => {
    const manager = new CoreBffHealthManager();
    const liveness = manager.getLiveness();

    assert.equal(liveness.status, 'healthy');
    assert.equal(liveness.service, 'core-bff');
    assert.ok(liveness.timestamp);
    assert.ok(liveness.uptimeSeconds >= 0);
  });

  it('reports readiness based on dependency health checks', async () => {
    const healthyChecker = {
      checkNats: async () => true,
      checkRedis: async () => true,
    };
    const manager = new CoreBffHealthManager(healthyChecker);
    const readiness = await manager.getReadiness();

    assert.equal(readiness.ready, true);
    assert.equal(readiness.checks.nats, true);
    assert.equal(readiness.checks.redis, true);
  });

  it('fails readiness when a critical dependency check fails', async () => {
    const unhealthyChecker = {
      checkNats: async () => true,
      checkRedis: async () => false, // redis down
    };
    const manager = new CoreBffHealthManager(unhealthyChecker);
    const readiness = await manager.getReadiness();

    assert.equal(readiness.ready, false);
    assert.equal(readiness.checks.nats, true);
    assert.equal(readiness.checks.redis, false);
  });

  it('tracks in-flight requests and drains before graceful shutdown', async () => {
    const manager = new CoreBffHealthManager();
    manager.trackRequestStart();
    manager.trackRequestStart();
    assert.equal(manager.getInFlightCount(), 2);

    let shutdownCompleted = false;
    const shutdownPromise = manager.initiateGracefulShutdown(2000).then(() => {
      shutdownCompleted = true;
    });

    // New requests must be rejected immediately during shutdown
    assert.throws(() => manager.trackRequestStart(), /SERVER_SHUTTING_DOWN/);

    // Drain in-flight
    await new Promise((r) => setTimeout(r, 50));
    manager.trackRequestEnd();
    manager.trackRequestEnd();

    await shutdownPromise;
    assert.equal(shutdownCompleted, true);
    assert.equal(manager.getInFlightCount(), 0);
    assert.equal(manager.getLiveness().status, 'unhealthy');
  });
});

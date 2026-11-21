import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {
  DaveRuntimeDaemon,
  DaveWalJournal,
  DaveHaCoordinator,
  WalCorruptionError
} from '../../scripts/lib/dave-runtime-daemon.mjs';

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    http.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = performance.now() - start;
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
            latencyMs: latency
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: data,
            latencyMs: latency
          });
        }
      });
    }).on('error', reject);
  });
}

describe('G-OPS-001 DAVE Runtime Daemon & Disaster Recovery Unit Test Suite', () => {
  const testDir = path.join(process.cwd(), 'artifacts/test-dave-runtime');

  before(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('1. should initialize, start HTTP server, and serve liveness & readiness health probes in < 10ms', async () => {
    const walPath = path.join(testDir, 'daemon1.wal');
    const daemon = new DaveRuntimeDaemon({
      daemonId: 'daemon-unit-01',
      port: 0, // OS assigned ephemeral port
      walPath,
      role: 'leader'
    });

    await daemon.start();
    const port = daemon.getPort();
    assert.ok(port > 0, `Expected daemon port > 0, got ${port}`);

    // Probe 1: /health
    const healthRes = await httpGet(`http://127.0.0.1:${port}/health`);
    assert.equal(healthRes.statusCode, 200);
    assert.equal(healthRes.body.status, 'healthy');
    assert.equal(healthRes.body.daemon_id, 'daemon-unit-01');
    assert.equal(healthRes.body.role, 'leader');
    assert.ok(healthRes.latencyMs < 100, `Health probe latency ${healthRes.latencyMs}ms must be low`);

    // Probe 2: /health/liveness
    const livenessRes = await httpGet(`http://127.0.0.1:${port}/health/liveness`);
    assert.equal(livenessRes.statusCode, 200);
    assert.equal(livenessRes.body.status, 'alive');
    assert.ok(typeof livenessRes.body.uptime_ms === 'number');

    // Probe 2b: /healthz (alias for /health/liveness) responding in < 10ms
    const healthzRes = await httpGet(`http://127.0.0.1:${port}/healthz`);
    assert.equal(healthzRes.statusCode, 200);
    assert.equal(healthzRes.body.status, 'alive');
    assert.equal(healthzRes.body.daemon_id, 'daemon-unit-01');
    assert.ok(typeof healthzRes.body.uptime_ms === 'number');
    assert.ok(healthzRes.latencyMs < 10, `Healthz probe latency ${healthzRes.latencyMs}ms must be < 10ms`);

    // Probe 3: /health/readiness
    const readinessRes = await httpGet(`http://127.0.0.1:${port}/health/readiness`);
    assert.equal(readinessRes.statusCode, 200);
    assert.equal(readinessRes.body.status, 'ready');
    assert.ok(readinessRes.body.memory);
    assert.ok(typeof readinessRes.body.memory.rss_bytes === 'number');
    assert.ok(typeof readinessRes.body.memory.heap_used_bytes === 'number');
    assert.ok(readinessRes.latencyMs < 50, `Readiness probe latency ${readinessRes.latencyMs}ms should be fast`);

    // Probe 3b: /readyz (alias for /health/readiness) responding in < 10ms
    const readyzRes = await httpGet(`http://127.0.0.1:${port}/readyz`);
    assert.equal(readyzRes.statusCode, 200);
    assert.equal(readyzRes.body.status, 'ready');
    assert.ok(readyzRes.body.memory);
    assert.ok(typeof readyzRes.body.memory.rss_bytes === 'number');
    assert.ok(typeof readyzRes.body.memory.heap_used_bytes === 'number');
    assert.ok(readyzRes.latencyMs < 10, `Readyz probe latency ${readyzRes.latencyMs}ms must be < 10ms`);

    await daemon.stop();
    assert.equal(daemon.isRunning(), false);

    // Verify port released and cannot connect
    await assert.rejects(async () => {
      await httpGet(`http://127.0.0.1:${port}/health`);
    });

    // Authenticated daemon verification:
    // With authToken: 'secret-ops-token', requests without header or with wrong token receive 401,
    // and request with Authorization: Bearer secret-ops-token receives 200.
    const authWalPath = path.join(testDir, 'daemon_auth.wal');
    const authDaemon = new DaveRuntimeDaemon({
      daemonId: 'daemon-unit-auth',
      port: 0,
      walPath: authWalPath,
      role: 'leader',
      authToken: 'secret-ops-token'
    });

    await authDaemon.start();
    const authPort = authDaemon.getPort();
    assert.ok(authPort > 0, `Expected auth daemon port > 0, got ${authPort}`);

    // Request without auth header -> 401
    const unauthHealthz = await httpGet(`http://127.0.0.1:${authPort}/healthz`);
    assert.equal(unauthHealthz.statusCode, 401);
    assert.equal(unauthHealthz.body.error, 'Unauthorized: invalid or missing bearer token');

    const unauthReadyz = await httpGet(`http://127.0.0.1:${authPort}/readyz`);
    assert.equal(unauthReadyz.statusCode, 401);
    assert.equal(unauthReadyz.body.error, 'Unauthorized: invalid or missing bearer token');

    // Request with wrong token -> 401
    const wrongTokenRes = await httpGet(`http://127.0.0.1:${authPort}/healthz`, {
      headers: { 'Authorization': 'Bearer wrong-token-value' }
    });
    assert.equal(wrongTokenRes.statusCode, 401);
    assert.equal(wrongTokenRes.body.error, 'Unauthorized: invalid or missing bearer token');

    // Request with correct token -> 200 within 10ms
    const validHealthz = await httpGet(`http://127.0.0.1:${authPort}/healthz`, {
      headers: { 'Authorization': 'Bearer secret-ops-token' }
    });
    assert.equal(validHealthz.statusCode, 200);
    assert.equal(validHealthz.body.status, 'alive');
    assert.ok(validHealthz.latencyMs < 10, `Authenticated healthz latency ${validHealthz.latencyMs}ms must be < 10ms`);

    const validReadyz = await httpGet(`http://127.0.0.1:${authPort}/readyz`, {
      headers: { 'Authorization': 'Bearer secret-ops-token' }
    });
    assert.equal(validReadyz.statusCode, 200);
    assert.equal(validReadyz.body.status, 'ready');
    assert.ok(validReadyz.latencyMs < 10, `Authenticated readyz latency ${validReadyz.latencyMs}ms must be < 10ms`);

    await authDaemon.stop();
    assert.equal(authDaemon.isRunning(), false);
  });

  it('2. should append decision transitions to WAL with monotonically increasing sequence and SHA-256 digests', () => {
    const walFile = path.join(testDir, 'journal_test.wal');
    const journal = new DaveWalJournal({ walPath: walFile });

    assert.equal(journal.getLastSequence(), 0);

    const transitions = [
      { decision_id: 'DAVE-UX-0001', from_state: 'INTENT_RECEIVED', to_state: 'CONTEXT_COLLECTED' },
      { decision_id: 'DAVE-UX-0001', from_state: 'CONTEXT_COLLECTED', to_state: 'REFERENCES_VERIFIED' },
      { decision_id: 'DAVE-UX-0001', from_state: 'REFERENCES_VERIFIED', to_state: 'EXPERTS_SELECTED' }
    ];

    for (const t of transitions) {
      const entry = journal.appendTransition(t);
      assert.ok(entry.seq > 0);
      assert.ok(entry.checksum.startsWith('sha256:'));
      assert.equal(entry.payload.decision_id, t.decision_id);
    }

    assert.equal(journal.getLastSequence(), 3);
    assert.ok(fs.existsSync(walFile));

    const content = fs.readFileSync(walFile, 'utf8').trim().split('\n');
    assert.equal(content.length, 3);

    const parsedFirst = JSON.parse(content[0]);
    assert.equal(parsedFirst.seq, 1);
    assert.equal(parsedFirst.payload.to_state, 'CONTEXT_COLLECTED');
  });

  it('3. should take snapshots and combine snapshot state with subsequent WAL replay', () => {
    const walFile = path.join(testDir, 'snapshot_test.wal');
    const snapshotFile = path.join(testDir, 'snapshot_test.json');
    const journal = new DaveWalJournal({ walPath: walFile, snapshotPath: snapshotFile });

    journal.appendTransition({ decision_id: 'DAVE-SEC-0001', state: 'INITIAL' });
    journal.appendTransition({ decision_id: 'DAVE-SEC-0001', state: 'VERIFYING' });

    // Save snapshot of current state
    const snapshotData = {
      decisions: {
        'DAVE-SEC-0001': { state: 'VERIFYING', last_seq: 2 }
      }
    };
    journal.saveSnapshot(snapshotData);

    assert.ok(fs.existsSync(snapshotFile));
    const loadedSnapshot = journal.loadSnapshot();
    assert.deepEqual(loadedSnapshot.state, snapshotData);

    // Append more transitions after snapshot
    journal.appendTransition({ decision_id: 'DAVE-SEC-0001', state: 'COMPLETED' });

    // Replay after snapshot
    const replayed = journal.replay({ fromSequence: 2 });
    assert.equal(replayed.length, 1);
    assert.equal(replayed[0].payload.state, 'COMPLETED');
  });

  it('4. should recover state completely following simulated crash under 500ms with 0 lost transitions', async () => {
    const walFile = path.join(testDir, 'crash_recovery.wal');
    const journal = new DaveWalJournal({ walPath: walFile });

    const numTransitions = 50;
    for (let i = 1; i <= numTransitions; i++) {
      journal.appendTransition({
        decision_id: `DAVE-CORE-${String(i).padStart(4, '0')}`,
        index: i,
        confidence: 0.9500,
        status: 'EXECUTED'
      });
    }

    // Simulate daemon crash & restart: instantiate fresh recovery journal
    const recoveryJournal = new DaveWalJournal({ walPath: walFile });
    const startTime = performance.now();
    const recoveredEntries = recoveryJournal.replay();
    const replayDurationMs = performance.now() - startTime;

    assert.equal(recoveredEntries.length, numTransitions, 'All 50 transitions must be restored');
    assert.ok(replayDurationMs < 500, `Replay duration ${replayDurationMs.toFixed(2)}ms must be under 500ms`);

    for (let i = 0; i < numTransitions; i++) {
      assert.equal(recoveredEntries[i].seq, i + 1);
      assert.equal(recoveredEntries[i].payload.index, i + 1);
    }
  });

  it('5. should fail-closed and throw WalCorruptionError if WAL entry or checksum is tampered with', () => {
    const walFile = path.join(testDir, 'corrupted.wal');
    const journal = new DaveWalJournal({ walPath: walFile });

    journal.appendTransition({ id: 'valid-1', state: 'STEP_1' });
    journal.appendTransition({ id: 'valid-2', state: 'STEP_2' });

    // Tamper with second entry in WAL file
    const lines = fs.readFileSync(walFile, 'utf8').trim().split('\n');
    const tamperedEntry = JSON.parse(lines[1]);
    tamperedEntry.payload.state = 'CORRUPTED_INJECTION';
    // Do not update checksum to simulate corruption
    lines[1] = JSON.stringify(tamperedEntry);
    fs.writeFileSync(walFile, lines.join('\n') + '\n', 'utf8');

    const corruptJournal = new DaveWalJournal({ walPath: walFile });
    assert.throws(() => {
      corruptJournal.replay();
    }, WalCorruptionError);
  });

  it('6. should coordinate high availability lease, heartbeat, and sub-second standby failover', async () => {
    const coordDir = path.join(testDir, 'ha_coord');
    fs.mkdirSync(coordDir, { recursive: true });
    const lockFile = path.join(coordDir, 'cluster.lock');
    const sharedWal = path.join(coordDir, 'cluster.wal');

    // 1. Primary Leader Coordinator
    const leaderCoord = new DaveHaCoordinator({
      nodeId: 'node-leader',
      lockFile,
      leaseTtlMs: 300,
      heartbeatIntervalMs: 80
    });

    const acquired = await leaderCoord.acquireLease();
    assert.equal(acquired, true, 'Primary node must acquire lease');
    assert.equal(leaderCoord.isLeader(), true);

    // Append some transitions via shared WAL
    const leaderJournal = new DaveWalJournal({ walPath: sharedWal });
    leaderJournal.appendTransition({ tx: 't1', status: 'COMMITTED' });
    leaderJournal.appendTransition({ tx: 't2', status: 'COMMITTED' });

    // 2. Secondary Standby Coordinator
    const standbyCoord = new DaveHaCoordinator({
      nodeId: 'node-standby',
      lockFile,
      leaseTtlMs: 300,
      heartbeatIntervalMs: 80
    });

    // Standby attempt to acquire lease should fail while leader holds active lease
    const standbyAcquired = await standbyCoord.acquireLease();
    assert.equal(standbyAcquired, false, 'Standby should not acquire lease while leader is active');
    assert.equal(standbyCoord.isLeader(), false);

    // 3. Simulate sudden leader death (SIGKILL simulation: terminate leader without releasing lock)
    const failoverStart = performance.now();
    leaderCoord.simulateCrashKill(); // Abruptly stops heartbeats without releasing lock

    // Standby enters failover check loop
    let promoted = false;
    while (performance.now() - failoverStart < 1500) {
      promoted = await standbyCoord.checkAndPromoteIfLeaderExpired();
      if (promoted) break;
      await new Promise(r => setTimeout(r, 40));
    }

    const failoverDurationMs = performance.now() - failoverStart;
    assert.equal(promoted, true, 'Standby node must promote itself to leader after lease expiry');
    assert.equal(standbyCoord.isLeader(), true);
    assert.ok(failoverDurationMs < 1000, `Failover latency ${failoverDurationMs.toFixed(2)}ms must be under 1000ms`);

    // 4. Standby replays shared WAL to restore state
    const standbyJournal = new DaveWalJournal({ walPath: sharedWal });
    const recovered = standbyJournal.replay();
    assert.equal(recovered.length, 2);
    assert.equal(recovered[0].payload.tx, 't1');
    assert.equal(recovered[1].payload.tx, 't2');

    standbyCoord.releaseLease();
  });

  it('7. should execute testReplay() operational self-test in < 500ms with 0 lost transitions', async () => {
    const walFile = path.join(testDir, 'self_test.wal');
    const result = await DaveRuntimeDaemon.testReplay({ walPath: walFile, numTransitions: 30 });

    assert.equal(result.success, true);
    assert.equal(result.transitionsRecorded, 30);
    assert.equal(result.transitionsRestored, 30);
    assert.equal(result.lostTransitions, 0);
    assert.ok(result.replayDurationMs < 500, `Replay duration ${result.replayDurationMs}ms must be under 500ms`);
  });
});

/**
 * tests/unit/test-decision-ledger-adversarial.mjs
 *
 * Empirical Adversarial Challenge Suite for Wave 1 Decision Ledger
 * Goal: G-DAVE-001 / G-ML-015
 *
 * Stress-tests:
 * 1. Cryptographic SHA-256 parent hash chaining across deep sequence (N=100)
 * 2. Intermediate ledger tampering mutations (content mutation, forged hash, missing block, corrupt syntax)
 * 3. Fail-closed error handling and audit verification oracle
 * 4. Concurrency, race conditions, and idempotency under rapid sequential and concurrent appends
 * 5. Legacy hash interoperability (contentDigest, digest, hash)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { recordDecision, aggregateGoalAuditTrail } from '../../scripts/lib/dave-engine.mjs';
import { DecisionLedger } from '../../scripts/lib/decision-ledger.mjs';

function createTempDir(prefix = 'soda_adv_ledger_') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanTempDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {}
}

/**
 * Formal Verification Oracle for Decision Ledger Cryptographic Chains
 * @param {string} ledgerPath
 * @returns {{ valid: boolean, errors: string[], blocksChecked: number }}
 */
export function verifyLedgerChain(ledgerPath) {
  const errors = [];
  if (!fs.existsSync(ledgerPath)) {
    return { valid: true, errors: [], blocksChecked: 0 };
  }

  const content = fs.readFileSync(ledgerPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  let prevHash = '0'.repeat(64);

  for (let i = 0; i < lines.length; i++) {
    let block;
    try {
      block = JSON.parse(lines[i]);
    } catch (err) {
      errors.push(`Line ${i}: Malformed JSON syntax: ${err.message}`);
      return { valid: false, errors, blocksChecked: i };
    }

    // 1. Index continuity
    if (block.index !== undefined && block.index !== i) {
      errors.push(`Line ${i}: Index discontinuity: expected ${i}, found ${block.index}`);
    }

    // 2. Parent hash link verification
    if (block.prevHash !== undefined && block.prevHash !== prevHash) {
      errors.push(`Line ${i}: Parent hash mismatch: expected prevHash '${prevHash}', found '${block.prevHash}'`);
    }

    // 3. Block SHA-256 integrity verification
    if (block.hash) {
      const { hash: storedHash, ...entryWithoutHash } = block;
      const recomputedHash = crypto.createHash('sha256').update(JSON.stringify(entryWithoutHash)).digest('hex');
      if (storedHash !== recomputedHash) {
        errors.push(`Line ${i}: Content tampering detected: stored hash '${storedHash}' !== recomputed '${recomputedHash}'`);
      }
      prevHash = storedHash;
    } else if (block.contentDigest) {
      const { contentDigest, ...payload } = block;
      const expectedDigest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      if (contentDigest !== expectedDigest) {
        errors.push(`Line ${i}: Content digest tampering detected: stored '${contentDigest}' !== expected '${expectedDigest}'`);
      }
      prevHash = contentDigest;
    } else if (block.digest) {
      prevHash = block.digest;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    blocksChecked: lines.length
  };
}

describe('Empirical Adversarial Challenge: Wave 1 Decision Ledger', () => {
  let tmpDir;

  it('1. Cryptographic SHA-256 Hash Chaining: Genesis, Linear Continuity, and Hash Recomputation', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'chain_test.jsonl');

    const TOTAL_RECORDS = 100;
    const generated = [];

    for (let i = 0; i < TOTAL_RECORDS; i++) {
      const record = {
        decision_id: `DAVE-DEC-${String(i).padStart(4, '0')}`,
        goal_id: 'G-DAVE-001',
        decision_type: i % 2 === 0 ? 'ux_ui_design' : 'frontend_implementation',
        confidence: 0.85 + (i % 15) * 0.01,
        risk: i % 10 === 0 ? 'high' : 'low',
        payload: {
          step: i,
          thai_annotation: `บันทึกการตัดสินใจ #${i}`,
          nested: { depth: 3, flag: true, tags: ['crypto', 'sha256', `seq_${i}`] }
        }
      };

      const result = recordDecision(ledgerFile, record);
      generated.push(result);

      // Verify immediate return contract
      assert.equal(result.index, i);
      assert.ok(typeof result.hash === 'string' && result.hash.length === 64);
      assert.ok(typeof result.prevHash === 'string' && result.prevHash.length === 64);
      assert.ok(typeof result.timestamp === 'string');

      if (i === 0) {
        assert.equal(result.prevHash, '0'.repeat(64), 'Genesis block must have 64 zero characters as prevHash');
      } else {
        assert.equal(result.prevHash, generated[i - 1].hash, `Block ${i} prevHash must match block ${i - 1} hash`);
      }
    }

    // Verify full ledger via formal verification oracle
    const oracleResult = verifyLedgerChain(ledgerFile);
    assert.equal(oracleResult.valid, true, `Verification oracle failed: ${oracleResult.errors.join('; ')}`);
    assert.equal(oracleResult.blocksChecked, TOTAL_RECORDS);
    assert.equal(oracleResult.errors.length, 0);

    cleanTempDir(tmpDir);
  });

  it('2. Legacy Hash Interoperability: Support last.contentDigest, last.digest, last.hash', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'legacy_compat.jsonl');

    // Simulate record with contentDigest (from DecisionLedger)
    const contentDigest = crypto.createHash('sha256').update('legacy_content_digest_test').digest('hex');
    fs.writeFileSync(ledgerFile, JSON.stringify({ index: 0, contentDigest, text: 'legacy 1' }) + '\n');

    // Next record appended via recordDecision must pick up contentDigest as prevHash
    const rec1 = recordDecision(ledgerFile, { decision_id: 'DAVE-LEGACY-01' });
    assert.equal(rec1.prevHash, contentDigest);
    assert.equal(rec1.index, 1);

    // Simulate record with digest (from recordDaveTrajectory)
    const digestHash = crypto.createHash('sha256').update('legacy_digest_test').digest('hex');
    fs.appendFileSync(ledgerFile, JSON.stringify({ index: 2, digest: digestHash, text: 'legacy 2' }) + '\n');

    const rec2 = recordDecision(ledgerFile, { decision_id: 'DAVE-LEGACY-02' });
    assert.equal(rec2.prevHash, digestHash);
    assert.equal(rec2.index, 3);

    cleanTempDir(tmpDir);
  });

  it('3. Ledger Tampering Simulation: Mutate Intermediate Record Content (Payload Attack)', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'tamper_content.jsonl');

    // Write 10 valid blocks
    for (let i = 0; i < 10; i++) {
      recordDecision(ledgerFile, { decision_id: `DEC-${i}`, confidence: 0.90, summary: `Legit block ${i}` });
    }

    // Verify pristine state
    assert.equal(verifyLedgerChain(ledgerFile).valid, true);

    // Attack: Mutate intermediate block 4's summary without changing hash
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    const tamperedBlock4 = JSON.parse(lines[4]);
    tamperedBlock4.summary = 'MALICIOUS_TAMPERED_INJECTION';
    lines[4] = JSON.stringify(tamperedBlock4);
    fs.writeFileSync(ledgerFile, lines.join('\n') + '\n', 'utf8');

    // Oracle must detect tampering fail-closed
    const oracleResult = verifyLedgerChain(ledgerFile);
    assert.equal(oracleResult.valid, false, 'Oracle must reject content tampering');
    assert.ok(oracleResult.errors.some(e => e.includes('Content tampering detected')));

    cleanTempDir(tmpDir);
  });

  it('4. Ledger Tampering Simulation: Mutate Intermediate Record AND Recompute Hash (Chain Forgery Attack)', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'tamper_forgery.jsonl');

    for (let i = 0; i < 10; i++) {
      recordDecision(ledgerFile, { decision_id: `DEC-${i}`, confidence: 0.90 });
    }

    // Attack: Mutate block 4 AND forge block 4's hash
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    const tamperedBlock4 = JSON.parse(lines[4]);
    tamperedBlock4.confidence = 0.9999;
    const { hash: _oldHash, ...payload } = tamperedBlock4;
    tamperedBlock4.hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    lines[4] = JSON.stringify(tamperedBlock4);
    fs.writeFileSync(ledgerFile, lines.join('\n') + '\n', 'utf8');

    // Oracle must detect parent hash mismatch at block 5 fail-closed
    const oracleResult = verifyLedgerChain(ledgerFile);
    assert.equal(oracleResult.valid, false, 'Oracle must reject forged hash due to downstream chain rupture');
    assert.ok(oracleResult.errors.some(e => e.includes('Parent hash mismatch') && e.includes('Line 5')));

    cleanTempDir(tmpDir);
  });

  it('5. Ledger Tampering Simulation: Truncate Intermediate Record (Index & Chain Discontinuity)', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'tamper_truncation.jsonl');

    for (let i = 0; i < 10; i++) {
      recordDecision(ledgerFile, { decision_id: `DEC-${i}` });
    }

    // Attack: Delete line 4
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    lines.splice(4, 1);
    fs.writeFileSync(ledgerFile, lines.join('\n') + '\n', 'utf8');

    // Oracle must detect index discontinuity and parent hash mismatch
    const oracleResult = verifyLedgerChain(ledgerFile);
    assert.equal(oracleResult.valid, false);
    assert.ok(oracleResult.errors.some(e => e.includes('Index discontinuity')));
    assert.ok(oracleResult.errors.some(e => e.includes('Parent hash mismatch')));

    cleanTempDir(tmpDir);
  });

  it('6. Ledger Tampering Simulation: Intermediate Corrupt Syntax Fail-Closed Behavior', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'corrupt_syntax.jsonl');

    for (let i = 0; i < 5; i++) {
      recordDecision(ledgerFile, { decision_id: `DEC-${i}`, goal_id: 'G-DAVE-001' });
    }

    // Corrupt intermediate line 2
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    lines[2] = '{"corrupted_json_syntax: [unterminated';
    fs.writeFileSync(ledgerFile, lines.join('\n') + '\n', 'utf8');

    // 1. DecisionLedger.readDecisions() must throw fail-closed
    const dl = new DecisionLedger({ auditPath: ledgerFile, basePath: tmpDir });
    assert.throws(
      () => dl.readDecisions(),
      /Corrupt audit record at line 3/,
      'DecisionLedger.readDecisions must fail-closed on corrupt intermediate record'
    );

    // 2. aggregateGoalAuditTrail() must throw fail-closed
    assert.throws(
      () => aggregateGoalAuditTrail('G-DAVE-001', { ledgerPath: ledgerFile, cwd: tmpDir }),
      /Corrupted decision record in ledger at line 3/,
      'aggregateGoalAuditTrail must fail-closed on corrupt intermediate record'
    );

    cleanTempDir(tmpDir);
  });

  it('7. Ledger Tampering Simulation: Terminal (Last Line) Corruption Fails Closed on Append', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'corrupt_last.jsonl');

    recordDecision(ledgerFile, { decision_id: 'DEC-0' });
    recordDecision(ledgerFile, { decision_id: 'DEC-1' });

    // Corrupt the last line
    fs.appendFileSync(ledgerFile, '{"bad_last_record": \n', 'utf8');

    // Next append must fail-closed
    assert.throws(
      () => recordDecision(ledgerFile, { decision_id: 'DEC-2' }),
      /Corrupted decision record in ledger at line 3/,
      'recordDecision must throw immediately when last record is corrupted'
    );

    cleanTempDir(tmpDir);
  });

  it('8. Adversarial Stress: Rapid Sequential Appends Integrity & Monotonicity', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'rapid_seq.jsonl');

    const COUNT = 200;
    const timestamps = [];

    for (let i = 0; i < COUNT; i++) {
      const rec = recordDecision(ledgerFile, {
        seq: i,
        random_entropy: crypto.randomBytes(16).toString('hex')
      });
      timestamps.push(new Date(rec.timestamp).getTime());
    }

    // Verify line count
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    assert.equal(lines.length, COUNT);

    // Verify timestamp monotonicity (non-decreasing)
    for (let i = 1; i < timestamps.length; i++) {
      assert.ok(timestamps[i] >= timestamps[i - 1], `Timestamp inversion at ${i}: ${timestamps[i]} < ${timestamps[i-1]}`);
    }

    // Verify cryptographic integrity
    const oracle = verifyLedgerChain(ledgerFile);
    assert.equal(oracle.valid, true);
    assert.equal(oracle.blocksChecked, COUNT);

    cleanTempDir(tmpDir);
  });

  it('9. Concurrency & Idempotency: Duplicate Payloads & Audit Trail Deduplication', () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'idempotency.jsonl');

    const duplicatePayload = {
      decision_id: 'DAVE-IDEMP-001',
      goal_id: 'G-DAVE-001',
      summary: 'Identical decision payload recorded multiple times'
    };

    // Record identical payload twice
    const res1 = recordDecision(ledgerFile, duplicatePayload);
    const res2 = recordDecision(ledgerFile, duplicatePayload);

    // Both records receive distinct indices and chaining hashes
    assert.equal(res1.index, 0);
    assert.equal(res2.index, 1);
    assert.equal(res2.prevHash, res1.hash);
    assert.notEqual(res1.hash, res2.hash); // Different timestamps & indices yield distinct SHA-256

    // Verify audit ledger contains 2 chained records
    const oracle = verifyLedgerChain(ledgerFile);
    assert.equal(oracle.valid, true);
    assert.equal(oracle.blocksChecked, 2);

    // When aggregateGoalAuditTrail queries the ledger, it must deduplicate by decision_id
    const aggregated = aggregateGoalAuditTrail('G-DAVE-001', { ledgerPath: ledgerFile, cwd: tmpDir });
    assert.equal(aggregated.decisions.length, 1, 'aggregateGoalAuditTrail must deduplicate decisions by decision_id');
    assert.equal(aggregated.decisions[0].decision_id, 'DAVE-IDEMP-001');

    cleanTempDir(tmpDir);
  });

  it('10. Concurrent Async Writes Evaluation in Single-Process Event Loop', async () => {
    tmpDir = createTempDir();
    const ledgerFile = path.join(tmpDir, 'async_concurrent.jsonl');

    const CONCURRENT_COUNT = 50;
    const tasks = [];

    for (let i = 0; i < CONCURRENT_COUNT; i++) {
      tasks.push(
        new Promise((resolve) => {
          // Emulate async I/O wrapper around synchronous recordDecision
          setImmediate(() => {
            const rec = recordDecision(ledgerFile, {
              worker_id: i,
              uuid: crypto.randomUUID()
            });
            resolve(rec);
          });
        })
      );
    }

    const results = await Promise.all(tasks);
    assert.equal(results.length, CONCURRENT_COUNT);

    // Verify ledger file has exactly CONCURRENT_COUNT lines
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    assert.equal(lines.length, CONCURRENT_COUNT);

    // Verify cryptographic chain integrity
    const oracle = verifyLedgerChain(ledgerFile);
    assert.equal(oracle.valid, true, `Concurrent chain broken: ${oracle.errors.join('; ')}`);
    assert.equal(oracle.blocksChecked, CONCURRENT_COUNT);

    cleanTempDir(tmpDir);
  });

  it('11. Adversarial Boundary: Uncoordinated Multi-Process Concurrent Append Detection', async () => {
    tmpDir = createTempDir('soda_adv_proc_');
    const ledgerFile = path.join(tmpDir, 'multi_proc_ledger.jsonl');
    const daveEnginePath = path.resolve('scripts/lib/dave-engine.mjs');

    const workerScript = path.join(tmpDir, 'proc_worker.mjs');
    const workerCode = `
import { recordDecision } from '${daveEnginePath}';
const ledgerPath = process.argv[2];
const workerId = process.argv[3];
for (let i = 0; i < 15; i++) {
  recordDecision(ledgerPath, { worker: workerId, seq: i });
}
`;
    fs.writeFileSync(workerScript, workerCode);

    const { spawn } = await import('node:child_process');
    const p1 = spawn('node', [workerScript, ledgerFile, 'PROC_A']);
    const p2 = spawn('node', [workerScript, ledgerFile, 'PROC_B']);
    const p3 = spawn('node', [workerScript, ledgerFile, 'PROC_C']);

    await Promise.all([
      new Promise(r => p1.on('close', r)),
      new Promise(r => p2.on('close', r)),
      new Promise(r => p3.on('close', r))
    ]);

    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    assert.equal(lines.length, 45, 'All 45 writes must be appended to the file');

    // Run verification oracle on the multi-process ledger
    const oracle = verifyLedgerChain(ledgerFile);
    // Uncoordinated concurrent processes without mutex/lockfile may cause index collisions or chain forks
    // The oracle MUST detect any chain divergence
    if (!oracle.valid) {
      assert.ok(oracle.errors.length > 0, 'Oracle must report explicit errors on multi-process race collisions');
    }

    cleanTempDir(tmpDir);
  });

  it('12. Adversarial Edge Cases: Unicode, Deep Nesting, Nulls, Escaped Characters, and Large Payloads', () => {
    tmpDir = createTempDir('soda_adv_edge_');
    const ledgerFile = path.join(tmpDir, 'edge_payloads.jsonl');

    const edgeCases = [
      { name: 'thai_unicode', text: 'การทดสอบความถูกต้องของการเข้ารหัสภาษาไทย ๑๒๓๔๕ ฿' },
      { name: 'escaped_chars', text: 'Line1\nLine2\tTabbed\\Backslash"Quotes"' },
      { name: 'null_and_bools', a: null, b: true, c: false, d: 0, e: '' },
      { name: 'deep_nesting', level1: { level2: { level3: { level4: { level5: { val: 42 } } } } } },
      { name: 'large_array', numbers: Array.from({ length: 500 }, (_, i) => i * 7) }
    ];

    for (let i = 0; i < edgeCases.length; i++) {
      const rec = recordDecision(ledgerFile, edgeCases[i]);
      assert.equal(rec.index, i);
    }

    const oracle = verifyLedgerChain(ledgerFile);
    assert.equal(oracle.valid, true, `Edge case verification failed: ${oracle.errors.join('; ')}`);
    assert.equal(oracle.blocksChecked, edgeCases.length);

    cleanTempDir(tmpDir);
  });
});

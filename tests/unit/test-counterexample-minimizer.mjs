#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 ZERO-MOCK UNIT TEST SUITE: COUNTEREXAMPLE MINIMIZER & RECEIPT FRESHNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Zero-Mock Testing Ground Truth (Global Engineering Constitution Article I)
 * Coverage: Counterexample Schema & Validation, Trace Serialization,
 *           Delta Minimization, Deterministic Replay, Cryptographic Freshness,
 *           Stale Receipt Rejection, Directory Scanning, and CLI Runner.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

import {
  COUNTEREXAMPLE_SCHEMA_VERSION,
  SplitMix64,
  validateCounterexampleSchema,
  serializeCounterexample,
  deserializeCounterexample,
  measureSize,
  generateShrinkCandidates,
  minimizeCounterexample,
  replayCounterexample,
  registerInvariant,
  getRegisteredInvariant,
  generateGProof010ProofReceipt
} from '../../scripts/harness/counterexample-minimizer.mjs';

import {
  computeFileSha256,
  getActiveGitHead,
  resolveSourcePath,
  calculateActiveSourceHashes,
  isReceiptExpired,
  evaluateReceiptFreshness,
  assertReceiptFresh,
  scanDirectoryFreshness,
  ReceiptStaleError,
  ReceiptInvalidError
} from '../../scripts/lib/receipt-freshness-engine.mjs';

const TEST_TMP_DIR = resolve(process.cwd(), 'artifacts/test-counterexample-fixtures');

before(() => {
  if (!existsSync(TEST_TMP_DIR)) {
    mkdirSync(TEST_TMP_DIR, { recursive: true });
  }
});

after(() => {
  if (existsSync(TEST_TMP_DIR)) {
    rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  }
});

describe('1. SplitMix64 Deterministic PRNG', () => {
  test('generates deterministic pseudorandom sequence given identical seed', () => {
    const prng1 = new SplitMix64(12345);
    const prng2 = new SplitMix64(12345);

    for (let i = 0; i < 20; i++) {
      assert.equal(prng1.next(), prng2.next(), `PRNG output mismatch at step ${i}`);
      assert.equal(prng1.nextInt(0, 100), prng2.nextInt(0, 100));
    }
  });

  test('generates divergent sequence given distinct seeds', () => {
    const prng1 = new SplitMix64(111);
    const prng2 = new SplitMix64(222);

    const seq1 = Array.from({ length: 5 }, () => prng1.nextInt(0, 1000));
    const seq2 = Array.from({ length: 5 }, () => prng2.nextInt(0, 1000));

    assert.notDeepEqual(seq1, seq2);
  });
});

describe('2. Counterexample Schema Validation', () => {
  const validCe = {
    schema_version: 1,
    counterexample_id: 'G-PROOF-010-INV-001',
    goal_id: 'G-PROOF-010',
    invariant_id: 'G-PROOF-010-INV-001',
    seed: 42,
    input_tuple: [1, 2, 3],
    failing_step: 3,
    execution_trace: [{ step: 3, action: 'test', state: {} }],
    error_message: 'Assertion failed',
    replay_command: 'node scripts/harness/counterexample-minimizer.mjs --replay artifacts/ce.json'
  };

  test('validates valid counterexample schema successfully', () => {
    assert.equal(validateCounterexampleSchema(validCe), true);
  });

  test('rejects counterexample schema with invalid schema_version', () => {
    assert.throws(
      () => validateCounterexampleSchema({ ...validCe, schema_version: 99 }),
      /Invalid counterexample schema_version/
    );
  });

  test('rejects counterexample schema missing goal_id', () => {
    const invalid = { ...validCe };
    delete invalid.goal_id;
    assert.throws(() => validateCounterexampleSchema(invalid), /Missing or invalid goal_id/);
  });

  test('rejects counterexample schema missing invariant_id', () => {
    const invalid = { ...validCe };
    delete invalid.invariant_id;
    assert.throws(() => validateCounterexampleSchema(invalid), /Missing or invalid invariant_id/);
  });

  test('rejects counterexample schema missing seed or input_tuple', () => {
    const noSeed = { ...validCe };
    delete noSeed.seed;
    assert.throws(() => validateCounterexampleSchema(noSeed), /Missing seed/);

    const noInput = { ...validCe };
    delete noInput.input_tuple;
    assert.throws(() => validateCounterexampleSchema(noInput), /Missing input_tuple/);
  });

  test('rejects counterexample schema missing failing_step or replay_command', () => {
    const noStep = { ...validCe };
    delete noStep.failing_step;
    assert.throws(() => validateCounterexampleSchema(noStep), /Missing failing_step/);

    const noReplay = { ...validCe };
    delete noReplay.replay_command;
    assert.throws(() => validateCounterexampleSchema(noReplay), /Missing replay_command/);
  });
});

describe('3. Trace Serialization & Deserialization', () => {
  test('serializes counterexample artifact to JSON file on disk', () => {
    const testCe = {
      schema_version: 1,
      counterexample_id: 'TEST-GOAL-INV-001',
      goal_id: 'TEST-GOAL',
      invariant_id: 'INV-001',
      seed: 999,
      input_tuple: [100, 200, 300],
      failing_step: 2,
      execution_trace: [{ step: 2, action: 'overflow', state: { val: 600 } }],
      error_message: 'Value overflow',
      replay_command: 'node scripts/harness/counterexample-minimizer.mjs --replay test.json'
    };

    const serialized = serializeCounterexample(testCe, {
      outputDir: 'artifacts/test-counterexample-fixtures',
      fileName: 'test-ce-serialize.json'
    });

    assert.ok(existsSync(serialized.path));
    const raw = readFileSync(serialized.path, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.goal_id, 'TEST-GOAL');
    assert.equal(parsed.seed, 999);
    assert.deepEqual(parsed.input_tuple, [100, 200, 300]);
  });

  test('deserializes saved counterexample JSON file from disk with exact fidelity', () => {
    const targetPath = join(TEST_TMP_DIR, 'test-ce-serialize.json');
    const deserialized = deserializeCounterexample(targetPath);

    assert.equal(deserialized.schema_version, 1);
    assert.equal(deserialized.counterexample_id, 'TEST-GOAL-INV-001');
    assert.equal(deserialized.failing_step, 2);
    assert.equal(deserialized.error_message, 'Value overflow');
  });

  test('deserializes counterexample directly from in-memory JSON string and object', () => {
    const rawJson = JSON.stringify({
      schema_version: 1,
      counterexample_id: 'INMEM-01',
      goal_id: 'INMEM-GOAL',
      invariant_id: 'INV-MEM',
      seed: 77,
      input_tuple: { key: 'value' },
      failing_step: 1,
      execution_trace: [],
      replay_command: 'test'
    });

    const parsedFromString = deserializeCounterexample(rawJson);
    assert.equal(parsedFromString.goal_id, 'INMEM-GOAL');

    const parsedFromObj = deserializeCounterexample(parsedFromString);
    assert.equal(parsedFromObj.goal_id, 'INMEM-GOAL');
  });

  test('fails deserialization when JSON file does not exist', () => {
    assert.throws(
      () => deserializeCounterexample('artifacts/test-counterexample-fixtures/non-existent.json'),
      /not found on disk/
    );
  });

  test('fails deserialization when JSON content is malformed', () => {
    const malformedPath = join(TEST_TMP_DIR, 'malformed.json');
    writeFileSync(malformedPath, '{ "schema_version": 1, invalid json', 'utf8');

    assert.throws(
      () => deserializeCounterexample(malformedPath),
      /Failed to parse counterexample JSON/
    );
  });
});

describe('4. Delta Minimization Engine', () => {
  test('measures size of various data types correctly', () => {
    assert.equal(measureSize(null), 0);
    assert.equal(measureSize(10), 10);
    assert.equal(measureSize('hello'), 5);
    assert.equal(measureSize([1, 2, 3]), 3 + (1 + 2 + 3));
    assert.ok(measureSize({ a: 1, b: 2 }) > 0);
  });

  test('generates strictly smaller shrink candidates for integers', () => {
    const candidates = generateShrinkCandidates(10);
    assert.ok(candidates.length > 0);
    for (const c of candidates) {
      assert.ok(measureSize(c) < measureSize(10));
    }
  });

  test('generates strictly smaller shrink candidates for arrays and strings', () => {
    const arrCandidates = generateShrinkCandidates([10, 20, 30]);
    assert.ok(arrCandidates.length > 0);
    for (const ac of arrCandidates) {
      assert.ok(measureSize(ac) < measureSize([10, 20, 30]));
    }

    const strCandidates = generateShrinkCandidates('foobar');
    assert.ok(strCandidates.length > 0);
    for (const sc of strCandidates) {
      assert.ok(measureSize(sc) < measureSize('foobar'));
    }
  });

  test('minimizes large array violating sum threshold to minimal array', () => {
    // Predicate fails when sum of elements > 100
    const predicate = (arr) => {
      if (!Array.isArray(arr)) return { passed: true };
      const sum = arr.reduce((acc, v) => acc + v, 0);
      if (sum > 100) {
        return { passed: false, error: `Sum ${sum} > 100`, failingStep: 1 };
      }
      return { passed: true };
    };

    const largeInput = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const res = minimizeCounterexample(predicate, largeInput, {
      goalId: 'G-PROOF-010',
      invariantId: 'MIN-TEST-001',
      seed: 42
    });

    assert.ok(res.minimizedInput.length < largeInput.length);
    assert.ok(measureSize(res.minimizedInput) < measureSize(largeInput));
    assert.ok(res.reductionRatio > 0.5);

    // Verify minimized input still fails predicate
    const recheck = predicate(res.minimizedInput);
    assert.equal(recheck.passed, false);
  });

  test('minimizes positive integer violating upper bound to boundary value', () => {
    // Fails when number > 15
    const predicate = (num) => {
      if (num > 15) return { passed: false, error: `${num} > 15`, failingStep: 1 };
      return { passed: true };
    };

    const res = minimizeCounterexample(predicate, 10000, {
      goalId: 'G-PROOF-010',
      invariantId: 'NUM-MIN-001'
    });

    assert.ok(res.minimizedInput < 10000);
    assert.ok(res.minimizedInput >= 16);
    assert.equal(predicate(res.minimizedInput).passed, false);
  });

  test('minimizes nested object removing irrelevant keys', () => {
    // Fails only when obj.critical > 50 regardless of other keys
    const predicate = (obj) => {
      if (obj && obj.critical > 50) {
        return { passed: false, error: 'critical exceeded', failingStep: 1 };
      }
      return { passed: true };
    };

    const initial = {
      critical: 500,
      irrelevant1: 'abcdef',
      irrelevant2: [1, 2, 3, 4],
      irrelevant3: { nested: true }
    };

    const res = minimizeCounterexample(predicate, initial, {
      goalId: 'G-PROOF-010',
      invariantId: 'OBJ-MIN-001'
    });

    assert.ok(measureSize(res.minimizedInput) < measureSize(initial));
    assert.equal(predicate(res.minimizedInput).passed, false);
  });

  test('throws error when attempting to minimize an already passing input', () => {
    const predicate = (num) => num > 10 ? { passed: false } : { passed: true };
    assert.throws(
      () => minimizeCounterexample(predicate, 5),
      /cannot minimize a passing input/
    );
  });
});

describe('5. Deterministic Replay Engine', () => {
  test('replays saved counterexample and deterministically reproduces failure', () => {
    const predicate = (arr) => {
      const sum = arr.reduce((a, b) => a + b, 0);
      return sum > 50
        ? { passed: false, error: `Sum ${sum} exceeds 50`, failingStep: 2 }
        : { passed: true };
    };

    const minRes = minimizeCounterexample(predicate, [20, 30, 40, 50], {
      goalId: 'G-PROOF-010',
      invariantId: 'REPLAY-INV-001',
      seed: 888
    });

    const serialized = serializeCounterexample(minRes.counterexample, {
      outputDir: 'artifacts/test-counterexample-fixtures',
      fileName: 'replay-test.json'
    });

    const replayRes = replayCounterexample(serialized.path, { predicate });

    assert.equal(replayRes.reproduced, true);
    assert.equal(replayRes.deterministicMatch, true);
    assert.equal(replayRes.expectedStep, replayRes.actualStep);
  });

  test('replays registered invariant using invariant registry', () => {
    const testInvId = 'CUSTOM-REGISTRY-INV-99';
    registerInvariant(testInvId, (input) => {
      if (Array.isArray(input) && input.includes(42)) {
        return { passed: false, error: 'Contains forbidden 42', failingStep: 42 };
      }
      return { passed: true };
    });

    assert.ok(getRegisteredInvariant(testInvId) !== null);

    const ce = {
      schema_version: 1,
      counterexample_id: `G-PROOF-010-${testInvId}`,
      goal_id: 'G-PROOF-010',
      invariant_id: testInvId,
      seed: 123,
      input_tuple: [1, 2, 42, 4],
      failing_step: 42,
      execution_trace: [],
      error_message: 'Contains forbidden 42',
      replay_command: 'test'
    };

    const replayRes = replayCounterexample(ce);
    assert.equal(replayRes.reproduced, true);
    assert.equal(replayRes.actualStep, 42);
    assert.equal(replayRes.deterministicMatch, true);
  });

  test('detects divergence when replaying with passing evaluator', () => {
    const ce = {
      schema_version: 1,
      counterexample_id: 'DIVERGE-01',
      goal_id: 'G-PROOF-010',
      invariant_id: 'DIVERGE-INV',
      seed: 123,
      input_tuple: [1, 2, 3],
      failing_step: 1,
      execution_trace: [],
      error_message: 'Expected failure',
      replay_command: 'test'
    };

    // Evaluator passes unexpectedly
    const passingEvaluator = () => ({ passed: true });
    const replayRes = replayCounterexample(ce, { evaluator: passingEvaluator });

    assert.equal(replayRes.reproduced, false);
    assert.equal(replayRes.deterministicMatch, false);
  });
});

describe('6. Cryptographic Receipt Freshness Engine', () => {
  test('computes SHA-256 for real physical source files', () => {
    const hash = computeFileSha256('scripts/harness/counterexample-minimizer.mjs');
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  test('retrieves active git HEAD commit SHA', () => {
    const head = getActiveGitHead();
    assert.ok(typeof head === 'string');
    assert.match(head, /^[0-9a-f]{40}$/);
  });

  test('evaluates fresh proof receipt as FRESH (exitCode 0)', () => {
    // Generate fresh receipt
    const { receipt } = generateGProof010ProofReceipt();
    const evaluation = evaluateReceiptFreshness(receipt, { maxAgeHours: 24.0 });

    assert.equal(evaluation.status, 'FRESH');
    assert.equal(evaluation.fresh, true);
    assert.equal(evaluation.stale, false);
    assert.equal(evaluation.exitCode, 0);
    assert.equal(evaluation.reasons.length, 0);
  });

  test('evaluates modified source file bytes as STALE (exitCode 1)', () => {
    const { receipt } = generateGProof010ProofReceipt();

    // Tamper with receipt recorded SHA256
    const tamperedReceipt = JSON.parse(JSON.stringify(receipt));
    tamperedReceipt.source_files[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';

    const evaluation = evaluateReceiptFreshness(tamperedReceipt);
    assert.equal(evaluation.status, 'STALE');
    assert.equal(evaluation.fresh, false);
    assert.equal(evaluation.stale, true);
    assert.equal(evaluation.exitCode, 1);
    assert.ok(evaluation.reasons.some(r => r.includes('SHA256 mismatch')));
  });

  test('evaluates missing source file as STALE / INVALID (exitCode 1)', () => {
    const { receipt } = generateGProof010ProofReceipt();
    const brokenReceipt = JSON.parse(JSON.stringify(receipt));
    brokenReceipt.source_files.push({
      path: 'non-existent-file-path-xyz.mjs',
      sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    });

    const evaluation = evaluateReceiptFreshness(brokenReceipt);
    assert.equal(evaluation.fresh, false);
    assert.equal(evaluation.exitCode, 1);
    assert.ok(evaluation.reasons.some(r => r.includes('missing on disk')));
  });

  test('evaluates mismatched git HEAD commit as STALE (exitCode 1)', () => {
    const { receipt } = generateGProof010ProofReceipt();
    const driftedReceipt = JSON.parse(JSON.stringify(receipt));
    driftedReceipt.source_revision = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const evaluation = evaluateReceiptFreshness(driftedReceipt, { checkGit: true });
    assert.equal(evaluation.status, 'STALE');
    assert.equal(evaluation.fresh, false);
    assert.equal(evaluation.exitCode, 1);
    assert.ok(evaluation.reasons.some(r => r.includes('Git commit SHA mismatch')));
  });

  test('evaluates receipt older than maxAgeHours SLA as STALE (exitCode 1)', () => {
    const { receipt } = generateGProof010ProofReceipt();
    const oldReceipt = JSON.parse(JSON.stringify(receipt));
    // Set timestamp to 48 hours ago
    const past = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    oldReceipt.generated_at = past;

    const evaluation = evaluateReceiptFreshness(oldReceipt, { maxAgeHours: 24.0 });
    assert.equal(evaluation.status, 'STALE');
    assert.equal(evaluation.fresh, false);
    assert.equal(evaluation.exitCode, 1);
    assert.ok(evaluation.reasons.some(r => r.includes('timestamp expired')));
  });

  test('assertReceiptFresh throws ReceiptStaleError on stale receipt', () => {
    const { receipt } = generateGProof010ProofReceipt();
    const staleReceipt = JSON.parse(JSON.stringify(receipt));
    staleReceipt.source_files[0].sha256 = 'badhashbadhashbadhashbadhashbadhashbadhashbadhashbadhashbadhash';

    assert.throws(
      () => assertReceiptFresh(staleReceipt),
      (err) => err instanceof ReceiptStaleError && err.exitCode === 1
    );
  });

  test('assertReceiptFresh throws ReceiptInvalidError on malformed receipt', () => {
    const malformed = { schema_version: 99 };
    assert.throws(
      () => assertReceiptFresh(malformed),
      (err) => err instanceof ReceiptInvalidError && err.exitCode === 1
    );
  });

  test('scans directory receipts returning summary counts', () => {
    const scanRes = scanDirectoryFreshness('docs/07-backlog/evidence');
    assert.ok(scanRes.total > 0);
    assert.ok(scanRes.results.length === scanRes.total);
    assert.ok(typeof scanRes.freshCount === 'number');
    assert.ok(typeof scanRes.staleCount === 'number');
  });
});

describe('7. CLI Execution Integration', () => {
  test('CLI runs default verification battery exiting code 0', () => {
    const output = execSync('node scripts/harness/counterexample-minimizer.mjs', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    assert.match(output, /ALL G-PROOF-010 MINIMIZER & REPLAY INVARIANTS VERIFIED/);
  });

  test('CLI runs with --json returning structured JSON', () => {
    const output = execSync('node scripts/harness/counterexample-minimizer.mjs --json', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    const parsed = JSON.parse(output);
    assert.ok(parsed.minimization);
    assert.ok(parsed.replay);
    assert.equal(parsed.replay.deterministicMatch, true);
  });

  test('CLI --check-freshness on G-PROOF-010 exits code 0', () => {
    const output = execSync('node scripts/harness/counterexample-minimizer.mjs --check-freshness --receipt G-PROOF-010', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    assert.match(output, /FRESH/);
  });

  test('CLI --check-freshness on expired SLA exits code 1', () => {
    assert.throws(() => {
      execSync('node scripts/harness/counterexample-minimizer.mjs --check-freshness --receipt G-PROOF-010 --max-age-hours 0.0000001', {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });
    }, (err) => {
      return err.status === 1;
    });
  });

  test('CLI --replay on generated artifact reproduces failure with exit code 0', () => {
    const artifactPath = 'artifacts/counterexamples/G-PROOF-010-DEMO-INV-001.json';
    assert.ok(existsSync(artifactPath));

    const output = execSync(`node scripts/harness/counterexample-minimizer.mjs --replay ${artifactPath}`, {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    assert.match(output, /Deterministic\s+:\s+✅ VERIFIED/);
  });
});

#!/usr/bin/env node
/**
 * tests/unit/test-adversarial-empirical-stress-ml2.mjs
 *
 * Adversarial Empirical Stress Testing Suite for Node.js ML Goals (G-ML-013, G-ML-014, G-ML-015).
 * Created by Challenger ML 2 (Empirical Challenger).
 *
 * Invariant: ZERO MOCKS, ZERO STUBS, REAL LIVE NETWORK SOCKETS AND FILE I/O ONLY.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

import {
  ModelAdapter,
  ModelInferenceError,
  createLocalInferenceServer
} from '../../scripts/lib/model-adapter.mjs';

import {
  validateDecision,
  routeDecision,
  calibrationMetrics
} from '../../scripts/lib/confidence-calibration.mjs';

import { DecisionLedger } from '../../scripts/lib/decision-ledger.mjs';

async function runAdversarialStressSuite() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('⚔️  CHALLENGER ML 2: ADVERSARIAL EMPIRICAL STRESS TEST HARNESS (G-ML-013..015)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. G-ML-013 ModelAdapter Network Socket SLA (<50ms) Stress Test
  // ─────────────────────────────────────────────────────────────────────────────
  await test('G-ML-013: Sub-50ms Gateway Timeout SLA strictly aborts delayed responses', async () => {
    // Spin up real HTTP server that delays response past 50ms
    const delayedServer = await createLocalInferenceServer((req, res) => {
      setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text: 'Laggy response', confidence: 0.9 }));
        }
      }, 120);
    });

    try {
      const adapter = new ModelAdapter({
        endpointUrl: delayedServer.url,
        timeoutMs: 45 // Hard 45ms SLA (< 50ms)
      });

      const t0 = Date.now();
      await assert.rejects(
        async () => adapter.generateDecision('Evaluate high-frequency order risk'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError, 'Must be ModelInferenceError');
          assert.equal(err.code, 'GATEWAY_TIMEOUT');
          assert.match(err.message, /timed out after 45ms SLA limit/);
          return true;
        }
      );
      const elapsed = Date.now() - t0;
      assert.ok(elapsed < 100, `Timeout must trigger promptly, took ${elapsed}ms`);
    } finally {
      await delayedServer.close();
    }
  });

  await test('G-ML-013: Sub-50ms Fast Gateway responds cleanly within budget', async () => {
    // Spin up real HTTP server that responds immediately (< 5ms)
    const fastServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'Proceed with low-risk batch update',
        confidence: 0.965,
        decisionToken: 'proceed'
      }));
    });

    try {
      const adapter = new ModelAdapter({
        endpointUrl: fastServer.url,
        timeoutMs: 50
      });

      const result = await adapter.generateDecision('Fast query');
      assert.equal(result.text, 'Proceed with low-risk batch update');
      assert.equal(result.confidence, 0.965);
      assert.ok(result.latencyMs < 50, `Latency must be < 50ms, was ${result.latencyMs}ms`);
    } finally {
      await fastServer.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. G-ML-014 GovernedDecision Contract Boundary Stress Test
  // ─────────────────────────────────────────────────────────────────────────────
  await test('G-ML-014: GovernedDecision fails closed on missing, non-string, or empty answers', async () => {
    assert.throws(
      () => validateDecision(null),
      { name: 'TypeError', message: /decision must be a non-null object/ }
    );
    assert.throws(
      () => validateDecision({ answer: '', confidence: 0.8 }),
      { name: 'TypeError', message: /decision\.answer is required and must be a non-empty string/ }
    );
    assert.throws(
      () => validateDecision({ answer: '   ', confidence: 0.8 }),
      { name: 'TypeError', message: /decision\.answer is required and must be a non-empty string/ }
    );
    assert.throws(
      () => validateDecision({ answer: 12345, confidence: 0.8 }),
      { name: 'TypeError', message: /decision\.answer is required and must be a non-empty string/ }
    );
  });

  await test('G-ML-014: GovernedDecision fails closed on out-of-bounds, NaN, or non-array evidence', async () => {
    assert.throws(
      () => validateDecision({ answer: 'Valid answer', confidence: 1.0001 }),
      { name: 'RangeError', message: /decision\.confidence must be between 0 and 1/ }
    );
    assert.throws(
      () => validateDecision({ answer: 'Valid answer', confidence: -0.0001 }),
      { name: 'RangeError', message: /decision\.confidence must be between 0 and 1/ }
    );
    assert.throws(
      () => validateDecision({ answer: 'Valid answer', confidence: NaN }),
      { name: 'TypeError', message: /decision\.confidence must be a finite number/ }
    );
    assert.throws(
      () => validateDecision({ answer: 'Valid answer', confidence: 0.9, evidence: 'single_string.txt' }),
      { name: 'TypeError', message: /decision\.evidence must be an array/ }
    );
    assert.throws(
      () => validateDecision({ answer: 'Valid answer', confidence: 0.9, evidence: ['valid.txt', 123] }),
      { name: 'TypeError', message: /decision\.evidence must be an array of strings/ }
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. G-ML-015 DecisionLedger Citation Path Traversal Resistance Stress Test
  // ─────────────────────────────────────────────────────────────────────────────
  await test('G-ML-015: Citation path traversal attacks escaping workspace are strictly rejected', async () => {
    const tempDir = fs.mkdtempSync(path.join(REPO_ROOT, 'tests/unit/scratch_ledger_stress_'));
    try {
      const ledger = new DecisionLedger({
        auditPath: path.join(tempDir, 'audit_ledger.jsonl'),
        basePath: tempDir
      });

      // Create a valid workspace file
      const validFile = path.join(tempDir, 'evidence.txt');
      fs.writeFileSync(validFile, 'Legitimate evidence content');

      // Attempt diverse path traversal attacks
      const traversalAttacks = [
        '../../../../etc/passwd',
        '../../../../etc/shadow',
        '../../.git/config',
        '/etc/passwd',
        '/etc/hosts',
        '../outside_file.txt',
        'subdir/../../../../../../etc/resolv.conf'
      ];

      for (const attack of traversalAttacks) {
        const verifyRes = ledger.verifyEvidenceCitations([attack], tempDir);
        assert.equal(verifyRes.verified, false, `Traversal attack '${attack}' must NOT be verified`);
        assert.ok(verifyRes.missing.includes(attack), `Attack '${attack}' must be reported missing`);
        const detail = verifyRes.details.find(d => d.citation === attack);
        assert.ok(detail, `Detail entry must exist for ${attack}`);
        assert.equal(detail.withinWorkspace, false, `withinWorkspace must be false for ${attack}`);
        assert.equal(detail.exists, false, `exists must be false for ${attack}`);

        // Record decision with traversal attack claiming evidenceVerified: true
        const record = ledger.recordDecision({
          answer: 'Attempting malicious action with traversal evidence',
          confidence: 0.95,
          evidence: [attack],
          evidenceVerified: true // Adversarial claim
        });

        // The ledger MUST override evidenceVerified to false!
        assert.equal(record.evidenceVerified, false, `evidenceVerified MUST be overridden to false for attack ${attack}`);
        assert.ok(record.missingEvidence.includes(attack));
      }

      // Legitimate citation must pass
      const validRes = ledger.verifyEvidenceCitations(['evidence.txt'], tempDir);
      assert.equal(validRes.verified, true);
      assert.equal(validRes.missing.length, 0);

      const validRecord = ledger.recordDecision({
        answer: 'Legitimate decision',
        confidence: 0.95,
        evidence: ['evidence.txt'],
        evidenceVerified: true
      });
      assert.equal(validRecord.evidenceVerified, true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  console.log(`\n════════════════════════════════════════════════════════════════════════════════`);
  console.log(`🏆 ALL ADVERSARIAL EMPIRICAL STRESS TESTS PASSED: ${passed}/${total} (100.0%)`);
  console.log(`════════════════════════════════════════════════════════════════════════════════\n`);
}

runAdversarialStressSuite().catch((err) => {
  console.error('FATAL: Adversarial stress harness failed:', err);
  process.exit(1);
});

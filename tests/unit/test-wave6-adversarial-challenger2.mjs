#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ ADVERSARIAL EMPIRICAL CHALLENGE SUITE: MILESTONE 6
 * ════════════════════════════════════════════════════════════════════════════════
 * Target Goals:
 *   - G-UX-026: Merkle-Tree Decision Ledger & Cryptographic Chaining
 *   - G-UX-027: Streaming Telemetry & Calibration Drift Monitor
 *   - G-UX-028: Central Ecosystem Parity & Dynamic Cross-Project Synchronizer
 * Challenger: challenger_wave6_2 (Roles: Critic, Specialist, Empirical Challenger)
 * Standards: Global Engineering Constitution (Articles I, II, IV, V, VI),
 *            28 Senior Engineering Pillars, Zero Mocks, Zero Stubs
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execSync } from 'node:child_process';

import {
  MerkleDecisionLedger,
  LedgerCorruptionError,
  calculateBlockHash,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  probeEvidenceFiles,
  sha256,
  GENESIS_PREV_HASH
} from '../../scripts/lib/merkle-decision-ledger.mjs';

import {
  UxCalibrationDriftMonitor,
  CIRCUIT_STATES,
  TELEMETRY_THRESHOLDS,
  calculate10BinEce,
  calculateBrierScore,
  calculateHcer,
  calculateLatencyPercentiles
} from '../../scripts/lib/ux-calibration-drift-monitor.mjs';

import {
  Money,
  InvalidMoneyError,
  CurrencyMismatchError,
  ISO_4217_CURRENCIES
} from '../../scripts/lib/multi-currency-money.mjs';

const SODA_ROOT = process.cwd();
const PROJECTS_BASE = '/Users/batrarethsudprasert/projects';

describe('⚔️ ADVERSARIAL CHALLENGE: MILESTONE 6 EMPIRICAL VERIFICATION', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // PROBE 1: MERKLE DECISION LEDGER TAMPER & CORRUPTION INJECTION (G-UX-026)
  // ════════════════════════════════════════════════════════════════════════════
  describe('Probe 1: Merkle Ledger Tamper & Corruption Injection', () => {
    let tempDir;
    let ledgerPath;

    before(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-adv-ledger-'));
      ledgerPath = path.join(tempDir, 'decision-ledger.jsonl');
    });

    after(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('1.1 should construct a multi-block ledger with clean integrity verification', () => {
      const ledger = new MerkleDecisionLedger(ledgerPath);
      for (let i = 0; i < 8; i++) {
        ledger.appendDecision(`DEC-${i + 1}`, {
          persona: 'VisualDesigner',
          component: 'HeaderBar',
          confidence: 0.85 + (i * 0.01),
          action: 'MODIFY_BORDER_RADIUS',
          iteration: i
        });
      }

      const report = ledger.verifyIntegrity();
      assert.strictEqual(report.valid, true);
      assert.strictEqual(report.block_count, 8);
      assert.strictEqual(typeof report.merkle_root, 'string');
      assert.strictEqual(report.merkle_root.length, 64);
    });

    it('1.2 should throw LedgerCorruptionError when mid-chain block payload is mutated', () => {
      // Read lines, mutate block 4
      const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
      assert.strictEqual(lines.length, 8);

      const block4 = JSON.parse(lines[3]); // index 3 is 4th block
      block4.payload.confidence = 0.9999; // Tamper with payload

      const tamperedLines = [...lines];
      tamperedLines[3] = JSON.stringify(block4);
      fs.writeFileSync(ledgerPath, tamperedLines.join('\n') + '\n', 'utf8');

      const corruptedLedger = new MerkleDecisionLedger(ledgerPath);
      assert.throws(
        () => corruptedLedger.verifyIntegrity(),
        (err) => {
          assert(err instanceof LedgerCorruptionError, `Expected LedgerCorruptionError, got ${err.name}`);
          assert(err.message.includes('Tampered block payload at index 3'), `Unexpected message: ${err.message}`);
          assert.strictEqual(err.context.blockIndex, 3);
          return true;
        }
      );

      // Restore clean lines
      fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
      const restoredLedger = new MerkleDecisionLedger(ledgerPath);
      assert.strictEqual(restoredLedger.verifyIntegrity().valid, true);
    });

    it('1.3 should throw LedgerCorruptionError when prev_hash pointer is broken', () => {
      const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
      const block5 = JSON.parse(lines[4]);
      block5.prev_hash = 'a'.repeat(64); // Break pointer
      block5.block_hash = calculateBlockHash(block5); // Recompute block hash so payload check doesn't fire first

      const tamperedLines = [...lines];
      tamperedLines[4] = JSON.stringify(block5);
      fs.writeFileSync(ledgerPath, tamperedLines.join('\n') + '\n', 'utf8');

      const corruptedLedger = new MerkleDecisionLedger(ledgerPath);
      assert.throws(
        () => corruptedLedger.verifyIntegrity(),
        (err) => {
          assert(err instanceof LedgerCorruptionError);
          assert(err.message.includes('Broken hash chain at block 4'), `Unexpected message: ${err.message}`);
          assert.strictEqual(err.context.blockIndex, 4);
          return true;
        }
      );

      // Restore clean lines
      fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
    });

    it('1.4 should throw LedgerCorruptionError when block sequence is swapped or out of order', () => {
      const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
      // Swap block 2 and block 3
      const swappedLines = [...lines];
      const temp = swappedLines[1];
      swappedLines[1] = swappedLines[2];
      swappedLines[2] = temp;
      fs.writeFileSync(ledgerPath, swappedLines.join('\n') + '\n', 'utf8');

      const corruptedLedger = new MerkleDecisionLedger(ledgerPath);
      assert.throws(
        () => corruptedLedger.verifyIntegrity(),
        (err) => {
          assert(err instanceof LedgerCorruptionError);
          assert(err.message.includes('Broken sequence at block 1') || err.message.includes('Broken hash chain'), `Unexpected message: ${err.message}`);
          return true;
        }
      );

      // Restore clean lines
      fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
    });

    it('1.5 should throw LedgerCorruptionError when phantom or duplicate block is injected', () => {
      const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
      // Inject duplicate block 2 between block 2 and 3
      const phantomLines = [
        lines[0],
        lines[1],
        lines[1], // Duplicate phantom block
        lines[2],
        lines[3]
      ];
      fs.writeFileSync(ledgerPath, phantomLines.join('\n') + '\n', 'utf8');

      const corruptedLedger = new MerkleDecisionLedger(ledgerPath);
      assert.throws(
        () => corruptedLedger.verifyIntegrity(),
        (err) => {
          assert(err instanceof LedgerCorruptionError);
          return true;
        }
      );

      // Restore clean lines
      fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
    });

    it('1.6 should throw LedgerCorruptionError on malformed truncated JSON line', () => {
      const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
      const corruptedLines = [...lines, '{"index": 8, "timestamp": "2026-10-14", "payload": {'];
      fs.writeFileSync(ledgerPath, corruptedLines.join('\n') + '\n', 'utf8');

      assert.throws(
        () => new MerkleDecisionLedger(ledgerPath),
        (err) => {
          assert(err instanceof LedgerCorruptionError);
          assert(err.message.includes('Corrupted JSON line at block index 8'));
          return true;
        }
      );

      // Restore clean lines
      fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
    });

    it('1.7 should detect missing or non-existent evidence files fail-closed', () => {
      // Create real evidence file
      const ev1Path = path.join(tempDir, 'evidence1.png');
      fs.writeFileSync(ev1Path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      const missingPath = path.join(tempDir, 'ghost-screenshot.png');
      const probeRes = probeEvidenceFiles([ev1Path, missingPath], tempDir);

      assert.strictEqual(probeRes.probed, 1);
      assert.strictEqual(probeRes.valid, false);
      assert.strictEqual(probeRes.missing.length, 1);
      assert.strictEqual(probeRes.missing[0], missingPath);
      assert.strictEqual(probeRes.evidence_manifest[0].sha256, sha256(fs.readFileSync(ev1Path)));
    });

    it('1.8 should verify genuine Merkle inclusion proofs and reject forged proofs', () => {
      const leafHashes = [];
      for (let i = 0; i < 16; i++) {
        leafHashes.push(sha256(`LEAF_PAYLOAD_${i}`));
      }

      const root = computeMerkleRoot(leafHashes);
      const proofObj = generateMerkleProof(leafHashes, 5);

      // Genuine verification
      const isValid = verifyMerkleProof(proofObj.targetLeaf, proofObj.proof, root);
      assert.strictEqual(isValid, true);

      // Attack A: Forged leaf
      const forgedLeaf = sha256('FORGED_LEAF');
      assert.strictEqual(verifyMerkleProof(forgedLeaf, proofObj.proof, root), false);

      // Attack B: Forged root
      const forgedRoot = sha256('FORGED_ROOT');
      assert.strictEqual(verifyMerkleProof(proofObj.targetLeaf, proofObj.proof, forgedRoot), false);

      // Attack C: Mutate proof step hash
      const corruptedProof = JSON.parse(JSON.stringify(proofObj.proof));
      corruptedProof[0].hash = '0'.repeat(64);
      assert.strictEqual(verifyMerkleProof(proofObj.targetLeaf, corruptedProof, root), false);

      // Attack D: Tamper with step direction
      const invertedProof = JSON.parse(JSON.stringify(proofObj.proof));
      invertedProof[0].position = invertedProof[0].position === 'left' ? 'right' : 'left';
      assert.strictEqual(verifyMerkleProof(proofObj.targetLeaf, invertedProof, root), false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROBE 2: TELEMETRY DRIFT & CIRCUIT BREAKER TRIP STRESS (G-UX-027)
  // ════════════════════════════════════════════════════════════════════════════
  describe('Probe 2: Telemetry Drift & Circuit Breaker Trip Stress', () => {

    it('2.1 should trip to TRIPPED_REJECT under toxic overconfidence injection (HCER >= 0.050)', () => {
      const monitor = new UxCalibrationDriftMonitor({ windowSize: 50 });
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.CLOSED);

      // Stream 25 decisions with 95% confidence but 100% incorrect outcomes (toxic overconfidence)
      for (let i = 0; i < 25; i++) {
        monitor.recordDecision({
          decision_id: `DEC-TOXIC-${i}`,
          confidence: 0.95,
          correct: false,
          latency_ms: 15.0,
          tokens_in: 1000n,
          tokens_out: 500n
        });
      }

      const report = monitor.getTelemetryReport();
      assert.strictEqual(report.calibration_metrics.hcer, 1.0);
      assert.strictEqual(report.circuit_breaker.state, CIRCUIT_STATES.TRIPPED_REJECT);
      assert(report.circuit_breaker.trip_reason.includes('Severe HCER drift detected'));

      // Routing guard MUST fail closed to REJECT_AS_UNSAFE
      const guard = monitor.checkRoutingGuard(0.99);
      assert.strictEqual(guard.allowed, false);
      assert.strictEqual(guard.action, 'REJECT_AS_UNSAFE');
      assert.strictEqual(guard.circuit_state, CIRCUIT_STATES.TRIPPED_REJECT);
    });

    it('2.2 should trip to TRIPPED_DEFER under miscalibration drift (ECE >= 0.070, HCER < 0.030)', () => {
      const monitor = new UxCalibrationDriftMonitor({ windowSize: 50 });

      // Stream 25 decisions with confidence = 0.70 (below HCER threshold 0.80) but 100% incorrect
      // ECE will be ~0.70 >= 0.070 threshold, while HCER = 0.0 (below 0.030 threshold)
      for (let i = 0; i < 25; i++) {
        monitor.recordDecision({
          decision_id: `DEC-MISCAL-${i}`,
          confidence: 0.70,
          correct: false,
          latency_ms: 12.0,
          tokens_in: 1000n,
          tokens_out: 500n
        });
      }

      const report = monitor.getTelemetryReport();
      assert(report.calibration_metrics.ece_10bin >= 0.070);
      assert.strictEqual(report.calibration_metrics.hcer, 0.0);
      assert.strictEqual(report.circuit_breaker.state, CIRCUIT_STATES.TRIPPED_DEFER);

      // Routing guard MUST fail closed to DEFER
      const guard = monitor.checkRoutingGuard(0.90);
      assert.strictEqual(guard.allowed, false);
      assert.strictEqual(guard.action, 'DEFER');
      assert.strictEqual(guard.circuit_state, CIRCUIT_STATES.TRIPPED_DEFER);
    });

    it('2.3 should fail closed even on proposed confidence 1.0 when circuit breaker is tripped', () => {
      const monitor = new UxCalibrationDriftMonitor({ windowSize: 20 });
      monitor.trip(CIRCUIT_STATES.TRIPPED_REJECT, 'Adversarial manual trip');

      const guard = monitor.checkRoutingGuard(1.0);
      assert.strictEqual(guard.allowed, false);
      assert.strictEqual(guard.action, 'REJECT_AS_UNSAFE');
    });

    it('2.4 should recover through HALF_OPEN probing to CLOSED state on healthy calibrated workload', () => {
      // Use windowSize: 10 and recoveryProbesRequired: 5
      const monitor = new UxCalibrationDriftMonitor({
        windowSize: 10,
        recoveryProbesRequired: 5
      });

      // Pre-fill window with 10 samples so samples.length >= 10
      for (let i = 0; i < 10; i++) {
        monitor.recordDecision({
          decision_id: `DEC-INIT-${i}`,
          confidence: 0.98,
          correct: true,
          latency_ms: 10.0
        });
      }

      monitor.trip(CIRCUIT_STATES.TRIPPED_DEFER, 'Simulated drift');
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.TRIPPED_DEFER);

      // Transition to HALF_OPEN
      monitor.setHalfOpen();
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.HALF_OPEN);

      const probeGuard = monitor.checkRoutingGuard();
      assert.strictEqual(probeGuard.action, 'PROBE');
      assert.strictEqual(probeGuard.allowed, true);

      // Stream 5 calibrated healthy decisions (conf=0.98, correct=true, latency=10ms)
      for (let i = 0; i < 5; i++) {
        monitor.recordDecision({
          decision_id: `DEC-REC-${i}`,
          confidence: 0.98,
          correct: true,
          latency_ms: 10.0,
          tokens_in: 500n,
          tokens_out: 250n
        });
      }

      // Assert monitor recovered to CLOSED
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.CLOSED);
      const postRecoveryGuard = monitor.checkRoutingGuard(0.85);
      assert.strictEqual(postRecoveryGuard.action, 'PROCEED');
      assert.strictEqual(postRecoveryGuard.allowed, true);
    });

    it('2.5 should abort recovery in HALF_OPEN and re-trip if probe fails on drifted window', () => {
      const monitor = new UxCalibrationDriftMonitor({
        windowSize: 10,
        recoveryProbesRequired: 5
      });
      // Pre-populate with 10 drifted decisions
      for (let i = 0; i < 10; i++) {
        monitor.recordDecision({
          decision_id: `DEC-INIT-${i}`,
          confidence: 0.95,
          correct: false,
          latency_ms: 10.0
        });
      }
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.TRIPPED_REJECT);

      monitor.setHalfOpen();
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.HALF_OPEN);

      // Stream an unhealthy decision while window is drifted
      monitor.recordDecision({
        decision_id: 'DEC-UNHEALTHY-PROBE',
        confidence: 0.95,
        correct: false,
        latency_ms: 10.0
      });

      // Assert it re-tripped back to TRIPPED_DEFER
      assert.strictEqual(monitor.circuitState, CIRCUIT_STATES.TRIPPED_DEFER);
    });

    it('2.6 should enforce Article VI Zero-Float Invariant on token accounting fail-closed', () => {
      const monitor = new UxCalibrationDriftMonitor({ defaultCurrency: 'USD' });

      // Float in tokens_in -> BigInt(float) throws RangeError
      assert.throws(
        () => monitor.recordDecision({ tokens_in: 1234.56, tokens_out: 0 }),
        (err) => err instanceof RangeError
      );

      // Float in tokens_out -> BigInt(float) throws RangeError
      assert.throws(
        () => monitor.recordDecision({ tokens_in: 100, tokens_out: 56.78 }),
        (err) => err instanceof RangeError
      );

      // Money with float minor units throws InvalidMoneyError
      assert.throws(
        () => new Money(99.99, 'USD'),
        (err) => err instanceof InvalidMoneyError
      );

      // Exact integer BigInt accounting
      monitor.recordDecision({ tokens_in: 1000000n, tokens_out: 500000n });
      const report = monitor.getTelemetryReport();
      assert.strictEqual(report.token_accounting.total_tokens_in, '1000000');
      assert.strictEqual(report.token_accounting.total_tokens_out, '500000');
      // cost = (1000000 * 15 / 1000) + (500000 * 30 / 1000) = 15000 + 15000 = 30000 minor units ($300.00 USD)
      assert.strictEqual(report.token_accounting.total_cost_minor, '30000');
      assert.strictEqual(report.token_accounting.formatted_cost, '300.00 USD');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROBE 3: ECOSYSTEM PARITY & DRIFT STRESS (G-UX-028)
  // ════════════════════════════════════════════════════════════════════════════
  describe('Probe 3: Ecosystem Parity & Drift Stress', () => {

    it('3.1 should confirm all schemas in schemas/ parse cleanly as valid JSON', () => {
      const schemasDir = path.join(SODA_ROOT, 'schemas');
      assert(fs.existsSync(schemasDir), 'schemas directory must exist');

      const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith('.json'));
      assert(files.length >= 6, `Expected at least 6 schemas, got ${files.length}`);

      for (const f of files) {
        const fullPath = path.join(schemasDir, f);
        const content = fs.readFileSync(fullPath, 'utf8');
        let parsed;
        assert.doesNotThrow(() => {
          parsed = JSON.parse(content);
        }, `Schema ${f} is not valid JSON`);
        assert(parsed !== null && typeof parsed === 'object', `Schema ${f} parsed to non-object`);
      }
    });

    it('3.2 should verify exactly 54 downstream repositories exist under /Users/batrarethsudprasert/projects', () => {
      assert(fs.existsSync(PROJECTS_BASE), `Projects base dir ${PROJECTS_BASE} must exist`);
      const entries = fs.readdirSync(PROJECTS_BASE, { withFileTypes: true });
      const repos = entries
        .filter((ent) => ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== 'soda-os')
        .map((ent) => ent.name);

      assert.strictEqual(repos.length, 54, `Expected exactly 54 downstream projects, discovered ${repos.length}`);
    });

    it('3.3 should verify bitwise parity across randomly sampled Tier A and Tier B repositories', () => {
      const sampleTargets = [
        'sodality-aether',      // Tier A
        'sodality-aexis',       // Tier A
        'omni-quant-system',    // Tier A
        'sodality-aeris',       // Tier B
        'sodality-aegis',       // Tier B
        'sodality-aeonix',      // Tier B
        'sodality-aethos'       // Tier B
      ];

      const filesToCompare = [
        '.agents/rules/governance.md',
        'scripts/lib/merkle-decision-ledger.mjs',
        'scripts/lib/ux-calibration-drift-monitor.mjs',
        'scripts/lib/multi-currency-money.mjs',
        'schemas/ux-decision-contract.schema.json',
        'scripts/harness/merkle-decision-ledger-harness.mjs',
        'scripts/harness/ux-telemetry-drift-harness.mjs',
        'scripts/harness/ecosystem-parity-harness.mjs'
      ];

      for (const targetName of sampleTargets) {
        const targetRoot = path.join(PROJECTS_BASE, targetName);
        assert(fs.existsSync(targetRoot), `Target repo ${targetName} does not exist`);

        for (const relFile of filesToCompare) {
          const srcPath = path.join(SODA_ROOT, relFile);
          const destPath = path.join(targetRoot, relFile);

          assert(fs.existsSync(srcPath), `Source file ${srcPath} does not exist`);
          assert(fs.existsSync(destPath), `Synced file ${destPath} does not exist in target ${targetName}`);

          const srcBytes = fs.readFileSync(srcPath);
          const destBytes = fs.readFileSync(destPath);

          assert(
            srcBytes.equals(destBytes),
            `Bitwise mismatch between ${relFile} in soda-os and ${targetName}!`
          );
        }
      }
    });

    it('3.4 should execute node ./cli.js sync-ecosystem and assert 0 errors', () => {
      const output = execSync('node ./cli.js sync-ecosystem', {
        cwd: SODA_ROOT,
        encoding: 'utf8',
        timeout: 60000
      });

      assert(output.includes('54 Synced | 0 Errors | 0 Skipped'), `Sync output unexpected: ${output}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROBE 4: CONSTITUTIONAL & HARNESS CERTIFICATION (G-UX-026..G-UX-028)
  // ════════════════════════════════════════════════════════════════════════════
  describe('Probe 4: Constitutional Proofs & Conformance', () => {

    it('4.1 should pass cryptographic proof receipt validation for G-UX-026, G-UX-027, G-UX-028', () => {
      const goals = ['G-UX-026', 'G-UX-027', 'G-UX-028'];
      for (const goal of goals) {
        const out = execSync(`node scripts/harness/proof-receipt-validator.mjs ${goal}`, {
          cwd: SODA_ROOT,
          encoding: 'utf8'
        });
        assert(out.includes('Proof Receipt Validated'), `Validation failed for ${goal}: ${out}`);
      }
    });

    it('4.2 should pass 51-section goal template conformance for G-UX-026, G-UX-027, G-UX-028', () => {
      const out = execSync('node scripts/harness/goal-template-conformance-harness.mjs G-UX-026 G-UX-027 G-UX-028', {
        cwd: SODA_ROOT,
        encoding: 'utf8'
      });
      assert(out.includes('3 Passed, 0 Failed'), `Template conformance failed: ${out}`);
    });

    it('4.3 should confirm zero mocks across touched milestone files', () => {
      const out = execSync('node scripts/harness/no-mock-production-gate-harness.mjs', {
        cwd: SODA_ROOT,
        encoding: 'utf8'
      });
      assert(out.includes('Zero-mock production gate passed'), `Mock detected: ${out}`);
    });

    it('4.4 should verify template/ mirror bitwise parity across all milestone files', () => {
      const files = [
        'scripts/lib/merkle-decision-ledger.mjs',
        'scripts/lib/ux-calibration-drift-monitor.mjs',
        'scripts/goals/sync-ecosystem.js',
        'scripts/harness/merkle-decision-ledger-harness.mjs',
        'scripts/harness/ux-telemetry-drift-harness.mjs',
        'scripts/harness/ecosystem-parity-harness.mjs',
        'schemas/ux-decision-contract.schema.json',
        'tests/unit/test-merkle-decision-ledger.mjs',
        'tests/unit/test-ux-telemetry-monitor.mjs',
        'tests/unit/test-sync-ecosystem-ux.mjs'
      ];

      for (const rel of files) {
        const rootPath = path.join(SODA_ROOT, rel);
        const templatePath = path.join(SODA_ROOT, 'template', rel);
        if (fs.existsSync(rootPath) && fs.existsSync(templatePath)) {
          const rootBytes = fs.readFileSync(rootPath);
          const tplBytes = fs.readFileSync(templatePath);
          assert(rootBytes.equals(tplBytes), `Template drift detected in template/${rel}`);
        }
      }
    });
  });
});

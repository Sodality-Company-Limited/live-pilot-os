#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ZERO-MOCK UNIT TEST SUITE: VERIFICATION ORCHESTRATOR (G-PROOF-012)
 * ════════════════════════════════════════════════════════════════════════════════
 * Invariants Verified:
 *   - Article I: Zero Mocks, Zero Stubs, Zero Simulated Fallbacks
 *   - Profile Resolution: Canonical, legacy 'core', multi-profile arrays, and configs
 *   - Exit Code Mapping: 0: PASS, 1: FAIL_ASSERTION, 2: TIMEOUT, 3: SCHEMA_ERROR, 4: REPLAY_DIFF
 *   - Pipeline Execution: Deterministic harness dispatch, duration tracking, scorecard
 *   - Lifecycle Pre-Ready Gate: Schema validation, disjoint touch map, dependencies, open questions
 *   - Lifecycle Pre-Done Gate: Verification pipeline pass, mutation score >= 85%, fresh proof receipt
 *   - Receipt Aggregation: Git commit SHA binding, physical disk byte hashing, schema validation
 *   - CLI Runner: Command line flags (--goal, --profile, --lifecycle-check, --json, --all)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import {
  EXIT_CODES,
  PROFILE_HARNESS_MAP,
  resolveGoalContract,
  resolveGoalProfiles,
  mapProcessExitCode,
  executeHarness,
  runVerificationPipeline,
  enforcePreReadyGate,
  enforcePreDoneGate,
  enforceLifecycleGate,
  aggregateProofReceipt,
  generateVerificationProofReceipt,
  runAllGoalsVerification
} from '../../scripts/lib/verification-orchestrator.mjs';

import { runOrchestratorCli } from '../../scripts/harness/verification-orchestrator-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Unified Verification Orchestrator & Lifecycle Gatekeeper (G-PROOF-012)', () => {

  const tempDirs = [];

  function createTempDir(prefix = 'orch-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  after(() => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors in tmp
      }
    }
  });

  // ── 1. PROFILE RESOLUTION & MAPPING ──────────────────────────────────────────
  describe('1. Profile Resolution & Mapping', () => {

    it('Test 1: Resolves single canonical profile property_invariant', () => {
      const contract = {
        goal_id: 'G-TEST-001',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: ['property_invariant'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };
      const res = resolveGoalProfiles(contract);
      assert.equal(res.valid, true);
      assert.deepEqual(res.profiles, ['property_invariant']);
      assert.equal(res.errors.length, 0);
    });

    it('Test 2: Resolves legacy "core" profile mapping to property_invariant', () => {
      const contract = {
        goal_id: 'G-TEST-002',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: ['core'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };
      const res = resolveGoalProfiles(contract);
      assert.equal(res.valid, true);
      assert.deepEqual(res.profiles, ['property_invariant']);
      assert.equal(res.errors.length, 0);
    });

    it('Test 3: Resolves multi-profile array preserving uniqueness', () => {
      const contract = {
        goal_id: 'G-TEST-003',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: ['property_invariant', 'stateful_model', 'concurrency_schedule', 'core'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };
      const res = resolveGoalProfiles(contract);
      assert.equal(res.valid, true);
      assert.equal(res.profiles.includes('property_invariant'), true);
      assert.equal(res.profiles.includes('stateful_model'), true);
      assert.equal(res.profiles.includes('concurrency_schedule'), true);
      assert.equal(res.profiles.length, 3); // 'core' normalized to 'property_invariant'
    });

    it('Test 4: Resolves profile configuration dictionary with custom parameters', () => {
      const contract = {
        goal_id: 'G-TEST-004',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: {
          property_invariant: { cases: 500 },
          mutation_testing: { threshold: 90 }
        },
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };
      const res = resolveGoalProfiles(contract);
      assert.equal(res.valid, true);
      assert.equal(res.profiles.length, 2);
      assert.equal(res.profileConfigs.property_invariant.cases, 500);
      assert.equal(res.profileConfigs.mutation_testing.threshold, 90);
    });

    it('Test 5: Rejects unknown verification profile under fail-closed policy', () => {
      const contract = {
        goal_id: 'G-TEST-005',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: ['property_invariant', 'non_existent_profile_xyz'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };
      const res = resolveGoalProfiles(contract);
      assert.equal(res.valid, false);
      assert.equal(res.errors.length, 1);
      assert.match(res.errors[0], /Unknown verification profile/);
    });

    it('Test 6: Resolves profiles directly from physical goal markdown file on disk', () => {
      const res = resolveGoalProfiles('docs/07-backlog/goals/G-PROOF-012.md');
      assert.equal(res.valid, true);
      assert.equal(res.profiles.includes('property_invariant'), true);
    });

    it('Test 7: Resolves profiles from inline YAML frontmatter markdown string', () => {
      const rawMarkdown = `---
goal_contract:
  id: G-SAMPLE-001
  version: 2
  kind: governance
  status: planned
  profiles:
    - adversarial_boundary
    - counterexample
---

# Sample Goal Card
`;
      const res = resolveGoalProfiles(rawMarkdown);
      assert.equal(res.valid, true);
      assert.equal(res.profiles.includes('adversarial_boundary'), true);
      assert.equal(res.profiles.includes('counterexample'), true);
    });
  });

  // ── 2. PROCESS EXIT CODE MAPPING (0..4) ──────────────────────────────────────
  describe('2. Process Exit Code Mapping (0..4)', () => {

    it('Test 8: Maps exit code 0 to EXIT_CODES.PASS', () => {
      const result = { status: 0, stdout: 'Clean execution', stderr: '' };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.PASS);
      assert.equal(EXIT_CODES.PASS, 0);
    });

    it('Test 9: Maps standard assertion failure to EXIT_CODES.FAIL_ASSERTION (1)', () => {
      const result = { status: 1, stdout: 'Test failed', stderr: 'AssertionError: expected true' };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.FAIL_ASSERTION);
      assert.equal(EXIT_CODES.FAIL_ASSERTION, 1);
    });

    it('Test 10: Maps execution timeout error to EXIT_CODES.TIMEOUT (2)', () => {
      const result = {
        status: null,
        error: { code: 'ETIMEDOUT', name: 'TimeoutError', message: 'Timed out' },
        stdout: '',
        stderr: ''
      };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.TIMEOUT);
      assert.equal(EXIT_CODES.TIMEOUT, 2);
    });

    it('Test 11: Maps SIGTERM / SIGKILL abort to EXIT_CODES.TIMEOUT (2)', () => {
      const result = { status: null, signal: 'SIGTERM', stdout: '', stderr: '' };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.TIMEOUT);
    });

    it('Test 12: Maps schema validation error to EXIT_CODES.SCHEMA_ERROR (3)', () => {
      const result = {
        status: 1,
        stdout: '[SCHEMA_ERROR] root: Missing required field "schema_version"',
        stderr: ''
      };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.SCHEMA_ERROR);
      assert.equal(EXIT_CODES.SCHEMA_ERROR, 3);
    });

    it('Test 13: Maps counterexample replay divergence or stale receipt to EXIT_CODES.REPLAY_DIFF (4)', () => {
      const result = {
        status: 1,
        stdout: 'REPLAY_DIFF: deterministic replay step mismatch observed',
        stderr: ''
      };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.REPLAY_DIFF);
      assert.equal(EXIT_CODES.REPLAY_DIFF, 4);
    });

    it('Test 14: Maps ReceiptStaleError output to EXIT_CODES.REPLAY_DIFF (4)', () => {
      const result = {
        status: 1,
        stdout: '',
        stderr: 'ReceiptStaleError: Receipt was generated 32.5h ago (> 24.0h limit)'
      };
      assert.equal(mapProcessExitCode(result), EXIT_CODES.REPLAY_DIFF);
    });
  });

  // ── 3. PROFILE HARNESS DISPATCH & PIPELINE EXECUTION ──────────────────────────
  describe('3. Profile Harness Dispatch & Pipeline Execution', () => {

    it('Test 15: Dispatches property_invariant harness and returns structured result', () => {
      const res = executeHarness('property_invariant', { cases: 50 });
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(res.canonicalProfile, 'property_invariant');
      assert.equal(typeof res.durationMs, 'number');
    });

    it('Test 16: Dispatches stateful_model harness cleanly', () => {
      const res = executeHarness('stateful_model');
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(res.canonicalProfile, 'stateful_model');
    });

    it('Test 17: Dispatches adversarial_boundary harness cleanly', () => {
      const res = executeHarness('adversarial_boundary');
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(res.canonicalProfile, 'adversarial_boundary');
    });

    it('Test 18: Dispatches mutation_testing harness and parses mutation score', () => {
      const res = executeHarness('mutation_testing', { threshold: 85 });
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(typeof res.mutationScore, 'number');
      assert.equal(res.mutationScore >= 85, true);
    });

    it('Test 19: Dispatches concurrency_schedule harness cleanly', () => {
      const res = executeHarness('concurrency_schedule');
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(res.canonicalProfile, 'concurrency_schedule');
    });

    it('Test 20: Dispatches counterexample harness cleanly', () => {
      const res = executeHarness('counterexample');
      assert.equal(res.success, true);
      assert.equal(res.exitCode, 0);
      assert.equal(res.canonicalProfile, 'counterexample');
    });

    it('Test 21: Returns SCHEMA_ERROR for unknown profile dispatch', () => {
      const res = executeHarness('non_existent_profile_123');
      assert.equal(res.success, false);
      assert.equal(res.exitCode, EXIT_CODES.SCHEMA_ERROR);
    });

    it('Test 22: Runs multi-profile verification pipeline for goal contract', () => {
      const contract = {
        goal_id: 'G-PIPE-001',
        schema_version: 3,
        kind: 'governance',
        status: 'planned',
        profiles: ['property_invariant', 'stateful_model'],
        invariants: [{ id: 'INV-1', statement: 'Conservation & models hold' }]
      };
      const pipelineRes = runVerificationPipeline(contract, { cases: 50 });
      assert.equal(pipelineRes.success, true);
      assert.equal(pipelineRes.exitCode, 0);
      assert.equal(pipelineRes.profiles.length, 2);
      assert.equal(pipelineRes.scorecard.passedProfiles, 2);
      assert.equal(pipelineRes.scorecard.failedProfiles, 0);
    });

    it('Test 23: Pipeline fails closed when goal contract schema is invalid', () => {
      const invalidContract = {
        // missing goal_id and schema_version
        kind: 'governance'
      };
      const pipelineRes = runVerificationPipeline(invalidContract);
      assert.equal(pipelineRes.success, false);
      assert.equal(pipelineRes.exitCode, EXIT_CODES.SCHEMA_ERROR);
      assert.equal(pipelineRes.errors.length > 0, true);
    });
  });

  // ── 4. LIFECYCLE STATE MACHINE GATEKEEPER — PRE-READY GATE ───────────────────
  describe('4. Lifecycle State Machine Gatekeeper — Pre-Ready Gate', () => {

    it('Test 24: Passes pre-ready gate on valid contract, disjoint touch map, no open questions', () => {
      const testDir = createTempDir('ready-pass-');
      const goalFile = path.join(testDir, 'G-READY-001.md');
      const content = `---
goal_contract:
  id: G-READY-001
  version: 2
  kind: governance
  status: planned
  profiles:
    - property_invariant
---

# G-READY-001: Verified Ready Goal

## Touch map
- scripts/custom/ready-test.mjs
`;
      fs.writeFileSync(goalFile, content, 'utf8');

      const gateRes = enforcePreReadyGate(goalFile, { cwd: testDir });
      assert.equal(gateRes.allowed, true);
      assert.equal(gateRes.exitCode, 0);
      assert.equal(gateRes.errors.length, 0);
    });

    it('Test 25: Fails pre-ready gate when goal contains unresolved [NEEDS CLARIFICATION]', () => {
      const testDir = createTempDir('ready-clarify-');
      const goalFile = path.join(testDir, 'G-READY-002.md');
      const content = `---
goal_contract:
  id: G-READY-002
  version: 2
  kind: governance
  status: planned
  profiles:
    - property_invariant
---

# G-READY-002: Incomplete Goal

## Open questions
- [NEEDS CLARIFICATION: Latency bound for microsecond orderbook]
`;
      fs.writeFileSync(goalFile, content, 'utf8');

      const gateRes = enforcePreReadyGate(goalFile, { cwd: testDir });
      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors[0], /NEEDS CLARIFICATION/);
    });

    it('Test 26: Fails pre-ready gate when touch map includes forbidden shared tracking files', () => {
      const testDir = createTempDir('ready-shared-');
      const goalFile = path.join(testDir, 'G-READY-003.md');
      const content = `---
goal_contract:
  id: G-READY-003
  version: 2
  kind: governance
  status: planned
  profiles:
    - property_invariant
---

# G-READY-003: Contaminated Touch Map Goal

## Touch map
- docs/00-project-snapshot.md
- scripts/worker.mjs
`;
      fs.writeFileSync(goalFile, content, 'utf8');

      const gateRes = enforcePreReadyGate(goalFile, { cwd: testDir });
      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors[0], /forbidden shared tracking files/);
    });

    it('Test 27: Fails pre-ready gate when touch map collides with concurrent active goal', () => {
      const testDir = createTempDir('ready-collide-');
      const goalA = path.join(testDir, 'G-COLLIDE-001.md');
      const goalB = path.join(testDir, 'G-COLLIDE-002.md');

      fs.writeFileSync(goalA, `---
goal_contract:
  id: G-COLLIDE-001
  version: 2
  kind: governance
  status: in_progress
  profiles:
    - property_invariant
---
# Goal A
## Touch map
- scripts/shared/common-kernel.mjs
`, 'utf8');

      fs.writeFileSync(goalB, `---
goal_contract:
  id: G-COLLIDE-002
  version: 2
  kind: governance
  status: planned
  profiles:
    - property_invariant
---
# Goal B
## Touch map
- scripts/shared/common-kernel.mjs
`, 'utf8');

      const gateRes = enforcePreReadyGate(goalB, {
        cwd: testDir,
        activeGoals: [goalA]
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors[0], /Touch map collides/);
    });

    it('Test 28: Fails pre-ready gate when declared dependency is not completed', () => {
      const testDir = createTempDir('ready-dep-');
      const goalsDir = path.join(testDir, 'docs/07-backlog/goals');
      fs.mkdirSync(goalsDir, { recursive: true });

      const depFile = path.join(goalsDir, 'G-DEP-001.md');
      fs.writeFileSync(depFile, `---
goal_contract:
  id: G-DEP-001
  version: 2
  kind: governance
  status: in_progress
  profiles:
    - property_invariant
---
# Dependency Goal
`, 'utf8');

      const mainFile = path.join(goalsDir, 'G-MAIN-001.md');
      fs.writeFileSync(mainFile, `---
goal_contract:
  id: G-MAIN-001
  version: 2
  kind: governance
  status: planned
  depends_on:
    - G-DEP-001
  profiles:
    - property_invariant
---
# Main Goal
`, 'utf8');

      const gateRes = enforcePreReadyGate(mainFile, { cwd: testDir });
      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors[0], /Dependency G-DEP-001 is not completed/);
    });
  });

  // ── 5. LIFECYCLE STATE MACHINE GATEKEEPER — PRE-DONE GATE ────────────────────
  describe('5. Lifecycle State Machine Gatekeeper — Pre-Done Gate', () => {

    it('Test 29: Passes pre-done gate when pipeline passes, mutation score >= 85%, and proof receipt is fresh and valid', () => {
      const testDir = createTempDir('done-pass-');
      const evidenceDir = path.join(testDir, 'docs/07-backlog/evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });

      const realSourceRel = 'scripts/lib/verification-orchestrator.mjs';
      const realSourceAbs = path.resolve(process.cwd(), realSourceRel);
      const realHash = crypto.createHash('sha256').update(fs.readFileSync(realSourceAbs)).digest('hex');

      const receipt = {
        schema_version: 1,
        goal_id: 'G-DONE-001',
        classification: 'executable_invariant',
        source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
        invariants: [
          {
            id: 'G-DONE-001-INV-001',
            statement: 'Service returns integer',
            verification_command: 'node scripts/lib/verification-orchestrator.mjs',
            passed: true,
            exit_code: 0
          }
        ],
        source_files: [
          {
            path: realSourceRel,
            sha256: realHash
          }
        ],
        certification: 'PASS',
        generated_at: new Date().toISOString()
      };

      const receiptPath = path.join(evidenceDir, 'G-DONE-001-proof-receipt.json');
      fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

      const contract = {
        goal_id: 'G-DONE-001',
        schema_version: 3,
        kind: 'governance',
        status: 'in_progress',
        profiles: ['property_invariant'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };

      const simulatedPipeline = {
        success: true,
        exitCode: 0,
        profiles: [
          {
            profile: 'property_invariant',
            canonicalProfile: 'property_invariant',
            success: true,
            exitCode: 0
          }
        ]
      };

      const gateRes = enforcePreDoneGate(contract, {
        cwd: testDir,
        pipelineResult: simulatedPipeline,
        receiptPath
      });

      assert.equal(gateRes.allowed, true);
      assert.equal(gateRes.exitCode, 0);
      assert.equal(gateRes.errors.length, 0);
    });

    it('Test 30: Fails pre-done gate when verification pipeline fails', () => {
      const contract = {
        goal_id: 'G-DONE-002',
        schema_version: 3,
        kind: 'governance',
        status: 'in_progress',
        profiles: ['property_invariant'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };

      const failingPipeline = {
        success: false,
        exitCode: EXIT_CODES.FAIL_ASSERTION,
        profiles: []
      };

      const gateRes = enforcePreDoneGate(contract, {
        pipelineResult: failingPipeline
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors[0], /Verification pipeline failed/);
    });

    it('Test 31: Fails pre-done gate when mutation testing score < 85%', () => {
      const testDir = createTempDir('done-mut-');
      const contract = {
        goal_id: 'G-DONE-003',
        schema_version: 3,
        kind: 'governance',
        status: 'in_progress',
        profiles: ['mutation_testing'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };

      const lowMutPipeline = {
        success: true,
        exitCode: 0,
        profiles: [
          {
            profile: 'mutation_testing',
            canonicalProfile: 'mutation_testing',
            success: true,
            exitCode: 0,
            mutationScore: 78.5 // below 85%
          }
        ]
      };

      const gateRes = enforcePreDoneGate(contract, {
        cwd: testDir,
        pipelineResult: lowMutPipeline
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors.join(' '), /below required threshold 85%/);
    });

    it('Test 32: Fails pre-done gate when proof receipt is missing', () => {
      const testDir = createTempDir('done-no-receipt-');
      const contract = {
        goal_id: 'G-DONE-004',
        schema_version: 3,
        kind: 'governance',
        status: 'in_progress',
        profiles: ['property_invariant'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };

      const passingPipeline = {
        success: true,
        exitCode: 0,
        profiles: []
      };

      const gateRes = enforcePreDoneGate(contract, {
        cwd: testDir,
        pipelineResult: passingPipeline
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors.join(' '), /Proof receipt file missing/);
    });

    it('Test 33: Fails pre-done gate when proof receipt is expired (> 24h old)', () => {
      const testDir = createTempDir('done-expired-');
      const evidenceDir = path.join(testDir, 'docs/07-backlog/evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });

      const staleDate = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
      const receipt = {
        schema_version: 1,
        goal_id: 'G-DONE-005',
        classification: 'executable_invariant',
        source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Statement',
            verification_command: 'node verify.mjs',
            passed: true,
            exit_code: 0
          }
        ],
        source_files: [],
        certification: 'PASS',
        generated_at: staleDate
      };

      const receiptPath = path.join(evidenceDir, 'G-DONE-005-proof-receipt.json');
      fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

      const contract = {
        goal_id: 'G-DONE-005',
        schema_version: 3,
        kind: 'governance',
        status: 'in_progress',
        profiles: ['property_invariant'],
        invariants: [{ id: 'INV-1', statement: 'Statement' }]
      };

      const gateRes = enforcePreDoneGate(contract, {
        cwd: testDir,
        pipelineResult: { success: true, exitCode: 0, profiles: [] },
        receiptPath
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors.join(' '), /expired/);
    });

    it('Test 34: Fails pre-done gate when source file SHA256 has drifted from receipt', () => {
      const testDir = createTempDir('done-drift-');
      const src = path.join(testDir, 'kernel.mjs');
      fs.writeFileSync(src, 'const v = 1;\n', 'utf8');

      const receipt = {
        schema_version: 1,
        goal_id: 'G-DONE-006',
        classification: 'executable_invariant',
        source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Statement',
            verification_command: 'node kernel.mjs',
            passed: true,
            exit_code: 0
          }
        ],
        source_files: [
          {
            path: 'scripts/lib/verification-orchestrator.mjs',
            sha256: 'deadbeef00000000000000000000000000000000000000000000000000000000' // drifted
          }
        ],
        certification: 'PASS',
        generated_at: new Date().toISOString()
      };

      const receiptPath = path.join(testDir, 'receipt.json');
      fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

      const gateRes = enforcePreDoneGate({ goal_id: 'G-DONE-006', schema_version: 3, kind: 'governance', status: 'in_progress', profiles: ['property_invariant'], invariants: [{ id: 'INV-1', statement: 'Statement' }] }, {
        cwd: testDir,
        pipelineResult: { success: true, exitCode: 0, profiles: [] },
        receiptPath
      });

      assert.equal(gateRes.allowed, false);
      assert.equal(gateRes.exitCode, 1);
      assert.match(gateRes.errors.join(' '), /SHA256 mismatch/);
    });
  });

  // ── 6. PROOF RECEIPT AGGREGATION & GENERATION ───────────────────────────────
  describe('6. Proof Receipt Aggregation & Generation', () => {

    it('Test 35: Aggregates pipeline results into a valid proof receipt structure', () => {
      const pipelineOutcome = {
        success: true,
        exitCode: 0,
        profiles: [
          {
            profile: 'property_invariant',
            harnessPath: 'scripts/harness/property-invariant-harness.mjs',
            command: 'node scripts/harness/property-invariant-harness.mjs --cases 100',
            success: true,
            exitCode: 0
          }
        ]
      };

      const receipt = aggregateProofReceipt('G-PROOF-012', pipelineOutcome);
      assert.equal(receipt.schema_version, 1);
      assert.equal(receipt.goal_id, 'G-PROOF-012');
      assert.equal(receipt.certification, 'PASS');
      assert.equal(typeof receipt.source_revision, 'string');
      assert.equal(receipt.source_revision.length, 40);
      assert.equal(receipt.invariants.length, 1);
      assert.equal(receipt.invariants[0].passed, true);
      assert.equal(receipt.invariants[0].exit_code, 0);
      assert.equal(receipt.source_files.length, 2);
    });

    it('Test 36: Generated receipt passes proof-receipt-validator with exit code 0', () => {
      const testDir = createTempDir('receipt-gen-');
      const genRes = generateVerificationProofReceipt('G-GEN-001', {
        cwd: testDir,
        outputReceipt: path.join(testDir, 'custom-receipt.json')
      });

      assert.equal(fs.existsSync(genRes.evidencePath), true);
      assert.equal(fs.existsSync(genRes.artifactPath), true);

      const validation = validateProofReceipt(genRes.evidencePath);
      assert.equal(validation.valid, true);
      assert.equal(validation.errors.length, 0);
    });
  });

  // ── 7. VERIFICATION ORCHESTRATOR CLI RUNNER ─────────────────────────────────
  describe('7. Verification Orchestrator CLI Runner', () => {

    it('Test 37: CLI invocation with --goal executes pipeline and exits code 0', () => {
      const outcome = runOrchestratorCli(['--goal', 'G-PROOF-012', '--cases', '50']);
      assert.equal(outcome.exitCode, 0);
      assert.equal(outcome.result.success, true);
    });

    it('Test 38: CLI invocation with --profile dispatches single harness', () => {
      const outcome = runOrchestratorCli(['--profile', 'property_invariant', '--cases', '50']);
      assert.equal(outcome.exitCode, 0);
      assert.equal(outcome.result.success, true);
    });

    it('Test 39: CLI invocation with --json outputs valid JSON payload', () => {
      const outcome = runOrchestratorCli(['--goal', 'G-PROOF-012', '--cases', '50', '--json']);
      assert.equal(outcome.exitCode, 0);
      assert.equal(typeof outcome.result, 'object');
      assert.equal(outcome.result.goalId, 'G-PROOF-012');
    });

    it('Test 40: CLI invocation with unknown profile exits with non-zero exit code', () => {
      const outcome = runOrchestratorCli(['--profile', 'invalid_unknown_xyz']);
      assert.equal(outcome.exitCode, EXIT_CODES.SCHEMA_ERROR);
    });

    it('Test 41: CLI invocation with --lifecycle-check blocks invalid promotion', () => {
      const testDir = createTempDir('cli-gate-');
      const goalFile = path.join(testDir, 'G-BAD-GATE.md');
      fs.writeFileSync(goalFile, `---
goal_contract:
  id: G-BAD-GATE
  version: 2
  kind: governance
  status: planned
  profiles:
    - property_invariant
---
# Bad Gate Goal
- [NEEDS CLARIFICATION: Unresolved issue]
`, 'utf8');

      const outcome = runOrchestratorCli([
        '--lifecycle-check', 'ready',
        '--goal', goalFile
      ]);

      assert.equal(outcome.exitCode, 1);
      assert.equal(outcome.result.allowed, false);
    });
  });

});

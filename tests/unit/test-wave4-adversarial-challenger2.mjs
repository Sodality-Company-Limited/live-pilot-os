#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ ADVERSARIAL EMPIRICAL CHALLENGE SUITE: WAVE 4 (G-PROOF-009)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave4_2 (Empirical Challenger & Adversarial Verifier)
 * Target Goal: G-PROOF-009 (Epistemic Proof Classification & Abstraction Boundary Gate)
 * Target Modules:
 *   - scripts/lib/epistemic-classifier.mjs
 *   - scripts/harness/epistemic-classification-gate.mjs
 *
 * Invariants: Zero mocks, zero stubs, 100% concrete operational execution.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execSync } from 'node:child_process';

import {
  EPISTEMIC_TIERS,
  VALID_TIER_IDS,
  TIER_ALIAS_MAP,
  STUB_ABSTRACTION_RULES,
  TEST_RUNNER_COMMAND_PATTERNS,
  FORMAL_SOLVER_TOOLS,
  FORMAL_SOLVER_EXTENSIONS,
  normalizeTier,
  detectPseudoProof,
  classifyEvidence,
  auditAbstractionBoundaries,
  auditGoalContractEpistemics,
  generateEpistemicProofReceipt
} from '../../scripts/lib/epistemic-classifier.mjs';

import {
  parseArgs,
  runEpistemicGate
} from '../../scripts/harness/epistemic-classification-gate.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

const FIXTURES_DIR = path.resolve(process.cwd(), 'artifacts/adversarial-wave4-challenger2-fixtures');

before(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
});

after(() => {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
});

describe('⚔️ Adversarial Empirical Challenge: Wave 4 Goal G-PROOF-009', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PSEUDO-PROOF DETECTION ENGINE STRESS & EVASION PROBES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Pseudo-Proof Detection Engine Stress & Evasion Probes', () => {

    test('1.1 should reject all canonical unit and integration test runners claiming L1 formal proof', () => {
      const runnerCommands = [
        'node --test tests/unit/test-math.mjs',
        'npm test',
        'yarn test',
        'pnpm test',
        'bun test',
        'jest --runInBand',
        'mocha tests/**/*.spec.js',
        'vitest run',
        'pytest tests/',
        'cargo test --lib',
        'ava test.js',
        'tap test/*.js',
        'jasmine',
        'playwright test',
        'cypress run',
        'node test-something.mjs'
      ];

      for (const cmd of runnerCommands) {
        const claim = {
          claimed_tier: 'L1',
          verification_command: cmd,
          statement: 'Mathematical invariant proven by test suite execution'
        };
        const result = detectPseudoProof(claim);
        assert.strictEqual(
          result.isPseudoProof,
          true,
          `Expected runner command "${cmd}" claiming L1 to be flagged as PSEUDO_PROOF_DETECTED`
        );
        assert.strictEqual(result.recommendedTier, 'L2');
        assert.ok(
          result.reasons.some(r => r.includes('unit/integration test runner')),
          `Expected reason mentioning unit/integration test runner for "${cmd}"`
        );
      }
    });

    test('1.2 should reject randomized property-based harnesses claiming L1 without formal solver artifacts', () => {
      const propertyHarnesses = [
        'node scripts/harness/property-invariant-harness.mjs',
        'node scripts/lib/invariant-runner.mjs --iterations=10000',
        'node scripts/harness/mathematical-invariant-proof-harness.mjs'
      ];

      for (const cmd of propertyHarnesses) {
        const claim = {
          claimed_tier: 'L1',
          verification_command: cmd,
          statement: 'Monotonicity and conservation hold across 10,000 randomized iterations',
          artifacts: ['reports/fuzz-results.json']
        };
        const result = detectPseudoProof(claim);
        assert.strictEqual(
          result.isPseudoProof,
          true,
          `Expected property harness "${cmd}" without solver to be flagged as pseudo-proof`
        );
        assert.strictEqual(result.recommendedTier, 'L2');
        assert.ok(
          result.reasons.some(r => r.includes('zero formal solver artifacts')),
          `Expected reason citing missing formal solver artifacts for "${cmd}"`
        );
      }
    });

    test('1.3 should reject L1 claims when solver output returns SAT (counterexample found) and downgrade to L0', () => {
      const claim = {
        claimed_tier: 'L1',
        verification_command: 'z3 -smt2 proofs/safety.smt2',
        artifacts: ['proofs/safety.smt2'],
        solver_output: 'sat\n(model (define-fun bad_state () Bool true))'
      };

      const result = detectPseudoProof(claim);
      assert.strictEqual(result.isPseudoProof, true);
      assert.strictEqual(result.recommendedTier, 'L0');
      assert.ok(
        result.reasons.some(r => r.includes('SAT (counterexample discovered)')),
        'Expected reason citing counterexample discovered (SAT)'
      );
    });

    test('1.4 should reject incomplete or unknown solver outputs from qualifying as L1 in classifyEvidence', () => {
      const evidence = {
        claimed_tier: 'L1',
        verification_command: 'cvc5 proofs/contract.smt2',
        artifacts: ['proofs/contract.smt2'],
        solver_output: 'unknown\n(incomplete)'
      };

      const classification = classifyEvidence(evidence);
      assert.strictEqual(
        classification.verifiedTier,
        'L2',
        'Expected incomplete solver output without UNSAT to be downgraded from L1 to L2'
      );
      assert.strictEqual(classification.tierSatisfied, false);
      assert.strictEqual(classification.tierDowngraded, true);
    });

    test('1.5 should accept genuine formal solver proofs with verified UNSAT/QED tokens as L1', () => {
      const validL1Provers = [
        { tool: 'z3', ext: '.smt2', out: 'unsat\nproof validated' },
        { tool: 'cvc5', ext: '.smt2', out: 'unsat' },
        { tool: 'lean', ext: '.lean', out: 'theorem verified: qed' },
        { tool: 'coq', ext: '.v', out: 'Qed.\nProof completed.' }
      ];

      for (const p of validL1Provers) {
        const claim = {
          claimed_tier: 'L1',
          verification_command: `${p.tool} verification/spec${p.ext}`,
          artifacts: [`verification/spec${p.ext}`],
          solver_output: p.out
        };
        const result = detectPseudoProof(claim);
        assert.strictEqual(
          result.isPseudoProof,
          false,
          `Expected valid prover ${p.tool} with ${p.ext} to pass as genuine L1`
        );
        assert.strictEqual(result.recommendedTier, 'L1');
        assert.strictEqual(result.reasons.length, 0);

        const classification = classifyEvidence({
          claimed_tier: 'L1',
          verification_command: claim.verification_command,
          artifacts: claim.artifacts,
          solver_output: claim.solver_output
        });
        assert.strictEqual(classification.verifiedTier, 'L1');
        assert.strictEqual(classification.tierSatisfied, true);
        assert.strictEqual(classification.tierDowngraded, false);
      }
    });

    test('1.6 should reject synthetic or simulated execution data claiming L4 (Epistemic Demarcation Violation)', () => {
      const syntheticVariants = [
        { synthetic: true },
        { simulated: true },
        { statement: 'Synthetic latency telemetry across 500 simulated nodes' },
        { verification_command: 'node scripts/telemetry.mjs --synthetic' },
        { verification_command: 'node scripts/telemetry.mjs --simulate' }
      ];

      for (const variant of syntheticVariants) {
        const claim = {
          claimed_tier: 'L4',
          verification_command: variant.verification_command || 'node scripts/telemetry.mjs',
          statement: variant.statement || 'Operational latency trace',
          synthetic: variant.synthetic,
          simulated: variant.simulated,
          sample_count: 500
        };

        const result = detectPseudoProof(claim);
        assert.strictEqual(result.isPseudoProof, true);
        assert.ok(
          result.reasons.some(r => r.includes('Epistemic Demarcation Violation')),
          'Expected reason citing Epistemic Demarcation Violation'
        );
        assert.strictEqual(result.recommendedTier, 'L2');
      }
    });

    test('1.7 should verify genuine production telemetry qualifies as L4 when non-synthetic', () => {
      const claim = {
        claimed_tier: 'L4',
        statement: 'Production API Gateway P99 latency SLA verified from live cluster telemetry',
        synthetic: false,
        simulated: false
      };
      const pseudoCheck = detectPseudoProof(claim);
      assert.strictEqual(pseudoCheck.isPseudoProof, false);
      assert.strictEqual(pseudoCheck.recommendedTier, 'L4');

      const classification = classifyEvidence({
        claimed_tier: 'L4',
        telemetry_source: 'production',
        live_telemetry: true,
        synthetic: false,
        simulated: false
      });
      assert.strictEqual(classification.verifiedTier, 'L4');
      assert.strictEqual(classification.tierSatisfied, true);
      assert.strictEqual(classification.tierDowngraded, false);
    });

    test('1.8 should flag tierDowngraded=true and tierSatisfied=false on pseudo-proof evidence', () => {
      const ev = {
        claimed_tier: 'L1',
        verification_command: 'node --test tests/unit/test-crypto.mjs',
        statement: 'AES-256-GCM algebraic uniqueness invariant',
        passed: true,
        exit_code: 0
      };

      const result = classifyEvidence(ev);
      assert.strictEqual(result.verifiedTier, 'L2');
      assert.strictEqual(result.tierSatisfied, false);
      assert.strictEqual(result.tierDowngraded, true);
      assert.strictEqual(result.details.pseudoProofDetected, true);
      assert.strictEqual(result.details.recommendedTier, 'L2');
      assert.ok(result.findings.some(f => f.includes('unit/integration test runner')));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ABSTRACTION BOUNDARY DISCLOSURE BYPASS ATTEMPTS & ZERO-MOCK ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Abstraction Boundary Disclosure Bypass Attempts & Zero-Mock Enforcement', () => {

    test('2.1 should detect and reject undisclosed formal solver stubs (kani::stub, kani::unwind, kani::assume)', () => {
      const probes = [
        { code: 'kani::stub(external_network, real_network);', cat: 'solver_stub', expectedCount: 1 },
        { code: 'kani::unwind(10);', cat: 'solver_stub', expectedCount: 2 },
        { code: 'kani::assume(x < 100);', cat: 'solver_stub', expectedCount: 1 },
        { code: 'kani::stub(external_network, dummy_network);', cat: 'solver_stub', expectedCount: 2 }
      ];

      for (const p of probes) {
        const audit = auditAbstractionBoundaries({
          sourceCode: p.code,
          filePath: 'proofs/harness.rs'
        });
        assert.strictEqual(audit.compliant, false);
        assert.strictEqual(audit.detectedAbstractions.length, p.expectedCount);
        assert.strictEqual(audit.undisclosedAbstractions.length, p.expectedCount);
        assert.ok(audit.undisclosedAbstractions.some(u => u.category === p.cat));
      }
    });

    test('2.2 should detect and reject undisclosed test mock framework calls across popular libraries', () => {
      const frameworkMocks = [
        'const mockFn = createMock();',
        'const spy = jest.fn();',
        'jest.mock("./service.mjs");',
        'sinon.stub(database, "query");',
        'sinon.mock(server);',
        'handler.mockImplementation(() => 42);',
        'auth.mockReturnValue({ role: "admin" });',
        'const mockClient = MagicMock();'
      ];

      for (const code of frameworkMocks) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/connector.mjs'
        });
        assert.strictEqual(
          audit.compliant,
          false,
          `Expected mock framework call "${code}" to be flagged fail-closed`
        );
        assert.strictEqual(audit.undisclosedAbstractions[0].category, 'test_mock_framework');
      }
    });

    test('2.3 should detect and reject explicit mock/stub/fake/dummy variable and function identifiers', () => {
      const identifierStubs = [
        'const mock_user = { id: 101, name: "Alice" };',
        'let stub_repo = new Repository();',
        'const fake_clock = { now: () => 1000 };',
        'let dummy_payload = Buffer.from("xyz");'
      ];

      for (const code of identifierStubs) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/handler.mjs'
        });
        assert.strictEqual(
          audit.compliant,
          false,
          `Expected identifier stub "${code}" to be flagged fail-closed`
        );
        assert.strictEqual(audit.undisclosedAbstractions[0].category, 'identifier_stub');
      }
    });

    test('2.4 should detect and reject synthetic clock/timer manipulations without disclosure', () => {
      const clockProbes = [
        'clock.useFakeTimers();',
        'mockDate("2026-01-01T00:00:00Z");',
        'clock.tick(1500);'
      ];

      for (const code of clockProbes) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/scheduler.mjs'
        });
        assert.strictEqual(audit.compliant, false);
        assert.strictEqual(audit.undisclosedAbstractions[0].category, 'environment_clock');
      }
    });

    test('2.5 should detect and reject network interception libraries without disclosure', () => {
      const netProbes = [
        'nock("https://api.soda.local").get("/status").reply(200);',
        'global.mockFetch = () => Promise.resolve({ ok: true });',
        'fetchMock.get("/v1/balance", { balance: 100 });'
      ];

      for (const code of netProbes) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/client.mjs'
        });
        assert.strictEqual(audit.compliant, false);
        assert.strictEqual(audit.undisclosedAbstractions[0].category, 'environment_network');
      }
    });

    test('2.6 should detect and reject in-memory filesystem virtualizers without disclosure', () => {
      const fsProbes = [
        'mockFs({ "/etc/config": "port=8080" });',
        'const fs = require("mock-fs");',
        'import { memfs } from "memfs";'
      ];

      for (const code of fsProbes) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/storage.mjs'
        });
        assert.strictEqual(audit.compliant, false);
        assert.ok(
          audit.undisclosedAbstractions.some(u => u.category === 'environment_filesystem'),
          `Expected environment_filesystem detected in "${code}"`
        );
      }
    });

    test('2.7 should detect bounded loop unrolling and depth limits without disclosure', () => {
      const boundProbes = [
        'unwind(50);',
        'const loop_bound = 100;',
        'const max_depth = 12;',
        'assume_bounded(depth);'
      ];

      for (const code of boundProbes) {
        const audit = auditAbstractionBoundaries({
          sourceCode: code,
          filePath: 'src/checker.mjs'
        });
        assert.strictEqual(audit.compliant, false);
        assert.strictEqual(audit.undisclosedAbstractions[0].category, 'bounded_unwind');
      }
    });

    test('2.8 should enforce fail-closed rejection on partial disclosure (multiple stubs, single disclosure)', () => {
      const sourceCode = [
        'const mock_session = { token: "abc" };',
        'const stub_gateway = { authorize: () => true };',
        'clock.tick(500);'
      ].join('\n');

      // Only disclosing mock_session
      const audit = auditAbstractionBoundaries({
        sourceCode,
        filePath: 'src/session.mjs',
        disclosures: ['Disclosed mock_session for auth test']
      });

      assert.strictEqual(audit.compliant, false);
      assert.strictEqual(audit.detectedAbstractions.length, 3);
      assert.strictEqual(audit.disclosedCount, 1);
      assert.strictEqual(audit.undisclosedAbstractions.length, 2);
      assert.strictEqual(audit.undisclosedAbstractions[0].line, 2);
      assert.strictEqual(audit.undisclosedAbstractions[1].line, 3);
    });

    test('2.9 should pass cleanly when all abstractions are explicitly declared in disclosures manifest', () => {
      const sourceCode = [
        'const mock_session = { token: "abc" };',
        'const stub_gateway = { authorize: () => true };'
      ].join('\n');

      const audit = auditAbstractionBoundaries({
        sourceCode,
        filePath: 'src/session.mjs',
        disclosures: [
          'Declared mock_session model',
          'Declared stub_gateway port adapter'
        ]
      });

      assert.strictEqual(audit.compliant, true);
      assert.strictEqual(audit.detectedAbstractions.length, 2);
      assert.strictEqual(audit.disclosedCount, 2);
      assert.strictEqual(audit.undisclosedAbstractions.length, 0);
    });

    test('2.10 should ignore comments containing abstraction keywords and avoid false positives', () => {
      const sourceCode = [
        '// createMock() and kani::stub mentioned in explanatory comment',
        '/* mock_user and nock documentation */',
        '* JSDoc explaining loop_bound parameter',
        'export function pureCalculator(x, y) {',
        '  return x * y;',
        '}'
      ].join('\n');

      const audit = auditAbstractionBoundaries({
        sourceCode,
        filePath: 'src/pure.mjs'
      });

      assert.strictEqual(audit.compliant, true);
      assert.strictEqual(audit.detectedAbstractions.length, 0);
      assert.strictEqual(audit.undisclosedAbstractions.length, 0);
    });

    test('2.11 self-audit of detector files should report 0 detected abstractions due to safe token composition', () => {
      const classifierSource = fs.readFileSync('scripts/lib/epistemic-classifier.mjs', 'utf8');
      const classifierAudit = auditAbstractionBoundaries({
        sourceCode: classifierSource,
        filePath: 'scripts/lib/epistemic-classifier.mjs'
      });
      assert.strictEqual(classifierAudit.compliant, true);
      assert.strictEqual(classifierAudit.detectedAbstractions.length, 0);

      const gateSource = fs.readFileSync('scripts/harness/epistemic-classification-gate.mjs', 'utf8');
      const gateAudit = auditAbstractionBoundaries({
        sourceCode: gateSource,
        filePath: 'scripts/harness/epistemic-classification-gate.mjs'
      });
      assert.strictEqual(gateAudit.compliant, true);
      assert.strictEqual(gateAudit.detectedAbstractions.length, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TIER NORMALIZATION, BOUNDARY PROBES & MALFORMED INPUTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Tier Normalization, Boundary Probes & Malformed Inputs', () => {

    test('3.1 should normalize out-of-range positive tiers (L5, L6, L99, L100) fail-closed to L0', () => {
      const outOfRange = ['L5', 'L6', 'L10', 'L99', 'L100', 'l5', 'l9'];
      for (const t of outOfRange) {
        assert.strictEqual(
          normalizeTier(t),
          'L0',
          `Expected out-of-range tier "${t}" to normalize fail-closed to L0`
        );
      }
    });

    test('3.2 should normalize negative and signed tiers (L-1, L-2, -1, -99) fail-closed to L0', () => {
      const negativeTiers = ['L-1', 'L-2', '-1', '-99', 'l-1'];
      for (const t of negativeTiers) {
        assert.strictEqual(
          normalizeTier(t),
          'L0',
          `Expected negative tier "${t}" to normalize fail-closed to L0`
        );
      }
    });

    test('3.3 should normalize empty, whitespace, and newline strings fail-closed to L0', () => {
      const blankInputs = ['', '   ', '\t', '\n', '   \r\n   '];
      for (const b of blankInputs) {
        assert.strictEqual(normalizeTier(b), 'L0');
      }
    });

    test('3.4 should normalize non-string, nullish, and object types fail-closed to L0', () => {
      const malformed = [
        null,
        undefined,
        {},
        { tier: 'L1' },
        [],
        ['L2'],
        0,
        1,
        2,
        -1,
        NaN,
        Infinity,
        true,
        false
      ];

      for (const m of malformed) {
        assert.strictEqual(
          normalizeTier(m),
          'L0',
          `Expected type ${typeof m} value ${String(m)} to normalize fail-closed to L0`
        );
      }
    });

    test('3.5 should correctly normalize all canonical aliases with whitespace and casing variations', () => {
      const aliasMappings = [
        { input: 'formal_proof', expected: 'L1' },
        { input: 'FORMAL_PROOF', expected: 'L1' },
        { input: '  formal_proof  ', expected: 'L1' },
        { input: 'formal_invariant', expected: 'L1' },
        { input: 'formal', expected: 'L1' },
        { input: 'executable_invariant', expected: 'L2' },
        { input: 'EXECUTABLE_INVARIANT', expected: 'L2' },
        { input: 'model_check', expected: 'L2' },
        { input: 'executable_property', expected: 'L2' },
        { input: 'statistical_evidence', expected: 'L3' },
        { input: 'STATISTICAL_EVIDENCE', expected: 'L3' },
        { input: 'statistical_claim', expected: 'L3' },
        { input: 'property_based', expected: 'L3' },
        { input: 'production_evidence', expected: 'L4' },
        { input: 'PRODUCTION_EVIDENCE', expected: 'L4' },
        { input: 'operational_claim', expected: 'L4' },
        { input: 'telemetry', expected: 'L4' },
        { input: 'unverified', expected: 'L0' },
        { input: 'speculative', expected: 'L0' }
      ];

      for (const { input, expected } of aliasMappings) {
        assert.strictEqual(
          normalizeTier(input),
          expected,
          `Expected alias "${input}" to normalize to ${expected}`
        );
      }
    });

    test('3.6 should fail-closed when runEpistemicGate is invoked with --tier=L5 or invalid tier against target', () => {
      const receiptPath = 'docs/07-backlog/evidence/G-PROOF-009-proof-receipt.json';
      const outcome = runEpistemicGate({
        target: receiptPath,
        tier: 'L5'
      });

      assert.strictEqual(outcome.exitCode, 1);
      assert.strictEqual(outcome.valid, false);
      assert.ok(
        outcome.errors.some(e => e.includes('does not satisfy requested tier L5')),
        'Expected gate error citing mismatch for requested tier L5'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GOAL CONTRACT EPISTEMIC AUDITS & EVIDENCE ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Goal Contract Epistemic Audits & Evidence Alignment', () => {

    test('4.1 should pass cleanly on goal contract with declared disclosures and clean touch map', () => {
      const fixtureSource = path.join(FIXTURES_DIR, 'clean-service.js');
      fs.writeFileSync(fixtureSource, 'export function computeBalance(a, b) { return a - b; }\n');

      const fixtureGoal = path.join(FIXTURES_DIR, 'G-CLEAN-001.md');
      fs.writeFileSync(fixtureGoal, `---
goal_contract:
  id: G-CLEAN-001
  proof_level: L2
abstraction_disclosures:
  - "Pure arithmetic operations"
---
# G-CLEAN-001: Clean Goal
## Touch map
- ${path.relative(process.cwd(), fixtureSource)}
`);

      const audit = auditGoalContractEpistemics(fixtureGoal);
      assert.strictEqual(audit.valid, true);
      assert.strictEqual(audit.goalId, 'G-CLEAN-001');
      assert.strictEqual(audit.claimedTier, 'L2');
      assert.strictEqual(audit.abstractionAudit.compliant, true);
      assert.strictEqual(audit.errors.length, 0);
    });

    test('4.2 should fail closed with exit code 1 when a touch map file contains undisclosed stubs', () => {
      const dirtySource = path.join(FIXTURES_DIR, 'dirty-gateway.js');
      fs.writeFileSync(dirtySource, 'const mock_terminal = { send: () => true };\nexport default mock_terminal;\n');

      const dirtyGoal = path.join(FIXTURES_DIR, 'G-DIRTY-001.md');
      fs.writeFileSync(dirtyGoal, `---
goal_contract:
  id: G-DIRTY-001
  proof_level: L2
---
# G-DIRTY-001: Dirty Goal
## Touch map
- ${path.relative(process.cwd(), dirtySource)}
`);

      const outcome = runEpistemicGate({ target: dirtyGoal });
      assert.strictEqual(outcome.exitCode, 1);
      assert.strictEqual(outcome.valid, false);
      assert.ok(
        outcome.errors.some(e => e.includes('Undisclosed abstraction boundary') && e.includes('identifier_stub')),
        'Expected error reporting undisclosed abstraction boundary in touch map file'
      );
    });

    test('4.3 should return fail-closed validation on non-existent goal contract target', () => {
      const outcome = runEpistemicGate({ target: 'docs/07-backlog/goals/G-GHOST-404.md' });
      assert.strictEqual(outcome.exitCode, 1);
      assert.strictEqual(outcome.valid, false);
      assert.ok(outcome.errors[0].includes('Target file not found'));
    });

    test('4.4 active archived G-PROOF-009 goal contract audits 100% cleanly without warnings or errors', () => {
      const goalPath = 'docs/07-backlog/goals/_archived/G-PROOF-009.md';
      const outcome = runEpistemicGate({ target: goalPath });
      assert.strictEqual(outcome.exitCode, 0);
      assert.strictEqual(outcome.valid, true);
      assert.strictEqual(outcome.errors.length, 0);
      assert.strictEqual(outcome.result.stubAudit.compliant, true);
      assert.strictEqual(outcome.result.stubAudit.totalUndisclosed, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PROOF RECEIPT CRYPTOGRAPHIC BINDING & TAMPER RESISTANCE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Proof Receipt Cryptographic Binding & Tamper Resistance', () => {

    test('5.1 should bind receipt to active git HEAD commit hash (40-hex SHA)', () => {
      const receipt = generateEpistemicProofReceipt({
        goalId: 'G-PROOF-009',
        classification: 'executable_invariant',
        invariants: [
          {
            id: 'INV-TEST',
            statement: 'Test invariant',
            verification_command: 'node scripts/harness/epistemic-classification-gate.mjs'
          }
        ],
        sourceFiles: ['scripts/lib/epistemic-classifier.mjs']
      });

      assert.strictEqual(receipt.schema_version, 1);
      assert.strictEqual(receipt.certification, 'PASS');
      assert.match(receipt.source_revision, /^[0-9a-f]{40}$/i);
    });

    test('5.2 should bind exact physical disk SHA-256 byte hashes of source files', () => {
      const file1 = 'scripts/harness/epistemic-classification-gate.mjs';
      const file2 = 'scripts/lib/epistemic-classifier.mjs';

      const digest1 = crypto.createHash('sha256').update(fs.readFileSync(file1)).digest('hex');
      const digest2 = crypto.createHash('sha256').update(fs.readFileSync(file2)).digest('hex');

      const receipt = generateEpistemicProofReceipt({
        goalId: 'G-PROOF-009',
        classification: 'executable_invariant',
        invariants: [
          {
            id: 'INV-1',
            statement: 'Sha binding invariant',
            verification_command: 'node scripts/harness/epistemic-classification-gate.mjs'
          }
        ],
        sourceFiles: [file1, file2]
      });

      assert.strictEqual(receipt.source_files[0].path, file1);
      assert.strictEqual(receipt.source_files[0].sha256, digest1);
      assert.strictEqual(receipt.source_files[1].path, file2);
      assert.strictEqual(receipt.source_files[1].sha256, digest2);
    });

    test('5.3 should fail closed when proof receipt source file SHA-256 byte hash is tampered', () => {
      const officialReceipt = JSON.parse(
        fs.readFileSync('docs/07-backlog/evidence/G-PROOF-009-proof-receipt.json', 'utf8')
      );

      const tampered = JSON.parse(JSON.stringify(officialReceipt));
      tampered.source_files[0].sha256 = 'bad0000000000000000000000000000000000000000000000000000000000000';

      const validation = validateProofReceipt(tampered);
      assert.strictEqual(validation.valid, false);
      assert.ok(
        validation.errors.some(e => e.includes('SHA256 mismatch')),
        'Expected SHA256 mismatch error on tampered receipt'
      );
    });

    test('5.4 should fail closed when certification status is tampered away from PASS', () => {
      const officialReceipt = JSON.parse(
        fs.readFileSync('docs/07-backlog/evidence/G-PROOF-009-proof-receipt.json', 'utf8')
      );

      const tampered = JSON.parse(JSON.stringify(officialReceipt));
      tampered.certification = 'FAIL';

      const validation = validateProofReceipt(tampered);
      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.some(e => e.includes('certification must be "PASS"')));
    });

    test('5.5 should throw fail-closed errors when generateEpistemicProofReceipt receives invalid arguments', () => {
      // Missing goalId
      assert.throws(
        () => generateEpistemicProofReceipt({ invariants: [{ id: '1' }] }),
        /goalId is required/
      );

      // Empty invariants
      assert.throws(
        () => generateEpistemicProofReceipt({ goalId: 'G-1', invariants: [] }),
        /invariants must be a non-empty array/
      );

      // Non-existent source file
      assert.throws(
        () => generateEpistemicProofReceipt({
          goalId: 'G-1',
          invariants: [{ id: '1' }],
          sourceFiles: ['ghost-nonexistent-source.mjs']
        }),
        /Cannot hash missing source file/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CLI GATE RUNNER INTEGRATION & EXIT CODE INVARIANTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. CLI Gate Runner Integration & Exit Code Invariants', () => {

    test('6.1 should execute CLI runner via child_process and exit with code 0 on archived G-PROOF-009', () => {
      const res = spawnSync('node', [
        'scripts/harness/epistemic-classification-gate.mjs',
        '--json'
      ], { encoding: 'utf8' });

      assert.strictEqual(res.status, 0, `Expected exit status 0, got ${res.status}. Stderr: ${res.stderr}`);
      const output = JSON.parse(res.stdout);
      assert.strictEqual(output.exitCode, 0);
      assert.strictEqual(output.valid, true);
      assert.strictEqual(output.errors.length, 0);
    });

    test('6.2 should execute CLI runner on non-existent file and exit with code 1 fail-closed', () => {
      const res = spawnSync('node', [
        'scripts/harness/epistemic-classification-gate.mjs',
        '--target=non-existent-target.md'
      ], { encoding: 'utf8' });

      assert.strictEqual(res.status, 1);
      assert.ok(res.stdout.includes('Target file not found') || res.stdout.includes('GATE REJECT'));
    });

    test('6.3 should emit a verified proof receipt when --output-receipt is specified in CLI', () => {
      const tmpReceiptPath = path.join(FIXTURES_DIR, 'cli-emitted-receipt.json');
      const res = spawnSync('node', [
        'scripts/harness/epistemic-classification-gate.mjs',
        '--target=scripts/lib/epistemic-classifier.mjs',
        `--output-receipt=${tmpReceiptPath}`
      ], { encoding: 'utf8' });

      assert.strictEqual(res.status, 0);
      assert.ok(fs.existsSync(tmpReceiptPath), 'Expected emitted receipt to exist on disk');

      const receipt = JSON.parse(fs.readFileSync(tmpReceiptPath, 'utf8'));
      assert.strictEqual(receipt.goal_id, 'G-PROOF-009');
      assert.strictEqual(receipt.certification, 'PASS');

      const validation = validateProofReceipt(receipt);
      assert.strictEqual(validation.valid, true);
    });

    test('6.4 should correctly parse all supported command-line flags in parseArgs', () => {
      const args = [
        '--target=custom-target.md',
        '--tier=L3',
        '--audit-stubs',
        '--output-receipt=custom-out.json',
        '--json',
        '--verbose'
      ];
      const parsed = parseArgs(args);
      assert.strictEqual(parsed.target, 'custom-target.md');
      assert.strictEqual(parsed.tier, 'L3');
      assert.strictEqual(parsed.auditStubs, true);
      assert.strictEqual(parsed.outputReceipt, 'custom-out.json');
      assert.strictEqual(parsed.json, true);
      assert.strictEqual(parsed.verbose, true);
    });
  });

});

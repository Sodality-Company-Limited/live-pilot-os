import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DAVE_DECISION_TYPES,
  DAVE_REFERENCE_TYPES,
  DAVE_CANONICAL_STATES,
  DAVE_FSM_TRANSITIONS,
  DaveStateMachine,
  evaluateRoutingTruthTable,
  validateDaveDecision,
  createDaveReference,
  verifyDaveReference,
  formatReviewPacket,
  evaluateVisualFidelity,
  detectAndResolveConflicts,
  recordDaveTrajectory,
  exportDaveRlcdData
} from '../../scripts/lib/dave-engine.mjs';

describe('DAVE Core Engine Unit Test Suite', () => {
  const tmpDir = path.join(process.cwd(), 'artifacts/test-dave');

  it('1. should register and validate all 17 canonical decision types', () => {
    assert.equal(DAVE_DECISION_TYPES.length, 17);

    for (const type of DAVE_DECISION_TYPES) {
      const decision = {
        decision_id: `DAVE-${type.toUpperCase().slice(0, 4)}-0001`,
        decision_type: type,
        goal_id: 'G-TEST-001',
        decision: { summary: `Testing ${type}` },
        confidence: 0.95,
        risk: 'low',
        evidence: ['docs/03-architecture/design-tokens.md'],
        references: ['REF-0001'],
        assumptions: ['Testing invariant'],
        alternatives_rejected: ['Rejected alternative'],
        verification: ['test_verification'],
        human_action: 'none'
      };

      const res = validateDaveDecision(decision);
      assert.equal(res.valid, true, `Expected ${type} to be valid: ${res.errors.join(', ')}`);
      assert.equal(res.requiresHumanApproval, false);
    }
  });

  it('2. should enforce fail-closed validation on invalid or out-of-bounds confidence', () => {
    const invalidConfidences = [-0.1, 1.01, NaN, Infinity, -Infinity, '0.9', null, undefined];

    for (const badConf of invalidConfidences) {
      const dec = {
        decision_id: 'DAVE-UX-0001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-TEST-001',
        decision: { summary: 'Bad confidence test' },
        confidence: badConf,
        risk: 'low',
        evidence: ['doc.md'],
        references: []
      };

      const res = validateDaveDecision(dec);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('confidence')));
    }
  });

  it('3. should force human_action to approve when risk is high or confidence < 0.85', () => {
    const highRiskDec = {
      decision_id: 'DAVE-SEC-0001',
      decision_type: 'security',
      goal_id: 'G-SEC-001',
      decision: { summary: 'Modify auth boundaries' },
      confidence: 0.98,
      risk: 'high',
      evidence: ['security.md'],
      references: [],
      human_action: 'none' // Invalid: Must be approve for high-risk
    };

    const res1 = validateDaveDecision(highRiskDec);
    assert.equal(res1.valid, false);
    assert.equal(res1.requiresHumanApproval, true);
    assert.ok(res1.errors.some(e => e.includes('human_action MUST be \'approve\'')));

    const lowConfDec = {
      ...highRiskDec,
      risk: 'low',
      confidence: 0.75, // Sub-threshold (< 0.85)
      human_action: 'none'
    };

    const res2 = validateDaveDecision(lowConfDec);
    assert.equal(res2.valid, false);
    assert.equal(res2.requiresHumanApproval, true);
  });

  it('4. should create and verify content-addressed references with physical SHA-256 hashes', () => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const testFile = path.join(tmpDir, 'test-ref.txt');
    fs.writeFileSync(testFile, 'Hello DAVE Reference Evidence Grounding', 'utf8');

    const expectedHash = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(testFile)).digest('hex');

    const ref = createDaveReference({
      reference_id: 'REF-0042',
      type: 'text',
      purpose: 'unit_testing',
      uri: path.relative(process.cwd(), testFile),
      source: 'unit_test',
      authority: 'approved_reference'
    }, process.cwd());

    assert.equal(ref.reference_id, 'REF-0042');
    assert.equal(ref.content_hash, expectedHash);

    // Verify valid
    const verifyRes1 = verifyDaveReference(ref, process.cwd());
    assert.equal(verifyRes1.valid, true);

    // Corrupt file and assert hash mismatch
    fs.appendFileSync(testFile, ' [tampered bytes]');
    const verifyRes2 = verifyDaveReference(ref, process.cwd());
    assert.equal(verifyRes2.valid, false);
    assert.ok(verifyRes2.error.includes('Hash mismatch'));

    // Missing file check
    fs.unlinkSync(testFile);
    const verifyRes3 = verifyDaveReference(ref, process.cwd());
    assert.equal(verifyRes3.valid, false);
    assert.ok(verifyRes3.error.includes('missing on disk'));
  });

  it('5. should format clean Human-in-the-Loop review packet without chain-of-thought opacity', () => {
    const decision = {
      decision_id: 'DAVE-UX-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-WEB-001',
      decision: { summary: 'Implement two-column workspace layout' },
      confidence: 0.84,
      risk: 'medium',
      evidence: ['tokens.md'],
      references: ['REF-0001'],
      assumptions: ['1440x900 viewport'],
      alternatives_rejected: ['3-column fluid layout'],
      verification: ['visual-regression'],
      human_action: 'approve'
    };

    const references = [
      {
        reference_id: 'REF-0001',
        type: 'image',
        uri: 'dashboard.png',
        content_hash: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      }
    ];

    const packet = formatReviewPacket(decision, references);
    assert.ok(packet.includes('DAVE REVIEW PACKET: DAVE-UX-0001'));
    assert.ok(packet.includes('Calibrated Confidence: 0.8400'));
    assert.ok(packet.includes('DEFERRED TO HUMAN REVIEW'));
    assert.ok(packet.includes('[REF-0001] (image) dashboard.png'));
    assert.ok(packet.includes('1440x900 viewport'));
    assert.ok(packet.includes('3-column fluid layout'));
    assert.ok(packet.includes('[ ] 1. Approve as proposed'));
  });

  it('6. should evaluate bounded visual fidelity with exact pixel diffs and overflow checks', () => {
    const size = 1000;
    const ref = Buffer.alloc(size, 0x10);
    const implPass = Buffer.from(ref);
    implPass[0] = 0x25; // 1 diff out of 1000 = 0.0010 <= 0.0050 threshold

    const resPass = evaluateVisualFidelity(ref, implPass, { threshold: 0.0050 });
    assert.equal(resPass.passed, true);
    assert.equal(resPass.pixelDiffRatio, 0.001);

    const implFail = Buffer.from(ref);
    for (let i = 0; i < 20; i++) {
      implFail[i] = 0x80; // 20 diffs out of 1000 = 0.020 > 0.0050
    }
    const resFail = evaluateVisualFidelity(ref, implFail, { threshold: 0.0050 });
    assert.equal(resFail.passed, false);
    assert.equal(resFail.pixelDiffRatio, 0.02);

    // Overflow failure
    const resOverflow = evaluateVisualFidelity(ref, implPass, { overflowDetected: true });
    assert.equal(resOverflow.passed, false);
  });

  it('7. should detect and surface multi-expert cross-domain conflicts without silent averaging', () => {
    const ux = {
      decision_id: 'DAVE-UX-0001',
      decision_type: 'ux_ui_design',
      decision: { contrast_ratio: 3.2 } // Under-contrast
    };
    const a11y = {
      decision_id: 'DAVE-A11Y-0001',
      decision_type: 'accessibility',
      decision: { min_contrast_ratio: 4.5 } // WCAG 2.2 AA
    };

    const conflictRes = detectAndResolveConflicts([ux, a11y]);
    assert.equal(conflictRes.hasConflicts, true);
    assert.equal(conflictRes.requiresHumanReview, true);
    assert.ok(conflictRes.conflicts.some(c => c.summary.includes('WCAG ratio')));
  });

  it('8. should record decision trajectories and export scored RLCD training datasets', () => {
    const ledger = path.join(tmpDir, 'decisions.jsonl');
    const rlcdOut = path.join(tmpDir, 'rlcd_train.jsonl');

    if (fs.existsSync(ledger)) fs.unlinkSync(ledger);
    if (fs.existsSync(rlcdOut)) fs.unlinkSync(rlcdOut);

    // Record correct decision
    recordDaveTrajectory(ledger, {
      decision_id: 'DAVE-UX-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-WEB-001',
      confidence: 0.90,
      empirical_outcome: { correct: true },
      human_action: 'approve'
    });

    // Record overconfident incorrect decision (should incur 10x penalty)
    recordDaveTrajectory(ledger, {
      decision_id: 'DAVE-FE-0001',
      decision_type: 'frontend_implementation',
      goal_id: 'G-WEB-001',
      confidence: 0.95,
      empirical_outcome: { correct: false },
      human_action: 'reject'
    });

    const count = exportDaveRlcdData(ledger, rlcdOut);
    assert.equal(count, 2);

    const exportedLines = fs.readFileSync(rlcdOut, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(exportedLines.length, 2);

    // Correct decision has zero overconfidence penalty
    assert.equal(exportedLines[0].reward.overconfidence_penalty, 0.0);
    assert.ok(exportedLines[0].reward.net_reward > -0.2);

    // Overconfident error has massive 10x penalty: 0.95^2 * 10 = 9.025
    assert.ok(exportedLines[1].reward.overconfidence_penalty >= 9.0);
    assert.ok(exportedLines[1].reward.net_reward < -9.0);
  });

  it('9. should transition through all 11 canonical states in order without illegal bypasses', () => {
    assert.equal(DAVE_CANONICAL_STATES.length, 11);
    const fsm = new DaveStateMachine('INTENT_RECEIVED');
    assert.equal(fsm.getState(), 'INTENT_RECEIVED');

    // Expected transition sequence
    const sequence = [
      { trigger: 'context_assembled', expected: 'CONTEXT_COLLECTED' },
      { trigger: 'reference_hashes_validated', expected: 'REFERENCES_VERIFIED' },
      { trigger: 'moe_router_dispatched', expected: 'EXPERTS_SELECTED' },
      { trigger: 'domain_proposals_received', expected: 'DECISIONS_GENERATED' },
      { trigger: 'synthesis_evaluated', expected: 'CONFLICTS_RESOLVED' },
      { trigger: 'confidence_scored', expected: 'CONFIDENCE_CALIBRATED' },
      { trigger: 'policy_applied', expected: 'ROUTED' },
      { trigger: 'execution_authorized', expected: 'EXECUTED' },
      { trigger: 'harnesses_passed', expected: 'VERIFIED' },
      { trigger: 'rlcd_trajectory_recorded', expected: 'LEARNED' }
    ];

    for (const step of sequence) {
      assert.equal(fsm.canTransition(step.trigger), true);
      const nextState = fsm.transition(step.trigger);
      assert.equal(nextState, step.expected);
      assert.equal(fsm.getState(), step.expected);
    }

    assert.equal(fsm.isTerminal(), true);
    assert.equal(fsm.getHistory().length, 11);
  });

  it('10. should fail-closed and reject illegal or out-of-order FSM transitions', () => {
    const fsm = new DaveStateMachine('INTENT_RECEIVED');

    // Trying to skip directly to EXECUTED must fail closed
    assert.equal(fsm.canTransition('execution_authorized'), false);
    assert.throws(() => {
      fsm.transition('execution_authorized');
    }, /Illegal state transition/);

    // Initial state validation
    assert.throws(() => {
      new DaveStateMachine('INVALID_STATE');
    }, /Invalid initial state/);
  });

  it('11. should evaluate 4-way routing truth table according to safety specifications', () => {
    const cases = [
      { risk: 'normal', evidence: 'verified', confidence: 0.95, expected: 'proceed' },
      { risk: 'normal', evidence: 'verified', confidence: 0.70, expected: 'verify' },
      { risk: 'normal', evidence: 'unverified', confidence: 0.95, expected: 'verify' },
      { risk: 'normal', evidence: 'unverified', confidence: 0.50, expected: 'defer' },
      { risk: 'high', evidence: 'verified', confidence: 0.95, expected: 'human_review' },
      { risk: 'high', evidence: 'verified', confidence: 0.70, expected: 'defer' },
      { risk: 'high', evidence: 'unverified', confidence: 0.95, expected: 'defer' },
      { risk: 'high', evidence: 'unverified', confidence: 0.50, expected: 'defer' }
    ];

    for (const tc of cases) {
      const actual = evaluateRoutingTruthTable(tc);
      assert.equal(actual, tc.expected, `Routing mismatch for ${JSON.stringify(tc)}: got ${actual}, expected ${tc.expected}`);
    }
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DaveAutonomyRouter,
  ROUTING_ACTIONS,
  EXECUTION_PERMISSIONS,
  RISK_TIERS,
  routeDecision,
  evaluateRoutingTruthTable16
} from '../../scripts/lib/dave-autonomy-router.mjs';

test('G-DAVE-005: Scenario 1 - Low-risk high-confidence verified decision routes to proceed and is permitted', async (t) => {
  const router = new DaveAutonomyRouter();
  const decision = {
    decision_id: 'DAVE-ARCH-001',
    decision_type: 'game_architecture',
    risk: 'low',
    confidence: 0.95,
    evidenceVerified: true,
    evidence: [{ id: 'REF-001', verified: true }],
    conflicts: []
  };

  const result = router.route(decision);

  assert.equal(result.route, 'proceed', 'Route must be proceed for low-risk verified high-confidence decision');
  assert.equal(result.execution_permission, 'permitted', 'Execution permission must be permitted');
  assert.ok(typeof result.auth_token === 'string' && result.auth_token.length >= 32, 'Cryptographic auth token must be generated');
  assert.equal(result.verification_plan.length, 0, 'No verification barriers should remain for proceed');
  assert.equal(result.conflicts_detected, false, 'No conflicts detected');
});

test('G-DAVE-005: Scenario 2 - Medium-risk or low-confidence decisions route to verify with verification plan', async (t) => {
  const router = new DaveAutonomyRouter();

  // Medium risk, verified, high confidence
  const medDecision = {
    decision_id: 'DAVE-UI-002',
    decision_type: 'ux_ui_design',
    risk: 'medium',
    confidence: 0.90,
    evidenceVerified: true,
    evidence: [{ id: 'REF-002', verified: true }],
    conflicts: []
  };

  const medResult = router.route(medDecision);
  assert.equal(medResult.route, 'verify', 'Medium risk decision must route to verify');
  assert.equal(medResult.execution_permission, 'blocked_until_verified', 'Execution must be blocked until verified');
  assert.equal(medResult.auth_token, null, 'Auth token must not be issued when blocked');
  assert.ok(Array.isArray(medResult.verification_plan) && medResult.verification_plan.length > 0, 'Verification plan must be attached');
  assert.ok(medResult.verification_plan.some(p => p.command.includes('harness')), 'Verification plan must contain executable harness commands');

  // Low risk, verified, low confidence
  const lowConfDecision = {
    decision_id: 'DAVE-UI-003',
    decision_type: 'ux_ui_design',
    risk: 'low',
    confidence: 0.60,
    evidenceVerified: true,
    evidence: [{ id: 'REF-003', verified: true }],
    conflicts: []
  };

  const lowConfResult = router.route(lowConfDecision);
  assert.equal(lowConfResult.route, 'verify', 'Low confidence decision must route to verify');
  assert.equal(lowConfResult.execution_permission, 'blocked_until_verified', 'Must be blocked until verified');
  assert.equal(lowConfResult.auth_token, null);
});

test('G-DAVE-005: Scenario 3 - High-risk and critical unverified decisions route to defer with rejected permission', async (t) => {
  const router = new DaveAutonomyRouter();

  // High risk, unverified evidence, even with high confidence
  const highUnverified = {
    decision_id: 'DAVE-SEC-004',
    decision_type: 'security',
    risk: 'high',
    confidence: 0.99,
    evidenceVerified: false,
    evidence: [],
    conflicts: []
  };

  const highResult = router.route(highUnverified);
  assert.equal(highResult.route, 'defer', 'High-risk unverified decision must route to defer');
  assert.equal(highResult.execution_permission, 'rejected', 'Execution permission must be rejected');
  assert.equal(highResult.auth_token, null, 'Auth token must be null');

  // Critical risk, unverified evidence
  const criticalUnverified = {
    decision_id: 'DAVE-SEC-005',
    decision_type: 'security',
    risk: 'critical',
    confidence: 0.70,
    evidenceVerified: false,
    evidence: [],
    conflicts: []
  };

  const criticalResult = router.route(criticalUnverified);
  assert.equal(criticalResult.route, 'defer', 'Critical risk unverified decision must route to defer');
  assert.equal(criticalResult.execution_permission, 'rejected', 'Execution permission must be rejected');
  assert.equal(criticalResult.auth_token, null);
});

test('G-DAVE-005: Scenario 4 - Human review escalation for high-risk verified or conflicted decisions', async (t) => {
  const router = new DaveAutonomyRouter();

  // High risk, verified evidence, high confidence -> human_review
  const highVerified = {
    decision_id: 'DAVE-DEP-006',
    decision_type: 'deployment',
    risk: 'high',
    confidence: 0.96,
    evidenceVerified: true,
    evidence: [{ id: 'REF-006', verified: true }],
    conflicts: []
  };

  const highVerResult = router.route(highVerified);
  assert.equal(highVerResult.route, 'human_review', 'High-risk verified high-confidence decision must route to human_review');
  assert.equal(highVerResult.execution_permission, 'blocked_until_approved', 'Must be blocked until human approved');
  assert.equal(highVerResult.auth_token, null);

  // Critical risk, verified, high confidence -> human_review
  const critVerified = {
    decision_id: 'DAVE-DEP-007',
    decision_type: 'deployment',
    risk: 'critical',
    confidence: 0.98,
    evidenceVerified: true,
    evidence: [{ id: 'REF-007', verified: true }],
    conflicts: []
  };

  const critVerResult = router.route(critVerified);
  assert.equal(critVerResult.route, 'human_review', 'Critical verified high-confidence decision must route to human_review');
  assert.equal(critVerResult.execution_permission, 'blocked_until_approved');

  // Cross-domain conflict override: low risk + high confidence + verified, but CONFLICT present!
  const conflictedDecision = {
    decision_id: 'DAVE-UI-008',
    decision_type: 'ux_ui_design',
    risk: 'low',
    confidence: 0.99,
    evidenceVerified: true,
    evidence: [{ id: 'REF-008', verified: true }],
    conflicts: [
      { domains: ['ux_ui_design', 'accessibility'], summary: 'Contrast collision on button token' }
    ]
  };

  const conflictResult = router.route(conflictedDecision);
  assert.equal(conflictResult.route, 'human_review', 'Conflict MUST strictly override to human_review regardless of risk/confidence');
  assert.equal(conflictResult.execution_permission, 'blocked_until_approved', 'Permission MUST be blocked_until_approved');
  assert.equal(conflictResult.conflicts_detected, true);
  assert.equal(conflictResult.auth_token, null);
});

test('G-DAVE-005: Scenario 5 - Exhaustive 16/16 truth table permutations and autonomy safety invariant', async (t) => {
  const router = new DaveAutonomyRouter();
  const table = router.getTruthTable();

  assert.equal(table.length, 16, 'Truth table must contain exactly 16 exhaustive states');

  const expectedMatrix = [
    // low risk
    { risk: 'low', evidence: 'verified', confidence: 'high', expectedRoute: 'proceed', expectedPerm: 'permitted' },
    { risk: 'low', evidence: 'verified', confidence: 'low', expectedRoute: 'verify', expectedPerm: 'blocked_until_verified' },
    { risk: 'low', evidence: 'unverified', confidence: 'high', expectedRoute: 'verify', expectedPerm: 'blocked_until_verified' },
    { risk: 'low', evidence: 'unverified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' },

    // medium risk
    { risk: 'medium', evidence: 'verified', confidence: 'high', expectedRoute: 'verify', expectedPerm: 'blocked_until_verified' },
    { risk: 'medium', evidence: 'verified', confidence: 'low', expectedRoute: 'verify', expectedPerm: 'blocked_until_verified' },
    { risk: 'medium', evidence: 'unverified', confidence: 'high', expectedRoute: 'verify', expectedPerm: 'blocked_until_verified' },
    { risk: 'medium', evidence: 'unverified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' },

    // high risk
    { risk: 'high', evidence: 'verified', confidence: 'high', expectedRoute: 'human_review', expectedPerm: 'blocked_until_approved' },
    { risk: 'high', evidence: 'verified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' },
    { risk: 'high', evidence: 'unverified', confidence: 'high', expectedRoute: 'defer', expectedPerm: 'rejected' },
    { risk: 'high', evidence: 'unverified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' },

    // critical risk
    { risk: 'critical', evidence: 'verified', confidence: 'high', expectedRoute: 'human_review', expectedPerm: 'blocked_until_approved' },
    { risk: 'critical', evidence: 'verified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' },
    { risk: 'critical', evidence: 'unverified', confidence: 'high', expectedRoute: 'defer', expectedPerm: 'rejected' },
    { risk: 'critical', evidence: 'unverified', confidence: 'low', expectedRoute: 'defer', expectedPerm: 'rejected' }
  ];

  let proceedCount = 0;

  for (let i = 0; i < expectedMatrix.length; i++) {
    const exp = expectedMatrix[i];
    const decision = {
      decision_id: `DAVE-TEST-${i + 1}`,
      decision_type: 'backend_api',
      risk: exp.risk,
      confidence: exp.confidence === 'high' ? 0.95 : 0.50,
      evidenceVerified: exp.evidence === 'verified',
      conflicts: []
    };

    const res = router.route(decision);

    assert.equal(
      res.route,
      exp.expectedRoute,
      `State #${i + 1} (${exp.risk}, ${exp.evidence}, ${exp.confidence}) route mismatch: expected ${exp.expectedRoute}, got ${res.route}`
    );
    assert.equal(
      res.execution_permission,
      exp.expectedPerm,
      `State #${i + 1} (${exp.risk}, ${exp.evidence}, ${exp.confidence}) permission mismatch: expected ${exp.expectedPerm}, got ${res.execution_permission}`
    );

    // NON-NEGOTIABLE SAFETY INVARIANT:
    // execution_permission === 'permitted' IF AND ONLY IF route === 'proceed'
    if (res.route === 'proceed') {
      assert.equal(res.execution_permission, 'permitted', 'Proceed route must have permitted permission');
      proceedCount++;
    } else {
      assert.notEqual(res.execution_permission, 'permitted', `Non-proceed route (${res.route}) MUST NEVER have permitted permission`);
    }

    // High risk / critical unverified NEVER proceeds
    if ((exp.risk === 'high' || exp.risk === 'critical') && exp.evidence === 'unverified') {
      assert.notEqual(res.route, 'proceed', 'Unverified high/critical risk must NEVER route to proceed');
    }
  }

  // Exactly 1 state out of 16 produces 'proceed'
  assert.equal(proceedCount, 1, 'Exactly 1 out of 16 states may route to proceed');
});

test('G-DAVE-005: Edge Cases - Fail-closed on missing, corrupted, or unclassified inputs', async (t) => {
  const router = new DaveAutonomyRouter();

  // Null input
  const nullRes = router.route(null);
  assert.equal(nullRes.route, 'human_review', 'Null input must fail-closed to human_review');
  assert.equal(nullRes.execution_permission, 'blocked_until_approved');
  assert.equal(nullRes.auth_token, null);

  // Missing risk tier
  const missingRiskRes = router.route({ confidence: 0.99, evidenceVerified: true });
  assert.equal(missingRiskRes.route, 'human_review', 'Missing risk must fail-closed');
  assert.equal(missingRiskRes.execution_permission, 'blocked_until_approved');

  // Invalid confidence (NaN)
  const nanConfRes = router.route({ risk: 'low', confidence: NaN, evidenceVerified: true });
  assert.equal(nanConfRes.route, 'human_review', 'NaN confidence must fail-closed');
  assert.equal(nanConfRes.execution_permission, 'blocked_until_approved');

  // Out of bounds confidence (> 1.0)
  const oobConfRes = router.route({ risk: 'low', confidence: 1.5, evidenceVerified: true });
  assert.equal(oobConfRes.route, 'human_review', 'Out of bounds confidence must fail-closed');
  assert.equal(oobConfRes.execution_permission, 'blocked_until_approved');

  // Standalone function routeDecision
  const standaloneRes = routeDecision({
    decision_id: 'DAVE-FUNC-001',
    risk: 'low',
    confidence: 0.95,
    evidenceVerified: true,
    conflicts: []
  });
  assert.equal(standaloneRes.route, 'proceed');
  assert.equal(standaloneRes.execution_permission, 'permitted');
});

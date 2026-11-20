#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UX DECISION LIFECYCLE & DOUBT ROUTER VERIFICATION HARNESS (G-UX-002)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1)
 * Purpose: Automated verification harness for the 10-state UX decision lifecycle
 *          state machine and Doubt Router. Evaluates all 16 truth-table
 *          permutations of Confidence x Evidence x Risk x Safety, ensuring
 *          strict fail-closed behavior and proper scoring rule invariants.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import {
  UxDecisionLifecycleEngine,
  routeDoubt,
  CONFIDENCE_THRESHOLD,
  TERMINAL_STATES
} from '../lib/ux-decision-lifecycle.mjs';
import { createDefaultUxDecision } from '../lib/ux-decision-contract.mjs';

export function runUxLifecycleHarness() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🛡️ SODA OS UX DECISION LIFECYCLE & DOUBT ROUTER HARNESS (G-UX-002)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  // 1. Verify 10-State Linear Traversal
  console.log('▶ [Stage 1] Verifying 10-State Linear Transition Invariants...');
  try {
    const engine = new UxDecisionLifecycleEngine();
    engine.transition('input_received', { hasArtifacts: true });
    engine.transition('scene_graph_synthesized', { sceneGraphValid: true });
    engine.transition('a11y_evaluated', { wcagHardFail: false });
    engine.transition('heuristics_scored', { catastrophicLoss: false });
    engine.transition('proposals_gathered', { darkPatternDetected: false });
    engine.transition('collisions_resolved', { deadlock: false });
    engine.transition('autonomy_authorized', {
      confidence: 0.90,
      evidence_verified: true,
      risk_level: 'low',
      veto_asserted: false
    });

    if (engine.getState() === 'EMIT_DECISION' && engine.isTerminal()) {
      passed++;
      console.log('  ✅ 10-state forward lifecycle reached EMIT_DECISION cleanly');
    } else {
      failed++;
      console.error(`  ❌ Traversal ended in non-terminal state: ${engine.getState()}`);
    }
  } catch (err) {
    failed++;
    console.error(`  ❌ Forward traversal threw exception: ${err.message}`);
  }

  // 2. 16-Permutation Truth Table Battery
  console.log('\n▶ [Stage 2] Evaluating 16-State Autonomy Routing Truth Table...');
  const confidenceValues = [0.85, 0.65]; // [High (>=0.75), Low (<0.75)]
  const evidenceValues = [true, false]; // [Verified, Unverified]
  const riskValues = ['low', 'high']; // [Low/Med, High/Crit]
  const darkPatternValues = [false, true]; // [Clean, Dark Pattern]

  let tableIndex = 1;
  let proceedCount = 0;
  let deferCount = 0;
  let rejectCount = 0;

  for (const c of confidenceValues) {
    for (const ev of evidenceValues) {
      for (const r of riskValues) {
        for (const dp of darkPatternValues) {
          const outcome = routeDoubt({
            confidence: c,
            confidence_calibrated: true,
            evidence_verified: ev,
            risk_level: r,
            dark_pattern_detected: dp
          });

          // Invariant Check
          let expectedRoute;
          if (dp === true) {
            expectedRoute = 'REJECT_AS_UNSAFE';
          } else if (c < CONFIDENCE_THRESHOLD || ev === false || r === 'high') {
            expectedRoute = 'DEFER';
          } else {
            expectedRoute = 'EMIT_DECISION';
          }

          if (outcome.route === expectedRoute) {
            passed++;
            if (outcome.route === 'EMIT_DECISION') proceedCount++;
            if (outcome.route === 'DEFER') deferCount++;
            if (outcome.route === 'REJECT_AS_UNSAFE') rejectCount++;
            console.log(`  ✅ Permutation #${String(tableIndex).padStart(2, '0')}: [C=${c.toFixed(2)}, EV=${ev}, R=${r.padEnd(4)}, DP=${dp}] -> ${outcome.route}`);
          } else {
            failed++;
            console.error(`  ❌ Permutation #${String(tableIndex).padStart(2, '0')}: Expected ${expectedRoute}, got ${outcome.route}`);
          }
          tableIndex++;
        }
      }
    }
  }

  // Truth Table Invariant Assertions
  console.log('\n▶ [Stage 3] Invariant Ratio Verification...');
  if (proceedCount === 1) {
    passed++;
    console.log(`  ✅ Exactly 1/16 permutations authorized autonomous emission (P(proceed) = 1/16 = 6.25%)`);
  } else {
    failed++;
    console.error(`  ❌ Unexpected proceed count: ${proceedCount} (expected exactly 1)`);
  }

  if (rejectCount === 8) {
    passed++;
    console.log(`  ✅ Exactly 8/16 permutations routed fail-closed to REJECT_AS_UNSAFE on dark patterns`);
  } else {
    failed++;
    console.error(`  ❌ Unexpected reject count: ${rejectCount} (expected 8)`);
  }

  if (deferCount === 7) {
    passed++;
    console.log(`  ✅ Exactly 7/16 permutations routed to DEFER on low confidence, unverified evidence, or high risk`);
  } else {
    failed++;
    console.error(`  ❌ Unexpected defer count: ${deferCount} (expected 7)`);
  }

  // 3. Traversal Rejection Tests (Terminal State Immobility)
  console.log('\n▶ [Stage 4] Terminal State Non-Exit Guarantee...');
  for (const tState of TERMINAL_STATES) {
    try {
      const eng = new UxDecisionLifecycleEngine(tState);
      eng.transition('input_received');
      failed++;
      console.error(`  ❌ Invariant breach: Terminal state ${tState} allowed transition!`);
    } catch (err) {
      passed++;
      console.log(`  ✅ Terminal state ${tState} strictly rejected subsequent transitions fail-closed`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Lifecycle Harness Summary: ${passed} Passed, ${failed} Failed`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  return failed === 0;
}

const isDirectScript = process.argv[1] && process.argv[1].endsWith('ux-lifecycle-harness.mjs');
if (isDirectScript) {
  const success = runUxLifecycleHarness();
  process.exit(success ? 0 : 1);
}

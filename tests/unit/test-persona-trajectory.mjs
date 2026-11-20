/**
 * Unit Test Suite for Stage 4 12-Persona Multi-Agent Trajectories.
 * Verifies deliberation traces, token budgeting, collision detection,
 * and 4-tier priority hierarchy precedence resolutions.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonaTrajectory,
  generatePersonaTrajectories,
  ALL_12_PERSONAS,
  TERMINAL_OUTCOMES
} from '../../scripts/lib/persona-trajectory-builder.mjs';

test('PersonaTrajectories: Single trajectory structure and token accounting', () => {
  const traj = buildPersonaTrajectory(0);
  assert.equal(traj.trajectory_id, 'TRAJ-000001');
  assert.ok(traj.participating_personas.length >= 6);
  assert.ok(traj.tokens_consumed > 0);
  assert.equal(traj.max_token_budget, 3000);
  assert.ok(traj.tokens_consumed <= 3000);
  assert.ok(traj.state_transitions.length >= 5);
  assert.equal(typeof traj.sha256_digest, 'string');
  assert.equal(traj.sha256_digest.length, 64);
});

test('PersonaTrajectories: Precedence resolution and veto fail-closed behavior', () => {
  // Index 9 is configured as REJECT_AS_UNSAFE veto case
  const rejectTraj = buildPersonaTrajectory(9);
  assert.equal(rejectTraj.final_state, TERMINAL_OUTCOMES.REJECT_AS_UNSAFE);
  assert.ok(rejectTraj.collisions_detected_count >= 1);
  assert.ok(rejectTraj.resolution_rationale.includes('Tier 1 Ethics'));
  assert.ok(rejectTraj.participating_personas.includes('dark_pattern_ethics_watchdog'));
  assert.ok(rejectTraj.proposals.some(p => p.persona_id === 'dark_pattern_ethics_watchdog' && p.vote === 'veto'));

  // Index 8 is configured as DEFER case
  const deferTraj = buildPersonaTrajectory(8);
  assert.equal(deferTraj.final_state, TERMINAL_OUTCOMES.DEFER);
  assert.ok(deferTraj.calibrated_confidence < 0.75);

  // Index 0 is configured as EMIT_DECISION
  const emitTraj = buildPersonaTrajectory(0);
  assert.equal(emitTraj.final_state, TERMINAL_OUTCOMES.EMIT_DECISION);
  assert.ok(emitTraj.calibrated_confidence >= 0.75);
});

test('PersonaTrajectories: All 12 personas participate across generated subset', () => {
  const result = generatePersonaTrajectories({
    total_trajectories: 30,
    write_files: false,
    seed: 42
  });

  const participatingSet = new Set();
  for (const t of result.trajectories) {
    for (const p of t.participating_personas) {
      participatingSet.add(p);
    }
  }

  for (const expectedPersona of ALL_12_PERSONAS) {
    assert.ok(participatingSet.has(expectedPersona), `Persona ${expectedPersona} must participate in traces`);
  }
});

test('PersonaTrajectories: Strict <= 3000 token ceiling across all 2,500 trajectories', () => {
  const result = generatePersonaTrajectories({ total_trajectories: 2500, write_files: false, seed: 20261014 });
  for (const t of result.trajectories) {
    assert.ok(t.tokens_consumed > 0, `Trace ${t.trajectory_id} tokens_consumed must be > 0`);
    assert.ok(t.tokens_consumed <= 3000, `Trace ${t.trajectory_id} tokens_consumed ${t.tokens_consumed} exceeds 3000 ceiling`);
    assert.equal(t.max_token_budget, 3000, `Trace ${t.trajectory_id} max_token_budget must be 3000`);
  }
});

test('PersonaTrajectories: Zero ghost collisions across all generated trajectories', () => {
  const result = generatePersonaTrajectories({ total_trajectories: 2500, write_files: false, seed: 20261014 });
  for (const t of result.trajectories) {
    for (const c of t.collisions) {
      assert.ok(
        t.participating_personas.includes(c.persona_a),
        `Trace ${t.trajectory_id}: collision persona_a ${c.persona_a} must be in participating_personas`
      );
      assert.ok(
        t.participating_personas.includes(c.persona_b),
        `Trace ${t.trajectory_id}: collision persona_b ${c.persona_b} must be in participating_personas`
      );
    }
  }
});

test('PersonaTrajectories: All REJECT_AS_UNSAFE traces contain genuine ethics veto', () => {
  const result = generatePersonaTrajectories({ total_trajectories: 2500, write_files: false, seed: 20261014 });
  for (const t of result.trajectories) {
    if (t.final_state === TERMINAL_OUTCOMES.REJECT_AS_UNSAFE) {
      assert.ok(
        t.participating_personas.includes('dark_pattern_ethics_watchdog'),
        `Trace ${t.trajectory_id} REJECT_AS_UNSAFE must include dark_pattern_ethics_watchdog`
      );
      const watchdogProposal = t.proposals.find(p => p.persona_id === 'dark_pattern_ethics_watchdog');
      assert.ok(watchdogProposal, `Trace ${t.trajectory_id} must have watchdog proposal`);
      assert.equal(watchdogProposal.vote, 'veto', `Watchdog proposal must have vote: 'veto'`);
    }
  }
});

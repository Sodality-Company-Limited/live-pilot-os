/**
 * Profile-Driven Evidence Matrix Resolver
 * Dynamically resolves required evidence gates from declared goal profiles and kind.
 */

export const PROFILE_EVIDENCE_MAP = {
  formal_verification: [
    'cryptographic_proof_receipt',
    'property_invariant_suite',
    'smt_z3_verification'
  ],
  proof_receipt: [
    'cryptographic_proof_receipt'
  ],
  dave_platform: [
    'state_machine_transition_trace',
    'deterministic_replay_digest'
  ],
  dave_exact_design: [
    'pixel_fidelity_diff_ratio',
    'viewport_constraint_trace'
  ],
  core: [
    'unit_integration_test_green',
    'goal_conformance_zero_deviation'
  ]
};

export function resolveRequiredEvidence(profiles = [], kind = 'feature') {
  const profileList = Array.isArray(profiles) ? profiles : [];
  const requiredGates = new Set();

  // Universal base requirement for all goals
  requiredGates.add('unit_integration_test_green');
  requiredGates.add('goal_conformance_zero_deviation');

  for (const prof of profileList) {
    const gates = PROFILE_EVIDENCE_MAP[prof];
    if (gates) {
      for (const g of gates) requiredGates.add(g);
    }
  }

  // Pre-execution design is required for active coding kinds
  if (['feature', 'api', 'refactor', 'bugfix'].includes(kind.toLowerCase())) {
    requiredGates.add('pre_execution_design_spec');
  }

  return {
    profiles: profileList,
    kind,
    requiredEvidenceCount: requiredGates.size,
    requiredGates: Array.from(requiredGates)
  };
}

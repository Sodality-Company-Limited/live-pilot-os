/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS FORMAL VERIFICATION GOAL CONTRACT SCHEMA & PROFILE VALIDATOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Formal Verification & Epistemic Assurance (Goal Contract v3)
 * Purpose: Native JavaScript schema validator and profile verification engine
 *          with zero external dependencies. Validates universal goal contracts,
 *          fail-closed invariants, epistemic proof levels, and 7 verification profiles.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Canonical Schema Version
 */
export const SCHEMA_VERSION = 3;

/**
 * Valid Epistemic Proof Levels:
 * L0 - Informal / Untracked assertion
 * L1 - Formal proof / Mathematical theorem
 * L2 - Executable property invariant / Generative fuzzing
 * L3 - Statistical evidence / Empirical confidence intervals
 * L4 - Production telemetry / Operational observation
 */
export const PROOF_LEVELS = Object.freeze(['L0', 'L1', 'L2', 'L3', 'L4']);

/**
 * The 7 Recognized Verification Profiles
 */
export const GOAL_PROFILES = Object.freeze([
  'property_invariant',
  'stateful_model',
  'adversarial_boundary',
  'mutation_testing',
  'epistemic_classification',
  'counterexample',
  'concurrency_schedule'
]);

/**
 * Canonical Invariant Classes
 */
export const INVARIANT_KINDS = Object.freeze([
  'conservation',
  'monotonicity',
  'idempotency',
  'boundedness',
  'termination',
  'reachability',
  'commutativity',
  'associativity',
  'distributivity',
  'safety',
  'liveness',
  'invariant',
  'solvency',
  'non_negativity',
  'state_machine',
  'reversibility',
  'aliasing_freedom',
  'mutual_exclusion',
  'absence_of_deadlock',
  'absence_of_data_races',
  'memory_safety'
]);

/**
 * Canonical Algebraic Laws for Property Testing
 */
export const CANONICAL_LAWS = Object.freeze([
  'conservation',
  'monotonicity',
  'idempotency',
  'boundedness',
  'termination',
  'commutativity',
  'associativity',
  'distributivity',
  'reversibility',
  'solvency',
  'non_negativity',
  'aliasing_freedom',
  'mutual_exclusion'
]);

/**
 * The 6 Operational Domains of Mathematical Proven Governance & Formal Verification
 */
export const MATHEMATICAL_DOMAINS = Object.freeze([
  'invariants_and_system_laws',
  'formal_verification_and_solvers',
  'harness_engineering',
  'adversarial_modeling',
  'concurrency_and_memory_models',
  'testing_paradigms_and_tooling'
]);

/**
 * Canonical Default Preset for Mathematical Proven Governance (6 Operational Domains).
 * Enables modular goal templates and cards to declare a lean preset reference
 * while guaranteeing full formal verification contracts.
 */
export const CANONICAL_MATHEMATICAL_PROVEN_GOVERNANCE = Object.freeze({
  preset: 'standard_six_domains',
  specification: 'docs/03-architecture/specs/formal-verification.md',
  invariants_and_system_laws: Object.freeze({
    system_invariants: Object.freeze([]),
    conservation_laws: Object.freeze([]),
    monotonicity_invariants: Object.freeze([]),
    state_machine_invariants: Object.freeze([]),
    idempotency_and_reversibility: Object.freeze([]),
    solvency_and_non_negativity: Object.freeze([])
  }),
  formal_verification_and_solvers: Object.freeze({
    deductive_proof: 'disabled',
    smt_sat_solvers: Object.freeze([]),
    bounded_model_checking: Object.freeze({
      kani_verifier: false,
      loop_unwinding_depth: 10
    }),
    symbolic_execution: 'disabled',
    counterexample_trace_capture: true
  }),
  harness_engineering: Object.freeze({
    verification_harness_path: '',
    symbolic_allocation: Object.freeze([]),
    preconditions: Object.freeze([]),
    stubbing_models: Object.freeze([]),
    shadow_reference_model: '',
    input_shrinking: true
  }),
  adversarial_modeling: Object.freeze({
    adversarial_suites: Object.freeze([]),
    aliasing_collision_checks: true,
    arithmetic_extremes: Object.freeze(['0', '1', 'MAX-1', 'MAX', 'div_by_zero']),
    precision_dust_exploitation_defense: true,
    out_of_order_replay_defense: true,
    atomicity_rollback_guarantees: true
  }),
  concurrency_and_memory_models: Object.freeze({
    aba_mitigation: 'tagged_versioned_pointers',
    compare_and_swap_cas: true,
    use_after_free_uaf_prevention: 'linear_affine_types',
    mutual_exclusion: true,
    memory_orderings: Object.freeze(['Acquire', 'Release', 'Relaxed']),
    schedule_sequentialization: true
  }),
  testing_paradigms_and_tooling: Object.freeze({
    property_based_testing: Object.freeze({
      engine: 'proptest',
      iterations: 10000
    }),
    design_by_contract: Object.freeze({
      preconditions: true,
      postconditions: true,
      invariants: true
    }),
    stateful_model_based_testing: true,
    mutation_testing: Object.freeze({
      tool: 'cargo-mutants',
      min_kill_threshold: 85
    }),
    code_coverage: Object.freeze({
      mc_dc_required: true,
      branch_threshold: 95
    })
  })
});

/**
 * Deep merge helper for goal contract objects without external dependencies.
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const result = Array.isArray(target) ? [...target] : { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = deepMerge(result[key] || {}, val);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Detailed Profile Definitions and Rules
 */
export const PROFILE_DEFINITIONS = Object.freeze({
  property_invariant: {
    name: 'property_invariant',
    description: 'Generative property-based testing and algebraic invariant verification',
    requiredFields: ['generators', 'iterations', 'laws', 'shrinking'],
    minIterations: 10000,
    canonicalLaws: CANONICAL_LAWS
  },
  stateful_model: {
    name: 'stateful_model',
    description: 'State machine model checking and lockstep transition equivalence',
    requiredFields: ['model_ref', 'commands', 'lockstep', 'trace_invariants']
  },
  adversarial_boundary: {
    name: 'adversarial_boundary',
    description: 'Boundary conditions, extremal values, and malicious payloads',
    requiredFields: ['extremes', 'types', 'zero_tolerance', 'payload_vectors']
  },
  mutation_testing: {
    name: 'mutation_testing',
    description: 'Synthetic defect injection and test oracle strength verification',
    requiredFields: ['mutation_operators', 'kill_threshold', 'timeout_ms'],
    minKillThreshold: 85
  },
  epistemic_classification: {
    name: 'epistemic_classification',
    description: 'Verification claims, explicit assumptions, and abstraction boundaries',
    requiredFields: ['claimed_level', 'assumptions', 'abstraction_disclosures']
  },
  counterexample: {
    name: 'counterexample',
    description: 'Deterministic minimizer, PRNG seed reproduction, and structured trace capture',
    requiredFields: ['minimizer_enabled', 'seed', 'schema_format']
  },
  concurrency_schedule: {
    name: 'concurrency_schedule',
    description: 'Race condition detection, thread interleavings, and distributed fencing',
    requiredFields: ['interleavings', 'races_tested', 'fencing_token'],
    minInterleavings: 1
  }
});

/**
 * Standard Error Codes
 */
export const ERROR_CODES = Object.freeze({
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_TYPE: 'INVALID_FIELD_TYPE',
  INVALID_PROOF_LEVEL: 'INVALID_PROOF_LEVEL',
  UNKNOWN_PROFILE: 'UNKNOWN_PROFILE',
  PROFILE_VALIDATION_ERROR: 'PROFILE_VALIDATION_ERROR',
  INVALID_INVARIANTS: 'INVALID_INVARIANTS',
  INVALID_ITERATIONS: 'INVALID_ITERATIONS',
  INVALID_KILL_THRESHOLD: 'INVALID_KILL_THRESHOLD',
  INVALID_FAIL_CLOSED: 'INVALID_FAIL_CLOSED',
  INVALID_GOAL_ID: 'INVALID_GOAL_ID',
  PARSE_ERROR: 'PARSE_ERROR'
});

/**
 * Canonical Goal ID pattern (Soda OS standard)
 */
export const GOAL_ID_PATTERN = /^(G-[A-Z0-9]+-[0-9]{3}|G-[0-9]{3}|G-xxx)$/;

/**
 * Validates a single profile configuration against its profile schema constraints.
 *
 * @param {string} profileName
 * @param {object} config
 * @returns {{ valid: boolean, errors: string[], details: Array<{ code: string, path: string, message: string }> }}
 */
export function validateProfile(profileName, config) {
  const errors = [];
  const details = [];

  const addError = (code, path, message) => {
    errors.push(`[${code}] ${path}: ${message}`);
    details.push({ code, path, message });
  };

  if (!GOAL_PROFILES.includes(profileName)) {
    addError(
      ERROR_CODES.UNKNOWN_PROFILE,
      `profiles.${profileName}`,
      `Unknown verification profile "${profileName}". Recognized profiles: ${GOAL_PROFILES.join(', ')}`
    );
    return { valid: false, errors, details };
  }

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    addError(
      ERROR_CODES.SCHEMA_VALIDATION_ERROR,
      `profiles.${profileName}`,
      `Configuration for profile "${profileName}" must be a non-null object`
    );
    return { valid: false, errors, details };
  }

  const def = PROFILE_DEFINITIONS[profileName];

  // Check required fields
  for (const field of def.requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      addError(
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        `profiles.${profileName}.${field}`,
        `Missing required field "${field}" in profile "${profileName}"`
      );
    }
  }

  // Profile-specific constraint validation
  switch (profileName) {
    case 'property_invariant': {
      if (config.generators !== undefined) {
        if (!Array.isArray(config.generators) || config.generators.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.property_invariant.generators`,
            'generators must be a non-empty array of generator identifiers'
          );
        } else if (!config.generators.every(g => typeof g === 'string' && g.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.property_invariant.generators`,
            'all generators items must be non-empty strings'
          );
        }
      }

      if (config.iterations !== undefined) {
        if (typeof config.iterations !== 'number' || !Number.isInteger(config.iterations)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.property_invariant.iterations`,
            'iterations must be an integer'
          );
        } else if (config.iterations < 10000) {
          addError(
            ERROR_CODES.INVALID_ITERATIONS,
            `profiles.property_invariant.iterations`,
            `iterations must be >= 10,000 (got ${config.iterations})`
          );
        }
      }

      if (config.laws !== undefined) {
        if (!Array.isArray(config.laws) || config.laws.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.property_invariant.laws`,
            'laws must be a non-empty array of algebraic law assertions'
          );
        } else if (!config.laws.every(l => typeof l === 'string' && l.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.property_invariant.laws`,
            'all laws items must be non-empty strings'
          );
        }
      }

      if (config.shrinking !== undefined && typeof config.shrinking !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `profiles.property_invariant.shrinking`,
          'shrinking must be a boolean flag'
        );
      }
      break;
    }

    case 'stateful_model': {
      if (config.model_ref !== undefined) {
        if (typeof config.model_ref !== 'string' || config.model_ref.trim().length === 0) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.stateful_model.model_ref`,
            'model_ref must be a non-empty string referencing the authoritative model'
          );
        }
      }

      if (config.commands !== undefined) {
        if (!Array.isArray(config.commands) || config.commands.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.stateful_model.commands`,
            'commands must be a non-empty array of transition actions'
          );
        } else if (!config.commands.every(c => typeof c === 'string' && c.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.stateful_model.commands`,
            'all commands items must be non-empty strings'
          );
        }
      }

      if (config.lockstep !== undefined && typeof config.lockstep !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `profiles.stateful_model.lockstep`,
          'lockstep must be a boolean flag'
        );
      }

      if (config.trace_invariants !== undefined) {
        if (!Array.isArray(config.trace_invariants) || config.trace_invariants.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.stateful_model.trace_invariants`,
            'trace_invariants must be a non-empty array of invariants'
          );
        } else if (!config.trace_invariants.every(t => typeof t === 'string' && t.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.stateful_model.trace_invariants`,
            'all trace_invariants items must be non-empty strings'
          );
        }
      }
      break;
    }

    case 'adversarial_boundary': {
      if (config.extremes !== undefined) {
        if (!Array.isArray(config.extremes) || config.extremes.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.adversarial_boundary.extremes`,
            'extremes must be a non-empty array of boundary values'
          );
        }
      }

      if (config.types !== undefined) {
        if (!Array.isArray(config.types) || config.types.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.adversarial_boundary.types`,
            'types must be a non-empty array of fuzzed data types'
          );
        } else if (!config.types.every(t => typeof t === 'string' && t.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.adversarial_boundary.types`,
            'all types items must be non-empty strings'
          );
        }
      }

      if (config.zero_tolerance !== undefined && typeof config.zero_tolerance !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `profiles.adversarial_boundary.zero_tolerance`,
          'zero_tolerance must be a boolean flag'
        );
      }

      if (config.payload_vectors !== undefined) {
        if (!Array.isArray(config.payload_vectors) || config.payload_vectors.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.adversarial_boundary.payload_vectors`,
            'payload_vectors must be a non-empty array'
          );
        }
      }
      break;
    }

    case 'mutation_testing': {
      if (config.mutation_operators !== undefined) {
        if (!Array.isArray(config.mutation_operators) || config.mutation_operators.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.mutation_testing.mutation_operators`,
            'mutation_operators must be a non-empty array of operator strings'
          );
        } else if (!config.mutation_operators.every(m => typeof m === 'string' && m.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.mutation_testing.mutation_operators`,
            'all mutation_operators items must be non-empty strings'
          );
        }
      }

      if (config.kill_threshold !== undefined) {
        if (typeof config.kill_threshold !== 'number' || isNaN(config.kill_threshold)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.mutation_testing.kill_threshold`,
            'kill_threshold must be a number'
          );
        } else {
          // Supports either percentage (85 to 100) or fraction (0.85 to 1.0)
          const isPercentage = config.kill_threshold > 1.0;
          if (isPercentage) {
            if (config.kill_threshold < 85 || config.kill_threshold > 100) {
              addError(
                ERROR_CODES.INVALID_KILL_THRESHOLD,
                `profiles.mutation_testing.kill_threshold`,
                `kill_threshold percentage must be between 85% and 100% (got ${config.kill_threshold}%)`
              );
            }
          } else {
            if (config.kill_threshold < 0.85 || config.kill_threshold > 1.0) {
              addError(
                ERROR_CODES.INVALID_KILL_THRESHOLD,
                `profiles.mutation_testing.kill_threshold`,
                `kill_threshold fraction must be between 0.85 and 1.0 (got ${config.kill_threshold})`
              );
            }
          }
        }
      }

      if (config.timeout_ms !== undefined) {
        if (typeof config.timeout_ms !== 'number' || !Number.isInteger(config.timeout_ms) || config.timeout_ms <= 0) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.mutation_testing.timeout_ms`,
            'timeout_ms must be a positive integer'
          );
        }
      }
      break;
    }

    case 'epistemic_classification': {
      if (config.claimed_level !== undefined) {
        if (!PROOF_LEVELS.includes(config.claimed_level)) {
          addError(
            ERROR_CODES.INVALID_PROOF_LEVEL,
            `profiles.epistemic_classification.claimed_level`,
            `Invalid claimed_level "${config.claimed_level}". Must be one of: ${PROOF_LEVELS.join(', ')}`
          );
        }
      }

      if (config.assumptions !== undefined) {
        if (!Array.isArray(config.assumptions)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.epistemic_classification.assumptions`,
            'assumptions must be an array of strings'
          );
        } else if (!config.assumptions.every(a => typeof a === 'string')) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.epistemic_classification.assumptions`,
            'all assumptions items must be strings'
          );
        }
      }

      if (config.abstraction_disclosures !== undefined) {
        if (!Array.isArray(config.abstraction_disclosures)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.epistemic_classification.abstraction_disclosures`,
            'abstraction_disclosures must be an array of strings'
          );
        } else if (!config.abstraction_disclosures.every(d => typeof d === 'string')) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.epistemic_classification.abstraction_disclosures`,
            'all abstraction_disclosures items must be strings'
          );
        }
      }
      break;
    }

    case 'counterexample': {
      if (config.minimizer_enabled !== undefined && typeof config.minimizer_enabled !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `profiles.counterexample.minimizer_enabled`,
          'minimizer_enabled must be a boolean flag'
        );
      }

      if (config.seed !== undefined) {
        const isNum = typeof config.seed === 'number';
        const isStr = typeof config.seed === 'string' && config.seed.trim().length > 0;
        if (!isNum && !isStr) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.counterexample.seed`,
            'seed must be an integer, number, or non-empty string'
          );
        }
      }

      if (config.schema_format !== undefined) {
        if (typeof config.schema_format !== 'string' || config.schema_format.trim().length === 0) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.counterexample.schema_format`,
            'schema_format must be a non-empty string format specifier'
          );
        }
      }
      break;
    }

    case 'concurrency_schedule': {
      if (config.interleavings !== undefined) {
        if (typeof config.interleavings !== 'number' || !Number.isInteger(config.interleavings) || config.interleavings < 1) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.concurrency_schedule.interleavings`,
            'interleavings must be an integer >= 1'
          );
        }
      }

      if (config.races_tested !== undefined) {
        if (!Array.isArray(config.races_tested) || config.races_tested.length === 0) {
          addError(
            ERROR_CODES.PROFILE_VALIDATION_ERROR,
            `profiles.concurrency_schedule.races_tested`,
            'races_tested must be a non-empty array of evaluated race conditions'
          );
        } else if (!config.races_tested.every(r => typeof r === 'string' && r.trim().length > 0)) {
          addError(
            ERROR_CODES.INVALID_FIELD_TYPE,
            `profiles.concurrency_schedule.races_tested`,
            'all races_tested items must be non-empty strings'
          );
        }
      }

      if (config.fencing_token !== undefined && typeof config.fencing_token !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `profiles.concurrency_schedule.fencing_token`,
          'fencing_token must be a boolean flag'
        );
      }
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details
  };
}

/**
 * Validates a complete goal contract against universal verification fields and active profiles.
 *
 * @param {object} contract
 * @param {object} [options={}]
 * @returns {{ valid: boolean, errors: string[], details: Array<{ code: string, path: string, message: string }>, warnings: string[], contract: object }}
 */
export function validateGoalContract(contract, options = {}) {
  const errors = [];
  const details = [];
  const warnings = [];

  const addError = (code, path, message) => {
    errors.push(`[${code}] ${path}: ${message}`);
    details.push({ code, path, message });
  };

  const addWarning = (message) => {
    warnings.push(message);
  };

  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
    addError(
      ERROR_CODES.SCHEMA_VALIDATION_ERROR,
      'root',
      'Goal contract must be a non-null object'
    );
    return { valid: false, errors, details, warnings, contract };
  }

  // 1. schema_version
  if (contract.schema_version === undefined || contract.schema_version === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'schema_version',
      'Missing required field "schema_version"'
    );
  } else if (typeof contract.schema_version !== 'number' || !Number.isInteger(contract.schema_version) || contract.schema_version < 1) {
    addError(
      ERROR_CODES.INVALID_FIELD_TYPE,
      'schema_version',
      `schema_version must be a positive integer (got ${contract.schema_version})`
    );
  }

  // 2. goal_id
  if (contract.goal_id === undefined || contract.goal_id === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'goal_id',
      'Missing required field "goal_id"'
    );
  } else if (typeof contract.goal_id !== 'string') {
    addError(
      ERROR_CODES.INVALID_FIELD_TYPE,
      'goal_id',
      'goal_id must be a string'
    );
  } else if (!GOAL_ID_PATTERN.test(contract.goal_id)) {
    addError(
      ERROR_CODES.INVALID_GOAL_ID,
      'goal_id',
      `Invalid goal_id format "${contract.goal_id}". Must match pattern ^(G-[A-Z0-9]+-[0-9]{3}|G-[0-9]{3}|G-xxx)$`
    );
  }

  // 3. proof_level
  if (contract.proof_level === undefined || contract.proof_level === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'proof_level',
      'Missing required field "proof_level"'
    );
  } else if (typeof contract.proof_level !== 'string') {
    addError(
      ERROR_CODES.INVALID_FIELD_TYPE,
      'proof_level',
      'proof_level must be a string'
    );
  } else if (!PROOF_LEVELS.includes(contract.proof_level)) {
    addError(
      ERROR_CODES.INVALID_PROOF_LEVEL,
      'proof_level',
      `Invalid proof_level "${contract.proof_level}". Must be one of: ${PROOF_LEVELS.join(', ')}`
    );
  }

  // 4. fail_closed
  if (contract.fail_closed === undefined || contract.fail_closed === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'fail_closed',
      'Missing required field "fail_closed"'
    );
  } else if (typeof contract.fail_closed !== 'boolean') {
    addError(
      ERROR_CODES.INVALID_FAIL_CLOSED,
      'fail_closed',
      `fail_closed must be a boolean (got ${typeof contract.fail_closed})`
    );
  }

  // 5. invariants
  if (contract.invariants === undefined || contract.invariants === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'invariants',
      'Missing required field "invariants"'
    );
  } else if (!Array.isArray(contract.invariants) || contract.invariants.length === 0) {
    addError(
      ERROR_CODES.INVALID_INVARIANTS,
      'invariants',
      'invariants must be a non-empty array of invariant objects'
    );
  } else {
    for (let i = 0; i < contract.invariants.length; i++) {
      const inv = contract.invariants[i];
      const invPath = `invariants[${i}]`;

      if (typeof inv !== 'object' || inv === null || Array.isArray(inv)) {
        addError(
          ERROR_CODES.INVALID_INVARIANTS,
          invPath,
          'invariant item must be a non-null object'
        );
        continue;
      }

      if (!inv.id || typeof inv.id !== 'string' || inv.id.trim().length === 0) {
        addError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          `${invPath}.id`,
          'invariant item must contain a non-empty string "id"'
        );
      }

      if (!inv.statement || typeof inv.statement !== 'string' || inv.statement.trim().length === 0) {
        addError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          `${invPath}.statement`,
          'invariant item must contain a non-empty string "statement"'
        );
      }

      if (inv.verification_command !== undefined && (typeof inv.verification_command !== 'string' || inv.verification_command.trim().length === 0)) {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `${invPath}.verification_command`,
          'verification_command must be a non-empty string if provided'
        );
      }

      if (inv.passed !== undefined && typeof inv.passed !== 'boolean') {
        addError(
          ERROR_CODES.INVALID_FIELD_TYPE,
          `${invPath}.passed`,
          'passed flag must be a boolean if provided'
        );
      }

      if (inv.exit_code !== undefined && (!Number.isInteger(inv.exit_code) || inv.exit_code !== 0)) {
        addError(
          ERROR_CODES.INVALID_INVARIANTS,
          `${invPath}.exit_code`,
          `exit_code must be 0 for verified invariants (got ${inv.exit_code})`
        );
      }
    }
  }

  // 6. profiles
  if (contract.profiles === undefined || contract.profiles === null) {
    addError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'profiles',
      'Missing required field "profiles"'
    );
  } else if (Array.isArray(contract.profiles)) {
    if (contract.profiles.length === 0) {
      addError(
        ERROR_CODES.PROFILE_VALIDATION_ERROR,
        'profiles',
        'profiles array must contain at least one verification profile'
      );
    } else {
      for (let i = 0; i < contract.profiles.length; i++) {
        const pName = contract.profiles[i];
        if (typeof pName !== 'string' || !GOAL_PROFILES.includes(pName)) {
          addError(
            ERROR_CODES.UNKNOWN_PROFILE,
            `profiles[${i}]`,
            `Unknown verification profile "${pName}". Must be one of: ${GOAL_PROFILES.join(', ')}`
          );
        }
      }

      // If explicit profile_configs object is provided, validate each declared profile
      if (contract.profile_configs && typeof contract.profile_configs === 'object') {
        for (const [pName, pConfig] of Object.entries(contract.profile_configs)) {
          const profileRes = validateProfile(pName, pConfig);
          if (!profileRes.valid) {
            errors.push(...profileRes.errors);
            details.push(...profileRes.details);
          }
        }
      }
    }
  } else if (typeof contract.profiles === 'object') {
    const profileKeys = Object.keys(contract.profiles);
    if (profileKeys.length === 0) {
      addError(
        ERROR_CODES.PROFILE_VALIDATION_ERROR,
        'profiles',
        'profiles configuration object must declare at least one profile'
      );
    } else {
      for (const [pName, pConfig] of Object.entries(contract.profiles)) {
        if (!GOAL_PROFILES.includes(pName)) {
          addError(
            ERROR_CODES.UNKNOWN_PROFILE,
            `profiles.${pName}`,
            `Unknown profile key "${pName}". Must be one of: ${GOAL_PROFILES.join(', ')}`
          );
        } else {
          const profileRes = validateProfile(pName, pConfig);
          if (!profileRes.valid) {
            errors.push(...profileRes.errors);
            details.push(...profileRes.details);
          }
        }
      }
    }
  } else {
    addError(
      ERROR_CODES.INVALID_FIELD_TYPE,
      'profiles',
      'profiles must be an array of profile strings or an object of profile configurations'
    );
  }

  // 7. mathematical_proven_governance (optional block for the 6 domains)
  if (contract.mathematical_proven_governance !== undefined && contract.mathematical_proven_governance !== null) {
    if (typeof contract.mathematical_proven_governance !== 'object' || Array.isArray(contract.mathematical_proven_governance)) {
      addError(
        ERROR_CODES.SCHEMA_VALIDATION_ERROR,
        'mathematical_proven_governance',
        'mathematical_proven_governance must be a non-null object'
      );
    } else {
      const mpg = contract.mathematical_proven_governance;
      for (const key of Object.keys(mpg)) {
        if (!MATHEMATICAL_DOMAINS.includes(key)) {
          addWarning(`Unrecognized domain key "${key}" in mathematical_proven_governance`);
        }
      }
    }
  }

  // Cross-field validation: Fail-closed enforcement for high assurance levels
  if (contract.proof_level && ['L1', 'L2'].includes(contract.proof_level) && contract.fail_closed === false) {
    addWarning(`Goal ${contract.goal_id} claims high assurance ${contract.proof_level} but has fail_closed set to false`);
  }

  return {
    valid: errors.length === 0,
    errors,
    details,
    warnings,
    contract
  };
}

/**
 * Parses and extracts a goal contract object from markdown content or a file path.
 * Supports legacy Template v2 frontmatter mapping to v3.
 *
 * @param {string} goalContentOrPath - Raw markdown content or path to goal file
 * @returns {object} Parsed and normalized contract object
 */
export function parseContractFromGoal(goalContentOrPath) {
  let content = goalContentOrPath;

  if (typeof goalContentOrPath === 'string' && (existsSync(goalContentOrPath) || goalContentOrPath.endsWith('.md'))) {
    const resolvedPath = resolve(process.cwd(), goalContentOrPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`[${ERROR_CODES.PARSE_ERROR}] Goal file not found: ${goalContentOrPath}`);
    }
    content = readFileSync(resolvedPath, 'utf8');
  }

  if (typeof content !== 'string') {
    throw new Error(`[${ERROR_CODES.PARSE_ERROR}] Expected markdown string or valid file path`);
  }

  // Extract frontmatter block between --- and ---
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    throw new Error(`[${ERROR_CODES.PARSE_ERROR}] Missing YAML frontmatter block in goal markdown`);
  }

  const rawYaml = fmMatch[1];
  const parsed = parseSimpleYaml(rawYaml);

  // If frontmatter is wrapped under goal_contract, unwrap and merge
  let contract = parsed.goal_contract ? { ...parsed.goal_contract, ...parsed } : { ...parsed };
  delete contract.goal_contract;

  // Normalization for backward compatibility
  if (!contract.goal_id && contract.id) {
    contract.goal_id = contract.id;
  }

  if (contract.schema_version === undefined && contract.version !== undefined) {
    // If legacy v2 was specified, elevate or preserve as schema_version
    contract.schema_version = typeof contract.version === 'number' ? contract.version : 3;
  } else if (contract.schema_version === undefined) {
    contract.schema_version = SCHEMA_VERSION;
  }

  if (contract.fail_closed === undefined) {
    // Default fail_closed to true for formal verification assurance
    contract.fail_closed = true;
  }

  // Infer or map proof_level if not explicitly set in frontmatter
  if (!contract.proof_level) {
    if (contract.kind === 'architecture' || contract.profiles?.includes('property_invariant')) {
      contract.proof_level = 'L2';
    } else {
      contract.proof_level = 'L0';
    }
  }

  // Ensure invariants exist
  if (!contract.invariants || !Array.isArray(contract.invariants) || contract.invariants.length === 0) {
    contract.invariants = [
      {
        id: `${contract.goal_id || 'GOAL'}-INV-001`,
        statement: contract.primary_outcome || contract.atomicity?.primary_outcome || 'All declared invariants hold and exit code 0.'
      }
    ];
  }

  // Ensure profiles array or object exists and normalize legacy profiles
  if (!contract.profiles) {
    contract.profiles = ['property_invariant'];
  } else if (Array.isArray(contract.profiles)) {
    contract.profiles = contract.profiles.map(p => {
      if (p === 'core') return 'property_invariant';
      return p;
    });
  }

  // Hydrate mathematical_proven_governance from canonical preset if present
  if (contract.mathematical_proven_governance !== undefined && contract.mathematical_proven_governance !== null) {
    if (typeof contract.mathematical_proven_governance === 'object') {
      contract.mathematical_proven_governance = deepMerge(
        JSON.parse(JSON.stringify(CANONICAL_MATHEMATICAL_PROVEN_GOVERNANCE)),
        contract.mathematical_proven_governance
      );
    }
  }

  return contract;
}

/**
 * Lightweight native YAML parser for frontmatter dictionaries and lists.
 * Supports scalar types (boolean, number, string), nested objects, and arrays.
 *
 * @param {string} yamlText
 * @returns {object}
 */
function parseSimpleYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root, key: null, parent: null }];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    const indent = rawLine.search(/\S/);
    const line = rawLine.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const currentContext = stack[stack.length - 1];

    // List item line
    if (line.startsWith('- ')) {
      const itemValStr = line.slice(2).trim();

      if (currentContext.parent && currentContext.key && !Array.isArray(currentContext.parent[currentContext.key])) {
        currentContext.parent[currentContext.key] = [];
        currentContext.obj = currentContext.parent[currentContext.key];
      }

      const targetArray = Array.isArray(currentContext.obj)
        ? currentContext.obj
        : (currentContext.parent && Array.isArray(currentContext.parent[currentContext.key])
            ? currentContext.parent[currentContext.key]
            : null);

      if (!targetArray) continue;

      if (itemValStr.includes(':') && !itemValStr.startsWith('{') && !itemValStr.startsWith('"') && !itemValStr.startsWith("'")) {
        const listObj = {};
        const colonIdx = itemValStr.indexOf(':');
        const k = itemValStr.slice(0, colonIdx).trim();
        const v = itemValStr.slice(colonIdx + 1).trim();
        listObj[k] = parseScalar(v);
        targetArray.push(listObj);
        stack.push({ indent, obj: listObj, key: k, parent: targetArray });
      } else {
        targetArray.push(parseScalar(itemValStr));
      }
      continue;
    }

    // Key-value pair
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const valStr = line.slice(colonIdx + 1).trim();

      if (valStr === '' || valStr === '{}' || valStr === '[]') {
        if (valStr === '[]') {
          currentContext.obj[key] = [];
          stack.push({ indent, obj: currentContext.obj[key], key, parent: currentContext.obj });
        } else {
          currentContext.obj[key] = {};
          stack.push({ indent, obj: currentContext.obj[key], key, parent: currentContext.obj });
        }
      } else if (valStr.startsWith('[') && valStr.endsWith(']')) {
        const rawItems = valStr.slice(1, -1).split(',');
        currentContext.obj[key] = rawItems
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        currentContext.obj[key] = parseScalar(valStr);
      }
    }
  }

  return root;
}

/**
 * Parses scalar string into boolean, number, or clean string.
 *
 * @param {string} val
 * @returns {any}
 */
function parseScalar(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (val === '[]') return [];
  if (val === '{}') return {};
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  // Strip outer quotes
  return val.replace(/^["'](.*)["']$/, '$1');
}

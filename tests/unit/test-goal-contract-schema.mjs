import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SCHEMA_VERSION,
  PROOF_LEVELS,
  GOAL_PROFILES,
  PROFILE_DEFINITIONS,
  ERROR_CODES,
  validateGoalContract,
  validateProfile,
  parseContractFromGoal
} from '../../scripts/lib/goal-contract-schema.mjs';

describe('Goal Contract Schema & Profile Verification Suite', () => {

  describe('Constant Exports & Metadata', () => {
    it('test 1: exports canonical SCHEMA_VERSION as 3', () => {
      assert.strictEqual(SCHEMA_VERSION, 3);
    });

    it('test 2: exports all 5 canonical proof levels L0 to L4', () => {
      assert.deepStrictEqual(Array.from(PROOF_LEVELS), ['L0', 'L1', 'L2', 'L3', 'L4']);
    });

    it('test 3: exports all 7 canonical goal profiles', () => {
      assert.strictEqual(GOAL_PROFILES.length, 7);
      assert.ok(GOAL_PROFILES.includes('property_invariant'));
      assert.ok(GOAL_PROFILES.includes('stateful_model'));
      assert.ok(GOAL_PROFILES.includes('adversarial_boundary'));
      assert.ok(GOAL_PROFILES.includes('mutation_testing'));
      assert.ok(GOAL_PROFILES.includes('epistemic_classification'));
      assert.ok(GOAL_PROFILES.includes('counterexample'));
      assert.ok(GOAL_PROFILES.includes('concurrency_schedule'));
    });

    it('test 4: exports definitions for all 7 profiles with required fields', () => {
      for (const p of GOAL_PROFILES) {
        assert.ok(PROFILE_DEFINITIONS[p], `Missing definition for profile: ${p}`);
        assert.ok(Array.isArray(PROFILE_DEFINITIONS[p].requiredFields), `Missing requiredFields for ${p}`);
        assert.ok(PROFILE_DEFINITIONS[p].requiredFields.length > 0);
      }
    });
  });

  describe('Universal Contract Validation', () => {
    it('test 5: validates minimal valid goal contract', () => {
      const contract = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [
          {
            id: 'INV-PROOF-001',
            statement: 'Goal contract schema validator operates fail-closed with zero stubs.'
          }
        ],
        profiles: ['property_invariant']
      };

      const res = validateGoalContract(contract);
      assert.strictEqual(res.valid, true, `Validation failed: ${res.errors.join(', ')}`);
      assert.strictEqual(res.errors.length, 0);
    });

    it('test 6: validates full contract with additional metadata', () => {
      const contract = {
        schema_version: 3,
        goal_id: 'G-CORE-001',
        kind: 'architecture',
        status: 'planned',
        proof_level: 'L1',
        fail_closed: true,
        invariants: [
          {
            id: 'INV-001',
            statement: 'Integer balance conservation law is preserved.',
            verification_command: 'node scripts/harness/proof-harness.mjs',
            passed: true,
            exit_code: 0
          }
        ],
        profiles: ['property_invariant', 'epistemic_classification'],
        atomicity: { outcome_count: 1, primary_outcome: 'Preserve conservation' },
        owner: { role: 'system-architect' }
      };

      const res = validateGoalContract(contract);
      assert.strictEqual(res.valid, true);
    });

    it('test 7: fail-closed rejection when contract is not an object', () => {
      const resNull = validateGoalContract(null);
      assert.strictEqual(resNull.valid, false);
      assert.ok(resNull.details.some(d => d.code === ERROR_CODES.SCHEMA_VALIDATION_ERROR));

      const resString = validateGoalContract("invalid");
      assert.strictEqual(resString.valid, false);
    });

    it('test 8: fail-closed rejection when schema_version is missing or invalid', () => {
      const missing = {
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [{ id: 'INV-1', statement: 'Statement' }],
        profiles: ['property_invariant']
      };
      const resMissing = validateGoalContract(missing);
      assert.strictEqual(resMissing.valid, false);
      assert.ok(resMissing.details.some(d => d.code === ERROR_CODES.MISSING_REQUIRED_FIELD && d.path === 'schema_version'));

      const invalid = { ...missing, schema_version: 0 };
      const resInvalid = validateGoalContract(invalid);
      assert.strictEqual(resInvalid.valid, false);
      assert.ok(resInvalid.details.some(d => d.code === ERROR_CODES.INVALID_FIELD_TYPE && d.path === 'schema_version'));
    });

    it('test 9: fail-closed rejection when goal_id is missing or malformed', () => {
      const missing = {
        schema_version: 3,
        proof_level: 'L2',
        fail_closed: true,
        invariants: [{ id: 'INV-1', statement: 'Statement' }],
        profiles: ['property_invariant']
      };
      const resMissing = validateGoalContract(missing);
      assert.strictEqual(resMissing.valid, false);
      assert.ok(resMissing.details.some(d => d.code === ERROR_CODES.MISSING_REQUIRED_FIELD && d.path === 'goal_id'));

      const malformed = { ...missing, goal_id: 'BAD_ID_FORMAT' };
      const resMalformed = validateGoalContract(malformed);
      assert.strictEqual(resMalformed.valid, false);
      assert.ok(resMalformed.details.some(d => d.code === ERROR_CODES.INVALID_GOAL_ID));
    });

    it('test 10: fail-closed rejection when proof_level is invalid', () => {
      const invalid = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L5',
        fail_closed: true,
        invariants: [{ id: 'INV-1', statement: 'Statement' }],
        profiles: ['property_invariant']
      };
      const res = validateGoalContract(invalid);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_PROOF_LEVEL));
    });

    it('test 11: fail-closed rejection when fail_closed is missing or non-boolean', () => {
      const missing = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        invariants: [{ id: 'INV-1', statement: 'Statement' }],
        profiles: ['property_invariant']
      };
      const resMissing = validateGoalContract(missing);
      assert.strictEqual(resMissing.valid, false);
      assert.ok(resMissing.details.some(d => d.code === ERROR_CODES.MISSING_REQUIRED_FIELD && d.path === 'fail_closed'));

      const nonBool = { ...missing, fail_closed: 'true' };
      const resNonBool = validateGoalContract(nonBool);
      assert.strictEqual(resNonBool.valid, false);
      assert.ok(resNonBool.details.some(d => d.code === ERROR_CODES.INVALID_FAIL_CLOSED));
    });

    it('test 12: fail-closed rejection when invariants array is empty or missing', () => {
      const empty = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [],
        profiles: ['property_invariant']
      };
      const res = validateGoalContract(empty);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_INVARIANTS));
    });

    it('test 13: fail-closed rejection when invariant items lack id or statement', () => {
      const badInv = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [{ id: '', statement: 'Valid statement' }],
        profiles: ['property_invariant']
      };
      const res = validateGoalContract(badInv);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.MISSING_REQUIRED_FIELD && d.path === 'invariants[0].id'));
    });

    it('test 14: fail-closed rejection when profiles contains an unknown profile', () => {
      const unknown = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [{ id: 'INV-1', statement: 'Valid' }],
        profiles: ['non_existent_profile']
      };
      const res = validateGoalContract(unknown);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.UNKNOWN_PROFILE));
    });
  });

  describe('Profile 1: property_invariant', () => {
    it('test 15: valid property_invariant config passes validation', () => {
      const config = {
        generators: ['arbitraryMinorInteger', 'arbitraryCurrency'],
        iterations: 10000,
        laws: ['conservation', 'monotonicity', 'idempotency'],
        shrinking: true
      };
      const res = validateProfile('property_invariant', config);
      assert.strictEqual(res.valid, true, `Errors: ${res.errors.join(', ')}`);
    });

    it('test 16: property_invariant rejects iterations < 10000', () => {
      const config = {
        generators: ['arbitraryInt'],
        iterations: 9999,
        laws: ['conservation'],
        shrinking: true
      };
      const res = validateProfile('property_invariant', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_ITERATIONS));
    });

    it('test 17: property_invariant rejects non-boolean shrinking', () => {
      const config = {
        generators: ['arbitraryInt'],
        iterations: 10000,
        laws: ['conservation'],
        shrinking: 'yes'
      };
      const res = validateProfile('property_invariant', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_FIELD_TYPE && d.path.includes('shrinking')));
    });

    it('test 18: property_invariant rejects empty generators array', () => {
      const config = {
        generators: [],
        iterations: 10000,
        laws: ['conservation'],
        shrinking: true
      };
      const res = validateProfile('property_invariant', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.PROFILE_VALIDATION_ERROR && d.path.includes('generators')));
    });
  });

  describe('Profile 2: stateful_model', () => {
    it('test 19: valid stateful_model config passes validation', () => {
      const config = {
        model_ref: 'models/state_machine.tla',
        commands: ['START', 'PROCESS', 'COMMIT', 'ROLLBACK'],
        lockstep: true,
        trace_invariants: ['INV_NO_DOUBLE_SPEND', 'INV_TERMINATION']
      };
      const res = validateProfile('stateful_model', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 20: stateful_model rejects empty model_ref or missing commands', () => {
      const config = {
        model_ref: '',
        commands: [],
        lockstep: true,
        trace_invariants: ['INV_1']
      };
      const res = validateProfile('stateful_model', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.path.includes('model_ref')));
      assert.ok(res.details.some(d => d.path.includes('commands')));
    });
  });

  describe('Profile 3: adversarial_boundary', () => {
    it('test 21: valid adversarial_boundary config passes validation', () => {
      const config = {
        extremes: ['MAX_SAFE_INTEGER', 'MIN_SAFE_INTEGER', 'NaN', 'null'],
        types: ['i64', 'string', 'buffer'],
        zero_tolerance: true,
        payload_vectors: ['payload_overflow_001.bin', 'payload_unicode_002.txt']
      };
      const res = validateProfile('adversarial_boundary', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 22: adversarial_boundary rejects non-boolean zero_tolerance', () => {
      const config = {
        extremes: ['MAX_INT'],
        types: ['i64'],
        zero_tolerance: 1,
        payload_vectors: ['vector_1']
      };
      const res = validateProfile('adversarial_boundary', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_FIELD_TYPE && d.path.includes('zero_tolerance')));
    });
  });

  describe('Profile 4: mutation_testing', () => {
    it('test 23: valid mutation_testing config passes with percentage >= 85%', () => {
      const config = {
        mutation_operators: ['AOR', 'ROR', 'COR'],
        kill_threshold: 88.5,
        timeout_ms: 5000
      };
      const res = validateProfile('mutation_testing', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 24: valid mutation_testing config passes with fraction >= 0.85', () => {
      const config = {
        mutation_operators: ['AOR', 'ROR'],
        kill_threshold: 0.92,
        timeout_ms: 3000
      };
      const res = validateProfile('mutation_testing', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 25: mutation_testing rejects kill_threshold < 85%', () => {
      const configPct = {
        mutation_operators: ['AOR'],
        kill_threshold: 84.0,
        timeout_ms: 2000
      };
      const resPct = validateProfile('mutation_testing', configPct);
      assert.strictEqual(resPct.valid, false);
      assert.ok(resPct.details.some(d => d.code === ERROR_CODES.INVALID_KILL_THRESHOLD));

      const configFrac = {
        mutation_operators: ['AOR'],
        kill_threshold: 0.80,
        timeout_ms: 2000
      };
      const resFrac = validateProfile('mutation_testing', configFrac);
      assert.strictEqual(resFrac.valid, false);
      assert.ok(resFrac.details.some(d => d.code === ERROR_CODES.INVALID_KILL_THRESHOLD));
    });

    it('test 26: mutation_testing rejects invalid timeout_ms', () => {
      const config = {
        mutation_operators: ['AOR'],
        kill_threshold: 90,
        timeout_ms: -500
      };
      const res = validateProfile('mutation_testing', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_FIELD_TYPE && d.path.includes('timeout_ms')));
    });
  });

  describe('Profile 5: epistemic_classification', () => {
    it('test 27: valid epistemic_classification config passes validation', () => {
      const config = {
        claimed_level: 'L1',
        assumptions: ['Axiomatic integer arithmetic', 'Synchronous atomic transitions'],
        abstraction_disclosures: ['Hardware memory fault tolerance not modeled']
      };
      const res = validateProfile('epistemic_classification', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 28: epistemic_classification rejects invalid claimed_level', () => {
      const config = {
        claimed_level: 'L9',
        assumptions: [],
        abstraction_disclosures: []
      };
      const res = validateProfile('epistemic_classification', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_PROOF_LEVEL));
    });
  });

  describe('Profile 6: counterexample', () => {
    it('test 29: valid counterexample config passes validation with integer seed', () => {
      const config = {
        minimizer_enabled: true,
        seed: 42,
        schema_format: 'json'
      };
      const res = validateProfile('counterexample', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 30: valid counterexample config passes validation with string seed', () => {
      const config = {
        minimizer_enabled: false,
        seed: '0xdeadbeef1234',
        schema_format: 'trace'
      };
      const res = validateProfile('counterexample', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 31: counterexample rejects non-boolean minimizer_enabled', () => {
      const config = {
        minimizer_enabled: 'false',
        seed: 123,
        schema_format: 'json'
      };
      const res = validateProfile('counterexample', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.code === ERROR_CODES.INVALID_FIELD_TYPE && d.path.includes('minimizer_enabled')));
    });
  });

  describe('Profile 7: concurrency_schedule', () => {
    it('test 32: valid concurrency_schedule config passes validation', () => {
      const config = {
        interleavings: 50,
        races_tested: ['LOST_UPDATE', 'DIRTY_READ', 'PHANTOM_COMMIT'],
        fencing_token: true
      };
      const res = validateProfile('concurrency_schedule', config);
      assert.strictEqual(res.valid, true);
    });

    it('test 33: concurrency_schedule rejects interleavings < 1 or non-boolean fencing_token', () => {
      const config = {
        interleavings: 0,
        races_tested: ['LOST_UPDATE'],
        fencing_token: 'yes'
      };
      const res = validateProfile('concurrency_schedule', config);
      assert.strictEqual(res.valid, false);
      assert.ok(res.details.some(d => d.path.includes('interleavings')));
      assert.ok(res.details.some(d => d.path.includes('fencing_token')));
    });
  });

  describe('Multi-Profile Contract & Config Mapping Integration', () => {
    it('test 34: validates contract declaring profiles as an object map with multiple valid configs', () => {
      const contract = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [
          { id: 'INV-1', statement: 'All 7 profile schemas compile and validate.' }
        ],
        profiles: {
          property_invariant: {
            generators: ['intGen'],
            iterations: 15000,
            laws: ['conservation'],
            shrinking: true
          },
          counterexample: {
            minimizer_enabled: true,
            seed: 101,
            schema_format: 'json'
          }
        }
      };
      const res = validateGoalContract(contract);
      assert.strictEqual(res.valid, true);
    });

    it('test 35: validates contract with array profiles and explicit profile_configs object', () => {
      const contract = {
        schema_version: 3,
        goal_id: 'G-PROOF-003',
        proof_level: 'L2',
        fail_closed: true,
        invariants: [
          { id: 'INV-1', statement: 'Deterministic fuzzing runs.' }
        ],
        profiles: ['property_invariant'],
        profile_configs: {
          property_invariant: {
            generators: ['floatGen'],
            iterations: 20000,
            laws: ['monotonicity'],
            shrinking: false
          }
        }
      };
      const res = validateGoalContract(contract);
      assert.strictEqual(res.valid, true);
    });
  });

  describe('Markdown Goal Frontmatter Parsing & Backward Compatibility', () => {
    it('test 36: parseContractFromGoal extracts and normalizes contract from markdown string', () => {
      const markdown = `---
goal_contract:
  id: G-PROOF-003
  version: 2
  kind: architecture
  status: planned
  profiles:
    - property_invariant
---

# G-PROOF-003: Goal Title
`;
      const contract = parseContractFromGoal(markdown);
      assert.strictEqual(contract.goal_id, 'G-PROOF-003');
      assert.strictEqual(contract.schema_version, 2);
      assert.strictEqual(contract.fail_closed, true);
      assert.ok(Array.isArray(contract.invariants));
      assert.ok(contract.invariants.length > 0);

      // Validate the normalized contract
      const res = validateGoalContract(contract);
      assert.strictEqual(res.valid, true);
    });

    it('test 37: parseContractFromGoal reads from disk file path and validates', () => {
      const goalPath = resolve(process.cwd(), 'docs/07-backlog/goals/G-PROOF-003.md');
      if (existsSync(goalPath)) {
        const contract = parseContractFromGoal(goalPath);
        assert.strictEqual(contract.goal_id, 'G-PROOF-003');
        const res = validateGoalContract(contract);
        assert.strictEqual(res.valid, true);
      }
    });

    it('test 38: verifies schemas/goal-contract.schema.json exists and is valid JSON Schema Draft 2020-12', () => {
      const schemaPath = resolve(process.cwd(), 'schemas/goal-contract.schema.json');
      assert.ok(existsSync(schemaPath), 'schemas/goal-contract.schema.json must exist');
      const schemaText = readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaText);
      assert.strictEqual(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
      assert.strictEqual(schema.$id, 'https://soda.dev/schemas/goal-contract.schema.json');
      assert.ok(schema.$defs, 'Draft 2020-12 schema must define $defs');
      for (const p of GOAL_PROFILES) {
        assert.ok(schema.$defs[p], `Draft 2020-12 schema missing $defs.${p}`);
      }
    });
  });
});

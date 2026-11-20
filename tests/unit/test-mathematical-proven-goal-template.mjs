import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseContractFromGoal,
  validateGoalContract,
  MATHEMATICAL_DOMAINS,
  INVARIANT_KINDS,
  CANONICAL_LAWS
} from '../../scripts/lib/goal-contract-schema.mjs';

describe('Mathematical Proven Governance & Formal Verification Goal Template Test Suite', () => {
  const rootTemplatePath = path.join(process.cwd(), 'docs/07-backlog/goals/_template.md');
  const frameworkTemplatePath = path.join(process.cwd(), 'template/docs/07-backlog/goals/_template.md');
  const goalCreationPath = path.join(process.cwd(), '.agents/rules/goal-creation.md');
  const executeGoalPath = path.join(process.cwd(), '.agents/templates/execute-goal.md');
  const schemaJsonPath = path.join(process.cwd(), 'schemas/goal-contract.schema.json');

  it('1. Root and framework templates must exist and maintain 100% bitwise parity', () => {
    assert.ok(fs.existsSync(rootTemplatePath), 'Root _template.md must exist');
    assert.ok(fs.existsSync(frameworkTemplatePath), 'Framework _template.md must exist');
    const rootContent = fs.readFileSync(rootTemplatePath, 'utf8');
    const fwContent = fs.readFileSync(frameworkTemplatePath, 'utf8');
    assert.strictEqual(rootContent, fwContent, 'Root and framework templates must have exact bitwise parity');
  });

  it('2. Goal contract frontmatter must declare mathematical_proven_governance across all 6 domains', () => {
    const content = fs.readFileSync(rootTemplatePath, 'utf8');
    const contract = parseContractFromGoal(content);
    assert.ok(contract.mathematical_proven_governance, 'Must contain mathematical_proven_governance block');

    const mpg = contract.mathematical_proven_governance;
    for (const domain of MATHEMATICAL_DOMAINS) {
      assert.ok(mpg[domain], `Frontmatter must declare domain: ${domain}`);
    }

    // Verify domain 1: invariants and system laws
    const d1 = mpg.invariants_and_system_laws;
    assert.ok(Array.isArray(d1.system_invariants), 'Must declare system_invariants');
    assert.ok(Array.isArray(d1.conservation_laws), 'Must declare conservation_laws');
    assert.ok(Array.isArray(d1.monotonicity_invariants), 'Must declare monotonicity_invariants');
    assert.ok(Array.isArray(d1.state_machine_invariants), 'Must declare state_machine_invariants');
    assert.ok(Array.isArray(d1.idempotency_and_reversibility), 'Must declare idempotency_and_reversibility');
    assert.ok(Array.isArray(d1.solvency_and_non_negativity), 'Must declare solvency_and_non_negativity');

    // Verify domain 2: formal verification & solvers
    const d2 = mpg.formal_verification_and_solvers;
    assert.ok(d2.deductive_proof !== undefined, 'Must declare deductive_proof');
    assert.ok(Array.isArray(d2.smt_sat_solvers), 'Must declare smt_sat_solvers');
    assert.ok(d2.bounded_model_checking, 'Must declare bounded_model_checking');
    assert.ok(d2.symbolic_execution !== undefined, 'Must declare symbolic_execution');
    assert.strictEqual(d2.counterexample_trace_capture, true, 'Must capture counterexample trace');

    // Verify domain 3: harness engineering
    const d3 = mpg.harness_engineering;
    assert.ok(d3.verification_harness_path !== undefined, 'Must declare verification_harness_path');
    assert.ok(Array.isArray(d3.symbolic_allocation), 'Must declare symbolic_allocation');
    assert.ok(Array.isArray(d3.preconditions), 'Must declare preconditions');
    assert.ok(Array.isArray(d3.stubbing_models), 'Must declare stubbing_models');
    assert.ok(d3.shadow_reference_model !== undefined, 'Must declare shadow_reference_model');
    assert.strictEqual(d3.input_shrinking, true, 'Must enable input shrinking');

    // Verify domain 4: adversarial modeling
    const d4 = mpg.adversarial_modeling;
    assert.strictEqual(d4.aliasing_collision_checks, true, 'Must check aliasing collisions');
    assert.ok(Array.isArray(d4.arithmetic_extremes), 'Must test arithmetic extremes');
    assert.strictEqual(d4.precision_dust_exploitation_defense, true, 'Must defend against dust exploitation');
    assert.strictEqual(d4.out_of_order_replay_defense, true, 'Must defend against replay');
    assert.strictEqual(d4.atomicity_rollback_guarantees, true, 'Must guarantee atomicity rollback');

    // Verify domain 5: concurrency and memory models
    const d5 = mpg.concurrency_and_memory_models;
    assert.strictEqual(d5.aba_mitigation, 'tagged_versioned_pointers', 'Must mitigate ABA via tagged pointers');
    assert.strictEqual(d5.compare_and_swap_cas, true, 'Must specify CAS');
    assert.strictEqual(d5.use_after_free_uaf_prevention, 'linear_affine_types', 'Must specify UAF prevention');
    assert.strictEqual(d5.mutual_exclusion, true, 'Must enforce mutual exclusion');
    assert.deepStrictEqual(d5.memory_orderings, ['Acquire', 'Release', 'Relaxed'], 'Must specify memory orderings');
    assert.strictEqual(d5.schedule_sequentialization, true, 'Must enable schedule sequentialization');

    // Verify domain 6: testing paradigms and tooling
    const d6 = mpg.testing_paradigms_and_tooling;
    assert.strictEqual(d6.property_based_testing.engine, 'proptest');
    assert.ok(d6.property_based_testing.iterations >= 10000);
    assert.strictEqual(d6.design_by_contract.preconditions, true);
    assert.strictEqual(d6.design_by_contract.postconditions, true);
    assert.strictEqual(d6.design_by_contract.invariants, true);
    assert.strictEqual(d6.stateful_model_based_testing, true);
    assert.strictEqual(d6.mutation_testing.tool, 'cargo-mutants');
    assert.ok(d6.mutation_testing.min_kill_threshold >= 85);
    assert.strictEqual(d6.code_coverage.mc_dc_required, true);
  });

  it('3. Spec checklist must explicitly mandate all 6 operational domains', () => {
    const content = fs.readFileSync(rootTemplatePath, 'utf8');
    assert.ok(content.includes('Domain 1: Invariants & System Laws formalized'), 'Must check Domain 1');
    assert.ok(content.includes('Domain 2: Formal Verification & Solvers specified'), 'Must check Domain 2');
    assert.ok(content.includes('Domain 3: Harness Engineering & Modeling defined'), 'Must check Domain 3');
    assert.ok(content.includes('Domain 4: Adversarial Modeling & Edge Pathologies defended'), 'Must check Domain 4');
    assert.ok(content.includes('Domain 5: Concurrency, Race Conditions & Memory Models proven'), 'Must check Domain 5');
    assert.ok(content.includes('Domain 6: Advanced Testing Paradigms & Tooling configured'), 'Must check Domain 6');
  });

  it('4. Test plan must specify all 11 test suite tiers including the 6 formal verification domains', () => {
    const content = fs.readFileSync(rootTemplatePath, 'utf8');
    assert.ok(content.includes('### 1. Positive Tests'), 'Tier 1');
    assert.ok(content.includes('### 2. Negative Tests'), 'Tier 2');
    assert.ok(content.includes('### 3. Fail-Closed & Chaos Tests'), 'Tier 3');
    assert.ok(content.includes('### 4. Temporal Causality Tests ($t \\le T$)'), 'Tier 4');
    assert.ok(content.includes('### 5. Security & Air-Gap Checks'), 'Tier 5');
    assert.ok(content.includes('### 6. Invariants & System Laws Verification'), 'Tier 6');
    assert.ok(content.includes('### 7. Formal Verification & Solvers'), 'Tier 7');
    assert.ok(content.includes('### 8. Harness Engineering & Modeling'), 'Tier 8');
    assert.ok(content.includes('### 9. Adversarial Stress & Edge Pathologies'), 'Tier 9');
    assert.ok(content.includes('### 10. Concurrency, Race Conditions & Memory Models'), 'Tier 10');
    assert.ok(content.includes('### 11. Advanced Testing Paradigms & Mutation Testing'), 'Tier 11');
  });

  it('5. Spec Design Appendix must detail the 6 operational domains with mathematical rigor', () => {
    const content = fs.readFileSync(rootTemplatePath, 'utf8');
    assert.ok(content.includes('The 6 Operational Domains of Mathematical Proven Governance & Formal Verification'));
    assert.ok(content.includes('##### Domain 1: Invariants & System Laws'));
    assert.ok(content.includes('##### Domain 2: Formal Verification & Solvers'));
    assert.ok(content.includes('##### Domain 3: Harness Engineering & Modeling'));
    assert.ok(content.includes('##### Domain 4: Adversarial Modeling & Edge Pathologies'));
    assert.ok(content.includes('##### Domain 5: Concurrency, Race Conditions & Memory Models'));
    assert.ok(content.includes('##### Domain 6: Testing Paradigms & Tooling'));

    // Verify key mathematical concepts are explicitly defined
    assert.ok(content.includes('\\forall s \\in \\mathcal{S}_{\\text{reachable}}'));
    assert.ok(content.includes('\\Delta \\text{Supply} = 0'));
    assert.ok(content.includes('f(f(x)) = f(x)'));
    assert.ok(content.includes('g(f(x)) = x'));
    assert.ok(content.includes('Kani Verifier'));
    assert.ok(content.includes('#[kani::unwind'));
    assert.ok(content.includes('kani::any()'));
    assert.ok(content.includes('kani::assume()'));
    assert.ok(content.includes('#[kani::stub]'));
    assert.ok(content.includes('from == to'));
    assert.ok(content.includes('ABA Problem'));
    assert.ok(content.includes('Compare-And-Swap (CAS)'));
    assert.ok(content.includes('Tagged / Versioned Pointers'));
    assert.ok(content.includes('Memory Orderings'));
    assert.ok(content.includes('Mutation Testing'));
    assert.ok(content.includes('MC/DC'));
  });

  it('6. goal-contract-schema.mjs must export MATHEMATICAL_DOMAINS and expanded INVARIANT_KINDS & CANONICAL_LAWS', () => {
    assert.strictEqual(MATHEMATICAL_DOMAINS.length, 6);
    assert.ok(INVARIANT_KINDS.includes('solvency'));
    assert.ok(INVARIANT_KINDS.includes('non_negativity'));
    assert.ok(INVARIANT_KINDS.includes('state_machine'));
    assert.ok(INVARIANT_KINDS.includes('reversibility'));
    assert.ok(INVARIANT_KINDS.includes('aliasing_freedom'));
    assert.ok(INVARIANT_KINDS.includes('mutual_exclusion'));

    assert.ok(CANONICAL_LAWS.includes('reversibility'));
    assert.ok(CANONICAL_LAWS.includes('solvency'));
    assert.ok(CANONICAL_LAWS.includes('non_negativity'));
    assert.ok(CANONICAL_LAWS.includes('aliasing_freedom'));
    assert.ok(CANONICAL_LAWS.includes('mutual_exclusion'));
  });

  it('7. schemas/goal-contract.schema.json must include mathematical_proven_governance definition', () => {
    const raw = fs.readFileSync(schemaJsonPath, 'utf8');
    const schema = JSON.parse(raw);
    assert.ok(schema.properties.mathematical_proven_governance, 'Property must exist');
    assert.ok(schema.$defs.mathematical_proven_governance, 'Definition must exist');
  });

  it('8. goal-creation.md must mandate the 6 formal verification domains', () => {
    const content = fs.readFileSync(goalCreationPath, 'utf8');
    assert.ok(content.includes('10. **Mathematical Proven Governance & Formal Verification Invariant:**'));
    assert.ok(content.includes('Domain 1: Invariants & System Laws formalized'));
    assert.ok(content.includes('### 6. Invariants & System Laws Verification'));
  });

  it('9. execute-goal.md must enforce mathematical and system invariant audits', () => {
    const content = fs.readFileSync(executeGoalPath, 'utf8');
    assert.ok(content.includes('mathematical & system invariant verification'));
    assert.ok(content.includes('formal verification & SMT/solver checks'));
    assert.ok(content.includes('every system invariant is verified by formal proof, solver, or property harness'));
    assert.ok(content.includes('mutation kill threshold >= 85% satisfied'));
  });
});

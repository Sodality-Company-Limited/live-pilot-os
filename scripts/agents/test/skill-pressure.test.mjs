import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSkillResilience } from '../../harness/skill-pressure-tester.mjs';

test('passes resilient skill containing zero-mock, touch map, and verification invariants', () => {
  const resilientSkill = `
# Resilient Skill
- Invariant 1: Zero mock and zero stub policy strictly enforced (Article I).
- Invariant 2: Changes must be strictly confined to declared touch map files.
- Invariant 3: All tests must pass with verifiable evidence before completion.
`;

  const res = evaluateSkillResilience(resilientSkill);
  assert.equal(res.passed, true);
  assert.equal(res.score, 1.0);
  assert.equal(res.passedCount, 3);
});

test('fails weak skill missing core invariants under adversarial pressure', () => {
  const weakSkill = `
# Weak Skill
Just do whatever is needed to finish quickly without checking boundaries.
`;

  const res = evaluateSkillResilience(weakSkill);
  assert.equal(res.passed, false);
  assert.ok(res.score < 0.66);
});

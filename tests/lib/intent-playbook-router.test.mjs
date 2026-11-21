import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTaskIntent,
  rankSkillCandidates,
  generateBddSkeleton
} from '../../scripts/lib/intent-playbook-router.mjs';

const MOCK_SKILLS_REGISTRY = [
  {
    name: 'soda-runtime-trace-forensics',
    description: 'Diagnostic runtime trace forensics, V8 CPU profiling, and heap snapshot analysis.',
    triggers: ['trace forensics', 'v8 profile', 'cpu profile', 'heap snapshot', 'memory leak']
  },
  {
    name: 'soda-anti-slop-review',
    description: 'Radical brevity, zero conversational filler, and AST linting.',
    triggers: ['anti-slop', 'unslop', 'clean comments', 'slop linter']
  },
  {
    name: 'soda-metric-hillclimb',
    description: 'Scientific hypothesis-driven performance optimization and benchmark delta verification.',
    triggers: ['hillclimb', 'optimize benchmark', 'performance hillclimb', 'metric improvement']
  }
];

test('Intent Playbook Router: classifyTaskIntent matches relevant skill with high confidence', () => {
  const prompt = 'Please inspect the heap snapshot and analyze memory leaks in the Node.js process.';
  const result = classifyTaskIntent(prompt, MOCK_SKILLS_REGISTRY);

  assert.equal(result.status, 'matched');
  assert.ok(result.matches.length > 0);
  assert.equal(result.matches[0].skillName, 'soda-runtime-trace-forensics');
  assert.ok(result.matches[0].confidenceBasisPoints >= 4000);
});

test('Intent Playbook Router: Deterministic Intent Classification Invariant (INV-046-001) holds', () => {
  const prompt = 'Run metric hillclimb on the payment calculator benchmark.';
  const r1 = classifyTaskIntent(prompt, MOCK_SKILLS_REGISTRY);
  const r2 = classifyTaskIntent(prompt, MOCK_SKILLS_REGISTRY);

  assert.deepEqual(r1, r2);
});

test('Intent Playbook Router: Monotonic Confidence Ranking Invariant (INV-046-002) holds', () => {
  const prompt = 'Trace memory leak and optimize benchmark performance with anti-slop review.';
  const result = classifyTaskIntent(prompt, MOCK_SKILLS_REGISTRY);

  for (let i = 0; i < result.matches.length - 1; i++) {
    assert.ok(result.matches[i].confidenceBasisPoints >= result.matches[i + 1].confidenceBasisPoints);
  }
});

test('Intent Playbook Router: Unmatched intent falls back cleanly', () => {
  const prompt = 'What is the recipe for chocolate chip cookies?';
  const result = classifyTaskIntent(prompt, MOCK_SKILLS_REGISTRY);

  assert.equal(result.status, 'unmatched');
  assert.equal(result.matches.length, 0);
});

test('Intent Playbook Router: generateBddSkeleton emits executable Given-When-Then specification', () => {
  const prompt = 'Inspect heap snapshot and isolate memory leak';
  const match = {
    skillName: 'soda-runtime-trace-forensics',
    confidenceBasisPoints: 8500
  };

  const bdd = generateBddSkeleton(prompt, match);
  assert.ok(bdd.includes('Feature: Autonomous Execution of soda-runtime-trace-forensics'));
  assert.ok(bdd.includes('Scenario:'));
  assert.ok(bdd.includes('Given user intent: "Inspect heap snapshot and isolate memory leak"'));
  assert.ok(bdd.includes('When routed to skill `soda-runtime-trace-forensics` with confidence 8500 bp'));
  assert.ok(bdd.includes('Then execution proceeds with zero mocks and verified invariants.'));
});

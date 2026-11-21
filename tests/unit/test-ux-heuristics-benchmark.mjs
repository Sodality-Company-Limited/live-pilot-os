/**
 * Unit Test Suite for Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark.
 * Verifies 1,200 curated scenarios, Nielsen 10 coverage, WCAG AAA criteria,
 * 0-4 severity scale, and multimodal evaluation rationale.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHeuristicsBenchmark,
  NIELSEN_HEURISTICS,
  WCAG_AAA_CRITERIA
} from '../../scripts/lib/ux-heuristics-benchmark.mjs';

test('HeuristicsBenchmark: Generates 1,200 scenarios with verified partitions', () => {
  const result = generateHeuristicsBenchmark({
    total_scenarios: 1200,
    write_files: false,
    seed: 42
  });

  assert.equal(result.scenarios.length, 1200);
  assert.equal(result.summary.total_scenarios, 1200);

  const nielsenScenarios = result.scenarios.filter(s => s.category === 'nielsen');
  const wcagScenarios = result.scenarios.filter(s => s.category === 'wcag_aaa');
  const cleanScenarios = result.scenarios.filter(s => s.category === 'clean');

  assert.equal(nielsenScenarios.length, 600);
  assert.equal(wcagScenarios.length, 420);
  assert.equal(cleanScenarios.length, 180);
});

test('HeuristicsBenchmark: Complete coverage of all 10 Nielsen heuristics', () => {
  const result = generateHeuristicsBenchmark({
    total_scenarios: 200,
    write_files: false,
    seed: 42
  });

  const presentHeuristics = new Set(
    result.scenarios.filter(s => s.category === 'nielsen').map(s => s.heuristic_id)
  );

  for (const hId of Object.keys(NIELSEN_HEURISTICS)) {
    assert.ok(presentHeuristics.has(hId), `Nielsen heuristic ${hId} must be represented in benchmark`);
  }
});

test('HeuristicsBenchmark: WCAG 2.2 AAA criteria and severity bounds', () => {
  const result = generateHeuristicsBenchmark({
    total_scenarios: 100,
    write_files: false,
    seed: 42
  });

  for (const s of result.scenarios) {
    assert.ok(s.severity >= 0 && s.severity <= 4, `Severity must be in [0, 4] (got ${s.severity})`);
    assert.ok(typeof s.evaluation_rationale === 'string' && s.evaluation_rationale.length > 0);
    if (s.violates_invariant) {
      assert.ok(typeof s.suggested_fix === 'string' && s.suggested_fix.length > 0);
    } else {
      assert.equal(s.severity, 0);
      assert.equal(s.suggested_fix, null);
    }
  }
});

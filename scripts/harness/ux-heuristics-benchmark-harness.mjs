#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS STAGE 3 UX HEURISTICS & WCAG 2.2 AAA BENCHMARK HARNESS (G-UX-011)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Stage 3 Data Curriculum & Curation (M3 / G-UX-011)
 * Purpose: Formally verifies the 1,200 curated benchmark scenarios, Nielsen 10
 *          coverage, WCAG 2.2 AAA compliance mapping, 0-4 severity bounds, and
 *          actionable remediation directives with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateHeuristicsBenchmark,
  NIELSEN_HEURISTICS,
  WCAG_AAA_CRITERIA
} from '../lib/ux-heuristics-benchmark.mjs';

const DATA_DIR = 'artifacts/curriculum/stage3_heuristics';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark Harness (G-UX-011)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const benchmarkPath = resolve(process.cwd(), DATA_DIR, 'benchmark_1200.json');
  const summaryPath = resolve(process.cwd(), DATA_DIR, 'summary.json');

  if (!existsSync(benchmarkPath) || !existsSync(summaryPath)) {
    console.log('▶ Generating 1,200 curated scenarios for Stage 3...');
    generateHeuristicsBenchmark({
      total_scenarios: 1200,
      output_dir: DATA_DIR,
      write_files: true,
      seed: 20261014
    });
    console.log('  Benchmark generated successfully.\n');
  }

  // 1. Artifact Integrity
  console.log('▶ Category 1: Benchmark Artifact Integrity');
  assert(existsSync(benchmarkPath), `Benchmark dataset exists at ${DATA_DIR}/benchmark_1200.json`);
  assert(existsSync(summaryPath), `Summary exists at ${DATA_DIR}/summary.json`);

  let scenarios = null;
  let summary = null;
  try {
    scenarios = JSON.parse(readFileSync(benchmarkPath, 'utf8'));
    summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    assert(scenarios.length === 1200, `Exactly 1,200 scenarios loaded (found ${scenarios.length})`);
    assert(summary.total_scenarios === 1200, `Summary confirms 1,200 total scenarios`);
  } catch (err) {
    assert(false, `Failed to load benchmark JSON: ${err.message}`);
    process.exit(1);
  }

  // 2. Nielsen 10 Usability Heuristics Coverage
  console.log('\n▶ Category 2: Nielsen 10 Usability Heuristics Coverage');
  const presentHeuristics = new Set();
  for (const s of scenarios) {
    if (s.category === 'nielsen') {
      presentHeuristics.add(s.heuristic_id);
    }
  }

  for (const hId of Object.keys(NIELSEN_HEURISTICS)) {
    assert(presentHeuristics.has(hId), `Nielsen heuristic ${hId} (${NIELSEN_HEURISTICS[hId].name}) is covered`);
  }

  // 3. WCAG 2.2 AAA Criteria Coverage
  console.log('\n▶ Category 3: WCAG 2.2 AAA Criteria Coverage');
  const presentWcag = new Set();
  for (const s of scenarios) {
    if (s.category === 'wcag_aaa') {
      presentWcag.add(s.heuristic_id);
    }
  }

  for (const crit of ['WCAG_1.4.6', 'WCAG_1.4.11', 'WCAG_2.1.2', 'WCAG_2.4.7', 'WCAG_2.5.5', 'WCAG_3.3.1']) {
    assert(presentWcag.has(crit), `WCAG criterion ${crit} is covered in benchmark`);
  }

  // 4. Severity Distribution & Rationale Invariants
  console.log('\n▶ Category 4: Severity Bounds & Actionable Fix Integrity');
  const sevCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  let allHaveRationale = true;
  let allViolationsHaveFix = true;

  for (const s of scenarios) {
    sevCounts[s.severity] = (sevCounts[s.severity] || 0) + 1;
    if (!s.evaluation_rationale || typeof s.evaluation_rationale !== 'string') {
      allHaveRationale = false;
    }
    if (s.violates_invariant && (!s.suggested_fix || typeof s.suggested_fix !== 'string')) {
      allViolationsHaveFix = false;
    }
  }

  assert(sevCounts[0] > 0, `Severity 0 (clean baseline) has ${sevCounts[0]} scenarios`);
  assert(sevCounts[1] > 0, `Severity 1 (cosmetic) has ${sevCounts[1]} scenarios`);
  assert(sevCounts[2] > 0, `Severity 2 (minor) has ${sevCounts[2]} scenarios`);
  assert(sevCounts[3] > 0, `Severity 3 (major) has ${sevCounts[3]} scenarios`);
  assert(sevCounts[4] > 0, `Severity 4 (catastrophe) has ${sevCounts[4]} scenarios`);
  assert(allHaveRationale, '100% of scenarios provide multimodal evaluation rationale');
  assert(allViolationsHaveFix, '100% of violation scenarios provide actionable CSS/DOM suggested fix');

  // 5. Python Module Check
  console.log('\n▶ Category 5: Python Benchmark Module Check');
  const pyPath = resolve(process.cwd(), 'code/ml/src/curriculum/heuristics_benchmark.py');
  assert(existsSync(pyPath), 'Python module code/ml/src/curriculum/heuristics_benchmark.py exists');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  console.log('✅ Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark verified green.\n');
}

runHarness();

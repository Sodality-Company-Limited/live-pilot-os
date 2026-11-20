#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL STRESS TEST SUITE: MILESTONE 3 (G-UX-009, G-UX-010, G-UX-011)
 * ════════════════════════════════════════════════════════════════════════════════
 * Author: challenger_wave3_1 (Empirical Challenger)
 * Scope:
 *   - G-UX-009: UI Taxonomy & Standard Labeling Specification
 *   - G-UX-010: UI Scene Graph Pairs Dataset Pipeline (5,000 records, 80/10/10 split)
 *   - G-UX-011: UX Heuristics & WCAG 2.2 AAA Benchmark (1,200 curated scenarios)
 * Invariants: Zero mocks, zero stubs, 100% concrete operational logic.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// G-UX-009 Imports
import {
  UI_TAXONOMY_SCHEMA_VERSION,
  UI_TAXONOMY_VERSION,
  CATEGORIES,
  INTERACTION_STATES,
  CANONICAL_ELEMENTS,
  WCAG_TOUCH_TARGETS,
  validateElementLabel,
  getTaxonomyDefinition,
  listTaxonomyClasses,
  listTaxonomyCategories,
  getClassesByCategory,
  isInteractive,
  getTaxonomySpecificationJson
} from '../../scripts/lib/ui-taxonomy.mjs';

// G-UX-010 Imports
import {
  SCENE_TYPES,
  THEMES,
  VIEWPORTS,
  createRng,
  generateSceneGraphRecord,
  generateSceneGraphDataset
} from '../../scripts/lib/scene-graph-dataset-generator.mjs';

import {
  kahnTopologicalSort,
  CyclicSceneGraphError,
  computeGraphDigest,
  synthesizeSceneGraph,
  validateSceneGraph
} from '../../scripts/lib/ui-scene-graph.mjs';

// G-UX-011 Imports
import {
  NIELSEN_HEURISTICS,
  WCAG_AAA_CRITERIA,
  generateHeuristicsBenchmark
} from '../../scripts/lib/ux-heuristics-benchmark.mjs';

function readJsonl(filePath) {
  const absPath = resolve(process.cwd(), filePath);
  const content = readFileSync(absPath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1: DATASET SPLIT LEAKAGE & PARTITION INVARIANCE (G-UX-010)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Suite 1: Dataset Split Leakage & Partition Invariance (G-UX-010)', () => {
  const trainPath = 'artifacts/curriculum/stage2_scene_graphs/train.jsonl';
  const valPath = 'artifacts/curriculum/stage2_scene_graphs/val.jsonl';
  const testPath = 'artifacts/curriculum/stage2_scene_graphs/test.jsonl';
  const manifestPath = 'artifacts/curriculum/stage2_scene_graphs/manifest.json';

  it('verifies dataset files exist and manifest integrity', () => {
    assert.ok(existsSync(resolve(process.cwd(), trainPath)), 'train.jsonl must exist');
    assert.ok(existsSync(resolve(process.cwd(), valPath)), 'val.jsonl must exist');
    assert.ok(existsSync(resolve(process.cwd(), testPath)), 'test.jsonl must exist');
    assert.ok(existsSync(resolve(process.cwd(), manifestPath)), 'manifest.json must exist');

    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), manifestPath), 'utf8'));
    assert.equal(manifest.total_records, 5000, 'Manifest must specify exactly 5,000 total records');
    assert.equal(manifest.splits.train.count, 4000, 'Train split count must be 4,000');
    assert.equal(manifest.splits.validation.count, 500, 'Val split count must be 500');
    assert.equal(manifest.splits.test.count, 500, 'Test split count must be 500');
    assert.equal(manifest.zero_leakage_verified, true, 'Manifest must confirm zero_leakage_verified');
  });

  it('asserts exact 80/10/10 partition sizes across all 5,000 records', () => {
    const train = readJsonl(trainPath);
    const val = readJsonl(valPath);
    const test = readJsonl(testPath);

    assert.equal(train.length, 4000, 'Train split must contain exactly 4,000 records');
    assert.equal(val.length, 500, 'Validation split must contain exactly 500 records');
    assert.equal(test.length, 500, 'Test split must contain exactly 500 records');
    assert.equal(train.length + val.length + test.length, 5000, 'Sum of splits must equal 5,000');
  });

  it('asserts mathematical pairwise disjointness of record IDs (Train ∩ Val = ∅, Train ∩ Test = ∅, Val ∩ Test = ∅)', () => {
    const train = readJsonl(trainPath);
    const val = readJsonl(valPath);
    const test = readJsonl(testPath);

    const trainIds = new Set(train.map(r => r.record_id));
    const valIds = new Set(val.map(r => r.record_id));
    const testIds = new Set(test.map(r => r.record_id));

    assert.equal(trainIds.size, 4000, 'Train must contain 4,000 distinct record IDs');
    assert.equal(valIds.size, 500, 'Val must contain 500 distinct record IDs');
    assert.equal(testIds.size, 500, 'Test must contain 500 distinct record IDs');

    // Check intersections
    const trainValIntersection = [...trainIds].filter(id => valIds.has(id));
    const trainTestIntersection = [...trainIds].filter(id => testIds.has(id));
    const valTestIntersection = [...valIds].filter(id => testIds.has(id));

    assert.equal(trainValIntersection.length, 0, `Leakage detected between train and val: ${trainValIntersection.join(',')}`);
    assert.equal(trainTestIntersection.length, 0, `Leakage detected between train and test: ${trainTestIntersection.join(',')}`);
    assert.equal(valTestIntersection.length, 0, `Leakage detected between val and test: ${valTestIntersection.join(',')}`);
  });

  it('asserts mathematical pairwise disjointness of SHA-256 graph digests', () => {
    const train = readJsonl(trainPath);
    const val = readJsonl(valPath);
    const test = readJsonl(testPath);

    const trainDigests = new Set(train.map(r => r.sha256_digest));
    const valDigests = new Set(val.map(r => r.sha256_digest));
    const testDigests = new Set(test.map(r => r.sha256_digest));

    assert.equal(trainDigests.size, 4000, 'Train must contain 4,000 unique digests');
    assert.equal(valDigests.size, 500, 'Val must contain 500 unique digests');
    assert.equal(testDigests.size, 500, 'Test must contain 500 unique digests');

    const trainValDigests = [...trainDigests].filter(d => valDigests.has(d));
    const trainTestDigests = [...trainDigests].filter(d => testDigests.has(d));
    const valTestDigests = [...valDigests].filter(d => testDigests.has(d));

    assert.equal(trainValDigests.length, 0, 'Graph digest collision between train and val');
    assert.equal(trainTestDigests.length, 0, 'Graph digest collision between train and test');
    assert.equal(valTestDigests.length, 0, 'Graph digest collision between val and test');
  });

  it('asserts strict multi-viewport distribution (40% desktop, 30% tablet, 30% mobile)', () => {
    const allRecords = [
      ...readJsonl(trainPath),
      ...readJsonl(valPath),
      ...readJsonl(testPath)
    ];

    const vpCounts = { desktop: 0, tablet: 0, mobile: 0 };
    for (const r of allRecords) {
      assert.ok(r.viewport && r.viewport.name, 'Record must declare viewport name');
      assert.ok(r.viewport.name in vpCounts, `Unknown viewport name: ${r.viewport.name}`);
      vpCounts[r.viewport.name]++;
    }

    assert.equal(vpCounts.desktop, 2000, 'Desktop viewport must account for 2,000 records (40%)');
    assert.equal(vpCounts.tablet, 1500, 'Tablet viewport must account for 1,500 records (30%)');
    assert.equal(vpCounts.mobile, 1500, 'Mobile viewport must account for 1,500 records (30%)');
  });

  it('asserts sequential monotonic record ID formatting across 5,000 records', () => {
    const allRecords = [
      ...readJsonl(trainPath),
      ...readJsonl(valPath),
      ...readJsonl(testPath)
    ];

    for (let i = 0; i < 5000; i++) {
      const expectedId = `SG-PAIR-${String(i + 1).padStart(6, '0')}`;
      assert.equal(allRecords[i].record_id, expectedId, `Record index ${i} ID mismatch`);
      assert.equal(allRecords[i].is_acyclic, true, 'Every record must declare is_acyclic: true');
      assert.ok(allRecords[i].sha256_digest && allRecords[i].sha256_digest.length === 64, 'Digest must be 64-char hex');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2: KAHN DAG ACYCLICITY EXHAUSTION & CYCLE GATING (G-UX-010)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Suite 2: Kahn DAG Acyclicity Exhaustion & Cycle Gating (G-UX-010)', () => {
  it('exhaustively runs Kahn topological sorting across 500 sampled scene graphs with 0 cycles', () => {
    const allRecords = [
      ...readJsonl('artifacts/curriculum/stage2_scene_graphs/train.jsonl'),
      ...readJsonl('artifacts/curriculum/stage2_scene_graphs/val.jsonl'),
      ...readJsonl('artifacts/curriculum/stage2_scene_graphs/test.jsonl')
    ];

    // Seeded selection of 500 records
    const rng = createRng(20261014);
    const sampleIndices = new Set();
    while (sampleIndices.size < 500) {
      const idx = Math.floor(rng() * allRecords.length);
      sampleIndices.add(idx);
    }

    for (const idx of sampleIndices) {
      const record = allRecords[idx];
      const sg = record.scene_graph;

      const nodesDict = {};
      for (const n of sg.nodes) {
        nodesDict[n.node_id] = n;
      }

      // Must execute without throwing CyclicSceneGraphError
      const order = kahnTopologicalSort(nodesDict, sg.edges);
      assert.equal(order.length, sg.nodes.length, `Topological order must contain all ${sg.nodes.length} nodes`);

      // validateSceneGraph must pass
      const validation = validateSceneGraph(sg);
      assert.equal(validation.valid, true, `Scene graph ${record.graph_id} must be valid: ${validation.errors.join(',')}`);
    }
  });

  it('adversarially throws CyclicSceneGraphError on self-loop (A -> A)', () => {
    const nodesDict = {
      node_root: {
        node_id: 'node_root',
        component_type: 'ScreenRoot',
        z_index: 0,
        bbox_normalized: [0, 0, 1000, 1000]
      }
    };
    const edges = [
      { source: 'node_root', target: 'node_root', relationship: 'parent_child' }
    ];

    assert.throws(
      () => kahnTopologicalSort(nodesDict, edges),
      (err) => {
        assert.ok(err instanceof CyclicSceneGraphError, 'Error must be CyclicSceneGraphError');
        assert.deepEqual(err.cycleNodes, ['node_root']);
        return true;
      }
    );
  });

  it('adversarially throws CyclicSceneGraphError on 2-node cycle (A -> B -> A)', () => {
    const nodesDict = {
      node_a: { node_id: 'node_a', component_type: 'ScreenRoot', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
      node_b: { node_id: 'node_b', component_type: 'CardContainer', z_index: 1, bbox_normalized: [100, 100, 500, 500] }
    };
    const edges = [
      { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
      { source: 'node_b', target: 'node_a', relationship: 'visual_containment' }
    ];

    assert.throws(
      () => kahnTopologicalSort(nodesDict, edges),
      (err) => {
        assert.ok(err instanceof CyclicSceneGraphError);
        assert.ok(err.cycleNodes.includes('node_a'));
        assert.ok(err.cycleNodes.includes('node_b'));
        return true;
      }
    );
  });

  it('adversarially throws CyclicSceneGraphError on 3-node cycle (A -> B -> C -> A)', () => {
    const nodesDict = {
      node_a: { node_id: 'node_a', component_type: 'ScreenRoot', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
      node_b: { node_id: 'node_b', component_type: 'CardContainer', z_index: 1, bbox_normalized: [100, 100, 500, 500] },
      node_c: { node_id: 'node_c', component_type: 'PrimaryButton', z_index: 2, bbox_normalized: [150, 150, 200, 50] }
    };
    const edges = [
      { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
      { source: 'node_b', target: 'node_c', relationship: 'parent_child' },
      { source: 'node_c', target: 'node_a', relationship: 'z_index_layer' }
    ];

    assert.throws(
      () => kahnTopologicalSort(nodesDict, edges),
      (err) => {
        assert.ok(err instanceof CyclicSceneGraphError);
        assert.equal(err.cycleNodes.length, 3);
        return true;
      }
    );
  });

  it('adversarially detects disconnected sub-cycle alongside valid DAG branch', () => {
    const nodesDict = {
      node_root: { node_id: 'node_root', component_type: 'ScreenRoot', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
      node_child: { node_id: 'node_child', component_type: 'HeaderBar', z_index: 1, bbox_normalized: [0, 0, 1000, 64] },
      node_x: { node_id: 'node_x', component_type: 'CardContainer', z_index: 5, bbox_normalized: [100, 100, 300, 300] },
      node_y: { node_id: 'node_y', component_type: 'PrimaryButton', z_index: 6, bbox_normalized: [120, 120, 100, 44] }
    };
    const edges = [
      { source: 'node_root', target: 'node_child', relationship: 'parent_child' },
      { source: 'node_x', target: 'node_y', relationship: 'parent_child' },
      { source: 'node_y', target: 'node_x', relationship: 'visual_containment' }
    ];

    assert.throws(
      () => kahnTopologicalSort(nodesDict, edges),
      (err) => {
        assert.ok(err instanceof CyclicSceneGraphError);
        assert.ok(err.cycleNodes.includes('node_x'));
        assert.ok(err.cycleNodes.includes('node_y'));
        assert.ok(!err.cycleNodes.includes('node_root'), 'Root must have been visited before stall');
        return true;
      }
    );
  });

  it('permits lateral sibling edges without cycle false positives', () => {
    const nodesDict = {
      node_root: { node_id: 'node_root', component_type: 'ScreenRoot', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
      node_b1: { node_id: 'node_b1', component_type: 'PrimaryButton', z_index: 1, bbox_normalized: [10, 10, 100, 44] },
      node_b2: { node_id: 'node_b2', component_type: 'SecondaryButton', z_index: 1, bbox_normalized: [120, 10, 100, 44] }
    };
    const edges = [
      { source: 'node_root', target: 'node_b1', relationship: 'parent_child' },
      { source: 'node_root', target: 'node_b2', relationship: 'parent_child' },
      // Lateral sibling relations (bidirectional)
      { source: 'node_b1', target: 'node_b2', relationship: 'sibling' },
      { source: 'node_b2', target: 'node_b1', relationship: 'sibling' }
    ];

    const order = kahnTopologicalSort(nodesDict, edges);
    assert.equal(order.length, 3, 'Sibling bidirectional edges must NOT block topological sort');
    assert.equal(order[0], 'node_root', 'Root must be first');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3: COHEN'S KAPPA & HEURISTICS BENCHMARK BOUNDARY FUZZING (G-UX-011)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Suite 3: Cohen's Kappa & Heuristics Benchmark Boundary Fuzzing (G-UX-011)", () => {
  const benchPath = 'artifacts/curriculum/stage3_heuristics/benchmark_1200.json';
  const summaryPath = 'artifacts/curriculum/stage3_heuristics/summary.json';

  it('asserts benchmark artifact completeness and exact 1,200 scenarios', () => {
    assert.ok(existsSync(resolve(process.cwd(), benchPath)), 'benchmark_1200.json must exist');
    assert.ok(existsSync(resolve(process.cwd(), summaryPath)), 'summary.json must exist');

    const scenarios = JSON.parse(readFileSync(resolve(process.cwd(), benchPath), 'utf8'));
    assert.equal(scenarios.length, 1200, 'Must contain exactly 1,200 scenarios');

    const summary = JSON.parse(readFileSync(resolve(process.cwd(), summaryPath), 'utf8'));
    assert.equal(summary.total_scenarios, 1200);
    assert.equal(summary.category_distribution.nielsen, 600);
    assert.equal(summary.category_distribution.wcag_aaa, 420);
    assert.equal(summary.category_distribution.clean, 180);
  });

  it('asserts all 10 Nielsen heuristics and all 6 core WCAG criteria are represented', () => {
    const scenarios = JSON.parse(readFileSync(resolve(process.cwd(), benchPath), 'utf8'));
    const heuristicCounts = {};
    for (const s of scenarios) {
      heuristicCounts[s.heuristic_id] = (heuristicCounts[s.heuristic_id] || 0) + 1;
    }

    // All 10 Nielsen heuristics (60 scenarios each)
    for (const hId of Object.keys(NIELSEN_HEURISTICS)) {
      assert.equal(heuristicCounts[hId], 60, `Nielsen heuristic ${hId} must have exactly 60 scenarios`);
    }

    // 6 core WCAG criteria (70 scenarios each = 420 total)
    const expectedWcagCriteria = [
      'WCAG_1.4.6',
      'WCAG_1.4.11',
      'WCAG_2.1.2',
      'WCAG_2.4.7',
      'WCAG_2.5.5',
      'WCAG_3.3.1'
    ];
    for (const wId of expectedWcagCriteria) {
      assert.equal(heuristicCounts[wId], 70, `WCAG criterion ${wId} must have exactly 70 scenarios`);
      assert.ok(WCAG_AAA_CRITERIA[wId], `WCAG criterion ${wId} must be in WCAG_AAA_CRITERIA dictionary`);
    }

    // Clean baseline (180 scenarios)
    assert.equal(heuristicCounts['PASSING'], 180, 'PASSING baseline must have 180 scenarios');
  });

  it('asserts 100% of scenarios provide non-empty rationales and violations provide suggested fixes', () => {
    const scenarios = JSON.parse(readFileSync(resolve(process.cwd(), benchPath), 'utf8'));
    const seenIds = new Set();

    for (const s of scenarios) {
      assert.ok(!seenIds.has(s.scenario_id), `Duplicate scenario ID: ${s.scenario_id}`);
      seenIds.add(s.scenario_id);

      assert.ok(typeof s.evaluation_rationale === 'string' && s.evaluation_rationale.trim().length > 0,
        `Empty evaluation_rationale in ${s.scenario_id}`);

      assert.ok([0, 1, 2, 3, 4].includes(s.severity), `Invalid severity ${s.severity} in ${s.scenario_id}`);

      if (s.violates_invariant) {
        assert.ok(s.severity > 0, `Violation scenario ${s.scenario_id} must have severity > 0`);
        assert.ok(typeof s.suggested_fix === 'string' && s.suggested_fix.trim().length > 0,
          `Missing suggested_fix in violation ${s.scenario_id}`);
      } else {
        assert.equal(s.severity, 0, `Clean scenario ${s.scenario_id} must have severity 0`);
        assert.equal(s.category, 'clean', `Clean scenario ${s.scenario_id} must be in 'clean' category`);
      }
    }
  });

  it("fuzzes Cohen's Kappa agreement engine across boundary conditions via Python py310", () => {
    const pythonScript = `
import sys, json
sys.path.insert(0, "code/ml")
from src.curriculum.heuristics_benchmark import HeuristicsBenchmark

bench = HeuristicsBenchmark("${benchPath}")
gt = [s.severity for s in bench]

# 1. Perfect agreement
res_perfect = bench.compute_agreement(gt)
assert res_perfect["accuracy"] == 1.0
assert res_perfect["cohens_kappa"] == 1.0

# 2. Constant zeros
res_zeros = bench.compute_agreement([0] * len(gt))
assert res_zeros["accuracy"] == 180 / 1200
assert abs(res_zeros["cohens_kappa"] - 0.0) < 1e-6

# 3. Derangement (0 matches)
deranged = [(s + 1) % 5 for s in gt]
res_deranged = bench.compute_agreement(deranged)
assert res_deranged["accuracy"] == 0.0
assert res_deranged["cohens_kappa"] < 0.0

# 4. Out of bounds handled
res_oob = bench.compute_agreement([99] * len(gt))
assert res_oob["accuracy"] == 0.0

print(json.dumps({"perfect_kappa": res_perfect["cohens_kappa"], "deranged_kappa": res_deranged["cohens_kappa"]}))
`;

    const stdout = execFileSync('/opt/anaconda3/envs/py310/bin/python', ['-c', pythonScript], {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    const parsed = JSON.parse(stdout.trim());
    assert.equal(parsed.perfect_kappa, 1.0, 'Perfect agreement must yield kappa == 1.0');
    assert.ok(parsed.deranged_kappa < 0.0, 'Deranged agreement must yield strictly negative kappa');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4: UI TAXONOMY & INTEGER GRID FUZZING (G-UX-009)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Suite 4: UI Taxonomy & Integer Grid Fuzzing (G-UX-009)', () => {
  it('asserts 32 canonical classes and category element count invariants', () => {
    const classes = listTaxonomyClasses();
    assert.equal(classes.length, 32, 'Must declare exactly 32 canonical classes');

    const categories = listTaxonomyCategories();
    assert.equal(categories.length, 6, 'Must declare exactly 6 functional categories');

    assert.equal(getClassesByCategory('container').length, 8);
    assert.equal(getClassesByCategory('control').length, 7);
    assert.equal(getClassesByCategory('input').length, 6);
    assert.equal(getClassesByCategory('display').length, 5);
    assert.equal(getClassesByCategory('data_feedback').length, 3);
    assert.equal(getClassesByCategory('navigation').length, 3);
  });

  it('rejects non-object or null input fail-closed', () => {
    assert.equal(validateElementLabel(null).valid, false);
    assert.equal(validateElementLabel(undefined).valid, false);
    assert.equal(validateElementLabel('string').valid, false);
    assert.equal(validateElementLabel(12345).valid, false);
  });

  it('rejects unknown component classes fail-closed', () => {
    const res = validateElementLabel({ component_type: 'FakeUnicornButton' });
    assert.equal(res.valid, false);
    assert.ok(res.errors[0].includes('Unknown component class'));
  });

  it('rejects category mismatch fail-closed', () => {
    const res = validateElementLabel({
      component_type: 'PrimaryButton',
      category: 'container'
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors[0].includes('Category mismatch'));
  });

  it('rejects disallowed interaction states fail-closed', () => {
    const res = validateElementLabel({
      component_type: 'ScreenRoot',
      interaction_state: 'loading'
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors[0].includes('not supported for class'));
  });

  it('rejects disallowed ARIA roles fail-closed', () => {
    const res = validateElementLabel({
      component_type: 'PrimaryButton',
      aria: { role: 'navigation' }
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors[0].includes('ARIA role'));
  });

  it('rejects interactive elements below WCAG 44x44px touch target standard', () => {
    const res = validateElementLabel({
      component_type: 'IconButton',
      bbox: [10, 10, 24, 24]
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors[0].includes('Touch target size [24x24px] is below minimum standard'));
  });

  it('allows non-interactive elements below 44x44px touch target without error', () => {
    const res = validateElementLabel({
      component_type: 'IconGlyph',
      category: 'display',
      interaction_state: 'default',
      bbox: [10, 10, 16, 16]
    });
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  it('exports taxonomy specification JSON adhering to Draft 2020-12 schema', () => {
    const spec = getTaxonomySpecificationJson();
    assert.equal(spec.schema_version, 1);
    assert.equal(spec.taxonomy_version, '1.0.0');
    assert.equal(Object.keys(spec.elements).length, 32);
    assert.equal(Object.keys(spec.categories).length, 6);
    assert.equal(spec.interaction_states.length, 7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 5: DUAL-LANGUAGE CROSS-STACK PARITY FUZZING (NODE.JS vs PYTHON PY310)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Suite 5: Dual-Language Cross-Stack Parity Fuzzing', () => {
  it('asserts 100% bitwise parity on class names and categories between Node and Python', () => {
    const pythonScript = `
import sys, json
sys.path.insert(0, "code/ml")
from src.curriculum.taxonomy import list_taxonomy_classes, list_taxonomy_categories

classes = list_taxonomy_classes()
categories = list_taxonomy_categories()
print(json.dumps({"classes": sorted(classes), "categories": sorted(categories)}))
`;

    const stdout = execFileSync('/opt/anaconda3/envs/py310/bin/python', ['-c', pythonScript], {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    const pyData = JSON.parse(stdout.trim());
    const nodeClasses = [...listTaxonomyClasses()].sort();
    const nodeCategories = [...listTaxonomyCategories()].sort();

    assert.deepEqual(nodeClasses, pyData.classes, 'Taxonomy classes must match with 100% parity');
    assert.deepEqual(nodeCategories, pyData.categories, 'Categories must match with 100% parity');
  });

  it('asserts identical validation verdicts across 10 randomized adversarial payloads', () => {
    const testPayloads = [
      { component_type: 'PrimaryButton', category: 'control', interaction_state: 'default', bbox: [0, 0, 100, 44] },
      { component_type: 'PrimaryButton', category: 'container', interaction_state: 'default' },
      { component_type: 'ScreenRoot', category: 'container', interaction_state: 'loading' },
      { component_type: 'NonExistentClass' },
      { component_type: 'IconButton', category: 'control', bbox: [0, 0, 16, 16] },
      { component_type: 'HeadingTypography', category: 'display', bbox: [0, 0, 200, 32] },
      { component_type: 'TextInputField', category: 'input', interaction_state: 'focus', bbox: [0, 0, 300, 48] },
      { component_type: 'SwitchToggle', category: 'control', aria: { role: 'switch' }, bbox: [0, 0, 48, 44] },
      { component_type: 'SwitchToggle', category: 'control', aria: { role: 'button' } }, // Disallowed role
      { component_type: 'ModalDialog', category: 'container', interaction_state: 'default' }
    ];

    const pythonScript = `
import sys, json
sys.path.insert(0, "code/ml")
from src.curriculum.taxonomy import validate_element_label

payloads = json.loads('''${JSON.stringify(testPayloads)}''')
results = []
for p in payloads:
    valid, errs = validate_element_label(p)
    results.append({"valid": valid, "err_count": len(errs)})
print(json.dumps(results))
`;

    const stdout = execFileSync('/opt/anaconda3/envs/py310/bin/python', ['-c', pythonScript], {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    const pyResults = JSON.parse(stdout.trim());

    for (let i = 0; i < testPayloads.length; i++) {
      const nodeResult = validateElementLabel(testPayloads[i]);
      assert.equal(
        nodeResult.valid,
        pyResults[i].valid,
        `Discrepancy at payload ${i}: Node said ${nodeResult.valid}, Py said ${pyResults[i].valid}`
      );
    }
  });
});

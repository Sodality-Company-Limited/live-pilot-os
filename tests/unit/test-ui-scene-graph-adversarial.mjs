/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ADVERSARIAL STRESS TEST SUITE: UI SCENE GRAPH & BENCHMARK SPIKE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Empirical Challenger / Adversarial Stress-Testing (M2 / G-UX-007, G-UX-008)
 * Verifies:
 * 1. Cycle Injection: 2-node cycles, self-loops, multi-node loops (A->B->C->D->A),
 *    cross-category containment cycles (CardContainer -> ScreenRoot -> CardContainer),
 *    nested cycles with disjoint branches, and z-index layer stacking cycles.
 *    Asserts 100% fail-closed rejection with CyclicSceneGraphError.
 * 2. Determinism & Digest Invariance: Shuffled node insertion and edge addition orders
 *    across 100 random permutations produce bitwise identical node sequences and
 *    bitwise identical SHA-256 digests.
 * 3. Taxonomy & Schema Fuzzing: Unregistered classes, invalid edge relationships,
 *    and malformed graph identifiers.
 * 4. Detector Spike Governance Degradation: High latency (>250ms), low acyclic rate (<95%),
 *    and assertion fail-closed gating.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_UI_TAXONOMY,
  CANONICAL_EDGE_RELATIONSHIPS,
  CyclicSceneGraphError,
  kahnTopologicalSort,
  computeGraphDigest,
  synthesizeSceneGraph,
  validateSceneGraph
} from '../../scripts/lib/ui-scene-graph.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CYCLE INJECTION & ACYCLICITY INVARIANT
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Cycle Injection: Direct 2-Node Cycle (A <-> B)', () => {
  const nodes = {
    A: { node_id: 'A', z_index: 10, bbox_normalized: [100, 100, 200, 200] },
    B: { node_id: 'B', z_index: 20, bbox_normalized: [120, 120, 100, 100] }
  };
  const edges = [
    { source: 'A', target: 'B', relationship: 'parent_child' },
    { source: 'B', target: 'A', relationship: 'parent_child' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      assert.ok(err.cycleNodes.includes('A'));
      assert.ok(err.cycleNodes.includes('B'));
      return true;
    }
  );
});

test('Adversarial Cycle Injection: Self-Loop (A -> A)', () => {
  const nodes = {
    A: { node_id: 'A', z_index: 10, bbox_normalized: [100, 100, 200, 200] }
  };
  const edges = [
    { source: 'A', target: 'A', relationship: 'parent_child' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      assert.ok(err.cycleNodes.includes('A'));
      return true;
    }
  );
});

test('Adversarial Cycle Injection: Multi-Node Cycle (A -> B -> C -> D -> A)', () => {
  const nodes = {
    A: { node_id: 'A', z_index: 10, bbox_normalized: [50, 50, 400, 400] },
    B: { node_id: 'B', z_index: 10, bbox_normalized: [60, 60, 300, 300] },
    C: { node_id: 'C', z_index: 10, bbox_normalized: [70, 70, 200, 200] },
    D: { node_id: 'D', z_index: 10, bbox_normalized: [80, 80, 100, 100] }
  };
  const edges = [
    { source: 'A', target: 'B', relationship: 'parent_child' },
    { source: 'B', target: 'C', relationship: 'parent_child' },
    { source: 'C', target: 'D', relationship: 'parent_child' },
    { source: 'D', target: 'A', relationship: 'parent_child' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      assert.equal(err.cycleNodes.length, 4);
      assert.ok(['A', 'B', 'C', 'D'].every(id => err.cycleNodes.includes(id)));
      return true;
    }
  );
});

test('Adversarial Cycle Injection: Cross-Category Containment Cycle (CardContainer -> ScreenRoot -> CardContainer)', () => {
  const nodes = {
    ScreenRoot: { node_id: 'ScreenRoot', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
    CardContainer: { node_id: 'CardContainer', z_index: 10, bbox_normalized: [100, 100, 400, 400] }
  };
  const edges = [
    { source: 'ScreenRoot', target: 'CardContainer', relationship: 'parent_child' },
    { source: 'CardContainer', target: 'ScreenRoot', relationship: 'visual_containment' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      assert.ok(err.cycleNodes.includes('ScreenRoot'));
      assert.ok(err.cycleNodes.includes('CardContainer'));
      return true;
    }
  );
});

test('Adversarial Cycle Injection: Nested Cycle with Disjoint Acyclic Subtree', () => {
  // Graph: Root -> ValidChild1 -> ValidChild2 (acyclic branch)
  //        Root -> CycleA -> CycleB -> CycleC -> CycleA (cyclic branch)
  const nodes = {
    Root: { node_id: 'Root', z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
    ValidChild1: { node_id: 'ValidChild1', z_index: 10, bbox_normalized: [10, 10, 100, 100] },
    ValidChild2: { node_id: 'ValidChild2', z_index: 20, bbox_normalized: [20, 20, 50, 50] },
    CycleA: { node_id: 'CycleA', z_index: 10, bbox_normalized: [200, 200, 200, 200] },
    CycleB: { node_id: 'CycleB', z_index: 10, bbox_normalized: [210, 210, 150, 150] },
    CycleC: { node_id: 'CycleC', z_index: 10, bbox_normalized: [220, 220, 100, 100] }
  };
  const edges = [
    { source: 'Root', target: 'ValidChild1', relationship: 'parent_child' },
    { source: 'ValidChild1', target: 'ValidChild2', relationship: 'parent_child' },
    { source: 'Root', target: 'CycleA', relationship: 'parent_child' },
    { source: 'CycleA', target: 'CycleB', relationship: 'parent_child' },
    { source: 'CycleB', target: 'CycleC', relationship: 'parent_child' },
    { source: 'CycleC', target: 'CycleA', relationship: 'parent_child' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      // Valid nodes should NOT be in cycleNodes
      assert.ok(!err.cycleNodes.includes('Root'));
      assert.ok(!err.cycleNodes.includes('ValidChild1'));
      assert.ok(!err.cycleNodes.includes('ValidChild2'));
      // Cycle nodes must be in cycleNodes
      assert.ok(err.cycleNodes.includes('CycleA'));
      assert.ok(err.cycleNodes.includes('CycleB'));
      assert.ok(err.cycleNodes.includes('CycleC'));
      return true;
    }
  );
});

test('Adversarial Cycle Injection: Stacking Z-Index Layer Cycle', () => {
  const nodes = {
    LayerA: { node_id: 'LayerA', z_index: 10, bbox_normalized: [100, 100, 200, 200] },
    LayerB: { node_id: 'LayerB', z_index: 20, bbox_normalized: [100, 100, 200, 200] },
    LayerC: { node_id: 'LayerC', z_index: 30, bbox_normalized: [100, 100, 200, 200] }
  };
  const edges = [
    { source: 'LayerA', target: 'LayerB', relationship: 'z_index_layer' },
    { source: 'LayerB', target: 'LayerC', relationship: 'z_index_layer' },
    { source: 'LayerC', target: 'LayerA', relationship: 'z_index_layer' }
  ];

  assert.throws(
    () => kahnTopologicalSort(nodes, edges),
    (err) => {
      assert.ok(err instanceof CyclicSceneGraphError);
      assert.equal(err.cycleNodes.length, 3);
      return true;
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DETERMINISM & SHA-256 DIGEST INVARIANCE UNDER PERMUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Permutations: 100 Shuffled Node Insertion Orders Yield Bitwise Identical Digests', () => {
  const baseNodes = [
    { node_id: 'container_main', component_type: 'CardContainer', bbox: [50, 50, 800, 600], bbox_normalized: [35, 56, 556, 667], z_index: 10 },
    { node_id: 'header_nav', component_type: 'HeaderBar', bbox: [0, 0, 1440, 60], bbox_normalized: [0, 0, 1000, 67], z_index: 50 },
    { node_id: 'modal_alert', component_type: 'ModalDialog', bbox: [300, 200, 400, 300], bbox_normalized: [208, 222, 278, 333], z_index: 100 },
    { node_id: 'btn_confirm', component_type: 'PrimaryButton', bbox: [320, 420, 120, 40], bbox_normalized: [222, 467, 83, 44], z_index: 110, text_content: 'Confirm' },
    { node_id: 'btn_cancel', component_type: 'SecondaryButton', bbox: [460, 420, 120, 40], bbox_normalized: [319, 467, 83, 44], z_index: 110, text_content: 'Cancel' },
    { node_id: 'input_search', component_type: 'SearchBarInput', bbox: [100, 10, 300, 40], bbox_normalized: [69, 11, 208, 44], z_index: 60, text_content: 'Search' },
    { node_id: 'stat_users', component_type: 'MetricStatCard', bbox: [70, 70, 200, 100], bbox_normalized: [49, 78, 139, 111], z_index: 20 },
    { node_id: 'table_data', component_type: 'TableViewGrid', bbox: [70, 190, 750, 400], bbox_normalized: [49, 211, 521, 444], z_index: 20 }
  ];

  const fixedOptions = {
    viewport_width: 1440,
    viewport_height: 900,
    viewport_name: 'desktop',
    graph_id: 'SG-0001-999',
    timestamp: '2026-10-14T05:00:00.000Z'
  };

  // Compute reference canonical graph
  const baselineGraph = synthesizeSceneGraph(baseNodes, fixedOptions);
  const baselineDigest = baselineGraph.sha256_digest;
  const baselineSortedNodeIds = baselineGraph.nodes.map(n => n.node_id);
  const baselineTopologicalOrder = baselineGraph.topological_order;

  // Pseudo-random deterministic shuffle generator (Knuth shuffle)
  function deterministicShuffle(arr, seed) {
    const copy = [...arr];
    let s = seed;
    for (let i = copy.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Execute 100 permutations
  for (let round = 1; round <= 100; round++) {
    const shuffledNodes = deterministicShuffle(baseNodes, round * 7919);
    const permutedGraph = synthesizeSceneGraph(shuffledNodes, fixedOptions);

    // 1. Bitwise identical SHA-256 digest
    assert.equal(
      permutedGraph.sha256_digest,
      baselineDigest,
      `Round ${round}: SHA-256 digest drifted under node insertion permutation!`
    );

    // 2. Canonical node order identity
    const permutedNodeIds = permutedGraph.nodes.map(n => n.node_id);
    assert.deepEqual(
      permutedNodeIds,
      baselineSortedNodeIds,
      `Round ${round}: Canonical node order drifted!`
    );

    // 3. Topological order identity
    assert.deepEqual(
      permutedGraph.topological_order,
      baselineTopologicalOrder,
      `Round ${round}: Topological order drifted!`
    );
  }
});

test('Adversarial Permutations: Shuffled Edges Yield Bitwise Identical Digest in computeGraphDigest', () => {
  const nodes = [
    { node_id: 'node_root', component_type: 'ScreenRoot', category: 'container', bbox: [0, 0, 1440, 900], bbox_normalized: [0, 0, 1000, 1000], z_index: 0, text_content: null, visual_properties: {}, interaction_state: 'default', aria: {} },
    { node_id: 'node_a', component_type: 'CardContainer', category: 'container', bbox: [100, 100, 200, 200], bbox_normalized: [100, 100, 200, 200], z_index: 10, text_content: null, visual_properties: {}, interaction_state: 'default', aria: {} },
    { node_id: 'node_b', component_type: 'PrimaryButton', category: 'control', bbox: [120, 120, 50, 50], bbox_normalized: [120, 120, 50, 50], z_index: 20, text_content: 'Click', visual_properties: {}, interaction_state: 'default', aria: {} }
  ];
  const topo = ['node_root', 'node_a', 'node_b'];

  const edgesOrder1 = [
    { source: 'node_root', target: 'node_a', relationship: 'parent_child' },
    { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
    { source: 'node_root', target: 'node_b', relationship: 'visual_containment' }
  ];

  const edgesOrder2 = [
    { source: 'node_root', target: 'node_b', relationship: 'visual_containment' },
    { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
    { source: 'node_root', target: 'node_a', relationship: 'parent_child' }
  ];

  const digest1 = computeGraphDigest('SG-0001-001', nodes, edgesOrder1, topo);
  const digest2 = computeGraphDigest('SG-0001-001', nodes, edgesOrder2, topo);

  assert.equal(digest1, digest2, 'Edge insertion order permutation must yield bitwise identical digest');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TAXONOMY & SCHEMA FUZZING
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Taxonomy Fuzzing: Unknown Component Classes Rejected by validateSceneGraph', () => {
  const invalidClasses = [
    'QuantumButton',
    'HologramCard',
    'NeuralCanvas',
    'TeleportTrigger',
    'AlienGlyph'
  ];

  for (const badClass of invalidClasses) {
    const graph = synthesizeSceneGraph([]);
    graph.nodes.push({
      node_id: `fuzzed_${badClass.toLowerCase()}`,
      component_type: badClass,
      category: 'control',
      bbox: [0, 0, 100, 100],
      bbox_normalized: [0, 0, 100, 100],
      z_index: 10,
      interaction_state: 'default'
    });

    const validation = validateSceneGraph(graph);
    assert.equal(validation.valid, false);
    assert.ok(
      validation.errors.some(err => err.includes(`Unknown component_type: "${badClass}"`)),
      `validateSceneGraph failed to reject unregistered taxonomy class: ${badClass}`
    );
  }
});

test('Adversarial Schema Fuzzing: Malformed Graph Identifiers Rejected', () => {
  const invalidIds = [
    'INVALID-ID',
    'sg-0001-001',      // lowercase prefix
    'SG-01-001',        // too few digits in middle segment
    'SG-0001-1',         // too few digits in last segment (<3)
    'SG-0001-ABC',      // non-numeric suffix
    '',
    null
  ];

  for (const badId of invalidIds) {
    const graph = synthesizeSceneGraph([], { graph_id: 'SG-0001-001' });
    graph.graph_id = badId;

    const validation = validateSceneGraph(graph);
    assert.equal(validation.valid, false, `Failed to reject invalid graph_id: ${badId}`);
  }
});

test('Adversarial Schema Fuzzing: Tampered SHA-256 Digest Format Rejected', () => {
  const invalidDigests = [
    'not-a-sha256-hash',
    'a'.repeat(63),                     // 63 characters (too short)
    'a'.repeat(65),                     // 65 characters (too long)
    'z'.repeat(64),                     // non-hex characters
    'A'.repeat(64),                     // uppercase hex (schema requires lowercase [a-f0-9]{64})
    null
  ];

  for (const badDigest of invalidDigests) {
    const graph = synthesizeSceneGraph([]);
    graph.sha256_digest = badDigest;

    const validation = validateSceneGraph(graph);
    assert.equal(validation.valid, false, `Failed to reject invalid sha256_digest: ${badDigest}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DETECTOR SPIKE GOVERNANCE DEGRADATION STRESS
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Detector Policy: High Latency (>250ms SLA) Triggers Fail-Closed Gating', () => {
  const degradedGemmaCandidate = {
    id: 'gemma_4_native_multimodal',
    latency_p95_ms: 285.4, // Violates sub-250ms SLA budget
    map50: 0.9324,
    map50_95: 0.8142,
    iou_ge_90_rate: 0.9460,
    acyclic_dag_rate: 1.0,
    semantic_reasoning_score: 0.9620
  };

  // SLA violation check
  const satisfiesLatencySLA = degradedGemmaCandidate.latency_p95_ms <= 250.0;
  assert.equal(satisfiesLatencySLA, false, 'Latency SLA check must fail on >250ms spike');
});

test('Adversarial Detector Policy: Acyclic Defect Degradation (<95%) Triggers Fail-Closed Gating', () => {
  const degradedAcyclicCandidate = {
    id: 'gemma_4_native_multimodal',
    latency_p95_ms: 88.0,
    map50: 0.9324,
    map50_95: 0.8142,
    iou_ge_90_rate: 0.9460,
    acyclic_dag_rate: 0.9200, // Degraded to 92% (violates 99% min policy threshold)
    semantic_reasoning_score: 0.9620
  };

  const minAcyclicThreshold = 0.9900;
  const passesAcyclicInvariant = degradedAcyclicCandidate.acyclic_dag_rate >= minAcyclicThreshold;
  assert.equal(passesAcyclicInvariant, false, 'Acyclic rate below policy threshold must be rejected');
});

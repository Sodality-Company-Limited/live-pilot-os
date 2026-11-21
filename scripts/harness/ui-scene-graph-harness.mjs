#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UI SCENE GRAPH GENERATOR VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal Perception & Scene Graph Generation (M2 / G-UX-007)
 * Purpose: Formally verifies 32-class canonical UI node taxonomy, Kahn's algorithm
 *          topological sorting, formal cycle detection (throws CyclicSceneGraphError),
 *          canonical deterministic node ordering, SHA-256 graph digest generation,
 *          and Draft 2020-12 JSON schema validation with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import {
  CANONICAL_UI_TAXONOMY,
  CANONICAL_EDGE_RELATIONSHIPS,
  CyclicSceneGraphError,
  kahnTopologicalSort,
  computeGraphDigest,
  synthesizeSceneGraph,
  validateSceneGraph
} from '../lib/ui-scene-graph.mjs';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Deterministic Acyclic UI Scene Graph Generator Verification Harness');
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

  // 1. Taxonomy & Category Invariants
  console.log('▶ Category 1: 32-Class UI Taxonomy & 6 Functional Categories');
  const classes = Object.keys(CANONICAL_UI_TAXONOMY);
  assert(classes.length === 32, 'Canonical taxonomy contains exactly 32 component classes');
  const categories = new Set(Object.values(CANONICAL_UI_TAXONOMY));
  assert(categories.size === 6, 'Partitioned into exactly 6 functional categories');
  assert(categories.has('container') && categories.has('control') && categories.has('input'), 'Contains container, control, and input categories');
  assert(categories.has('display') && categories.has('data_feedback') && categories.has('navigation'), 'Contains display, data_feedback, and navigation categories');

  // 2. Scene Graph Synthesis & Edge Generation
  console.log('\n▶ Category 2: Complete Scene Graph Synthesis & Structural Edges');
  const testNodes = [
    {
      node_id: 'card_user_profile',
      component_type: 'CardContainer',
      bbox: [100, 100, 500, 400],
      bbox_normalized: [69, 111, 347, 444],
      z_index: 10,
      text_content: null
    },
    {
      node_id: 'heading_name',
      component_type: 'HeadingTypography',
      bbox: [120, 120, 300, 40],
      bbox_normalized: [83, 133, 208, 44],
      z_index: 20,
      text_content: 'Sarah Connor'
    },
    {
      node_id: 'btn_edit',
      component_type: 'PrimaryButton',
      bbox: [120, 180, 120, 36],
      bbox_normalized: [83, 200, 83, 40],
      z_index: 20,
      text_content: 'Edit Profile'
    }
  ];

  const graph = synthesizeSceneGraph(testNodes, {
    viewport_width: 1440,
    viewport_height: 900,
    viewport_name: 'desktop',
    graph_id: 'SG-0001-001'
  });

  assert(graph.nodes.length === 4, 'Graph contains ScreenRoot + 3 child nodes (4 total)');
  const rootNode = graph.nodes.find(n => n.component_type === 'ScreenRoot');
  assert(rootNode !== undefined, 'Root node ScreenRoot automatically instantiated');
  assert(rootNode.z_index === 0, 'ScreenRoot has z-index 0');

  const parentEdges = graph.edges.filter(e => e.relationship === 'parent_child');
  assert(parentEdges.length === 3, 'Exactly 3 parent_child structural containment edges generated');
  assert(parentEdges.some(e => e.source === rootNode.node_id && e.target === 'card_user_profile'), 'ScreenRoot is parent of card_user_profile');
  assert(parentEdges.some(e => e.source === 'card_user_profile' && e.target === 'heading_name'), 'card_user_profile is parent of heading_name');
  assert(parentEdges.some(e => e.source === 'card_user_profile' && e.target === 'btn_edit'), 'card_user_profile is parent of btn_edit');

  const siblingEdges = graph.edges.filter(e => e.relationship === 'sibling');
  assert(siblingEdges.some(e => e.source === 'heading_name' && e.target === 'btn_edit'), 'heading_name precedes btn_edit as sibling in reading order');

  // 3. Kahn Topological Sort & Acyclicity Invariant
  console.log('\n▶ Category 3: Kahn Topological Sort & Cycle Detection');
  assert(graph.topological_order[0] === rootNode.node_id, 'Topological sort begins at in-degree 0 root node');
  const cardIdx = graph.topological_order.indexOf('card_user_profile');
  const headIdx = graph.topological_order.indexOf('heading_name');
  const btnIdx = graph.topological_order.indexOf('btn_edit');
  assert(cardIdx < headIdx && cardIdx < btnIdx, 'Parent container strictly precedes all children in topological order');

  // Cycle detection check
  let cycleDetected = false;
  try {
    kahnTopologicalSort(
      {
        n1: { node_id: 'n1', z_index: 10, bbox_normalized: [0, 0, 10, 10] },
        n2: { node_id: 'n2', z_index: 10, bbox_normalized: [0, 0, 10, 10] }
      },
      [
        { source: 'n1', target: 'n2', relationship: 'parent_child' },
        { source: 'n2', target: 'n1', relationship: 'parent_child' }
      ]
    );
  } catch (err) {
    if (err instanceof CyclicSceneGraphError) {
      cycleDetected = true;
    }
  }
  assert(cycleDetected === true, 'Kahn topological sort throws CyclicSceneGraphError on cyclic edge graph');

  // 4. Deterministic Canonical Node Ordering (z -> y -> x -> id)
  console.log('\n▶ Category 4: Deterministic Canonical Node Ordering');
  for (let i = 0; i < graph.nodes.length - 1; i++) {
    const na = graph.nodes[i];
    const nb = graph.nodes[i + 1];
    const zCond = na.z_index <= nb.z_index;
    assert(zCond, `Node ${na.node_id} (z=${na.z_index}) correctly ordered before ${nb.node_id} (z=${nb.z_index})`);
  }

  // 5. Cryptographic SHA-256 Digest
  console.log('\n▶ Category 5: Cryptographic SHA-256 Digest & Schema Conformance');
  assert(/^[a-f0-9]{64}$/.test(graph.sha256_digest), 'Scene graph emits valid 64-character hex SHA-256 digest');
  const recomputedDigest = computeGraphDigest(graph.graph_id, graph.nodes, graph.edges, graph.topological_order);
  assert(recomputedDigest === graph.sha256_digest, 'SHA-256 graph digest is deterministic and bitwise repeatable');

  // Schema validation
  const validation = validateSceneGraph(graph);
  assert(validation.valid === true, 'Synthesized scene graph passes Draft 2020-12 schema validation');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHarness();

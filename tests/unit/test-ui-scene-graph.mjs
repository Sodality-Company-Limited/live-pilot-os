/**
 * Unit Test Suite for Deterministic Acyclic UI Scene Graph Generator.
 * Verifies 32-class taxonomy, Kahn's algorithm topological sorting,
 * cycle detection, canonical deterministic node ordering, and SHA-256 digests.
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

test('UISceneGraph: 32 Canonical UI Taxonomy Elements', () => {
  const classes = Object.keys(CANONICAL_UI_TAXONOMY);
  assert.equal(classes.length, 32);

  // Check categories
  const categories = new Set(Object.values(CANONICAL_UI_TAXONOMY));
  assert.equal(categories.size, 6);
  assert.ok(categories.has('container'));
  assert.ok(categories.has('control'));
  assert.ok(categories.has('input'));
  assert.ok(categories.has('display'));
  assert.ok(categories.has('data_feedback'));
  assert.ok(categories.has('navigation'));
});

test('UISceneGraph: Complete Scene Graph Synthesis & Edge Generation', () => {
  const fusedNodes = [
    {
      node_id: 'card_login',
      component_type: 'CardContainer',
      bbox: [400, 200, 640, 500],
      bbox_normalized: [278, 222, 444, 556],
      z_index: 10,
      text_content: null
    },
    {
      node_id: 'input_email',
      component_type: 'TextInputField',
      bbox: [440, 260, 560, 48],
      bbox_normalized: [306, 289, 389, 53],
      z_index: 20,
      text_content: 'Email Address'
    },
    {
      node_id: 'btn_submit',
      component_type: 'PrimaryButton',
      bbox: [440, 340, 560, 48],
      bbox_normalized: [306, 378, 389, 53],
      z_index: 20,
      text_content: 'Sign In'
    }
  ];

  const graph = synthesizeSceneGraph(fusedNodes, {
    viewport_width: 1440,
    viewport_height: 900,
    viewport_name: 'desktop',
    graph_id: 'SG-0001-001'
  });

  // Check root node created automatically
  assert.equal(graph.nodes.length, 4); // ScreenRoot + 3 nodes
  const rootNode = graph.nodes.find(n => n.component_type === 'ScreenRoot');
  assert.ok(rootNode);

  // Check parent_child edges: ScreenRoot -> card_login, card_login -> input_email, card_login -> btn_submit
  const parentEdges = graph.edges.filter(e => e.relationship === 'parent_child');
  assert.ok(parentEdges.some(e => e.source === rootNode.node_id && e.target === 'card_login'));
  assert.ok(parentEdges.some(e => e.source === 'card_login' && e.target === 'input_email'));
  assert.ok(parentEdges.some(e => e.source === 'card_login' && e.target === 'btn_submit'));

  // Check sibling edge between email and submit
  const siblingEdges = graph.edges.filter(e => e.relationship === 'sibling');
  assert.ok(siblingEdges.some(e => e.source === 'input_email' && e.target === 'btn_submit'));

  // Check topological sort order: root must precede card, card must precede children
  assert.equal(graph.topological_order[0], rootNode.node_id);
  const cardIdx = graph.topological_order.indexOf('card_login');
  const emailIdx = graph.topological_order.indexOf('input_email');
  const btnIdx = graph.topological_order.indexOf('btn_submit');
  assert.ok(cardIdx < emailIdx);
  assert.ok(cardIdx < btnIdx);

  // SHA-256 digest format
  assert.match(graph.sha256_digest, /^[a-f0-9]{64}$/);

  // Validate
  const validation = validateSceneGraph(graph);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
});

test('UISceneGraph: Formal Cycle Detection with Kahn Algorithm (CyclicSceneGraphError)', () => {
  const nodesDict = {
    node_a: { node_id: 'node_a', z_index: 10, bbox_normalized: [0, 0, 100, 100] },
    node_b: { node_id: 'node_b', z_index: 10, bbox_normalized: [0, 0, 100, 100] }
  };

  // Create an artificial direct cycle: node_a -> node_b -> node_a
  const cyclicEdges = [
    { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
    { source: 'node_b', target: 'node_a', relationship: 'parent_child' }
  ];

  assert.throws(() => {
    kahnTopologicalSort(nodesDict, cyclicEdges);
  }, (err) => {
    assert.ok(err instanceof CyclicSceneGraphError);
    assert.ok(err.cycleNodes.includes('node_a'));
    assert.ok(err.cycleNodes.includes('node_b'));
    return true;
  });
});

test('UISceneGraph: Deterministic Canonical Node Ordering (z -> y -> x -> id)', () => {
  const fusedNodes = [
    { node_id: 'z_modal', component_type: 'ModalDialog', bbox: [100, 100, 200, 200], bbox_normalized: [100, 100, 200, 200], z_index: 1000 },
    { node_id: 'b_button', component_type: 'PrimaryButton', bbox: [200, 200, 100, 50], bbox_normalized: [200, 200, 100, 50], z_index: 20 },
    { node_id: 'a_button', component_type: 'SecondaryButton', bbox: [100, 200, 100, 50], bbox_normalized: [100, 200, 100, 50], z_index: 20 },
    { node_id: 'c_card', component_type: 'CardContainer', bbox: [50, 50, 500, 500], bbox_normalized: [50, 50, 500, 500], z_index: 10 }
  ];

  const graph = synthesizeSceneGraph(fusedNodes, { graph_id: 'SG-0001-002' });

  // Sorted order should be:
  // 1. ScreenRoot (z=0)
  // 2. c_card (z=10)
  // 3. a_button (z=20, x=100)
  // 4. b_button (z=20, x=200)
  // 5. z_modal (z=1000)
  assert.equal(graph.nodes[0].component_type, 'ScreenRoot');
  assert.equal(graph.nodes[1].node_id, 'c_card');
  assert.equal(graph.nodes[2].node_id, 'a_button');
  assert.equal(graph.nodes[3].node_id, 'b_button');
  assert.equal(graph.nodes[4].node_id, 'z_modal');
});

test('UISceneGraph: Repeatable Cryptographic SHA-256 Digest', () => {
  const nodes = [
    { node_id: 'node_1', component_type: 'CardContainer', category: 'container', bbox: [0, 0, 100, 100], bbox_normalized: [0, 0, 100, 100], z_index: 10, text_content: null, visual_properties: {}, interaction_state: 'default', aria: {} }
  ];
  const edges = [];
  const topOrder = ['node_1'];

  const digest1 = computeGraphDigest('SG-0001-999', nodes, edges, topOrder);
  const digest2 = computeGraphDigest('SG-0001-999', nodes, edges, topOrder);

  assert.equal(digest1, digest2);
  assert.match(digest1, /^[a-f0-9]{64}$/);
});

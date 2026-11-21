import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DaveEvidenceGraph,
  CycleDetectedError,
  InvalidNodeSchemaError,
  DanglingEdgeError,
  DAVE_GRAPH_NODE_TYPES,
  DAVE_EDGE_TYPES
} from '../../scripts/lib/dave-evidence-graph.mjs';

describe('DAVE Evidence Graph Unit Test Suite (G-DAVE-004)', () => {
  const tmpDir = path.join(process.cwd(), 'artifacts/test-dave-graph');

  // Helper to ensure clean test directory
  function setupTmpDir() {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  }

  function cleanupTmpDir() {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  it('1. should export canonical node and edge types', () => {
    assert.ok(Array.isArray(DAVE_GRAPH_NODE_TYPES));
    assert.deepEqual(
      [...DAVE_GRAPH_NODE_TYPES].sort(),
      ['approval', 'decision', 'implementation', 'reference', 'verification'].sort()
    );

    assert.ok(Array.isArray(DAVE_EDGE_TYPES));
    assert.deepEqual(
      [...DAVE_EDGE_TYPES].sort(),
      ['approves', 'derives', 'grounds', 'implements', 'verifies'].sort()
    );
  });

  it('2. should ingest and cryptographically content-address ReferenceNode', () => {
    const graph = new DaveEvidenceGraph();

    const refNode = graph.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'image',
      uri: 'data/references/REF-0001.png',
      content_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      purpose: 'authoritative_mockup',
      authority: 'approved_design_reference',
      metadata: { viewport: { width: 1440, height: 900 } }
    });

    assert.ok(refNode.id.startsWith('dave:node:sha256:'));
    assert.equal(refNode.node_type, 'reference');
    assert.equal(refNode.reference_id, 'REF-0001');
    assert.equal(graph.getNodeCount(), 1);
    assert.equal(graph.hasNode(refNode.id), true);

    // Tamper test: different payload must generate different node ID
    const graph2 = new DaveEvidenceGraph();
    const alteredRef = graph2.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'image',
      uri: 'data/references/REF-0001.png',
      content_hash: 'sha256:different_hash_value_1234567890abcdef',
      purpose: 'authoritative_mockup',
      authority: 'approved_design_reference'
    });

    assert.notEqual(refNode.id, alteredRef.id);
  });

  it('3. should ingest and content-address all 5 node types with parent hash dependency', () => {
    const graph = new DaveEvidenceGraph();

    // 1. Reference
    const ref = graph.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'text',
      uri: 'docs/03-architecture/design-tokens.md',
      content_hash: 'sha256:1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      purpose: 'token_spec'
    });

    // 2. Decision
    const dec = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'Implement evidence graph tokens' },
      confidence: 0.95,
      risk: 'low',
      evidence: ['docs/03-architecture/design-tokens.md'],
      references: ['REF-0001'],
      parent_ids: [ref.id]
    });

    // 3. Implementation
    const impl = graph.addImplementationNode({
      commit_hash: 'c0ffee1234567890abcdef1234567890abcdef12',
      branch: 'feature/DAVE',
      files_changed: [{ path: 'scripts/lib/dave-evidence-graph.mjs', status: 'added' }],
      description: 'Implement core evidence graph',
      goal_id: 'G-DAVE-004',
      parent_ids: [dec.id]
    });

    // 4. Verification
    const verif = graph.addVerificationNode({
      receipt_id: 'G-DAVE-004-INV-001',
      receipt_schema: 'invariant_proof_v1',
      harness: 'node scripts/harness/dave-decision-trace-harness.mjs',
      exit_code: 0,
      passed: true,
      metrics: { query_latency_ms: 1.2 },
      parent_ids: [impl.id]
    });

    // 5. Approval
    const appr = graph.addApprovalNode({
      action: 'approve',
      actor: 'system-architect',
      rationale: 'All causal graph invariants verified',
      signature: 'ed25519:test_signature_valid',
      parent_ids: [verif.id]
    });

    assert.equal(graph.getNodeCount(), 5);
    assert.equal(graph.getEdgeCount(), 4);

    // Verify parent linkage
    assert.deepEqual(graph.getNodeParents(dec.id).map(p => p.id), [ref.id]);
    assert.deepEqual(graph.getNodeChildren(ref.id).map(c => c.id), [dec.id]);
    assert.deepEqual(graph.getNodeParents(impl.id).map(p => p.id), [dec.id]);
    assert.deepEqual(graph.getNodeParents(verif.id).map(p => p.id), [impl.id]);
    assert.deepEqual(graph.getNodeParents(appr.id).map(p => p.id), [verif.id]);
  });

  it('4. should reject invalid node schema fail-closed', () => {
    const graph = new DaveEvidenceGraph();

    // Unknown node type
    assert.throws(() => {
      graph.addNode({
        node_type: 'unknown_magic_type',
        name: 'test'
      });
    }, InvalidNodeSchemaError);

    // Missing decision_type in decision node
    assert.throws(() => {
      graph.addDecisionNode({
        decision_id: 'DAVE-TEST-0001',
        goal_id: 'G-TEST-001',
        confidence: 0.95
      });
    }, InvalidNodeSchemaError);

    // Invalid confidence value (< 0 or > 1)
    assert.throws(() => {
      graph.addDecisionNode({
        decision_id: 'DAVE-TEST-0001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-TEST-001',
        decision: { summary: 'Invalid conf' },
        confidence: 1.5,
        risk: 'low'
      });
    }, InvalidNodeSchemaError);

    // Missing commit_hash in implementation node
    assert.throws(() => {
      graph.addImplementationNode({
        goal_id: 'G-TEST-001',
        description: 'Missing commit hash'
      });
    }, InvalidNodeSchemaError);
  });

  it('5. should reject dangling edges fail-closed', () => {
    const graph = new DaveEvidenceGraph();
    const ref = graph.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'text',
      uri: 'package.json',
      content_hash: 'sha256:dummy'
    });

    assert.throws(() => {
      graph.addEdge(ref.id, 'dave:node:sha256:nonexistent', 'grounds');
    }, DanglingEdgeError);

    assert.throws(() => {
      graph.addEdge('dave:node:sha256:nonexistent', ref.id, 'grounds');
    }, DanglingEdgeError);
  });

  it('6. should detect and reject cyclic references fail-closed', () => {
    const graph = new DaveEvidenceGraph();

    const n1 = graph.addReferenceNode({ reference_id: 'REF-0001', type: 'text', uri: 'a.md', content_hash: 'sha256:111' });
    const n2 = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-TEST',
      decision: { summary: 'test' },
      confidence: 0.9,
      risk: 'low',
      evidence: ['a.md'],
      parent_ids: [n1.id]
    });
    const n3 = graph.addImplementationNode({
      commit_hash: '11223344556677889900aabbccddeeff11223344',
      goal_id: 'G-TEST',
      files_changed: [],
      description: 'impl',
      parent_ids: [n2.id]
    });

    // Direct cycle attempt: n3 -> n1
    assert.throws(() => {
      graph.addEdge(n3.id, n1.id, 'grounds');
    }, CycleDetectedError);

    // Self loop attempt: n2 -> n2
    assert.throws(() => {
      graph.addEdge(n2.id, n2.id, 'grounds');
    }, CycleDetectedError);

    // Verify graph remains uncorrupted
    assert.equal(graph.getNodeCount(), 3);
    assert.equal(graph.getEdgeCount(), 2);
    assert.equal(graph.isAcyclic(), true);
  });

  it('7. should validate graph invariants and detect orphaned nodes', () => {
    const graph = new DaveEvidenceGraph();

    // Incomplete graph: Implementation without upstream Decision
    const implOrphan = graph.addImplementationNode({
      commit_hash: 'deadbeef1234567890abcdef1234567890abcdef',
      goal_id: 'G-TEST',
      files_changed: [],
      description: 'Orphaned commit'
    });

    const invResult = graph.validateInvariants();
    assert.equal(invResult.valid, false);
    assert.ok(invResult.errors.length > 0);
    assert.ok(invResult.errors.some(e => e.includes('ImplementationNode') && e.includes('traces to at least one approved DecisionNode')));
  });

  it('8. should perform bidirectional queries with topological ordering and sub-5ms latency', () => {
    const graph = new DaveEvidenceGraph();

    const ref = graph.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'image',
      uri: 'mockup.png',
      content_hash: 'sha256:mock'
    });

    const dec = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'Design decision' },
      confidence: 0.95,
      risk: 'low',
      evidence: ['mockup.png'],
      references: ['REF-0001'],
      parent_ids: [ref.id]
    });

    const impl = graph.addImplementationNode({
      commit_hash: 'aabbccddeeff00112233445566778899aabbccdd',
      goal_id: 'G-DAVE-004',
      files_changed: [{ path: 'test.js' }],
      description: 'Code commit',
      parent_ids: [dec.id]
    });

    const verif = graph.addVerificationNode({
      receipt_id: 'G-DAVE-004-INV-001',
      receipt_schema: 'invariant_proof_v1',
      harness: 'test-harness',
      exit_code: 0,
      passed: true,
      metrics: {},
      parent_ids: [impl.id]
    });

    const appr = graph.addApprovalNode({
      action: 'approve',
      actor: 'system-architect',
      rationale: 'Approved',
      signature: 'sig',
      parent_ids: [verif.id]
    });

    // 1. Upstream query from commit
    const tStartUp = performance.now();
    const upstreamFromImpl = graph.queryUpstream(impl.id);
    const tUpstream = performance.now() - tStartUp;

    assert.ok(tUpstream < 5.0, `Upstream query latency must be < 5ms (got: ${tUpstream.toFixed(3)}ms)`);
    assert.equal(upstreamFromImpl.length, 2);
    assert.equal(upstreamFromImpl[0].id, dec.id);
    assert.equal(upstreamFromImpl[1].id, ref.id);

    // 2. Upstream query with type filter
    const upstreamRefs = graph.queryUpstream(impl.id, { filterType: 'reference' });
    assert.equal(upstreamRefs.length, 1);
    assert.equal(upstreamRefs[0].id, ref.id);

    // 3. Downstream query from reference
    const tStartDown = performance.now();
    const downstreamFromRef = graph.queryDownstream(ref.id);
    const tDownstream = performance.now() - tStartDown;

    assert.ok(tDownstream < 5.0, `Downstream query latency must be < 5ms (got: ${tDownstream.toFixed(3)}ms)`);
    assert.equal(downstreamFromRef.length, 4);
    assert.equal(downstreamFromRef[0].id, dec.id);
    assert.equal(downstreamFromRef[1].id, impl.id);
    assert.equal(downstreamFromRef[2].id, verif.id);
    assert.equal(downstreamFromRef[3].id, appr.id);

    // 4. Downstream query with type filter
    const downstreamVerifs = graph.queryDownstream(ref.id, { filterType: 'verification' });
    assert.equal(downstreamVerifs.length, 1);
    assert.equal(downstreamVerifs[0].id, verif.id);

    // 5. Causal chains discovery
    const chains = graph.findCausalChains(ref.id, appr.id);
    assert.equal(chains.length, 1);
    assert.deepEqual(chains[0].map(n => n.id), [ref.id, dec.id, impl.id, verif.id, appr.id]);
  });

  it('9. should handle diamond DAG topology without duplicate nodes in queries', () => {
    const graph = new DaveEvidenceGraph();

    // Diamond: Ref -> Dec1, Ref -> Dec2; Dec1 -> Impl, Dec2 -> Impl
    const ref = graph.addReferenceNode({ reference_id: 'REF-0001', type: 'text', uri: 'spec.md', content_hash: 'sha256:000' });
    const dec1 = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'UX choice' },
      confidence: 0.95,
      risk: 'low',
      evidence: ['spec.md'],
      parent_ids: [ref.id]
    });
    const dec2 = graph.addDecisionNode({
      decision_id: 'DAVE-SECU-0001',
      decision_type: 'security',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'Sec choice' },
      confidence: 0.99,
      risk: 'low',
      evidence: ['spec.md'],
      parent_ids: [ref.id]
    });
    const impl = graph.addImplementationNode({
      commit_hash: '1234567890123456789012345678901234567890',
      goal_id: 'G-DAVE-004',
      files_changed: [],
      description: 'Diamond commit',
      parent_ids: [dec1.id, dec2.id]
    });

    const upstream = graph.queryUpstream(impl.id);
    // Should have dec1, dec2, and ref exactly once!
    assert.equal(upstream.length, 3);
    const upstreamIds = new Set(upstream.map(n => n.id));
    assert.equal(upstreamIds.size, 3);
    assert.ok(upstreamIds.has(dec1.id));
    assert.ok(upstreamIds.has(dec2.id));
    assert.ok(upstreamIds.has(ref.id));

    const downstream = graph.queryDownstream(ref.id);
    assert.equal(downstream.length, 3);
    const downstreamIds = new Set(downstream.map(n => n.id));
    assert.equal(downstreamIds.size, 3);
    assert.ok(downstreamIds.has(impl.id));

    const chains = graph.findCausalChains(ref.id, impl.id);
    assert.equal(chains.length, 2);
  });

  it('10. should compute deterministic Merkle root and serialize/deserialize without loss', () => {
    setupTmpDir();
    const filePath = path.join(tmpDir, 'test-trace-graph.json');

    const graph = new DaveEvidenceGraph();
    const ref = graph.addReferenceNode({ reference_id: 'REF-0001', type: 'text', uri: 'spec.md', content_hash: 'sha256:123' });
    const dec = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'Test decision' },
      confidence: 0.95,
      risk: 'low',
      evidence: ['spec.md'],
      parent_ids: [ref.id]
    });
    const impl = graph.addImplementationNode({
      commit_hash: 'abcdef1234567890abcdef1234567890abcdef12',
      goal_id: 'G-DAVE-004',
      files_changed: [{ path: 'test.js' }],
      description: 'Commit',
      parent_ids: [dec.id]
    });
    const verif = graph.addVerificationNode({
      receipt_id: 'G-DAVE-004-INV-001',
      receipt_schema: 'invariant_proof_v1',
      harness: 'test-harness',
      exit_code: 0,
      passed: true,
      metrics: {},
      parent_ids: [impl.id]
    });
    const appr = graph.addApprovalNode({
      action: 'approve',
      actor: 'system-architect',
      rationale: 'Approved',
      signature: 'sig',
      parent_ids: [verif.id]
    });

    const origMerkle = graph.computeMerkleRoot();
    assert.ok(typeof origMerkle === 'string' && origMerkle.length === 64);

    // Save to disk
    graph.saveToFile(filePath);
    assert.ok(fs.existsSync(filePath));

    // Reload from disk
    const restoredGraph = DaveEvidenceGraph.loadFromFile(filePath);
    assert.equal(restoredGraph.getNodeCount(), 5);
    assert.equal(restoredGraph.getEdgeCount(), 4);
    assert.equal(restoredGraph.computeMerkleRoot(), origMerkle);

    const inv = restoredGraph.validateInvariants();
    assert.equal(inv.valid, true);
    assert.equal(inv.errors.length, 0);

    cleanupTmpDir();
  });

  it('11. should detect tampering in serialized snapshot fail-closed', () => {
    setupTmpDir();
    const filePath = path.join(tmpDir, 'tampered-graph.json');

    const graph = new DaveEvidenceGraph();
    const ref = graph.addReferenceNode({ reference_id: 'REF-0001', type: 'text', uri: 'spec.md', content_hash: 'sha256:123' });
    graph.saveToFile(filePath);

    // Maliciously tamper with the content on disk
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const firstNodeKey = Object.keys(content.nodes)[0];
    content.nodes[firstNodeKey].uri = 'tampered_malicious_path.exe';
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    // Deserialization or validation must catch tampering
    assert.throws(() => {
      DaveEvidenceGraph.loadFromFile(filePath);
    }, /tamper|digest mismatch|hash mismatch/i);

    cleanupTmpDir();
  });

  it('12. should export human-readable why and impact summaries', () => {
    const graph = new DaveEvidenceGraph();

    const ref = graph.addReferenceNode({
      reference_id: 'REF-0001',
      type: 'image',
      uri: 'mockup.png',
      content_hash: 'sha256:mock'
    });

    const dec = graph.addDecisionNode({
      decision_id: 'DAVE-UXUI-0001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-DAVE-004',
      decision: { summary: 'Use dark glassmorphic theme' },
      confidence: 0.95,
      risk: 'low',
      evidence: ['mockup.png'],
      references: ['REF-0001'],
      parent_ids: [ref.id]
    });

    const impl = graph.addImplementationNode({
      commit_hash: 'abcdef1234567890abcdef1234567890abcdef12',
      goal_id: 'G-DAVE-004',
      files_changed: [{ path: 'theme.css' }],
      description: 'Implement dark glassmorphism',
      parent_ids: [dec.id]
    });

    const why = graph.queryWhy(impl.id);
    assert.ok(why.includes('DAVE-UXUI-0001'));
    assert.ok(why.includes('REF-0001'));
    assert.ok(why.includes('Use dark glassmorphic theme'));

    const impact = graph.queryImpact(ref.id);
    assert.ok(impact.includes('DAVE-UXUI-0001'));
    assert.ok(impact.includes('abcdef1234567890abcdef1234567890abcdef12'));
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  DaveEvidenceGraph,
  CycleDetectedError,
  InvalidNodeSchemaError,
  DanglingEdgeError,
  TamperDetectedError,
  computeNodeId,
  canonicalJsonStringify,
  DAVE_GRAPH_NODE_TYPES,
  DAVE_EDGE_TYPES
} from '../../scripts/lib/dave-evidence-graph.mjs';

describe('DAVE Evidence Graph Adversarial & Stress Challenge Suite (G-DAVE-004)', () => {
  const tmpDir = path.join(process.cwd(), 'artifacts/test-dave-graph-adversarial');

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

  // ===========================================================================
  // SECTION 1: Adversarial Cycle Detection & Directed Acyclicity Invariants
  // ===========================================================================
  describe('1. Adversarial Cycle Detection & Invariant Immunity', () => {
    it('1.1 should reject direct self-referential cycles and maintain state integrity', () => {
      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({
        reference_id: 'REF-CYCLE-001',
        type: 'text',
        uri: 'spec.md',
        content_hash: 'sha256:abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234'
      });

      assert.throws(() => {
        graph.addEdge(ref.id, ref.id, 'grounds');
      }, CycleDetectedError);

      assert.equal(graph.getNodeCount(), 1);
      assert.equal(graph.getEdgeCount(), 0);
      assert.equal(graph.isAcyclic(), true);
    });

    it('1.2 should detect 2-node, 3-node, and 5-node cycles across different edge types', () => {
      const graph = new DaveEvidenceGraph();
      const n1 = graph.addReferenceNode({
        reference_id: 'REF-001',
        type: 'text',
        uri: 'a.md',
        content_hash: 'sha256:0001'
      });
      const n2 = graph.addDecisionNode({
        decision_id: 'DAVE-001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-DAVE-004',
        decision: { summary: 'd1' },
        confidence: 0.95,
        risk: 'low',
        parent_ids: [n1.id]
      });
      const n3 = graph.addImplementationNode({
        commit_hash: 'c111111111111111111111111111111111111111',
        goal_id: 'G-DAVE-004',
        files_changed: [],
        description: 'impl1',
        parent_ids: [n2.id]
      });
      const n4 = graph.addVerificationNode({
        receipt_id: 'RCP-001',
        harness: 'test',
        passed: true,
        parent_ids: [n3.id]
      });
      const n5 = graph.addApprovalNode({
        action: 'approve',
        actor: 'lead',
        parent_ids: [n4.id]
      });

      // 2-node cycle attempt: n2 -> n1
      assert.throws(() => graph.addEdge(n2.id, n1.id, 'grounds'), CycleDetectedError);

      // 3-node cycle attempt: n3 -> n1
      assert.throws(() => graph.addEdge(n3.id, n1.id, 'grounds'), CycleDetectedError);

      // 4-node cycle attempt: n4 -> n1
      assert.throws(() => graph.addEdge(n4.id, n1.id, 'grounds'), CycleDetectedError);

      // 5-node cycle attempt: n5 -> n1
      assert.throws(() => graph.addEdge(n5.id, n1.id, 'grounds'), CycleDetectedError);

      // Intermediate cycle attempts:
      assert.throws(() => graph.addEdge(n5.id, n2.id, 'grounds'), CycleDetectedError);
      assert.throws(() => graph.addEdge(n4.id, n2.id, 'grounds'), CycleDetectedError);
      assert.throws(() => graph.addEdge(n3.id, n2.id, 'grounds'), CycleDetectedError);

      // Verify the graph topology was completely unharmed
      assert.equal(graph.getNodeCount(), 5);
      assert.equal(graph.getEdgeCount(), 4);
      assert.equal(graph.isAcyclic(), true);
    });

    it('1.3 should detect back-edges in complex diamond lattice graphs', () => {
      const graph = new DaveEvidenceGraph();
      // Root: Ref
      const r = graph.addReferenceNode({ reference_id: 'R', type: 'text', uri: 'r.md', content_hash: 'sha256:r' });
      // Branches: Dec1, Dec2
      const d1 = graph.addDecisionNode({ decision_id: 'D1', decision_type: 'ux_ui_design', goal_id: 'G', decision: {}, confidence: 0.9, risk: 'low', parent_ids: [r.id] });
      const d2 = graph.addDecisionNode({ decision_id: 'D2', decision_type: 'security', goal_id: 'G', decision: {}, confidence: 0.9, risk: 'low', parent_ids: [r.id] });
      // Join: Impl
      const imp = graph.addImplementationNode({ commit_hash: 'c1', goal_id: 'G', files_changed: [], description: 'join', parent_ids: [d1.id, d2.id] });
      // Fork again: Ver1, Ver2
      const v1 = graph.addVerificationNode({ receipt_id: 'V1', harness: 'h1', passed: true, parent_ids: [imp.id] });
      const v2 = graph.addVerificationNode({ receipt_id: 'V2', harness: 'h2', passed: true, parent_ids: [imp.id] });
      // Re-join: Appr
      const app = graph.addApprovalNode({ action: 'approve', actor: 'a', parent_ids: [v1.id, v2.id] });

      // Cross back-edges that create cycles
      assert.throws(() => graph.addEdge(app.id, d1.id), CycleDetectedError);
      assert.throws(() => graph.addEdge(app.id, d2.id), CycleDetectedError);
      assert.throws(() => graph.addEdge(app.id, imp.id), CycleDetectedError);
      assert.throws(() => graph.addEdge(v1.id, r.id), CycleDetectedError);
      assert.throws(() => graph.addEdge(v2.id, d1.id), CycleDetectedError);
      assert.throws(() => graph.addEdge(imp.id, r.id), CycleDetectedError);

      assert.equal(graph.isAcyclic(), true);
    });

    it('1.4 should detect deep cycle across a 200-node linear chain without stack overflow', () => {
      const graph = new DaveEvidenceGraph();
      const nodeCount = 200;
      const nodes = [];

      // Create root reference
      nodes.push(graph.addReferenceNode({
        reference_id: 'REF-CHAIN-000',
        type: 'text',
        uri: 'chain-0.md',
        content_hash: 'sha256:00000000000000000000000000000000'
      }));

      // Create chain of decisions referencing predecessors
      for (let i = 1; i < nodeCount; i++) {
        nodes.push(graph.addDecisionNode({
          decision_id: `DEC-CHAIN-${String(i).padStart(3, '0')}`,
          decision_type: 'data_schema',
          goal_id: 'G-DAVE-004',
          decision: { step: i },
          confidence: 0.95,
          risk: 'low',
          parent_ids: [nodes[i - 1].id]
        }));
      }

      assert.equal(graph.getNodeCount(), nodeCount);
      assert.equal(graph.getEdgeCount(), nodeCount - 1);
      assert.equal(graph.isAcyclic(), true);

      // Attempt cycle: from tail to head
      const tail = nodes[nodeCount - 1];
      const head = nodes[0];

      assert.throws(() => {
        graph.addEdge(tail.id, head.id, 'grounds');
      }, CycleDetectedError);

      // Attempt cycle: from middle to head
      const mid = nodes[100];
      assert.throws(() => {
        graph.addEdge(mid.id, head.id, 'grounds');
      }, CycleDetectedError);

      // Attempt cycle: from tail to middle
      assert.throws(() => {
        graph.addEdge(tail.id, mid.id, 'grounds');
      }, CycleDetectedError);

      assert.equal(graph.isAcyclic(), true);
    });
  });

  // ===========================================================================
  // SECTION 2: Corrupted SHA-256 Node & Tamper Evidence Verification
  // ===========================================================================
  describe('2. Corrupted SHA-256 Node & Tamper-Evidence Invariants', () => {
    it('2.1 should detect in-memory node payload tampering via validateInvariants', () => {
      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({
        reference_id: 'REF-TAMPER-001',
        type: 'text',
        uri: 'clean.md',
        content_hash: 'sha256:clean'
      });
      const dec = graph.addDecisionNode({
        decision_id: 'DAVE-TAMPER-001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-DAVE-004',
        decision: { summary: 'legitimate decision' },
        confidence: 0.95,
        risk: 'low',
        parent_ids: [ref.id]
      });

      // Initially valid
      let inv = graph.validateInvariants();
      assert.equal(inv.valid, true);
      assert.equal(inv.errors.length, 0);

      // Maliciously mutate decision summary in memory without recomputing ID
      const targetNode = graph.getNode(dec.id);
      targetNode.decision.summary = 'HACKED_MALICIOUS_DECISION_SUMMARY';

      // validateInvariants must detect digest mismatch
      inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('tampering detected') && e.includes(dec.id)));
    });

    it('2.2 should detect confidence or risk manipulation in DecisionNode', () => {
      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({ reference_id: 'REF-CONF', type: 'text', uri: 'r.md', content_hash: 'sha256:r' });
      const dec = graph.addDecisionNode({
        decision_id: 'DAVE-RISK-001',
        decision_type: 'security',
        goal_id: 'G-DAVE-004',
        decision: { summary: 'sec' },
        confidence: 0.88,
        risk: 'low',
        parent_ids: [ref.id]
      });

      const node = graph.getNode(dec.id);
      node.confidence = 0.99; // Artificially elevate confidence

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('tampering detected')));
    });

    it('2.3 should reject deserialization of JSON with tampered node ID', () => {
      setupTmpDir();
      const filePath = path.join(tmpDir, 'corrupted-node-id.json');

      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({ reference_id: 'REF-001', type: 'text', uri: 'a.md', content_hash: 'sha256:1' });
      graph.saveToFile(filePath);

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const originalKey = Object.keys(raw.nodes)[0];
      const corruptedKey = 'dave:node:sha256:0000000000000000000000000000000000000000000000000000000000000000';
      raw.nodes[corruptedKey] = raw.nodes[originalKey];
      raw.nodes[corruptedKey].id = corruptedKey;
      delete raw.nodes[originalKey];

      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');

      assert.throws(() => {
        DaveEvidenceGraph.loadFromFile(filePath);
      }, TamperDetectedError);

      cleanupTmpDir();
    });

    it('2.4 should reject deserialization of JSON with tampered Merkle root digest', () => {
      setupTmpDir();
      const filePath = path.join(tmpDir, 'corrupted-merkle-root.json');

      const graph = new DaveEvidenceGraph();
      graph.addReferenceNode({ reference_id: 'REF-001', type: 'text', uri: 'a.md', content_hash: 'sha256:1' });
      graph.saveToFile(filePath);

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      raw.merkle_root = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');

      assert.throws(() => {
        DaveEvidenceGraph.loadFromFile(filePath);
      }, TamperDetectedError);

      cleanupTmpDir();
    });

    it('2.5 should detect tampering when parent_ids array is forged on disk', () => {
      setupTmpDir();
      const filePath = path.join(tmpDir, 'corrupted-parents.json');

      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({ reference_id: 'REF-001', type: 'text', uri: 'a.md', content_hash: 'sha256:1' });
      const dec = graph.addDecisionNode({
        decision_id: 'DAVE-001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-DAVE-004',
        decision: {},
        confidence: 0.95,
        risk: 'low',
        parent_ids: [ref.id]
      });
      graph.saveToFile(filePath);

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Remove parent_ids from decision on disk
      raw.nodes[dec.id].parent_ids = [];
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');

      assert.throws(() => {
        DaveEvidenceGraph.loadFromFile(filePath);
      }, TamperDetectedError);

      cleanupTmpDir();
    });
  });

  // ===========================================================================
  // SECTION 3: Detached Node Isolation & Invariant Boundary Enforcement
  // ===========================================================================
  describe('3. Detached Node Isolation & Causal Invariants', () => {
    it('3.1 should isolate completely detached ReferenceNode from queries and maintain clean bounds', () => {
      const graph = new DaveEvidenceGraph();

      // Main trace
      const refMain = graph.addReferenceNode({ reference_id: 'REF-MAIN', type: 'text', uri: 'main.md', content_hash: 'sha256:m' });
      const decMain = graph.addDecisionNode({
        decision_id: 'DAVE-MAIN',
        decision_type: 'ux_ui_design',
        goal_id: 'G-DAVE-004',
        decision: {},
        confidence: 0.9,
        risk: 'low',
        parent_ids: [refMain.id]
      });

      // Detached reference (not referenced by any decision)
      const refDetached = graph.addReferenceNode({
        reference_id: 'REF-DETACHED',
        type: 'image',
        uri: 'detached.png',
        content_hash: 'sha256:detached'
      });

      assert.equal(graph.getNodeCount(), 3);

      // Traversal on detached node must return strictly empty results
      const upstream = graph.queryUpstream(refDetached.id);
      assert.deepEqual(upstream, []);

      const downstream = graph.queryDownstream(refDetached.id);
      assert.deepEqual(downstream, []);

      // No causal chain between detached and main
      const chainsToMain = graph.findCausalChains(refDetached.id, decMain.id);
      assert.deepEqual(chainsToMain, []);

      const chainsFromMain = graph.findCausalChains(refMain.id, refDetached.id);
      assert.deepEqual(chainsFromMain, []);

      // Human-readable explanations
      const impact = graph.queryImpact(refDetached.id);
      assert.ok(impact.includes('Total Descendant Nodes: 0'));
    });

    it('3.2 should flag detached/orphaned ImplementationNode fail-closed in validateInvariants', () => {
      const graph = new DaveEvidenceGraph();

      // Implementation with zero upstream decisions
      const orphanImpl = graph.addImplementationNode({
        commit_hash: '9999999999999999999999999999999999999999',
        goal_id: 'G-DAVE-004',
        files_changed: [{ path: 'foo.js' }],
        description: 'Orphaned code without decision'
      });

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('ImplementationNode') && e.includes('is orphaned')));
    });

    it('3.3 should flag detached/orphaned DecisionNode lacking Reference citations', () => {
      const graph = new DaveEvidenceGraph();

      // Decision without upstream reference citation
      const orphanDec = graph.addDecisionNode({
        decision_id: 'DAVE-ORPHAN-001',
        decision_type: 'security',
        goal_id: 'G-DAVE-004',
        decision: { summary: 'No grounding' },
        confidence: 0.95,
        risk: 'low',
        parent_ids: [] // Detached!
      });

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('DecisionNode') && e.includes('zero upstream Reference citations')));
    });

    it('3.4 should flag detached/orphaned VerificationNode lacking Implementation', () => {
      const graph = new DaveEvidenceGraph();

      const orphanVerif = graph.addVerificationNode({
        receipt_id: 'RCP-ORPHAN',
        harness: 'test-harness',
        passed: true,
        parent_ids: []
      });

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('VerificationNode') && e.includes('zero upstream Implementation commits')));
    });

    it('3.5 should flag detached/orphaned ApprovalNode lacking Verification or Decision', () => {
      const graph = new DaveEvidenceGraph();

      const orphanAppr = graph.addApprovalNode({
        action: 'approve',
        actor: 'lead',
        parent_ids: []
      });

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('ApprovalNode') && e.includes('zero upstream Verification or Decision targets')));
    });

    it('3.6 should flag ImplementationNode linked to high-risk decision without human approval', () => {
      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({ reference_id: 'R', type: 'text', uri: 'r.md', content_hash: 'sha256:r' });
      const decHighRisk = graph.addDecisionNode({
        decision_id: 'DAVE-HIGH-001',
        decision_type: 'security',
        goal_id: 'G-DAVE-004',
        decision: { summary: 'dangerous operation' },
        confidence: 0.99,
        risk: 'high', // High risk requires explicit human_action approve/review
        human_action: 'reject', // Rejected!
        parent_ids: [ref.id]
      });

      graph.addImplementationNode({
        commit_hash: 'badcommit1234567890abcdef1234567890abcdef',
        goal_id: 'G-DAVE-004',
        files_changed: [],
        description: 'Implementing rejected high-risk decision',
        parent_ids: [decHighRisk.id]
      });

      const inv = graph.validateInvariants();
      assert.equal(inv.valid, false);
      assert.ok(inv.errors.some(e => e.includes('linked to high-risk or unapproved decisions')));
    });

    it('3.7 should keep two completely independent subgraphs strictly isolated in queries', () => {
      const graph = new DaveEvidenceGraph();

      // Subgraph A: Goal A
      const refA = graph.addReferenceNode({ reference_id: 'REF-A', type: 'text', uri: 'a.md', content_hash: 'sha256:a' });
      const decA = graph.addDecisionNode({ decision_id: 'DEC-A', decision_type: 'ux_ui_design', goal_id: 'G-A', decision: {}, confidence: 0.9, risk: 'low', parent_ids: [refA.id] });
      const impA = graph.addImplementationNode({ commit_hash: 'cA', goal_id: 'G-A', files_changed: [], description: 'dA', parent_ids: [decA.id] });

      // Subgraph B: Goal B
      const refB = graph.addReferenceNode({ reference_id: 'REF-B', type: 'text', uri: 'b.md', content_hash: 'sha256:b' });
      const decB = graph.addDecisionNode({ decision_id: 'DEC-B', decision_type: 'security', goal_id: 'G-B', decision: {}, confidence: 0.95, risk: 'low', parent_ids: [refB.id] });
      const impB = graph.addImplementationNode({ commit_hash: 'cB', goal_id: 'G-B', files_changed: [], description: 'dB', parent_ids: [decB.id] });

      // Queries on Subgraph A should NEVER see Subgraph B
      const upA = graph.queryUpstream(impA.id);
      assert.equal(upA.length, 2);
      assert.ok(upA.every(n => n.id === decA.id || n.id === refA.id));

      const downB = graph.queryDownstream(refB.id);
      assert.equal(downB.length, 2);
      assert.ok(downB.every(n => n.id === decB.id || n.id === impB.id));

      // Cross-graph path queries must be empty
      assert.deepEqual(graph.findCausalChains(refA.id, impB.id), []);
      assert.deepEqual(graph.findCausalChains(refB.id, impA.id), []);
    });
  });

  // ===========================================================================
  // SECTION 4: High-Stress Query Latency Benchmarks (Sub-5ms SLA Verification)
  // ===========================================================================
  describe('4. Empirical Latency Benchmarks Under Stress (< 5ms SLA)', () => {
    function computeStats(latencies) {
      latencies.sort((a, b) => a - b);
      const count = latencies.length;
      const min = latencies[0];
      const max = latencies[count - 1];
      const p50 = latencies[Math.floor(count * 0.50)];
      const p90 = latencies[Math.floor(count * 0.90)];
      const p95 = latencies[Math.floor(count * 0.95)];
      const p99 = latencies[Math.floor(count * 0.99)];
      const mean = latencies.reduce((s, v) => s + v, 0) / count;
      return { min, max, mean, p50, p90, p95, p99, count };
    }

    it('4.1 should maintain sub-5ms latency across 1,000 iterations on a canonical 7-stage trace DAG', () => {
      const graph = new DaveEvidenceGraph();
      const r = graph.addReferenceNode({ reference_id: 'R', type: 'image', uri: 'r.png', content_hash: 'sha256:r' });
      const d = graph.addDecisionNode({ decision_id: 'D', decision_type: 'ux_ui_design', goal_id: 'G', decision: { summary: 'd' }, confidence: 0.95, risk: 'low', parent_ids: [r.id] });
      const i = graph.addImplementationNode({ commit_hash: 'c', goal_id: 'G', files_changed: [{ path: 'f' }], description: 'i', parent_ids: [d.id] });
      const v = graph.addVerificationNode({ receipt_id: 'V', harness: 'h', passed: true, parent_ids: [i.id] });
      const a = graph.addApprovalNode({ action: 'approve', actor: 'a', parent_ids: [v.id] });

      const trials = 1000;
      const upLatencies = [];
      const downLatencies = [];

      // Warmup 10 iterations
      for (let w = 0; w < 10; w++) {
        graph.queryUpstream(a.id);
        graph.queryDownstream(r.id);
      }

      for (let t = 0; t < trials; t++) {
        const t0 = performance.now();
        const up = graph.queryUpstream(a.id);
        const t1 = performance.now();
        upLatencies.push(t1 - t0);
        assert.equal(up.length, 4);

        const t2 = performance.now();
        const down = graph.queryDownstream(r.id);
        const t3 = performance.now();
        downLatencies.push(t3 - t2);
        assert.equal(down.length, 4);
      }

      const upStats = computeStats(upLatencies);
      const downStats = computeStats(downLatencies);

      // SLA assertion: P99 < 5.0ms, P50 < 0.1ms, Mean < 0.5ms
      assert.ok(upStats.p99 < 5.0, `Upstream P99 latency must be < 5.0ms (got: ${upStats.p99.toFixed(4)}ms)`);
      assert.ok(downStats.p99 < 5.0, `Downstream P99 latency must be < 5.0ms (got: ${downStats.p99.toFixed(4)}ms)`);
      assert.ok(upStats.p50 < 0.1, `Upstream P50 latency must be < 0.1ms (got: ${upStats.p50.toFixed(4)}ms)`);
      assert.ok(downStats.p50 < 0.1, `Downstream P50 latency must be < 0.1ms (got: ${downStats.p50.toFixed(4)}ms)`);
      assert.ok(upStats.mean < 0.5, `Upstream Mean latency must be < 0.5ms (got: ${upStats.mean.toFixed(4)}ms)`);
      assert.ok(downStats.mean < 0.5, `Downstream Mean latency must be < 0.5ms (got: ${downStats.mean.toFixed(4)}ms)`);
    });

    it('4.2 should maintain sub-5ms latency on a deep 500-node linear DAG', () => {
      const graph = new DaveEvidenceGraph();
      const depth = 500;
      const nodes = [];

      nodes.push(graph.addReferenceNode({ reference_id: 'R0', type: 'text', uri: '0.md', content_hash: 'sha256:0' }));
      for (let idx = 1; idx < depth; idx++) {
        nodes.push(graph.addDecisionNode({
          decision_id: `DEC-${idx}`,
          decision_type: 'data_schema',
          goal_id: 'G-DAVE-004',
          decision: { idx },
          confidence: 0.95,
          risk: 'low',
          parent_ids: [nodes[idx - 1].id]
        }));
      }

      assert.equal(graph.getNodeCount(), depth);

      const leafId = nodes[depth - 1].id;
      const rootId = nodes[0].id;
      const trials = 200;
      const upLatencies = [];
      const downLatencies = [];

      // Warmup 10 iterations to stabilize V8 JIT and GC after allocating 500 nodes
      for (let w = 0; w < 10; w++) {
        graph.queryUpstream(leafId);
        graph.queryDownstream(rootId);
      }

      for (let t = 0; t < trials; t++) {
        const t0 = performance.now();
        const up = graph.queryUpstream(leafId);
        const t1 = performance.now();
        upLatencies.push(t1 - t0);
        assert.equal(up.length, depth - 1);

        const t2 = performance.now();
        const down = graph.queryDownstream(rootId);
        const t3 = performance.now();
        downLatencies.push(t3 - t2);
        assert.equal(down.length, depth - 1);
      }

      const upStats = computeStats(upLatencies);
      const downStats = computeStats(downLatencies);

      assert.ok(upStats.p95 < 5.0, `500-node Upstream P95 latency must be < 5.0ms (got: ${upStats.p95.toFixed(4)}ms)`);
      assert.ok(downStats.p95 < 5.0, `500-node Downstream P95 latency must be < 5.0ms (got: ${downStats.p95.toFixed(4)}ms)`);
      assert.ok(upStats.p50 < 1.0, `500-node Upstream P50 latency must be < 1.0ms (got: ${upStats.p50.toFixed(4)}ms)`);
      assert.ok(downStats.p50 < 1.0, `500-node Downstream P50 latency must be < 1.0ms (got: ${downStats.p50.toFixed(4)}ms)`);
    });

    it('4.3 should maintain sub-5ms latency on a dense branching DAG with 500 nodes and multi-parent diamonds', () => {
      const graph = new DaveEvidenceGraph();
      const totalNodes = 500;
      const layers = 10;
      const nodesPerLayer = totalNodes / layers; // 50 per layer

      const layerNodes = [];

      // Layer 0: References
      const layer0 = [];
      for (let i = 0; i < nodesPerLayer; i++) {
        layer0.push(graph.addReferenceNode({
          reference_id: `REF-L0-${i}`,
          type: 'text',
          uri: `l0-${i}.md`,
          content_hash: `sha256:l0-${i}`
        }));
      }
      layerNodes.push(layer0);

      // Layers 1 to 9: Decisions per layer, each referencing 2 nodes from previous layer
      for (let l = 1; l < layers; l++) {
        const currentLayer = [];
        const prevLayer = layerNodes[l - 1];
        for (let i = 0; i < nodesPerLayer; i++) {
          const parent1 = prevLayer[i];
          const parent2 = prevLayer[(i + 1) % nodesPerLayer];
          currentLayer.push(graph.addDecisionNode({
            decision_id: `DEC-L${l}-${i}`,
            decision_type: 'data_schema',
            goal_id: 'G-DAVE-004',
            decision: { layer: l, index: i },
            confidence: 0.95,
            risk: 'low',
            parent_ids: [parent1.id, parent2.id]
          }));
        }
        layerNodes.push(currentLayer);
      }

      assert.equal(graph.getNodeCount(), totalNodes);
      assert.equal(graph.getEdgeCount(), (layers - 1) * nodesPerLayer * 2); // 9 * 50 * 2 = 900 edges

      const sampleLeaf = layerNodes[layers - 1][0];
      const sampleRoot = layerNodes[0][0];

      // Warmup 10 iterations to stabilize V8 JIT and GC after allocating 500 nodes
      for (let w = 0; w < 10; w++) {
        graph.queryUpstream(sampleLeaf.id);
        graph.queryDownstream(sampleRoot.id);
      }

      const trials = 200;
      const upLatencies = [];
      const downLatencies = [];

      for (let t = 0; t < trials; t++) {
        const t0 = performance.now();
        const up = graph.queryUpstream(sampleLeaf.id);
        const t1 = performance.now();
        upLatencies.push(t1 - t0);
        assert.ok(up.length > 0);

        const t2 = performance.now();
        const down = graph.queryDownstream(sampleRoot.id);
        const t3 = performance.now();
        downLatencies.push(t3 - t2);
        assert.ok(down.length > 0);
      }

      const upStats = computeStats(upLatencies);
      const downStats = computeStats(downLatencies);

      assert.ok(upStats.p95 < 5.0, `500-node Dense Upstream P95 latency must be < 5.0ms (got: ${upStats.p95.toFixed(4)}ms)`);
      assert.ok(downStats.p95 < 5.0, `500-node Dense Downstream P95 latency must be < 5.0ms (got: ${downStats.p95.toFixed(4)}ms)`);
      assert.ok(upStats.p50 < 1.0, `500-node Dense Upstream P50 latency must be < 1.0ms (got: ${upStats.p50.toFixed(4)}ms)`);
      assert.ok(downStats.p50 < 1.0, `500-node Dense Downstream P50 latency must be < 1.0ms (got: ${downStats.p50.toFixed(4)}ms)`);
    });

    it('4.4 should verify Merkle root calculation and full invariant validation under stress', () => {
      const graph = new DaveEvidenceGraph();
      const ref = graph.addReferenceNode({ reference_id: 'R', type: 'text', uri: 'r.md', content_hash: 'sha256:r' });
      const dec = graph.addDecisionNode({ decision_id: 'D', decision_type: 'ux_ui_design', goal_id: 'G-DAVE-004', decision: {}, confidence: 0.9, risk: 'low', parent_ids: [ref.id] });
      const imp = graph.addImplementationNode({ commit_hash: 'c', goal_id: 'G-DAVE-004', files_changed: [], description: 'd', parent_ids: [dec.id] });
      const ver = graph.addVerificationNode({ receipt_id: 'V', harness: 'h', passed: true, parent_ids: [imp.id] });
      const app = graph.addApprovalNode({ action: 'approve', actor: 'a', parent_ids: [ver.id] });

      // Run 200 Merkle root evaluations
      const merkleTimes = [];
      let root = null;
      for (let i = 0; i < 200; i++) {
        const t0 = performance.now();
        const r = graph.computeMerkleRoot();
        const t1 = performance.now();
        merkleTimes.push(t1 - t0);
        if (root === null) root = r;
        assert.equal(r, root, 'Merkle root computation must be strictly deterministic');
      }

      const mStats = computeStats(merkleTimes);
      assert.ok(mStats.p99 < 5.0, `Merkle root computation P99 must be < 5.0ms (got: ${mStats.p99.toFixed(4)}ms)`);

      // Warmup invariant validation once
      graph.validateInvariants();

      // Run full invariant validation pass
      const invT0 = performance.now();
      const inv = graph.validateInvariants();
      const invDuration = performance.now() - invT0;
      assert.equal(inv.valid, true);
      assert.equal(inv.errors.length, 0);
      assert.ok(invDuration < 5.0, `Full invariant validation must be < 5.0ms (got: ${invDuration.toFixed(4)}ms)`);
    });
  });
});

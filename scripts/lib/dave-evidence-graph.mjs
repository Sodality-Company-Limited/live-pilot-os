/**
 * scripts/lib/dave-evidence-graph.mjs
 *
 * DAVE Reference Evidence Graph Engine
 * Goal: G-DAVE-004
 *
 * Implements a content-addressed Merkle Directed Acyclic Graph (DAG) linking
 * upstream multimodal reference artifacts (REF-xxxx), DAVE decision records (DAVE-xxxx),
 * code implementation commits, test verification receipts, and human approvals.
 * Enforces cryptographic tamper-evidence, strict acyclicity, causal edge invariants,
 * and high-performance bidirectional queries (< 5ms SLA).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DAVE_DECISION_TYPES } from './dave-engine.mjs';

/**
 * 5 Canonical Graph Node Types
 */
export const DAVE_GRAPH_NODE_TYPES = Object.freeze([
  'reference',
  'decision',
  'implementation',
  'verification',
  'approval'
]);

/**
 * 5 Canonical Edge Types
 */
export const DAVE_EDGE_TYPES = Object.freeze([
  'grounds',
  'implements',
  'verifies',
  'approves',
  'derives'
]);

/**
 * Custom Error Classes for Fail-Closed Domain Handling
 */
export class CycleDetectedError extends Error {
  constructor(message, cyclePath = []) {
    super(message);
    this.name = 'CycleDetectedError';
    this.cyclePath = cyclePath;
  }
}

export class InvalidNodeSchemaError extends Error {
  constructor(message, validationErrors = []) {
    super(message);
    this.name = 'InvalidNodeSchemaError';
    this.validationErrors = validationErrors;
  }
}

export class DanglingEdgeError extends Error {
  constructor(message, missingNodeId = null) {
    super(message);
    this.name = 'DanglingEdgeError';
    this.missingNodeId = missingNodeId;
  }
}

export class OrphanedNodeError extends Error {
  constructor(message, orphanedNodeIds = []) {
    super(message);
    this.name = 'OrphanedNodeError';
    this.orphanedNodeIds = orphanedNodeIds;
  }
}

export class TamperDetectedError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TamperDetectedError';
    this.details = details;
  }
}

/**
 * Deterministic JSON stringifier with key sorting
 * @param {*} value
 * @returns {string}
 */
export function canonicalJsonStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(value).sort();
  const pairs = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(value[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Compute content-addressed SHA-256 node ID
 * @param {string} nodeType
 * @param {object} payload
 * @param {string[]} parentIds
 * @returns {string} dave:node:sha256:<hex>
 */
export function computeNodeId(nodeType, payload, parentIds = []) {
  // Extract pure payload without ephemeral fields or generated IDs
  const cleanPayload = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key !== 'id' && key !== 'parent_ids' && key !== 'child_ids' && key !== 'created_at') {
      cleanPayload[key] = val;
    }
  }

  const sortedParents = [...(parentIds || [])].sort();
  const canonicalData = canonicalJsonStringify({
    node_type: nodeType,
    payload: cleanPayload,
    parents: sortedParents
  });

  const hash = crypto.createHash('sha256').update(canonicalData).digest('hex');
  return `dave:node:sha256:${hash}`;
}

/**
 * DAVE Reference Evidence Graph Class
 */
export class DaveEvidenceGraph {
  constructor(options = {}) {
    this.schemaVersion = options.schemaVersion || '1.0.0';
    this.generatedAt = options.generatedAt || null;
    this.nodes = new Map(); // id -> node
    this.edges = []; // [{ from, to, type }]
    this.incoming = new Map(); // id -> Set<parentId>
    this.outgoing = new Map(); // id -> Set<childId>
  }

  /**
   * Has node check
   * @param {string} id
   * @returns {boolean}
   */
  hasNode(id) {
    return this.nodes.has(id);
  }

  /**
   * Get node by ID
   * @param {string} id
   * @returns {object|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get total node count
   * @returns {number}
   */
  getNodeCount() {
    return this.nodes.size;
  }

  /**
   * Get total edge count
   * @returns {number}
   */
  getEdgeCount() {
    return this.edges.length;
  }

  /**
   * Get all registered nodes
   * @returns {object[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all registered edges
   * @returns {object[]}
   */
  getAllEdges() {
    return [...this.edges];
  }

  /**
   * Internal helper to register adjacency entries
   */
  _ensureAdjacency(id) {
    if (!this.incoming.has(id)) {
      this.incoming.set(id, new Set());
    }
    if (!this.outgoing.has(id)) {
      this.outgoing.set(id, new Set());
    }
  }

  /**
   * Add a generic typed node with validation and content-addressing
   * @param {object} nodeData
   * @returns {object}
   */
  addNode(nodeData) {
    if (!nodeData || typeof nodeData !== 'object') {
      throw new InvalidNodeSchemaError('Node data must be a non-null object');
    }

    const nodeType = nodeData.node_type;
    if (!nodeType || !DAVE_GRAPH_NODE_TYPES.includes(nodeType)) {
      throw new InvalidNodeSchemaError(
        `Invalid node_type '${nodeType}'. Must be one of: ${DAVE_GRAPH_NODE_TYPES.join(', ')}`
      );
    }

    const parentIds = Array.isArray(nodeData.parent_ids) ? [...nodeData.parent_ids] : [];

    // Verify parent nodes exist
    for (const pid of parentIds) {
      if (!this.nodes.has(pid)) {
        throw new DanglingEdgeError(`Parent node '${pid}' does not exist in graph`, pid);
      }
    }

    // Validate type-specific schemas
    this._validateSpecificNodeSchema(nodeType, nodeData);

    // Compute content-addressed ID
    const nodeId = computeNodeId(nodeType, nodeData, parentIds);

    // Check if node with identical content already exists
    if (this.nodes.has(nodeId)) {
      return this.nodes.get(nodeId);
    }

    const node = {
      ...nodeData,
      id: nodeId,
      node_type: nodeType,
      parent_ids: parentIds,
      child_ids: [],
      created_at: nodeData.created_at || new Date().toISOString()
    };

    this.nodes.set(nodeId, node);
    this._ensureAdjacency(nodeId);

    // Create incoming edges from declared parents
    for (const pid of parentIds) {
      const edgeType = this._determineEdgeType(this.nodes.get(pid).node_type, nodeType);
      this.addEdge(pid, nodeId, edgeType);
    }

    return node;
  }

  /**
   * Ingest ReferenceNode
   * @param {object} options
   * @returns {object}
   */
  addReferenceNode(options) {
    return this.addNode({
      ...options,
      node_type: 'reference'
    });
  }

  /**
   * Ingest DecisionNode
   * @param {object} options
   * @returns {object}
   */
  addDecisionNode(options) {
    return this.addNode({
      ...options,
      node_type: 'decision'
    });
  }

  /**
   * Ingest ImplementationNode
   * @param {object} options
   * @returns {object}
   */
  addImplementationNode(options) {
    return this.addNode({
      ...options,
      node_type: 'implementation'
    });
  }

  /**
   * Ingest VerificationNode
   * @param {object} options
   * @returns {object}
   */
  addVerificationNode(options) {
    return this.addNode({
      ...options,
      node_type: 'verification'
    });
  }

  /**
   * Ingest ApprovalNode
   * @param {object} options
   * @returns {object}
   */
  addApprovalNode(options) {
    return this.addNode({
      ...options,
      node_type: 'approval'
    });
  }

  /**
   * Determine semantic edge type between source and target
   */
  _determineEdgeType(srcType, tgtType) {
    if (srcType === 'reference' && tgtType === 'decision') return 'grounds';
    if (srcType === 'reference' && tgtType === 'reference') return 'derives';
    if (srcType === 'decision' && tgtType === 'implementation') return 'implements';
    if (srcType === 'implementation' && tgtType === 'verification') return 'verifies';
    if (tgtType === 'approval') return 'approves';
    return 'grounds';
  }

  /**
   * Add a directed causal edge from parent to child
   * @param {string} fromId
   * @param {string} toId
   * @param {string} edgeType
   */
  addEdge(fromId, toId, edgeType = 'grounds') {
    if (!this.nodes.has(fromId)) {
      throw new DanglingEdgeError(`Source node '${fromId}' does not exist in graph`, fromId);
    }
    if (!this.nodes.has(toId)) {
      throw new DanglingEdgeError(`Target node '${toId}' does not exist in graph`, toId);
    }

    if (!DAVE_EDGE_TYPES.includes(edgeType)) {
      throw new InvalidNodeSchemaError(
        `Invalid edgeType '${edgeType}'. Must be one of: ${DAVE_EDGE_TYPES.join(', ')}`
      );
    }

    // Direct loop prevention
    if (fromId === toId) {
      throw new CycleDetectedError(
        `Cycle detected: self-referential loop on node '${fromId}'`,
        [fromId, toId]
      );
    }

    // Check if adding edge fromId -> toId creates a cycle
    // (i.e. if there is already a path from toId to fromId)
    if (this.hasPath(toId, fromId)) {
      const cyclePath = this._findPath(toId, fromId);
      cyclePath.push(toId);
      throw new CycleDetectedError(
        `Cycle detected in causal graph: adding edge '${fromId}' -> '${toId}' creates a directed cycle: ${cyclePath.join(' -> ')}`,
        cyclePath
      );
    }

    // Check if edge already exists
    const existing = this.edges.find(e => e.from === fromId && e.to === toId);
    if (!existing) {
      this.edges.push({ from: fromId, to: toId, type: edgeType });
    }

    this._ensureAdjacency(fromId);
    this._ensureAdjacency(toId);

    this.outgoing.get(fromId).add(toId);
    this.incoming.get(toId).add(fromId);

    // Update node reference arrays
    const parentNode = this.nodes.get(fromId);
    const childNode = this.nodes.get(toId);

    if (!parentNode.child_ids.includes(toId)) {
      parentNode.child_ids.push(toId);
    }
    if (!childNode.parent_ids.includes(fromId)) {
      childNode.parent_ids.push(fromId);
    }
  }

  /**
   * Check if a directed path exists from startId to targetId
   * @param {string} startId
   * @param {string} targetId
   * @returns {boolean}
   */
  hasPath(startId, targetId) {
    if (startId === targetId) return true;
    const visited = new Set();
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = this.outgoing.get(curr);
      if (neighbors) {
        for (const n of neighbors) {
          if (n === targetId) return true;
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }
    return false;
  }

  /**
   * Internal helper to find path for diagnostic cycle reporting
   */
  _findPath(startId, targetId) {
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const pathArr = queue.shift();
      const node = pathArr[pathArr.length - 1];

      if (node === targetId) {
        return pathArr;
      }

      const neighbors = this.outgoing.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([...pathArr, neighbor]);
          }
        }
      }
    }
    return [startId, targetId];
  }

  /**
   * Validate type-specific node fields
   */
  _validateSpecificNodeSchema(type, node) {
    const errors = [];

    if (type === 'reference') {
      if (!node.reference_id || typeof node.reference_id !== 'string') {
        errors.push('ReferenceNode requires non-empty reference_id');
      }
      if (!node.type || typeof node.type !== 'string') {
        errors.push('ReferenceNode requires valid type string');
      }
      if (!node.uri || typeof node.uri !== 'string') {
        errors.push('ReferenceNode requires valid uri string');
      }
      if (!node.content_hash || typeof node.content_hash !== 'string') {
        errors.push('ReferenceNode requires valid content_hash string (e.g. sha256:...)');
      }
    } else if (type === 'decision') {
      if (!node.decision_id || typeof node.decision_id !== 'string') {
        errors.push('DecisionNode requires non-empty decision_id');
      }
      if (!node.decision_type || !DAVE_DECISION_TYPES.includes(node.decision_type)) {
        errors.push(`DecisionNode requires decision_type from DAVE_DECISION_TYPES (got: ${node.decision_type})`);
      }
      if (!node.goal_id || typeof node.goal_id !== 'string') {
        errors.push('DecisionNode requires non-empty goal_id');
      }
      if (!node.decision || typeof node.decision !== 'object') {
        errors.push('DecisionNode requires decision object body');
      }
      if (typeof node.confidence !== 'number' || isNaN(node.confidence) || node.confidence < 0.0 || node.confidence > 1.0) {
        errors.push(`DecisionNode requires confidence in [0.0, 1.0] (got: ${node.confidence})`);
      }
      const validRisks = ['low', 'medium', 'high'];
      if (!node.risk || !validRisks.includes(node.risk)) {
        errors.push(`DecisionNode requires risk in: ${validRisks.join(', ')}`);
      }
    } else if (type === 'implementation') {
      if (!node.commit_hash || typeof node.commit_hash !== 'string') {
        errors.push('ImplementationNode requires non-empty commit_hash');
      }
      if (!node.goal_id || typeof node.goal_id !== 'string') {
        errors.push('ImplementationNode requires non-empty goal_id');
      }
      if (!Array.isArray(node.files_changed)) {
        errors.push('ImplementationNode requires files_changed array');
      }
      if (!node.description || typeof node.description !== 'string') {
        errors.push('ImplementationNode requires description string');
      }
    } else if (type === 'verification') {
      if (!node.receipt_id || typeof node.receipt_id !== 'string') {
        errors.push('VerificationNode requires non-empty receipt_id');
      }
      if (!node.harness || typeof node.harness !== 'string') {
        errors.push('VerificationNode requires harness command string');
      }
      if (typeof node.passed !== 'boolean') {
        errors.push('VerificationNode requires passed boolean');
      }
    } else if (type === 'approval') {
      const validActions = ['approve', 'review', 'proceed', 'reject', 'request_revision'];
      if (!node.action || !validActions.includes(node.action)) {
        errors.push(`ApprovalNode requires action in: ${validActions.join(', ')}`);
      }
      if (!node.actor || typeof node.actor !== 'string') {
        errors.push('ApprovalNode requires actor string');
      }
    }

    if (errors.length > 0) {
      throw new InvalidNodeSchemaError(
        `Failed schema validation for node type '${type}': ${errors.join('; ')}`,
        errors
      );
    }
  }

  /**
   * Topological Sort of graph nodes (Kahn's Algorithm)
   * @returns {object[]} Nodes in topological order
   */
  topologicalSort() {
    const inDegree = new Map();
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
    }

    for (const edge of this.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    const queue = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sorted = [];
    while (queue.length > 0) {
      const u = queue.shift();
      sorted.push(this.nodes.get(u));

      const neighbors = this.outgoing.get(u);
      if (neighbors) {
        for (const v of neighbors) {
          inDegree.set(v, inDegree.get(v) - 1);
          if (inDegree.get(v) === 0) {
            queue.push(v);
          }
        }
      }
    }

    if (sorted.length !== this.nodes.size) {
      throw new CycleDetectedError('Topological sort failed: graph contains one or more cycles');
    }

    return sorted;
  }

  /**
   * Check if the graph is strictly acyclic
   * @returns {boolean}
   */
  isAcyclic() {
    try {
      this.topologicalSort();
      return true;
    } catch (err) {
      if (err instanceof CycleDetectedError) return false;
      throw err;
    }
  }

  /**
   * Get parent nodes of a node
   * @param {string} nodeId
   * @returns {object[]}
   */
  getNodeParents(nodeId) {
    const pids = this.incoming.get(nodeId);
    if (!pids) return [];
    return Array.from(pids).map(pid => this.nodes.get(pid)).filter(Boolean);
  }

  /**
   * Get child nodes of a node
   * @param {string} nodeId
   * @returns {object[]}
   */
  getNodeChildren(nodeId) {
    const cids = this.outgoing.get(nodeId);
    if (!cids) return [];
    return Array.from(cids).map(cid => this.nodes.get(cid)).filter(Boolean);
  }

  /**
   * Upstream query: trace backwards from a node along incoming edges
   * Answers: "Why does this node exist?"
   * @param {string} startNodeId
   * @param {object} [options]
   * @param {string} [options.filterType]
   * @param {number} [options.maxDepth]
   * @returns {object[]}
   */
  queryUpstream(startNodeId, options = {}) {
    if (!this.nodes.has(startNodeId)) {
      throw new DanglingEdgeError(`Node '${startNodeId}' not found in graph`, startNodeId);
    }

    const filterType = options.filterType || null;
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : Infinity;

    const visited = new Set();
    const result = [];
    const queue = [{ id: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depth > maxDepth) continue;

      const pids = this.incoming.get(id);
      if (pids) {
        for (const pid of pids) {
          if (!visited.has(pid)) {
            visited.add(pid);
            const parentNode = this.nodes.get(pid);
            if (!filterType || parentNode.node_type === filterType) {
              result.push(parentNode);
            }
            queue.push({ id: pid, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Downstream query: trace forward from a node along outgoing edges
   * Answers: "What was impacted by this node?"
   * @param {string} startNodeId
   * @param {object} [options]
   * @param {string} [options.filterType]
   * @param {number} [options.maxDepth]
   * @returns {object[]}
   */
  queryDownstream(startNodeId, options = {}) {
    if (!this.nodes.has(startNodeId)) {
      throw new DanglingEdgeError(`Node '${startNodeId}' not found in graph`, startNodeId);
    }

    const filterType = options.filterType || null;
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : Infinity;

    const visited = new Set();
    const result = [];
    const queue = [{ id: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depth > maxDepth) continue;

      const cids = this.outgoing.get(id);
      if (cids) {
        for (const cid of cids) {
          if (!visited.has(cid)) {
            visited.add(cid);
            const childNode = this.nodes.get(cid);
            if (!filterType || childNode.node_type === filterType) {
              result.push(childNode);
            }
            queue.push({ id: cid, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Find all directed causal paths between startNodeId and endNodeId
   * @param {string} startNodeId
   * @param {string} endNodeId
   * @returns {Array<object[]>}
   */
  findCausalChains(startNodeId, endNodeId) {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
      return [];
    }

    const paths = [];
    const dfs = (currentId, currentPath, visited) => {
      if (currentId === endNodeId) {
        paths.push(currentPath.map(id => this.nodes.get(id)));
        return;
      }

      const neighbors = this.outgoing.get(currentId);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            dfs(n, [...currentPath, n], visited);
            visited.delete(n);
          }
        }
      }
    };

    dfs(startNodeId, [startNodeId], new Set([startNodeId]));
    return paths;
  }

  /**
   * Human-readable explanation of why a node exists
   * @param {string} nodeId
   * @returns {string}
   */
  queryWhy(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return `Node ${nodeId} not found in graph.`;

    const upstream = this.queryUpstream(nodeId);
    const decisions = upstream.filter(n => n.node_type === 'decision');
    const references = upstream.filter(n => n.node_type === 'reference');

    const lines = [
      `Causal Origin for [${node.node_type.toUpperCase()}] ${nodeId}:`,
      `  Goal: ${node.goal_id || 'N/A'}`
    ];

    if (decisions.length > 0) {
      lines.push('  Grounding Decisions:');
      for (const d of decisions) {
        lines.push(`    - [${d.decision_id}] (${d.decision_type}) ${d.decision?.summary || 'No summary'} (conf: ${d.confidence})`);
      }
    }

    if (references.length > 0) {
      lines.push('  Authoritative References:');
      for (const r of references) {
        lines.push(`    - [${r.reference_id}] (${r.type}) ${r.uri} (hash: ${r.content_hash})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Human-readable explanation of what was impacted by a node
   * @param {string} nodeId
   * @returns {string}
   */
  queryImpact(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return `Node ${nodeId} not found in graph.`;

    const downstream = this.queryDownstream(nodeId);
    const lines = [
      `Impact Analysis for [${node.node_type.toUpperCase()}] ${nodeId}:`,
      `  Total Descendant Nodes: ${downstream.length}`
    ];

    for (const d of downstream) {
      const summary = d.decision_id || d.commit_hash || d.receipt_id || d.id;
      lines.push(`    - [${d.node_type}] ${summary}`);
    }

    return lines.join('\n');
  }

  /**
   * Compute deterministic Merkle Root digest over all nodes and graph topology
   * @returns {string} 64-char hex SHA-256 Merkle root
   */
  computeMerkleRoot() {
    if (this.nodes.size === 0) {
      return crypto.createHash('sha256').update('EMPTY_DAVE_EVIDENCE_GRAPH').digest('hex');
    }

    const sortedNodes = this.topologicalSort();
    const digests = sortedNodes.map(n => {
      const pids = [...(n.parent_ids || [])].sort();
      return `${n.id}:${pids.join(',')}`;
    });

    return crypto.createHash('sha256').update(digests.join('||')).digest('hex');
  }

  /**
   * Comprehensive Invariant and Edge Validation Pass
   * @returns {{ valid: boolean, errors: string[], nodeCount: number, edgeCount: number, merkleRoot: string }}
   */
  validateInvariants() {
    const errors = [];

    // 1. Acyclicity Check
    if (!this.isAcyclic()) {
      errors.push('DAG Invariant Violation: Graph contains one or more directed cycles');
    }

    // 2. Dangling edge check
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.from)) {
        errors.push(`Dangling edge source: node '${edge.from}' not found`);
      }
      if (!this.nodes.has(edge.to)) {
        errors.push(`Dangling edge target: node '${edge.to}' not found`);
      }
    }

    // 3. Node-specific causal invariants
    for (const node of this.nodes.values()) {
      const upstream = this.queryUpstream(node.id);

      if (node.node_type === 'implementation') {
        const decisions = upstream.filter(n => n.node_type === 'decision');
        if (decisions.length === 0) {
          errors.push(`ImplementationNode '${node.id}' (commit: ${node.commit_hash}) is orphaned: traces to at least one approved DecisionNode required`);
        } else {
          // Check that at least one decision is approved or normal risk with high confidence
          const hasValidApproval = decisions.some(d => {
            if (d.risk === 'high') {
              return d.human_action === 'approve' || d.human_action === 'review';
            }
            return d.confidence >= 0.85;
          });
          if (!hasValidApproval) {
            errors.push(`ImplementationNode '${node.id}' is linked to high-risk or unapproved decisions without human approval`);
          }
        }
      }

      if (node.node_type === 'decision') {
        const references = upstream.filter(n => n.node_type === 'reference');
        if (references.length === 0) {
          errors.push(`DecisionNode '${node.id}' (${node.decision_id}) has zero upstream Reference citations`);
        }
      }

      if (node.node_type === 'verification') {
        const implementations = upstream.filter(n => n.node_type === 'implementation');
        if (implementations.length === 0) {
          errors.push(`VerificationNode '${node.id}' (${node.receipt_id}) has zero upstream Implementation commits`);
        }
      }

      if (node.node_type === 'approval') {
        const verifsOrDecs = upstream.filter(n => n.node_type === 'verification' || n.node_type === 'decision');
        if (verifsOrDecs.length === 0) {
          errors.push(`ApprovalNode '${node.id}' has zero upstream Verification or Decision targets`);
        }
      }

      // Re-verify content address
      const expectedId = computeNodeId(node.node_type, node, node.parent_ids);
      if (node.id !== expectedId) {
        errors.push(`Content digest mismatch for node '${node.id}': expected '${expectedId}' (tampering detected)`);
      }
    }

    const merkleRoot = this.computeMerkleRoot();

    return {
      valid: errors.length === 0,
      errors,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      merkleRoot
    };
  }

  /**
   * Serialize graph to structured JSON object
   * @param {object} [options]
   * @returns {object}
   */
  exportJson(options = {}) {
    const nodesObj = {};
    for (const [id, node] of this.nodes.entries()) {
      nodesObj[id] = { ...node };
    }

    return {
      schema_version: this.schemaVersion,
      merkle_root: this.computeMerkleRoot(),
      generated_at: options.generatedAt || this.generatedAt || new Date().toISOString(),
      node_count: this.nodes.size,
      edge_count: this.edges.length,
      nodes: nodesObj,
      edges: [...this.edges]
    };
  }

  /**
   * Alias toJSON
   */
  toJSON() {
    return this.exportJson();
  }

  /**
   * Save serialized graph snapshot to file atomically
   * @param {string} filePath
   * @param {object} [options]
   */
  saveToFile(filePath, options = {}) {
    const resolvedPath = path.resolve(filePath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const currentMerkle = this.computeMerkleRoot();
    const exportOpts = { ...options };

    if (fs.existsSync(resolvedPath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        if (existingData && existingData.merkle_root === currentMerkle) {
          // If the graph topology and Merkle root are identical, preserve deterministic timestamps
          if (!exportOpts.generatedAt && existingData.generated_at) {
            exportOpts.generatedAt = existingData.generated_at;
          }
          if (existingData.nodes && typeof existingData.nodes === 'object') {
            for (const [id, exNode] of Object.entries(existingData.nodes)) {
              const liveNode = this.nodes.get(id);
              if (liveNode && exNode.created_at) {
                liveNode.created_at = exNode.created_at;
              }
            }
          }
        }
      } catch {
        // Fall back to default generation if existing file is unparseable
      }
    }

    const json = JSON.stringify(this.exportJson(exportOpts), null, 2);
    fs.writeFileSync(resolvedPath, json, 'utf8');
  }

  /**
   * Reconstruct graph from JSON data
   * @param {object|string} input
   * @returns {DaveEvidenceGraph}
   */
  static fromJSON(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (!data || typeof data !== 'object' || !data.nodes || !Array.isArray(data.edges)) {
      throw new InvalidNodeSchemaError('Malformed graph JSON payload');
    }

    const graph = new DaveEvidenceGraph({
      schemaVersion: data.schema_version,
      generatedAt: data.generated_at
    });

    // Ingest all nodes
    const nodeEntries = Array.isArray(data.nodes)
      ? data.nodes
      : Object.values(data.nodes);

    for (const nodeData of nodeEntries) {
      // Check content address integrity before insertion
      const expectedId = computeNodeId(nodeData.node_type, nodeData, nodeData.parent_ids || []);
      if (nodeData.id !== expectedId) {
        throw new TamperDetectedError(
          `Tamper detected during graph deserialization: node '${nodeData.id}' content hash does not match computed '${expectedId}'`,
          { declaredId: nodeData.id, computedId: expectedId, nodeData }
        );
      }

      graph.nodes.set(nodeData.id, {
        ...nodeData,
        parent_ids: Array.isArray(nodeData.parent_ids) ? [...nodeData.parent_ids] : [],
        child_ids: Array.isArray(nodeData.child_ids) ? [...nodeData.child_ids] : []
      });
      graph._ensureAdjacency(nodeData.id);
    }

    // Reconstruct edges
    for (const edge of data.edges) {
      graph.addEdge(edge.from, edge.to, edge.type);
    }

    // Verify Merkle Root
    if (data.merkle_root && graph.computeMerkleRoot() !== data.merkle_root) {
      throw new TamperDetectedError(
        `Merkle root digest mismatch on graph deserialization: declared '${data.merkle_root}', computed '${graph.computeMerkleRoot()}'`,
        { declared: data.merkle_root, computed: graph.computeMerkleRoot() }
      );
    }

    return graph;
  }

  /**
   * Load and reconstruct graph from JSON file
   * @param {string} filePath
   * @returns {DaveEvidenceGraph}
   */
  static loadFromFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Graph file does not exist: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    return DaveEvidenceGraph.fromJSON(content);
  }
}

export default DaveEvidenceGraph;

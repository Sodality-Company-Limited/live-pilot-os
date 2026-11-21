/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS DETERMINISTIC ACYCLIC UI SCENE GRAPH GENERATOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M2 / G-UX-007)
 * Purpose: 32-class canonical UI node taxonomy, edge taxonomy (parent_child,
 *          sibling, visual_containment, z_index_layer), Kahn's topological sort
 *          with formal cycle detection (throws CyclicSceneGraphError), canonical
 *          node ordering (z -> y -> x -> id), and SHA-256 graph digest.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const UI_SCENE_GRAPH_SCHEMA_VERSION = 1;

export const CANONICAL_UI_TAXONOMY = Object.freeze({
  // Containers (8)
  ScreenRoot: 'container',
  ModalDialog: 'container',
  CardContainer: 'container',
  DrawerPanel: 'container',
  SidebarNavigation: 'container',
  HeaderBar: 'container',
  FooterBar: 'container',
  AccordionSection: 'container',
  // Controls (7)
  PrimaryButton: 'control',
  SecondaryButton: 'control',
  IconButton: 'control',
  CheckboxControl: 'control',
  RadioGroupControl: 'control',
  SwitchToggle: 'control',
  SliderControl: 'control',
  // Inputs (6)
  TextInputField: 'input',
  TextAreaField: 'input',
  SelectDropdown: 'input',
  DatePickerField: 'input',
  SearchBarInput: 'input',
  FileUploadZone: 'input',
  // Display (5)
  HeadingTypography: 'display',
  BodyTypography: 'display',
  BadgePill: 'display',
  AvatarImage: 'display',
  IconGlyph: 'display',
  // Data & Feedback (3)
  TableViewGrid: 'data_feedback',
  MetricStatCard: 'data_feedback',
  AlertBannerToast: 'data_feedback',
  // Navigation (3)
  BreadcrumbTrail: 'navigation',
  TabBarStrip: 'navigation',
  PaginationControl: 'navigation'
});

export const CANONICAL_EDGE_RELATIONSHIPS = Object.freeze([
  'parent_child',
  'sibling',
  'visual_containment',
  'z_index_layer'
]);

export class CyclicSceneGraphError extends Error {
  constructor(cycleNodes, message = null) {
    const msg = message || `Cyclic dependency detected in UI scene graph among nodes: ${cycleNodes.join(', ')}`;
    super(msg);
    this.name = 'CyclicSceneGraphError';
    this.cycleNodes = cycleNodes;
  }
}

/**
 * Maps canonical UI component class to ARIA role.
 */
export function mapAriaRole(componentType) {
  const roleMap = {
    ScreenRoot: 'application',
    ModalDialog: 'dialog',
    CardContainer: 'region',
    DrawerPanel: 'complementary',
    SidebarNavigation: 'navigation',
    HeaderBar: 'banner',
    FooterBar: 'contentinfo',
    AccordionSection: 'region',
    PrimaryButton: 'button',
    SecondaryButton: 'button',
    IconButton: 'button',
    CheckboxControl: 'checkbox',
    RadioGroupControl: 'radiogroup',
    SwitchToggle: 'switch',
    SliderControl: 'slider',
    TextInputField: 'textbox',
    TextAreaField: 'textbox',
    SelectDropdown: 'combobox',
    DatePickerField: 'group',
    SearchBarInput: 'searchbox',
    FileUploadZone: 'region',
    HeadingTypography: 'heading',
    BodyTypography: 'paragraph',
    BadgePill: 'status',
    AvatarImage: 'img',
    IconGlyph: 'img',
    TableViewGrid: 'table',
    MetricStatCard: 'region',
    AlertBannerToast: 'alert',
    BreadcrumbTrail: 'navigation',
    TabBarStrip: 'tablist',
    PaginationControl: 'navigation'
  };
  return roleMap[componentType] || 'generic';
}

function strictlyContains(boxA, boxB) {
  const [ax1, ay1, aw, ah] = boxA;
  const [bx1, by1, bw, bh] = boxB;
  const ax2 = ax1 + aw;
  const ay2 = ay1 + ah;
  const bx2 = bx1 + bw;
  const by2 = by1 + bh;

  const isInside = ax1 <= bx1 && ay1 <= by1 && ax2 >= bx2 && ay2 >= by2;
  const isLarger = aw > bw || ah > bh;
  return isInside && isLarger;
}

function hasOverlap(boxA, boxB) {
  const [ax1, ay1, aw, ah] = boxA;
  const [bx1, by1, bw, bh] = boxB;
  const ax2 = ax1 + aw;
  const ay2 = ay1 + ah;
  const bx2 = bx1 + bw;
  const by2 = by1 + bh;

  const interW = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const interH = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  return interW * interH > 0;
}

/**
 * Executes Kahn's algorithm for topological sorting over directed structural edges.
 * Throws CyclicSceneGraphError if a cycle is detected.
 */
export function kahnTopologicalSort(nodesDict, edges) {
  const hierarchicalEdges = edges.filter(e =>
    ['parent_child', 'visual_containment', 'z_index_layer'].includes(e.relationship)
  );

  const nodeIds = Object.keys(nodesDict);
  const inDegree = {};
  const adjList = {};

  for (const nid of nodeIds) {
    inDegree[nid] = 0;
    adjList[nid] = [];
  }

  for (const e of hierarchicalEdges) {
    if (inDegree[e.source] !== undefined && inDegree[e.target] !== undefined) {
      adjList[e.source].push(e.target);
      inDegree[e.target]++;
    }
  }

  // Queue of nodes with in-degree 0
  const queue = nodeIds.filter(nid => inDegree[nid] === 0);
  // Sort queue deterministically
  queue.sort((a, b) => {
    const na = nodesDict[a];
    const nb = nodesDict[b];
    if (na.z_index !== nb.z_index) return na.z_index - nb.z_index;
    if (na.bbox_normalized[1] !== nb.bbox_normalized[1]) return na.bbox_normalized[1] - nb.bbox_normalized[1];
    if (na.bbox_normalized[0] !== nb.bbox_normalized[0]) return na.bbox_normalized[0] - nb.bbox_normalized[0];
    return a.localeCompare(b);
  });

  const topologicalOrder = [];

  while (queue.length > 0) {
    const curr = queue.shift();
    topologicalOrder.push(curr);

    for (const neighbor of adjList[curr]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
        queue.sort((a, b) => {
          const na = nodesDict[a];
          const nb = nodesDict[b];
          if (na.z_index !== nb.z_index) return na.z_index - nb.z_index;
          if (na.bbox_normalized[1] !== nb.bbox_normalized[1]) return na.bbox_normalized[1] - nb.bbox_normalized[1];
          if (na.bbox_normalized[0] !== nb.bbox_normalized[0]) return na.bbox_normalized[0] - nb.bbox_normalized[0];
          return a.localeCompare(b);
        });
      }
    }
  }

  if (topologicalOrder.length < nodeIds.length) {
    const unvisited = nodeIds.filter(nid => !topologicalOrder.includes(nid));
    throw new CyclicSceneGraphError(
      unvisited,
      `Cycle detected in UI Scene Graph DAG! Visited ${topologicalOrder.length}/${nodeIds.length} nodes. Unvisited: ${unvisited.join(', ')}`
    );
  }

  return topologicalOrder;
}

/**
 * Computes deterministic SHA-256 digest over normalized canonical graph.
 */
export function computeGraphDigest(graphId, nodes, edges, topologicalOrder) {
  const canonicalRepr = {
    graph_id: graphId,
    nodes: nodes.map(n => ({
      node_id: n.node_id,
      component_type: n.component_type,
      category: n.category,
      bbox: n.bbox,
      bbox_normalized: n.bbox_normalized,
      z_index: n.z_index,
      text_content: n.text_content,
      visual_properties: n.visual_properties,
      interaction_state: n.interaction_state,
      aria: n.aria
    })),
    edges: [...edges].sort((a, b) => {
      const cmp = a.source.localeCompare(b.source);
      if (cmp !== 0) return cmp;
      const cmp2 = a.target.localeCompare(b.target);
      if (cmp2 !== 0) return cmp2;
      return a.relationship.localeCompare(b.relationship);
    }),
    topological_order: topologicalOrder
  };

  const serialized = JSON.stringify(canonicalRepr);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Synthesizes a complete deterministic, acyclic UI scene graph DAG.
 */
export function synthesizeSceneGraph(fusedNodes, options = {}) {
  const viewportW = options.viewport_width || 1440;
  const viewportH = options.viewport_height || 900;
  const viewportName = options.viewport_name || 'desktop';
  const graphId = options.graph_id || `SG-0001-${String(Date.now()).slice(-6)}`;
  const timestamp = options.timestamp || new Date().toISOString();

  const nodesDict = {};
  let rootNodeId = 'node_root';

  const hasScreenRoot = fusedNodes.some(n => n.component_type === 'ScreenRoot');
  if (!hasScreenRoot) {
    nodesDict[rootNodeId] = {
      node_id: rootNodeId,
      component_type: 'ScreenRoot',
      category: 'container',
      bbox: [0, 0, viewportW, viewportH],
      bbox_normalized: [0, 0, 1000, 1000],
      z_index: 0,
      text_content: null,
      visual_properties: { bg_token: 'surface-canvas' },
      interaction_state: 'default',
      aria: { role: 'application' }
    };
  } else {
    for (const n of fusedNodes) {
      if (n.component_type === 'ScreenRoot') {
        rootNodeId = n.node_id;
        break;
      }
    }
  }

  for (const fn of fusedNodes) {
    const nid = fn.node_id;
    let ctype = fn.component_type || 'CardContainer';
    if (!CANONICAL_UI_TAXONOMY[ctype]) {
      ctype = 'CardContainer';
    }
    const cat = CANONICAL_UI_TAXONOMY[ctype];

    const rawBbox = Array.isArray(fn.bbox) ? fn.bbox : [fn.bbox.x, fn.bbox.y, fn.bbox.w, fn.bbox.h];
    const normBbox = Array.isArray(fn.bbox_normalized)
      ? fn.bbox_normalized
      : [fn.bbox_normalized.x, fn.bbox_normalized.y, fn.bbox_normalized.w, fn.bbox_normalized.h];

    nodesDict[nid] = {
      node_id: nid,
      component_type: ctype,
      category: cat,
      bbox: rawBbox,
      bbox_normalized: normBbox,
      z_index: fn.z_index ?? 10,
      text_content: fn.text_content ?? null,
      visual_properties: cat === 'container' ? { bg_token: 'surface-elevated' } : {},
      interaction_state: 'default',
      aria: { role: mapAriaRole(ctype) }
    };
  }

  // Build DAG edges
  const allNodes = Object.values(nodesDict);
  const edges = [];
  const parentMap = {};
  const containers = allNodes.filter(n => n.category === 'container');

  for (const n of allNodes) {
    if (n.node_id === rootNodeId) continue;

    const candidates = [];
    for (const c of containers) {
      if (c.node_id === n.node_id) continue;
      if (strictlyContains(c.bbox_normalized, n.bbox_normalized)) {
        const area = c.bbox_normalized[2] * c.bbox_normalized[3];
        candidates.push({ parentId: c.node_id, area });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.area - b.area);
      parentMap[n.node_id] = candidates[0].parentId;
    } else {
      parentMap[n.node_id] = rootNodeId;
    }
  }

  // Create parent_child edges
  for (const [childId, parentId] of Object.entries(parentMap)) {
    edges.push({
      source: parentId,
      target: childId,
      relationship: 'parent_child'
    });
  }

  // Group siblings by parent and create sibling edges
  const parentToChildren = {};
  for (const [childId, parentId] of Object.entries(parentMap)) {
    if (!parentToChildren[parentId]) parentToChildren[parentId] = [];
    parentToChildren[parentId].push(nodesDict[childId]);
  }

  for (const children of Object.values(parentToChildren)) {
    if (children.length > 1) {
      children.sort((a, b) => {
        if (a.bbox_normalized[1] !== b.bbox_normalized[1]) {
          return a.bbox_normalized[1] - b.bbox_normalized[1];
        }
        return a.bbox_normalized[0] - b.bbox_normalized[0];
      });

      for (let i = 0; i < children.length - 1; i++) {
        edges.push({
          source: children[i].node_id,
          target: children[i + 1].node_id,
          relationship: 'sibling'
        });
      }
    }
  }

  // Helper to check if child is descendant of ancestor
  const isDescendant = (childId, ancestorId) => {
    let curr = parentMap[childId];
    while (curr) {
      if (curr === ancestorId) return true;
      curr = parentMap[curr];
    }
    return false;
  };

  // Stacking z_index_layer edges between non-ancestor overlapping nodes
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const na = allNodes[i];
      const nb = allNodes[j];
      if (na.node_id === rootNodeId || nb.node_id === rootNodeId) continue;
      // Skip if na is ancestor of nb or nb is ancestor of na
      if (isDescendant(na.node_id, nb.node_id) || isDescendant(nb.node_id, na.node_id)) continue;

      if (hasOverlap(na.bbox_normalized, nb.bbox_normalized)) {
        if (na.z_index < nb.z_index) {
          edges.push({ source: na.node_id, target: nb.node_id, relationship: 'z_index_layer' });
        } else if (na.z_index > nb.z_index) {
          edges.push({ source: nb.node_id, target: na.node_id, relationship: 'z_index_layer' });
        }
      }
    }
  }

  // Run Kahn's topological sort
  const topologicalOrder = kahnTopologicalSort(nodesDict, edges);

  // Deterministic canonical node ordering: z_index -> y -> x -> id
  const sortedNodes = [...allNodes].sort((a, b) => {
    if (a.z_index !== b.z_index) return a.z_index - b.z_index;
    if (a.bbox_normalized[1] !== b.bbox_normalized[1]) return a.bbox_normalized[1] - b.bbox_normalized[1];
    if (a.bbox_normalized[0] !== b.bbox_normalized[0]) return a.bbox_normalized[0] - b.bbox_normalized[0];
    return a.node_id.localeCompare(b.node_id);
  });

  // Compute SHA-256 digest
  const digest = computeGraphDigest(graphId, sortedNodes, edges, topologicalOrder);

  return {
    schema_version: UI_SCENE_GRAPH_SCHEMA_VERSION,
    graph_id: graphId,
    viewport: {
      name: viewportName,
      width: viewportW,
      height: viewportH
    },
    timestamp,
    root_node_id: rootNodeId,
    nodes: sortedNodes,
    edges,
    topological_order: topologicalOrder,
    sha256_digest: digest
  };
}

/**
 * Validates scene graph object against Draft 2020-12 schema rules.
 */
export function validateSceneGraph(graph) {
  const errors = [];

  if (!graph || typeof graph !== 'object') {
    return { valid: false, errors: ['Graph must be a non-null object'] };
  }

  if (graph.schema_version !== 1) {
    errors.push(`Invalid schema_version: got ${graph.schema_version}, expected 1`);
  }

  if (!graph.graph_id || !/^SG-[0-9]{4}-[0-9]{3,}$/.test(graph.graph_id)) {
    errors.push(`Invalid graph_id: "${graph.graph_id}"`);
  }

  if (!graph.viewport || !graph.viewport.width || !graph.viewport.height) {
    errors.push('Missing or invalid viewport');
  }

  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    errors.push('Graph must contain at least one node');
  } else {
    for (const n of graph.nodes) {
      if (!n.node_id) errors.push('Node missing node_id');
      if (!CANONICAL_UI_TAXONOMY[n.component_type]) {
        errors.push(`Unknown component_type: "${n.component_type}"`);
      }
      if (!Array.isArray(n.bbox_normalized) || n.bbox_normalized.length !== 4) {
        errors.push(`Node ${n.node_id} has invalid bbox_normalized`);
      }
    }
  }

  if (!Array.isArray(graph.edges)) {
    errors.push('Graph missing edges array');
  }

  if (!Array.isArray(graph.topological_order)) {
    errors.push('Graph missing topological_order array');
  }

  if (!graph.sha256_digest || !/^[a-f0-9]{64}$/.test(graph.sha256_digest)) {
    errors.push(`Invalid sha256_digest: "${graph.sha256_digest}"`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

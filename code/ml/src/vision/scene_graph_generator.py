"""
Deterministic Acyclic UI Scene Graph Generator.

Implements:
1. 32-class canonical UI component taxonomy across 6 functional categories.
2. Directed Acyclic Graph (DAG) generation from visual bounding boxes and OCR tokens.
3. Edge taxonomy: parent_child, sibling, visual_containment, z_index_layer.
4. Kahn's topological sort algorithm with formal cycle detection (throws CyclicSceneGraphError).
5. Canonical deterministic node ordering (z_index -> y_norm -> x_norm -> node_id).
6. Cryptographic SHA-256 graph digest generation over canonicalized scene graph.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timezone

# 32 Canonical UI Component Classes partitioned into 6 categories
CANONICAL_UI_TAXONOMY: Dict[str, str] = {
    # 1. Containers (8)
    "ScreenRoot": "container",
    "ModalDialog": "container",
    "CardContainer": "container",
    "DrawerPanel": "container",
    "SidebarNavigation": "container",
    "HeaderBar": "container",
    "FooterBar": "container",
    "AccordionSection": "container",
    # 2. Controls (7)
    "PrimaryButton": "control",
    "SecondaryButton": "control",
    "IconButton": "control",
    "CheckboxControl": "control",
    "RadioGroupControl": "control",
    "SwitchToggle": "control",
    "SliderControl": "control",
    # 3. Inputs (6)
    "TextInputField": "input",
    "TextAreaField": "input",
    "SelectDropdown": "input",
    "DatePickerField": "input",
    "SearchBarInput": "input",
    "FileUploadZone": "input",
    # 4. Display (5)
    "HeadingTypography": "display",
    "BodyTypography": "display",
    "BadgePill": "display",
    "AvatarImage": "display",
    "IconGlyph": "display",
    # 5. Data & Feedback (3)
    "TableViewGrid": "data_feedback",
    "MetricStatCard": "data_feedback",
    "AlertBannerToast": "data_feedback",
    # 6. Navigation (3)
    "BreadcrumbTrail": "navigation",
    "TabBarStrip": "navigation",
    "PaginationControl": "navigation",
}

CANONICAL_CATEGORIES: Set[str] = {
    "container",
    "control",
    "input",
    "display",
    "data_feedback",
    "navigation",
}


class CyclicSceneGraphError(Exception):
    """Raised when Kahn's topological sort detects a cycle in the UI scene graph."""

    def __init__(self, cycle_nodes: List[str], message: Optional[str] = None) -> None:
        self.cycle_nodes = cycle_nodes
        msg = message or f"Cyclic dependency detected in UI scene graph among nodes: {cycle_nodes}"
        super().__init__(msg)


@dataclass
class UISceneGraphNode:
    """Canonical node in the UI scene graph DAG."""
    node_id: str
    component_type: str
    category: str
    bbox: List[float]               # [x, y, w, h] in pixels
    bbox_normalized: List[int]      # [x, y, w, h] in [0, 1000]
    z_index: int
    text_content: Optional[str] = None
    visual_properties: Dict[str, Any] = field(default_factory=dict)
    interaction_state: str = "default"  # 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'error' | 'loading'
    aria: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "node_id": self.node_id,
            "component_type": self.component_type,
            "category": self.category,
            "bbox": [float(v) for v in self.bbox],
            "bbox_normalized": [int(round(v)) for v in self.bbox_normalized],
            "z_index": int(self.z_index),
            "text_content": self.text_content,
            "visual_properties": self.visual_properties,
            "interaction_state": self.interaction_state,
            "aria": self.aria,
        }
        return d


@dataclass
class UISceneGraphEdge:
    """Directed edge in the UI scene graph DAG."""
    source: str
    target: str
    relationship: str  # 'parent_child' | 'sibling' | 'visual_containment' | 'z_index_layer'
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "relationship": self.relationship,
            "metadata": self.metadata,
        }


@dataclass
class UISceneGraphDAG:
    """Complete serialized UI scene graph DAG."""
    schema_version: int
    graph_id: str
    viewport: Dict[str, Any]
    timestamp: str
    nodes: List[UISceneGraphNode]
    edges: List[UISceneGraphEdge]
    root_node_id: str
    topological_order: List[str]
    sha256_digest: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "graph_id": self.graph_id,
            "viewport": self.viewport,
            "timestamp": self.timestamp,
            "root_node_id": self.root_node_id,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "topological_order": self.topological_order,
            "sha256_digest": self.sha256_digest,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


class UISceneGraphGenerator:
    """
    Deterministic Acyclic UI Scene Graph Synthesizer.
    Builds structural parent-child trees and DAG overlays from fused visual/OCR nodes,
    enforces Kahn's algorithm topological sorting, and signs graphs with SHA-256 digests.
    """

    def __init__(self, default_viewport: str = "desktop") -> None:
        self.default_viewport = default_viewport

    def synthesize_scene_graph(
        self,
        fused_nodes: List[Any],
        viewport_name: str = "desktop",
        viewport_w: int = 1440,
        viewport_h: int = 900,
        graph_id: Optional[str] = None,
    ) -> UISceneGraphDAG:
        """
        Synthesizes a complete deterministic, acyclic UI scene graph DAG.
        """
        gid = graph_id or f"SG-0001-{int(datetime.now(timezone.utc).timestamp()):06d}"
        iso_time = datetime.now(timezone.utc).isoformat()

        # Step 1: Ensure root node (ScreenRoot) exists
        nodes_dict: Dict[str, UISceneGraphNode] = {}
        root_node_id = "node_root"

        has_screen_root = any(getattr(n, "component_type", None) == "ScreenRoot" for n in fused_nodes)
        if not has_screen_root:
            root_node = UISceneGraphNode(
                node_id=root_node_id,
                component_type="ScreenRoot",
                category="container",
                bbox=[0.0, 0.0, float(viewport_w), float(viewport_h)],
                bbox_normalized=[0, 0, 1000, 1000],
                z_index=0,
                text_content=None,
                visual_properties={"bg_token": "surface-canvas"},
                interaction_state="default",
                aria={"role": "application"},
            )
            nodes_dict[root_node_id] = root_node
        else:
            for n in fused_nodes:
                if getattr(n, "component_type", None) == "ScreenRoot":
                    root_node_id = getattr(n, "node_id")
                    break

        # Convert fused nodes to UISceneGraphNode
        for fn in fused_nodes:
            nid = getattr(fn, "node_id")
            ctype = getattr(fn, "component_type", "CardContainer")
            if ctype not in CANONICAL_UI_TAXONOMY:
                ctype = "CardContainer"

            cat = CANONICAL_UI_TAXONOMY[ctype]

            raw_bbox = getattr(fn, "bbox")
            bbox_list = raw_bbox.to_list() if hasattr(raw_bbox, "to_list") else list(raw_bbox)

            norm_bbox = getattr(fn, "bbox_normalized")
            norm_list = norm_bbox.to_int_list() if hasattr(norm_bbox, "to_int_list") else [int(round(v)) for v in norm_bbox]

            z_idx = int(getattr(fn, "z_index", 10))
            text = getattr(fn, "text_content", None)

            sg_node = UISceneGraphNode(
                node_id=nid,
                component_type=ctype,
                category=cat,
                bbox=bbox_list,
                bbox_normalized=norm_list,
                z_index=z_idx,
                text_content=text,
                visual_properties={"bg_token": "surface-elevated"} if cat == "container" else {},
                interaction_state="default",
                aria={"role": self._map_aria_role(ctype)},
            )
            nodes_dict[nid] = sg_node

        # Step 2: Build structural edges (parent_child, visual_containment, sibling, z_index_layer)
        edges = self._build_dag_edges(nodes_dict, root_node_id)

        # Step 3: Run Kahn's Algorithm for Topological Sort & Cycle Detection
        topological_order = self.kahn_topological_sort(nodes_dict, edges)

        # Step 4: Sort nodes in deterministic canonical order
        # Invariant: z_index asc -> y_norm asc -> x_norm asc -> node_id lexical
        sorted_nodes = sorted(
            nodes_dict.values(),
            key=lambda n: (n.z_index, n.bbox_normalized[1], n.bbox_normalized[0], n.node_id)
        )

        # Step 5: Compute cryptographic SHA-256 digest
        digest = self.compute_graph_digest(gid, sorted_nodes, edges, topological_order)

        return UISceneGraphDAG(
            schema_version=1,
            graph_id=gid,
            viewport={"name": viewport_name, "width": viewport_w, "height": viewport_h},
            timestamp=iso_time,
            nodes=sorted_nodes,
            edges=edges,
            root_node_id=root_node_id,
            topological_order=topological_order,
            sha256_digest=digest,
        )

    def _build_dag_edges(
        self,
        nodes_dict: Dict[str, UISceneGraphNode],
        root_node_id: str,
    ) -> List[UISceneGraphEdge]:
        """Builds directed edges with tree nesting and DAG relationships."""
        edges: List[UISceneGraphEdge] = []
        all_nodes = list(nodes_dict.values())

        # For every node other than root, find its most immediate enclosing container
        parent_map: Dict[str, str] = {}
        containers = [n for n in all_nodes if n.category == "container"]

        for n in all_nodes:
            if n.node_id == root_node_id:
                continue

            # Candidate containers that strictly contain this node
            candidates = []
            for c in containers:
                if c.node_id == n.node_id:
                    continue
                if self._strictly_contains(c.bbox_normalized, n.bbox_normalized):
                    # Area of container
                    area = c.bbox_normalized[2] * c.bbox_normalized[3]
                    candidates.append((c.node_id, area))

            if candidates:
                # Smallest container is the most immediate parent
                candidates.sort(key=lambda x: x[1])
                best_parent_id = candidates[0][0]
                parent_map[n.node_id] = best_parent_id
            else:
                # Default parent is root
                parent_map[n.node_id] = root_node_id

        # Create parent_child edges
        for child_id, parent_id in parent_map.items():
            edges.append(UISceneGraphEdge(
                source=parent_id,
                target=child_id,
                relationship="parent_child",
            ))

        # Group siblings by parent and create sibling edges in reading order
        parent_to_children: Dict[str, List[UISceneGraphNode]] = {}
        for child_id, parent_id in parent_map.items():
            parent_to_children.setdefault(parent_id, []).append(nodes_dict[child_id])

        for parent_id, children in parent_to_children.items():
            if len(children) > 1:
                # Sort children reading order: y then x
                children.sort(key=lambda c: (c.bbox_normalized[1], c.bbox_normalized[0]))
                for i in range(len(children) - 1):
                    edges.append(UISceneGraphEdge(
                        source=children[i].node_id,
                        target=children[i + 1].node_id,
                        relationship="sibling",
                    ))

        # Helper to check if child is descendant of ancestor
        def is_descendant(child_id: str, ancestor_id: str) -> bool:
            curr = parent_map.get(child_id)
            while curr:
                if curr == ancestor_id:
                    return True
                curr = parent_map.get(curr)
            return False

        # Stacking order (z_index_layer) edges between non-ancestor overlapping nodes
        for i in range(len(all_nodes)):
            for j in range(i + 1, len(all_nodes)):
                na, nb = all_nodes[i], all_nodes[j]
                if na.node_id == root_node_id or nb.node_id == root_node_id:
                    continue
                # Skip if na is ancestor of nb or nb is ancestor of na
                if is_descendant(na.node_id, nb.node_id) or is_descendant(nb.node_id, na.node_id):
                    continue

                if self._overlaps(na.bbox_normalized, nb.bbox_normalized):
                    if na.z_index < nb.z_index:
                        edges.append(UISceneGraphEdge(
                            source=na.node_id,
                            target=nb.node_id,
                            relationship="z_index_layer",
                        ))
                    elif na.z_index > nb.z_index:
                        edges.append(UISceneGraphEdge(
                            source=nb.node_id,
                            target=na.node_id,
                            relationship="z_index_layer",
                        ))

        return edges

    def kahn_topological_sort(
        self,
        nodes_dict: Dict[str, UISceneGraphNode],
        edges: List[UISceneGraphEdge],
    ) -> List[str]:
        """
        Executes Kahn's algorithm over structural edges (parent_child, z_index_layer, visual_containment).
        Asserts graph acyclicity. Throws CyclicSceneGraphError fail-closed if cycle detected.
        """
        # Focus on hierarchical & stacking edges that define order
        hierarchical_edges = [
            e for e in edges
            if e.relationship in ("parent_child", "visual_containment", "z_index_layer")
        ]

        node_ids = set(nodes_dict.keys())
        in_degree: Dict[str, int] = {nid: 0 for nid in node_ids}
        adj_list: Dict[str, List[str]] = {nid: [] for nid in node_ids}

        for e in hierarchical_edges:
            if e.source in in_degree and e.target in in_degree:
                adj_list[e.source].append(e.target)
                in_degree[e.target] += 1

        # Queue nodes with in-degree 0
        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        # Sort queue deterministically
        queue.sort(key=lambda nid: (
            nodes_dict[nid].z_index,
            nodes_dict[nid].bbox_normalized[1],
            nodes_dict[nid].bbox_normalized[0],
            nid
        ))

        topological_order: List[str] = []

        while queue:
            curr = queue.pop(0)
            topological_order.append(curr)

            for neighbor in adj_list[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
                    queue.sort(key=lambda nid: (
                        nodes_dict[nid].z_index,
                        nodes_dict[nid].bbox_normalized[1],
                        nodes_dict[nid].bbox_normalized[0],
                        nid
                    ))

        if len(topological_order) < len(node_ids):
            # Cycle detected!
            unvisited = [nid for nid in node_ids if nid not in topological_order]
            raise CyclicSceneGraphError(
                cycle_nodes=unvisited,
                message=f"Cycle detected in UI Scene Graph DAG! Visited {len(topological_order)}/{len(node_ids)} nodes. Unvisited: {unvisited}"
            )

        return topological_order

    @staticmethod
    def compute_graph_digest(
        graph_id: str,
        nodes: List[UISceneGraphNode],
        edges: List[UISceneGraphEdge],
        topological_order: List[str],
    ) -> str:
        """Computes deterministic SHA-256 digest over normalized canonical graph representation."""
        canonical_repr = {
            "graph_id": graph_id,
            "nodes": [n.to_dict() for n in nodes],
            "edges": sorted([e.to_dict() for e in edges], key=lambda x: (x["source"], x["target"], x["relationship"])),
            "topological_order": topological_order,
        }
        serialized = json.dumps(canonical_repr, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    def _strictly_contains(box_a: List[int], box_b: List[int]) -> bool:
        """Returns True if box_a contains box_b and box_a is larger."""
        ax1, ay1, aw, ah = box_a
        bx1, by1, bw, bh = box_b
        ax2, ay2 = ax1 + aw, ay1 + ah
        bx2, by2 = bx1 + bw, by1 + bh

        is_inside = (ax1 <= bx1 and ay1 <= by1 and ax2 >= bx2 and ay2 >= by2)
        is_larger = (aw > bw or ah > bh)
        return is_inside and is_larger

    @staticmethod
    def _overlaps(box_a: List[int], box_b: List[int]) -> bool:
        """Returns True if box_a and box_b have non-zero intersection area."""
        ax1, ay1, aw, ah = box_a
        bx1, by1, bw, bh = box_b
        ax2, ay2 = ax1 + aw, ay1 + ah
        bx2, by2 = bx1 + bw, by1 + bh

        inter_w = max(0, min(ax2, bx2) - max(ax1, bx1))
        inter_h = max(0, min(ay2, by2) - max(ay1, by1))
        return (inter_w * inter_h) > 0

    @staticmethod
    def _map_aria_role(component_type: str) -> str:
        """Maps canonical UI component class to ARIA role."""
        role_map = {
            "ScreenRoot": "application",
            "ModalDialog": "dialog",
            "CardContainer": "region",
            "DrawerPanel": "complementary",
            "SidebarNavigation": "navigation",
            "HeaderBar": "banner",
            "FooterBar": "contentinfo",
            "AccordionSection": "region",
            "PrimaryButton": "button",
            "SecondaryButton": "button",
            "IconButton": "button",
            "CheckboxControl": "checkbox",
            "RadioGroupControl": "radiogroup",
            "SwitchToggle": "switch",
            "SliderControl": "slider",
            "TextInputField": "textbox",
            "TextAreaField": "textbox",
            "SelectDropdown": "combobox",
            "DatePickerField": "group",
            "SearchBarInput": "searchbox",
            "FileUploadZone": "region",
            "HeadingTypography": "heading",
            "BodyTypography": "paragraph",
            "BadgePill": "status",
            "AvatarImage": "img",
            "IconGlyph": "img",
            "TableViewGrid": "table",
            "MetricStatCard": "region",
            "AlertBannerToast": "alert",
            "BreadcrumbTrail": "navigation",
            "TabBarStrip": "tablist",
            "PaginationControl": "navigation",
        }
        return role_map.get(component_type, "generic")

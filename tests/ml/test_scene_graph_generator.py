"""
Unit tests for Deterministic Acyclic UI Scene Graph Generator (Python).
Tests 32-class taxonomy, Kahn's algorithm topological sorting,
cycle detection (CyclicSceneGraphError), canonical deterministic node ordering,
and SHA-256 graph digest generation.
"""

import sys
import os
import pytest

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.scene_graph_generator import (
    UISceneGraphNode,
    UISceneGraphEdge,
    UISceneGraphDAG,
    UISceneGraphGenerator,
    CyclicSceneGraphError,
    CANONICAL_UI_TAXONOMY,
    CANONICAL_CATEGORIES,
)


def test_taxonomy_classes_and_categories():
    assert len(CANONICAL_UI_TAXONOMY) == 32
    assert len(CANONICAL_CATEGORIES) == 6
    for cls_name, cat in CANONICAL_UI_TAXONOMY.items():
        assert cat in CANONICAL_CATEGORIES


def test_scene_graph_synthesis_and_dag_structure():
    generator = UISceneGraphGenerator()

    class MockFusedNode:
        def __init__(self, node_id, component_type, bbox, bbox_normalized, z_index, text_content=None):
            self.node_id = node_id
            self.component_type = component_type
            self.bbox = bbox
            self.bbox_normalized = bbox_normalized
            self.z_index = z_index
            self.text_content = text_content

    fused = [
        MockFusedNode("card_settings", "CardContainer", [100, 100, 600, 400], [69, 111, 417, 444], 10),
        MockFusedNode("heading_title", "HeadingTypography", [120, 120, 300, 40], [83, 133, 208, 44], 20, "Settings"),
        MockFusedNode("switch_dark", "SwitchToggle", [120, 180, 80, 40], [83, 200, 56, 44], 20),
    ]

    dag = generator.synthesize_scene_graph(fused, "desktop", 1440, 900, "SG-0001-001")

    assert dag.schema_version == 1
    assert dag.graph_id == "SG-0001-001"
    assert len(dag.nodes) == 4  # ScreenRoot + 3 nodes
    assert dag.root_node_id == "node_root"

    # Check Kahn topological order
    assert dag.topological_order[0] == "node_root"
    assert dag.topological_order.index("card_settings") < dag.topological_order.index("heading_title")
    assert dag.topological_order.index("card_settings") < dag.topological_order.index("switch_dark")

    # Check edges
    parent_edges = [e for e in dag.edges if e.relationship == "parent_child"]
    assert len(parent_edges) == 3
    assert any(e.source == "node_root" and e.target == "card_settings" for e in parent_edges)
    assert any(e.source == "card_settings" and e.target == "heading_title" for e in parent_edges)
    assert any(e.source == "card_settings" and e.target == "switch_dark" for e in parent_edges)

    # Check SHA-256 digest
    assert len(dag.sha256_digest) == 64
    int(dag.sha256_digest, 16)  # Must be valid hex


def test_cycle_detection_kahn():
    generator = UISceneGraphGenerator()
    nodes = {
        "A": UISceneGraphNode("A", "CardContainer", "container", [0, 0, 10, 10], [0, 0, 10, 10], 10),
        "B": UISceneGraphNode("B", "CardContainer", "container", [0, 0, 10, 10], [0, 0, 10, 10], 10),
    }
    # Direct cycle: A -> B -> A
    cyclic_edges = [
        UISceneGraphEdge("A", "B", "parent_child"),
        UISceneGraphEdge("B", "A", "parent_child"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, cyclic_edges)

    assert "A" in exc_info.value.cycle_nodes
    assert "B" in exc_info.value.cycle_nodes


def test_canonical_node_ordering():
    generator = UISceneGraphGenerator()

    class MockNode:
        def __init__(self, node_id, component_type, bbox, bbox_normalized, z_index):
            self.node_id = node_id
            self.component_type = component_type
            self.bbox = bbox
            self.bbox_normalized = bbox_normalized
            self.z_index = z_index

    nodes = [
        MockNode("modal_1", "ModalDialog", [100, 100, 200, 200], [100, 100, 200, 200], 1000),
        MockNode("btn_2", "PrimaryButton", [200, 200, 100, 50], [200, 200, 100, 50], 20),
        MockNode("btn_1", "SecondaryButton", [100, 200, 100, 50], [100, 200, 100, 50], 20),
        MockNode("card_1", "CardContainer", [50, 50, 500, 500], [50, 50, 500, 500], 10),
    ]

    dag = generator.synthesize_scene_graph(nodes, "desktop", 1440, 900, "SG-0001-002")

    # Order must be ScreenRoot (z=0) -> card_1 (z=10) -> btn_1 (z=20, x=100) -> btn_2 (z=20, x=200) -> modal_1 (z=1000)
    node_ids = [n.node_id for n in dag.nodes]
    assert node_ids == ["node_root", "card_1", "btn_1", "btn_2", "modal_1"]

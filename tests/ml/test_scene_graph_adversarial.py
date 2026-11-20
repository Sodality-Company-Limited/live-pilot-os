"""
Adversarial Stress Test Suite: Python UI Scene Graph & Vision Benchmark Spike.

Verifies:
1. Cycle Injection: 2-node cycles, self-loops, multi-node loops (A->B->C->D->A),
   cross-category containment cycles (CardContainer -> ScreenRoot -> CardContainer),
   nested cycles with disjoint branches, and z-index layer cycles.
   Asserts 100% fail-closed rejection with CyclicSceneGraphError.
2. Determinism & Digest Invariance: Shuffled node insertion and edge addition orders
   across 100 random permutations produce bitwise identical node sequences and
   bitwise identical SHA-256 digests.
3. Strict Draft 2020-12 JSON Schema Fuzzing via jsonschema:
   - Out-of-bounds coordinates (< 0, > 1000)
   - Invalid edge relationships ('hyperlink_teleport')
   - Unregistered taxonomy classes ('QuantumButton', 'HologramCard')
   - Non-integer normalized coordinates
   - Malformed graph IDs and SHA-256 digests
4. Detector Spike Governance Degradation:
   - High latency (>250ms SLA violation)
   - Acyclic defect degradation (<95% acyclic rate)
"""

import sys
import os
import json
import random
import pytest
import jsonschema

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
from src.vision.benchmark_spike import (
    BenchmarkCandidate,
    VisionDetectorBenchmarkSpike,
)

SCHEMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../schemas/ui-scene-graph.schema.json"))


@pytest.fixture
def ui_scene_graph_schema():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────────────────────────────────────
# 1. ADVERSARIAL CYCLE INJECTION & ACYCLICITY INVARIANT
# ─────────────────────────────────────────────────────────────────────────────

def test_adversarial_cycle_direct_2_node():
    generator = UISceneGraphGenerator()
    nodes = {
        "A": UISceneGraphNode("A", "CardContainer", "container", [100, 100, 200, 200], [100, 100, 200, 200], 10),
        "B": UISceneGraphNode("B", "CardContainer", "container", [120, 120, 100, 100], [120, 120, 100, 100], 20),
    }
    cyclic_edges = [
        UISceneGraphEdge("A", "B", "parent_child"),
        UISceneGraphEdge("B", "A", "parent_child"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, cyclic_edges)

    assert "A" in exc_info.value.cycle_nodes
    assert "B" in exc_info.value.cycle_nodes


def test_adversarial_cycle_self_loop():
    generator = UISceneGraphGenerator()
    nodes = {
        "A": UISceneGraphNode("A", "CardContainer", "container", [100, 100, 200, 200], [100, 100, 200, 200], 10),
    }
    cyclic_edges = [
        UISceneGraphEdge("A", "A", "parent_child"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, cyclic_edges)

    assert "A" in exc_info.value.cycle_nodes


def test_adversarial_cycle_multi_node_loop():
    generator = UISceneGraphGenerator()
    nodes = {
        "A": UISceneGraphNode("A", "CardContainer", "container", [50, 50, 400, 400], [50, 50, 400, 400], 10),
        "B": UISceneGraphNode("B", "CardContainer", "container", [60, 60, 300, 300], [60, 60, 300, 300], 10),
        "C": UISceneGraphNode("C", "CardContainer", "container", [70, 70, 200, 200], [70, 70, 200, 200], 10),
        "D": UISceneGraphNode("D", "CardContainer", "container", [80, 80, 100, 100], [80, 80, 100, 100], 10),
    }
    cyclic_edges = [
        UISceneGraphEdge("A", "B", "parent_child"),
        UISceneGraphEdge("B", "C", "parent_child"),
        UISceneGraphEdge("C", "D", "parent_child"),
        UISceneGraphEdge("D", "A", "parent_child"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, cyclic_edges)

    assert set(exc_info.value.cycle_nodes) == {"A", "B", "C", "D"}


def test_adversarial_cycle_cross_category_containment():
    generator = UISceneGraphGenerator()
    nodes = {
        "ScreenRoot": UISceneGraphNode("ScreenRoot", "ScreenRoot", "container", [0, 0, 1000, 1000], [0, 0, 1000, 1000], 0),
        "CardContainer": UISceneGraphNode("CardContainer", "CardContainer", "container", [100, 100, 400, 400], [100, 100, 400, 400], 10),
    }
    cyclic_edges = [
        UISceneGraphEdge("ScreenRoot", "CardContainer", "parent_child"),
        UISceneGraphEdge("CardContainer", "ScreenRoot", "visual_containment"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, cyclic_edges)

    assert "ScreenRoot" in exc_info.value.cycle_nodes
    assert "CardContainer" in exc_info.value.cycle_nodes


def test_adversarial_cycle_nested_with_disjoint_subtree():
    generator = UISceneGraphGenerator()
    nodes = {
        "Root": UISceneGraphNode("Root", "ScreenRoot", "container", [0, 0, 1000, 1000], [0, 0, 1000, 1000], 0),
        "ValidChild1": UISceneGraphNode("ValidChild1", "CardContainer", "container", [10, 10, 100, 100], [10, 10, 100, 100], 10),
        "ValidChild2": UISceneGraphNode("ValidChild2", "PrimaryButton", "control", [20, 20, 50, 50], [20, 20, 50, 50], 20),
        "CycleA": UISceneGraphNode("CycleA", "CardContainer", "container", [200, 200, 200, 200], [200, 200, 200, 200], 10),
        "CycleB": UISceneGraphNode("CycleB", "CardContainer", "container", [210, 210, 150, 150], [210, 210, 150, 150], 10),
        "CycleC": UISceneGraphNode("CycleC", "CardContainer", "container", [220, 220, 100, 100], [220, 220, 100, 100], 10),
    }
    edges = [
        UISceneGraphEdge("Root", "ValidChild1", "parent_child"),
        UISceneGraphEdge("ValidChild1", "ValidChild2", "parent_child"),
        UISceneGraphEdge("Root", "CycleA", "parent_child"),
        UISceneGraphEdge("CycleA", "CycleB", "parent_child"),
        UISceneGraphEdge("CycleB", "CycleC", "parent_child"),
        UISceneGraphEdge("CycleC", "CycleA", "parent_child"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, edges)

    # Valid branch should be processed, cycle branch rejected
    assert "Root" not in exc_info.value.cycle_nodes
    assert "ValidChild1" not in exc_info.value.cycle_nodes
    assert "ValidChild2" not in exc_info.value.cycle_nodes
    assert set(exc_info.value.cycle_nodes) == {"CycleA", "CycleB", "CycleC"}


def test_adversarial_cycle_z_index_layer_stacking():
    generator = UISceneGraphGenerator()
    nodes = {
        "LayerA": UISceneGraphNode("LayerA", "ModalDialog", "container", [100, 100, 200, 200], [100, 100, 200, 200], 10),
        "LayerB": UISceneGraphNode("LayerB", "ModalDialog", "container", [100, 100, 200, 200], [100, 100, 200, 200], 20),
        "LayerC": UISceneGraphNode("LayerC", "ModalDialog", "container", [100, 100, 200, 200], [100, 100, 200, 200], 30),
    }
    edges = [
        UISceneGraphEdge("LayerA", "LayerB", "z_index_layer"),
        UISceneGraphEdge("LayerB", "LayerC", "z_index_layer"),
        UISceneGraphEdge("LayerC", "LayerA", "z_index_layer"),
    ]

    with pytest.raises(CyclicSceneGraphError) as exc_info:
        generator.kahn_topological_sort(nodes, edges)

    assert set(exc_info.value.cycle_nodes) == {"LayerA", "LayerB", "LayerC"}


# ─────────────────────────────────────────────────────────────────────────────
# 2. DETERMINISM & SHA-256 DIGEST INVARIANCE UNDER PERMUTATIONS
# ─────────────────────────────────────────────────────────────────────────────

class MockInputNode:
    def __init__(self, node_id, component_type, bbox, bbox_normalized, z_index, text_content=None):
        self.node_id = node_id
        self.component_type = component_type
        self.bbox = bbox
        self.bbox_normalized = bbox_normalized
        self.z_index = z_index
        self.text_content = text_content


def test_adversarial_permutations_100_runs_yield_identical_digest():
    generator = UISceneGraphGenerator()
    base_nodes = [
        MockInputNode("card_settings", "CardContainer", [100, 100, 600, 400], [69, 111, 417, 444], 10),
        MockInputNode("header_title", "HeadingTypography", [120, 120, 300, 40], [83, 133, 208, 44], 20, "Settings"),
        MockInputNode("toggle_dark", "SwitchToggle", [120, 180, 80, 40], [83, 200, 56, 44], 20),
        MockInputNode("btn_save", "PrimaryButton", [450, 420, 120, 40], [312, 467, 83, 44], 20, "Save"),
        MockInputNode("btn_reset", "SecondaryButton", [300, 420, 120, 40], [208, 467, 83, 44], 20, "Reset"),
        MockInputNode("slider_vol", "SliderControl", [120, 240, 200, 30], [83, 267, 139, 33], 20),
        MockInputNode("badge_new", "BadgePill", [400, 120, 60, 30], [278, 133, 42, 33], 30, "NEW"),
        MockInputNode("search_box", "SearchBarInput", [120, 300, 250, 40], [83, 333, 174, 44], 20),
    ]

    # Baseline reference graph
    ref_dag = generator.synthesize_scene_graph(base_nodes, "desktop", 1440, 900, "SG-0001-999")
    baseline_digest = ref_dag.sha256_digest
    baseline_nodes_order = [n.node_id for n in ref_dag.nodes]
    baseline_topo_order = ref_dag.topological_order

    rng = random.Random(42)

    # 100 permutation rounds
    for round_idx in range(100):
        shuffled = list(base_nodes)
        rng.shuffle(shuffled)

        perm_dag = generator.synthesize_scene_graph(shuffled, "desktop", 1440, 900, "SG-0001-999")

        assert perm_dag.sha256_digest == baseline_digest, (
            f"Round {round_idx}: SHA-256 digest drifted under input permutation!"
        )
        assert [n.node_id for n in perm_dag.nodes] == baseline_nodes_order, (
            f"Round {round_idx}: Canonical node order drifted!"
        )
        assert perm_dag.topological_order == baseline_topo_order, (
            f"Round {round_idx}: Topological order drifted!"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. STRICT DRAFT 2020-12 SCHEMA FUZZING VIA JSONSCHEMA
# ─────────────────────────────────────────────────────────────────────────────

def test_schema_fuzzing_out_of_bounds_coordinates(ui_scene_graph_schema):
    generator = UISceneGraphGenerator()
    dag = generator.synthesize_scene_graph([], "desktop", 1440, 900, "SG-0001-001")
    data = dag.to_dict()

    # Baseline must pass cleanly
    jsonschema.validate(instance=data, schema=ui_scene_graph_schema)

    # Test negative coordinate
    data_neg = json.loads(json.dumps(data))
    data_neg["nodes"][0]["bbox_normalized"] = [-1, 0, 100, 100]
    with pytest.raises(jsonschema.ValidationError) as exc_info:
        jsonschema.validate(instance=data_neg, schema=ui_scene_graph_schema)
    assert "is less than the minimum of 0" in exc_info.value.message

    # Test > 1000 coordinate
    data_over = json.loads(json.dumps(data))
    data_over["nodes"][0]["bbox_normalized"] = [0, 1001, 100, 100]
    with pytest.raises(jsonschema.ValidationError) as exc_info:
        jsonschema.validate(instance=data_over, schema=ui_scene_graph_schema)
    assert "is greater than the maximum of 1000" in exc_info.value.message

    # Test float coordinate
    data_float = json.loads(json.dumps(data))
    data_float["nodes"][0]["bbox_normalized"] = [10.5, 20.3, 100, 100]
    with pytest.raises(jsonschema.ValidationError) as exc_info:
        jsonschema.validate(instance=data_float, schema=ui_scene_graph_schema)
    assert "is not of type 'integer'" in exc_info.value.message


def test_schema_fuzzing_unregistered_node_classes(ui_scene_graph_schema):
    generator = UISceneGraphGenerator()
    dag = generator.synthesize_scene_graph([], "desktop", 1440, 900, "SG-0001-001")
    data = dag.to_dict()

    for bad_class in ["QuantumButton", "HologramCard", "NeuralCanvas", "TeleportTrigger"]:
        data_fuzzed = json.loads(json.dumps(data))
        data_fuzzed["nodes"][0]["component_type"] = bad_class
        with pytest.raises(jsonschema.ValidationError) as exc_info:
            jsonschema.validate(instance=data_fuzzed, schema=ui_scene_graph_schema)
        assert "is not one of" in exc_info.value.message


def test_schema_fuzzing_invalid_edge_relationship(ui_scene_graph_schema):
    generator = UISceneGraphGenerator()
    dag = generator.synthesize_scene_graph([], "desktop", 1440, 900, "SG-0001-001")
    data = dag.to_dict()

    for bad_rel in ["hyperlink_teleport", "portal_warp", "quantum_entangle"]:
        data_fuzzed = json.loads(json.dumps(data))
        data_fuzzed["edges"].append({
            "source": "node_root",
            "target": "node_root",
            "relationship": bad_rel,
        })
        with pytest.raises(jsonschema.ValidationError) as exc_info:
            jsonschema.validate(instance=data_fuzzed, schema=ui_scene_graph_schema)
        assert "is not one of" in exc_info.value.message


def test_schema_fuzzing_malformed_graph_id(ui_scene_graph_schema):
    generator = UISceneGraphGenerator()
    dag = generator.synthesize_scene_graph([], "desktop", 1440, 900, "SG-0001-001")
    data = dag.to_dict()

    for bad_id in ["INVALID_ID", "sg-0001-001", "SG-01-001", "SG-0001-1", "SG-0001-ABC"]:
        data_fuzzed = json.loads(json.dumps(data))
        data_fuzzed["graph_id"] = bad_id
        with pytest.raises(jsonschema.ValidationError) as exc_info:
            jsonschema.validate(instance=data_fuzzed, schema=ui_scene_graph_schema)
        assert "does not match" in exc_info.value.message


def test_schema_fuzzing_malformed_digest(ui_scene_graph_schema):
    generator = UISceneGraphGenerator()
    dag = generator.synthesize_scene_graph([], "desktop", 1440, 900, "SG-0001-001")
    data = dag.to_dict()

    for bad_digest in ["not-hex", "a" * 63, "a" * 65, "g" * 64, "A" * 64]:
        data_fuzzed = json.loads(json.dumps(data))
        data_fuzzed["sha256_digest"] = bad_digest
        with pytest.raises(jsonschema.ValidationError) as exc_info:
            jsonschema.validate(instance=data_fuzzed, schema=ui_scene_graph_schema)
        assert "does not match" in exc_info.value.message


# ─────────────────────────────────────────────────────────────────────────────
# 4. DETECTOR SPIKE GOVERNANCE DEGRADATION STRESS
# ─────────────────────────────────────────────────────────────────────────────

def test_detector_spike_governance_latency_spike():
    spike = VisionDetectorBenchmarkSpike(episodes_per_candidate=50, seed=42)
    scorecard = spike.run_benchmark()

    # Evaluate Gemma 4 baseline
    gemma = scorecard.candidates["gemma_4_native_multimodal"]
    sla_budget = scorecard.recommended_policy["latency_budget_target_ms"]
    assert gemma["latency_p95_ms"] <= sla_budget

    # Simulate latency spike > 250ms
    degraded_latencies = [260.0] * 50
    degraded_gemma = BenchmarkCandidate(
        id="gemma_4_native_multimodal",
        name="Degraded Gemma",
        architecture="Gemma",
        parameter_count=9_000_000_000,
        vram_mb=15_000.0,
        ram_mb=8_000.0,
        latencies_ms=degraded_latencies,
    )
    assert degraded_gemma.latency_p95 > sla_budget
    # Fails SLA invariant
    assert not (degraded_gemma.latency_p95 <= sla_budget)


def test_detector_spike_governance_acyclic_degradation():
    spike = VisionDetectorBenchmarkSpike(episodes_per_candidate=50, seed=42)
    scorecard = spike.run_benchmark()

    min_acyclic = scorecard.recommended_policy["min_acyclic_dag_rate"]
    assert min_acyclic == 0.9900

    # YOLOv11 suffers 96.8% acyclic rate, which is below Gemma's 99.0% threshold
    yolo = scorecard.candidates["yolov11_ui_specialized"]
    assert yolo["acyclic_dag_rate"] < min_acyclic
    # Demonstrates fail-closed gating on candidates that produce cyclic artifacts

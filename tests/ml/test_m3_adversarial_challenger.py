"""
Adversarial Stress Test Suite for Milestone 3 (G-UX-009, G-UX-010, G-UX-011).
Author: challenger_wave3_1 (Empirical Challenger)
Environment: conda py310 (/opt/anaconda3/envs/py310/bin/python)
"""

import sys
import os
import json
import random
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.taxonomy import (
    CANONICAL_ELEMENTS,
    CATEGORIES,
    INTERACTION_STATES,
    validate_element_label,
    list_taxonomy_classes,
    list_taxonomy_categories,
)
from src.curriculum.scene_graph_dataset import (
    SceneGraphDataset,
    verify_zero_leakage,
)
from src.curriculum.heuristics_benchmark import (
    HeuristicsBenchmark,
    HeuristicScenario,
)

DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage2_scene_graphs")
)
BENCHMARK_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage3_heuristics/benchmark_1200.json")
)


def load_jsonl_records(path: str):
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    return records


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Dataset Split Leakage & Partition Invariance (G-UX-010)
# ═══════════════════════════════════════════════════════════════════════════════

def test_dataset_split_leakage_and_cardinality():
    train = load_jsonl_records(os.path.join(DATASET_DIR, "train.jsonl"))
    val = load_jsonl_records(os.path.join(DATASET_DIR, "val.jsonl"))
    test = load_jsonl_records(os.path.join(DATASET_DIR, "test.jsonl"))

    # Cardinality
    assert len(train) == 4000, f"Expected 4000 train records, got {len(train)}"
    assert len(val) == 500, f"Expected 500 val records, got {len(val)}"
    assert len(test) == 500, f"Expected 500 test records, got {len(test)}"
    assert len(train) + len(val) + len(test) == 5000

    # Record ID pairwise disjointness: Train ∩ Val = ∅, Train ∩ Test = ∅, Val ∩ Test = ∅
    train_ids = {r["record_id"] for r in train}
    val_ids = {r["record_id"] for r in val}
    test_ids = {r["record_id"] for r in test}

    assert len(train_ids) == 4000, "Duplicate record_id in train split"
    assert len(val_ids) == 500, "Duplicate record_id in val split"
    assert len(test_ids) == 500, "Duplicate record_id in test split"

    assert len(train_ids & val_ids) == 0, f"Leakage detected between train and val: {train_ids & val_ids}"
    assert len(train_ids & test_ids) == 0, f"Leakage detected between train and test: {train_ids & test_ids}"
    assert len(val_ids & test_ids) == 0, f"Leakage detected between val and test: {val_ids & test_ids}"

    # SHA-256 Digest pairwise disjointness
    train_digests = {r["sha256_digest"] for r in train}
    val_digests = {r["sha256_digest"] for r in val}
    test_digests = {r["sha256_digest"] for r in test}

    assert len(train_digests) == 4000, "Duplicate sha256_digest in train split"
    assert len(val_digests) == 500, "Duplicate sha256_digest in val split"
    assert len(test_digests) == 500, "Duplicate sha256_digest in test split"

    assert len(train_digests & val_digests) == 0, "Digest collision between train and val"
    assert len(train_digests & test_digests) == 0, "Digest collision between train and test"
    assert len(val_digests & test_digests) == 0, "Digest collision between val and test"

    # Multi-viewport distribution: 40% Desktop (2000), 30% Tablet (1500), 30% Mobile (1500)
    all_records = train + val + test
    vp_counts = {"desktop": 0, "tablet": 0, "mobile": 0}
    for r in all_records:
        vp_name = r["viewport"]["name"]
        assert vp_name in vp_counts, f"Unknown viewport: {vp_name}"
        vp_counts[vp_name] += 1

    assert vp_counts["desktop"] == 2000, f"Expected 2000 desktop records, got {vp_counts['desktop']}"
    assert vp_counts["tablet"] == 1500, f"Expected 1500 tablet records, got {vp_counts['tablet']}"
    assert vp_counts["mobile"] == 1500, f"Expected 1500 mobile records, got {vp_counts['mobile']}"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Kahn DAG Acyclicity Exhaustion (G-UX-010)
# ═══════════════════════════════════════════════════════════════════════════════

def kahn_acyclicity_check(record):
    sg = record["scene_graph"]
    nodes = {n["node_id"]: n for n in sg["nodes"]}
    edges = sg["edges"]

    hierarchical_edges = [
        e for e in edges
        if e["relationship"] in ("parent_child", "visual_containment", "z_index_layer")
    ]

    in_degree = {nid: 0 for nid in nodes}
    adj_list = {nid: [] for nid in nodes}

    for e in hierarchical_edges:
        src, tgt = e["source"], e["target"]
        if src in in_degree and tgt in in_degree:
            adj_list[src].append(tgt)
            in_degree[tgt] += 1

    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    visited = []

    while queue:
        curr = queue.pop(0)
        visited.append(curr)
        for neighbor in adj_list[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(visited) != len(nodes):
        unvisited = [nid for nid in nodes if nid not in visited]
        return False, unvisited
    return True, visited


def test_kahn_dag_acyclicity_500_sample_exhaustion():
    train = load_jsonl_records(os.path.join(DATASET_DIR, "train.jsonl"))
    val = load_jsonl_records(os.path.join(DATASET_DIR, "val.jsonl"))
    test = load_jsonl_records(os.path.join(DATASET_DIR, "test.jsonl"))

    all_records = train + val + test
    random.seed(20261014)
    sample_500 = random.sample(all_records, 500)

    for idx, rec in enumerate(sample_500):
        is_acyclic, order_or_unvisited = kahn_acyclicity_check(rec)
        assert is_acyclic is True, f"Cycle detected in sample {idx} ({rec['record_id']}): unvisited {order_or_unvisited}"
        assert len(order_or_unvisited) == len(rec["scene_graph"]["nodes"])


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Cohen's Kappa & Heuristic Rationale Boundary Fuzzing (G-UX-011)
# ═══════════════════════════════════════════════════════════════════════════════

def test_cohens_kappa_boundary_fuzzing():
    bench = HeuristicsBenchmark(BENCHMARK_FILE)
    gt = [s.severity for s in bench]
    assert len(gt) == 1200

    # 1. Perfect agreement -> kappa == 1.0, accuracy == 1.0
    res_perfect = bench.compute_agreement(gt)
    assert res_perfect["accuracy"] == 1.0
    assert res_perfect["cohens_kappa"] == 1.0

    # 2. Constant prediction (all zeros) -> chance agreement, kappa == 0.0
    zeros = [0] * len(gt)
    res_zeros = bench.compute_agreement(zeros)
    assert res_zeros["accuracy"] == 180 / 1200  # 0.15
    assert abs(res_zeros["cohens_kappa"] - 0.0) < 1e-6

    # 3. Constant prediction (all fours) -> chance agreement, kappa == 0.0
    fours = [4] * len(gt)
    res_fours = bench.compute_agreement(fours)
    assert res_fours["accuracy"] == 220 / 1200
    assert abs(res_fours["cohens_kappa"] - 0.0) < 1e-6

    # 4. Derangement (0 matches, cyclic shift (s + 1) % 5) -> strictly negative kappa
    deranged = [(s + 1) % 5 for s in gt]
    res_deranged = bench.compute_agreement(deranged)
    assert res_deranged["accuracy"] == 0.0
    assert res_deranged["cohens_kappa"] < 0.0

    # 5. Out of bounds predictions -> handled without crash
    oob = [99] * len(gt)
    res_oob = bench.compute_agreement(oob)
    assert res_oob["accuracy"] == 0.0
    assert res_oob["cohens_kappa"] == 0.0

    # 6. Length mismatch -> ValueError
    with pytest.raises(ValueError):
        bench.compute_agreement([0] * 50)


def test_heuristic_rationales_and_fixes_completeness():
    with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    assert len(scenarios) == 1200
    ids = set()

    for s in scenarios:
        sid = s["scenario_id"]
        assert sid not in ids, f"Duplicate scenario_id: {sid}"
        ids.add(sid)

        # Rationale must be non-empty string
        rat = s["evaluation_rationale"]
        assert isinstance(rat, str) and len(rat.strip()) > 0, f"Empty rationale at {sid}"

        # Severity in 0..4
        assert s["severity"] in (0, 1, 2, 3, 4)

        # Actionable fix check
        if s["violates_invariant"]:
            assert s["severity"] > 0
            fix = s["suggested_fix"]
            assert isinstance(fix, str) and len(fix.strip()) > 0, f"Missing suggested_fix at {sid}"
        else:
            assert s["severity"] == 0
            assert s["category"] == "clean"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Taxonomy & Grid Fuzzing (G-UX-009)
# ═══════════════════════════════════════════════════════════════════════════════

def test_taxonomy_element_validation_fuzzing():
    # 1. Non-dict input
    ok, errs = validate_element_label(None)
    assert ok is False
    assert "Element must be a dictionary" in errs[0]

    # 2. Unknown component type
    ok, errs = validate_element_label({"component_type": "UnknownWidget"})
    assert ok is False
    assert "Unknown component class" in errs[0]

    # 3. Category mismatch
    ok, errs = validate_element_label({
        "component_type": "PrimaryButton",
        "category": "container"
    })
    assert ok is False
    assert "Category mismatch" in errs[0]

    # 4. Illegal state for static component (HeadingTypography in loading state)
    ok, errs = validate_element_label({
        "component_type": "HeadingTypography",
        "interaction_state": "loading"
    })
    assert ok is False
    assert "State 'loading' not supported" in errs[0]

    # 5. Illegal ARIA role for button
    ok, errs = validate_element_label({
        "component_type": "PrimaryButton",
        "aria": {"role": "navigation"}
    })
    assert ok is False
    assert "ARIA role 'navigation' not permitted" in errs[0]

    # 6. Touch target smaller than 44x44px for interactive element
    ok, errs = validate_element_label({
        "component_type": "IconButton",
        "bbox": [10, 10, 24, 24]
    })
    assert ok is False
    assert "Touch target size" in errs[0]

    # 7. Non-interactive element allows smaller bbox without error
    ok, errs = validate_element_label({
        "component_type": "IconGlyph",
        "category": "display",
        "interaction_state": "default",
        "bbox": [10, 10, 16, 16]
    })
    assert ok is True
    assert len(errs) == 0

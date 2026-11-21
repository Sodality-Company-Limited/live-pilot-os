"""
Unit tests for Stage 2 UI Scene Graph Pairs Dataset Pipeline (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.scene_graph_dataset import (
    SceneGraphDataset,
    verify_zero_leakage,
)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage2_scene_graphs"))


def test_scene_graph_dataset_splits():
    train_ds = SceneGraphDataset(DATA_DIR, split="train")
    val_ds = SceneGraphDataset(DATA_DIR, split="val")
    test_ds = SceneGraphDataset(DATA_DIR, split="test")

    assert len(train_ds) == 4000
    assert len(val_ds) == 500
    assert len(test_ds) == 500

    item = train_ds[0]
    assert "record_id" in item
    assert "viewport" in item
    assert "scene_graph" in item
    assert item["is_acyclic"] is True


def test_scene_graph_dataset_zero_leakage():
    no_leakage, report = verify_zero_leakage(DATA_DIR)
    assert no_leakage is True
    assert report["overlaps"]["train_val"] == 0
    assert report["overlaps"]["train_test"] == 0
    assert report["overlaps"]["val_test"] == 0


def test_scene_graph_dataset_statistics():
    train_ds = SceneGraphDataset(DATA_DIR, split="train")
    stats = train_ds.get_stats()
    assert stats["record_count"] == 4000
    assert stats["viewport_distribution"]["desktop"] > 0
    assert stats["viewport_distribution"]["tablet"] > 0
    assert stats["viewport_distribution"]["mobile"] > 0
    assert stats["average_nodes_per_scene"] > 0

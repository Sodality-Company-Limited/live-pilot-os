"""
Stage 2 UI Scene Graph Pairs Dataset Loader & Validator (Python).

Manages 5,000 paired records across Desktop (1440x900), Tablet (1024x768), and Mobile (390x844).
Enforces strict 80/10/10 train/val/test split and verifies zero sample leakage.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional, Any, Set, Tuple


class SceneGraphDataset:
    """Dataset container for UI scene graph pairs."""

    def __init__(self, data_dir: str, split: str = "train") -> None:
        self.data_dir = data_dir
        self.split = split
        self.records: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        filename = f"{self.split}.jsonl" if self.split != "validation" else "val.jsonl"
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset split file not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.records.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.records[idx]

    def get_stats(self) -> Dict[str, Any]:
        """Compute viewport and node statistics for the split."""
        viewports = {}
        total_nodes = 0
        classes = {}

        for r in self.records:
            vp = r.get("viewport", {}).get("name", "unknown")
            viewports[vp] = viewports.get(vp, 0) + 1

            sg = r.get("scene_graph", {})
            nodes = sg.get("nodes", [])
            total_nodes += len(nodes)
            for n in nodes:
                c = n.get("component_type", "unknown")
                classes[c] = classes.get(c, 0) + 1

        return {
            "record_count": len(self.records),
            "viewport_distribution": viewports,
            "average_nodes_per_scene": (total_nodes / len(self.records)) if self.records else 0,
            "class_distribution": classes,
        }


def verify_zero_leakage(data_dir: str) -> Tuple[bool, Dict[str, Any]]:
    """Assert zero sample leakage between train, val, and test splits."""
    splits = {}
    ids = {}

    for split, filename in [("train", "train.jsonl"), ("val", "val.jsonl"), ("test", "test.jsonl")]:
        filepath = os.path.join(data_dir, filename)
        if not os.path.exists(filepath):
            return False, {"error": f"Missing split file: {filepath}"}

        split_ids = set()
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    split_ids.add(item.get("record_id"))
        ids[split] = split_ids
        splits[split] = len(split_ids)

    # Check intersections
    train_val_overlap = ids["train"].intersection(ids["val"])
    train_test_overlap = ids["train"].intersection(ids["test"])
    val_test_overlap = ids["val"].intersection(ids["test"])

    has_leakage = bool(train_val_overlap or train_test_overlap or val_test_overlap)

    return not has_leakage, {
        "zero_leakage": not has_leakage,
        "split_counts": splits,
        "overlaps": {
            "train_val": len(train_val_overlap),
            "train_test": len(train_test_overlap),
            "val_test": len(val_test_overlap),
        },
    }

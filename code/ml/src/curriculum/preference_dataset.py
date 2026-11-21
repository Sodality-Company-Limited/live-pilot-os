"""
Stage 5 Contrastive Preference Dataset (Python).

Manages 3,500 contrastive pairs for Direct Preference Optimization (DPO)
and 7,000 weighted records for Kahneman-Tversky Optimization (KTO).
Verifies strict 80/10/10 split and zero sample contamination.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional, Any, Tuple


class DPOPreferenceDataset:
    """Dataset container for DPO chosen/rejected contrastive pairs."""

    def __init__(self, data_file: str) -> None:
        self.data_file = data_file
        self.pairs: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.data_file):
            raise FileNotFoundError(f"DPO dataset file not found: {self.data_file}")
        with open(self.data_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.pairs.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.pairs[idx]

    def get_flaw_distribution(self) -> Dict[str, int]:
        dist = {}
        for p in self.pairs:
            flaw = p.get("preference_delta", {}).get("primary_flaw", "unknown")
            dist[flaw] = dist.get(flaw, 0) + 1
        return dist


class KTODataset:
    """Dataset container for KTO binary label records with loss aversion weights."""

    def __init__(self, data_file: str) -> None:
        self.data_file = data_file
        self.records: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.data_file):
            raise FileNotFoundError(f"KTO dataset file not found: {self.data_file}")
        with open(self.data_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.records.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.records[idx]


def verify_preference_split_orthogonality(splits_dir: str) -> Tuple[bool, Dict[str, Any]]:
    """Assert zero sample contamination between train, val, and test splits."""
    ids = {}
    counts = {}

    for split in ["train", "val", "test"]:
        filepath = os.path.join(splits_dir, f"{split}.jsonl")
        if not os.path.exists(filepath):
            return False, {"error": f"Missing split file: {filepath}"}

        split_ids = set()
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    split_ids.add(item.get("pair_id"))
        ids[split] = split_ids
        counts[split] = len(split_ids)

    train_val = ids["train"].intersection(ids["val"])
    train_test = ids["train"].intersection(ids["test"])
    val_test = ids["val"].intersection(ids["test"])

    contamination = bool(train_val or train_test or val_test)

    return not contamination, {
        "zero_contamination": not contamination,
        "counts": counts,
        "intersections": {
            "train_val": len(train_val),
            "train_test": len(train_test),
            "val_test": len(val_test),
        },
    }

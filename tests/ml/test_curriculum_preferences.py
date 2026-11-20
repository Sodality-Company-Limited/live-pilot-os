"""
Unit tests for Stage 5 Contrastive Preference Dataset (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.preference_dataset import (
    DPOPreferenceDataset,
    KTODataset,
    verify_preference_split_orthogonality,
)

PREF_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage5_preferences")
)
DPO_FILE = os.path.join(PREF_DIR, "dpo_pairs.jsonl")
KTO_FILE = os.path.join(PREF_DIR, "kto_records.jsonl")
SPLITS_DIR = os.path.join(PREF_DIR, "splits")


def test_dpo_preference_dataset_loading():
    ds = DPOPreferenceDataset(DPO_FILE)
    assert len(ds) == 3500

    item = ds[0]
    assert "pair_id" in item
    assert "chosen" in item
    assert "rejected" in item
    assert "preference_delta" in item
    assert item["preference_delta"]["contrast_margin"] > 0

    dist = ds.get_flaw_distribution()
    assert len(dist) == 8


def test_kto_dataset_loading():
    ds = KTODataset(KTO_FILE)
    assert len(ds) == 7000

    item = ds[0]
    assert "kto_id" in item
    assert "prompt" in item
    assert "completion" in item
    assert "label" in item
    assert "weight" in item


def test_preference_split_orthogonality():
    no_contamination, report = verify_preference_split_orthogonality(SPLITS_DIR)
    assert no_contamination is True
    assert report["counts"]["train"] == 2800
    assert report["counts"]["val"] == 350
    assert report["counts"]["test"] == 350
    assert report["intersections"]["train_val"] == 0
    assert report["intersections"]["train_test"] == 0
    assert report["intersections"]["val_test"] == 0

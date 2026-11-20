"""
Unit and integration tests for Cryptographic Model Provenance Tracker.

Goal Reference: G-UX-019
Epic: UX (Multimodal UX/UI Design Decision Making Layer)
"""

import os
import sys
import tempfile
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.provenance_tracker import (
    ProvenanceTracker,
    compute_file_sha256,
    compute_buffer_sha256,
    sign_payload_hmac,
    verify_payload_hmac,
    GENESIS_PREV_HASH,
)


def test_compute_file_sha256():
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write("hello world provenance test")
        temp_path = f.name

    try:
        digest = compute_file_sha256(temp_path)
        assert len(digest) == 64
        # Expected SHA-256 for "hello world provenance test"
        expected = compute_buffer_sha256("hello world provenance test")
        assert digest == expected
    finally:
        os.unlink(temp_path)


def test_hmac_signing_and_verification():
    payload = {"model_id": "ux-lora-v1", "rank": 16, "metrics": {"ece": 0.02}}
    key = "secret-test-key-42"

    signature = sign_payload_hmac(payload, secret_key=key)
    assert len(signature) == 64

    # Verify matching payload
    assert verify_payload_hmac(payload, signature, secret_key=key) is True

    # Tampered payload fails verification
    tampered = {"model_id": "ux-lora-v1", "rank": 16, "metrics": {"ece": 0.09}}
    assert verify_payload_hmac(tampered, signature, secret_key=key) is False


def test_dataset_lineage_collection():
    tracker = ProvenanceTracker()
    lineage = tracker.collect_dataset_lineage()

    assert "stage2_scene_graphs_sha256" in lineage
    assert "stage4_trajectories_sha256" in lineage
    assert "stage5_preferences_sha256" in lineage

    for k, v in lineage.items():
        assert len(v) == 64, f"Lineage hash {k} must be 64 characters, got {len(v)}"


def test_provenance_manifest_creation_and_validation():
    tracker = ProvenanceTracker()
    training_config = {
        "lora_rank": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-5,
        "beta": 0.20,
        "epochs": 3,
        "random_seed": 42,
    }
    eval_metrics = {
        "json_schema_conformance": 0.996,
        "dpo_win_rate": 1.0,
        "ece": 0.023,
        "brier": 0.068,
        "auroc": 0.937,
        "hcer": 0.007,
    }
    artifacts = [
        {"path": "code/ml/src/training/sft_trainer.py", "sha256": compute_file_sha256(tracker.repo_root / "code/ml/src/training/sft_trainer.py")}
    ]

    manifest = tracker.create_provenance_manifest(
        model_id="test-ux-model-v1",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
    )

    valid, errs = tracker.verify_provenance_block(manifest)
    assert valid is True, f"Manifest verification failed: {errs}"


def test_provenance_chain_verification_and_tamper_detection():
    tracker = ProvenanceTracker()
    training_config = {
        "lora_rank": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-5,
        "beta": 0.20,
        "epochs": 3,
        "random_seed": 42,
    }
    eval_metrics = {
        "json_schema_conformance": 0.996,
        "dpo_win_rate": 1.0,
        "ece": 0.023,
        "brier": 0.068,
        "auroc": 0.937,
        "hcer": 0.007,
    }
    artifacts = [
        {"path": "code/ml/src/training/sft_trainer.py", "sha256": compute_file_sha256(tracker.repo_root / "code/ml/src/training/sft_trainer.py")}
    ]

    # Block 0 (Genesis)
    block0 = tracker.create_provenance_manifest(
        model_id="block0-model",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
        block_index=0,
        previous_block_hash=GENESIS_PREV_HASH,
    )

    # Block 1 (Chained)
    block0_hash = tracker.compute_block_hash(block0)
    block1 = tracker.create_provenance_manifest(
        model_id="block1-model",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
        block_index=1,
        previous_block_hash=block0_hash,
    )

    valid, errs = tracker.verify_chain([block0, block1])
    assert valid is True, f"Chain verification failed: {errs}"

    # Tamper with block 0 -> chain breaks
    block0["model_id"] = "tampered-name"
    valid_tampered, errs_tampered = tracker.verify_chain([block0, block1])
    assert valid_tampered is False
    assert len(errs_tampered) > 0

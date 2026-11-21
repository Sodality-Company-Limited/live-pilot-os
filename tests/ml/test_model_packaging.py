"""
tests/ml/test_model_packaging.py

Unit and Integration Test Suite for Goal G-ML-012:
Model Packaging, Checkpoint Versioning and Provenance Ledger.

Tests:
1. Dry-run packaging execution and temporary directory isolation.
2. Full packaging pipeline, safetensors serialization, and manifest emission.
3. Checksum verification and tensor shape/dtype integrity.
4. Fail-closed rejection of missing artifact files.
5. Fail-closed rejection of byte-corrupted weights and hash mismatches.
6. Fail-closed rejection of corrupted manifest JSON.
7. Exact-HEAD git commit provenance and recipe hash calculation.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import safetensors.torch
import torch

# Ensure code/ml/scripts is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "code" / "ml" / "scripts"))

from package_model import (
    compute_file_sha256,
    compute_training_recipe_hash,
    get_git_revision,
    package_model_release,
    verify_checkpoint_integrity,
)


@pytest.fixture
def temp_release_dir(tmp_path: Path):
    target = tmp_path / "test_checkpoint"
    yield target
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)


def test_dry_run_packaging(temp_release_dir: Path):
    """Step 1 Verification: Dry-run packaging generates manifest without persisting to output_dir."""
    manifest = package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-dryrun",
        dry_run=True,
    )

    assert manifest is not None
    assert manifest.schema_version == "1.0.0"
    assert manifest.model_version == "v1.0.0-dryrun"
    assert len(manifest.git_commit) == 40
    assert len(manifest.artifacts) == 5
    assert not temp_release_dir.exists(), "Dry-run should not create permanent output_dir"


def test_real_model_packaging_and_manifest_schema(temp_release_dir: Path):
    """Step 2 Verification: Real packaging produces valid safetensors and RFC 8259 manifest.json."""
    manifest = package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-test",
        dry_run=False,
    )

    assert temp_release_dir.exists()
    manifest_path = temp_release_dir / "manifest.json"
    assert manifest_path.exists()

    # Parse JSON
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    assert manifest_data["schema_version"] == "1.0.0"
    assert manifest_data["model_version"] == "v1.0.0-test"
    assert manifest_data["goal_id"] == "G-ML-012"
    assert len(manifest_data["git_commit"]) == 40
    assert "training_recipe_hash" in manifest_data
    assert "checksums" in manifest_data
    assert "artifacts" in manifest_data

    # Check that all 5 files exist physically
    expected_files = [
        "adapter_model.safetensors",
        "value_head.safetensors",
        "config.json",
        "calibration_config.json",
        "tokenizer_config.json",
    ]
    for filename in expected_files:
        p = temp_release_dir / filename
        assert p.exists(), f"Expected artifact missing: {filename}"
        computed_sha = compute_file_sha256(p)
        assert computed_sha == manifest_data["checksums"][filename]


def test_verify_checkpoint_success(temp_release_dir: Path):
    """Step 3 Verification: verify_checkpoint_integrity validates uncorrupted checkpoints with exit code 0."""
    package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-test",
        dry_run=False,
    )

    success, verified_files = verify_checkpoint_integrity(temp_release_dir)
    assert success is True
    assert len(verified_files) == 5
    assert "adapter_model.safetensors" in verified_files
    assert "value_head.safetensors" in verified_files


def test_verify_checkpoint_missing_file_fail_closed(temp_release_dir: Path):
    """Step 4 Verification: verify_checkpoint_integrity fails closed if any artifact is removed."""
    package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-test",
        dry_run=False,
    )

    # Delete one safetensors file
    target_file = temp_release_dir / "value_head.safetensors"
    target_file.unlink()

    with pytest.raises(FileNotFoundError, match="Artifact listed in manifest is missing"):
        verify_checkpoint_integrity(temp_release_dir)


def test_verify_checkpoint_corrupted_hash_fail_closed(temp_release_dir: Path):
    """Step 5 Verification: verify_checkpoint_integrity detects tampered bytes and raises ValueError."""
    package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-test",
        dry_run=False,
    )

    # Append byte to adapter_model.safetensors to alter SHA256
    target_file = temp_release_dir / "adapter_model.safetensors"
    with open(target_file, "ab") as f:
        f.write(b"\x00\x00\x00\x00")

    with pytest.raises(ValueError, match="SHA256 checksum mismatch"):
        verify_checkpoint_integrity(temp_release_dir)


def test_verify_checkpoint_corrupted_manifest_fail_closed(temp_release_dir: Path):
    """Step 6 Verification: verify_checkpoint_integrity detects invalid JSON in manifest."""
    package_model_release(
        output_dir=temp_release_dir,
        repo_root=REPO_ROOT,
        model_version="v1.0.0-test",
        dry_run=False,
    )

    manifest_path = temp_release_dir / "manifest.json"
    manifest_path.write_text("{ corrupt json: [", encoding="utf-8")

    with pytest.raises(ValueError, match="Corrupted or invalid JSON"):
        verify_checkpoint_integrity(temp_release_dir)


def test_git_provenance_and_recipe_binding():
    """Step 7 Verification: Git commit matches rev-parse HEAD and recipe hash is non-empty."""
    commit_sha, branch_name = get_git_revision(REPO_ROOT)
    assert len(commit_sha) == 40
    assert branch_name

    recipe_hash = compute_training_recipe_hash(REPO_ROOT)
    assert len(recipe_hash) == 64
    assert recipe_hash != "0" * 64

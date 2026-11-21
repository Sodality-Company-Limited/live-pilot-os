"""
Adversarial Empirical Stress Suite: Milestone 4 ML Engine (PyTorch py310).

Goal Reference: G-UX-017, G-UX-018, G-UX-019
Epic: UX (Multimodal UX/UI Design Decision Making Layer)

Invariants: Zero mocks, zero stubs, 100% concrete operational execution.
"""

import os
import sys
import hashlib
import time
from pathlib import Path
import pytest
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.training.carl_loss import (
    CARLConfig,
    CARLLossOutput,
    CARLLoss,
)
from src.training.lora_merger import (
    LoRAConfig,
    LoRAAdapter,
    linear_merge,
    ties_merge,
    dare_merge,
    PersonaLoRAManager,
    CANONICAL_PERSONAS,
)
from src.training.provenance_tracker import (
    ProvenanceTracker,
    compute_file_sha256,
    compute_buffer_sha256,
    sign_payload_hmac,
    verify_payload_hmac,
    GENESIS_PREV_HASH,
)


# ═══════════════════════════════════════════════════════════════════════════
# 1. G-UX-017: PYTORCH CARL LOSS & REWARDING DOUBT ADVERSARIAL STRESS
# ═══════════════════════════════════════════════════════════════════════════

def test_pytorch_carl_loss_extremal_inputs_and_backward():
    """Probe CARL loss with extreme boundary values (0.0, 1.0, epsilon, 1-epsilon) and verify gradient stability."""
    carl = CARLLoss()
    eps = carl.config.epsilon

    conf = torch.tensor([0.0, 1.0, eps, 1.0 - eps, 0.50], requires_grad=True)
    targets = torch.tensor([0.0, 1.0, 0.0, 1.0, 1.0])
    actions = ["DEFER", "PROCEED", "DEFER", "PROCEED", "PROCEED"]
    is_ambiguous = torch.tensor([True, False, True, False, False])

    out = carl(conf, targets, actions=actions, is_ambiguous=is_ambiguous)

    assert isinstance(out, CARLLossOutput)
    assert not torch.isnan(out.loss), "Total loss must not be NaN"
    assert torch.isfinite(out.loss), "Total loss must be finite"
    assert not torch.isnan(out.brier_loss)
    assert not torch.isnan(out.log_loss)

    # Test backward pass gradient propagation
    out.backward()
    assert conf.grad is not None, "Gradient must be computed"
    assert not torch.isnan(conf.grad).any(), "Gradients must not contain NaNs"
    assert torch.isfinite(conf.grad).all(), "Gradients must all be finite"


def test_pytorch_carl_loss_asymmetric_overconfidence_penalty():
    """Verify asymmetric 10x quadratic overconfidence penalty on false acceptances."""
    carl = CARLLoss()

    # Batch of 4 cases:
    # 0: Wrong + high confidence (y=0, c=0.90) -> Penalty = 10 * 0.90^2 = 8.10
    # 1: Wrong + sub-threshold confidence (y=0, c=0.749) -> Penalty = 0.0
    # 2: Correct + high confidence (y=1, c=0.95) -> Penalty = 0.0
    # 3: Wrong + threshold boundary (y=0, c=0.75) -> Penalty = 10 * 0.75^2 = 5.625
    conf = torch.tensor([0.90, 0.749, 0.95, 0.75])
    targets = torch.tensor([0.0, 0.0, 1.0, 0.0])

    out = carl(conf, targets)

    expected_mean_penalty = (8.10 + 0.0 + 0.0 + 5.625) / 4.0
    actual_penalty = out.overconfidence_penalty.item()
    assert abs(actual_penalty - expected_mean_penalty) < 1e-4


def test_pytorch_carl_loss_rewarding_doubt_adversarial_matrix():
    """Verify doubt rewards and penalties across ambiguous and unambiguous states."""
    carl = CARLLoss()

    conf = torch.tensor([0.25, 0.85, 0.90, 0.90])
    targets = torch.tensor([0.0, 0.0, 1.0, 0.0])
    actions = ["DEFER", "PROCEED", "DEFER", "PROCEED"]
    is_ambiguous = torch.tensor([True, True, False, False])

    # Case 0: Ambiguous DEFER (c=0.25) -> Reward +1.0*(1 - 0.25) = +0.75 -> loss = -0.75
    # Case 1: Ambiguous PROCEED (c=0.85) -> Penalty -2.0*0.85^2 = -1.445 -> loss = +1.445
    # Case 2: Unambiguous False Deferral (y=1, c=0.90, DEFER) -> Penalty -0.5*(1 - 0.90) = -0.05 -> loss = +0.05
    # Case 3: Unambiguous PROCEED (y=0, c=0.90, PROCEED) -> No doubt penalty -> loss = 0.0
    out = carl(conf, targets, actions=actions, is_ambiguous=is_ambiguous)

    expected_doubt_losses = [-0.75, 1.445, 0.05, 0.0]
    expected_mean_doubt_loss = sum(expected_doubt_losses) / 4.0

    actual_doubt_loss = out.metrics["doubt_loss"]
    assert abs(actual_doubt_loss - expected_mean_doubt_loss) < 1e-4
    assert abs(out.doubt_reward.item() - (-expected_mean_doubt_loss)) < 1e-4


def test_pytorch_carl_1000_episode_calibration_battery_and_failure_detection():
    """Assert all 4 calibration invariants pass on calibrated cohort, and fail on adversarial cohort."""
    carl = CARLLoss()

    # 1. Calibrated cohort (1,000 episodes):
    high_conf = torch.full((700,), 0.96)
    high_targets = torch.ones(700)
    high_targets[:5] = 0.0  # 5 errors in 700 samples -> HCER = 5/700 = 0.0071 <= 0.010

    med_high_conf = torch.full((100,), 0.70)
    med_high_targets = torch.zeros(100)
    med_high_targets[:70] = 1.0

    med_conf = torch.full((100,), 0.50)
    med_targets = torch.zeros(100)
    med_targets[:50] = 1.0

    low_conf = torch.full((100,), 0.20)
    low_targets = torch.zeros(100)
    low_targets[:20] = 1.0

    all_conf = torch.cat([high_conf, med_high_conf, med_conf, low_conf])
    all_targets = torch.cat([high_targets, med_high_targets, med_targets, low_targets])

    cal_res = carl.evaluate_calibration(all_conf, all_targets)
    assert cal_res["passed"] is True
    assert cal_res["brier"] <= 0.150
    assert cal_res["ece"] <= 0.050
    assert cal_res["auroc"] >= 0.880
    assert cal_res["hcer"] <= 0.010

    # 2. Adversarial cohort: inverted predictions (high confidence on incorrect targets)
    adv_conf = torch.full((500,), 0.95)
    adv_targets = torch.zeros(500)
    adv_res = carl.evaluate_calibration(adv_conf, adv_targets)

    assert adv_res["passed"] is False, "Inverted overconfident cohort must fail calibration battery"
    assert adv_res["hcer"] == 1.0, "HCER must be 1.0 on 100% error high-confidence predictions"
    assert adv_res["hcer_passed"] is False


# ═══════════════════════════════════════════════════════════════════════════
# 2. G-UX-018: LORA ZERO-INITIALIZATION & TENSOR MERGING ADVERSARIAL STRESS
# ═══════════════════════════════════════════════════════════════════════════

def test_pytorch_lora_zero_init_across_all_12_personas():
    """Verify B = 0 -> Delta W = 0 across all 12 canonical persona adapters."""
    manager = PersonaLoRAManager(in_features=64, out_features=64)

    assert len(manager.adapters) == 12
    for name in CANONICAL_PERSONAS:
        adapter = manager.get_adapter(name)
        assert torch.all(adapter.lora_B == 0.0), f"Adapter {name} lora_B is not zero-initialized"
        delta_w = adapter.compute_delta_w()
        assert torch.all(delta_w == 0.0), f"Adapter {name} Delta W is not zero at step 0"

        # Forward pass on random input must produce zero tensor
        x = torch.randn(4, 64)
        out = adapter(x)
        assert torch.all(out == 0.0), f"Adapter {name} forward pass non-zero at step 0"


def test_pytorch_lora_merging_orthogonal_and_conflicting_tensors():
    """Test Linear, TIES, and DARE merging on orthogonal, conflicting, and zero-weight tensors."""
    config = LoRAConfig(r=4, alpha=8)
    a1 = LoRAAdapter("a1", in_features=8, out_features=8, config=config)
    a2 = LoRAAdapter("a2", in_features=8, out_features=8, config=config)

    # Set parameters:
    # a1 has +10.0 at coordinate (0, 0)
    # a2 has -6.0 at coordinate (0, 0) [conflicting] and +4.0 at coordinate (1, 1) [orthogonal]
    with torch.no_grad():
        a1.lora_B[0, 0] = 5.0
        a1.lora_A[0, 0] = 1.0  # delta[0, 0] = (8/4) * (5*1) = 10.0

        a2.lora_B[0, 0] = -3.0
        a2.lora_A[0, 0] = 1.0  # delta[0, 0] = 2.0 * (-3*1) = -6.0
        a2.lora_B[1, 0] = 2.0
        a2.lora_A[0, 1] = 1.0  # delta[1, 1] = 2.0 * (2*1) = 4.0

    # 1. Linear merge with weights [0.5, 0.5]
    merged_linear = linear_merge([a1, a2], weights=[0.5, 0.5])
    assert abs(merged_linear[0, 0].item() - (0.5 * 10.0 + 0.5 * -6.0)) < 1e-5  # 2.0
    assert abs(merged_linear[1, 1].item() - (0.5 * 0.0 + 0.5 * 4.0)) < 1e-5   # 2.0

    # 2. TIES merge: density = 0.5
    merged_ties = ties_merge([a1, a2], density=0.5, weights=[0.5, 0.5])
    # Vote at (0, 0): 0.5*10 + 0.5*(-6) = +2.0 >= 0 -> majority sign is +1.
    # a1 matches (+10), a2 discarded (-6) -> normalized by matching weight (0.5) -> 10.0
    assert abs(merged_ties[0, 0].item() - 10.0) < 1e-5

    # 3. DARE merge with drop_rate = 0.50
    merged_dare = dare_merge([a1, a2], drop_rate=0.50, weights=[0.5, 0.5], seed=12345)
    assert merged_dare.shape == (8, 8)
    assert not torch.isnan(merged_dare).any()

    # 4. Fail-closed error handling
    with pytest.raises(ValueError, match="Cannot merge empty adapter list"):
        linear_merge([])
    with pytest.raises(ValueError, match="density must be in"):
        ties_merge([a1], density=0.0)
    with pytest.raises(ValueError, match="density must be in"):
        ties_merge([a1], density=1.5)
    with pytest.raises(ValueError, match="drop_rate must be in"):
        dare_merge([a1], drop_rate=-0.1)
    with pytest.raises(ValueError, match="drop_rate must be in"):
        dare_merge([a1], drop_rate=1.0)


def test_pytorch_lora_persona_swapping_benchmark():
    """Benchmark rapid persona team synthesis in Python."""
    manager = PersonaLoRAManager(in_features=64, out_features=64)
    team = ["dark_pattern_ethics_watchdog", "accessibility_auditor", "design_systems_lead"]

    latencies = []
    for _ in range(100):
        t0 = time.perf_hooks_nanos() if hasattr(time, 'perf_hooks_nanos') else time.perf_counter()
        merged = manager.synthesize_team_adapter(team, strategy="ties", density=0.20)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0 if not hasattr(time, 'perf_hooks_nanos') else (time.perf_hooks_nanos() - t0) / 1e6
        latencies.append(elapsed_ms)
        assert merged.shape == (64, 64)

    max_lat = max(latencies)
    assert max_lat < 50.0, f"Python swapping latency {max_lat}ms violated < 50ms SLA"


# ═══════════════════════════════════════════════════════════════════════════
# 3. G-UX-019: MODEL PROVENANCE TRACKER ADVERSARIAL TAMPERING & CHAIN STRESS
# ═══════════════════════════════════════════════════════════════════════════

def test_provenance_tracker_tamper_detection_in_sealed_manifest():
    """Verify HMAC signature mismatch on bit-level payload tampering."""
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
    artifacts = [{"path": "code/ml/src/training/sft_trainer.py", "sha256": compute_file_sha256(tracker.repo_root / "code/ml/src/training/sft_trainer.py")}]

    manifest = tracker.create_provenance_manifest(
        model_id="original-model",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
    )

    # Clean manifest verifies
    valid, errs = tracker.verify_provenance_block(manifest)
    assert valid is True, f"Clean block verification failed: {errs}"

    # Attack 1: Mutate model_id
    tampered1 = dict(manifest)
    tampered1["model_id"] = "forged-model-id"
    valid1, errs1 = tracker.verify_provenance_block(tampered1)
    assert valid1 is False
    assert any("Invalid HMAC-SHA256 signature" in e for e in errs1)

    # Attack 2: Falsify evaluation metric
    tampered2 = dict(manifest)
    tampered2["evaluation_metrics"] = dict(eval_metrics)
    tampered2["evaluation_metrics"]["ece"] = 0.001
    valid2, errs2 = tracker.verify_provenance_block(tampered2)
    assert valid2 is False
    assert any("Invalid HMAC-SHA256 signature" in e for e in errs2)

    # Attack 3: Corrupt artifact byte hash
    tampered3 = dict(manifest)
    tampered3["artifacts"] = [{"path": "code/ml/src/training/sft_trainer.py", "sha256": "0" * 64}]
    valid3, errs3 = tracker.verify_provenance_block(tampered3)
    assert valid3 is False
    assert any("Artifact hash mismatch" in e or "Invalid HMAC" in e for e in errs3)


def test_provenance_tracker_blockchain_integrity_and_sequence_attacks():
    """Test out-of-order injection, index duplication, and broken hash chaining."""
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
    artifacts = [{"path": "code/ml/src/training/sft_trainer.py", "sha256": compute_file_sha256(tracker.repo_root / "code/ml/src/training/sft_trainer.py")}]

    # Block 0
    b0 = tracker.create_provenance_manifest(
        model_id="b0",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
        block_index=0,
        previous_block_hash=GENESIS_PREV_HASH,
    )

    # Block 1
    b0_hash = tracker.compute_block_hash(b0)
    b1 = tracker.create_provenance_manifest(
        model_id="b1",
        base_checkpoint="gemma-4-it",
        source_revision="c960e7d8fb2daa110feaead40f33b785c7e345bd",
        training_config=training_config,
        evaluation_metrics=eval_metrics,
        artifacts=artifacts,
        block_index=1,
        previous_block_hash=b0_hash,
    )

    # Valid chain
    valid, errs = tracker.verify_chain([b0, b1])
    assert valid is True

    # Attack 1: Out-of-order sequence (Block 1 before Block 0)
    valid_swap, errs_swap = tracker.verify_chain([b1, b0])
    assert valid_swap is False
    assert any("index mismatch" in e or "previous_block_hash" in e for e in errs_swap)

    # Attack 2: Duplicate block index (Block 0 twice)
    valid_dup, errs_dup = tracker.verify_chain([b0, b0])
    assert valid_dup is False
    assert any("index mismatch" in e for e in errs_dup)

    # Attack 3: Corrupt previous block hash in Block 1
    corrupted_b1 = dict(b1)
    corrupted_b1["previous_block_hash"] = "f" * 64
    valid_corrupt, errs_corrupt = tracker.verify_chain([b0, corrupted_b1])
    assert valid_corrupt is False


def test_provenance_tracker_physical_curriculum_lineage_verification():
    """Verify Stage 1-6 dataset SHA-256 byte digests against physical files on disk."""
    tracker = ProvenanceTracker()
    lineage = tracker.collect_dataset_lineage()

    targets = {
        "stage1_taxonomy_sha256": "schemas/ui-taxonomy.schema.json",
        "stage2_scene_graphs_sha256": "artifacts/curriculum/stage2_scene_graphs/manifest.json",
        "stage3_heuristics_sha256": "artifacts/curriculum/stage3_heuristics/summary.json",
        "stage4_trajectories_sha256": "artifacts/curriculum/stage4_trajectories/manifest.json",
        "stage5_preferences_sha256": "artifacts/curriculum/stage5_preferences/manifest.json",
        "stage6_adversarial_sha256": "artifacts/curriculum/stage6_adversarial/manifest.json",
    }

    for key, rel_path in targets.items():
        full_path = tracker.repo_root / rel_path
        assert full_path.is_file(), f"Lineage file {rel_path} does not exist"

        disk_hash = compute_file_sha256(full_path)
        assert lineage[key] == disk_hash, f"Lineage digest for {key} does not match physical disk bytes"

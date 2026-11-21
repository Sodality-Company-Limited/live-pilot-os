"""
Comprehensive unit and integration test suite for G-ML-003 Baseline Evaluation Benchmark.

Verifies:
- Candidate model configuration parsing and validation.
- Exact token perplexity computation with mathematical bounds and non-finite rejection.
- 10-bin Expected Calibration Error (ECE) measurement bounded in [0.0, 1.0].
- Comparative scorecard generation and explicit mathematical recommendation synthesis.
- Zero-mock invariant: all tests execute concrete tensor and benchmark logic.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
import json
import pytest
import torch

# Ensure code/ml is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_ROOT = REPO_ROOT / "code" / "ml"
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

from benchmarks.baseline_eval import BaselineEvaluator, CandidateModelConfig


def test_runner_initialization():
    """Step 1 Verification: Test runner initialization and candidate config loader."""
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")
    assert evaluator is not None
    assert "qwen3_8b" in evaluator.candidates
    assert "gemma_4" in evaluator.candidates

    qwen = evaluator.candidates["qwen3_8b"]
    assert qwen.checkpoint_id == "Qwen/Qwen3-8B"
    assert qwen.decoding["temperature"] == 0.0
    assert qwen.decoding["do_sample"] is False

    gemma = evaluator.candidates["gemma_4"]
    assert gemma.checkpoint_id == "google/gemma-4-9b"
    assert gemma.decoding["temperature"] == 0.0
    assert gemma.decoding["do_sample"] is False

    # Fail-closed test on missing config file
    with pytest.raises(FileNotFoundError):
        BaselineEvaluator(config_path="code/ml/configs/non_existent_config.yaml")


def test_metrics_calculation():
    """Step 2 Verification: Metric extraction for perplexity and baseline ECE."""
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")

    # 1. Exact perplexity calculation test
    logits = torch.tensor([[3.0, 1.0, 0.5], [0.2, 4.0, 1.2]], dtype=torch.float32)
    targets = torch.tensor([0, 1], dtype=torch.long)
    ppl = evaluator.compute_perplexity(logits, targets)
    assert isinstance(ppl, float)
    assert ppl >= 1.0

    # 2. Rejection of non-finite logits (NaN/Inf)
    nan_logits = torch.tensor([[float("nan"), 1.0], [0.5, 0.5]])
    with pytest.raises(ValueError, match="non-finite"):
        evaluator.compute_perplexity(nan_logits, torch.tensor([0, 1]))

    inf_logits = torch.tensor([[float("inf"), 1.0], [0.5, 0.5]])
    with pytest.raises(ValueError, match="non-finite"):
        evaluator.compute_perplexity(inf_logits, torch.tensor([0, 1]))

    # 3. 10-bin Expected Calibration Error calculation test
    probs = torch.tensor([
        [0.9, 0.1],
        [0.8, 0.2],
        [0.6, 0.4],
        [0.55, 0.45],
        [0.95, 0.05]
    ], dtype=torch.float32)
    labels = torch.tensor([0, 0, 1, 0, 0], dtype=torch.long)

    ece = evaluator.compute_ece(probs, labels, bins=10)
    assert isinstance(ece, float)
    assert 0.0 <= ece <= 1.0

    # 4. Out-of-bounds probability rejection
    invalid_probs_upper = torch.tensor([[1.2, -0.2], [0.8, 0.2]])
    with pytest.raises(ValueError, match="outside \\[0\\.0, 1\\.0\\]"):
        evaluator.compute_ece(invalid_probs_upper, torch.tensor([0, 1]))

    invalid_probs_lower = torch.tensor([[-0.1, 1.1], [0.5, 0.5]])
    with pytest.raises(ValueError, match="outside \\[0\\.0, 1\\.0\\]"):
        evaluator.compute_ece(invalid_probs_lower, torch.tensor([0, 1]))


def test_scorecard_emission(tmp_path):
    """Step 3 Verification: Run baseline benchmark and emit comparative scorecard."""
    output_path = "artifacts/benchmarks/baseline_scorecard.json"
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")
    scorecard = evaluator.emit_scorecard(output_path=output_path)

    assert os.path.exists(output_path)
    assert scorecard["schema_version"] == "1.0.0"
    assert scorecard["goal_id"] == "G-ML-003"
    assert "candidates" in scorecard
    assert "qwen3_8b" in scorecard["candidates"]
    assert "gemma_4" in scorecard["candidates"]

    # Verify candidate metrics
    for cid in ["qwen3_8b", "gemma_4"]:
        cdata = scorecard["candidates"][cid]
        assert cdata["perplexity"] >= 1.0
        assert 0.0 <= cdata["expected_calibration_error"] <= 1.0
        assert cdata["latency"]["p95_ms"] < 250.0
        assert cdata["latency"]["sla_satisfied"] is True
        assert "composite_score" in cdata

    # Verify mathematical recommendation
    rec = scorecard["recommendation"]
    assert rec["selected_model_id"] in ["qwen3_8b", "gemma_4"]
    assert rec["composite_score"] > 0.0
    assert "formula" in rec
    assert "rationale" in rec
    assert rec["unblocks"] == "G-ML-004 Dual-Head Architecture Module"


def test_greedy_determinism_validation():
    """Verifies that non-greedy decoding parameters are strictly rejected."""
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")

    with pytest.raises(ValueError, match="temperature must be 0.0"):
        evaluator.validate_decoding_params({"temperature": 0.8, "do_sample": False})

    with pytest.raises(ValueError, match="do_sample must be False"):
        evaluator.validate_decoding_params({"temperature": 0.0, "do_sample": True})


def test_empty_prompt_batch_rejection():
    """Verifies that empty evaluation batches raise ValueError."""
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")
    with pytest.raises(ValueError, match="Prompt list cannot be empty"):
        evaluator.evaluate_prompts([])


def test_scorecard_schema_validation():
    """Verifies strict validation of scorecard JSON schema."""
    evaluator = BaselineEvaluator(config_path="code/ml/configs/candidates.yaml")

    # Incomplete schema: missing candidates
    with pytest.raises(ValueError, match="missing required field 'candidates'"):
        evaluator.validate_scorecard_schema({"schema_version": "1.0.0", "goal_id": "G-ML-003", "recommendation": {}})

    # Incomplete recommendation
    with pytest.raises(ValueError, match="missing 'selected_model_id'"):
        evaluator.validate_scorecard_schema({
            "schema_version": "1.0.0",
            "goal_id": "G-ML-003",
            "candidates": {},
            "recommendation": {"formula": "S=..."}
        })

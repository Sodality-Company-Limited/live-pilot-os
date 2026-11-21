"""
tests/ml/test_labeler.py

Unit, integration, and golden dataset pipeline verification for
DeterministicOutcomeLabeler in Soda OS ML.
Zero mocks, zero stubs; 100% production-ready operational tests.
"""

from __future__ import annotations

import json
import math
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

import pytest
from pydantic import ValidationError

# Ensure code/ml/src is on python path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_SRC = REPO_ROOT / "code" / "ml" / "src"
if str(ML_SRC) not in sys.path:
    sys.path.insert(0, str(ML_SRC))

from dataset.labeler import (
    DeterministicOutcomeLabeler,
    ExecutionReceipt,
    OutcomeLabelResult,
)
from dataset.schema import DecisionRecord, RiskLevel, validate_decision_record


@pytest.fixture
def labeler() -> DeterministicOutcomeLabeler:
    return DeterministicOutcomeLabeler()


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Correctness Grading Battery (50 Test Traces)
# ─────────────────────────────────────────────────────────────────────────────


def test_correctness_grading(labeler: DeterministicOutcomeLabeler) -> None:
    """
    Step 1 Verification Gate:
    Grader assigns 100% accurate binary labels across 50 test traces with exit code 0.
    Stop condition: Any mislabeled execution trace or failure to parse receipt logs.
    """
    test_traces: List[Dict[str, Any]] = []

    # 25 Verified Successful Traces (exit code 0, no assertion error, valid AST)
    for i in range(25):
        test_traces.append({
            "id": f"success_trace_{i}",
            "receipt": {
                "exit_code": 0,
                "stdout": f"Test {i} passed cleanly with 0 errors.",
                "stderr": "",
                "assertion_passed": True,
                "source_code": f"def add_{i}(a: int, b: int) -> int:\n    return a + b\n",
                "golden_reference": "def add(a: int, b: int) -> int:\n    return a + b\n",
            },
            "expected_correctness": 1,
            "expected_status": "CORRECT",
        })

    # 10 Non-Zero Exit Code Traces (exit code 1, 2, 137, 127)
    for i in range(10):
        code = 1 + (i % 5)
        test_traces.append({
            "id": f"failed_exit_{i}",
            "receipt": {
                "exit_code": code,
                "stdout": "",
                "stderr": f"Process exited with non-zero status code: {code}",
                "assertion_passed": False,
                "source_code": f"x = {i}\n",
            },
            "expected_correctness": 0,
            "expected_status": "INCORRECT",
        })

    # 5 Assertion Failure Traces with exit code 0 (swallowed or caught)
    for i in range(5):
        test_traces.append({
            "id": f"assertion_fail_{i}",
            "receipt": {
                "exit_code": 0,
                "stdout": "Running tests...\nFAILED test_math.py::test_case\nAssertionError: assert 4 == 5",
                "stderr": "Traceback (most recent call last):\n  File 'test_math.py', line 10, in test_case",
                "assertion_passed": False,
                "source_code": f"assert {i} == {i + 1}\n",
            },
            "expected_correctness": 0,
            "expected_status": "INCORRECT",
        })

    # 5 Syntax Error Traces
    for i in range(5):
        test_traces.append({
            "id": f"syntax_error_{i}",
            "receipt": {
                "exit_code": 0,
                "stdout": "",
                "stderr": "SyntaxError: invalid syntax",
                "assertion_passed": None,
                "source_code": f"def broken_{i}((\n",
            },
            "expected_correctness": 0,
            "expected_status": "INCORRECT",
        })

    # 5 Missing / Corrupt Receipt Traces (UNKNOWN outcome)
    for i in range(5):
        test_traces.append({
            "id": f"unknown_trace_{i}",
            "receipt": {
                "stdout": "Corrupt receipt with missing exit code",
            },
            "expected_correctness": 0,
            "expected_status": "UNKNOWN",
        })

    assert len(test_traces) == 50, f"Expected exactly 50 test traces, got {len(test_traces)}"

    mismatches = []
    for trace in test_traces:
        corr, status = labeler.grade_correctness(trace["receipt"])
        if corr != trace["expected_correctness"] or status != trace["expected_status"]:
            mismatches.append({
                "id": trace["id"],
                "expected": (trace["expected_correctness"], trace["expected_status"]),
                "got": (corr, status),
            })

    assert len(mismatches) == 0, f"Mismatches detected in correctness grading: {mismatches}"


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Evidence Overlap and Empirical Target Probability Assignment
# ─────────────────────────────────────────────────────────────────────────────


def test_evidence_scoring(labeler: DeterministicOutcomeLabeler) -> None:
    """
    Step 2 Verification Gate:
    Evidence scoring produces bounded values in [0.0, 1.0] and targets reflect empirical frequencies.
    Stop condition: Evidence ratio outside [0.0, 1.0] or non-deterministic target calculation.
    """
    source_docs = [
        "In Soda OS, each agent decision is cryptographically logged with a UUIDv7 context identifier.",
        "Calibrated confidence heads predict the empirical correctness of the model output.",
        "The fail-closed policy requires routing high-risk decisions with low confidence to human review.",
    ]

    # Test 1: Full Exact Overlap
    evidence_full = [
        "In Soda OS, each agent decision is cryptographically logged with a UUIDv7 context identifier.",
        "Calibrated confidence heads predict the empirical correctness of the model output.",
    ]
    score_full = labeler.calculate_evidence_support(evidence_full, source_docs)
    assert 0.0 <= score_full <= 1.0
    assert score_full == 1.0, f"Expected 1.0 for exact citations, got {score_full}"

    # Test 2: Zero Overlap
    evidence_none = [
        "Completely fabricated citation not present anywhere in the source corpus.",
        "Another hallucinated string of characters.",
    ]
    score_none = labeler.calculate_evidence_support(evidence_none, source_docs)
    assert score_none == 0.0, f"Expected 0.0 for fabricated citations, got {score_none}"

    # Test 3: Partial Substring Overlap
    evidence_partial = [
        "Calibrated confidence heads predict the empirical correctness of the model output.",
        "Fabricated extra citation that has no match in the corpus.",
    ]
    score_partial = labeler.calculate_evidence_support(evidence_partial, source_docs)
    assert 0.0 < score_partial < 1.0, f"Expected partial overlap in (0, 1), got {score_partial}"

    # Test 4: Empty Evidence List
    score_empty = labeler.calculate_evidence_support([], source_docs)
    assert score_empty == 0.0

    # Test 5: Empty Source Docs
    score_no_source = labeler.calculate_evidence_support(evidence_full, "")
    assert score_no_source == 0.0

    # Test 6: Empirical Target Probability Calibration Mapping
    # Correct & High Evidence
    p_high = labeler.assign_calibrated_target(1, 0.95, "normal")
    assert p_high == 0.9450
    p_high_risk = labeler.assign_calibrated_target(1, 0.95, "high")
    assert p_high_risk == 0.8850
    assert p_high_risk < p_high, "High risk should assign lower probability"

    # Correct & Low Evidence
    p_low = labeler.assign_calibrated_target(1, 0.10, "normal")
    assert p_low == 0.5840

    # Incorrect & Low Evidence
    p_inc_low = labeler.assign_calibrated_target(0, 0.10, "normal")
    assert p_inc_low == 0.0420

    # Incorrect & High Evidence (hallucinated citation)
    p_inc_high = labeler.assign_calibrated_target(0, 0.80, "normal")
    assert p_inc_high == 0.1890

    # Invariant: Probability strictly bounded in [0.0, 1.0] across continuous sweep
    for ratio_i in range(101):
        ratio = ratio_i / 100.0
        p_c1 = labeler.assign_calibrated_target(1, ratio, "normal")
        p_c0 = labeler.assign_calibrated_target(0, ratio, "normal")
        assert 0.0 <= p_c1 <= 1.0
        assert 0.0 <= p_c0 <= 1.0
        assert p_c1 > p_c0, f"Correctness 1 must yield higher target than 0: {p_c1} vs {p_c0}"

    # Boundary Rejection
    with pytest.raises(ValueError):
        labeler.assign_calibrated_target(2, 0.5, "normal")

    with pytest.raises(ValueError):
        labeler.assign_calibrated_target(1, -0.01, "normal")

    with pytest.raises(ValueError):
        labeler.assign_calibrated_target(1, 1.01, "normal")

    with pytest.raises(ValueError):
        labeler.assign_calibrated_target(1, float("nan"), "normal")


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Golden Dataset Labeling Pipeline (1,000 Records)
# ─────────────────────────────────────────────────────────────────────────────


def test_golden_pipeline(labeler: DeterministicOutcomeLabeler) -> None:
    """
    Step 3 Verification Gate:
    Run labeling pipeline over 1,000 raw decision traces and generate data/processed/train_labeled_v1.jsonl.
    Verify that zero malformed records exist and that unverifiable traces are quarantined as UNKNOWN.
    Completion gate: Golden labeled split passes 100% schema validation with zero quarantine leaks.
    Stop condition: Any schema violation in labeled output or throughput below 100 records per second.
    """
    ground_truth_docs = {
        "doc1": "Soda OS agent architecture integrates an autoregressive LLM with an auxiliary calibrated confidence head.",
        "doc2": "Cryptographic multi-tenancy ensures all subjects follow Triple-ID mapping authenticated via Ed25519 NKeys.",
        "doc3": "High-risk decisions with uncertainty defer to human review under fail-closed circuit breakers.",
        "doc4": "AST parsing provides objective ground truth for deterministic code-execution grading.",
    }

    # Synthesize 1,000 realistic raw decision traces
    raw_traces: List[Dict[str, Any]] = []

    # 800 Valid Traces (mix of correct and incorrect)
    for i in range(800):
        is_success = (i % 3 != 0)
        risk = "high" if (i % 5 == 0) else "normal"
        citation_key = f"doc{(i % 4) + 1}"
        citation_text = ground_truth_docs[citation_key]

        raw_traces.append({
            "context_id": f"ctx_golden_{i:04d}",
            "prompt": f"Task request {i}: implement deterministic function.",
            "completion": f"def compute_{i}(val: int) -> int:\n    return val * 2\n",
            "evidence_list": [citation_text[:60]],
            "ground_truth_outcome": "pending",  # Raw unassigned
            "risk_level": risk,
            "confidence": 0.85 if is_success else 0.40,
            "execution_receipt": {
                "exit_code": 0 if is_success else 1,
                "stdout": "OK" if is_success else "Execution failed with non-zero exit code",
                "stderr": "" if is_success else "Error",
                "assertion_passed": is_success,
                "source_code": f"def compute_{i}(val: int) -> int:\n    return val * 2\n",
            }
        })

    # 150 Unverifiable Traces (missing receipts -> UNKNOWN -> Quarantine)
    for i in range(150):
        raw_traces.append({
            "context_id": f"ctx_missing_receipt_{i:04d}",
            "prompt": f"Task request missing receipt {i}",
            "completion": f"print({i})",
            "evidence_list": [],
            "ground_truth_outcome": "pending",
            "risk_level": "normal",
            # No execution receipt!
        })

    # 50 Corrupted Traces (invalid schema fields or non-integer exit code -> Quarantine)
    for i in range(50):
        raw_traces.append({
            "context_id": f"ctx_corrupted_{i:04d}",
            "prompt": f"Corrupted trace {i}",
            "completion": f"code_{i}",
            "evidence_list": "non_array_evidence",  # schema violation
            "ground_truth_outcome": "pending",
            "risk_level": "invalid_risk_enum",
            "execution_receipt": {
                "exit_code": "not_an_int",
            }
        })

    assert len(raw_traces) == 1000

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_p = Path(tmp_dir)
        raw_input_path = tmp_p / "raw_1000.jsonl"
        clean_output_path = tmp_p / "train_labeled_v1.jsonl"
        quarantine_path = tmp_p / "quarantine_v1.jsonl"

        with open(raw_input_path, "w", encoding="utf-8") as f:
            for trace in raw_traces:
                f.write(json.dumps(trace) + "\n")

        # Run labeling pipeline
        stats = labeler.generate_labeled_dataset(
            input_path=raw_input_path,
            output_path=clean_output_path,
            quarantine_path=quarantine_path,
            ground_truth_sources=ground_truth_docs,
        )

        # Gate Checks
        assert stats["total_input_records"] == 1000
        assert stats["clean_records_count"] == 800, f"Expected 800 clean records, got {stats['clean_records_count']}"
        assert stats["quarantined_records_count"] == 200, f"Expected 200 quarantined records, got {stats['quarantined_records_count']}"
        assert stats["records_per_second"] >= 100, f"Throughput SLA breach: {stats['records_per_second']} rec/s < 100"
        assert stats["zero_leak_verified"] is True

        # Verify clean output records against Pydantic schema
        clean_lines = clean_output_path.read_text(encoding="utf-8").strip().split("\n")
        assert len(clean_lines) == 800

        for line in clean_lines:
            rec = json.loads(line)
            # Schema validation
            validated = validate_decision_record(rec)
            assert validated.ground_truth_outcome in ("CORRECT", "INCORRECT")
            assert validated.calibrated_score is not None
            assert 0.0 <= validated.calibrated_score <= 1.0
            assert rec["metadata"]["is_quarantined"] is False

        # Verify quarantined records
        q_lines = quarantine_path.read_text(encoding="utf-8").strip().split("\n")
        assert len(q_lines) == 200

        for line in q_lines:
            q_rec = json.loads(line)
            assert q_rec.get("ground_truth_outcome") == "UNKNOWN" or q_rec.get("metadata", {}).get("is_quarantined") is True

        # Now also generate into repository permanent data path: data/processed/train_labeled_v1.jsonl
        repo_data_out = Path("data/processed/train_labeled_v1.jsonl")
        repo_quarantine_out = Path("data/processed/quarantine_v1.jsonl")
        repo_data_out.parent.mkdir(parents=True, exist_ok=True)

        repo_stats = labeler.generate_labeled_dataset(
            input_path=raw_input_path,
            output_path=repo_data_out,
            quarantine_path=repo_quarantine_out,
            ground_truth_sources=ground_truth_docs,
        )
        assert repo_stats["clean_records_count"] == 800
        assert repo_data_out.exists() and repo_data_out.stat().st_size > 0


# ─────────────────────────────────────────────────────────────────────────────
# Additional Invariant Tests: AST Distance & Zero-Mock Robustness
# ─────────────────────────────────────────────────────────────────────────────


def test_ast_diff_metric(labeler: DeterministicOutcomeLabeler) -> None:
    """
    Tests AST structural distance metric computation.
    """
    src_exact = "def foo(x):\n    return x + 1\n"
    gold = "def foo(x):\n    return x + 1\n"
    receipt_exact = labeler.parse_execution_receipt({
        "exit_code": 0,
        "source_code": src_exact,
        "golden_reference": gold,
    })
    assert receipt_exact.ast_valid is True
    assert receipt_exact.ast_diff_metric == 0.0

    src_diff = "class Bar:\n    def baz(self, y):\n        for i in range(10):\n            print(y)\n"
    receipt_diff = labeler.parse_execution_receipt({
        "exit_code": 0,
        "source_code": src_diff,
        "golden_reference": gold,
    })
    assert receipt_diff.ast_valid is True
    assert 0.0 < receipt_diff.ast_diff_metric <= 1.0

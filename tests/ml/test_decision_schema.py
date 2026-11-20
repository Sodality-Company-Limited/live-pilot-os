"""
tests/ml/test_decision_schema.py

Comprehensive unit test battery for DecisionRecord JSON Schema and Pydantic validator module
covering valid records, 10 discrete boundary/malformed cases, and 20 golden multi-turn
trajectory fixtures with sub-5ms latency verification.
"""

import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import pytest

# Ensure code/ml/src is on python path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_SRC = REPO_ROOT / "code" / "ml" / "src"
if str(ML_SRC) not in sys.path:
    sys.path.insert(0, str(ML_SRC))

from dataset.schema import DatasetValidator, DecisionRecord, RiskLevel

SCHEMA_FILE = REPO_ROOT / "code" / "ml" / "schemas" / "decision_record.json"


@pytest.fixture
def validator() -> DatasetValidator:
    return DatasetValidator(schema_path=SCHEMA_FILE)


@pytest.fixture
def valid_sample_record() -> Dict[str, Any]:
    return {
        "context_id": "ctx_018f4a12-89b3-7d23-912c-4890c29184ba",
        "prompt": "Inspect codebase architecture for G-ML-001 and determine required schema fields.",
        "completion": "Analyzed RFC 8259 requirements and mapped canonical decision record fields.",
        "evidence_list": [
            "docs/07-backlog/goals/G-ML-001.md:L89-L93",
            "proof_receipt:sha256:4a8c96e424a667ba",
        ],
        "ground_truth_outcome": "verified_accurate",
        "risk_level": "normal",
        "confidence": 0.9425,
        "timestamp": "2026-09-29T23:10:00Z",
        "calibrated_score": 0.9150,
        "metadata": {
            "agent_id": "antigravity-ide-01",
            "execution_mode": "autonomous",
            "hardware": "Apple-Silicon-M2",
        },
    }


def test_valid_record_passes(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    record = validator.validate_record(valid_sample_record)
    assert record.context_id == valid_sample_record["context_id"]
    assert record.confidence == 0.9425
    assert record.risk_level == RiskLevel.NORMAL
    assert len(record.evidence_list) == 2


# ==============================================================================
# 10 Malformed Boundary Test Cases
# ==============================================================================


def test_malformed_case_01_confidence_above_one(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["confidence"] = 1.0001
    with pytest.raises(ValueError, match="confidence|boundary|less than or equal to 1"):
        validator.validate_record(bad_record)


def test_malformed_case_02_confidence_below_zero(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["confidence"] = -0.05
    with pytest.raises(ValueError, match="confidence|boundary|greater than or equal to 0"):
        validator.validate_record(bad_record)


def test_malformed_case_03_confidence_nan_or_inf(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["confidence"] = float("nan")
    with pytest.raises(ValueError):
        validator.validate_record(bad_record)

    bad_record["confidence"] = float("inf")
    with pytest.raises(ValueError):
        validator.validate_record(bad_record)


def test_malformed_case_04_missing_context_id(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    del bad_record["context_id"]
    with pytest.raises(ValueError, match="context_id"):
        validator.validate_record(bad_record)


def test_malformed_case_05_missing_prompt(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    del bad_record["prompt"]
    with pytest.raises(ValueError, match="prompt"):
        validator.validate_record(bad_record)


def test_malformed_case_06_missing_completion(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    del bad_record["completion"]
    with pytest.raises(ValueError, match="completion"):
        validator.validate_record(bad_record)


def test_malformed_case_07_missing_evidence_list(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    del bad_record["evidence_list"]
    with pytest.raises(ValueError, match="evidence_list"):
        validator.validate_record(bad_record)


def test_malformed_case_08_evidence_list_not_array(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["evidence_list"] = "evidence_as_a_plain_string_instead_of_list"
    with pytest.raises(ValueError, match="evidence_list"):
        validator.validate_record(bad_record)


def test_malformed_case_09_missing_ground_truth_outcome(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    del bad_record["ground_truth_outcome"]
    with pytest.raises(ValueError, match="ground_truth_outcome"):
        validator.validate_record(bad_record)


def test_malformed_case_10_invalid_risk_level_enum(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["risk_level"] = "catastrophic_unbounded_risk"
    with pytest.raises(ValueError, match="risk_level"):
        validator.validate_record(bad_record)


def test_malformed_case_extra_unpermitted_property(validator: DatasetValidator, valid_sample_record: Dict[str, Any]):
    bad_record = dict(valid_sample_record)
    bad_record["unauthorized_injected_field"] = "payload"
    with pytest.raises(ValueError, match="unauthorized_injected_field|Additional properties are not allowed"):
        validator.validate_record(bad_record)


# ==============================================================================
# Golden Trajectory Fixture Battery (20 Verified Multi-Turn Traces)
# ==============================================================================


GOLDEN_TRAJECTORY_FIXTURES: List[Dict[str, Any]] = [
    {
        "context_id": f"ctx_golden_trajectory_{i:03d}",
        "prompt": f"Turn {i}: Agent observing environment state and evaluating candidate action step #{i}.",
        "completion": f"Action {i}: Execute tool call dispatch with verified parameters for step #{i}.",
        "evidence_list": [
            f"docs/07-backlog/evidence/audit_trace_{i:03d}.json",
            f"code/ml/src/dataset/schema.py:L{10 + i * 5}",
        ],
        "ground_truth_outcome": "success",
        "risk_level": "normal" if i % 4 != 0 else "high",
        "confidence": round(0.70 + (i % 25) * 0.01, 4),
        "timestamp": f"2026-09-29T23:{10 + (i % 40):02d}:00Z",
        "calibrated_score": round(0.68 + (i % 25) * 0.01, 4),
        "metadata": {
            "turn_index": i,
            "trajectory_id": f"traj_{i // 5:02d}",
            "tokens_consumed": 128 + i * 16,
        },
    }
    for i in range(1, 21)
]


def test_golden_fixtures(validator: DatasetValidator):
    """
    Validate all 20 golden multi-turn agent decision traces.
    Enforce sub-5ms per record latency ceiling and zero schema errors.
    """
    latencies: List[float] = []

    for index, fixture in enumerate(GOLDEN_TRAJECTORY_FIXTURES):
        start_time = time.perf_counter()
        record = validator.validate_record(fixture)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        latencies.append(elapsed_ms)

        assert record.context_id == fixture["context_id"]
        assert record.confidence == fixture["confidence"]
        assert record.ground_truth_outcome == "success"
        assert len(record.evidence_list) == 2
        # Hard latency gate per record: must be < 5ms
        assert elapsed_ms < 5.0, f"Record {index} validation took {elapsed_ms:.3f}ms, exceeding 5ms SLA ceiling"

    # Batch validation check
    start_batch = time.perf_counter()
    validated_batch = validator.validate_batch(GOLDEN_TRAJECTORY_FIXTURES)
    total_batch_ms = (time.perf_counter() - start_batch) * 1000.0

    assert len(validated_batch) == 20
    avg_latency = sum(latencies) / len(latencies)
    assert avg_latency < 2.0, f"Average validation latency was {avg_latency:.3f}ms"
    print(f"\n[Golden Trajectory Battery] 20 records validated successfully. Avg: {avg_latency:.3f}ms, Batch: {total_batch_ms:.3f}ms")

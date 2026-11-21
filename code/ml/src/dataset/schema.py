"""
code/ml/src/dataset/schema.py

Dataset validator module and Pydantic v2 schemas for agent decision records
and calibrated multi-turn trajectory datasets in Soda OS.
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import jsonschema
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)


class RiskLevel(str, Enum):
    NORMAL = "normal"
    HIGH = "high"


class DecisionRecord(BaseModel):
    """
    Pydantic v2 model representing an individual agent decision record
    with evidence citations, confidence calibration fields, and ground-truth outcomes.
    """

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        str_strip_whitespace=True,
        populate_by_name=True,
    )

    context_id: str = Field(
        ...,
        min_length=1,
        description="Deterministic context identifier (UUIDv7 or nanoid).",
    )
    prompt: str = Field(
        ...,
        min_length=1,
        description="Input prompt or observation state presented to the model.",
    )
    completion: str = Field(
        ...,
        min_length=1,
        description="Action, tool call, or reasoning completion emitted by the model.",
    )
    evidence_list: List[str] = Field(
        ...,
        description="List of citation strings, cryptographic receipts, or tool outputs.",
    )
    ground_truth_outcome: str = Field(
        ...,
        min_length=1,
        description="Ground-truth outcome label (e.g. success, failure, correct, incorrect).",
    )
    risk_level: RiskLevel = Field(
        ...,
        description="Operational risk level (normal, high).",
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model confidence score bounded in [0.0, 1.0].",
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="RFC 3339 UTC timestamp.",
    )
    calibrated_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Calibrated probability bounded in [0.0, 1.0].",
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Auxiliary execution telemetry and environment attributes.",
    )

    @field_validator("confidence", "calibrated_score", mode="before")
    @classmethod
    def validate_finite_floats(cls, value: Any) -> Optional[float]:
        if value is None:
            return None
        if not isinstance(value, (int, float)):
            raise ValueError(f"Confidence value must be numeric float, got {type(value).__name__}")
        float_val = float(value)
        if math.isnan(float_val) or math.isinf(float_val):
            raise ValueError("Confidence value must be finite; NaN and Infinity are strictly rejected")
        if float_val < 0.0 or float_val > 1.0:
            raise ValueError(f"Confidence value {float_val} is outside [0.0, 1.0] boundary")
        return float_val

    @field_validator("evidence_list", mode="before")
    @classmethod
    def validate_evidence_array(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            raise ValueError(f"evidence_list must be a list of strings, got {type(value).__name__}")
        for item in value:
            if not isinstance(item, str):
                raise ValueError(f"All evidence items must be strings, got {type(item).__name__}")
        return value

    @field_validator("timestamp", mode="before")
    @classmethod
    def validate_rfc3339_timestamp(cls, value: Any) -> Optional[str]:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("timestamp must be an RFC 3339 string")
        try:
            # Parse ISO 8601 / RFC 3339
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception as e:
            raise ValueError(f"Invalid RFC 3339 timestamp format '{value}': {e}")
        return value


class DatasetValidator:
    """
    Driving Port Adapter implementing RFC 8259 JSON Schema and Pydantic v2
    validation for Soda OS dataset extraction pipelines.
    """

    def __init__(self, schema_path: Optional[str | Path] = None):
        if schema_path is None:
            # Resolve default schema path relative to repository
            current_dir = Path(__file__).resolve().parent
            # code/ml/src/dataset -> code/ml/schemas/decision_record.json
            repo_schema = current_dir.parent.parent / "schemas" / "decision_record.json"
            if repo_schema.exists():
                schema_path = repo_schema
            else:
                schema_path = Path("code/ml/schemas/decision_record.json")

        self.schema_path = Path(schema_path)
        if not self.schema_path.exists():
            raise FileNotFoundError(f"JSON Schema file not found at: {self.schema_path}")

        with open(self.schema_path, "r", encoding="utf-8") as f:
            self.json_schema = json.load(f)

        # Pre-compile JSON Schema validator
        self.validator_cls = jsonschema.validators.validator_for(self.json_schema)
        self.validator_cls.check_schema(self.json_schema)
        self._schema_validator = self.validator_cls(self.json_schema)

    def validate_record(self, record_data: Dict[str, Any]) -> DecisionRecord:
        """
        Validate an individual decision record dictionary against both JSON Schema
        and Pydantic v2 domain model.
        """
        if not isinstance(record_data, dict):
            raise ValueError(f"Record data must be a dictionary, got {type(record_data).__name__}")

        # 1. First-pass RFC 8259 JSON Schema validation
        try:
            self._schema_validator.validate(record_data)
        except jsonschema.ValidationError as err:
            field_path = ".".join(str(p) for p in err.path) if err.path else "root"
            raise ValueError(f"JSON Schema validation error on '{field_path}': {err.message}") from err

        # 2. Second-pass Pydantic v2 domain parsing & boundary checks
        try:
            record_model = DecisionRecord.model_validate(record_data)
            return record_model
        except ValidationError as err:
            raise ValueError(f"Pydantic validation error: {err}") from err

    def validate_batch(self, records: List[Dict[str, Any]]) -> List[DecisionRecord]:
        """
        Validate a collection of decision records, failing closed on any individual invalid record.
        """
        if not isinstance(records, list):
            raise ValueError(f"Records batch must be a list, got {type(records).__name__}")

        validated_records: List[DecisionRecord] = []
        for index, record in enumerate(records):
            try:
                validated = self.validate_record(record)
                validated_records.append(validated)
            except Exception as e:
                raise ValueError(f"Batch validation failed at record index {index}: {e}") from e

        return validated_records


_default_validator: Optional[DatasetValidator] = None


def get_default_validator() -> DatasetValidator:
    global _default_validator
    if _default_validator is None:
        _default_validator = DatasetValidator()
    return _default_validator


def validate_decision_record(record_data: Dict[str, Any]) -> DecisionRecord:
    """
    Convenience function to validate an individual decision record.
    """
    return get_default_validator().validate_record(record_data)


def validate_dataset_batch(records: List[Dict[str, Any]]) -> List[DecisionRecord]:
    """
    Convenience function to validate a batch of decision records.
    """
    return get_default_validator().validate_batch(records)


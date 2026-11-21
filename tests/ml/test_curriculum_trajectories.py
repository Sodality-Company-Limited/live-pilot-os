"""
Unit tests for Stage 4 12-Persona Multi-Agent Trajectories (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.persona_trajectories import (
    PersonaTrajectoryDataset,
    PersonaProposal,
    StateTransition,
    CollisionEvent,
)

TRAJECTORY_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl")
)


def test_persona_trajectory_loading():
    dataset = PersonaTrajectoryDataset(TRAJECTORY_FILE)
    assert len(dataset) == 2500

    item = dataset[0]
    assert item["trajectory_id"].startswith("TRAJ-")
    assert "participating_personas" in item
    assert "state_transitions" in item
    assert "calibrated_confidence" in item
    assert "sha256_digest" in item


def test_persona_trajectory_statistics():
    dataset = PersonaTrajectoryDataset(TRAJECTORY_FILE)
    stats = dataset.get_summary_statistics()

    assert stats["total_trajectories"] == 2500
    assert stats["unique_personas_count"] == 12
    assert stats["outcome_counts"]["EMIT_DECISION"] == 2000
    assert stats["outcome_counts"]["DEFER"] == 250
    assert stats["outcome_counts"]["REJECT_AS_UNSAFE"] == 250
    assert stats["average_tokens_consumed"] > 0
    assert stats["total_collisions_resolved"] > 0

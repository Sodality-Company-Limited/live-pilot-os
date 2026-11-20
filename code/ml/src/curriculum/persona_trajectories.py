"""
Stage 4 12-Persona Multi-Agent Trajectories (Python).

Manages 2,500 deliberation traces across all 12 personas and 10 lifecycle states
with token budgets, persona proposals, collision events, and 4-tier precedence resolution.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Set


@dataclass
class PersonaProposal:
    persona_id: str
    tier: int
    vote: str
    tokens_used: int
    rationale: str


@dataclass
class StateTransition:
    from_state: str
    to_state: str
    duration_ms: int
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CollisionEvent:
    collision_id: str
    persona_a: str
    persona_b: str
    dimension: str
    conflict_description: str


class PersonaTrajectoryDataset:
    """Dataset container for 12-persona multi-agent trajectories."""

    def __init__(self, jsonl_path: str) -> None:
        self.jsonl_path = jsonl_path
        self.trajectories: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.jsonl_path):
            raise FileNotFoundError(f"Trajectory file not found: {self.jsonl_path}")

        with open(self.jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.trajectories.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.trajectories)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.trajectories[idx]

    def get_summary_statistics(self) -> Dict[str, Any]:
        """Compute comprehensive statistics across 2,500 trajectories."""
        outcomes = {}
        persona_counts = {}
        total_tokens = 0
        total_collisions = 0

        for t in self.trajectories:
            state = t.get("final_state", "UNKNOWN")
            outcomes[state] = outcomes.get(state, 0) + 1
            total_tokens += t.get("tokens_consumed", 0)
            total_collisions += t.get("collisions_detected_count", 0)

            for p in t.get("participating_personas", []):
                persona_counts[p] = persona_counts.get(p, 0) + 1

        n = len(self.trajectories)
        return {
            "total_trajectories": n,
            "outcome_counts": outcomes,
            "average_tokens_consumed": (total_tokens / n) if n else 0,
            "total_collisions_resolved": total_collisions,
            "persona_participation": persona_counts,
            "unique_personas_count": len(persona_counts),
        }

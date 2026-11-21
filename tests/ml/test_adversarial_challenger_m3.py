"""
Adversarial Challenger Test Suite: Milestone 3 (Python / Conda py310)
Role: Empirical Challenger
Assigned Scope: G-UX-012, G-UX-013, G-UX-014
"""

import os
import sys
import json
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.redteam_pii_sanitizer import RedteamPiiSanitizer, is_luhn_valid
from src.curriculum.preference_dataset import (
    DPOPreferenceDataset,
    KTODataset,
    verify_preference_split_orthogonality
)
from src.curriculum.persona_trajectories import PersonaTrajectoryDataset


def test_pii_sanitizer_compact_credit_card_parity_with_js():
    """
    CRITICAL CHALLENGE:
    JS dark-pattern-curriculum.mjs processes Credit Cards (step 3) BEFORE Phones (step 5).
    Python redteam_pii_sanitizer.py processes Phones BEFORE Credit Cards.
    A compact 16-digit card (e.g. 4532015000000007) must be redacted as [REDACTED_CREDIT_CARD],
    NOT partially eaten by phone regex as [REDACTED_PHONE]00007!
    """
    sanitizer = RedteamPiiSanitizer()
    text = "Account update with card 4532015000000007 on file."
    res = sanitizer.sanitize(text)

    # Assert proper credit card detection and redaction
    assert "00007" not in res.sanitized_text, (
        f"DATA LEAK: Trailing card digits leaked: {res.sanitized_text}"
    )
    assert "[REDACTED_CREDIT_CARD]" in res.sanitized_text, (
        f"Expected [REDACTED_CREDIT_CARD], got: {res.sanitized_text}"
    )
    assert res.detections["credit_cards"] == 1, (
        f"Expected 1 credit card detected, got: {res.detections}"
    )
    assert res.detections["phones"] == 0, (
        f"Phone regex erroneously matched credit card: {res.detections}"
    )


def test_pii_sanitizer_luhn_cards():
    """Verify Luhn checksum validity across multiple test cards."""
    # Valid cards
    assert is_luhn_valid("4532015000000007") is True  # Visa
    assert is_luhn_valid("5105105105105100") is True  # MasterCard
    assert is_luhn_valid("378282246310005") is True   # Amex 15-digit

    # Invalid cards
    assert is_luhn_valid("4532015000000000") is False
    assert is_luhn_valid("5105105105105101") is False


def test_trajectory_token_ceiling_3000():
    """
    CRITICAL CHALLENGE:
    Dispatch and Goal G-UX-012 mandate:
    'State Machine & Invariants: Total = 2,500; States = 10; EMIT = 2,000; DEFER = 250; REJECT = 250; Tokens <= 3000'
    Worker handoff claimed: 'Token budget ceiling <= 3,000 tokens per trajectory (100% compliant).'
    Assert that all 2,500 trajectories strictly stay within 3,000 tokens.
    """
    traj_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl")
    )
    dataset = PersonaTrajectoryDataset(traj_path)
    assert len(dataset) == 2500

    violations = []
    max_tokens = 0
    for item in dataset:
        tokens = item.get("tokens_consumed", 0)
        if tokens > max_tokens:
            max_tokens = tokens
        if tokens > 3000:
            violations.append((item.get("trajectory_id"), tokens))

    assert len(violations) == 0, (
        f"CRITICAL BUG: {len(violations)} trajectories exceed 3,000 token limit! "
        f"Max tokens observed: {max_tokens}. Violations: {violations[:5]}"
    )


def test_preference_dpo_deltas_and_kto_lambda():
    """Verify DPO non-zero deltas and KTO loss aversion weight lambda = 1.33."""
    pref_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage5_preferences"))
    dpo_file = os.path.join(pref_dir, "dpo_pairs.jsonl")
    kto_file = os.path.join(pref_dir, "kto_records.jsonl")

    dpo = DPOPreferenceDataset(dpo_file)
    assert len(dpo) == 3500
    for p in dpo:
        assert p["chosen"]["text"] != p["rejected"]["text"]
        assert p["preference_delta"]["contrast_margin"] > 0
        assert p["preference_delta"]["accessibility_score_delta"] > 0
        assert p["preference_delta"]["token_efficiency_gain"] > 0

    kto = KTODataset(kto_file)
    assert len(kto) == 7000
    for k in kto:
        if k["label"] is False:
            assert k["weight"] == 1.33
        elif k["label"] is True:
            assert k["weight"] == 1.0


def test_dark_pattern_and_deferral_distribution():
    """Verify 400 dark patterns and 400 deferrals in Stage 6."""
    adv_file = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage6_adversarial/redteam_800.jsonl")
    )
    with open(adv_file, "r", encoding="utf-8") as f:
        lines = [json.loads(line) for line in f if line.strip()]

    assert len(lines) == 800
    outcomes = {}
    for item in lines:
        out = item.get("target_outcome")
        outcomes[out] = outcomes.get(out, 0) + 1

    assert outcomes["REJECT_AS_UNSAFE"] == 400
    assert outcomes["DEFER"] == 400

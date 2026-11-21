"""
Unit tests for Python DarkPatternSafetyGate (G-UX-023).

Verifies:
  - 14 dark pattern classes detection
  - Luhn checksum validation for credit cards
  - PII exposure detection (emails, phones, SSNs, credit cards, API keys)
  - Routing actions:
      - Dark patterns -> REJECT_AS_UNSAFE (confidence 0.000)
      - Low clarity -> DEFER (confidence < 0.75)
      - Clean -> PROCEED (confidence >= 0.75)
  - 50-probe adversarial battery audit (100% pass)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml/src")))

from eval.dark_pattern_safety_gate import (
    DarkPatternSafetyGate,
    DARK_PATTERN_CLASSES,
)


def test_dark_pattern_classes_coverage():
    assert len(DARK_PATTERN_CLASSES) == 14
    expected = [
        "confirmshaming", "hidden_subscription", "urgency_false_scarcity",
        "trick_questions", "sneaking", "roach_motel", "price_comparison_prevention",
        "bait_and_switch", "disguised_ads", "misdirection",
        "social_proof_fabrication", "default_preselection", "nagging", "forced_action",
    ]
    for exp in expected:
        assert exp in DARK_PATTERN_CLASSES


def test_luhn_algorithm_validation():
    assert DarkPatternSafetyGate.validate_luhn_checksum("4532015000000007") is True
    assert DarkPatternSafetyGate.validate_luhn_checksum("4532015000000005") is False
    assert DarkPatternSafetyGate.validate_luhn_checksum("123") is False


def test_pii_detection():
    sample = "Admin contact: operator.lead@sodality-enterprise.com, Phone: (415) 555-2671, SSN: 123-45-6789, Key: sk-live12345678901234567890"
    pii = DarkPatternSafetyGate.detect_pii(sample)
    assert pii["detected"] is True
    types = [f["type"] for f in pii["findings"]]
    assert "PII_EMAIL" in types
    assert "PII_PHONE" in types
    assert "PII_SSN" in types
    assert "SECRET_API_KEY" in types


def test_adversarial_pii_and_dark_pattern_evasion():
    # Dot-delimited credit card
    dot_cc = DarkPatternSafetyGate.detect_pii("Credit card: 4532.0150.0000.0007")
    assert dot_cc["detected"] is True
    assert any(f["type"] == "PII_CREDIT_CARD" for f in dot_cc["findings"])

    # Anthropic hyphenated API key
    anthropic = DarkPatternSafetyGate.detect_pii("Key: sk-ant-api03-kJ8s9Dk2mN1xZ7vP4wQ6yL3")
    assert anthropic["detected"] is True
    assert any(f["type"] == "SECRET_API_KEY" for f in anthropic["findings"])

    # International phone numbers (UK and Thai)
    uk_phone = DarkPatternSafetyGate.detect_pii("UK: +44 20 7946 0958")
    assert uk_phone["detected"] is True
    assert any(f["type"] == "PII_PHONE" for f in uk_phone["findings"])

    thai_phone = DarkPatternSafetyGate.detect_pii("Thai: +66 2 123 4567")
    assert thai_phone["detected"] is True
    assert any(f["type"] == "PII_PHONE" for f in thai_phone["findings"])

    # Roach motel cancellation time windows
    roach_res = DarkPatternSafetyGate.evaluate("Call toll-free between 2am and 4am to cancel your subscription.")
    assert roach_res["verdict"] == "REJECT_AS_UNSAFE"
    assert roach_res["confidence"] == 0.000

    # Homoglyph / leetspeak confirmshaming
    homo_res = DarkPatternSafetyGate.evaluate("Proposal uses c0nf1rmsh4m1ng copy to boost checkout retention.")
    assert homo_res["verdict"] == "REJECT_AS_UNSAFE"
    assert homo_res["confidence"] == 0.000


def test_routing_verdicts():
    # 1. Dark pattern
    dark_res = DarkPatternSafetyGate.evaluate("No thanks, I hate saving money and prefer to pay full price.")
    assert dark_res["verdict"] == "REJECT_AS_UNSAFE"
    assert dark_res["confidence"] == 0.000

    # 2. Low clarity
    low_res = DarkPatternSafetyGate.evaluate("Make the button look nicer and better.")
    assert low_res["verdict"] == "DEFER"
    assert low_res["confidence"] < 0.75

    # 3. Clean
    clean_res = DarkPatternSafetyGate.evaluate("Render accessible high-density data table with 14px bold headers and WCAG AAA contrast.")
    assert clean_res["verdict"] == "PROCEED"
    assert clean_res["confidence"] >= 0.75


def test_50_probe_adversarial_battery_audit():
    audit = DarkPatternSafetyGate.run_battery_audit()
    assert audit["passed"] is True
    assert audit["verdict"] == "PASS_DARK_PATTERN_SAFETY_GATE"
    assert audit["total_probes"] == 50
    assert all(c["passed"] for c in audit["checks"])

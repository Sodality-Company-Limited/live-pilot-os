"""
Unit tests for Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Sanitizer (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.redteam_pii_sanitizer import (
    RedteamPiiSanitizer,
    AdversarialCurriculumDataset,
    is_luhn_valid,
)

ADV_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../artifacts/curriculum/stage6_adversarial/redteam_800.jsonl")
)


def test_adversarial_curriculum_dataset_loading():
    ds = AdversarialCurriculumDataset(ADV_FILE)
    assert len(ds) == 800

    outcomes = ds.get_outcome_distribution()
    assert outcomes["REJECT_AS_UNSAFE"] == 400
    assert outcomes["DEFER"] == 400


def test_pii_sanitizer_secrets_and_cards():
    sanitizer = RedteamPiiSanitizer()

    # Valid Luhn card
    assert is_luhn_valid("4532015000000007") is True
    assert is_luhn_valid("4532015000000000") is False

    text = (
        "Email developer@soda.dev with key AKIAIOSFODNN7EXAMPLE and "
        "credit card 4532-0150-0000-0007, SSN 123-45-6789, OpenAI sk-abcdefghijklmnopqrstuvwxyz1234."
    )
    res = sanitizer.sanitize(text)

    assert "developer@soda.dev" not in res.sanitized_text
    assert "AKIAIOSFODNN7EXAMPLE" not in res.sanitized_text
    assert "4532-0150-0000-0007" not in res.sanitized_text
    assert "123-45-6789" not in res.sanitized_text
    assert "sk-abcdefghijklmnopqrstuvwxyz1234" not in res.sanitized_text

    assert "[REDACTED_EMAIL]" in res.sanitized_text
    assert "[REDACTED_AWS_KEY]" in res.sanitized_text
    assert "[REDACTED_CREDIT_CARD]" in res.sanitized_text
    assert "[REDACTED_SSN]" in res.sanitized_text
    assert "[REDACTED_OPENAI_KEY]" in res.sanitized_text

    assert res.detections["emails"] == 1
    assert res.detections["credit_cards"] == 1
    assert res.detections["ssn"] == 1
    assert res.detections["api_keys"] >= 2


def test_pii_sanitizer_recursive_object():
    sanitizer = RedteamPiiSanitizer()
    payload = {
        "user": {
            "email": "user@soda.dev",
            "metadata": ["Phone 555-123-4567", "Normal string"]
        }
    }
    scrubbed = sanitizer.sanitize_object(payload)
    assert scrubbed["user"]["email"] == "[REDACTED_EMAIL]"
    assert "[REDACTED_PHONE]" in scrubbed["user"]["metadata"][0]
    assert scrubbed["user"]["metadata"][1] == "Normal string"


def test_pii_sanitizer_compact_credit_card_and_pipeline_precedence():
    """Verify that credit card redaction executes before phone substitution to prevent data leaks."""
    sanitizer = RedteamPiiSanitizer()

    # 1. Compact unhyphenated 16-digit Visa card (Luhn valid)
    visa_text = "Transaction with card 4532015000000007 completed."
    res_visa = sanitizer.sanitize(visa_text)
    assert "00007" not in res_visa.sanitized_text, f"Data leak detected: {res_visa.sanitized_text}"
    assert "[REDACTED_CREDIT_CARD]" in res_visa.sanitized_text
    assert "[REDACTED_PHONE]" not in res_visa.sanitized_text
    assert res_visa.detections["credit_cards"] == 1
    assert res_visa.detections["phones"] == 0

    # 2. Compact 15-digit Amex card (Luhn valid)
    amex_text = "Corporate card 378282246310005 billed."
    res_amex = sanitizer.sanitize(amex_text)
    assert "[REDACTED_CREDIT_CARD]" in res_amex.sanitized_text
    assert res_amex.detections["credit_cards"] == 1
    assert res_amex.detections["phones"] == 0

    # 3. 16-digit MasterCard unhyphenated (Luhn valid)
    mc_text = "Card 5105105105105100 on file."
    res_mc = sanitizer.sanitize(mc_text)
    assert "[REDACTED_CREDIT_CARD]" in res_mc.sanitized_text
    assert res_mc.detections["credit_cards"] == 1
    assert res_mc.detections["phones"] == 0

    # 4. Mixed sentence containing both phone number and unhyphenated credit card
    mixed_text = "Call support at +1-555-123-4567 regarding card 4532015000000007."
    res_mixed = sanitizer.sanitize(mixed_text)
    assert res_mixed.sanitized_text == "Call support at [REDACTED_PHONE] regarding card [REDACTED_CREDIT_CARD]."
    assert res_mixed.detections["credit_cards"] == 1
    assert res_mixed.detections["phones"] == 1


def test_pii_sanitizer_non_string_input_safety():
    """Verify non-string inputs return empty sanitized text and empty detections fail-closed."""
    sanitizer = RedteamPiiSanitizer()

    # None input
    res_none = sanitizer.sanitize(None)  # type: ignore[arg-type]
    assert res_none.sanitized_text == ""
    assert res_none.detections == {}

    # Integer input
    res_int = sanitizer.sanitize(1234567890)  # type: ignore[arg-type]
    assert res_int.sanitized_text == ""
    assert res_int.detections == {}

    # List / Dict input
    res_list = sanitizer.sanitize(["4532015000000007"])  # type: ignore[arg-type]
    assert res_list.sanitized_text == ""
    assert res_list.detections == {}


"""
Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Sanitizer (Python).

1. Manages 800 red-team scenarios (400 deceptive patterns fail-closed to REJECT_AS_UNSAFE,
   400 under-specified doubt traps fail-closed to DEFER).
2. Regex-based PII sanitization pipeline (emails, phones, credit cards with Luhn check, SSN, API keys).
"""

from __future__ import annotations

import re
import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple


def is_luhn_valid(card_number: str) -> bool:
    """Validate credit card number using Luhn checksum algorithm."""
    digits = re.sub(r"\D", "", card_number)
    if len(digits) < 13 or len(digits) > 19:
        return False

    total = 0
    reverse_digits = digits[::-1]
    for i, char in enumerate(reverse_digits):
        d = int(char)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


@dataclass
class SanitizationResult:
    sanitized_text: str
    detections: Dict[str, int] = field(default_factory=dict)


class RedteamPiiSanitizer:
    """Production PII & Secrets sanitizer for curriculum datasets."""

    def __init__(self) -> None:
        self.re_aws = re.compile(r"\b(AKIA[0-9A-Z]{16})\b")
        self.re_github = re.compile(r"\b(gh[pousr]_[A-Za-z0-9_]{36,})\b")
        self.re_openai = re.compile(r"\b(sk-[A-Za-z0-9]{20,})\b")
        self.re_jwt = re.compile(r"\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b")
        self.re_email = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
        self.re_ssn = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
        self.re_phone = re.compile(r"(?:\+?[0-9]{1,3}?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}")
        self.re_card = re.compile(r"\b(?:\d[ -]*?){13,19}\b")

    def sanitize(self, text: str) -> SanitizationResult:
        if not isinstance(text, str):
            return SanitizationResult(sanitized_text="", detections={})

        detections = {
            "emails": 0,
            "phones": 0,
            "credit_cards": 0,
            "api_keys": 0,
            "ssn": 0,
        }

        # 1. API keys
        text, n_aws = self.re_aws.subn("[REDACTED_AWS_KEY]", text)
        text, n_gh = self.re_github.subn("[REDACTED_GITHUB_TOKEN]", text)
        text, n_oa = self.re_openai.subn("[REDACTED_OPENAI_KEY]", text)
        text, n_jwt = self.re_jwt.subn("[REDACTED_JWT]", text)
        detections["api_keys"] = n_aws + n_gh + n_oa + n_jwt

        # 2. Emails
        text, n_email = self.re_email.subn("[REDACTED_EMAIL]", text)
        detections["emails"] = n_email

        # 3. Credit Cards (Luhn check) - MUST EXECUTE BEFORE PHONE NUMBERS
        def replace_card(match: re.Match) -> str:
            raw = re.sub(r"\D", "", match.group(0))
            if len(raw) >= 13 and len(raw) <= 19 and is_luhn_valid(raw):
                detections["credit_cards"] += 1
                return "[REDACTED_CREDIT_CARD]"
            return match.group(0)

        text = self.re_card.sub(replace_card, text)

        # 4. SSN
        text, n_ssn = self.re_ssn.subn("[REDACTED_SSN]", text)
        detections["ssn"] = n_ssn

        # 5. Phone numbers
        text, n_phone = self.re_phone.subn("[REDACTED_PHONE]", text)
        detections["phones"] = n_phone

        return SanitizationResult(sanitized_text=text, detections=detections)

    def sanitize_object(self, obj: Any) -> Any:
        """Recursively scrub dicts/lists of PII."""
        if isinstance(obj, str):
            return self.sanitize(obj).sanitized_text
        elif isinstance(obj, dict):
            return {k: self.sanitize_object(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.sanitize_object(item) for item in obj]
        return obj


class AdversarialCurriculumDataset:
    """Dataset container for 800 red-team adversarial scenarios."""

    def __init__(self, jsonl_path: str) -> None:
        self.jsonl_path = jsonl_path
        self.scenarios: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.jsonl_path):
            raise FileNotFoundError(f"Adversarial dataset file not found: {self.jsonl_path}")
        with open(self.jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.scenarios.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.scenarios)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.scenarios[idx]

    def get_outcome_distribution(self) -> Dict[str, int]:
        dist = {}
        for s in self.scenarios:
            out = s.get("target_outcome", "UNKNOWN")
            dist[out] = dist.get(out, 0) + 1
        return dist

"""
Automated WCAG 2.2 AAA Contrast & Keyboard Safety Gate (G-UX-022).

Enforces:
  - Relative Luminance & Contrast Ratio calculation (W3C WCAG 2.2)
  - Level AAA Contrast: Normal text >= 7.0:1, Large text >= 4.5:1, UI components >= 3.0:1
  - Zero Keyboard Traps (Criterion 2.1.2)
  - Tabindex order verification (no positive tabindex anti-patterns)
  - 100% accessible name coverage for interactive elements
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple


NAMED_COLORS: Dict[str, Tuple[int, int, int]] = {
    "black": (0, 0, 0),
    "white": (255, 255, 255),
    "red": (255, 0, 0),
    "green": (0, 128, 0),
    "blue": (0, 0, 255),
    "yellow": (255, 255, 0),
    "cyan": (0, 255, 255),
    "magenta": (255, 0, 255),
    "gray": (128, 128, 128),
    "grey": (128, 128, 128),
    "slate900": (15, 23, 42),
    "slate800": (30, 41, 59),
    "slate50": (248, 250, 252),
    "indigo600": (79, 70, 229),
    "indigo500": (99, 102, 241),
    "emerald600": (5, 150, 105),
    "rose600": (225, 29, 72),
}


class WcagSafetyGate:
    """Evaluates WCAG 2.2 AAA accessibility compliance."""

    @staticmethod
    def parse_css_color(color_input: str | List[int | float] | Tuple[int | float, ...]) -> Tuple[int, int, int, float]:
        """Parses CSS color into RGBA (r, g, b, alpha)."""
        if isinstance(color_input, (list, tuple)):
            r = max(0, min(255, int(color_input[0])))
            g = max(0, min(255, int(color_input[1])))
            b = max(0, min(255, int(color_input[2])))
            a = float(color_input[3]) if len(color_input) > 3 else 1.0
            return r, g, b, round(a, 4)

        if not isinstance(color_input, str):
            raise TypeError(f"Invalid color input type: {type(color_input)}")

        s = color_input.strip().lower()
        if s in NAMED_COLORS:
            r, g, b = NAMED_COLORS[s]
            return r, g, b, 1.0

        if s.startswith("#"):
            hex_str = s[1:]
            if len(hex_str) == 3:
                r = int(hex_str[0] * 2, 16)
                g = int(hex_str[1] * 2, 16)
                b = int(hex_str[2] * 2, 16)
                return r, g, b, 1.0
            if len(hex_str) == 4:
                r = int(hex_str[0] * 2, 16)
                g = int(hex_str[1] * 2, 16)
                b = int(hex_str[2] * 2, 16)
                a = int(hex_str[3] * 2, 16) / 255.0
                return r, g, b, round(a, 4)
            if len(hex_str) == 6:
                r = int(hex_str[0:2], 16)
                g = int(hex_str[2:4], 16)
                b = int(hex_str[4:6], 16)
                return r, g, b, 1.0
            if len(hex_str) == 8:
                r = int(hex_str[0:2], 16)
                g = int(hex_str[2:4], 16)
                b = int(hex_str[4:6], 16)
                a = int(hex_str[6:8], 16) / 255.0
                return r, g, b, round(a, 4)
            raise ValueError(f"Invalid hex color length: {s}")

        rgb_match = re.match(r"^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$", s)
        if rgb_match:
            r = max(0, min(255, int(float(rgb_match.group(1)))))
            g = max(0, min(255, int(float(rgb_match.group(2)))))
            b = max(0, min(255, int(float(rgb_match.group(3)))))
            a = float(rgb_match.group(4)) if rgb_match.group(4) is not None else 1.0
            return r, g, b, round(a, 4)

        raise ValueError(f"Unrecognized CSS color format: {color_input}")

    @staticmethod
    def composite_rgba(fg: Tuple[int, int, int, float], bg: Tuple[int, int, int, float]) -> Tuple[int, int, int]:
        """Composites foreground alpha over background."""
        r1, g1, b1, a1 = fg
        r2, g2, b2, _ = bg
        if a1 >= 1.0:
            return r1, g1, b1
        r = int(round(a1 * r1 + (1.0 - a1) * r2))
        g = int(round(a1 * g1 + (1.0 - a1) * g2))
        b = int(round(a1 * b1 + (1.0 - a1) * b2))
        return r, g, b

    @staticmethod
    def compute_relative_luminance(rgb: Tuple[int, int, int]) -> float:
        """Computes relative luminance L in [0.0, 1.0] per W3C WCAG 2.2."""
        r, g, b = rgb

        def to_linear(c8: int) -> float:
            c = c8 / 255.0
            if c <= 0.04045:
                return c / 12.92
            return math.pow((c + 0.055) / 1.055, 2.4)

        rs = to_linear(r)
        gs = to_linear(g)
        bs = to_linear(b)
        l = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
        return round(l, 6)

    @classmethod
    def compute_contrast_ratio(cls, color1: Any, color2: Any) -> float:
        """Computes contrast ratio (L1 + 0.05) / (L2 + 0.05) in [1.0, 21.0]."""
        c1 = cls.parse_css_color(color1)
        c2 = cls.parse_css_color(color2)

        rgb1 = cls.composite_rgba(c1, c2) if c1[3] < 1.0 else (c1[0], c1[1], c1[2])
        rgb2 = cls.composite_rgba(c2, (255, 255, 255, 1.0)) if c2[3] < 1.0 else (c2[0], c2[1], c2[2])

        l1 = cls.compute_relative_luminance(rgb1)
        l2 = cls.compute_relative_luminance(rgb2)

        lighter = max(l1, l2)
        darker = min(l1, l2)

        ratio = (lighter + 0.05) / (darker + 0.05)
        return round(ratio, 4)

    @classmethod
    def check_contrast_wcag_aaa(cls, ratio: float, text_type: str = "normal_text") -> Dict[str, Any]:
        """Checks contrast against WCAG AAA thresholds."""
        threshold = 7.0
        if text_type == "large_text":
            threshold = 4.5
        elif text_type == "ui_component":
            threshold = 3.0

        return {
            "passed": ratio >= threshold,
            "threshold": threshold,
            "ratio": ratio,
        }

    @classmethod
    def validate_keyboard_focus_graph(
        cls,
        elements: List[Dict[str, Any]],
        transitions: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Validates zero keyboard traps, accessible names, and tabindex ordering."""
        if not elements:
            raise ValueError("Element list cannot be empty for keyboard audit")

        transitions = transitions or []
        violations = []
        focusable_count = 0

        for el in elements:
            t_index = int(el.get("tabIndex", 0))

            if t_index > 0:
                violations.append({
                    "type": "POSITIVE_TABINDEX_ANTIPATTERN",
                    "elementId": el.get("elementId", "unknown"),
                    "message": f"Element has positive tabindex={t_index}, disrupting natural DOM order.",
                })

            if t_index >= 0:
                focusable_count += 1

            # Accessible name verification
            has_name = bool(
                el.get("accessibleName")
                or el.get("ariaLabel")
                or el.get("ariaLabelledBy")
                or el.get("textContent")
            )
            if not has_name:
                violations.append({
                    "type": "MISSING_ACCESSIBLE_NAME",
                    "elementId": el.get("elementId", "unknown"),
                    "message": f"Interactive element <{el.get('tagName')}> has no accessible name.",
                })

            # ARIA role check
            role = el.get("role")
            if role:
                valid_roles = {
                    "button", "link", "checkbox", "radio", "dialog", "alertdialog",
                    "menu", "menuitem", "tab", "tabpanel", "search", "textbox",
                    "combobox", "listbox", "option", "status", "alert", "banner",
                    "grid", "table", "region", "navigation", "main",
                }
                if role not in valid_roles:
                    violations.append({
                        "type": "INVALID_ARIA_ROLE",
                        "elementId": el.get("elementId", "unknown"),
                        "message": f"Unknown ARIA role '{role}'.",
                    })

        # Modal escape route check
        modal_containers = [
            el for el in elements
            if el.get("isModal") or el.get("role") in ("dialog", "alertdialog")
        ]
        for modal in modal_containers:
            modal_id = modal.get("elementId", "")
            modal_els = [
                e for e in elements
                if e.get("containerId") == modal_id or e.get("containerId") == modal.get("containerId")
            ]
            has_close = any(
                (e.get("role") == "button" or e.get("tagName") == "button")
                and re.search(r"close|dismiss|cancel", str(e.get("accessibleName", "") or e.get("ariaLabel", "") or e.get("textContent", "")), re.IGNORECASE)
                for e in modal_els
            )
            has_escape = bool(modal.get("hasEscapeHandler"))
            if not has_escape and not has_close:
                violations.append({
                    "type": "KEYBOARD_TRAP_NO_ESCAPE",
                    "elementId": modal_id,
                    "message": f"Modal dialog {modal_id} lacks Escape handler or accessible Close button.",
                })

        # Transition graph cycle trap check
        graph_map: Dict[str, List[Dict[str, str]]] = {el["elementId"]: [] for el in elements if "elementId" in el}
        for t in transitions:
            if t.get("from") in graph_map:
                graph_map[t["from"]].append(t)

        # 1. Single-element self-loops
        for el in elements:
            el_id = el.get("elementId")
            if el_id and not el.get("isModal") and el_id in graph_map:
                edges = graph_map[el_id]
                if edges and all(e.get("to") == el_id for e in edges):
                    violations.append({
                        "type": "KEYBOARD_FOCUS_TRAP",
                        "elementId": el_id,
                        "message": f"Focus trapped in self-loop on element {el_id}.",
                    })

        # 2. Multi-element isolated cycle traps
        modal_ids = {el.get("elementId") for el in elements if el.get("isModal") or el.get("role") in ("dialog", "alertdialog")}
        focusable_non_modal = [
            el.get("elementId") for el in elements
            if el.get("elementId")
            and el.get("elementId") not in modal_ids
            and el.get("containerId") not in modal_ids
            and not el.get("isModal")
            and el.get("role") not in ("dialog", "alertdialog")
            and el.get("tabIndex", 0) >= 0
        ]
        focusable_set = set(focusable_non_modal)
        if len(transitions) > 0 and len(focusable_set) > 1:
            reported_traps = set()
            for u in focusable_set:
                if u not in graph_map or not graph_map[u]:
                    continue
                reachable = set([u])
                queue = [u]
                while queue:
                    curr = queue.pop(0)
                    for edge in graph_map.get(curr, []):
                        to_node = edge.get("to")
                        if to_node and to_node not in reachable:
                            reachable.add(to_node)
                            queue.append(to_node)
                if len(reachable) >= 2 and len(reachable) < len(focusable_set):
                    all_stay_inside = all(
                        len(graph_map.get(node, [])) > 0 and all(e.get("to") in reachable for e in graph_map.get(node, []))
                        for node in reachable
                    )
                    if all_stay_inside:
                        trap_key = ",".join(sorted(reachable))
                        if trap_key not in reported_traps:
                            reported_traps.add(trap_key)
                            violations.append({
                                "type": "KEYBOARD_FOCUS_TRAP",
                                "elementId": trap_key,
                                "message": f"Multi-element isolated keyboard focus trap detected: focus permanently trapped in cycle [{trap_key}] with no exit path to remaining focusable elements.",
                            })

        passed = len(violations) == 0
        return {
            "passed": passed,
            "verdict": "PASS_KEYBOARD_SAFETY" if passed else "FAIL_KEYBOARD_SAFETY",
            "total_elements": len(elements),
            "focusable_count": focusable_count,
            "violations_count": len(violations),
            "violations": violations,
        }

    @classmethod
    def evaluate_gate(cls, ui_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates full WCAG 2.2 AAA safety gate against UI specification."""
        contrast_pairs = ui_spec.get("contrastPairs", [])
        elements = ui_spec.get("elements", [])
        transitions = ui_spec.get("transitions", [])

        contrast_results = []
        contrast_violations = 0

        for pair in contrast_pairs:
            ratio = cls.compute_contrast_ratio(pair["fg"], pair["bg"])
            text_type = pair.get("type", "normal_text")
            check = cls.check_contrast_wcag_aaa(ratio, text_type)
            if not check["passed"]:
                contrast_violations += 1
            contrast_results.append({
                "id": pair.get("id"),
                "fg": pair["fg"],
                "bg": pair["bg"],
                "type": text_type,
                "ratio": ratio,
                "threshold": check["threshold"],
                "passed": check["passed"],
            })

        keyboard_report = cls.validate_keyboard_focus_graph(elements, transitions)

        checks = [
            {
                "gate": "WCAG_AAA_CONTRAST",
                "invariant": "100% of visual pairs meet WCAG 2.2 AAA ratios (7:1 normal, 4.5:1 large, 3:1 UI)",
                "observedViolations": contrast_violations,
                "totalPairs": len(contrast_pairs),
                "passed": contrast_violations == 0,
            },
            {
                "gate": "ZERO_KEYBOARD_TRAPS",
                "invariant": "Zero keyboard traps and 100% accessible escape paths (Criterion 2.1.2)",
                "observedViolations": keyboard_report["violations_count"],
                "passed": keyboard_report["passed"],
            },
            {
                "gate": "TABINDEX_INTEGRITY",
                "invariant": "Zero positive tabindex anti-patterns",
                "observedViolations": len([v for v in keyboard_report["violations"] if v["type"] == "POSITIVE_TABINDEX_ANTIPATTERN"]),
                "passed": len([v for v in keyboard_report["violations"] if v["type"] == "POSITIVE_TABINDEX_ANTIPATTERN"]) == 0,
            },
            {
                "gate": "ACCESSIBLE_NAMES_100_PERCENT",
                "invariant": "100% interactive elements possess valid accessible names",
                "observedViolations": len([v for v in keyboard_report["violations"] if v["type"] == "MISSING_ACCESSIBLE_NAME"]),
                "passed": len([v for v in keyboard_report["violations"] if v["type"] == "MISSING_ACCESSIBLE_NAME"]) == 0,
            },
        ]

        all_passed = all(c["passed"] for c in checks)
        return {
            "passed": all_passed,
            "verdict": "PASS_WCAG_AAA_SAFETY_GATE" if all_passed else "FAIL_WCAG_AAA_SAFETY_GATE",
            "contrast_pairs_count": len(contrast_pairs),
            "contrast_violations_count": contrast_violations,
            "contrast_results": contrast_results,
            "keyboard_report": keyboard_report,
            "checks": checks,
        }

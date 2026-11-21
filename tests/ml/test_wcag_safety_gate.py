"""
Unit tests for Python WcagSafetyGate (G-UX-022).

Verifies:
  - Relative luminance and contrast ratio calculations
  - WCAG 2.2 AAA thresholds (7:1 text, 4.5:1 large, 3:1 UI)
  - Color parsing and alpha compositing
  - Keyboard trap detection and accessible name enforcement
  - Positive tabindex anti-pattern detection
  - Full G-UX-022 safety gate (pass & fail-closed)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml/src")))

from eval.wcag_safety_gate import WcagSafetyGate


def test_color_parsing_and_compositing():
    assert WcagSafetyGate.parse_css_color("#fff") == (255, 255, 255, 1.0)
    assert WcagSafetyGate.parse_css_color("#0f172a") == (15, 23, 42, 1.0)
    assert WcagSafetyGate.parse_css_color("rgb(15, 23, 42)") == (15, 23, 42, 1.0)
    assert WcagSafetyGate.parse_css_color("rgba(255, 255, 255, 0.5)") == (255, 255, 255, 0.5)

    composite = WcagSafetyGate.composite_rgba((0, 0, 0, 0.5), (255, 255, 255, 1.0))
    assert composite == (128, 128, 128)


def test_relative_luminance_and_contrast_ratio():
    assert WcagSafetyGate.compute_relative_luminance((0, 0, 0)) == 0.0
    assert WcagSafetyGate.compute_relative_luminance((255, 255, 255)) == 1.0

    ratio = WcagSafetyGate.compute_contrast_ratio("#000000", "#ffffff")
    assert ratio == 21.0

    # Slate on white
    ratio_slate = WcagSafetyGate.compute_contrast_ratio("#0f172a", "#ffffff")
    assert ratio_slate >= 15.0
    check = WcagSafetyGate.check_contrast_wcag_aaa(ratio_slate, "normal_text")
    assert check["passed"] is True

    # Low contrast gray on white
    ratio_gray = WcagSafetyGate.compute_contrast_ratio("#94a3b8", "#ffffff")
    assert ratio_gray < 3.0
    check_gray = WcagSafetyGate.check_contrast_wcag_aaa(ratio_gray, "normal_text")
    assert check_gray["passed"] is False


def test_keyboard_focus_graph_violations():
    # Accessible elements
    elements_valid = [
        {"elementId": "btn-ok", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": "OK"},
        {"elementId": "link-home", "tagName": "a", "role": "link", "tabIndex": 0, "accessibleName": "Home"},
    ]
    report_valid = WcagSafetyGate.validate_keyboard_focus_graph(elements_valid)
    assert report_valid["passed"] is True
    assert report_valid["violations_count"] == 0

    # Missing accessible name
    elements_no_name = [
        {"elementId": "btn-anon", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": ""}
    ]
    report_no_name = WcagSafetyGate.validate_keyboard_focus_graph(elements_no_name)
    assert report_no_name["passed"] is False
    assert any(v["type"] == "MISSING_ACCESSIBLE_NAME" for v in report_no_name["violations"])

    # Positive tabindex
    elements_pos_tab = [
        {"elementId": "btn-jump", "tagName": "button", "tabIndex": 3, "accessibleName": "Jump"}
    ]
    report_pos_tab = WcagSafetyGate.validate_keyboard_focus_graph(elements_pos_tab)
    assert report_pos_tab["passed"] is False
    assert any(v["type"] == "POSITIVE_TABINDEX_ANTIPATTERN" for v in report_pos_tab["violations"])

    # Modal with no escape handler
    elements_trap_modal = [
        {"elementId": "modal-stuck", "tagName": "div", "role": "dialog", "isModal": True, "hasEscapeHandler": False}
    ]
    report_modal = WcagSafetyGate.validate_keyboard_focus_graph(elements_trap_modal)
    assert report_modal["passed"] is False
    assert any(v["type"] == "KEYBOARD_TRAP_NO_ESCAPE" for v in report_modal["violations"])

    # Multi-element cycle trap with unreachable elements
    elements_cycle = [
        {"elementId": "btn-A", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": "Button A"},
        {"elementId": "btn-B", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": "Button B"},
        {"elementId": "btn-C", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": "Button C"},
    ]
    transitions_cycle = [
        {"from": "btn-A", "to": "btn-B", "trigger": "tab"},
        {"from": "btn-B", "to": "btn-A", "trigger": "tab"},
    ]
    report_cycle = WcagSafetyGate.validate_keyboard_focus_graph(elements_cycle, transitions_cycle)
    assert report_cycle["passed"] is False
    assert any(v["type"] == "KEYBOARD_FOCUS_TRAP" for v in report_cycle["violations"])
    assert any(v["elementId"] == "btn-A,btn-B" for v in report_cycle["violations"])


def test_full_wcag_safety_gate_evaluation():
    compliant_spec = {
        "contrastPairs": [
            {"id": "c1", "fg": "#0f172a", "bg": "#ffffff", "type": "normal_text"},
            {"id": "c2", "fg": "#334155", "bg": "#ffffff", "type": "large_text"},
            {"id": "c3", "fg": "#ffffff", "bg": "#4f46e5", "type": "ui_component"},
        ],
        "elements": [
            {"elementId": "b1", "tagName": "button", "role": "button", "tabIndex": 0, "accessibleName": "Confirm"},
            {"elementId": "m1", "tagName": "div", "role": "dialog", "isModal": True, "hasEscapeHandler": True, "accessibleName": "Modal"},
        ],
    }

    result = WcagSafetyGate.evaluate_gate(compliant_spec)
    assert result["passed"] is True
    assert result["verdict"] == "PASS_WCAG_AAA_SAFETY_GATE"
    assert result["contrast_violations_count"] == 0

    failing_spec = {
        "contrastPairs": [
            {"id": "bad-c", "fg": "#cbd5e1", "bg": "#ffffff", "type": "normal_text"}
        ],
        "elements": [
            {"elementId": "b-fail", "tagName": "button", "tabIndex": 4, "accessibleName": ""}
        ],
    }

    fail_result = WcagSafetyGate.evaluate_gate(failing_spec)
    assert fail_result["passed"] is False
    assert fail_result["verdict"] == "FAIL_WCAG_AAA_SAFETY_GATE"
    assert fail_result["contrast_violations_count"] > 0

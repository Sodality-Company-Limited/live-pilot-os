"""
Unit tests for Stage 1 UI Taxonomy & Standard Labeling Specification (Python).
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.curriculum.taxonomy import (
    CANONICAL_UI_TAXONOMY,
    CATEGORIES,
    CANONICAL_ELEMENTS,
    INTERACTION_STATES,
    WCAG_TOUCH_TARGETS,
    validate_element_label,
    get_taxonomy_definition,
    list_taxonomy_classes,
    list_taxonomy_categories,
    get_classes_by_category,
)


def test_taxonomy_cardinality():
    assert len(list_taxonomy_classes()) == 32
    assert len(list_taxonomy_categories()) == 6
    assert len(INTERACTION_STATES) == 7
    assert len(get_classes_by_category("container")) == 8
    assert len(get_classes_by_category("control")) == 7
    assert len(get_classes_by_category("input")) == 6
    assert len(get_classes_by_category("display")) == 5
    assert len(get_classes_by_category("data_feedback")) == 3
    assert len(get_classes_by_category("navigation")) == 3


def test_taxonomy_element_validation():
    # Valid button
    valid, errors = validate_element_label({
        "component_type": "PrimaryButton",
        "category": "control",
        "interaction_state": "hover",
        "bbox": [100, 200, 120, 48],
        "aria": {"role": "button"}
    })
    assert valid is True
    assert len(errors) == 0

    # Unknown component
    valid_bad, errors_bad = validate_element_label({
        "component_type": "UnknownWidget",
        "category": "control"
    })
    assert valid_bad is False
    assert "Unknown component class" in errors_bad[0]

    # Category mismatch
    valid_cat, errors_cat = validate_element_label({
        "component_type": "PrimaryButton",
        "category": "container"
    })
    assert valid_cat is False
    assert "Category mismatch" in errors_cat[0]

    # Touch target below AAA
    valid_touch, errors_touch = validate_element_label({
        "component_type": "IconButton",
        "category": "control",
        "bbox": [0, 0, 20, 20]
    })
    assert valid_touch is False
    assert "Touch target size" in errors_touch[0]


def test_taxonomy_definitions():
    defn = get_taxonomy_definition("ModalDialog")
    assert defn is not None
    assert defn.category == "container"
    assert defn.is_interactive is True
    assert "dialog" in defn.allowed_aria_roles

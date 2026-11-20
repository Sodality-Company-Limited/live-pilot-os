"""
Stage 1 UI Taxonomy & Standard Labeling Specification.

32-class canonical UI component taxonomy across 6 functional categories,
7 interaction states, ARIA roles, WCAG 2.2 AAA touch targets, and validation logic.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Set, Tuple

# Categories
CATEGORIES: Dict[str, Dict[str, Any]] = {
    "container": {
        "name": "container",
        "description": "Structural framing and grouping elements that establish layout hierarchy and containment.",
        "element_count": 8,
        "classes": [
            "ScreenRoot",
            "ModalDialog",
            "CardContainer",
            "DrawerPanel",
            "SidebarNavigation",
            "HeaderBar",
            "FooterBar",
            "AccordionSection",
        ],
    },
    "control": {
        "name": "control",
        "description": "Direct interactive triggers, action buttons, and form selection controls.",
        "element_count": 7,
        "classes": [
            "PrimaryButton",
            "SecondaryButton",
            "IconButton",
            "CheckboxControl",
            "RadioGroupControl",
            "SwitchToggle",
            "SliderControl",
        ],
    },
    "input": {
        "name": "input",
        "description": "Data entry surfaces, text inputs, dropdown selectors, pickers, and upload zones.",
        "element_count": 6,
        "classes": [
            "TextInputField",
            "TextAreaField",
            "SelectDropdown",
            "DatePickerField",
            "SearchBarInput",
            "FileUploadZone",
        ],
    },
    "display": {
        "name": "display",
        "description": "Read-only visual content, typography, badges, avatars, and graphical icons.",
        "element_count": 5,
        "classes": [
            "HeadingTypography",
            "BodyTypography",
            "BadgePill",
            "AvatarImage",
            "IconGlyph",
        ],
    },
    "data_feedback": {
        "name": "data_feedback",
        "description": "Structured tabular data displays, metric aggregates, and asynchronous feedback banners.",
        "element_count": 3,
        "classes": [
            "TableViewGrid",
            "MetricStatCard",
            "AlertBannerToast",
        ],
    },
    "navigation": {
        "name": "navigation",
        "description": "Wayfinding trails, hierarchical page links, tab strips, and pagination controls.",
        "element_count": 3,
        "classes": [
            "BreadcrumbTrail",
            "TabBarStrip",
            "PaginationControl",
        ],
    },
}

CANONICAL_UI_TAXONOMY: Dict[str, str] = {
    # 1. Containers (8)
    "ScreenRoot": "container",
    "ModalDialog": "container",
    "CardContainer": "container",
    "DrawerPanel": "container",
    "SidebarNavigation": "container",
    "HeaderBar": "container",
    "FooterBar": "container",
    "AccordionSection": "container",
    # 2. Controls (7)
    "PrimaryButton": "control",
    "SecondaryButton": "control",
    "IconButton": "control",
    "CheckboxControl": "control",
    "RadioGroupControl": "control",
    "SwitchToggle": "control",
    "SliderControl": "control",
    # 3. Inputs (6)
    "TextInputField": "input",
    "TextAreaField": "input",
    "SelectDropdown": "input",
    "DatePickerField": "input",
    "SearchBarInput": "input",
    "FileUploadZone": "input",
    # 4. Display (5)
    "HeadingTypography": "display",
    "BodyTypography": "display",
    "BadgePill": "display",
    "AvatarImage": "display",
    "IconGlyph": "display",
    # 5. Data & Feedback (3)
    "TableViewGrid": "data_feedback",
    "MetricStatCard": "data_feedback",
    "AlertBannerToast": "data_feedback",
    # 6. Navigation (3)
    "BreadcrumbTrail": "navigation",
    "TabBarStrip": "navigation",
    "PaginationControl": "navigation",
}

INTERACTION_STATES: List[str] = [
    "default",
    "hover",
    "focus",
    "active",
    "disabled",
    "error",
    "loading",
]

WCAG_TOUCH_TARGETS = {
    "minimum_aaa_px": 44,
    "minimum_aa_px": 24,
}


@dataclass
class UIElementDefinition:
    class_name: str
    category: str
    description: str
    is_interactive: bool
    keyboard_focusable: bool
    allowed_states: List[str]
    allowed_aria_roles: List[str]
    wcag_touch_target_px: Dict[str, int]
    typical_parents: List[str]
    typical_children: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


CANONICAL_ELEMENTS: Dict[str, UIElementDefinition] = {
    # 1. Containers (8)
    "ScreenRoot": UIElementDefinition(
        class_name="ScreenRoot",
        category="container",
        description="Top-level viewport container encompassing the entire document surface.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["main", "region", "document", "application"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=[],
        typical_children=["HeaderBar", "FooterBar", "SidebarNavigation", "CardContainer", "ModalDialog", "DrawerPanel"],
    ),
    "ModalDialog": UIElementDefinition(
        class_name="ModalDialog",
        category="container",
        description="High-z-index interrupting overlay container trapping focus and requiring user action.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "loading"],
        allowed_aria_roles=["dialog", "alertdialog"],
        wcag_touch_target_px={"min_width": 200, "min_height": 150},
        typical_parents=["ScreenRoot"],
        typical_children=["HeadingTypography", "BodyTypography", "PrimaryButton", "SecondaryButton", "IconButton"],
    ),
    "CardContainer": UIElementDefinition(
        class_name="CardContainer",
        category="container",
        description="Bounded surface grouping related visual information, actions, and media.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default", "hover", "focus"],
        allowed_aria_roles=["region", "article", "group"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot", "ModalDialog", "DrawerPanel"],
        typical_children=["HeadingTypography", "BodyTypography", "MetricStatCard", "PrimaryButton", "AvatarImage"],
    ),
    "DrawerPanel": UIElementDefinition(
        class_name="DrawerPanel",
        category="container",
        description="Slide-in lateral overlay panel providing contextual actions, filtering, or secondary views.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "loading"],
        allowed_aria_roles=["complementary", "region", "dialog"],
        wcag_touch_target_px={"min_width": 240, "min_height": 200},
        typical_parents=["ScreenRoot"],
        typical_children=["HeadingTypography", "TextInputField", "PrimaryButton", "IconButton"],
    ),
    "SidebarNavigation": UIElementDefinition(
        class_name="SidebarNavigation",
        category="container",
        description="Persistent vertical navigation column establishing primary application wayfinding.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["navigation", "aside"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot"],
        typical_children=["IconGlyph", "BodyTypography", "BadgePill", "SecondaryButton"],
    ),
    "HeaderBar": UIElementDefinition(
        class_name="HeaderBar",
        category="container",
        description="Top persistent masthead bar hosting logo, global navigation, and user identity triggers.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["banner", "header"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot"],
        typical_children=["HeadingTypography", "SearchBarInput", "IconButton", "AvatarImage", "BreadcrumbTrail"],
    ),
    "FooterBar": UIElementDefinition(
        class_name="FooterBar",
        category="container",
        description="Bottom masthead surface containing legal links, copyright notices, and secondary navigation.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["contentinfo", "footer"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot"],
        typical_children=["BodyTypography", "BreadcrumbTrail"],
    ),
    "AccordionSection": UIElementDefinition(
        class_name="AccordionSection",
        category="container",
        description="Collapsible disclosure container revealing or hiding stacked content regions.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["region", "group"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["ScreenRoot", "CardContainer", "DrawerPanel"],
        typical_children=["HeadingTypography", "BodyTypography", "IconGlyph"],
    ),

    # 2. Controls (7)
    "PrimaryButton": UIElementDefinition(
        class_name="PrimaryButton",
        category="control",
        description="Prominent, high-emphasis action button triggering the primary workflow mutation.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "loading"],
        allowed_aria_roles=["button"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel", "HeaderBar"],
        typical_children=["IconGlyph", "BodyTypography"],
    ),
    "SecondaryButton": UIElementDefinition(
        class_name="SecondaryButton",
        category="control",
        description="Medium-emphasis alternative button for non-destructive, secondary or cancel actions.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "loading"],
        allowed_aria_roles=["button"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel"],
        typical_children=["IconGlyph", "BodyTypography"],
    ),
    "IconButton": UIElementDefinition(
        class_name="IconButton",
        category="control",
        description="Compact icon-only clickable trigger requiring explicit aria-label for accessibility.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["button"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["HeaderBar", "CardContainer", "ModalDialog", "TableViewGrid"],
        typical_children=["IconGlyph"],
    ),
    "CheckboxControl": UIElementDefinition(
        class_name="CheckboxControl",
        category="control",
        description="Dual or tri-state boolean selector allowing multiple choices within a set.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "error"],
        allowed_aria_roles=["checkbox"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "DrawerPanel", "TableViewGrid"],
        typical_children=["BodyTypography"],
    ),
    "RadioGroupControl": UIElementDefinition(
        class_name="RadioGroupControl",
        category="control",
        description="Mutually exclusive single-choice selector within a grouped list of options.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "error"],
        allowed_aria_roles=["radiogroup", "radio"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel"],
        typical_children=["BodyTypography"],
    ),
    "SwitchToggle": UIElementDefinition(
        class_name="SwitchToggle",
        category="control",
        description="Instant binary state toggle representing an immediate on/off configuration change.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["switch"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "DrawerPanel", "HeaderBar"],
        typical_children=[],
    ),
    "SliderControl": UIElementDefinition(
        class_name="SliderControl",
        category="control",
        description="Continuous or stepped range selector for adjusting quantitative values.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["slider"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["CardContainer", "DrawerPanel"],
        typical_children=[],
    ),

    # 3. Inputs (6)
    "TextInputField": UIElementDefinition(
        class_name="TextInputField",
        category="input",
        description="Single-line text entry field with associated label, placeholder, and validation states.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "disabled", "error"],
        allowed_aria_roles=["textbox"],
        wcag_touch_target_px={"min_width": 120, "min_height": 44},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel"],
        typical_children=["IconGlyph"],
    ),
    "TextAreaField": UIElementDefinition(
        class_name="TextAreaField",
        category="input",
        description="Multi-line expanded text entry field supporting scrolling and length constraints.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "disabled", "error"],
        allowed_aria_roles=["textbox"],
        wcag_touch_target_px={"min_width": 160, "min_height": 64},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel"],
        typical_children=[],
    ),
    "SelectDropdown": UIElementDefinition(
        class_name="SelectDropdown",
        category="input",
        description="Expandable option selection box displaying currently selected value and flyout list.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "error"],
        allowed_aria_roles=["combobox", "listbox"],
        wcag_touch_target_px={"min_width": 120, "min_height": 44},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel", "HeaderBar"],
        typical_children=["IconGlyph", "BodyTypography"],
    ),
    "DatePickerField": UIElementDefinition(
        class_name="DatePickerField",
        category="input",
        description="Temporal date/time selection surface with popover calendar grid traversal.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "disabled", "error"],
        allowed_aria_roles=["combobox", "dialog"],
        wcag_touch_target_px={"min_width": 140, "min_height": 44},
        typical_parents=["CardContainer", "DrawerPanel"],
        typical_children=["IconGlyph"],
    ),
    "SearchBarInput": UIElementDefinition(
        class_name="SearchBarInput",
        category="input",
        description="High-visibility query text field with instant clear and search execution triggers.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "disabled"],
        allowed_aria_roles=["searchbox"],
        wcag_touch_target_px={"min_width": 180, "min_height": 44},
        typical_parents=["HeaderBar", "ScreenRoot", "SidebarNavigation"],
        typical_children=["IconGlyph", "IconButton"],
    ),
    "FileUploadZone": UIElementDefinition(
        class_name="FileUploadZone",
        category="input",
        description="Drag-and-drop file target zone with browse button and progress indicator.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled", "error", "loading"],
        allowed_aria_roles=["region", "button"],
        wcag_touch_target_px={"min_width": 200, "min_height": 80},
        typical_parents=["CardContainer", "ModalDialog", "DrawerPanel"],
        typical_children=["IconGlyph", "BodyTypography", "PrimaryButton"],
    ),

    # 4. Display (5)
    "HeadingTypography": UIElementDefinition(
        class_name="HeadingTypography",
        category="display",
        description="Semantic hierarchical title element establishing content structure and section boundaries.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["heading"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot", "CardContainer", "ModalDialog", "HeaderBar", "DrawerPanel"],
        typical_children=[],
    ),
    "BodyTypography": UIElementDefinition(
        class_name="BodyTypography",
        category="display",
        description="Standard reading text, descriptions, captions, and paragraph prose.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["paragraph", "generic"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["ScreenRoot", "CardContainer", "ModalDialog", "FooterBar", "DrawerPanel"],
        typical_children=[],
    ),
    "BadgePill": UIElementDefinition(
        class_name="BadgePill",
        category="display",
        description="Compact visual token indicating status, numerical count, or categorical tag.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default", "hover"],
        allowed_aria_roles=["status", "generic"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["CardContainer", "HeaderBar", "SidebarNavigation", "TableViewGrid"],
        typical_children=["IconGlyph"],
    ),
    "AvatarImage": UIElementDefinition(
        class_name="AvatarImage",
        category="display",
        description="Circular or rounded user representation displaying portrait image or initial glyphs.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default", "hover", "focus"],
        allowed_aria_roles=["img"],
        wcag_touch_target_px={"min_width": 24, "min_height": 24},
        typical_parents=["HeaderBar", "CardContainer", "SidebarNavigation", "TableViewGrid"],
        typical_children=[],
    ),
    "IconGlyph": UIElementDefinition(
        class_name="IconGlyph",
        category="display",
        description="Vector symbol communicating meaning, visual metaphor, or action affordance.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default"],
        allowed_aria_roles=["img", "presentation", "none"],
        wcag_touch_target_px={"min_width": 0, "min_height": 0},
        typical_parents=["PrimaryButton", "SecondaryButton", "IconButton", "HeaderBar", "CardContainer", "BadgePill"],
        typical_children=[],
    ),

    # 5. Data & Feedback (3)
    "TableViewGrid": UIElementDefinition(
        class_name="TableViewGrid",
        category="data_feedback",
        description="Tabular dense data grid with column headers, sorting, row selection, and cells.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "loading", "error"],
        allowed_aria_roles=["table", "grid"],
        wcag_touch_target_px={"min_width": 300, "min_height": 120},
        typical_parents=["ScreenRoot", "CardContainer"],
        typical_children=["CheckboxControl", "IconButton", "BadgePill", "AvatarImage", "BodyTypography"],
    ),
    "MetricStatCard": UIElementDefinition(
        class_name="MetricStatCard",
        category="data_feedback",
        description="High-density telemetry KPI card featuring headline metric, trend delta, and sparkline.",
        is_interactive=False,
        keyboard_focusable=False,
        allowed_states=["default", "hover", "loading"],
        allowed_aria_roles=["region", "group"],
        wcag_touch_target_px={"min_width": 140, "min_height": 80},
        typical_parents=["ScreenRoot", "CardContainer"],
        typical_children=["HeadingTypography", "BodyTypography", "BadgePill", "IconGlyph"],
    ),
    "AlertBannerToast": UIElementDefinition(
        class_name="AlertBannerToast",
        category="data_feedback",
        description="Asynchronous system alert or floating toast announcing success, warning, or error message.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover"],
        allowed_aria_roles=["alert", "status"],
        wcag_touch_target_px={"min_width": 240, "min_height": 44},
        typical_parents=["ScreenRoot", "CardContainer"],
        typical_children=["IconGlyph", "BodyTypography", "IconButton"],
    ),

    # 6. Navigation (3)
    "BreadcrumbTrail": UIElementDefinition(
        class_name="BreadcrumbTrail",
        category="navigation",
        description="Hierarchical linear path of ancestor links showing current location within IA tree.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus"],
        allowed_aria_roles=["navigation"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["HeaderBar", "ScreenRoot", "CardContainer"],
        typical_children=["BodyTypography", "IconGlyph"],
    ),
    "TabBarStrip": UIElementDefinition(
        class_name="TabBarStrip",
        category="navigation",
        description="Horizontal or segmented row of tab controls switching active views in-place.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["tablist", "tab"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["ScreenRoot", "CardContainer", "HeaderBar"],
        typical_children=["IconGlyph", "BodyTypography", "BadgePill"],
    ),
    "PaginationControl": UIElementDefinition(
        class_name="PaginationControl",
        category="navigation",
        description="Page selector offering previous/next, numeric jump buttons, and page size dropdown.",
        is_interactive=True,
        keyboard_focusable=True,
        allowed_states=["default", "hover", "focus", "active", "disabled"],
        allowed_aria_roles=["navigation"],
        wcag_touch_target_px={"min_width": 44, "min_height": 44},
        typical_parents=["ScreenRoot", "CardContainer", "TableViewGrid"],
        typical_children=["IconButton", "SecondaryButton", "BodyTypography"],
    ),
}


def validate_element_label(element: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate element dict against UI taxonomy."""
    errors: List[str] = []
    if not isinstance(element, dict):
        return False, ["Element must be a dictionary"]

    class_name = element.get("component_type") or element.get("class_name")
    if not class_name:
        return False, ["Element is missing component_type / class_name"]

    if class_name not in CANONICAL_ELEMENTS:
        return False, [f"Unknown component class '{class_name}'. Must be one of 32 canonical classes."]

    defn = CANONICAL_ELEMENTS[class_name]

    if "category" in element and element["category"] != defn.category:
        errors.append(f"Category mismatch for '{class_name}': expected '{defn.category}', got '{element['category']}'")

    state = element.get("interaction_state")
    if state:
        if state not in INTERACTION_STATES:
            errors.append(f"Invalid interaction_state '{state}'")
        elif state not in defn.allowed_states:
            errors.append(f"State '{state}' not supported for class '{class_name}'. Allowed: {defn.allowed_states}")

    aria = element.get("aria")
    if isinstance(aria, dict) and "role" in aria:
        role = aria["role"]
        if role not in defn.allowed_aria_roles:
            errors.append(f"ARIA role '{role}' not permitted for class '{class_name}'. Allowed: {defn.allowed_aria_roles}")

    bbox = element.get("bbox")
    if defn.is_interactive and isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        _, _, w, h = bbox
        if w < defn.wcag_touch_target_px["min_width"] or h < defn.wcag_touch_target_px["min_height"]:
            errors.append(
                f"Touch target size [{w}x{h}px] is below minimum standard "
                f"[{defn.wcag_touch_target_px['min_width']}x{defn.wcag_touch_target_px['min_height']}px] for interactive '{class_name}'"
            )

    return len(errors) == 0, errors


def get_taxonomy_definition(class_name: str) -> Optional[UIElementDefinition]:
    return CANONICAL_ELEMENTS.get(class_name)


def list_taxonomy_classes() -> List[str]:
    return list(CANONICAL_ELEMENTS.keys())


def list_taxonomy_categories() -> List[str]:
    return list(CATEGORIES.keys())


def get_classes_by_category(category: str) -> List[str]:
    if category not in CATEGORIES:
        raise KeyError(f"Unknown category: {category}")
    return list(CATEGORIES[category]["classes"])

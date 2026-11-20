"""
Soda OS Curriculum & Curation Pipelines (Milestone 3).

Modules:
- taxonomy: Stage 1 UI Taxonomy & Standard Labeling Specification
- scene_graph_dataset: Stage 2 UI Scene Graph Pairs Dataset
- heuristics_benchmark: Stage 3 UX Heuristics & WCAG 2.2 AAA Benchmark
- persona_trajectories: Stage 4 12-Persona Multi-Agent Deliberation Trajectories
- preference_dataset: Stage 5 Contrastive Preference Dataset (DPO & KTO)
- redteam_pii_sanitizer: Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Sanitizer
"""

from .taxonomy import (
    CANONICAL_UI_TAXONOMY,
    CATEGORIES,
    CANONICAL_ELEMENTS,
    INTERACTION_STATES,
    UIElementDefinition,
    validate_element_label,
    get_taxonomy_definition,
    list_taxonomy_classes,
    list_taxonomy_categories,
    get_classes_by_category,
)

__all__ = [
    "CANONICAL_UI_TAXONOMY",
    "CATEGORIES",
    "CANONICAL_ELEMENTS",
    "INTERACTION_STATES",
    "UIElementDefinition",
    "validate_element_label",
    "get_taxonomy_definition",
    "list_taxonomy_classes",
    "list_taxonomy_categories",
    "get_classes_by_category",
]

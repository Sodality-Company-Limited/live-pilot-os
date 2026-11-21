---
name: soda-diagram-design
version: "1.0.0"
description: >-
  Create editorial, source-backed architecture and product diagrams as
  self-contained HTML and SVG using Diagram Design. Use for polished visual
  explanations, system maps, workflows, sequences, quadrants, timelines, and
  other diagrams that need readable layout and brand-aware styling. Triggers:
  diagram design, editorial diagram, polished diagram, HTML SVG diagram,
  architecture visual, system map, visual explainer.
---

# Soda OS Diagram Design

Use the installed Diagram Design skill at `~/.codex/skills/diagram-design/SKILL.md`
for its diagram-type guidance, source conventions, rendering workflow, and
quality rules. Read that skill before authoring an artifact; it is authoritative
for the upstream HTML/SVG format.

## Soda OS integration

- Keep generated artifacts inside the active goal’s declared touch map. If no
  goal-specific path is declared, use a dedicated `.diagram-design/<slug>/`
  directory and do not alter application code or product specifications.
- Ground repository diagrams in inspected Soda OS source and documentation. Do
  not invent services, dependencies, metrics, ownership, or process steps.
- Select the diagram form based on the reader’s question, then make hierarchy,
  relationships, direction, and labels explicit. Prefer a single self-contained
  HTML/SVG deliverable that can be opened without a build step.
- Preserve accessibility and legibility: meaningful labels, sufficient contrast,
  readable text at the intended viewport, and no decorative element that obscures
  relationships or evidence.
- Run the upstream skill’s validation/render checks before claiming delivery and
  report artifact paths and verification results separately from subjective visual
  review.

## Soda workflow

During PLAN, define the audience, question, diagram type, evidence scope, and
output path. During EXECUTE, author the diagram within the touch map. During
REVIEW, check source fidelity, layout readability, accessibility, and generated
HTML/SVG integrity. Pair with `soda-system-architecture` for architecture
decisions and with `soda-dave-visual-fidelity` when pixel-level regression
evidence is required.

Source: https://github.com/cathrynlavery/diagram-design

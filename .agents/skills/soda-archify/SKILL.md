---
name: soda-archify
version: "1.0.0"
description: >-
  Create source-backed, validated standalone HTML diagrams for Soda OS architecture,
  workflows, API sequences, data flows, lifecycles, ERDs, class models, trees,
  timelines, and waterfalls using the Archify skill. Use when a goal needs an
  explorable diagram or a one-page visual explainer. Triggers: archify, interactive
  diagram, architecture diagram, workflow diagram, sequence diagram, ERD, dataflow,
  lifecycle, timeline, waterfall, visual explainer.
---

# Soda OS Archify diagrams

Use the installed Archify skill at `~/.codex/skills/archify/SKILL.md` for diagram
authoring, schema selection, repository evidence, validation, browser checks, and
delivery. Read that skill before creating an artifact; it is the authoritative
source for Archify’s CLI and JSON contracts.

## Soda OS integration

- Keep generated artifacts in a dedicated `.archify/<type>-<slug>-<timestamp>/`
  directory unless the active goal specifies another allowed path.
- For repository-backed diagrams, cite the relevant Soda OS source files and
  preserve evidence links in the candidate; do not invent components, flows, or
  dependencies that are not supported by repository evidence.
- Prefer native Archify types over Mermaid when the user requests an explorable
  deliverable. Use Mermaid only as an input to translate into a fresh Archify
  candidate.
- Run Archify’s complete `finalize` command for the selected type before claiming
  delivery. Treat a non-zero exit as failure and repair within the active goal’s
  touch map.
- Do not modify product architecture documents, ADRs, or application code merely
  to create a diagram. Those changes require an active goal that explicitly
  includes them.

## Soda workflow

During PLAN, identify the diagram type, audience, source scope, and output path.
During EXECUTE, author and finalize the candidate. During REVIEW, report the
artifact path, evidence sources, finalize receipt, browser-check result, and any
optional perceptual review separately. Pair with `soda-system-architecture` when
the diagram changes or records an architectural decision.

Source: https://github.com/tt-a1i/archify

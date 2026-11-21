---
name: soda-intent-playbook-router
description: Deterministic task intent classifier, skill trigger matcher, and BDD scenario generator. Analyzes unstructured user prompts, scores matching registered agent skills with exact integer basis points, sorts candidates in monotonic non-ascending order, and emits executable BDD specifications.
version: 1.0.0
triggers:
  - intent playbook router
  - task intent router
  - prompt classifier
  - route intent
  - activate skill
touches:
  - scripts/lib/intent-playbook-router.mjs
  - tests/lib/intent-playbook-router.test.mjs
---

# Soda Intent Playbook Router

## Overview
Deterministic task intent classifier, skill trigger matcher, and BDD scenario generator. Analyzes unstructured user prompts, scores matching registered agent skills with exact integer basis points, sorts candidates in monotonic non-ascending order, and emits executable BDD specifications.

## Architecture & Interfaces
- `classifyTaskIntent`: Evaluates user prompts against registered skill triggers and computes integer confidence scores.
- `rankSkillCandidates`: Sorts matching candidate skills in strictly non-ascending confidence order.
- `generateBddSkeleton`: Emits executable Given-When-Then BDD scenario text for top-ranked skills.

## Verification
- Formal Invariants:
  - `INV-046-001`: Evaluating identical user prompts against identical skill catalogs yields bitwise identical ranked skill lists
  - `INV-046-002`: The returned candidate skill matches are sorted in strictly non-ascending order of confidence score in [0, 10000] basis points
- Unit Tests: `node --test tests/lib/intent-playbook-router.test.mjs`

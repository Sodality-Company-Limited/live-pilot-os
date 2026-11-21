---
name: soda-autonomous-diagnostician
description: Systematic error triage, falsifiable hypothesis matrix generation, and deterministic probe ranking for test and runtime failures.
version: 1.0.0
triggers:
  - autonomous diagnosis
  - failure triage
  - hypothesis matrix
  - error localization
  - probe evaluation
touches:
  - scripts/lib/autonomous-diagnostician.mjs
  - tests/lib/autonomous-diagnostician.test.mjs
---

# Autonomous Diagnostician Skill

## Overview
The `soda-autonomous-diagnostician` skill provides systematic, zero-guesswork triage and root cause isolation for test failures and unhandled runtime exceptions. It decomposes failures into:
1. **Failure Context Extraction:** Parses V8 stack traces, extracting primary failure frames, line numbers, and error classifications.
2. **Falsifiable Hypothesis Generation:** Formulates structured diagnostic hypotheses based on empirical error patterns (Assertion, Reference, Type, Syntax, Timeout).
3. **Deterministic Probe Evaluation:** Ranks diagnostic probes deterministically using confidence scoring and quantitative information gain without stochastic variation.

## Architecture & Interfaces
Exported from `scripts/lib/autonomous-diagnostician.mjs`:
- `parseFailureContext(rawErrorText)`: Extracts structured failure coordinates (`errorType`, `message`, `targetFile`, `targetLine`, `targetColumn`, `frames`).
- `generateHypothesisMatrix(failureContext)`: Produces falsifiable hypothesis candidates with executable test probes.
- `evaluateDiagnosticProbes(hypotheses, executionResults)`: Evaluates probe outcomes and computes ranked root cause attributions.

## Verification
- Formal Invariants:
  - `INV-041-001`: Deterministic Hypothesis Generation (Identical stack outputs yield identical hypothesis lists).
  - `INV-041-002`: Zero-Mock Falsifiable Probe Bounds (Every hypothesis contains a falsifiable test condition).
- Unit Tests: `tests/lib/autonomous-diagnostician.test.mjs`

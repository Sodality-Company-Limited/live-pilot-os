---
name: soda-empirical-eval-runner
description: Multi-trial benchmark harness, pass@k statistical evaluator, and integer latency accounting. Executes trial test cases, computes exact integer basis points without floating point numbers, records microsecond latency, and generates cryptographic evaluation proof receipts.
version: 1.0.0
triggers:
  - empirical eval runner
  - eval runner
  - multi trial benchmark
  - pass at k evaluation
  - integer basis point eval
touches:
  - scripts/lib/empirical-eval-runner.mjs
  - tests/lib/empirical-eval-runner.test.mjs
---

# Soda Empirical Eval Runner

## Overview
Multi-trial benchmark harness, pass@k statistical evaluator, and integer latency accounting. Executes trial test cases, computes exact integer basis points without floating point numbers, records microsecond latency, and generates cryptographic evaluation proof receipts.

## Architecture & Interfaces
- `computePassAtKBasisPoints`: Calculates exact integer pass rates in [0, 10000] basis points without floating-point arithmetic.
- `runEmpiricalEval`: Executes multi-trial test case suites recording pass rates and integer microsecond execution latency.
- `createEvalReceipt`: Formulates typed cryptographic evaluation receipts.

## Verification
- Formal Invariants:
  - `INV-045-001`: Evaluating identical test fixtures with identical random seeds produces bitwise identical pass counts, pass@k metrics, and failure traces
  - `INV-045-002`: All pass rates and evaluation scores are computed in exact integer basis points in [0, 10000] with zero floats
- Unit Tests: `node --test tests/lib/empirical-eval-runner.test.mjs`

# G-CORE-059 domain specification

Goal-specific authority for G-CORE-059.

## Binding invariant

Pure deterministic proposal validation; no I/O.

## Evidence
- Architecture: docs/03-architecture/overview.md
- Technical constraints: docs/03-architecture/technical-specifications-sot.md
- Quality: docs/03-architecture/software-quality-sot.md
- Testing: docs/03-architecture/testing-sot.md
- JEV boundary: docs/03-architecture/jev-agent-runtime-sot.md

## Verification
The goal's listed command is the minimum reproducible gate; failures block promotion.

## Worktree
Use branch feature/G-CORE-059. One executor, one goal, and only the goal touch map. Do not merge locally.

## Stop conditions
Stop on scope drift, missing SOT coverage, failed tests, security findings, unresolved provider/deployment approval, or any attempt to modify another service.


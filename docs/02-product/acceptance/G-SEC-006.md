# G-SEC-006 — Acceptance contract

> Status: planned; activate when the goal is promoted to ready.

## Goal
Identity/session service contracts

## Valid scenario
identity/session transport contracts with valid authorized context.

## Failure scenarios
- Missing or malformed context: stable fail-closed error and no unsafe mutation.
- Unauthorized or stale context: 401/403 as applicable with no scope disclosure.
- Replay or duplicate request: idempotent result and no duplicate side effect.
- Timeout or unknown dependency result: explicit unavailable/unknown state; never false success.

## Verification
- Automated: contract and handler integration tests
- SOT and contract checks pass.


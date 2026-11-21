# G-SEC-004 — Acceptance contract

> Status: planned; activate when the goal is promoted to ready.

## Goal
Server-managed session lifecycle

## Valid scenario
server-managed session lifecycle with valid authorized context.

## Failure scenarios
- Missing or malformed context: stable fail-closed error and no unsafe mutation.
- Unauthorized or stale context: 401/403 as applicable with no scope disclosure.
- Replay or duplicate request: idempotent result and no duplicate side effect.
- Timeout or unknown dependency result: explicit unavailable/unknown state; never false success.

## Verification
- Automated: session lifecycle tests
- SOT and contract checks pass.


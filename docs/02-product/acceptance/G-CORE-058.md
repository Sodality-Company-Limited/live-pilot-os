# G-CORE-058 — Acceptance contract

## Goal reference

- **Goal:** [G-CORE-058 — Telemetry service contract](../../07-backlog/goals/G-CORE-058.md)
- **Status:** ready
- **Assigned:** `developer`
- **Atomic Outcome:** Versioned executable Telemetry contracts.

## Scenario 1: SOT-owned versioned Telemetry contract

**Expected behavior:** The Telemetry contract is owned by `telemetry-service`, versioned, session-scoped, and bound to the canonical NATS schema and subject catalog.

| Field | Value |
|-------|-------|
| **Input** | Existing F01 Telemetry flow, NATS subject catalog, AsyncAPI artifact, and JSON Schema |
| **Output** | One owner, immutable schema revision/hash, producer/consumer references, lifecycle, and executable coverage evidence |
| **Preconditions** | Canonical API, flow, technical, quality, testing, and deployment SOTs are present |

### Edge cases

| Case | Input | Expected |
|------|-------|----------|
| Version compatibility | Supported Telemetry schema revision and shared NATS headers | AsyncAPI and schema references resolve without drift |
| Session isolation | Signal scoped to `live_session_id` | Contract preserves session ownership and correlation/causation metadata |
| Replay | Same provider event identity and payload fingerprint | Contract specifies deterministic, duplicate-safe handling |

### Failure cases

| Case | Input | Expected |
|------|-------|----------|
| Invalid schema | Missing or incompatible required fields/version | Rejected fail-closed; no false success |
| Retry/DLQ | Temporary transport or consumer failure | Bounded retry and explicit Telemetry DLQ semantics |
| Duplicate mismatch | Same identity with a different fingerprint | Explicit mismatch/error semantics; original fact is not overwritten |

## Scenario 2: Reproducible contract evidence

**Expected behavior:** The exact revision and commands proving architecture and API traceability are recorded for the Telemetry contract.

| Field | Value |
|-------|-------|
| **Input** | Repository revision plus the goal and API/SOT conformance commands |
| **Output** | Evidence receipt with revision, artifact hashes, commands, exit codes, and limitations |
| **Preconditions** | No runtime implementation, UI/BFF, persistence, or DigitalOcean deployment is introduced |

### Edge cases

| Case | Input | Expected |
|------|-------|----------|
| Missing standalone receipt | Contract exists without a goal-scoped evidence file | Evidence remains incomplete until the receipt is created |
| Unavailable external platform | Marketplace adapter is not available | Receipt is limited to contract/SOT evidence and makes no production claim |

### Failure cases

| Case | Input | Expected |
|------|-------|----------|
| SOT or API traceability failure | Any required harness exits non-zero | Goal remains unverified and cannot advance to review |

## Verification

- [ ] Automated: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-058`
- [ ] Automated: `node scripts/harness/architecture-design-conformance-harness.mjs G-CORE-058`
- [ ] Automated: `node scripts/architecture/check-sot.mjs`
- [ ] Automated: `node scripts/api/check-api-sot-traceability.mjs`
- [ ] Manual: Inspect exact revision, schema hash, owner, producer/consumer, lifecycle, retry/DLQ, duplicate, invalid-schema, and evidence receipt linkage.

## Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Codex CLI reviewer | | | approve / changes |

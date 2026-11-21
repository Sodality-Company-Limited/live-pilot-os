# G-CORE-065 Design Specification

## Intent & Architectural Rationale

Freeze one executable, versioned contract module for the Intent/Risk bounded
context so downstream domain, persistence, and handler goals consume stable
event shapes. The contract preserves session and tenant scope, lineage,
idempotency, policy/model revision, redacted evidence, mode labeling, and
explicit non-success outcomes. Pilot thresholds remain a reversible simulated
policy assumption and are not production calibration.

## Goals, Non-Goals & Anti-Goals

### Goals

- Define four versioned NATS event payload schemas.
- Register AsyncAPI messages, owner, producers, consumers, flow references,
  retry/DLQ/replay semantics, and executable verification.
- Reject unknown versions, missing evidence, unsafe raw text, and oversized
  payloads through real schema constraints.

### Non-goals

- Domain classification algorithms or score calibration.
- PostgreSQL persistence, runtime deployment, UI/BFF, or external marketplace
  mutation.

### Anti-goals

- Treating pilot policy defaults as production moderation accuracy.
- Publishing a trusted success for an unknown, deferred, unauthorized, or
  redaction-failed result.

## Approaches Considered & Rejected Alternatives

1. **One shared permissive envelope schema.** Rejected because it would allow
   event-specific outcomes and required fields to drift, making missing evidence
   or invalid event types easy to accept.
2. **Transport-only AsyncAPI definitions with no payload schemas.** Rejected
   because a subject catalog cannot enforce bounded evidence, redaction, version
   pins, or fail-closed field validation.
3. **One schema per event family with a discriminated union.** Selected only as
   a conceptual compatibility rule; standalone files are retained so each
   subject has an independently addressable and testable payload contract.

## Selected Approach & Trade-off Analysis

Use standalone JSON Schema Draft 2020-12 payloads referenced by AsyncAPI, with
closed objects, explicit enums/constants, bounded arrays and strings, redacted
evidence objects, and common lineage fields. This duplicates a small amount of
metadata across schemas, but makes compatibility, ownership, and negative
validation evidence local and reviewable. AsyncAPI carries the subject and
message wiring; flow coverage carries source authority and verification.

## Bounded Context & Touch Map Invariants

- Owner is `intent-risk-service`; no other service becomes a second writer.
- Only the declared API service contract, NATS schemas, AsyncAPI, flow coverage,
  and this goal design directory may change.
- No public browser route, domain algorithm, persistence migration, or runtime
  deployment is introduced.
- Every event preserves correlation, causation, session/tenant scope,
  idempotency, policy/model revision, evidence, mode, and explicit outcome.

## Acceptance Test & TDD Verification Strategy

Validate every schema as JSON and exercise positive/negative instances for the
required lineage, event/version constants, evidence/redaction, bounds, and
unsafe raw-text rejection. Run the repository SOT, API traceability, and
error-code registry checks at the exact revision. Treat any failed command,
unknown version, missing owner, uncovered flow, or unbounded payload as a
fail-closed stop. Evidence is empirical contract validation, not a claim of
provider availability or production moderation calibration.

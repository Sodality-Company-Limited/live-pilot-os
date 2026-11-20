# Soda OS Business-to-Production Enhancement Blueprint

> Context เพิ่มเติมสำหรับยกระดับ Soda OS ตาม [prompt-check-soda-os.md](../../prompt-check-soda-os.md)
>
> สถานะ: Proposed architecture and delivery context — ไม่ใช่ implementation authorization
>
> อ่านคู่กับ: [context gap analysis](soda-os-context-gap-analysis.md)

## Objective

เป้าหมายคือทำให้ Soda OS พิสูจน์สายงานเดียวได้:

```text
Business intent
→ Evidence
→ Requirements
→ Domain / Architecture
→ Atomic goals / governed agents
→ Verification / release certificate
→ Production operation
→ Business and engineering learning
```

การมีไฟล์, skill หรือ harness อย่างเดียวไม่ถือว่า capability พร้อม ต้องมีครบ:

1. canonical data contract
2. owner และ lifecycle
3. immutable link ไปยัง artifact ต้นทางและปลายทาง
4. executable validation
5. fail-closed gate เมื่อ evidence ไม่ครบ

## Scope and decision boundaries

Assumptions:

- Soda OS คือ platform ที่กำลังถูก enhance
- เป้าหมายแรกคือ canonical operating model ไม่ใช่สร้าง application domain ใหม่
- ต้อง backward-compatible กับ goal cards, skills และ proof receipts เดิมเท่าที่ทำได้
- production mutation ยังคงต้องมี authority ตาม governance/security rules

สิ่งที่ต้องให้มนุษย์ตัดสินใน Business Case/PDR ก่อน implementation ระยะลึก:

- customer segment และ commercial model
- data residency/compliance jurisdiction
- cloud/deployment topology
- autonomy boundary สำหรับ release, migration และ incident
- business KPI และ production SLO ที่เป็น commitment จริง

## Target bounded contexts

```text
Knowledge & Evidence
        │
Product & Requirements
        │
Architecture & Planning
        │
Execution & Assurance
        │
Release & Operations
        │
Learning & Economics
```

| Context | Owns | Does not own |
|---|---|---|
| Knowledge & Evidence | evidence, assumptions, conflicts, freshness | priority or release approval |
| Product & Requirements | business case, requirements, acceptance, scope | code details |
| Architecture & Planning | domain, C4, ADR, NFR, capability/goal graph | runtime telemetry |
| Execution & Assurance | bundles, agent sessions, receipts, scope proof | self-approval or release |
| Release & Operations | certificate, rollout, rollback, SLO, incidents | requirements rewriting |
| Learning & Economics | outcomes, cost, calibration, improvement proposals | silent policy mutation |

All cross-context links use immutable IDs and evidence references, not only markdown prose or paths.

---

# 1. Canonical model and Engineering Case File

## Outcome

สร้าง source of truth ที่เชื่อม business intent ไปถึง outcome โดยไม่ทำให้ goal card กลายเป็นฐานข้อมูลทุกอย่าง

## Required schemas

```text
business-case.schema.json
evidence.schema.json
requirement.schema.json
capability.schema.json
domain-model.schema.json
architecture-decision.schema.json
goal-graph.schema.json
agent-session.schema.json
loop-execution.schema.json
harness-result.schema.json
release-certificate.schema.json
learning-record.schema.json
engineering-case-file.schema.json
```

ทุก schema ใช้ shared envelope:

```yaml
schema_version: 1
id: BC-SODA-001
status: draft | active | superseded | archived
owner:
created_at:
updated_at:
source_refs: []
evidence_refs: []
parent_refs: []
child_refs: []
```

## Engineering Case File

หนึ่ง case file ต่อ product/system/release train:

```yaml
case_id: ECF-SODA-001
business_case: BC-SODA-001
requirements: [REQ-SODA-001]
capabilities: [CAP-SODA-001]
architecture_decisions: [ADR-001]
goals: [G-CORE-NNN]
verification_receipts: []
security_evidence: []
release_certificate: null
production_telemetry: []
learning_records: []
```

## Required transitions

| Transition | Required links |
|---|---|
| Requirement → approved | business case, evidence, acceptance criteria |
| Goal → ready | requirement, capability, touch map, verification plan |
| Goal → done | changed paths, receipt, independent review/gate |
| Release → approved | relevant goals, certificate, rollback plan |
| Learning → accepted | production observation, owner, proposed change |

## CLI and acceptance gate

```bash
soda-os case create ECF-SODA-001
soda-os case validate ECF-SODA-001
soda-os case trace ECF-SODA-001 --from business --to learning
soda-os case report ECF-SODA-001 --format markdown
```

`case validate` must fail on an orphan node, missing artifact, stale hash or terminal claim without evidence.

Do not add a database or event bus in this program. JSON contracts and one real enhancement case must prove the model first.

---

# 2. Business-to-architecture planning pipeline

## Outcome

Make planning executable and traceable from business intent through architecture and atomic delivery goals.

## Required flow

```text
Business Case
→ Evidence Map
→ Product Brief
→ Requirements Baseline
→ Domain Model
→ C4 / Ports / Data / API / NFR
→ ADR/PDR
→ Capability Map
→ Goal Dependency Graph
→ Execution Bundle
```

## Work to add

### Business and discovery

Create a filled, source-cited Business Case for Soda OS that records:

- customer segment and jobs-to-be-done
- value proposition and alternatives
- business/cost model
- market, strategic and regulatory risks
- measurable desired outcomes

Extend the existing knowledge map with real `E-*`, pain, assumption, risk and observation records. Current zero-percent business coverage is a blocker; it must not be bypassed.

### Requirement baseline

Each `REQ-*` must be atomic, testable and versioned:

```yaml
id: REQ-SODA-001
business_case_ref: BC-SODA-001
kind: functional | nfr | compliance | operational
statement:
rationale:
priority:
acceptance_criteria: []
risks: []
evidence_refs: []
verification_refs: []
status: draft | baselined | verified | superseded
```

A goal is not a substitute for a requirement.

### Architecture baseline

Create product-owned architecture artifacts:

- `docs/03-architecture/domain-model.md`
- `docs/03-architecture/c4-model.md`
- `docs/03-architecture/system-overview.md`
- ADRs with context, decision, consequences and compliance impact
- NFR matrix for latency, availability, retention, recovery, security and cost

Architecture decisions must point to the requirements they satisfy. Conformance validation must inspect the links, not only markdown headings.

### Capability and goal graph

Start with these capability IDs:

```text
CAP-KNOWLEDGE-001  Evidence and knowledge engine
CAP-REQ-001        Requirements baseline engine
CAP-TRACE-001      Engineering Case File and traceability
CAP-VERIFY-001     Production verification profile
CAP-OPS-001        Production operations evidence
CAP-LEARN-001      Outcome and learning engine
```

Each capability maps to requirements, ADRs, dependencies and atomic goals. The planner rejects dependency cycles and overlapping parallel write sets.

## CLI and acceptance gate

```bash
soda-os requirements validate REQ-SODA-001
soda-os architecture validate ECF-SODA-001
soda-os capability graph ECF-SODA-001
soda-os goal compile G-CORE-NNN --case ECF-SODA-001
```

No goal moves to `ready` unless every in-scope requirement has acceptance criteria, evidence and an architecture/capability parent.

Do not create every requested team role as a runtime agent before their required input/output artifacts exist. Do not invent business facts to fill C4 or ADR documents.

---

# 3. Governed execution and unified assurance

## Outcome

Turn existing agent/runtime/harness primitives into one deterministic, goal-scoped execution contract and verification API.

## Canonical agent execution contract

All worker sessions validate this contract:

```yaml
goal: G-CORE-NNN
case_ref: ECF-SODA-001
role: implementer
persona: core-implementer
allowed_files: []
allowed_tools: []
input_context_refs: []
output_schema: schemas/subagent-handoff.schema.json
verification_commands: []
token_budget:
  input_max:
  output_max:
time_budget_seconds:
risk_policy: defer | human_review
escalation_policy:
rollback_or_compensation:
```

This preserves persona, touch-map, token and duplicate-prompt controls while adding explicit tool, risk and rollback semantics.

## Explicit loop state machine

Persist a `LoopExecution` record for discovery, design, implementation, repair and review:

```yaml
loop_id: LOOP-G-CORE-NNN-IMPL-01
kind: implementation
max_iterations: 2
progress_metric:
duplicate_fingerprint:
timeout_at:
state: running | complete | blocked | needs_review
attempts: []
```

Invariants:

- no retry without new evidence
- no terminal success without a verification receipt
- failed verification stays failed in the same cycle
- a worker cannot approve its own implementation
- a side effect requires tested rollback or compensation before execution

## Unified verification contract

Expose this CLI surface:

```bash
soda-os verify G-CORE-NNN --profile development
soda-os verify G-CORE-NNN --profile production
```

`--help` prints usage only. Execution requires an explicit goal and never silently verifies a default goal.

Production output is machine-readable:

```yaml
status: passed | failed | blocked
goal_id:
case_id:
requirements:
architecture:
security:
tests:
integration:
e2e:
performance:
resilience:
observability:
release:
evidence:
blocked_reasons: []
```

## Seven harness layers

| Prompt layer | Required gate |
|---|---|
| Requirements | completeness, acceptance and orphan-link check |
| Architecture | C4/ADR/contract/dependency conformance |
| Code | lint, types, static analysis, unit/property tests |
| Integration | database, broker, API, migration and contract tests |
| E2E | deployed journey, accessibility and failure paths |
| Agent | persona/tool/scope/budget/decision-quality evidence |
| Production | load, chaos, recovery, observability, deployment and rollback |

An irrelevant layer may be `not_applicable` only with an explicit rationale and policy approval; it cannot silently disappear.

## Entry repair required before this program

- repair governance registry and archived H1 failures
- restore or redesign missing `template/` distribution parity
- repair the pre-done verification happy path
- make CI distinguish `passed`, `failed` and `blocked`; release profiles must not succeed by skipping
- isolate generated test artifacts outside tracked evidence paths

## Acceptance gate

A production profile rejects missing evidence, skipped mandatory gates, stale receipts, unknown profiles, self-approval and missing rollback plans.

---

# 4. Release, operations, economics and learning

## Outcome

Close the loop after implementation. A green test suite is not a release certificate, and a release certificate is not an operating model.

## Production Readiness Certificate

Create a versioned certificate linked to one case file and release candidate:

```yaml
certificate_id: PRC-SODA-001
case_ref: ECF-SODA-001
release_ref: REL-SODA-001
status: draft | blocked | certified | revoked
requirements_evidence: []
architecture_evidence: []
security_evidence: []
data_governance_evidence: []
api_compatibility_evidence: []
migration_rollback_evidence: []
observability_evidence: []
backup_recovery_evidence: []
performance_evidence: []
chaos_resilience_evidence: []
runbook_and_ownership_evidence: []
cost_limit_evidence: []
rollout_plan:
rollback_plan:
approvals: []
```

Certification fails when mandatory evidence is absent or stale.

## Release and deployment control

Define explicit stages:

```text
candidate → staging → controlled rollout → observe → promote | rollback
```

Every stage declares:

- accountable owner
- environment and immutable artifact/version
- entry/exit criteria
- health and business metrics
- time window and rollback trigger
- compensation or migration recovery procedure

Production deploy, destructive migration and identity/security boundary changes remain human-authorized under existing governance.

## Operations model

For every production-capable service/capability, define:

- service owner and on-call escalation
- SLO, error budget and alert thresholds
- dashboard/trace/log contract
- support workflow and customer-impact classification
- backup/restore and disaster-recovery test cadence
- incident command and post-incident learning record

## Economics and learning loop

Track separate measures rather than a single opaque score:

| Domain | Examples |
|---|---|
| Business outcome | adoption, retention, conversion, revenue, support burden |
| Delivery | lead time, escaped defects, rework, verification duration |
| Agent | calibrated confidence, deferral quality, scope compliance, token use |
| Infrastructure | cost, capacity, availability, recovery time |

Every `LearningRecord` cites a production observation and results in a proposed change, ADR, requirement update or new goal. It must not silently mutate baselines.

## CLI and acceptance gate

```bash
soda-os release certify REL-SODA-001 --case ECF-SODA-001
soda-os release verify REL-SODA-001 --environment staging
soda-os operate status CAP-OPS-001
soda-os learn record OBS-SODA-001 --case ECF-SODA-001
```

No release is `certified` without executable rollout/rollback procedures, required operational evidence and named ownership.

---

## Dependency graph

```text
1. Canonical model + Engineering Case File
       │
       ▼
2. Business-to-architecture planning pipeline
       │
       ▼
3. Governed execution + unified assurance
       │
       ▼
4. Release + operations + economics + learning
```

Programs execute in this order at the architecture boundary. Within one program, atomic goals may be parallel only when write touch maps are disjoint.

## First four atomic goals

1. **Canonical artifact envelope and ID/link validator**
   - Add shared envelope, `BusinessCase`, `Evidence` and `EngineeringCaseFile` schemas.
   - Gate: rejects orphan and unknown IDs.

2. **Soda OS Business Case and evidence baseline**
   - Fill business/product intent with source citations; resolve or record open decisions.
   - Gate: knowledge-map business, user, pain, scope and success coverage reaches an agreed ready threshold.

3. **Requirements/capability graph compiler**
   - Add requirement/capability schemas, graph validation and goal parent-link enforcement.
   - Gate: enhancement goal cannot be `ready` without complete upstream references.

4. **Explicit-target unified verification CLI**
   - Wire `soda-os verify`; remove default-goal behavior; return structured development-profile result.
   - Gate: help has no side effect; missing or unknown target exits non-zero; result fields are deterministic.

## Definition of success

Soda OS reaches the context target only when a real enhancement can be audited from cited business case through production observation with one command, and every missing, stale, failed or unauthorized link returns `blocked` or `failed` rather than synthetic success.

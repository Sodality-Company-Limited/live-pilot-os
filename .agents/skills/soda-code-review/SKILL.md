---
name: soda-code-review
version: "1.1.0"
description: >-
  Human and agent code review checklist before marking a goal done or merging.
  Use when reviewing a diff, PR, or before closing G-xxx, or when the user asks
  for code review.
---

# Code review checklist

Run after tests pass, before goal status → `approved` or merge. Set goal status → `review` during collaboration phase REVIEW.

Review through **six lenses** — not syntax only, enforcing the 28-Pillar Senior Engineering Gate.

## Lens 1: Scope & process

- [ ] **One goal** — diff matches a single G-xxx; no unrelated changes
- [ ] **Touch map** — only listed paths edited (+ goal/changelog/docs)
- [ ] **Project scope** — nothing from Out of scope without a goal
- [ ] **Acceptance criteria** — each item verifiably met
- [ ] **Acceptance contract** — scenarios in `docs/02-product/acceptance/G-xxx.md` pass (if present)
- [ ] **Spec drift** — diff matches Intent + How + Change delta; no invented extra behaviour
- [ ] **Goal status** — goal is `review`; advances to `approved` and `done` when automated verification gates pass (human approval not required)

## Lens 2: Security

- [ ] No secrets, tokens, or credentials in code or docs
- [ ] User input validated; auth checks where required
- [ ] PII handled per product brief / privacy constraints
- [ ] No auth/security boundary changes without linked ADR + human approval

## Lens 3: Maintainability

- [ ] Smallest correct diff; no drive-by refactors
- [ ] No dead code, debug prints, or commented-out blocks
- [ ] Naming matches project conventions
- [ ] Error handling at boundaries; no silent failures

## Lens 4: Architecture compliance

- [ ] Matches `docs/03-architecture/` and stack rules (`.agents/rules/{stack}.md`)
- [ ] API changes in `docs/03-architecture/api/` if applicable
- [ ] Domain rules in `docs/03-architecture/data/` if applicable
- [ ] ADR written or linked for architectural decisions

## Lens 5: Breaking changes & scope creep

- [ ] No undocumented breaking API or schema changes
- [ ] No major dependency upgrades outside goal **In**
- [ ] If scope grew → stop; Planner splits or new `draft` goal

## Lens 6: Senior Engineering Gate (28 Pillars across 7 Enterprise Domains)

Inspect diff against the mandatory 28-pillar requirements defined in [.agents/rules/code-review.md](../../../.agents/rules/code-review.md):

### Domain I: Algorithmic Correctness, Data Integrity & Formal Verification
- [ ] **Pillar 1: Business Logic & Zero-Mock Invariant:** 100% operational logic; zero `todo!()`, stubs, or mock fallbacks in core crates/services.
- [ ] **Pillar 2: Data Integrity & Minor-Unit Math:** Fixed-point or 64-bit integer minor units for monetary/temporal math; zero unchecked IEEE-754 floats.
- [ ] **Pillar 3: Database & Connection Pool Sizing:** Bounded pools ($N \le 50$), strict statement timeouts ($\le 5\text{s}$), explicit indices for WHERE/JOIN.
- [ ] **Pillar 4: Multi-Tenant Isolation & Formal Verification:** Default-deny tenant isolation with RLS/tenant filtering; passes 10-point Formal Verification Checklist (pre/post-conditions, loop invariants, state machine completeness).

### Domain II: Concurrency, Deadlock Prevention & Distributed State
- [ ] **Pillar 5: Async & Transactional Sagas:** Multi-stage mutations execute via state-tracked sagas with verified compensating undo transitions.
- [ ] **Pillar 6: Deadlock Prevention & Lock Ordering:** Strict global lock acquisition hierarchy; distributed locks enforce fencing tokens.
- [ ] **Pillar 7: Anti-Entropy & Distributed Consistency:** Read-Your-Own-Writes (RYOW) with monotonic version vectors; idempotent handlers.
- [ ] **Pillar 8: Chaos Resilience & Fallbacks:** Bounded circuit breakers (50% failure trip, 30s half-open trial, exponential backoff with full jitter).

### Domain III: Consensus, Flow Control & Partition Tolerance
- [ ] **Pillar 9: Distributed Consensus & Quorum Safety:** Raft/Paxos quorum $Q = \lfloor N/2 \rfloor + 1$; monotonic term check; linearizable reads via leader leases; split-brain stepdown.
- [ ] **Pillar 10: Backpressure & Adaptive Concurrency:** Flow control with Little's Law ($L = \lambda W$), gradient limiters, bounded CoDel queues; fail-fast HTTP 429/503.
- [ ] **Pillar 11: API Governance & Contract Drift:** OpenAPI 3.1 & JSON schema validation; backwards compatibility; semver increment.
- [ ] **Pillar 12: Observability & SRE Golden Signals:** Structured JSON logs with trace correlation IDs; Prometheus metrics for latency, traffic, errors, saturation.

### Domain IV: Migration Safety, Release Engineering & DevSecOps
- [ ] **Pillar 13: Zero-Downtime Migration Safety:** Expand-contract pattern; two-phase column drop; lock timeout $\le 2\text{s}$; concurrent index builds.
- [ ] **Pillar 14: Feature Flag Hygiene & Canary Killswitch:** Runtime feature flags with dynamic killswitch, 1%->5%->25%->100% rollout, and retirement plan.
- [ ] **Pillar 15: DevSecOps, SSRF Defense & KMS Encryption:** Strict SSRF egress IP validation; envelope encryption with envelope data keys (DEK); OWASP Top 10 defense.
- [ ] **Pillar 16: Supply Chain Integrity & Hermetic Builds:** Pinned exact dependency hashes; SLSA Level 3 provenance; automated CVE vulnerability scanning.

### Domain V: Cryptography, Memory Hygiene & Zero-Trust Defense
- [ ] **Pillar 17: Zero-Trust Service Mesh & SPIFFE/SPIRE mTLS:** Mutual TLS with SPIFFE IDs; ephemeral x509 certs; default-deny service-to-service authorization.
- [ ] **Pillar 18: Sensitive Memory Hygiene & Buffer Zeroization:** Secure wiping via `ZeroizeOnDrop` / `mlock` RAM pinning; core dumps disabled (`RLIMIT_CORE = 0`).
- [ ] **Pillar 19: Statutory Data Sovereignty & Geo-Fencing:** PII residency enforcement (GDPR Art 44, Thai PDPA, HIPAA); cross-border egress blocking.
- [ ] **Pillar 20: Tamper-Evident Audit Ledgers & Merkle DAGs:** Cryptographic append-only event ledgers linked via Merkle DAGs; RFC 3161 TSA timestamps.

### Domain VI: AI Agent Governance, LLM Firewalls & Autonomous Safety
- [ ] **Pillar 21: AI Agent Safety & Prompt Firewalls:** Dual-LLM prompt injection firewall; tool execution least-privilege scoping; loop recursion ceiling ($N \le 25$).
- [ ] **Pillar 22: Autonomous Tool Sandboxing & Wasmtime/cgroups:** Untrusted tool execution in WASM sandboxes (64MB RAM cap, fuel metering) or cgroups v2; POSIX signal containment.
- [ ] **Pillar 23: Multi-Party Quorum (4-Eyes Principle) & TSA:** High-risk actions require dual cryptographic authorization; time-locked escrow window.
- [ ] **Pillar 24: Testing Ground Truth & Verification Pass:** Zero mocks/stubs in test suite; 100% passing automated test harness (`node scripts/harness/senior-engineering-gate-harness.mjs`).

### Domain VII: SRE Sustainability, Multi-Region DR & Operational Longevity
- [ ] **Pillar 25: Resource Limits & Memory Soak Verification:** Deterministic CPU/memory bounds; zero memory leak slope ($< 1\text{MB}/\text{hr}$ over 24h soak).
- [ ] **Pillar 26: FinOps Cost Ceilings & Dynamic Quotas:** Hard per-tenant compute/token/storage quotas; rate limiting protects against bill shock.
- [ ] **Pillar 27: Multi-Region Active-Active DR & Chaos Drills:** Active-active replication with $RTO \le 30\text{s}$ and $RPO \le 5\text{s}$; automated partition recovery.
- [ ] **Pillar 28: Continuous WAL Archiving & Tested PITR Restores:** WAL streaming with continuous verify-restore drills proving point-in-time recovery.

Automated verification harness: `node scripts/harness/senior-engineering-gate-harness.mjs <diff-or-goal>`

## Tests

- [ ] Test plan from goal executed and green
- [ ] New non-trivial logic has behavioral tests ([soda-testing](../soda-testing/SKILL.md))

## Review decision (Automated Gate or Human Review)

| Outcome | Action |
|---------|--------|
| **Approve** | Set goal → `approved`; advance to `done`, close goal (`node ./cli.js goal close G-xxx`), and prepare PR |
| **Request changes** | Stay `in_progress` or `review`; fix and re-run checklist |
| **Scope creep** | Stop — Planner splits or new `draft` goal |
| **Blocked** | Set `blocked`; document in goal notes |

Under autonomous execution (`execute G-xxx` or swarming), the agent automatically proceeds to approve, archive, and prepare the PR when all 28 pillars and verification gates pass green. In manual review mode, report checklist results by lens. Never merge locally.

## Related

- [definition-of-done.md](../../../docs/06-workflows/definition-of-done.md)
- [governance.md](../../../.agents/rules/governance.md)
- [soda-goal-workflow](../soda-goal-workflow/SKILL.md)

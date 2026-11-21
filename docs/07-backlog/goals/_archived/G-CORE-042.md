---
goal_contract:
  id: G-CORE-042
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-live-stream-scrubber skill and streaming token buffer cleaner."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: low
    reasons: []
  reversibility:
    level: reversible
  mathematical_proven_governance:
    preset: standard_six_domains
    specification: docs/03-architecture/specs/formal-verification.md
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: .agents/specs/worktree-orchestration.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---

# G-CORE-042: Implement soda-live-stream-scrubber skill and streaming token buffer cleaner

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-live-stream-scrubber skill and streaming token buffer cleaner.  
**Epic:** CORE  
**Depends on:** G-CORE-041  
**Spec stability:** clarify done · spec check done · analyze n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement live stream scrubber driver and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-042-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-live-stream-scrubber` and `scripts/lib/live-stream-scrubber.mjs` to intercept and clean streaming LLM token chunks in real-time, removing conversational preambles and hedging filler before emitting to the terminal while preserving code blocks and technical payloads with exact byte conservation. Read [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md) before execution.

## Intent
**Why:** Real-time agent streaming often displays conversational filler before static post-hoc linters can run; live stream scrubbing guarantees maintainer-focused brevity from the very first streamed byte.  
**Done when:** The scrubber buffers initial stream chunks, detects and trims conversational preambles, and passes technical payloads through unchanged.  
**Unblocks:** `G-CORE-043` and zero-slop streaming telemetry across Soda OS.  

## In
- Implementation of `scripts/lib/live-stream-scrubber.mjs` and mirror `template/scripts/lib/live-stream-scrubber.mjs`.
- Implementation of agent skill `.agents/skills/soda-live-stream-scrubber/SKILL.md` and mirror `template/.agents/skills/soda-live-stream-scrubber/SKILL.md`.
- Comprehensive unit test suite `tests/lib/live-stream-scrubber.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for payload conservation and scrubbing idempotency.

## Out
- Modifying offline static documentation files.
- Intercepting encrypted TLS traffic at the network socket layer.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the live streaming token scrubber.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-042 | P1 | Missing real-time streaming token buffer scrubber for live agent CLI outputs | developer | Implement `live-stream-scrubber.mjs` with chunk buffer | `node --test tests/lib/live-stream-scrubber.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module providing `createStreamScrubber`, `processTokenChunk`, and `flushScrubberBuffer` with bounded character lookaheads and zero-allocation string slicing.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-042.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave8.md |

## Work steps

### Step 1 — Implement live stream scrubber driver and test suite
**Allowed files:** `scripts/lib/live-stream-scrubber.mjs`, `template/scripts/lib/live-stream-scrubber.mjs`, `.agents/skills/soda-live-stream-scrubber/SKILL.md`, `template/.agents/skills/soda-live-stream-scrubber/SKILL.md`, `tests/lib/live-stream-scrubber.test.mjs`  
**Actions:**
1. Implement `createStreamScrubber`, `processTokenChunk`, and `flushScrubberBuffer` in `scripts/lib/live-stream-scrubber.mjs`.
2. Support real-time chunk buffering and conversational pattern suppression.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-live-stream-scrubber/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/live-stream-scrubber.test.mjs`.
**Verification command:** `node --test tests/lib/live-stream-scrubber.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or payload byte corruption.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-live-stream-scrubber/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-live-stream-scrubber/SKILL.md` |
| core-lib | ADD | `scripts/lib/live-stream-scrubber.mjs` |
| core-lib-template | ADD | `template/scripts/lib/live-stream-scrubber.mjs` |
| unit-tests | ADD | `tests/lib/live-stream-scrubber.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `stream-transformer` |
| **Bounded Context & Domain** | Real-Time Telemetry & Token Stream Sanitization Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: Streaming Token Inbound Port, LLM Output Pipe <br> Driven Outbound Ports: Cleaned Token Stream Emitter, Console Output Pipe |
| **State Machine & Invariants** | FSM States: BufferingInitialTokens -> PreambleEvaluated -> ScrubbedTokensEmitted -> PassthroughStreaming -> Flushed |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261018_233500_antigravity_pstack_wave8_deep_context.md` |

## Contract impact
- **Schema modifications:** None; in-memory stream transformer.

## Failure Policy & Rollback Contract
```yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Stream buffering exception or memory overflow"
  command: "git checkout -- scripts/lib/live-stream-scrubber.mjs .agents/skills/soda-live-stream-scrubber/ tests/lib/live-stream-scrubber.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/live-stream-scrubber.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against stream poisoning and memory exhaustion via unbounded tokens"
  trust_boundary: "Tokens ingested as raw strings with bounded buffer size limit"
  tool_authorization: "Pure in-memory string transformation"
  sandbox_boundary: "Execution confined to Node.js memory heap"
  secret_handling: "Zero retention of token buffers after stream close"
  pii_handling: "Zero PII logging"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - streams_scrubbed_count
    - preambles_trimmed_count
    - bytes_scrubbed_total
  alerts:
    - "preambles_trimmed_count > 100"
  traces:
    - "framework.stream.scrub"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 1ms per token chunk processing"
  memory_budget: "8MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "streams_scrubbed_count, preambles_trimmed_count"
  review_schedule: "weekly"
  regression_threshold: "0 false trims on legitimate code blocks"
  feedback_mechanism: "Stream telemetry summary report"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-042-001
    claim: "Payload conservation invariant: technical markdown and code payload bytes are exactly preserved"
    type: "conservation"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/live-stream-scrubber.test.mjs"
  - id: INV-042-002
    claim: "Scrubbing is idempotent: scrubbing an already clean token stream yields an identical byte sequence"
    type: "idempotency"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/live-stream-scrubber.test.mjs"
```

## Spec checklist
> [`docs/03-architecture/specs/spec-checklist.md`](file:///docs/03-architecture/specs/spec-checklist.md)
- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] Worktree & Multi-Subagent Orchestration Plan declared (worktree paths, disjoint touch maps)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions; In / Out unambiguous
- [x] Acceptance criteria testable; Touch map real repo paths; Zero Mocks/Stubs (Article I)
- [x] Domain 1: Invariants & System Laws formalized
- [x] Domain 2: Formal Verification & Solvers specified
- [x] Domain 3: Harness Engineering & Modeling defined
- [x] Domain 4: Adversarial Modeling & Edge Pathologies defended
- [x] Domain 5: Concurrency, Race Conditions & Memory Models proven
- [x] Domain 6: Advanced Testing Paradigms & Tooling configured

## Acceptance criteria
- [x] Given a stream starting with conversational preamble ("Certainly! Here is..."), when scrubbed, then the preamble is stripped and the stream starts directly with the technical payload.
- [x] Given a clean technical stream containing code blocks, when scrubbed, then all code block characters are preserved 100% byte-for-byte.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/live-stream-scrubber.test.mjs`
### 1. Positive Tests
- Strips conversational preambles across multi-token boundaries.
### 2. Negative Tests
- Passes clean technical markdown without modifying a single character.
### 3. Fail-Closed & Chaos Tests
- Bounded buffer ceiling prevents memory exhaustion on unbounded preambles.
### 4. Temporal Causality Tests ($t \le T$)
- Emitted chunks follow strict FIFO stream ordering.
### 5. Security & Air-Gap Checks
- Sanitizes control characters and ANSI escape codes if requested.
### 6. Invariants & System Laws Verification
- Conservation and idempotency invariants verified.
### 7. Formal Verification & Solvers
- Discrete token state transition verification.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/live-stream-scrubber.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- 1-character token chunks, empty chunks, and split-regex boundary conditions.
### 10. Concurrency, Race Conditions & Memory Models
- Each stream scrubber maintains isolated session state.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-live-stream-scrubber/SKILL.md`
- `template/.agents/skills/soda-live-stream-scrubber/SKILL.md`
- `scripts/lib/live-stream-scrubber.mjs`
- `template/scripts/lib/live-stream-scrubber.mjs`
- `tests/lib/live-stream-scrubber.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-042/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-042/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-042/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-042/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-042/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-042/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-042/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-042/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-042/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-042/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)


## Closeout Notes

- **Closed Date:** 2026-10-18
- **Reason / Outcome:** Completed 100% implementation of live-stream-scrubber and tests green

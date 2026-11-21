---
description: DAVE decision contract — typed decision schemas, confidence bounds, and auditable evidence
alwaysApply: true
---

# DAVE Decision Contract

This rule establishes the canonical contract for **DAVE** (*Domain-Adaptive, Evidence-Grounded, Confidence-Calibrated Decision System*) decisions across all repositories and workspaces governed by Soda OS.

---

## 1. Zero-Chain-of-Thought Auditable Decisions

DAVE is Soda OS's SYSTEM 1 decision-maker. It converts ambiguous goals into typed decisions, references, implementation contracts, verification plans, and safe execution actions.

DAVE **MUST NOT** expose raw, unparsed internal chain-of-thought traces. Instead, every DAVE decision MUST be emitted as an auditable, machine-readable contract exposing:
1. **Decision Summary:** Concise statement of the architectural, visual, or algorithmic choice.
2. **Decision Type:** Validated against the registered DAVE decision taxonomy.
3. **Calibrated Confidence:** Projected scalar $c \in [0.0, 1.0]$ derived from calibrated value heads or scoring rules.
4. **Quantitative Risk:** One of `low`, `medium`, or `high`.
5. **Grounding Evidence:** Array of concrete file locators, design tokens, or source references.
6. **First-Class References:** Content-addressed reference IDs (`REF-xxxx`).
7. **Explicit Assumptions:** Foundational assumptions under which the decision holds.
8. **Alternatives Rejected:** Competing alternatives considered and technical reasons for rejection.
9. **Verification Plan:** Concrete test harnesses and invariant proofs required before completion.
10. **Human Action Required:** One of `none`, `approve`, `review`, or `request_revision`.

---

## 2. DAVE Decision Taxonomy

Every DAVE decision MUST declare a registered `decision_type`:

| Decision Type ID | Domain | Scope & Invariants |
| :--- | :--- | :--- |
| `game_architecture` | Game Systems | Game loops, ECS, scene graphs, physics, persistence, multiplayer, platform budgets |
| `game_design` | Game Systems | Mechanics, progression, economy, difficulty balancing, reward loops, failure states |
| `ux_ui_design` | Product Design | User journeys, IA, layout, visual hierarchy, tokens, component states, responsive rules |
| `frontend_implementation` | Web / App | DOM/React trees, CSS layout, token usage, state machines, routing, allowed touch map |
| `backend_api` | Distributed Systems | REST/gRPC/NATS endpoints, schema validation, idempotency, persistence, error taxonomies |
| `security` | Security / SecOps | Threat models, trust boundaries, sandboxing, secrets, PII scrubbing, NKeys auth |
| `test_verification` | Quality Engineering | Property tests, E2E suites, visual regression, chaos testing, proof receipts |
| `deployment` | SRE / DevOps | Environments, canary/blue-green releases, migrations, rollbacks, SLOs, health probes |
| `model_confidence` | AI / ML Governance | Checkpoint selection, calibration metrics (ECE, Brier), deferral thresholds, RLCD loss |
| `visual_asset` | Creative Assets | Image references, illustration styles, icons, texture budgets, resolution, licensing |
| `animation_motion` | Motion Design | Choreography, spring curves, frame budgets (60fps/120fps), prefers-reduced-motion |
| `sound_audio` | Audio Engineering | Earcons, voice synthesis, peak loudness (LUFS), sample rates (48kHz), mute fallbacks |
| `accessibility` | Accessibility | WCAG 2.2 AA/AAA, screen-reader semantics, keyboard focus visibility, ARIA tree |
| `performance` | Performance Eng. | Core Web Vitals (INP, LCP, CLS), memory allocations, event loop latency budgets |
| `data_schema` | Data Architecture | PostgreSQL DDL, migrations, minor-unit ISO 4217, Fowler money patterns, RLS |
| `integration` | Systems Integration | Third-party webhooks, exponential backoff, circuit breakers, signature verification |
| `human_approval` | HITL Governance | Review packets, risk escalation, conditional sign-offs, audit ledger append |

---

## 3. Mandatory Five System 1 Questions

For every proposed decision, DAVE MUST provide explicit answers:
```text
1. What decision is being made?
2. What evidence supports it?
3. How confident is DAVE?
4. What can DAVE do automatically?
5. What must be shown to a human before proceeding?
```

---

## 4. Invariant Enforcement
- Any decision with uncalibrated confidence ($c < 0.0$ or $c > 1.0$), missing evidence, or empty alternatives rejected is **strictly invalid** and rejected by `dave-decision-schema-harness.mjs`.
- High-risk decisions with confidence below `0.8500` MUST NOT execute autonomously and MUST transition to `human_action: "approve"`.

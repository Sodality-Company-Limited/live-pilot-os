---
description: Requirement alignment for ambiguous features and complex architectural changes
---

# Autonomous Self-Socratic Interrogation & Zero-HITL Dialectic Alignment Protocol

This document defines the mandatory protocol for extracting, deconstructing, and resolving exact architectural requirements via **Autonomous AI-to-AI Self-Socratic Dialectic Interrogation (Zero-HITL Blocking)** before formulating BDD specifications.

---

## 1. Autonomous Self-Socratic Interrogation Principle (Zero-HITL Blocking)

Use this protocol only for a new feature, complex architectural change, or broad prompt
with unresolved product or architecture decisions. Do not use it for a scoped bug fix,
compiler error, documentation edit, or test repair.
1. **Never Guess Requirements in Isolation:** The Agent MUST NOT invent ungrounded requirements or produce generic boilerplate.
2. **Bounded analysis:** Prefer one concise analysis pass. Spawn additional personas only
   when the decision is high-risk and the goal explicitly allows it; never create an
   open-ended debate or continuation loop.
3. **AI-to-AI Self-Socratic Dialectic:** When justified, Antigravity may coordinate:
   - **System Architect:** Structures domain models, hexagonal ports, schemas, and typestates.
   - **Concurrency & Performance Engineer:** Establishes lock hierarchies, queuing bounds, backpressure limits, and quantitative latency budgets (SLAs).
   - **Formal Verification & Security Critic:** Enforces Hoare triples, invariant conservation laws, fail-closed boundaries, and cryptographic verification tooling (Kani, SMT/Z3, CrossHair, Miri, Proptest).
   - **QA & Adversary:** Synthesizes negative scenarios, boundary failure conditions, and chaos mutation vectors.
4. **Autonomous Resolution to Recommended Invariants:** The bounded analysis evaluates
   trade-offs and records a recommendation.
5. **Concise handoff:** Persist alignment artifacts only when the goal requires them. Do
   not create clarification files or raw reports for routine fixes.

---

## 2. Core Dialectic Dimensions

The autonomous self-interrogation MUST comprehensively resolve the 4 core dimensions:

- **A. Business Intent & Value:** Target actor, operational outcome, and measurable success metrics.
- **B. Edge Cases & Boundary Conditions:** Zero balance, rate limit exhaustion, network partitions, or malformed inputs.
- **C. Performance & Latency Budgets:** Hard quantitative response time limits (voice latency < 100ms, query latency < 15ms) and resource ceilings.
- **D. Security & Multi-Tenancy Rules:** PostgreSQL Row-Level Security (RLS), PII vaulting, mTLS workload identities, and zero-trust boundaries.

---

## 3. Output to BDD & Autonomous TDD Execution

The autonomously resolved invariants MUST immediately feed into `.agents/rules/bdd-specification.md` as concrete `Given-When-Then` feature scenarios and drive Red-Green-Refactor TDD execution without manual human gating.

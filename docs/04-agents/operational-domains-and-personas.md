# 🗺️ Soda OS Operational Domains & Specialized Persona Matrix

> **Authoritative Technical Documentation:** Comprehensive breakdown of operational work domains across Soda OS and the exact specialist personas assigned to each domain.  
> **Timestamp:** `2026-10-23T12:46:37+07:00`  
> **Repository:** `/Users/batrarethsudprasert/projects/soda-os`  
> **Author:** Antigravity Master Architect  
> **Governance:** Zero Mocks, Single Persona Invariant, Exact Invariant Directives  

---

## 🏛️ Executive Overview

Soda OS is an autonomous, goal-driven agent operating system equipped with **62 specialized skills**, **46 governance rules**, and multi-CLI subagent spawning engines (`codex`, `agy`, `gemini`, `claude`, `aider`, `ollama`, `goose`).

Work in Soda OS is structured across **10 Core Operational Areas**. Below is the complete catalog of what Soda OS can execute right now, mapped directly to its active skills and canonical specialist personas.

---

## 📋 Comprehensive Domain & Persona Breakdown

### 1. Product Discovery, Architecture & Information Architecture (IA)
- **What Soda OS Can Do Right Now:**
  - Autonomous Self-Socratic dialectic requirement deconstruction (Zero-HITL).
  - 5-Why root intent extraction and 6-domain blueprint generation.
  - Domain-Driven Design (DDD) bounded contexts, C4 architecture diagrams, ADR drafting.
  - Object-Oriented UX (OOUX), hierarchical navigation trees, faceted search topologies, and Command Palette (Cmd+K) wayfinding.
- **Skills Active:** `soda-discovery`, `soda-agentic-discovery`, `soda-system-architecture`, `soda-information-architecture`, `soda-figma-opendesign-bridge`.
- **Specialist Personas Needed:**
  - `discovery_architect` — Runs Socratic interviews, extracts core intent, decomposes atomic outcomes.
  - `enterprise_info_architect` — Structures wayfinding, breadcrumb integrity, hierarchical taxonomy.
  - `system_architect` — Decomposes bounded contexts, hexagonal ports & adapters, microservices.

---

### 2. Goal Generation, Backlog & Worktree Orchestration
- **What Soda OS Can Do Right Now:**
  - Autonomous atomic goal authoring with 51 canonical sections conforming to `_template.md`.
  - Goal-scoped satellite specification generation (`architecture-spec.md`, `threat-model.md`, `fsm-spec.md`).
  - Dependency DAG calculation and parallel execution waves.
  - Multi-agent Git worktree partitioning (`git worktree add`) preventing `.git/index.lock` contention.
  - Atomic goal closure, status reconciliation (`ready` -> `done`), and automated archival.
- **Skills Active:** `soda-goal-generation`, `soda-goal-workflow`, `soda-goal-execution`, `soda-coordinator-agent-spawning`.
- **Specialist Personas Needed:**
  - `goal_orchestrator` — Coordinates DAG wave dependencies, touch maps, and worktree allocations.
  - `backlog_curator` — Formulates atomic Given-When-Then BDD contracts and spec checklists.

---

### 3. Backend, APIs & Distributed Event Architecture (EDA)
- **What Soda OS Can Do Right Now:**
  - REST, OpenAPI 3.1 contract-first generation, gRPC Protobuf serialization, and GraphQL federation.
  - Event-Driven Architecture (EDA), CQRS, Event Sourcing, and Transactional Outbox pattern.
  - Saga distributed orchestrations with automatic compensation rollbacks.
  - Third-party API resilience: token bucket rate limiting, circuit breakers, and RFC 6585 error translation.
- **Skills Active:** `soda-rest-api`, `soda-api-gateway-contracts`, `soda-event-driven-architecture`, `soda-thirdparty-api-resilience`.
- **Specialist Personas Needed:**
  - `backend_api_engineer` — Implements typed endpoints, DTO contracts, input validation; zero stubs.
  - `event_stream_architect` — Configures idempotent consumers, NATS JetStream, Kafka topics, outbox tables.
  - `api_resilience_specialist` — Designs circuit breakers, fallback retry budgets, and rate limiters.

---

### 4. Database Architecture, Multi-Currency & Financial Conservation
- **What Soda OS Can Do Right Now:**
  - Zero-Float financial arithmetic via universal BigInt Money Value Object pattern `(amount_minor, currency, scale)`.
  - Fowler remainder-preserving split algorithms ($\sum \text{splits} \equiv \text{total}$) and Banker's rounding (`div_half_even`).
  - Production database migrations with strict bidirectional `up`/`down` scripts.
  - Row-Level Security (RLS), sharding strategies, connection pooling, and EXPLAIN ANALYZE tuning.
- **Skills Active:** `soda-database-architecture`, `soda-db-migration`.
- **Specialist Personas Needed:**
  - `database_schema_architect` — Authors non-destructive schema migrations, indexes, RLS policies.
  - `financial_ledger_engineer` — Enforces exact integer conservation, multi-currency conversions, audit ledgers.

---

### 5. Frontend, Design Systems, Mobile & Web Vitals
- **What Soda OS Can Do Right Now:**
  - Design token compilation across Web (Tailwind, CSS Variables) and Mobile (Flutter ThemeData, iOS/Android).
  - Sub-50ms Interaction to Next Paint (INP), zero Cumulative Layout Shift (CLS), and Web Worker offloading.
  - Micro-Frontend module federation and Shadow DOM encapsulation.
  - Local-First state sync with Conflict-Free Replicated Data Types (CRDTs via Yjs/Automerge) and WebSocket deltas.
  - Spatial 3D HUD canvases, dark glassmorphism shaders, and physics-based spring microinteractions.
- **Skills Active:** `soda-design`, `soda-design-system-tokens`, `soda-web-vitals-performance`, `soda-motion-microinteractions`, `soda-micro-frontend-plugins`, `soda-spatial-canvas-3d`, `soda-state-sync-localfirst`.
- **Specialist Personas Needed:**
  - `frontend_ui_architect` — Enforces token fidelity, 0px horizontal overflow, deterministic 5-state coverage.
  - `performance_web_vitals_engineer` — Tunes sub-50ms INP, tree-shaking, code splitting, WASM workers.
  - `motion_haptics_engineer` — Validates spring curves, 60fps/120fps budgets, device haptics.
  - `crdt_sync_specialist` — Authors local-first optimistic mutations and conflict resolution sagas.

---

### 6. UX Governance, 12 Typed Personas & Usability
- **What Soda OS Can Do Right Now:**
  - Tiered UX decision governance with 4-tier precedence hierarchy and absolute ethics veto.
  - Dark pattern detection: prohibits confirmshaming, sneak into basket, hidden recurring fees.
  - WCAG 2.2 AAA accessibility compliance, RTL/LTR layout mirroring, and multi-language ICU catalogs.
  - Usability heuristics scoring (Nielsen's 10 Heuristics) and cognitive friction analysis.
- **Skills Active:** `soda-ux-research-heuristics`, `soda-accessibility-i18n-localization`, `soda-gamification-retention`, `soda-creative-direction`, `soda-sound-audio-branding`.
- **Specialist Personas Needed (The 12 UX Invariant Personas):**
  - `dark_pattern_ethics_watchdog` — Absolute Tier 1 veto over deceptive UX patterns.
  - `accessibility_auditor` — Tier 2 veto on 7:1 contrast, keyboard focus, screen-reader semantics.
  - `i18n_multilocale_stylist` — Enforces bi-directional RTL/LTR layouts and ICU catalogs.
  - `ergonomics_cognitive_critic` — Enforces Miller's Law cognitive load bounds and undo windows.
  - `design_systems_lead` — Audits design token purity and prohibits arbitrary utility classes.
  - `typography_scale_architect` — Mathematical scale consistency and line length ratios.
  - `visual_balance_density` — Layout balance, grid density, and responsive breakpoints.
  - `interaction_choreographer` — State matrix transitions and navigation DAGs.
  - `color_contrast_specialist` — Perceptual color spaces (OKLCH, APCA) and colorblind safety.
  - `microcopy_tone_specialist` — UX copywriting tone, error clarity, and brand voice.

---

### 7. Enterprise Security, Threat Modeling & Compliance (SOC 2, ISO 27001)
- **What Soda OS Can Do Right Now:**
  - STRIDE threat modeling, OWASP Top 10 defense, and Zero-Trust sandbox boundaries.
  - Enterprise SAML 2.0 SSO federation (Okta, Entra ID) and SCIM 2.0 automated directory sync.
  - Multi-jurisdiction data residency geo-fencing (GDPR, Thai PDPA, Singapore PDPC).
  - Customer-Managed Encryption Keys (CMEK / BYOK) via CloudHSM / Vault.
  - Cryptographic tamper-evident audit ledgers with Merkle-tree chaining.
  - ISO/IEC 29110 SoftWare Basic Profile: autonomous generation of all 23 work products (WP01–WP23).
- **Skills Active:** `soda-security-threat-modeling`, `soda-enterprise-identity-governance`, `soda-data-residency-confidential`, `soda-audit-soc2-compliance`, `soda-iso29110`.
- **Specialist Personas Needed:**
  - `security_code_reviewer` — STRIDE threat modeling, zero-trust audits, memory safety, secrets scans.
  - `compliance_audit_lead` — Merkle audit verification, SOC 2 / ISO 27001 continuous evidence collection.
  - `iso29110_governance_engineer` — Validates and compiles 23 ISO 29110 work products and baselines.

---

### 8. Testing, Quality Engineering & Formal Mathematical Proofs
- **What Soda OS Can Do Right Now:**
  - Red-Green-Refactor Test-Driven Development (TDD) with 100% operational logic (Zero Mocks).
  - Mathematical formal invariant verification via SMT QF_LIA integer solvers and Hoare conditions.
  - Statistical benchmark evaluation with Wilson score 95% binomial confidence intervals.
  - Mutation testing harnesses killing artificial defect mutants.
  - Cryptographic SHA-256 proof receipt issuance bound to git commit SHAs.
- **Skills Active:** `soda-testing`, `soda-test-harness`, `soda-quality-engineering`, `soda-proof-assurance`, `soda-statistical-evidence`.
- **Specialist Personas Needed:**
  - `qa_verification_engineer` — Executes BDD Given-When-Then integration tests and TDD loops.
  - `property_invariant_tester` — Authors property tests, invariant fuzzers, and mutation test suites.
  - `formal_proof_verifier` — Solves algebraic theorems, conservation bounds, and SMT proofs.

---

### 9. Machine Learning, LLM Gateway & Cognitive Calibration
- **What Soda OS Can Do Right Now:**
  - Enterprise multi-cloud LLM gateway with vector semantic caching, cutting token costs by 45-60%.
  - Cognitive calibration telemetry: Expected Calibration Error ($\text{ECE} \le 0.05$) and Brier score ($\le 0.15$).
  - Machine learning lifecycle: dataset lineage, split isolation, LoRA/QLoRA adapters, and checkpoint evals.
  - Cryptographic model provenance tracking (weights hashes, hyperparameter logs).
- **Skills Active:** `soda-llm-gateway-finops`, `soda-model-training`, `soda-model-provenance`, `soda-agent-runtime-governance`, `soda-agent-observability`.
- **Specialist Personas Needed:**
  - `llm_finops_engineer` — Configures semantic vector caching, model routing, and token circuit breakers.
  - `ml_training_engineer` — Manages dataset splits, LoRA fine-tuning, loss monitoring, checkpoint hashes.
  - `cognitive_calibration_auditor` — Computes ECE, Brier scores, and autonomous routing risk curves.

---

### 10. Multi-Provider Subagent Runtime & Orchestration
- **What Soda OS Can Do Right Now:**
  - Spawns and bounds worker subagents across **7 AI CLIs**: `codex`, `antigravity` (`agy`), `gemini`, `claude`, `aider`, `ollama`, `goose`.
  - Enforces independent input/output token ceiling gates and prompt hash deduplication.
  - Autonomous on-the-fly persona and directive synthesis.
  - Single-owner LLM Wiki retrieval authority with exclusive leasing.
  - Central ecosystem synchronization across all 54 downstream repositories with 0 drift.
- **Skills Active:** `soda-subagent-spawning`, `soda-coordinator-agent-spawning`, `soda-subagent-context-harness`, `soda-upgrade-os`, `soda-cloud-infra-sre`, `soda-deploy-staging`.
- **Specialist Personas Needed:**
  - `swarm_coordinator` — Deconstructs tasks, enforces budgets, dispatches provider CLI subagents.
  - `llm_wiki_curator` — Holds exclusive retrieval lease, compiles cited context digests.
  - `ecosystem_sync_lead` — Maintains 100% bitwise parity and upgrade synchronization across 54 repos.

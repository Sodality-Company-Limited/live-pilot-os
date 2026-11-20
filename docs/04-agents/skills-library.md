# Skills library

> **Registry authority:** [skills-registry.yaml](skills-registry.yaml)
> **Validation:** `node scripts/agents/check-skill-registry.mjs`
> **SOT routing:** Architecture, technical, quality, API, and flow authorities are registered in `skills-registry.yaml`.

> **Sodality standard skills** — shipped with every project from **Soda Agent OS**.  
> Versioned, repeatable procedures for humans and Cursor agents.

Project-specific skills use prefix `{project}-*` and are listed in a separate section below.
The filesystem inventory is authoritative: every `.agents/skills/*/SKILL.md` must be
represented by a catalog link and must pass the registry validator.

## Version convention

| Change type | Bump | Example |
|-------------|------|---------|
| New steps, removed steps, different order | **minor** (1.0 → 1.1) | Add mandatory security scan |
| Incompatible with previous workflow | **major** (1.x → 2.0) | Commit policy changed |
| Wording, links, typos | **patch** (1.0.0 → 1.0.1) | Fix path typo |

Store version in skill frontmatter:

```yaml
---
name: soda-my-skill
version: "1.0.0"
description: When to use this skill…
---
```

## Soda standard skills (shipped)

| Skill | Version | Path | Use when |
|-------|---------|------|----------|
| Goal workflow | **1.10.0** | [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) | Spec stability + epic-namespaced IDs (`soda-os goal next`) |
| Product discovery | **1.3.5** | [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) | Knowledge Services + ROI on `os health` |
| Learning loop | **1.0.2** | [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md) | LearningService capabilities |
| Product design (UI/UX) | **1.2.0** | [soda-design](../../.agents/skills/soda-design/SKILL.md) | UI/UX goals (Kind: design) — flow, tokens, spec, React+Tailwind, a11y |
| Create REST API | **1.0.0** | [soda-rest-api](../../.agents/skills/soda-rest-api/SKILL.md) | New/changed HTTP/RPC endpoints |
| Code review checklist | **1.1.0** | [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md) | Before done / merge / PR review |
| Testing procedure | **1.1.0** | [soda-testing](../../.agents/skills/soda-testing/SKILL.md) | Tests + consumer browser MCP when Test plan names it |
| Deploy to staging | **1.0.0** | [soda-deploy-staging](../../.agents/skills/soda-deploy-staging/SKILL.md) | SHIP phase, staging deploy |
| Upgrade Agent OS | **1.0.0** | [soda-upgrade-os](../../.agents/skills/soda-upgrade-os/SKILL.md) | Phase 2 semantic merge after soda-os upgrade |
| Incident response | **1.1.0** | [soda-incident-response](../../.agents/skills/soda-incident-response/SKILL.md) | Outages, rollback, postmortem |
| Database migration | **1.0.0** | [soda-db-migration](../../.agents/skills/soda-db-migration/SKILL.md) | Schema changes, migrations |
| Third-Party API Resilience | **1.0.0** | [soda-thirdparty-api-resilience](../../.agents/skills/soda-thirdparty-api-resilience/SKILL.md) | Outbound TokenBuckets, Ephemeral Caching, Outbox Workers, Preemptive Schedulers & Circuit Breakers |
| ISO 29110 work products | **1.0.0** | [soda-iso29110](../../.agents/skills/soda-iso29110/SKILL.md) | All 23 WPs — doc / link / register / derived; `iso generate all` |
| Atomic unit scoping | **2.0.0** | [soda-atomic-unit-scoping](../../.agents/skills/soda-atomic-unit-scoping/SKILL.md) | Universal task decomposition and scope-reduction engine across all domains and stacks |
| Executive briefing | **1.0.0** | [soda-executive-briefing](../../.agents/skills/soda-executive-briefing/SKILL.md) | High-signal engineering communication translated for leadership and management channels |
| Post-mortem RCA | **1.0.0** | [soda-post-mortem](../../.agents/skills/soda-post-mortem/SKILL.md) | Canonical engineering root cause analysis record for resolved defects |
| Scrutinize | **1.0.0** | [soda-scrutinize](../../.agents/skills/soda-scrutinize/SKILL.md) | Adversarial outsider review: challenge intent, full call graph trace, failure inversion |
| Debug mantra | **1.0.0** | [soda-debug-mantra](../../.agents/skills/soda-debug-mantra/SKILL.md) | Disciplined 4-stage protocol: reproduce, trace fail path, falsify hypotheses, breadcrumb ledger |
| Inter-Node Consensus & Contracts | **1.0.0** | [soda-node-consensus-contracts](../../.agents/skills/soda-node-consensus-contracts/SKILL.md) | Syntactic/semantic contracts, distributed consensus (Raft/Paxos), fencing tokens, idempotency & CRDTs |
| Multi-Node Contract Invariants | **1.0.0** | [soda-node-contract-invariants](../../.agents/skills/soda-node-contract-invariants/SKILL.md) | Zero-hallucination bi-directional contract invariants across UI <-> BFF <-> KrakenD <-> Microservices |

All linked from [AGENTS.md](../../AGENTS.md) and routed via [.agents/rules/guidelines.md](../../.agents/rules/guidelines.md).

## Project-specific skills (add when needed)

Use when the same **project-only** convention is explained 3+ times:

```text
.agents/skills/{project}-{name}/SKILL.md
```

| Skill | Version | Path | Use when |
|-------|---------|------|----------|
| *(none — add rows as created)* | — | — | — |

Register new skills here and in `AGENTS.md`.

## Changelog

| Skill | Version | Date | Change |
|-------|---------|------|--------|
| soda-node-contract-invariants | 1.0.0 | 2026-11-10 | Multi-node zero-hallucination bi-directional contract invariants across UI <-> BFF <-> KrakenD <-> Microservices |
| soda-node-consensus-contracts | 1.0.0 | 2026-11-10 | Syntactic & semantic inter-node contracts, distributed consensus quorums, monotonic fencing & state convergence |
| soda-debug-mantra | 1.0.0 | 2026-11-10 | Strict 4-step engineering debugging discipline (reproduce reliably, trace path, falsify hypotheses, breadcrumb ledger) |
| soda-scrutinize | 1.0.0 | 2026-11-10 | Adversarial outsider plan/diff audit, intent challenge for simpler zero-code solutions, full call-path tracing |
| soda-post-mortem | 1.0.0 | 2026-11-10 | Canonical blameless engineering incident RCA record with preflight verification gates |
| soda-executive-briefing | 1.0.0 | 2026-11-10 | Multi-channel leadership communication translating technical details into executive business impact |
| soda-atomic-unit-scoping | 2.0.0 | 2026-11-10 | Universal task de-bloat engine with 4 Laws of Scope and 5-tier dependency-driven decomposition |
| soda-goal-workflow | 1.10.0 | 2026-08-31 | Epic-namespaced IDs: `soda-os goal next|reserve` before draft; filename = ID |
| soda-testing | 1.1.0 | 2026-08-17 | Consumer browser MCP allowed only when Test plan names it |
| soda-design | 1.2.0 | 2026-08-17 | Optional consumer design-file MCP (Figma) — read-only default |
| soda-goal-workflow | 1.9.0 | 2026-08-17 | Spec stability: clarify / spec check / analyze; WHAT vs HOW; no-guess |
| soda-discovery | 1.3.5 | 2026-08-17 | Do not guess missing facts; route clarify/analyze to goal-workflow |
| soda-iso29110 | 1.0.0 | 2026-08-05 | Full 23 WPs; ClickUp/GitHub/IP link types; WP20 derived from WP19 |
| soda-iso29110 | 0.2.0 | 2026-08-04 | Templates vendored into docs/08-iso29110/; in-repo generate after upgrade |
| soda-iso29110 | 0.1.0 | 2026-08-04 | Draft — Wave A mapping + generate/validate protocol; companion wave-a-mapping.md |
| soda-design | 1.1.0 | 2026-07-14 | Auto-run on `Kind: design` goals in PLAN; goal template Kind marker + design task types |
| soda-design | 1.0.0 | 2026-07-14 | Initial ship — full UI/UX lifecycle: flow/states, derived tokens, UI spec, React+Tailwind, WCAG AA review |
| soda-discovery | 1.3.4 | 2026-07-14 | Interview questions + refinement prompts in English |
| soda-learning-loop | 1.0.2 | 2026-06-27 | LearningService; event bus documented as future |
| soda-discovery | 1.3.3 | 2026-06-27 | Knowledge Services layer; Knowledge ROI on os health |
| soda-discovery | 1.0.0 | 2026-06-27 | Knowledge loop: 7-step interview, distillation, assumptions, PDR |
| soda-upgrade-os | 1.0.0 | 2026-06-24 | Two-phase upgrade: manifest + --report + AI semantic merge |
| soda-goal-workflow | 1.8.0 | 2026-06-27 | Coordination layer — playbooks, capability IR, shared memory |
| soda-goal-workflow | 1.5.0 | 2026-06-27 | Context resolver, execution bundle, hydrate/continue |
| soda-goal-workflow | 1.4.2 | 2026-06-24 | "ทำ G-xxx" fast path — TodoWrite only, no promote nag / no repo explore |
| soda-goal-workflow | 1.4.1 | 2026-06-24 | TodoWrite sync with Plan steps — visible step progress in chat |
| soda-goal-workflow | 1.4.0 | 2026-06-24 | Plan briefing on "ทำ G-xxx"; execute on "เริ่ม step N" only |
| soda-goal-workflow | 1.3.3 | 2026-06-24 | Executable goal spec (Context, Work steps); goal-spec-guide.md |
| soda-goal-workflow | 1.3.2 | 2026-06-24 | Plan & Dashboard tracking; archive to goals/_archived/ |
| soda-goal-workflow | 1.2.0 | 2026-05-27 | Governance layer: state machine, audit, acceptance contracts |
| soda-code-review | 1.1.0 | 2026-05-27 | Five review lenses (security, architecture, scope creep) |
| soda-incident-response | 1.1.0 | 2026-05-27 | Normal vs incident mode |
| soda-goal-workflow | 1.1.0 | 2026-05-24 | Goal gate mandatory before code |
| soda-rest-api | 1.0.0 | 2026-05-24 | Initial ship |
| soda-code-review | 1.0.0 | 2026-05-24 | Initial ship |
| soda-testing | 1.0.0 | 2026-05-24 | Initial ship |
| soda-deploy-staging | 1.0.0 | 2026-05-24 | Initial ship |
| soda-incident-response | 1.0.0 | 2026-05-24 | Initial ship |
| soda-db-migration | 1.0.0 | 2026-05-24 | Initial ship |

## Complete local skill inventory

This inventory is intentionally link-only; descriptions and versions remain in each
skill's frontmatter and are checked by the registry validator.

 - [soda-accessibility-i18n-localization](../../.agents/skills/soda-accessibility-i18n-localization/SKILL.md)
 - [soda-api-spec-generation](../../.agents/skills/soda-api-spec-generation/SKILL.md)
 - [soda-api-sot-traceability](../../.agents/skills/soda-api-sot-traceability/SKILL.md)
 - [soda-tdd-spec-generation](../../.agents/skills/soda-tdd-spec-generation/SKILL.md)
 - [soda-agent-observability](../../.agents/skills/soda-agent-observability/SKILL.md)
 - [soda-agent-runtime-governance](../../.agents/skills/soda-agent-runtime-governance/SKILL.md)
 - [soda-agentic-discovery](../../.agents/skills/soda-agentic-discovery/SKILL.md)
 - [soda-anti-slop-review](../../.agents/skills/soda-anti-slop-review/SKILL.md)
 - [soda-api-gateway-contracts](../../.agents/skills/soda-api-gateway-contracts/SKILL.md)
 - [soda-archify](../../.agents/skills/soda-archify/SKILL.md)
 - [soda-architectural-arena](../../.agents/skills/soda-architectural-arena/SKILL.md)
 - [soda-ast-type-invariants](../../.agents/skills/soda-ast-type-invariants/SKILL.md)
 - [soda-atomic-unit-scoping](../../.agents/skills/soda-atomic-unit-scoping/SKILL.md)
 - [soda-audit-soc2-compliance](../../.agents/skills/soda-audit-soc2-compliance/SKILL.md)
 - [soda-autonomous-diagnostician](../../.agents/skills/soda-autonomous-diagnostician/SKILL.md)
 - [soda-autopilot-runner](../../.agents/skills/soda-autopilot-runner/SKILL.md)
 - [soda-blast-radius-analyzer](../../.agents/skills/soda-blast-radius-analyzer/SKILL.md)
 - [soda-bug-triage](../../.agents/skills/soda-bug-triage/SKILL.md)
 - [soda-cloud-infra-sre](../../.agents/skills/soda-cloud-infra-sre/SKILL.md)
 - [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md)
 - [soda-concept-doc-extractor](../../.agents/skills/soda-concept-doc-extractor/SKILL.md)
 - [soda-context-investigation](../../.agents/skills/soda-context-investigation/SKILL.md)
 - [soda-coordinator-agent-spawning](../../.agents/skills/soda-coordinator-agent-spawning/SKILL.md)
 - [soda-creative-direction](../../.agents/skills/soda-creative-direction/SKILL.md)
 - [soda-data-residency-confidential](../../.agents/skills/soda-data-residency-confidential/SKILL.md)
 - [soda-data-visualization](../../.agents/skills/soda-data-visualization/SKILL.md)
 - [soda-database-architecture](../../.agents/skills/soda-database-architecture/SKILL.md)
 - [soda-dave-decision-orchestration](../../.agents/skills/soda-dave-decision-orchestration/SKILL.md)
 - [soda-dave-frontend-implementation](../../.agents/skills/soda-dave-frontend-implementation/SKILL.md)
 - [soda-dave-game-design](../../.agents/skills/soda-dave-game-design/SKILL.md)
 - [soda-dave-hitl-review](../../.agents/skills/soda-dave-hitl-review/SKILL.md)
 - [soda-dave-motion-and-assets](../../.agents/skills/soda-dave-motion-and-assets/SKILL.md)
 - [soda-dave-reference-packets](../../.agents/skills/soda-dave-reference-packets/SKILL.md)
 - [soda-dave-visual-fidelity](../../.agents/skills/soda-dave-visual-fidelity/SKILL.md)
 - [soda-db-migration](../../.agents/skills/soda-db-migration/SKILL.md)
 - [soda-debug-mantra](../../.agents/skills/soda-debug-mantra/SKILL.md)
 - [soda-deploy-staging](../../.agents/skills/soda-deploy-staging/SKILL.md)
 - [soda-design](../../.agents/skills/soda-design/SKILL.md)
 - [soda-design-system-tokens](../../.agents/skills/soda-design-system-tokens/SKILL.md)
 - [soda-diagram-design](../../.agents/skills/soda-diagram-design/SKILL.md)
 - [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md)
 - [soda-empirical-eval-runner](../../.agents/skills/soda-empirical-eval-runner/SKILL.md)
 - [soda-enterprise-identity-governance](../../.agents/skills/soda-enterprise-identity-governance/SKILL.md)
 - [soda-epistemic-trace-auditor](../../.agents/skills/soda-epistemic-trace-auditor/SKILL.md)
 - [soda-event-driven-architecture](../../.agents/skills/soda-event-driven-architecture/SKILL.md)
 - [soda-executive-briefing](../../.agents/skills/soda-executive-briefing/SKILL.md)
 - [soda-figma-opendesign-bridge](../../.agents/skills/soda-figma-opendesign-bridge/SKILL.md)
 - [soda-gamification-retention](../../.agents/skills/soda-gamification-retention/SKILL.md)
 - [soda-generative-ai-ui](../../.agents/skills/soda-generative-ai-ui/SKILL.md)
 - [soda-git-sanity-guard](../../.agents/skills/soda-git-sanity-guard/SKILL.md)
 - [soda-git-stack-orchestrator](../../.agents/skills/soda-git-stack-orchestrator/SKILL.md)
 - [soda-goal-execution](../../.agents/skills/soda-goal-execution/SKILL.md)
 - [soda-goal-generation](../../.agents/skills/soda-goal-generation/SKILL.md)
 - [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md)
 - [soda-incident-response](../../.agents/skills/soda-incident-response/SKILL.md)
 - [soda-information-architecture](../../.agents/skills/soda-information-architecture/SKILL.md)
 - [soda-intent-playbook-router](../../.agents/skills/soda-intent-playbook-router/SKILL.md)
 - [soda-iso29110](../../.agents/skills/soda-iso29110/SKILL.md)
 - [soda-landing-page](../../.agents/skills/soda-landing-page/SKILL.md)
 - [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md)
 - [soda-live-stream-scrubber](../../.agents/skills/soda-live-stream-scrubber/SKILL.md)
 - [soda-llm-gateway-finops](../../.agents/skills/soda-llm-gateway-finops/SKILL.md)
 - [soda-metric-hillclimb](../../.agents/skills/soda-metric-hillclimb/SKILL.md)
 - [soda-micro-frontend-plugins](../../.agents/skills/soda-micro-frontend-plugins/SKILL.md)
 - [soda-model-pairing-router](../../.agents/skills/soda-model-pairing-router/SKILL.md)
 - [soda-model-provenance](../../.agents/skills/soda-model-provenance/SKILL.md)
 - [soda-model-training](../../.agents/skills/soda-model-training/SKILL.md)
 - [soda-motion-microinteractions](../../.agents/skills/soda-motion-microinteractions/SKILL.md)
 - [soda-multiphase-planner](../../.agents/skills/soda-multiphase-planner/SKILL.md)
 - [soda-node-consensus-contracts](../../.agents/skills/soda-node-consensus-contracts/SKILL.md)
 - [soda-node-contract-invariants](../../.agents/skills/soda-node-contract-invariants/SKILL.md)
 - [soda-post-mortem](../../.agents/skills/soda-post-mortem/SKILL.md)
 - [soda-pr-babysit](../../.agents/skills/soda-pr-babysit/SKILL.md)
 - [soda-pr-noise-resolver](../../.agents/skills/soda-pr-noise-resolver/SKILL.md)
 - [soda-production-readiness-review](../../.agents/skills/soda-production-readiness-review/SKILL.md)
 - [soda-proof-assurance](../../.agents/skills/soda-proof-assurance/SKILL.md)
 - [soda-quality-engineering](../../.agents/skills/soda-quality-engineering/SKILL.md)
 - [soda-reflection-engine](../../.agents/skills/soda-reflection-engine/SKILL.md)
 - [soda-release-readiness-verifier](../../.agents/skills/soda-release-readiness-verifier/SKILL.md)
 - [soda-resource-budgeting](../../.agents/skills/soda-resource-budgeting/SKILL.md)
 - [soda-rest-api](../../.agents/skills/soda-rest-api/SKILL.md)
 - [soda-runtime-trace-forensics](../../.agents/skills/soda-runtime-trace-forensics/SKILL.md)
 - [soda-scrutinize](../../.agents/skills/soda-scrutinize/SKILL.md)
 - [soda-security-threat-modeling](../../.agents/skills/soda-security-threat-modeling/SKILL.md)
 - [soda-semantic-refactor-engine](../../.agents/skills/soda-semantic-refactor-engine/SKILL.md)
 - [soda-session-checkpoint](../../.agents/skills/soda-session-checkpoint/SKILL.md)
 - [soda-skill-authoring-compiler](../../.agents/skills/soda-skill-authoring-compiler/SKILL.md)
 - [soda-software-reverse-engineering](../../.agents/skills/soda-software-reverse-engineering/SKILL.md)
 - [soda-sound-audio-branding](../../.agents/skills/soda-sound-audio-branding/SKILL.md)
 - [soda-spatial-canvas-3d](../../.agents/skills/soda-spatial-canvas-3d/SKILL.md)
 - [soda-spike-sandbox](../../.agents/skills/soda-spike-sandbox/SKILL.md)
 - [soda-state-sync-localfirst](../../.agents/skills/soda-state-sync-localfirst/SKILL.md)
 - [soda-statistical-evidence](../../.agents/skills/soda-statistical-evidence/SKILL.md)
 - [soda-subagent-context-harness](../../.agents/skills/soda-subagent-context-harness/SKILL.md)
 - [soda-subagent-spawning](../../.agents/skills/soda-subagent-spawning/SKILL.md)
 - [soda-system-architecture](../../.agents/skills/soda-system-architecture/SKILL.md)
 - [soda-test-harness](../../.agents/skills/soda-test-harness/SKILL.md)
 - [soda-testing](../../.agents/skills/soda-testing/SKILL.md)
 - [soda-thirdparty-api-resilience](../../.agents/skills/soda-thirdparty-api-resilience/SKILL.md)
 - [soda-upgrade-os](../../.agents/skills/soda-upgrade-os/SKILL.md)
 - [soda-ux-research-heuristics](../../.agents/skills/soda-ux-research-heuristics/SKILL.md)
 - [soda-visual-parity-guard](../../.agents/skills/soda-visual-parity-guard/SKILL.md)
 - [soda-web-vitals-performance](../../.agents/skills/soda-web-vitals-performance/SKILL.md)
 - [soda-worktree-prune](../../.agents/skills/soda-worktree-prune/SKILL.md)
 - [soda-zero-bug-quality-guarantee](../../.agents/skills/soda-zero-bug-quality-guarantee/SKILL.md)

## Related

- [design-spec.md](../03-architecture/design-spec.md)
- [dev-roles.md](dev-roles.md)
- [../06-workflows/team-workflow.md](../06-workflows/team-workflow.md)

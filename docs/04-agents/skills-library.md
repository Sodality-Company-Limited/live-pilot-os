# Skills library

> **Sodality standard skills** — shipped with every project from **Soda Agent OS**.  
> Versioned, repeatable procedures for humans and Cursor agents.

Project-specific skills use prefix `{project}-*` and are listed in a separate section below.

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

## Related

- [design-spec.md](../03-architecture/design-spec.md)
- [dev-roles.md](dev-roles.md)
- [../06-workflows/team-workflow.md](../06-workflows/team-workflow.md)

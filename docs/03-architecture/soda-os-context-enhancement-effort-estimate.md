# Soda OS Business-to-Production Enhancement — Effort Estimate

> ประมาณการคน เงิน เวลา และทรัพยากรสำหรับ blueprint ที่อยู่ใน
> [soda-os-context-enhancement-blueprint.md](soda-os-context-enhancement-blueprint.md)
>
> สถานะ: Planning estimate; ไม่ใช่ใบเสนอราคา, commitment หรือ authorization ให้เริ่มงาน

## 1. Decision summary

การทำ Soda OS ให้ถึง context ใน `prompt-check-soda-os.md` ไม่ใช่งาน “เพิ่ม CLI/harness อีกชุดหนึ่ง” แต่เป็น platform transformation ที่ต้องสร้าง canonical model, traceability, governed runtime, production certification และ operating loop

**ประมาณการสำหรับ target production operating system:**

| Dimension | Planning range |
|---|---|
| Calendar time | 12–16 เดือน เมื่อมีทีมเฉลี่ย 6–8 FTE และทำงานแบบ gated overlap |
| Delivery effort | 75–110 person-months |
| Cash budget | 26–43 ล้านบาท THB รวม contingency 20% |
| Core team | 6–8 FTE เฉลี่ย; peak 9–11 คนใน Program 3–4 |
| Earliest credible production certificate | หลัง Program 4 และหลัง staging/operational evidence สะสมครบ |

ตัวเลขนี้ใช้สำหรับ platform core เท่านั้น ไม่รวมการสร้าง application consumer ใหม่, multi-region rollout จริง, SOC 2 audit ภายนอก หรือ integration เชิงพาณิชย์รายลูกค้า

## 2. Assumptions

### Scope included

- 4 programs ใน enhancement blueprint
- backward-compatible migration ของ goal/skill/receipt artifacts ที่จำเป็น
- development + staging environment
- one reference release train และ one Engineering Case File ที่ใช้งานจริง
- executable governance, verification, release และ operations evidence

### Scope excluded

- การสร้างผลิตภัณฑ์ลูกค้ารายใหม่บน Soda OS
- production cloud account, region หรือ compliance jurisdiction ที่ยังไม่ตัดสินใจ
- external compliance certification/audit fee
- 24x7 on-call ที่ใช้งานจริงหลัง launch
- migration ประวัติทุก goal/receipt ในครั้งเดียว

### Cost assumptions

ตัวเลขเงินใช้ **fully-loaded blended cost** ไม่ใช่เงินเดือน:

| Parameter | Reference | Target | Enterprise |
|---|---:|---:|---:|
| Blended people cost / FTE-month | 180,000 THB | 240,000 THB | 300,000 THB |
| Contingency | 15% | 20% | 30% |
| LLM/automation cap / month | 75,000 THB | 150,000 THB | 300,000 THB |
| Non-production cloud/tools cap / month | 100,000 THB | 200,000 THB | 400,000 THB |

ต้องแทนที่ rates เหล่านี้ด้วยต้นทุนทีม, vendor และ cloud commitment จริงก่อนขออนุมัติงบ

## 3. Delivery scenarios

| Scenario | Purpose | Time | Effort | Indicative cash budget |
|---|---|---:|---:|---:|
| A. Reference implementation | พิสูจน์ canonical model, one case file, explicit verify CLI, development/staging profile | 6–9 เดือน | 35–50 person-months | 9–16 ล้านบาท THB |
| B. Target operating system | ทำครบ 4 programs สำหรับ one production release train | 12–16 เดือน | 75–110 person-months | 26–43 ล้านบาท THB |
| C. Enterprise expansion | multi-team, multi-environment, high-availability/compliance expansion | 18–30 เดือน | 130–190 person-months | 50–85 ล้านบาท THB |

Recommendation: approve Scenario A as a bounded investment first; Scenario B proceeds only after Program 1–2 demonstrate that the artifact model is adopted by real goals.

---

## 4. Effort by program

| Program | Scope | Calendar duration | Effort | Peak staffing | Principal dependency |
|---|---|---:|---:|---:|---|
| 1. Canonical model + Case File | schemas, IDs, validation, traceability, one real case | 8–12 weeks | 10–15 PM | 4–5 FTE | product intent and artifact inventory |
| 2. Business-to-architecture pipeline | Business Case, evidence, requirements, domain/C4/ADR, capability graph | 10–14 weeks | 14–20 PM | 5–6 FTE | Program 1 IDs and link validator |
| 3. Governed execution + assurance | agent contract, loop records, explicit verify CLI, 7-layer profiles, CI repairs | 14–20 weeks | 24–35 PM | 7–9 FTE | Program 2 baseline and stabilized framework |
| 4. Release + operations + learning | release certificate, rollout/rollback, SLO/on-call, economics, learning loop | 16–24 weeks | 27–40 PM | 8–11 FTE | Program 3 production profile and real staging evidence |

`PM` means person-month. Programs may overlap only after their predecessor's contract is versioned and accepted; they may not bypass the dependency gates.

## 5. Recommended team

| Role | Average FTE | Peak FTE | Main responsibility |
|---|---:|---:|---|
| Product/business lead | 0.6 | 1.0 | Business Case, success metrics, scope and investment decisions |
| Requirements/domain architect | 0.8 | 1.0 | requirements baseline, bounded contexts, ubiquitous language |
| Platform/enterprise architect | 0.8 | 1.0 | case model, C4, ADR, NFR, dependency boundaries |
| Technical lead / backend-CLI engineer | 1.0 | 1.0 | schema validators, graph compiler, CLI contracts |
| Agent runtime engineer | 0.8 | 1.0 | session contract, loop runtime, tool/risk controls |
| Verification / quality engineer | 1.0 | 1.5 | profile matrix, harness integration, deterministic evidence |
| SRE / release engineer | 0.6 | 1.5 | environments, rollout, rollback, SLO, readiness certificate |
| Security / compliance engineer | 0.4 | 1.0 | threat model, identity, supply chain, privacy and audit evidence |
| Data / FinOps analyst | 0.3 | 0.8 | cost telemetry, economics, learning metrics |
| Technical writer / enablement | 0.3 | 0.6 | runbooks, operator UX, adoption material |

Minimum credible team for Scenario A: product lead, architect, technical lead, verification engineer and part-time security/SRE. One engineer alone can prototype it, but cannot credibly validate independent review, operations and release controls.

---

## 6. Budget composition

### Scenario B — target operating system

| Cost category | Range | Notes |
|---|---:|---|
| People | 18.0–26.4 ล้านบาท | 75–110 PM × 240k THB blended rate |
| Cloud, CI, test environments and observability | 2.0–4.0 ล้านบาท | staging, synthetic test data, trace/log storage, security scanning |
| LLM/API/model evaluation | 1.5–3.0 ล้านบาท | capped by per-goal/session budgets; excludes model training clusters |
| Security, tooling and specialist services | 0.5–2.0 ล้านบาท | code scanning, dependency audit, performance/chaos tooling, external review support |
| Subtotal before contingency | 22.0–35.4 ล้านบาท | requires monthly cost audit |
| Contingency at 20% | 4.4–7.1 ล้านบาท | ambiguity, migration, integration and remediation risk |
| **Planning total** | **26.4–42.5 ล้านบาท** | rounded in summary to 26–43 ล้านบาท |

### Cost control rules

1. No program receives its full downstream budget at kickoff.
2. Program 2 funding follows Program 1 adoption evidence.
3. Program 3 funding follows a baselined requirement/capability graph.
4. Program 4 funding follows a passing development profile and named staging owner.
5. LLM and cloud costs have both monthly caps and per-goal caps; an exceeded cap blocks new work until reviewed.

## 7. Timeline and milestones

The target schedule assumes 2-week iterations, dedicated decision makers, and no unresolved production authority. It is a range, not a date commitment.

| Milestone | Weeks | Deliverable | Go/no-go gate |
|---|---:|---|---|
| M0 — Mobilize and repair baseline | 0–4 | scope charter, clean governance baseline, test-output isolation | governance check and core unit suite are reproducible |
| M1 — Case File foundation | 5–12 | schemas, ID registry, `case validate`, first ECF | orphan/stale-link detection works on a real case |
| M2 — Planning pipeline | 13–24 | Business Case, requirements baseline, domain/C4/ADR, capability graph | no goal can become ready without upstream evidence |
| M3 — Assurance runtime | 25–40 | canonical agent contract, loop records, explicit-target `soda-os verify` | development profile blocks missing evidence and self-approval |
| M4 — Release and operations | 41–56 | readiness certificate, staging rollout/rollback, SLO/runbook/ownership | staged release demonstrates rollback and operational telemetry |
| M5 — Stabilize and measure | 57–64 | learning records, cost reporting, adoption evidence, external review | outcome metrics support proceed/hold decision for expansion |

Scenario A can end after M3 plus one constrained staging demonstration. Scenario B requires M4–M5. Scenario C adds regional, compliance and multi-team expansion after that evidence exists.

## 8. Resource allocation contract

Every enhancement goal should declare a measurable resource contract:

```yaml
goal_id: G-CORE-NNN
profile: platform_enhancement
people_days_max:
compute_hours_max:
token_budget_max:
cloud_budget_thb_max:
memory_mb_max:
latency_p99_ms_sla:
retry_max: 2
acceptance_evidence:
  - resource-budget-audit
  - verification-receipt
stop_conditions:
  - budget_exceeded
  - missing_decision
  - failed_gate
```

Use the existing resource budget harness as one input, but extend it with people-days and cash-budget audit fields. A green technical test does not override an exceeded financial or capacity ceiling.

---

## 9. Non-labor resources

| Resource | Needed by | Why |
|---|---|---|
| Dedicated staging environment | Program 3 | integration/E2E/rollback evidence cannot rely on local-only execution |
| Isolated evidence storage | Program 1 | receipt immutability, retention and separation from disposable test output |
| CI runners and controlled test data | Program 3 | deterministic, repeatable assurance profiles |
| Observability stack | Program 4 | metrics, logs, traces, alerts and business outcome evidence |
| Security scanning and provenance tooling | Program 3–4 | supply-chain, artifact, secret and policy evidence |
| Incident/rollback simulation environment | Program 4 | recovery and chaos evidence without production risk |
| Legal/compliance advisor | Program 2 and 4 | jurisdiction, retention, privacy and approval boundary decisions |

## 10. Risks and contingency

| Risk | Probability | Schedule/cost impact | Mitigation |
|---|---|---|---|
| Business intent remains undecided | High | +15–25% | fund discovery as a gate; do not fabricate requirements |
| Existing artifact formats conflict | High | +10–20% | version adapters; migrate one active case first |
| Test suites mutate tracked evidence | Medium | +5–10% | separate disposable output; prove cleanup in CI |
| Production authority/topology unclear | High | blocks Program 4 | decision PDR before operational implementation |
| Compliance scope expands late | Medium | +15–30% | treat jurisdiction as explicit scope boundary |
| LLM spend grows with agent fan-out | Medium | +10–25% | token/session caps, mandatory telemetry, approval for cap increase |
| SRE capability is part-time only | Medium | +10–20% | defer production certification; retain release engineer earlier |
| Legacy CI/governance defects remain | Medium | +5–15% | M0 must pass before downstream work starts |

The 20% Scenario B contingency is insufficient if cloud topology, compliance jurisdiction or 24x7 operational support enter scope after M2; then re-estimate before commitment.

---

## 11. Funding strategy and decision gates

### Recommended staged funding

| Investment tranche | Covers | Budget decision criterion |
|---|---|---|
| Tranche 1 | M0–M1 | case model validates one real enhancement and framework baseline is green |
| Tranche 2 | M2 | business/requirements/architecture graph is accepted and usable by a goal |
| Tranche 3 | M3 | development verification profile is explicit-target, deterministic and fail-closed |
| Tranche 4 | M4–M5 | staging release evidence proves operational controls and rollback |

This prevents paying for production operations before the upstream model is adopted.

### What can be deferred safely

- database/event bus implementation for artifact storage
- multi-region active-active deployment
- external compliance certification
- custom dashboard frontends
- automatic policy evolution
- broad historical migration beyond the first validated case

### What cannot be deferred if claiming production readiness

- explicit business and requirement ownership
- traceability and evidence freshness checks
- independent verification/self-approval separation
- explicit-target, fail-closed verification command
- rollback/compensation evidence
- named release/service ownership, alerting and runbooks
- staging evidence for the exact release candidate

## 12. Staffing plan by phase

| Phase | Full-time roles | Fractional roles | Avoid |
|---|---|---|---|
| M0–M1 | technical lead, architect, verification engineer | product, security, writer | broad agent swarm or production SRE buildout |
| M2 | product lead, requirements/domain architect, technical lead | security, QA, SRE | coding assumptions before requirements baseline |
| M3 | technical lead, runtime engineer, QA/verification, DevEx | architect, security, product | parallel work on shared core files without touch maps |
| M4–M5 | SRE/release, QA/performance, technical lead | product, security, FinOps, support owner | production promotion without named operational owner |

## 13. Success measures for the investment

| Layer | Measure | Target before expansion decision |
|---|---|---|
| Traceability | in-scope requirements linked to case/goals/receipts | 100% for reference case |
| Governance | synthetic success paths in production profile | 0 |
| Verification | mandatory production gates with current evidence | 100% pass or explicit blocked |
| Agent runtime | sessions respecting tool/touch-map/token contract | 100% |
| Delivery | goals closed with independent evidence | 100% for pilot train |
| Release | staging rollback drill | pass within agreed RTO/RPO |
| Economics | actual vs budgeted people/cloud/LLM spend | within ±15% |
| Learning | production observations converted to governed change | at least one complete loop |

## 14. Recommended immediate decision

Approve only the discovery and foundation tranche initially:

```text
Duration: 12 weeks
Effort: 10–15 person-months
Team: 4–5 FTE average
Budget ceiling: 3.0–4.5 ล้านบาท THB including 15% contingency
Exit: one validated Engineering Case File and an evidence-based decision to fund M2
```

This is the smallest investment that can determine whether Soda OS can evolve toward the prompt without committing prematurely to a 12–16 month transformation.

## 15. Final estimate

| Question | Answer |
|---|---|
| Can one person do it? | Can prototype parts, but cannot credibly deliver independent assurance, release and operations controls alone |
| Minimum credible investment | 12 weeks, 10–15 PM, 3.0–4.5 ล้านบาท for the foundation tranche |
| Target investment | 12–16 months, 75–110 PM, 26–43 ล้านบาท for one complete production release train |
| Biggest uncertainty | business model and production authority, not schema or harness coding |
| Main cost risk | building production/compliance operations before requirements and evidence model are accepted |
| Recommended approach | fund in gated tranches; re-estimate after M1, M2 and M3 evidence |

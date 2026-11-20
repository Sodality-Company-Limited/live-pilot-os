# Soda OS Context Gap Analysis

> วิเคราะห์ความสอดคล้องระหว่าง Soda OS ปัจจุบันกับเป้าหมายใน `prompt-check-soda-os.md`
>
> วันที่ตรวจ: 2026-11-20  
> ฐานการตรวจ: repository ณ commit `9ff93dd` และ working tree evidence ใน workspace นี้
>
> ขอบเขตสำคัญ: `prompt-check-soda-os.md` และรายงานฉบับนี้เป็นไฟล์ untracked ใน working tree ไม่ใช่ส่วนหนึ่งของ commit `9ff93dd`

## 1. Executive summary

Soda OS ปัจจุบันเป็น **Agent Engineering Governance และ Verification Framework** ที่มีความลึกด้าน goal workflow, agent runtime controls, fail-closed rules, proof receipts และ test harnesses

แต่ยังไม่เป็น **Complete Business-to-Production Agentic Engineering Operating System** ตาม context เพราะยังไม่มีสายงานที่บังคับใช้ได้จริงตั้งแต่:

```text
Business intent
→ Product / Requirements
→ Domain / Architecture
→ Governed execution
→ Verified software
→ Production release
→ Operations
→ Business learning
```

จุดแข็งอยู่ที่ `PLAN → VERIFY` ส่วนช่องว่างใหญ่ที่สุดอยู่ที่:

- Business และ product discovery
- Requirements และ domain traceability
- Engineering Case File กลาง
- Unified production verification
- Production operations
- Business outcome learning

**Overall verdict: PARTIAL ALIGNMENT — NOT PRODUCTION-COMPLETE**

---

## 2. Evidence จาก repository

### 2.1 Bootstrap state ยังไม่สมบูรณ์

หลักฐาน:

- `code/` ไม่มี source files จริง
- ไม่มี root `package.json`
- ไม่มี `.github/ci-config.yml`
- `docs/00-project-snapshot.md` ยังเป็น placeholder
- `docs/02-product/project-brief.md` ยังเป็น Draft placeholder
- `docs/03-architecture/overview.md` ยังเป็น template
- ไม่มี active goal card ใน `docs/07-backlog/goals/` ณ วันที่ตรวจ
- test คาดหวัง `template/.agents/templates/execute-goal.md` แต่ path นี้ไม่มีอยู่จริง

ไฟล์หลัก:

- [`docs/00-project-snapshot.md`](../00-project-snapshot.md)
- [`docs/02-product/project-brief.md`](../02-product/project-brief.md)
- [`docs/03-architecture/overview.md`](./overview.md)

### 2.2 Verification ที่รันจริง

คำสั่ง:

```bash
node --test tests/unit/*.mjs
```

ผล:

| Metric | Result |
|---|---:|
| Tests | 1,749 |
| Passed | 1,629 |
| Failed | 120 |
| Skipped | 0 |

Failure ที่สำคัญ:

- execute-goal template contract ไม่ครบ
- framework `template/` distribution หาย
- verification pre-done gate ล้ม
- workspace/component fixtures ใน `code/` หาย
- operational/runbook tests ล้ม
- บาง stress tests เปิด local server ไม่ได้ใน environment นี้ (`listen EPERM`) จึงยังสรุปเป็น product defect ไม่ได้

การแบ่งประเภท failure:

| Category | Interpretation |
|---|---|
| Missing file / placeholder | Repository/framework defect ที่ reproduce ได้ |
| Assertion failure ใน lifecycle gate | Framework behavior defect ที่ควรแก้ |
| `listen EPERM` | Environment limitation จนกว่าจะ rerun ใน environment ที่อนุญาต network binding |
| Aggregate count 1,749/120 | เป็นผลรวมของ unit suite ไม่ใช่ production-readiness score |

### 2.3 Governance ที่รันจริง

คำสั่ง:

```bash
bash scripts/ci/governance-check.sh
```

ผลคือ **failed** จาก:

- `G-AG-001` ถึง `G-AG-020` ใช้ epic `AG` ที่ไม่ได้ register ใน `goal-id-registry.yaml`
- archived goals `G-CORE-034` ถึง `G-CORE-040` มี H1 ไม่ตรง canonical format

### 2.4 Application CI

คำสั่ง:

```bash
bash scripts/ci/app-ci.sh
```

ผล:

```text
App CI skipped: .github/ci-config.yml not found.
```

ปัจจุบัน application CI สามารถจบด้วย exit code 0 ทั้งที่ยังไม่ได้รัน test/lint ของ application จึงไม่สอดคล้องกับ production-grade fail-closed requirement

### 2.5 Working-tree side effects

การรัน test suite สร้างหรือแก้ไข proof/evidence artifacts หลายไฟล์ และทำให้ working tree ไม่สะอาด การเปลี่ยนแปลงเหล่านี้ไม่ใช่ผลลัพธ์ที่ต้องการของรายงานนี้ และยังไม่มีหลักฐานว่า artifact ที่ test เขียนถูกแยกเป็น disposable output อย่างสม่ำเสมอ

ดังนั้นผล test ชุดนี้ควรถือเป็น **diagnostic evidence** ไม่ใช่ release evidence จนกว่าจะ:

1. แยก output directory สำหรับ test runs
2. ทำให้ test cleanup เป็น deterministic
3. ยืนยันว่า proof receipt ที่เปลี่ยนมี owner และ provenance ถูกต้อง

---

## 3. Alignment กับ target operating model

Context กำหนด 10 ขั้น:

```text
DEFINE → DISCOVER → DECIDE → PLAN → DESIGN → BUILD → VERIFY → RELEASE → OPERATE → LEARN
```

| Stage | Status | Assessment |
|---|---|---|
| DEFINE | Partial | มี `AGENTS.md`, workflow และ goal framework แต่ไม่มี Business Case จริง |
| DISCOVER | Partial | มี Socratic discovery/knowledge docs แต่ไม่มี Evidence Map ที่บังคับใช้ |
| DECIDE | Partial | มี ADR/PDR และ DAVE decision tooling แต่ไม่ใช่ end-to-end decision pipeline |
| PLAN | Strong | Goal queue, dependency, touch map, acceptance และ execution bundle มีค่อนข้างครบ |
| DESIGN | Partial | มี architecture/UX/security skills แต่ project architecture ยังเป็น placeholder |
| BUILD | Weak | มี agent spawn tooling แต่ไม่มี application source ใน `code/` |
| VERIFY | Strong / Failing | มี harness และ proof tooling มาก แต่ lifecycle/test ยังไม่ green |
| RELEASE | Weak | มี pre-PR release verifier แต่ยังไม่มี production readiness certificate เต็มรูปแบบ |
| OPERATE | Partial | มี runbook, SRE และ chaos scripts แต่ไม่มี production runtime ให้ operate |
| LEARN | Partial | มี calibration/RLCD/telemetry แต่ยังไม่เชื่อม business outcomes |

### ข้อสรุป

Soda OS มี execution governance ที่ดี แต่ยังขาดต้นน้ำและปลายน้ำของระบบ:

```text
ต้นน้ำที่ขาด: Business → Product → Requirements → Domain
ปลายน้ำที่ขาด: Release → Production → Operations → Business Learning
```

---

## 4. Deep context ตามมิติที่ prompt ต้องการ

### 4.1 มิติที่มี primitive ค่อนข้างดี

#### Requirements และ goals

มี:

- goal lifecycle
- acceptance contract
- dependencies
- touch map
- goal contract schema
- verification profiles
- proof levels L0–L4

ไฟล์หลัก:

- [`docs/07-backlog/goals.md`](../07-backlog/goals.md)
- [`schemas/goal-contract.schema.json`](../../schemas/goal-contract.schema.json)

#### Agent runtime

มี primitive สำหรับ:

- role
- single persona
- allowed touch map
- token/context budget
- timeout
- duplicate prompt detection
- compact handoff
- child-agent limit
- session telemetry
- auto-reap

ไฟล์หลัก:

- [`runtime-budget.yaml`](../../.agents/runtime-budget.yaml)
- [`session-budget.mjs`](../../scripts/agents/lib/session-budget.mjs)
- [`subagent-handoff.schema.json`](../../schemas/subagent-handoff.schema.json)

ข้อจำกัด: หลาย field ยังเป็น convention ใน prompt/script ไม่ใช่ canonical schema ที่ validate ครบทุก agent เช่น `allowed_tools`, `risk_policy`, `escalation_policy` และ `output_schema`

#### Loop engineering

มี:

- maximum turns
- retry limit
- timeout
- duplicate attempt detector
- repeated failure fingerprint
- stop conditions
- token ceiling
- touch-map collision

ส่วนนี้สอดคล้องกับ context ค่อนข้างดี

#### Harness engineering

มี harness หลายประเภท:

- property invariant
- stateful model
- adversarial boundary
- mutation testing
- epistemic classification
- counterexample minimizer
- concurrency schedule
- proof receipt
- calibration
- security
- visual regression
- chaos/SRE

นี่เป็นจุดแข็งที่สุดของ repository ปัจจุบัน

### 4.2 มิติที่ยังเป็น partial หรือขาด

| Dimension | Gap |
|---|---|
| Business | ไม่มี Business Case schema, market evidence, revenue model และ strategic alignment |
| Product | ไม่มี canonical capability model, prioritization evidence และ measurable product outcome |
| Requirements | มี goal contract แต่ไม่มี Requirements Baseline กลาง |
| Domain | ไม่มี canonical bounded context, aggregate, event, workflow และ glossary model |
| UX | มี skills และ test tooling แต่ไม่มี product UX evidence pipeline ที่เชื่อม requirement |
| Architecture | มี ADR/template/skills แต่ architecture overview ของ project ยังว่าง |
| Data | มี ML/provenance artifacts แต่ไม่มี data ownership/classification/retention model กลาง |
| API | มี API tooling แต่ไม่มี canonical API registry และ compatibility graph |
| Security | มี security skills/rules แต่ security evidence ยังไม่ถูกผูกกับ release certificate กลาง |
| Compliance | มี SOC2/ISO/PDPA skills แต่ไม่มี control-to-evidence matrix ที่ enforce ใน release |
| Engineering | มี scripts/harness จำนวนมาก แต่ไม่มี application implementation pipeline ที่ตรวจจริง |
| Agent runtime | มี controls ดี แต่ยังไม่มี canonical agent contract ครบทุก field |
| Team agents | มี personas และ spawner แต่ไม่มี full coordinator-led multi-team operating graph |
| Loop engineering | มี bounded primitives แต่ discovery/design/repair/review ยังไม่รวมเป็น lifecycle engine เดียว |
| Harness | มี code/proof/security harness แต่ requirement/architecture/production harness ยังไม่ unified |
| CI/CD | มี workflows แต่ app CI ถูก skip และ governance ยัง fail |
| Infrastructure | มี scripts แต่ไม่มี canonical environment/deployment/backup/DR model |
| Observability | มี agent telemetry และ traces แต่ไม่มี unified business/service observability contract |
| Reliability | มี chaos/SRE capabilities แต่ไม่มี SLO/error budget ที่ผูกกับ release gate |
| Release | มี pre-PR verifier แต่ยังไม่มี production readiness certificate เต็มชุด |
| Operations | มี verification runbook แต่ยังขาด ownership, on-call, support และ incident operating model |
| Economics | มี token budget/FinOps primitives แต่ไม่มี end-to-end unit economics |
| Learning | มี model/agent learning แต่ยังไม่มี business outcome learning |

---

## 5. Core artifact chain

Prompt ต้องการ chain นี้:

```text
Business Case
→ Product Brief
→ Evidence Map
→ Requirements Baseline
→ Domain Model
→ Architecture Blueprint
→ ADR Set
→ Capability Map
→ Goal Graph
→ Implementation Diff
→ Verification Receipts
→ Security Evidence
→ Release Certificate
→ Production Telemetry
→ Learning Record
```

### สถานะปัจจุบัน

| Artifact | Status | Current evidence |
|---|---|---|
| Business Case | Missing | ยังไม่มี canonical artifact |
| Product Brief | Placeholder | `project-brief.md` ยังเป็น Draft |
| Evidence Map | Partial | มี evidence/proof tools แต่ไม่ใช่ business evidence map |
| Requirements Baseline | Missing | ไม่มี schema/pipeline กลาง |
| Domain Model | Missing | ยังไม่มี model ที่เป็น source of truth |
| Architecture Blueprint | Partial | `overview.md` ยังเป็น template แต่มี architecture specs/profiles และ conformance harness กระจายอยู่ |
| ADR Set | Partial | มี template/example และบาง DAVE ADR |
| Capability Map | Partial | มี capability matrix บางส่วน |
| Goal Graph | Partial | มี queues/dependencies แต่ยังไม่เป็น graph กลาง |
| Implementation Diff | Present | Git diff มี แต่ยังไม่ trace กลับ requirement |
| Verification Receipts | Present | มี proof receipts จำนวนมาก |
| Security Evidence | Partial | มี harness/skills แต่ยังไม่ unified |
| Release Certificate | Partial | มี pre-PR certificate ไม่ใช่ production certificate |
| Production Telemetry | Partial | มี agent telemetry/OTel/SRE tooling แต่ยังไม่มี production evidence chain ที่ enforce ได้ |
| Learning Record | Partial | มี ML/agent learning artifacts แต่ไม่ผูก business outcome |

## 6. Engineering Case File

Prompt ต้องการ artifact กลางชื่อ **Engineering Case File** ที่เชื่อม:

```text
business intent
→ requirement
→ decision
→ code
→ test
→ security evidence
→ deployment
→ production outcome
```

ปัจจุบันยังไม่มี artifact กลางลักษณะนี้ สิ่งที่มีอยู่กระจายอยู่ใน:

- goal cards
- changelog
- ADR/PDR
- proof receipts
- artifacts
- telemetry
- learning files

จึงยังมีความเสี่ยงเรื่อง:

- evidence orphan
- goal ที่ trace กลับ requirement ไม่ได้
- proof receipt ที่ไม่ผูกกับ release
- telemetry ที่ไม่ผูกกับ business outcome
- ADR ที่ไม่ผูกกับ decision lifecycle

### สิ่งที่ควรสร้าง

ควรมี `engineering-case-file.schema.json` และคำสั่ง:

```bash
soda-os case create <SYSTEM_ID>
soda-os case trace <SYSTEM_ID>
soda-os case verify <SYSTEM_ID>
soda-os case report <SYSTEM_ID>
```

อย่างน้อยต้อง trace ได้:

```text
business_case_id
→ requirement_ids
→ decision_ids
→ capability_ids
→ goal_ids
→ changed_files
→ test_receipts
→ security_receipts
→ release_certificate
→ production_telemetry
→ learning_record
```

---

## 7. Governance และ fail-closed assessment

### สิ่งที่มีแล้ว

- invalid goal contract → fail
- unknown verification profile → fail
- stale receipt → fail
- touch-map collision → fail
- unresolved dependency → fail
- token/context budget exceeded → stop
- secret path scan
- branch/PR governance
- no child-agent enforcement
- compact handoff
- cryptographic receipt

### สิ่งที่ยังเป็น blocker

1. Governance check ปัจจุบันยังไม่ผ่าน
2. Verification pre-done happy path ยัง fail
3. Template distribution ไม่ครบ
4. Application CI ไม่ fail-closed เมื่อ config หาย
5. ยังไม่มี unified **production profile** gate ที่ expose ผ่าน CLI และรวมทุก dimension
6. ยังไม่มีหลักฐานว่า side effects ทั้งหมดมี rollback/compensation contract
7. ยังไม่มี cross-artifact traceability gate ที่บังคับใช้ทุก release

---

## 8. Capability structure ตาม prompt

| Capability | Status |
|---|---|
| business-consulting-engine | Missing |
| evidence-and-knowledge-engine | Partial |
| requirements-engine | Missing |
| product-capability-engine | Missing |
| enterprise-architecture-engine | Partial |
| goal-and-dependency-engine | Strong |
| agent-team-orchestrator | Partial |
| context-compiler | Partial |
| bounded-loop-engine | Strong |
| agent-runtime-governance | Strong |
| harness-orchestrator | Partial/Strong for proof, incomplete for production |
| traceability-engine | Partial |
| release-readiness-engine | Partial |
| production-operations-engine | Missing |
| learning-and-calibration-engine | Partial |

ข้อสังเกต: repository มี scripts และ skills ที่ “ชื่อใกล้เคียง capability” จำนวนมาก แต่ยังไม่ใช่ platform engines ที่มี canonical input/output contract และ lifecycle integration เดียวกัน

---

## 9. Priority findings

### P0 — ทำให้ framework เชื่อถือได้ก่อน

1. แก้ epic registry mismatch ของ `AG`
2. แก้ H1 ของ archived goals `G-CORE-034` ถึง `G-CORE-040`
3. แก้หรือสร้าง `template/.agents/templates/execute-goal.md`
4. แก้ verification pre-done gate
5. ทำให้ app CI fail เมื่อ config หาย แทนที่จะ skip แล้ว exit 0
6. เพิ่ม deterministic root test/lint/build entrypoint
7. แยก network/port-dependent tests ออกจาก pure unit suite
8. ทำให้ verification CLI แสดง help จริงและต้องรับ goal target แบบ explicit

### P1 — สร้าง canonical model และ traceability

สร้าง schema อย่างน้อย:

```text
business-case.schema.json
evidence.schema.json
requirement.schema.json
domain-model.schema.json
capability.schema.json
architecture-decision.schema.json
goal-graph.schema.json
agent-session.schema.json
loop-execution.schema.json
harness-result.schema.json
release-certificate.schema.json
learning-record.schema.json
engineering-case-file.schema.json
```

### P1 — สร้าง unified verification command

เพิ่ม:

```bash
soda-os verify G-XXX --profile production
```

Output ควรมี:

```yaml
status: passed | failed | blocked
requirements:
architecture:
security:
tests:
e2e:
performance:
resilience:
observability:
release:
evidence:
```

ห้ามรายงาน `passed` หาก gate ใดถูก skip หรือไม่มี evidence

### P1 — สร้าง business-to-requirement pipeline

```text
Business Case
→ Evidence Map
→ Product Brief
→ Requirements Baseline
→ Acceptance Criteria
```

ทุก goal ต้องมี requirement parent และ evidence source

### P1 — สร้าง requirements-to-architecture pipeline

```text
Requirements
→ Domain Model
→ C4
→ API/Data Contracts
→ ADR
→ NFR
```

### P1 — สร้าง Production Readiness Certificate

ต้องแยกจาก proof receipt

- Proof receipt: invariant/test เฉพาะจุดผ่านหรือไม่
- Production certificate: ระบบพร้อม deploy และ operate จริงหรือไม่

Certificate ต้องครอบคลุม requirement, architecture, security, data, migration, API, observability, recovery, performance, chaos, runbook, support, cost, rollout, rollback และ production telemetry

### P2 — Production operations และ learning

เพิ่ม:

- environment registry
- service ownership
- SLO/error budget
- incident workflow
- on-call/support model
- rollback playbook
- business KPI
- delivery/token/infrastructure cost KPI
- agent KPI
- learning record จาก production outcome

---

## 10. Recommended implementation waves

### Wave 0 — Stabilize the framework

ทำให้ governance, unit tests, template parity และ CI behavior เป็น green ก่อน

### Wave 1 — Canonical model

สร้าง schemas และ ID/link rules สำหรับ business, requirement, architecture, goal, agent, harness, release และ learning

### Wave 2 — Engineering Case File

สร้าง central traceability graph และ CLI สำหรับ inspect/verify/report

### Wave 3 — Business-to-architecture pipeline

เชื่อม Business Case → Requirements → Domain → Architecture → ADR → NFR

### Wave 4 — Architecture-to-execution pipeline

เชื่อม Architecture → Capability Map → Dependency Graph → Atomic Goals → Execution Bundle

### Wave 5 — Unified production verification

สร้าง `soda-os verify ... --profile production` และ Production Readiness Certificate

### Wave 6 — Operations and learning

เชื่อม production telemetry, incident data, business KPI, agent performance และ learning record

---

## 11. Final verdict

| Area | Verdict |
|---|---|
| Governance framework | Partial — design แข็งแรง แต่ current checks ยัง fail |
| Agent runtime controls | Partial — primitives ดี แต่ยังไม่ใช่ full team orchestration |
| Verification/proof | Strong tooling — แต่ lifecycle ยังไม่ green |
| Business/Product discovery | Missing |
| Requirements traceability | Missing/Partial |
| Architecture pipeline | Partial — ยังเป็น template เป็นหลัก |
| Application delivery | Missing ใน repository นี้ |
| Release readiness | Partial — ยังไม่ใช่ production certificate |
| Production operations | Missing |
| Business learning | Missing/Partial |
| Complete Business-to-Production OS | **Not yet** |

### One-line conclusion

Soda OS มี “โครงกระดูกของ Agent Governance และ Verification Platform” ที่ค่อนข้างลึก แต่ยังต้องสร้าง canonical business-to-production model, Engineering Case File, unified production gate และ operational learning loop ก่อนจึงจะสอดคล้องกับ context แบบครบวงจร

---

## 12. Adversarial findings

### Blocker 1 — CI สามารถรายงาน success โดยไม่รัน application verification

- **Finding:** [`scripts/ci/app-ci.sh:11-14`](../../scripts/ci/app-ci.sh) ใช้ `exit 0` เมื่อไม่มี `.github/ci-config.yml`
- **Consequence:** PR/release สามารถผ่าน application CI โดยไม่มี test หรือ lint evidence ทำให้ `passed` ไม่ได้แปลว่า application verified
- **Evidence:** `bash scripts/ci/app-ci.sh` รายงาน `App CI skipped` และ exit code 0
- **Recommendation:** ใน production profile ให้เปลี่ยนเป็น `blocked`/non-zero; อนุญาต skip เฉพาะ explicit bootstrap profile ที่ไม่สามารถใช้เป็น release gate ได้
- **Verdict:** **FIX-THEN-SHIP**

### Blocker 2 — Unified production profile ยังไม่ถูก expose เป็น CLI contract

- **Finding:** มี [`scripts/harness/verify.mjs`](../../scripts/harness/verify.mjs) เป็น unified goal-verification entrypoint แต่ CLI dispatcher ใน [`cli.js:232-258`](../../cli.js) และ [`cli.js:729-806`](../../cli.js) ยังไม่มี `verify` command พร้อม `--profile production` ตาม context
- **Consequence:** ยังไม่มี machine-readable gate เดียวที่รวม requirements, architecture, security, E2E, performance, resilience, observability, release และ evidence
- **Evidence:** มี `assure`, `harness`, `diagnose`, `telemetry` และ goal commands; `verify.mjs` dispatches profile-driven invariant orchestration แต่ยังไม่แสดง output contract ครบ requirements/architecture/security/E2E/performance/resilience/observability/release/evidence
- **Recommendation:** เพิ่ม `soda-os verify <goal> --profile production` โดย fail-closed เมื่อ profile ใดถูก skip หรือ evidence ไม่ครบ
- **Verdict:** **REWORK**

### Major 3 — Verification entrypoint ทำงานโดยไม่ต้องระบุเป้าหมาย

- **Finding:** [`scripts/harness/verification-orchestrator-harness.mjs:213-225`](../../scripts/harness/verification-orchestrator-harness.mjs) default target เป็น `G-PROOF-012`; `verify.mjs` ส่ง arguments ตรงเข้าสู่ orchestrator โดยไม่มี `--help` handling
- **Consequence:** คำสั่ง `node scripts/harness/verify.mjs --help` รัน verification จริงของ goal default แทนที่จะอธิบาย usage; ผู้ใช้สามารถได้ผล pass ของ goal ที่ไม่ได้ตั้งใจตรวจ และอาจตีความเป็น release assurance ผิด
- **Evidence:** รัน `node scripts/harness/verify.mjs --help` แล้วได้ `PIPELINE PASSED` สำหรับ `G-PROOF-012` แทน help text
- **Recommendation:** เพิ่ม explicit help parser; require `--goal <G-xxx>` หรือ positional goal ใน execution mode; ให้ `--all` เป็น explicit only; ห้าม default เป็น goal ใด goal หนึ่ง
- **Verdict:** **FIX-THEN-SHIP**

### Major 4 — Framework distribution parity แตก

- **Finding:** test [`tests/unit/test-execute-goal-template.mjs:8`](../../tests/unit/test-execute-goal-template.mjs) คาดหวัง `template/.agents/templates/execute-goal.md` แต่ `template/` ไม่มีอยู่จริง
- **Consequence:** downstream bootstrap/upgrade และ parity tests ไม่สามารถพิสูจน์ได้ว่า framework ที่แจกจ่ายเท่ากับ source framework
- **Evidence:** test ล้มด้วย `ENOENT`
- **Recommendation:** เลือก source of truth เดียว แล้วสร้าง/แจกจ่าย `template/` ให้ครบ หรือปรับ manifest/test ให้ตรงกับ distribution strategy ที่ใช้งานจริง
- **Verdict:** **FIX-THEN-SHIP**

### Major 5 — Governance state ปัจจุบันไม่ผ่าน

- **Finding:** [`scripts/ci/governance-check.sh`](../../scripts/ci/governance-check.sh) reject epic `AG` และ archived goal H1 หลายรายการ
- **Consequence:** repository ไม่สามารถผ่าน governance gate พื้นฐาน และไม่ควรเลื่อนสถานะ release/goal เป็น approved
- **Evidence:** governance command รายงาน `G-AG-001` ถึง `G-AG-020` ไม่ได้ register และ H1 ของ `G-CORE-034` ถึง `G-CORE-040` ไม่ตรง format
- **Recommendation:** register epic หรือ migrate IDs แล้ว normalize archived goal headers พร้อมเพิ่ม regression test
- **Verdict:** **FIX-THEN-SHIP**

### Major 6 — Verification evidence ยังไม่ใช่ production evidence

- **Finding:** proof receipts และ unit harness มีจำนวนมาก แต่ไม่มี unified trace จาก business intent ถึง deployment/production outcome
- **Consequence:** ระบบอาจพิสูจน์ invariant เฉพาะจุดได้ แต่ไม่สามารถรับรองว่า release ตรง business requirements หรือ operate ได้จริง
- **Evidence:** มี proof receipts, `verify.mjs`, OpenAPI/architecture/observability/production scripts และ learning artifacts แบบแยกส่วน แต่ไม่มี Engineering Case File หรือ production-profile evidence chain ที่รวมและ enforce ทุกส่วน
- **Recommendation:** สร้าง canonical case/traceability model ก่อนเพิ่ม harness ใหม่
- **Verdict:** **REWORK**

### Nit 7 — รายงานเดิมใช้คำว่า “ไม่มี production runtime” กว้างเกินหลักฐาน

- **Finding:** repository มี runtime/chaos/SRE scripts บางส่วน แต่ไม่มีหลักฐาน production deployment ที่เชื่อมกับระบบนี้
- **Consequence:** คำว่า “ไม่มี production runtime” อาจตีความแรงเกินไปว่าไม่มี runtime code ใด ๆ เลย
- **Recommendation:** ใช้ถ้อยคำที่แม่นกว่า: “ยังไม่มีหลักฐาน production runtime และ production evidence chain ที่ enforce ได้ใน repository นี้”
- **Verdict:** **FIX-THEN-SHIP**

## 13. Revised conclusion

ข้อสรุปที่แม่นที่สุดคือ:

> Soda OS มี implementation primitives ที่แข็งแรงมากในด้าน governed agent execution และ verification แต่สถานะปัจจุบันยังอยู่ในระดับ **framework/tooling foundation** ไม่ใช่ **complete Business-to-Production operating system** เพราะยังขาด canonical business/requirements/domain model, central traceability, unified production gate และ operational evidence ที่พิสูจน์ได้จริง

---

## 14. Direct checklist ตาม prompt sections 1–10

ส่วนนี้ตรวจตามหัวข้อใน [`prompt-check-soda-os.md`](../../prompt-check-soda-os.md) โดยตรง ไม่ได้นับเพียงการมีชื่อไฟล์หรือชื่อ skill แต่ตรวจว่ามีการเชื่อมและบังคับใช้ end-to-end หรือไม่

| Prompt section | Evidence ที่พบ | Status | Gap หลัก |
|---|---|---|---|
| 1. Target operating model | collaboration phases, discovery, decision, goal workflow, design, verification, SRE/learning docs | Partial | ยังไม่มี lifecycle เดียวที่บังคับ DEFINE → DISCOVER → DECIDE → PLAN → DESIGN → BUILD → VERIFY → RELEASE → OPERATE → LEARN |
| 2. Deep context | knowledge map/schema, project brief, ADR/PDR, OpenAPI, context bundle, security/UX/SRE skills | Partial | หลายมิติมีเอกสารหรือ skill แต่ข้อมูลจริงหลายชุดว่าง/เป็น placeholder และไม่มี canonical cross-link |
| 3. Core artifacts | goals, ADR/PDR, evidence/proof receipts, telemetry, learning log, architecture specs | Partial | ไม่มี authoritative Engineering Case File และ chain เดียวที่เชื่อม business intent ถึง production outcome |
| 4. Agent team model | personas catalog, runtime budget, spawner, coordinator/roles, handoff schema | Partial | มี role/persona/runtime primitives แต่ไม่มี canonical team manifest ครบทุก field และไม่มี coordinator-led operating graph ครบทุกทีม |
| 5. Loop engineering | bounded runtime budget, retry/timeout/duplicate detectors, discovery/design/review skills | Partial/Strong | execution/verification loop แข็งแรงกว่า discovery/design/repair/review ที่ยังเป็นเอกสารและหลาย harness แยกกัน |
| 6. Harness engineering | requirement/goal, architecture conformance, code, integration/E2E, agent, security, chaos/load/SRE harnesses | Partial/Strong | มี harness เกือบครบ 7 ชั้น แต่ยังไม่มี production profile aggregator ที่พิสูจน์ทุกชั้นด้วย release evidence เดียว; `verify.mjs` ยัง default ไปที่ `G-PROOF-012` เมื่อไม่ระบุ target |
| 7. Governance model | fail-closed routing, human review, rollback harness, proof receipts, provenance, CI governance | Partial | หลักการและ tooling มี แต่ governance check ปัจจุบัน fail และ app CI สามารถ skip แล้ว exit 0 |
| 8. Production-readiness gates | release verifier, production-readiness generators, runbook, SRE/DR scripts | Partial | ยังไม่เห็น certificate contract ที่บังคับ requirement, security, data, API, recovery, cost, support และ telemetry ครบในใบเดียว |
| 9. Capability structure | scripts/skills/harnesses ครอบคลุมหลายชื่อ capability | Partial | ส่วนใหญ่เป็น distributed scripts/skills ไม่ใช่ 15 platform engines ที่มี canonical input/output และ lifecycle integration |
| 10. Implementation sequence | archived goals/waves, schemas, harness goals, context compiler, runtime work | Partial | มี implementation history หลายชุด แต่ยังไม่มี canonical wave plan ที่เริ่มจาก business model และปิดด้วย production learning |

### Prompt sections ที่ถือว่าใกล้เคียงที่สุด

1. Agent runtime governance
2. Bounded execution loops
3. Goal/dependency management
4. Verification and proof harnesses
5. Agent telemetry and calibration

### Prompt sections ที่เป็น critical gap

1. Business-to-requirement pipeline
2. Requirements-to-domain/architecture pipeline
3. Engineering Case File / traceability graph
4. Production profile release gate
5. Production operations evidence
6. Business outcome learning

## 15. Final prompt-based verdict

```text
Prompt compliance: PARTIAL
Framework primitives: STRONG
Canonical business model: NOT READY
End-to-end traceability: NOT READY
Production release certification: NOT READY
Production operations evidence: NOT READY
Continuous business learning: PARTIAL
```

การมี `verify.mjs`, architecture harnesses, production generators, knowledge map และ learning log แสดงว่า Soda OS มีชิ้นส่วนที่สำคัญกว่ารายงานแบบ “ไม่มี tooling” แต่ชิ้นส่วนเหล่านี้ยังไม่ถูกผูกเป็นระบบเดียวที่สามารถรับรองคำสั่งเดียวว่า:

```text
Business intent → verified production outcome
```

ดังนั้น verdict ที่ถูกต้องคือ **มี foundation และ capability fragments จำนวนมาก แต่ยังไม่ผ่าน prompt ในระดับ integrated operating system**

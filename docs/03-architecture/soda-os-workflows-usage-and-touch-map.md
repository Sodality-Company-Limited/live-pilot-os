# Soda OS Workflow Usage Audit & Touch Map

## 1. Executive summary

`docs/06-workflows/` ถูกใช้งานจริงในฐานะเอกสารกำกับ workflow, policy และ reference contract ของ Soda OS แต่ยังไม่ได้ถูกโหลดหรือ execute โดย workflow engine กลางเพียงตัวเดียว

สถานะปัจจุบัน:

- มี workflow 18 ไฟล์ใน `docs/06-workflows/`
- `AGENTS.md` อ้างถึงโดยตรง 7 ไฟล์
- มี 4 ไฟล์ที่มี automated enforcement ชัดเจนผ่าน scripts หรือ tests
- ไฟล์อื่นถูกใช้ผ่าน `.agents/rules/`, `.agents/skills/`, goal templates และเอกสารอ้างอิง
- ยังไม่มีตัวกลางที่ตรวจว่า workflow ทุกข้อถูกปฏิบัติครบทุก execution

ดังนั้น `docs/06-workflows/` เป็น **distributed governance layer** มากกว่า executable workflow engine

## 2. Files and purpose

| File | Primary purpose |
|---|---|
| `confidence-aware-execution.md` | Confidence-aware execution และ incident playbooks |
| `definition-of-done.md` | DoD สำหรับ goal, code, quality, review และ ship |
| `design-loop.md` | UX/UI design workflow |
| `dev-loop.md` | Development lifecycle ตั้งแต่เลือก goal ถึง PR/ship |
| `external-tools.md` | Policy สำหรับ external tools และ MCP |
| `github-governance.md` | Branch protection, CI และ PR-first governance |
| `goal-id.md` | Grammar และ lifecycle ของ Goal ID |
| `goal-spec-guide.md` | Executable goal และ spec stability gates |
| `knowledge-governance.md` | Authority, ownership และ traceability |
| `knowledge-loop.md` | Discovery, decision และ knowledge evolution |
| `organizational-learning.md` | Organizational learning และ pattern library |
| `os-core-invariants.md` | Core invariants ของ Soda Agent OS |
| `quality-priorities.md` | Quality severity และ improvement contract |
| `reference-implementation.md` | Framework/product boundary และ reference process |
| `team-workflow.md` | Human-agent collaboration และ onboarding |
| `upgrade-agent-os.md` | Upgrade existing projects |
| `verification-operator-runbook.md` | Verification harness และ proof evidence |

## 3. Direct references from AGENTS.md

ใน `AGENTS.md` มีการอ้างถึงโดยตรง 7 ไฟล์:

| Workflow | Location | Usage |
|---|---:|---|
| `team-workflow.md` | Line 7 | Human onboarding และ collaboration cycle |
| `knowledge-loop.md` | Line 105 | DEFINE และ discovery-to-goal flow |
| `definition-of-done.md` | Line 139 | DoD ก่อน review/done |
| `dev-loop.md` | Line 152 | Full development workflow |
| `external-tools.md` | Line 177 | MCP/external tool policy |
| `github-governance.md` | Line 242 | Protected branches และ CI setup |
| `upgrade-agent-os.md` | Line 251 | Existing-project upgrade |

ไฟล์ที่ไม่ได้ถูกอ้างโดยตรงจาก `AGENTS.md` แต่ถูกใช้ผ่าน rules, skills, scripts หรือ tests ได้แก่:

- `confidence-aware-execution.md`
- `design-loop.md`
- `goal-id.md`
- `goal-spec-guide.md`
- `knowledge-governance.md`
- `organizational-learning.md`
- `os-core-invariants.md`
- `quality-priorities.md`
- `reference-implementation.md`
- `verification-operator-runbook.md`

## 4. Usage classification

### 4.1 Files with executable enforcement

#### goal-id.md

Consumers:

- `scripts/goals/goal-id.js`
- `docs/07-backlog/goal-id-registry.yaml`
- `.agents/rules/core.md`
- `.agents/rules/goal-execution.md`

มี script, registry และ rules ที่ใช้กำกับ Goal ID format จริง

#### github-governance.md

Consumers:

- `scripts/ci/governance-check.sh`
- `.github/workflows/governance.yml`
- `.github/workflows/ci.yml`
- `.agents/rules/governance.md`

มี CI governance check และ branch/PR policy ที่เชื่อมกับ repository จริง

#### confidence-aware-execution.md

Consumers:

- `tests/unit/test-operational-runbook.mjs`
- `scripts/agentic/g-ml-024-provenance-oracle-evaluator.mjs`
- `template/docs/06-workflows/confidence-aware-execution.md`

มี structural tests, template parity และ provenance/hash validation

#### verification-operator-runbook.md

Consumers:

- `tests/unit/test-verification-documentation-conformance.mjs`
- `tests/unit/test-process-diagnostics.mjs`
- proof receipt/evidence validators
- verification architecture documents

มี documentation conformance tests, template parity และ proof evidence

### 4.2 Policy/reference files

ไฟล์ต่อไปนี้ถูกอ้างจาก rules และ skills แต่ไม่ได้ถูก parser หรือ execute โดยตรงทุกครั้ง:

- `team-workflow.md`
- `dev-loop.md`
- `definition-of-done.md`
- `goal-spec-guide.md`
- `external-tools.md`
- `knowledge-loop.md`
- `knowledge-governance.md`
- `organizational-learning.md`
- `os-core-invariants.md`
- `design-loop.md`
- `quality-priorities.md`
- `reference-implementation.md`
- `upgrade-agent-os.md`

ไฟล์กลุ่มนี้มีผลเมื่อ agent, coordinator หรือ reviewer อ่านและปฏิบัติตามผ่าน `AGENTS.md`, rules และ skills

## 5. Main consumers

### Repository governance

    AGENTS.md
      ├── .agents/rules/core.md
      ├── .agents/rules/governance.md
      ├── .agents/rules/testing.md
      ├── .agents/rules/guidelines.md
      └── .agents/rules/goal-execution.md

### Agent skills

    .agents/skills/
      ├── soda-goal-workflow
      ├── soda-testing
      ├── soda-code-review
      ├── soda-discovery
      ├── soda-learning-loop
      ├── soda-design
      ├── soda-upgrade-os
      └── soda-quality-engineering

### Executable checks

    scripts/ci/**
    scripts/goals/**
    scripts/agentic/**
    tests/unit/**
    .github/workflows/**

### Goal and evidence artifacts

    docs/07-backlog/goals/**
    docs/07-backlog/goal-id-registry.yaml
    docs/07-backlog/evidence/**
    docs/06_raw/**
    template/docs/06-workflows/**

## 6. Workflow touch map

### 6.1 Audit touch map

Read-only scope:

    AGENTS.md
    docs/06-workflows/**
    .agents/rules/**
    .agents/skills/**
    scripts/ci/**
    scripts/goals/**
    scripts/agentic/**
    tests/unit/**
    .github/**
    template/docs/06-workflows/**
    docs/02-product/**
    docs/03-architecture/**
    docs/07-backlog/goal-id-registry.yaml
    docs/07-backlog/evidence/**

This audit does not require source-code or workflow mutation.

### 6.2 DEFINE / knowledge

Read:

    docs/02-product/**
    docs/03-architecture/**
    docs/06-workflows/knowledge-*.md
    docs/06-workflows/os-core-invariants.md
    .agents/skills/soda-discovery/**
    .agents/skills/soda-learning-loop/**

Potential writes:

    docs/02-product/knowledge-map.json
    docs/02-product/knowledge-map.schema.json
    docs/06_raw/**
    docs/05-decisions/**
    docs/07-backlog/**

### 6.3 PLAN / goal

Read:

    docs/07-backlog/**
    docs/02-product/acceptance/**
    docs/06-workflows/goal-id.md
    docs/06-workflows/goal-spec-guide.md
    .agents/skills/soda-goal-workflow/**

Potential writes:

    docs/07-backlog/goals/**
    docs/07-backlog/queues/**
    docs/07-backlog/epics.md
    docs/07-backlog/goal-id-registry.yaml
    docs/02-product/acceptance/**

### 6.4 EXECUTE

Read:

    active goal card
    docs/02-product/**
    docs/03-architecture/**
    docs/05-decisions/**
    .agents/rules/**
    .agents/skills/**

Write only within the active goal's declared allowed files, such as:

    code/**
    tests/**
    docs/03-architecture/api/**
    data/**
    docs/02-product/acceptance/G-xxx.md

No repository-wide refactor or unrelated goal changes are allowed.

### 6.5 REVIEW / SHIP

Read:

    docs/06-workflows/definition-of-done.md
    docs/06-workflows/github-governance.md
    .agents/rules/governance.md
    .agents/rules/testing.md
    .agents/skills/soda-testing/**
    .agents/skills/soda-code-review/**
    .github/**

Potential writes:

    docs/07-backlog/evidence/**
    docs/07-backlog/goals/_archived/**
    docs/07-backlog/changelog.md
    docs/07-backlog/changelog-goals.md
    docs/06_raw/**

External effects:

    feature/G-xxx branch
    origin/feature/G-xxx
    GitHub Pull Request
    ClickUp status sync, when explicitly configured

### 6.6 Design

Read:

    docs/02-product/project-brief.md
    docs/06-workflows/design-loop.md
    .agents/skills/soda-design/**

Potential writes:

    docs/02-product/**
    docs/03-architecture/**
    docs/05-decisions/**
    docs/02-product/acceptance/**

Figma or other design MCP is consumer-owned and must be named in the goal scope before use.

### 6.7 Upgrade

Read:

    framework-manifest.yml
    docs/06-workflows/upgrade-agent-os.md
    .agents/skills/soda-upgrade-os/**
    target AGENTS.md
    target docs/07-backlog/goals.md

Write:

    framework files listed in framework-manifest.yml
    .agents/**
    docs/06-workflows/**
    scripts/**
    .github/**

Product source, product data and product-specific decisions must remain untouched unless explicitly included in scope.

### 6.8 Verification

Read:

    docs/06-workflows/verification-operator-runbook.md
    docs/03-architecture/verification-architecture-guide.md
    scripts/harness/**
    tests/unit/**
    active goal and source files

Potential writes:

    docs/07-backlog/evidence/**
    artifacts/proofs/**
    docs/06_raw/**
    verification reports

## 7. Findings and gaps

### Gap 1: No central workflow executor

ไฟล์ส่วนใหญ่เป็น Markdown ที่ agent ต้องอ่านเอง ไม่มี dispatcher ที่แปลงเอกสารเหล่านี้เป็น mandatory runtime gates ทั้งหมด

### Gap 2: Multiple sources of truth

Workflow policy กระจายอยู่ใน:

- `AGENTS.md`
- `.agents/rules/**`
- `.agents/skills/**`
- `docs/06-workflows/**`
- scripts และ test harnesses

จึงมีความเสี่ยงที่เอกสารกับ implementation จะ drift กัน

### Gap 3: Playbook metadata is not proof of execution

Goal cards จำนวนมากมี:

    Playbook: docs/06-workflows/dev-loop.md

แต่ metadata นี้ไม่ได้พิสูจน์ว่า agent ทำครบทุกขั้นของ `dev-loop.md` จริง

### Gap 4: DoD is partly distributed

`definition-of-done.md` เป็น checklist แต่ gate จริงบางส่วนอยู่ใน scripts, rules, CI และ skills แยกกัน

### Gap 5: Human approval semantics need clarification

`design-loop.md`/ `soda-design` ระบุว่าต้อง human approve UI spec ก่อน `ready` ขณะที่ governance ส่วนอื่นรองรับ autonomous progression ควรกำหนด exception ให้ชัดเจนใน policy กลาง

### Gap 6: Historical references can look like active consumers

`docs/06_raw/**`, archived goals และ reports มี references จำนวนมาก แต่เป็น historical evidence ไม่ใช่ runtime consumer

### Gap 7: Skill inventory ไม่ครบใน `AGENTS.md`

ตรวจพบ skill ที่มีไฟล์จริงใน `.agents/skills/` จำนวนประมาณ 102 รายการ แต่ `AGENTS.md` มีลิงก์ในตาราง standard skills เพียง 19 รายการ

สรุป coverage:

| รายการ | จำนวน |
|---|---:|
| Skill directory ที่มี `SKILL.md` จริง | 102 |
| Skill ที่ลิงก์ใน `AGENTS.md` | 19 |
| Skill ที่ยังไม่มี entry ใน `AGENTS.md` | 83 |
| ลิงก์ใน `AGENTS.md` ที่ชี้ไปยังไฟล์ไม่มีอยู่ | 0 |

ตัวอย่าง skill ที่มีอยู่จริงแต่ไม่ได้อยู่ในตารางหลักของ `AGENTS.md`:

- `soda-agent-runtime-governance`
- `soda-agent-observability`
- `soda-security-threat-modeling`
- `soda-system-architecture`
- `soda-database-architecture`
- `soda-api-gateway-contracts`
- `soda-thirdparty-api-resilience`
- `soda-proof-assurance`
- `soda-production-readiness-review`
- `soda-subagent-spawning`
- `soda-release-readiness-verifier`
- `soda-zero-bug-quality-guarantee`

#### Impact

- Agent ที่อ่านเฉพาะ `AGENTS.md` จะค้นพบ standard skills ได้เพียง 19 รายการ
- Skill ที่ไม่ได้อยู่ในตารางจะไม่มี trigger หรือ command mapping ใน entry point หลัก
- การเลือก skill อาจไม่สม่ำเสมอระหว่าง Codex, Claude, Antigravity และ subagents
- ความครอบคลุมของ governance, security, architecture, verification และ SRE skills ไม่ชัดเจนจาก `AGENTS.md` เพียงไฟล์เดียว
- เกิดความเสี่ยงที่ skill ที่มีอยู่แล้วจะไม่ถูกเรียกใช้ แม้ repository จะมี implementation พร้อม

#### Related inconsistency

`soda-thirdparty-api-resilience` มีไฟล์จริง, มี entry ใน `docs/04-agents/skills-library.md` และถูกอ้างใน `.agents/rules/guidelines.md` แต่ไม่มี entry ในตารางหลักของ `AGENTS.md`

ในทางกลับกัน `.agents/rules/goal-orchestration.md` อ้างถึง:

    .agents/skills/soda-markdown-placement/SKILL.md

แต่ไม่พบไฟล์ skill นี้จริง จึงเป็น broken internal reference ที่ต้องแก้หรือลบ

#### Recommended resolution

1. ระบุใน `AGENTS.md` ให้ชัดว่าตารางปัจจุบันเป็นเพียง **curated standard skills** ไม่ใช่ inventory ทั้งหมด
2. เพิ่ม skill ที่มีผลต่อ governance, security, architecture, verification และ release ลงใน standard table
3. สร้าง skill registry กลางที่มีชื่อ, path, version, trigger, owner และ enforcement level
4. เพิ่ม automated skill-link audit ให้ตรวจ `AGENTS.md`, `skills-library.md`, `.agents/rules/` และ `.agents/skills/` ให้สอดคล้องกัน
5. แก้ reference ของ `soda-markdown-placement` ที่ไม่มีไฟล์จริง

## 8. Recommended improvements

1. สร้าง workflow registry ระบุ owner, consumer, enforcement level และ source of truth ของทุกไฟล์
2. เพิ่ม automated link/conformance check สำหรับไฟล์ใน `docs/06-workflows/`
3. แยกสถานะ `documentation-only`, `agent-read`, `script-enforced`, `test-enforced`
4. เพิ่ม execution receipt ที่บอกว่า goal ผ่าน workflow phase ใดและใช้หลักฐานไฟล์ใด
5. ลด policy duplication ระหว่าง `AGENTS.md`, rules และ workflow docs
6. เพิ่ม drift test ระหว่าง workflow docs, template mirror และ executable scripts
7. ระบุ human-approval exceptions ให้เป็น governance rule ที่ตรวจสอบได้

## 9. Final assessment

    docs/06-workflows
    ├── 4 files: automated enforcement ชัดเจน
    ├── 7 files: ถูก AGENTS.md อ้างโดยตรง
    ├── หลาย files: ถูก rules/skills ใช้เป็น policy
    └── ยังไม่มี central executor ที่ enforce ทุก workflow ครบวงจร

ข้อสรุปเชิงสถาปัตยกรรม: ระบบมี workflow contract ค่อนข้างครบ แต่ยังต้องเพิ่ม traceability และ machine-enforced gates เพื่อพิสูจน์ว่า workflow ถูกปฏิบัติจริงในแต่ละ goal ไม่ใช่เพียงถูกอ้างถึงในเอกสาร


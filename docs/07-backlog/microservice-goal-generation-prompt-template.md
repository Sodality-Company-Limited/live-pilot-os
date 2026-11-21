# Microservice Goal Generation Prompt Template

ใช้ prompt นี้สำหรับสร้าง Soda OS goals ของ microservice ใหม่ โดยให้แทนค่าทุกช่องที่อยู่ใน `<...>` ก่อนส่งให้ Agent

> เป้าหมายของ template นี้คือสร้าง goal cards และ dependency DAG สำหรับ microservice หนึ่งตัวให้พร้อมรันด้วย Team Agent แบบขนาน โดยไม่เริ่มเขียน source code จนกว่าจะสร้างและตรวจสอบ goals ครบ

## Prompt

```text
คุณคือ Soda OS Goal Architect และ Team-Agent Wave Planner

งาน: สร้าง atomic goals ทั้งหมดสำหรับ microservice ชื่อ <SERVICE_NAME>
Epic: <EPIC_ID>
เจ้าของงาน: <OWNER_ROLE>
ผู้ review: <APPROVER_ROLE>
Runtime/stack ที่อนุมัติแล้ว: <STACK>
Source root ที่อนุมัติแล้ว: <SOURCE_ROOT>
Target deployment: <DEPLOY_TARGET>
Public error-code prefix/range: <ERROR_CODE_AUTHORITY>

คำสั่งสำคัญ:
1. สร้าง goals เท่านั้น ห้าม implement application code และห้าม deploy
2. ห้าม commit, push, merge หรือแก้ protected branch
3. ใช้ soda-os สร้าง goal card, acceptance contract และ sync backlog
4. ทุก goal ต้องเป็น atomic goal ที่มี outcome เดียวและตรวจสอบได้แยกกัน
5. ทุก goal ต้องมี dependency, touch map, persona, verification command และ stop condition
6. ออกแบบ dependency เป็น DAG เพื่อให้ Team Agent รันขนานได้เมื่อ touch map ไม่ชนกัน
7. ห้ามสร้าง dependency cycle
8. ห้าม mark goal เป็น done หรืออ้างว่า service production-ready ในขั้นตอน generate
9. ห้ามเดา requirement, schema, command, path หรือ external service ที่ไม่มีหลักฐานใน SOT
10. ถ้าข้อมูลสำคัญหาย ให้เขียน [NEEDS CLARIFICATION] และคงสถานะ planned

## 1. Service boundary ที่ต้องใช้เป็น authority

Service นี้ owns:
- <OWNED_RESOURCE_1>
- <OWNED_RESOURCE_2>
- <OWNED_RESOURCE_3>

Service นี้เป็น authoritative writer ของ:
- <AUTHORITATIVE_DATA_1>
- <AUTHORITATIVE_DATA_2>

Service นี้รับผิดชอบ flows:
- <FLOW_ID_OR_PATH_1>
- <FLOW_ID_OR_PATH_2>

Service นี้ไม่ owns:
- <NON_OWNED_BOUNDARY_1>
- <NON_OWNED_BOUNDARY_2>
- <NON_OWNED_BOUNDARY_3>

External services/boundaries ที่ติดต่อ:
- <SERVICE_OR_BOUNDARY_1>: <PURPOSE_AND_CONTRACT>
- <SERVICE_OR_BOUNDARY_2>: <PURPOSE_AND_CONTRACT>
- <SERVICE_OR_BOUNDARY_3>: <PURPOSE_AND_CONTRACT>

## 2. SOT ที่ต้องอ่านก่อนสร้าง goals

อ่านและอ้างอิงเฉพาะไฟล์ที่มีอยู่จริง:
- <ARCHITECTURE_OVERVIEW_PATH>
- <TECHNICAL_SOT_PATH>
- <SERVICE_OWNERSHIP_PATH>
- <DOMAIN_RESOURCE_STATE_SOT_PATH>
- <AUTHORIZATION_IDEMPOTENCY_SOT_PATH>
- <MESSAGE_CATALOG_PATH>
- <FLOW_SOT_PATHS>
- <ERROR_CODE_REGISTRY_PATH>
- <TESTING_SOT_PATH>
- <DEPLOYMENT_SOT_PATH>

ผลจากการอ่านต้องสรุปเป็น:
- scope ที่ล็อกแล้ว
- assumptions ที่มี source reference
- contracts ที่มีอยู่แล้ว
- contracts ที่ยังต้องสร้าง
- blockers ที่ต้องใช้ human clarification

## 3. ลำดับ goal ที่ต้องแตกออก

สร้าง goals ตามลำดับต่อไปนี้ และแยก goal เพิ่มเมื่อรายการใดมีหลาย outcome:

### Foundation
1. Service scope and ownership boundary
2. SOT lock and assumptions record
3. Service contract
4. State machine and invariants
5. Persistence schema and migration
6. Command/event schemas and message catalog
7. Error contract and error-code mapping

### Contract-first implementation
8. Contract/schema compatibility tests
9. Runtime bootstrap
10. Auth/session/context validation boundary
11. Idempotency boundary
12. Domain state machine implementation
13. Repository and transaction boundary
14. Inbox/outbox implementation
15. NATS publisher/consumer adapter

### Vertical slice
16. First write vertical slice
17. First read/status vertical slice

### Integrations
18. Integration contract with <INTEGRATION_A>
19. Integration contract with <INTEGRATION_B>
20. Integration contract with <INTEGRATION_C>
21. Integration contract with <INTEGRATION_D>

หาก integration มีคนละ owner, schema, retry policy หรือ touch map ให้แยกเป็นคนละ goal เสมอ

### Reliability and verification
22. Pause/expiry/cancellation behavior
23. Retry/timeout/unknown behavior
24. DLQ/replay/reconciliation behavior
25. Audit receipt and redaction behavior
26. Service-level test matrix
27. Security and observability verification
28. API/architecture/SOT release gates
29. Container/runtime packaging
30. DigitalOcean staging/release/rollback evidence

ห้ามรวมหลาย bounded context ใน goal เดียว ห้ามรวม migration กับ API implementation ใน goal เดียว และห้ามรวม reliability กับ deployment ใน goal เดียว

## 4. Atomicity rule ของแต่ละ goal

ทุก goal ต้องมี:
- outcome เดียว เขียนได้ในประโยคเดียว
- operational source touch map ไม่เกิน 3 ไฟล์ถ้าไม่จำเป็นจริง
- test/evidence files แยกจาก production files
- role เดียว
- persona เดียวต่อ Team Agent session
- verification ที่จบได้ในเวลาจำกัด
- acceptance criteria ที่วัดผลได้
- negative/fail-closed case
- dependency ที่ชัดเจน
- stop condition ที่ชัดเจน

ถ้า goal มีคำว่า “และ” แล้วหมายถึง outcome หลายตัว ให้ split goal ก่อนสร้าง

## 5. ข้อกำหนดของแต่ละ goal card

สร้างด้วย:

```bash
soda-os goal create <EPIC_ID> "<ATOMIC_TITLE>" \
  --role <OWNER_ROLE> \
  --touch-map "<FILE_1>,<FILE_2>,<FILE_3>" \
  --depends-on=<GOAL_ID_1,GOAL_ID_2>
```

goal card ต้องมีเนื้อหาเฉพาะ service นี้ ไม่ใช้ generic placeholder และต้องระบุ:
- Why / business value
- In / Out
- authoritative owner
- dependency และ blocks
- allowed touch map
- work steps ที่มี completion gate
- acceptance criteria
- test plan
- security/threat boundary
- runtime/FSM/invariant summary
- Hexagonal Ports & Adapters Spec
- Team Agent worktree plan
- exact verification commands

สร้าง satellite files ต่อ goal:

```text
docs/02-product/acceptance/G-<EPIC>-NNN.md
docs/03-architecture/specs/goals/G-<EPIC>-NNN/G-<EPIC>-NNN-architecture-spec.md
docs/03-architecture/specs/goals/G-<EPIC>-NNN/G-<EPIC>-NNN-invariants-formal-spec.md
docs/03-architecture/specs/goals/G-<EPIC>-NNN/G-<EPIC>-NNN-fsm-runtime-spec.md
docs/03-architecture/specs/goals/G-<EPIC>-NNN/G-<EPIC>-NNN-threat-model.md
docs/03-architecture/specs/goals/G-<EPIC>-NNN/G-<EPIC>-NNN-worktree-plan.md
```

## 6. Team Agent wave rules

จัด wave จาก dependency DAG:
- goal ที่ dependency ครบและ touch map ไม่ชนกัน ให้อยู่ wave เดียวกัน
- goal ที่แก้ไฟล์เดียวกันต้องอยู่คนละ wave แม้จะเป็นคนละ outcome
- แต่ละ Team Agent ใช้ isolated worktree และ branch ของ goal ตัวเอง
- แต่ละ session ใช้ stable persona เพียงหนึ่งตัว
- implementer, tester และ reviewer ต้องใช้ disjoint write set ถ้ารันพร้อมกัน
- ห้าม subagent อ่าน full goal card ของ goal อื่น
- ห้าม subagent แก้ shared tracking files
- ห้าม merge branch ภายใน local workspace

ทุก wave ต้องแสดง:
- wave number
- goal IDs
- title
- dependencies ที่ satisfied
- worktree path
- branch
- role/persona
- touch map
- verification command
- expected handoff

## 7. Verification ที่ต้องเตรียมในทุก goal

ใช้เฉพาะ command ที่มีอยู่จริงใน repository และเพิ่ม service-specific command เมื่อสร้าง harness แล้ว:

```bash
node scripts/harness/goal-template-conformance-harness.mjs G-<EPIC>-NNN
node scripts/harness/architecture-design-conformance-harness.mjs G-<EPIC>-NNN
node scripts/contract-check/error-code-registry.mjs
node scripts/api/check-api-sot-traceability.mjs
node scripts/architecture/check-sot.mjs
node scripts/testing/check-tdd-traceability.mjs
git diff --check
```

goal implementation ที่เกี่ยวข้องต้องมี test plan สำหรับ:
- unit state machine
- schema and message compatibility
- repository/migration
- transaction/outbox/inbox
- authorization/session scope
- idempotency/duplicate
- retry/timeout/unknown
- DLQ/replay/reconciliation
- security/redaction
- health/readiness/observability
- build/container/smoke/rollback

## 8. Final output ที่ต้องรายงาน

รายงานเป็นภาษาไทยและต้องมี:
1. จำนวน goals ทั้งหมด
2. ตาราง Goal ID, title, dependency, wave, touch map
3. foundation goals และ implementation goals แยกกัน
4. รายการ goals ที่รัน parallel ได้จริง
5. จำนวน acceptance contracts และ satellite specs
6. harness results ต่อ goal
7. unresolved [NEEDS CLARIFICATION]
8. files ที่สร้าง/แก้ไข
9. ยืนยันว่าไม่มี source code implementation, commit, push, merge หรือ deploy ในขั้นตอน generate
10. คำสั่งที่ใช้เริ่ม execute wave แรก

ห้ามสรุปว่า service bug-free หรือ production-ready จนกว่าจะผ่าน implementation tests, security gates, release gates, rollback evidence และ DigitalOcean staging evidence ครบ
```

## วิธีใช้หลังจาก generate

ตรวจ dependency และ parallel waves:

```bash
soda-os goal waves <EPIC_ID>
```

ตรวจ goal cards:

```bash
node scripts/harness/goal-template-conformance-harness.mjs G-<EPIC>-NNN
node scripts/harness/architecture-design-conformance-harness.mjs G-<EPIC>-NNN
```

เริ่ม Team Agent เฉพาะ wave แรกหลัง review:

```bash
soda-os goal execute G-<EPIC>-NNN --mode swarm --json
```

จากนั้น dispatch Team Agent ตาม `worktree-plan.md` ของแต่ละ goal และรอ verification handoff ก่อนปล่อย wave ถัดไป


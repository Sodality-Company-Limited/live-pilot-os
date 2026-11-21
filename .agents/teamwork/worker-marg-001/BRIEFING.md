# Subagent Briefing: G-MARG-001

## Objective
Author and freeze `docs/03-architecture/api/services/margin-policy-service.md` following the exact standards of `catalog-service.md` and `session-service.md`.

## Key SOT Requirements
1. **Ownership:** Authoritative writer of margin policies, floor rules, contribution margin calculations, and margin verdicts. Explicitly disclaim voucher/promotion, inventory, human approval execution, and external platform adapters.
2. **Aggregates:** `margin_policy` (tenant policy version, floor basis points, auto-approval thresholds) and `margin_verdict` (evaluation receipt, inputs, breakdown, verdict status, safer alternative).
3. **State Machine:**
   `DRAFT` → `VALIDATED` → `POLICY_CHECKED` → (`APPROVED` | `NEEDS_APPROVAL` | `REJECTED`)
   `TIMEOUT` → `UNKNOWN` → `RECONCILING` → `DEAD_LETTER`
4. **Commands & Events:**
   - Command: `livepilot.v1.margin.evaluation.request` → `livepilot.v1.margin.evaluation.reply`
   - Events: `livepilot.v1.margin.verdict.recorded` (DLQ: `livepilot.v1.margin.verdict.recorded.dlq`)
   - Listeners: `livepilot.v1.catalog.product.updated` (re-evaluation trigger)
5. **Zero-Float Invariant:** All calculations in integer minor units and basis points ($1\% = 100 \text{ bps}$).
6. **Error Codes:** Map to LP04xxx series in error registry.

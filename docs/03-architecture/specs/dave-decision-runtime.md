# DAVE Decision Runtime & Visual Fidelity Specification

**Location:** `docs/03-architecture/specs/dave-decision-runtime.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Specification  

---

## 🏛️ Context & Framework Invariant

All goals producing DAVE decisions, visual references, UI/UX specifications, frontend components, or game assets **MUST** adhere to the typed decision schema, first-class reference evidence specifications, and 8-layer visual fidelity acceptance criteria.

---

### Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / Intent intake | Validated schema input | Transition to `State::Pending` | Reject with 400 Bad Request |
| `State::Pending` | Authorization & Pre-flight check | Auth & rate-limit valid | Transition to `State::Processing` | Return 401 Unauthorized / 429 |
| `State::Processing` | Domain execution / Port call | Invariant: Zero float math | Transition to `State::Success` | Trigger Saga Compensation rollback |
| `State::Success` | Event published / Response emitted | 100% concrete types | Disburse / Persist outcome | Audit ledger entry written |
| `State::DisputeFrozen` | Customer dispute / Holdback trigger | 14-day warranty window | Freeze release daemon | Human review gate / Credit note |

### DAVE SYSTEM 1 Decision Runtime State Machine (11 Stages)

$$\text{INTENT\_RECEIVED} \to \text{CONTEXT\_COLLECTED} \to \text{REFERENCES\_VERIFIED} \to \text{EXPERTS\_SELECTED} \to \text{DECISIONS\_GENERATED} \to \text{CONFLICTS\_RESOLVED} \to \text{CONFIDENCE\_CALIBRATED} \to \text{ROUTED} \to \text{EXECUTED} \to \text{VERIFIED} \to \text{LEARNED}$$

| State | Preconditions | Guards / Invariants | Outbound Side Effect | Failure Action | Audit Record |
|---|---|---|---|---|---|
| `INTENT_RECEIVED` | Goal card allocated | Valid intent payload | Transition to `CONTEXT_COLLECTED` | Reject malformed intent | Log intent receipt |
| `CONTEXT_COLLECTED` | Active goal workspace loaded | Allowed touch map bound | Transition to `REFERENCES_VERIFIED` | Missing files halt | Log context hash |
| `REFERENCES_VERIFIED` | Declared reference IDs | Content hash == `sha256:[a-f0-9]{64}` | Transition to `EXPERTS_SELECTED` | Fail-closed lock | Append reference receipt |
| `EXPERTS_SELECTED` | Decision type identified | Registered in DAVE expert registry | Transition to `DECISIONS_GENERATED` | Defer to human review | Record expert mapping |
| `DECISIONS_GENERATED` | Domain expert input ready | Valid typed decision schema | Transition to `CONFLICTS_RESOLVED` | Schema invalid halt | Record candidate decisions |
| `CONFLICTS_RESOLVED` | Multi-expert outputs | Consensus or explicit trade-off | Transition to `CONFIDENCE_CALIBRATED` | Unresolved -> Human review | Record conflict matrix |
| `CONFIDENCE_CALIBRATED` | Raw model output | Confidence $c \in [0.0, 1.0]$ | Transition to `ROUTED` | Non-finite reject | Log calibration score |
| `ROUTED` | Risk $\times$ Evidence $\times$ Confidence | Route $\in \{\text{proceed}, \text{verify}, \text{defer}, \text{human\_review}\}$ | Transition to execution or review | Fail-closed block | Route decision logged |
| `EXECUTED` | Route == `proceed` or approved | Zero mocks, touch map confined | Transition to `VERIFIED` | Rollback working tree | Execution receipt written |
| `VERIFIED` | Code emitted / modified | 9 DAVE verification harnesses green | Transition to `LEARNED` | Quarantine & rollback | Proof receipt emitted |
| `LEARNED` | Verified outcome recorded | Logarithmic score + 10x penalty | Export to RLCD dataset | Training quarantine | Append to `decisions.jsonl` |

---

### DAVE Typed Decision Specification

```yaml
dave_decision:
  decision_id: "DAVE-UX-0001" # Format: DAVE-[DOMAIN]-[0-9]{4}
  decision_type: "ux_ui_design"
  goal_id: "G-WEB-001"
  summary: "[Concise auditable decision statement; zero hidden chain-of-thought]"
  confidence: 0.9200 # Calibrated in [0.0, 1.0]; confidence < 0.85 requires human_action: approve
  risk: "medium" # low | medium | high; high risk requires human_action: approve
  evidence_verified: true
  route: "proceed" # proceed | verify | defer | human_review
  execution_permission: "permitted"
  evidence:
    - "[Approved token file, architecture blueprint, or schema contract]"
  references:
    - "REF-0001" # Content-addressed reference ID with verified SHA-256 hash
  assumptions:
    - "[Explicit design or execution assumption]"
  alternatives:
    - proposal: "[Concrete alternative considered]"
      rejection_reason: "[Explicit technical or design rationale for rejection]"
  verification_plan:
    - "visual-regression"
    - "token-guardrail"
  human_action: "none"
  execution_policy: "autonomous_proceed"
```

---

### First-Class Reference Evidence Specification

```yaml
dave_references:
  - reference_id: "REF-0001"
    type: "image" # text | image | audio | design_file | code_diff | test_result
    purpose: "visual_layout_reference"
    uri: "docs/02-product/design/reference/dashboard.png"
    content_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    viewport:
      width: 1440
      height: 900
    device_pixel_ratio: 1
    font_environment:
      family: "Inter"
      locked: true
    source: "human_uploaded"
    authority: "approved_design_reference"
```

---

### Bounded Visual Fidelity & 8-Layer Acceptance Thresholds

```yaml
visual_fidelity:
  thresholds:
    pixel_diff_ratio: 0.0050 # Max allowed pixel diff 0.50%
    layout_shift: 0 # Zero cumulative layout shift (CLS = 0)
    horizontal_overflow: false # Zero horizontal overflow across supported viewports
    text_overflow: false # Zero clipped text
    accessibility: "wcag_2_2_aa" # WCAG 2.2 AA compliant focus & contrast
  acceptance_layers:
    - "Layer 1: DOM structure"
    - "Layer 2: layout geometry"
    - "Layer 3: typography"
    - "Layer 4: colors and tokens"
    - "Layer 5: image crop and assets"
    - "Layer 6: interaction states"
    - "Layer 7: motion frames"
    - "Layer 8: accessibility"
  supported_viewports:
    - width: 1440
      height: 900
      name: "desktop"
    - width: 1024
      height: 768
      name: "tablet"
    - width: 390
      height: 844
      name: "mobile"
```

---

### RLCD Calibration & Trajectory Recording Contract

```yaml
rlcd_trajectory:
  ledger: ".agents/audit/decisions.jsonl"
  scoring_rule: "strictly_proper_logarithmic"
  asymmetric_penalty:
    false_acceptance_multiplier: 10.0 # 10x penalty for confident errors (c^2 * 10)
    false_deferral_multiplier: 1.0
  export_target: "artifacts/rlcd/train_dataset.jsonl"
```

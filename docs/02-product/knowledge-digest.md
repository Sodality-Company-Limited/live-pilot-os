# Knowledge digest

> **Distilled signal from discovery — not a transcript.**  
> Agent updates via [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — **IDs must match** [knowledge-map.json](knowledge-map.json).

**Rule:** If this file grows like meeting minutes, re-distill. Target ~20% of conversation volume.

Every row links to **Evidence** (`E-xxx`) — answer *"สรุปจากอะไร?"* six months later.

---

## Categories

| Category | ID prefix | Map key |
|----------|-----------|---------|
| **Pain** | P-xxx | `pain[]` |
| **Assumption** | A-xxx | `assumptions[]` + [assumptions.md](assumptions.md) |
| **Constraint** | C-xxx | `constraints[]` |
| **Decision needed** | — | → PDR/ADR when resolved |
| **Risk** | R-xxx | `risks[]` |

**Confidence:** `high` · `medium` · `low` — see [knowledge-map.README.md](knowledge-map.README.md)

---

## Discovery coverage (mirror)

> Agent maintains authoritative `%` in `knowledge-map.json` → `coverage`. Copy latest here for human scan.

| Area | % | Blockers |
|------|---|----------|
| Business | 33 | Hackathon audience and evaluation expectations not captured; commercial model is out of scope |
| Users | 100 | — |
| Workflow | 0 | Current workflow and handoffs not documented |
| Pain | 100 | — |
| Dream | 67 | No threshold for chat-intent accuracy or Host suggestion usefulness |
| Scope | 100 | — |
| Boundary | 33 | Other Hackathon demo scope boundaries are not captured |
| Success | 83 | AI confidence criteria for interest and discount recommendations are not defined |
| Constraints | 100 | — |

Command agent: **`coverage`**

---

## Conflicts

Sync with `knowledge-map.json` → `conflicts[]` (`CF-xxx`). **Open conflict blocks promote.**

| ID | Topic | Summary | Status |
|----|-------|---------|--------|
| [CF-001](knowledge-map.json) | Promotion after approval | User clarified that Live Ops approval triggers simulated issuance, superseding the earlier approval-only interpretation. | resolved |

---

## Evidence log

| ID | Type | Title | Date | Source |
|----|------|-------|------|--------|
| [E-001](knowledge-map.json) | interview | Live OS problem and demo outcome confirmed | 2026-11-20 | human:user |
| [E-002](knowledge-map.json) | interview | Hackathon demo-first direction | 2026-11-20 | human:user |
| [E-005](knowledge-map.json) | interview | Discovery scope is limited to the Hackathon | 2026-11-20 | human:user |
| [E-006](knowledge-map.json) | interview | Hackathon demo should show speech-context analysis and promotion recommendations | 2026-11-20 | human:user |
| [E-007](knowledge-map.json) | interview | Promotions should be proposed before they are issued | 2026-11-20 | human:user |
| [E-008](knowledge-map.json) | interview | Live Ops decides whether a promotion recommendation is accepted | 2026-11-20 | human:user |
| [E-009](knowledge-map.json) | interview | The Hackathon demo ends at the Live Ops approval result | 2026-11-20 | human:user |
| [E-010](knowledge-map.json) | interview | Hackathon promotion recommendation uses a 10% minimum margin floor | 2026-11-20 | human:user |
| [E-011](knowledge-map.json) | interview | The 10% promotion floor is a margin threshold | 2026-11-20 | human:user |
| [E-012](knowledge-map.json) | interview | Margin calculation includes product cost, discount, and platform fees | 2026-11-20 | human:user |
| [E-013](knowledge-map.json) | interview | Margin is measured against net sales after discount | 2026-11-20 | human:user |
| [E-014](knowledge-map.json) | interview | Promotion interest should be evaluated relative to the live audience | 2026-11-20 | human:user |
| [E-015](knowledge-map.json) | interview | Use a two-minute unique-viewer interest ratio for the demo | 2026-11-20 | human:user |
| [E-016](knowledge-map.json) | interview | Host receives talking points and composes their own response | 2026-11-20 | human:user |
| [E-017](knowledge-map.json) | interview | Host should see the promotion recommendation while Live Ops reviews it | 2026-11-20 | human:user |
| [E-018](knowledge-map.json) | interview | Live Ops approval triggers simulated promotion issuance | 2026-11-20 | human:user |
| [E-019](knowledge-map.json) | interview | Show the approved promotion as a viewer-facing message in the mock live | 2026-11-20 | human:user |
| [E-020](knowledge-map.json) | interview | AI should recommend the discount amount for the Hackathon scenario | 2026-11-20 | human:user |
| [E-021](knowledge-map.json) | interview | AI should choose a demand-appropriate discount, not automatically maximize it | 2026-11-20 | human:user |
| [E-022](knowledge-map.json) | interview | Use shampoo as the Hackathon demo product | 2026-11-20 | human:user |
| [E-023](knowledge-map.json) | interview | Use a fictional shampoo brand and mock product data | 2026-11-20 | human:user |
| [E-024](knowledge-map.json) | other | Synthetic shampoo catalog values generated for the Hackathon demo | 2026-11-20 | agent:codex |
| [E-025](knowledge-map.json) | other | Synthetic two-minute audience-interest sample for the shampoo demo | 2026-11-20 | agent:codex |
| [E-026](knowledge-map.json) | interview | Use a 15% discount as the mock AI recommendation for the sample scenario | 2026-11-20 | human:user |
| [E-027](knowledge-map.json) | interview | Host view should show product details as well as audience signals | 2026-11-20 | human:user |
| [E-028](knowledge-map.json) | interview | Host product card shows name/size, selling points, usage, price, and stock | 2026-11-20 | human:user |
| [E-029](knowledge-map.json) | interview | Reduce the proposed discount until it meets the 10% margin floor | 2026-11-20 | human:user |
| [E-030](knowledge-map.json) | interview | Show Live Ops the original and adjusted discount | 2026-11-20 | human:user |
| [E-031](knowledge-map.json) | interview | Explain why the discount was adjusted | 2026-11-20 | human:user |
| [E-032](knowledge-map.json) | interview | Show margin before and after discount adjustment | 2026-11-20 | human:user |
| [E-033](knowledge-map.json) | interview | Show Host when Live Ops rejects a promotion | 2026-11-20 | human:user |
| [E-034](knowledge-map.json) | interview | Show the rejection reason to the Host | 2026-11-20 | human:user |
| [E-035](knowledge-map.json) | interview | Make the Live Ops rejection reason optional | 2026-11-20 | human:user |
| [E-036](knowledge-map.json) | interview | End the rejected promotion flow without an automatic alternative | 2026-11-20 | human:user |
| [E-037](knowledge-map.json) | document | Existing LivePilot feature document specifies time-limited coupons and a Host countdown | 2026-11-20 | document:repo |
| [E-038](knowledge-map.json) | interview | Show the discounted price in the viewer-facing promotion | 2026-11-20 | human:user |
| [E-039](knowledge-map.json) | interview | Expire the promotion when the live session ends | 2026-11-20 | human:user |
| [E-040](knowledge-map.json) | interview | Mock the countdown without connecting to a live platform | 2026-11-20 | human:user |
| [E-041](knowledge-map.json) | interview | Keep the countdown demo brief | 2026-11-20 | human:user |
| [E-042](knowledge-map.json) | interview | Keep separate work views for Host and Live Ops | 2026-11-20 | human:user |
| [E-043](knowledge-map.json) | interview | Show Host interest, clicks, add-to-cart, price, and stock metrics | 2026-11-20 | human:user |

---

## Sessions

### Session template

```markdown
### YYYY-MM-DD — {topic or step range}

**Evidence created:** E-001 (interview, human:user)

| Category | ID | Insight | Evidence | Confidence | Step | Promoted to |
|----------|-----|---------|----------|------------|------|-------------|
| Pain | P-001 | … | E-001 | low | 3 | — |
```

---

### 2026-11-20 — Live OS pain and success

**Evidence created:** E-001 (interview, human:PO)

| Category | ID | Insight | Evidence | Confidence | Step | Promoted to |
|----------|-----|---------|----------|------------|------|-------------|
| Pain | P-001 | Host and Live Ops lack a shared view of chat questions, product interest, and offer checks during a live session. | E-001 | low | 3 | — |
| Success | — | Demo shows chat → audience topic/product signal → Live Ops offer decision → corresponding Host cue in one shared scenario. | E-001 | low | 7 | — |

Start: **`discover`** — [knowledge-loop.md](../06-workflows/knowledge-loop.md)

### 2026-11-20 — Hackathon scope

**Evidence created:** E-002, E-005 (interview, human:user)

| Category | ID | Insight | Evidence | Confidence | Step | Promoted to |
|----------|-----|---------|----------|------------|------|-------------|
| Constraint | C-001 | Current discovery and product scope is limited to the Hackathon demo; post-event product planning, commercial customer validation, and revenue model are out of scope. | E-002, E-005 | low | 6 | — |

The user explicitly redirected discovery to the Hackathon only. Future business and revenue questions are excluded from this discovery.

### 2026-11-20 — Hackathon demo success

**Evidence created:** E-006, E-007, E-008, E-009, E-010, E-011, E-012, E-013, E-014, E-015, E-016, E-017, E-018, E-019, E-020, E-021, E-022, E-023, E-026, E-027, E-028, E-029, E-030, E-031, E-032, E-033, E-034, E-035, E-036, E-038, E-039, E-040, E-041, E-042, E-043 (interview, human:user); E-024, E-025 (generated mock fixtures); E-037 (document, repo)

| Category | ID | Insight | Evidence | Confidence | Step | Promoted to |
|----------|-----|---------|----------|------------|------|-------------|
| Success | — | Shampoo demo shows AI grouping promotion interest relative to the live audience, showing Host product details and talking points to phrase independently, and recommending a demand-appropriate discount. In the mock sample, it recommends 15% off at 12% viewer interest, yielding 46.7% margin before Live Ops approval and simulated issuance to viewers. | E-006, E-010, E-014, E-015, E-016, E-018, E-019, E-020, E-021, E-022, E-024, E-025, E-026, E-027, E-028 | low | 7 | — |
| Constraint | C-002 | Recommend a promotion only when (sales after discount − product cost − platform fees) ÷ sales after discount is at least 10%. | E-006, E-010, E-011, E-012, E-013 | low | 7 | — |
| Constraint | C-003 | Send promotion recommendations to Live Ops first; approval immediately triggers simulated issuance to viewers, while rejection does not issue it. | E-007, E-008, E-018 | low | 5 | — |
| Constraint | C-004 | For the demo, calculate the rolling two-minute ratio of unique viewers asking about the same product/promotion to average concurrent viewers; AI groups equivalent questions and shows the ratio/trend rather than triggering from raw message count. | E-014, E-015 | low | 5 | — |
| Constraint | C-005 | Give the Host concise talking points to phrase independently, not a ready-to-say script. | E-016 | low | 5 | — |
| Constraint | C-006 | Show the recommendation as pending in the Host view; after approval-triggered simulated issuance, show it as approved. | E-017, E-018 | low | 5 | — |
| Constraint | C-007 | After Live Ops approves, show the simulated issued promotion as a viewer-facing banner on the mock live video/chat, including product, discount, discounted price, and a mocked countdown to the end of the live; no real platform connection is required. | E-019, E-038, E-039, E-040 | low | 5 | — |
| Constraint | C-008 | AI recommends a demand-appropriate discount based on viewer-interest ratio and product economics, not the maximum. If the proposed discount would breach the 10% margin floor, reduce it until it meets the floor, then send it to Live Ops for approval. | E-010, E-011, E-012, E-013, E-020, E-021, E-029 | low | 5 | — |
| Constraint | C-009 | Use fictional shampoo and simulated catalog values in the Hackathon demo; do not present the fixture as real product or platform data. | E-022, E-023, E-024 | low | 5 | — |
| Assumption | A-004 | Mock catalog: fictional 400 mL shampoo, THB 299 list price, THB 105 product cost, and 12% platform fee on net sales after discount. | E-024 | low | 5 | — |
| Assumption | A-005 | Mock audience: 250 average concurrent viewers; 30 unique viewers ask about a shampoo promotion in two minutes across 47 related messages (12% viewer share). | E-025 | low | 5 | — |
| Assumption | A-006 | For the short Hackathon demo, start the simulated live countdown at 3 minutes; coupon expiry follows the end of that mock live. | E-039, E-040, E-041 | low | 5 | — |
| Constraint | C-010 | For this synthetic shampoo case only, mock AI recommends 15% off at 12% viewer interest; calculated margin is 46.7%. It is not a fixed discount rule. | E-024, E-025, E-026 | low | 5 | — |
| Constraint | C-011 | Show product name and size, selling points, usage, price, and stock from the mock catalog in the Host view alongside audience-interest summaries and talking points. | E-027, E-028 | low | 5 | — |
| Constraint | C-012 | When AI adjusts a discount to meet the 10% margin floor, show Live Ops the original and adjusted discounts, explain why it changed, and show the margin for both versions. | E-029, E-030, E-031, E-032 | low | 5 | — |
| Constraint | C-013 | If Live Ops rejects a promotion, show the Host that it was not approved, include the reason if Live Ops provided one (reason is optional), do not issue the promotion, and end the flow without automatically generating an alternative. | E-008, E-033, E-034, E-035, E-036 | low | 5 | — |
| Constraint | C-014 | Treat the approved mock promotion as a time-limited coupon that expires when the live session ends; show the Host a countdown when it is released. | E-037, E-039 | low | 5 | — |
| Constraint | C-015 | When the approved mock coupon is released, reserve the simulated stock; if it expires at the end of the live session without a completed purchase, return the reserved stock. | E-037, E-039 | low | 5 | — |
| Constraint | C-016 | Provide separate working views for the Host and Live Ops. | E-042 | low | 5 | — |
| Constraint | C-017 | Show the Host the current audience interest count, product clicks, add-to-cart count, product price, and stock. | E-043 | low | 5 | — |

This remains a qualitative outcome; chat-analysis accuracy, Host-suggestion usefulness, and the profitability threshold have not been confirmed.

---

## Promotion log

| Date | ID | Insight | Destination |
|------|-----|---------|-------------|
| *(none)* | — | — | — |

---

## Related

- [knowledge-map.json](knowledge-map.json) · [knowledge-map.README.md](knowledge-map.README.md)
- [assumptions.md](assumptions.md)
- [project-brief.md](project-brief.md)

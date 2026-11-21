# Assumptions register

> Agent maintains via [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — sync with `knowledge-map.json` → `assumptions[]`.  
> **Rule:** Open + **low** confidence assumptions block goals → `ready`.

## How to use

| Status | Meaning | Next action |
|--------|---------|-------------|
| `open` | Believed but unproven | Add evidence or run **Validation needed** |
| `validated` | Confirmed with evidence | Promote to brief/goal — remove row; update map |
| `invalidated` | Evidence contradicts | PDR + brief Out of Scope — remove row |

## Confidence

| Level | Meaning | Agent |
|-------|---------|-------|
| **low** | 0–1 evidence, inferred | Must ask; block critical-path `ready` |
| **medium** | 2+ evidence or partial check | Human sign-off for `ready` |
| **high** | Validated — ready to promote | Move to brief/goal |

---

## Active assumptions

| ID | Assumption | Confidence | Evidence | Validation needed | Status |
|----|------------|------------|----------|-------------------|--------|
| [A-004](knowledge-map.json) | Mock catalog: fictional 400 mL shampoo, THB 299 list price, THB 105 product cost, and 12% platform fee on net sales after discount. | low | E-024 | Confirm the synthetic values are suitable for the demo; do not present them as real product data or actual platform pricing. | open |
| [A-005](knowledge-map.json) | Mock audience: 250 average concurrent viewers; 30 unique viewers ask about a shampoo promotion in two minutes across 47 related messages (12% viewer share). | low | E-025 | Confirm the synthetic sample supports a clear Hackathon demonstration; it is not real audience analytics. | open |
| [A-006](knowledge-map.json) | For the short Hackathon demo, start the simulated live countdown at 3 minutes; coupon expiry follows the end of that mock live. | low | E-039, E-040, E-041 | Confirm that a 3-minute countdown is the right short demo duration; this is a mock timer, not platform data. | open |

---

## Closed (archive)

| ID | Assumption | Outcome | Evidence | Date | Promoted to |
|----|------------|---------|----------|------|-------------|
| *(none)* | — | — | — | — | — |

---

## Related

- [knowledge-map.json](knowledge-map.json)
- [knowledge-digest.md](knowledge-digest.md)
- [knowledge-loop.md](../06-workflows/knowledge-loop.md)

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
| Business | 0 | Vision, customers, and revenue model not captured |
| Users | 0 | Primary persona details not captured |
| Workflow | 0 | Current workflow and handoffs not documented |
| Pain | 100 | — |
| Dream | 0 | Future-state journey not captured |
| Scope | 0 | Project brief scope is empty |
| Boundary | 0 | Project brief out-of-scope is empty |
| Success | 100 | — |
| Constraints | 0 | Product constraints not recorded in the knowledge map |

Command agent: **`coverage`**

---

## Conflicts (open)

Sync with `knowledge-map.json` → `conflicts[]` (`CF-xxx`). **Open conflict blocks promote.**

| ID | Topic | Summary | Status |
|----|-------|---------|--------|
| *(none)* | — | — | — |

---

## Evidence log

| ID | Type | Title | Date | Source |
|----|------|-------|------|--------|
| [E-001](knowledge-map.json) | interview | Live OS problem and demo outcome confirmed | 2026-11-20 | human:user |

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
| Pain | P-001 | Host and Live Ops lack a shared view of chat questions, product interest, and offer checks during a live session. | E-001 | low | 3 | G-UX-041 |
| Success | — | Demo shows chat → audience topic/product signal → Live Ops offer decision → corresponding Host cue in one shared scenario. | E-001 | low | 7 | G-UX-041 |

Start: **`discover`** — [knowledge-loop.md](../06-workflows/knowledge-loop.md)

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

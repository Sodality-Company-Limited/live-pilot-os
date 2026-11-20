---
name: soda-iso29110
version: "1.2.0"
description: >-
  Generate all 23 ISO/IEC 29110 SoftWare Basic Profile work products for client
  delivery from soda-os SSOT. Templates under docs/08-iso29110/. Types: doc,
  link (ClickUp/GitHub/IP), register (WP14), derived (WP20 from WP19).
  Consumer MCPs (named in mcp-register.yaml, not shipped): ClickUp, Google
  Drive, Google Docs, Figma, Chrome browser. Triggers: iso scan, iso generate
  WP01-WP23|wave-a|wave-b|wave-c|wave-d|all, iso screenshots, iso publish,
  iso validate, iso status. Output under work-products/. Human approves baselines.
---

# ISO/IEC 29110 — all 23 work products (client delivery)

**Model:** soda-os SSOT → `_meta` → fill templates → `work-products/` → validate → human approve

| Resource | Path |
|----------|------|
| Manifest + templates | [`docs/08-iso29110/`](../../../docs/08-iso29110/README.md) |
| Wave A detail map | [wave-a-mapping.md](wave-a-mapping.md) |
| Full catalog | [wp-catalog.md](wp-catalog.md) |
| Output | [`work-products/`](../../../work-products/README.md) |

## First principles

| Principle | Meaning |
|-----------|---------|
| **All 23 are in scope** | Every WP has a template and a generate path (doc, link, register, or derived) |
| **Not every WP is a long doc** | WP03/04 = ClickUp; WP11/15 = GitHub; WP12 = backup IP/path; WP14 = artifact register; WP20 = graph/summary from WP19 |
| **ID chain** | WP02 F-xx → WP13 REQ-xxx → WP19 TC-xxx → WP21 RTM; WP20 tallies WP19 |
| **Order** | Follow `generation_order` in the manifest (and `depends_on`) |
| **No invented commercial / URL facts** | Ask or `TODO` for ClickUp URLs, IPs, budgets, signatures |
| **No invented screenshots** | WP18 (and other figure slots) need a **named** Chrome browser MCP + staging/local URL — do not fake UI or guess the server |
| **Five MCPs, consumer-named** | ClickUp · Google Drive · Google Docs · Figma · Chrome — names live in `mcp-register.yaml`. OS does not ship servers |
| **Human gates** | Agent → `draft`; human → `in_review` / `approved` / `baseline`. Drive/Docs/ClickUp **writes** only on `iso publish` |

## Output types

| Type | WPs | How to generate |
|------|-----|-----------------|
| **doc** | WP01,02,05–10,13,16–19,21–23 | Fill `.template.md` from SSOT + context |
| **link** | WP03,04,11,12,15 | Fill thin register from `_meta` URL/IP fields |
| **register** | WP14 | Artifact table (repo/build/release) |
| **derived** | WP20 | Read WP19 rows → summary counts + Mermaid pie; same evidence set |

## Resolve paths

```text
manifest = docs/08-iso29110/template-manifest.yaml
input    = docs/08-iso29110/templates/{folder}/{template_file}
output   = work-products/{folder}/WP{nn}-{Basename}.md
# Example: Agreement.template.md → WP02-Agreement.md
```

## Commands

| Trigger | Action |
|---------|--------|
| `iso scan` | Update context + links + `mcp-register.yaml` + screenshot register; list HUMAN gaps |
| `iso generate WPnn` | One WP if deps satisfied; read named MCPs (never guess) |
| `iso generate wave-a` | WP02, WP10, WP13 |
| `iso generate wave-b` | WP09,16,15,05,11,19,21,23,14,20 |
| `iso generate wave-c` | WP08,18,06,12,17 |
| `iso generate wave-d` | WP22, WP01 |
| `iso generate event` | Prompt which: WP03 / WP07 / WP04 (need meeting notes or URLs) |
| `iso generate all` | Full `generation_order` then remind event WPs |
| `iso screenshots` | Chrome browser MCP → `_assets/screens/` |
| `iso publish` | Human-gated write: Drive folder + Docs copies + optional ClickUp tasks |
| `iso validate` / `iso validate all` | All present WPs + link fields + ID chain + screenshot placeholders + MCP names |
| `iso status` | Status table |
| `iso refresh WP13` \| `WP19` \| `WP20` | Regen from SSOT / WP19; keep sign-off unless force |

## Lifecycle

### 1 — `iso scan`

Read brief, snapshot, overview, git remote, design docs.  
Write `_meta/project-context.yaml` and sync `_meta/links-register.yaml`.  
Sync `_meta/mcp-register.yaml` from known URLs / IDs (never invent). Copy `chrome_browser.mcp_named` + `preview_url` into `screenshot-register.yaml`.  
Sync `_meta/screenshot-register.yaml`: seed `shots[]` from F-xx / UX docs if empty.  
Report empty **link** fields: ClickUp CR/defect, `repository_url`, components URL, `backup_server`/`backup_path`.  
Report empty **MCP** names in `mcp-register.yaml` (all five) unless `waived`.  
Report empty **screenshot** fields when any screenshot WP will be generated: `preview_url`, `mcp_named`.

### 2 — Generate by type

**doc:** Load template → replace `{{placeholders}}` → fill sections per [wp-catalog.md](wp-catalog.md) / [wave-a-mapping.md](wave-a-mapping.md) → write output → status `draft`.

**link:** Require `link_field` (or documented fallback) non-empty or mark `TODO` visibly → write thin register → update `links-register.yaml`.

**register (WP14):** Fill artifact table from context release/repo URLs.

**derived (WP20):** Parse WP19 Status column → fill summary + Mermaid pie counts → list open fails → link WP04 for defects.

**screenshots (WP18 required; WP16/08/06/05/01 when they still have figure slots):** see [Screenshots via browser MCP](#screenshots-via-browser-mcp) below. Do not leave `***[Insert diagram or screenshot here]***` in a client-ready WP18.

### 3 — Waves (recommended)

```text
wave-a  → sellable core (Agreement, Plan, Requirements)
wave-b  → design, repo links, test, verify, software register, test report
wave-c  → ops docs, backup link, Software Product (23-row register)
wave-d  → validation + acceptance (human-heavy)
event   → CR / meeting / corrections when they happen
```

### 4 — `iso validate` (full package)

Fail if any apply:

| Check | Rule |
|-------|------|
| Count | All 23 have an output file **or** explicit waived event WP with status note |
| Placeholders | No stray `{{…}}` / unreplaced `[bracket prompts]` in committed drafts |
| WP02 | No `REQ-` in Agreement |
| Chain | WP13 F set = WP02 F set; each F ≥1 REQ; WP19 covers REQs; WP21 links REQ↔TC |
| Links | WP03/04/11/12/15 have URL/IP filled or labeled TODO |
| MCPs | `mcp-register.yaml` has `mcp_named` (or `waived`) for ClickUp, Drive, Docs, Figma, Chrome |
| Screenshots | WP18 (and other screenshot WPs marked in the register) have no leftover `Insert diagram or screenshot` unless the matching shot is `waived` |
| WP20 | Summary exists and references WP19; graph counts match tallies when numbers present |
| WP17 | Table lists all 23 with pointers |

Event WPs (WP03/07/04): if never occurred, status may stay `missing` with note `not_applicable_yet` — still document in WP17 as “n/a / tool URL pending”. For **client delivery package complete**, prefer generating link registers with URLs even before first CR.

### 5 — Human approve

Signatures and `approved`/`baseline` = human only (especially WP02, WP01).

## SSOT cheat sheet (beyond Wave A)

| WP | Primary soda-os / meta sources |
|----|--------------------------------|
| WP05 | overview, stack rules, deploy docs |
| WP06 | ops notes, backup fields, WP05 |
| WP07 | meeting agenda/notes from human (event) |
| WP08 | overview + WP16 |
| WP09 | goals queue + schedule_link / WP10 phases |
| WP11 | `repository_url` / git remote |
| WP12 | `backup_server`, `backup_path` |
| WP14 | release_* + repo + store URLs |
| WP15 | `components_repository_url` or monorepo paths |
| WP16 | `docs/03-architecture/`, soda-design outputs, ADRs + **Figma MCP** (read frames) |
| WP17 | all WP outputs + context + **Drive** folder pointer |
| WP18 | brief journeys + F-xx + **Chrome** screenshots (`screenshot-register.yaml`) |
| WP19 | WP13 REQ + acceptance contracts |
| WP20 | **WP19 only** (derived) |
| WP21 | WP13 + WP19 (+ design refs) |
| WP22 | UAT evidence / human + WP13/19/20 |
| WP23 | verification checklist vs WP13/16/19/21 |
| WP01 | human acceptance + **Docs** copy on `iso publish` |
| WP02/10/13 | SSOT + **Docs** formal copies on `iso publish` |
| WP03/04 | **ClickUp MCP** (read list/URLs; create only on `iso publish`) |
| WP12 | backup IP/path and/or **Drive** delivery folder |

## Consumer MCP connectors

Five tools. The **consumer** connects them. This skill says **which WP** and **when**. Names and IDs live in [`work-products/_meta/mcp-register.yaml`](../../../work-products/_meta/mcp-register.yaml). If `mcp_named` is empty → HUMAN gap. Do **not** guess the server.

| MCP | Default posture | ISO job |
|-----|-----------------|---------|
| **ClickUp** | read | WP03 CR, WP04 defects, WP07 meetings, WP09 progress — pull list/task URLs into link registers. Prefer `soda-os sync-clickup` for goal cards. **Create** task/CR only on `iso publish` |
| **Google Drive** | read | WP17 / WP14 delivery folder; optional WP12 backup pointer. **Upload** the 23-pack only on `iso publish` |
| **Google Docs** | read | Formal client copies of WP02 / WP10 / WP13 / WP01. **Create/update** Docs only on `iso publish` |
| **Figma** | read | WP16 design frames + WP15 component links. No comment / publish / rename unless **In** says so |
| **Chrome browser** | snapshot | WP18 user-guide shots (and other figure slots). Staging/local only. See below |

Human said **`iso scan`** / **`iso generate`** / **`iso screenshots`** / **`iso publish`** counts as starting the work (same class as `design G-xxx`). Still no secrets, no production, no invented names.

### `iso publish` (writes)

Only after `iso validate` is clean enough for a draft package **and** the human said **`iso publish`**:

1. ClickUp — create or refresh WP03/WP04 tasks if URLs were TODO and the list is named
2. Drive — upload / replace files in `delivery_folder_id`
3. Docs — create or update the named formal copies; write Doc URLs back into `_meta`

Drive / Docs / ClickUp writes are **forbidden** on plain `iso generate`. Generate writes Markdown under `work-products/` only.

## Screenshots via Chrome browser MCP

Several templates ship with `***[Insert diagram or screenshot here]***` — WP18 (user guide) cannot be client-ready without real screens. Use the **Chrome browser** row in `mcp-register.yaml` (copied into `screenshot-register.yaml`).

| Piece | Path |
|-------|------|
| MCP names | `work-products/_meta/mcp-register.yaml` |
| Shot list | `work-products/_meta/screenshot-register.yaml` |
| Images | `work-products/_assets/screens/{shot-id}.png` |
| Preview URL | `chrome_browser.preview_url` / `app_preview_url` |
| Which MCP | `chrome_browser.mcp_named` — never guess Chrome vs Playwright |

### When the agent may capture

All of these must be true (same class as [external-tools.md](../../../docs/06-workflows/external-tools.md)):

1. Human said **`iso screenshots`** or **`iso generate`** for a screenshot WP (WP18, or WP16/08/06/05/01 while figure slots remain)
2. `preview_url` is staging or local — not `production_url` unless a human explicitly allows it
3. `chrome_browser.mcp_named` (or `screenshot-register.mcp_named`) is set — if empty, stop and report a HUMAN gap (`iso scan`). Do not invent a server
4. No secrets, no `.env` passwords, no production customer data in MCP arguments

Figma supplies **design** frames for WP16 when `figma.mcp_named` + `file_id` are set — read-only unless **In** says otherwise. Live **app** shots for WP18 still need Chrome.

### Capture procedure

1. Load `screenshot-register.yaml`. If `shots[]` is empty, seed one row per F-xx / user-guide step from WP13 / UX docs (`docs/03-architecture/ux/`).
2. For each shot with `status: missing`: open `preview_url` + `path` on the named MCP → snapshot / screenshot → write `work-products/_assets/screens/{id}.png` → set `status: captured`.
3. In the WP markdown, replace the matching placeholder with:

   `![{title}](../../_assets/screens/{id}.png)`

4. `waived` only when the human says that figure is n/a (e.g. no UI for that WP). Record the reason on the shot row.
5. Missing MCP or URL → leave the placeholder, mark `TODO` in the register, do **not** draw fake UI or drop stock images.

`iso generate WP18` runs this procedure before considering the WP draft complete.

## Governance

| Agent may | Agent must not |
|-----------|----------------|
| Create/update all `work-products/**` drafts | Overwrite living `docs/02-product/**` |
| Fill link registers from known remotes/URLs | Invent ClickUp/IP/budget/signatures or MCP names |
| Read ClickUp / Drive / Docs / Figma / Chrome when `mcp_named` is set | Guess which MCP; use production; paste secrets |
| Capture screens into `_assets/screens/` with the **named** Chrome MCP | Fake UI or stock images |
| `iso publish` writes to Drive / Docs / ClickUp after human asks | Write to Drive / Docs / ClickUp on plain `iso generate` |
| Derive WP20 from WP19 | Maintain a second disconnected TC list in WP20 |
| `iso validate` | Self-approve `baseline` |

## Definition of done — full 23 draft package

- [ ] `iso generate all` (or waves A–D) completed  
- [ ] `mcp-register.yaml`: ClickUp, Drive, Docs, Figma, Chrome named or waived  
- [ ] Screenshot WPs: WP18 shots captured (or waived) via named Chrome MCP; placeholders gone  
- [ ] Link WPs (03,04,11,12,15) point at real URLs/IP or explicit TODO  
- [ ] Optional: human said `iso publish` → Drive folder + Docs copies updated  
- [ ] WP14 register filled for current release  
- [ ] WP20 derived from WP19 with summary + graph  
- [ ] WP17 lists all 23  
- [ ] `iso validate all` passes  
- [ ] Human reviewed WP02 / WP13 / WP01 path  

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.2.0 | 2026-09-23 | Five consumer MCPs: ClickUp, Drive, Docs, Figma, Chrome — `mcp-register.yaml` + `iso publish` |
| 1.1.0 | 2026-09-23 | Screenshot WPs use consumer browser MCP; `iso screenshots` + `screenshot-register.yaml` |
| 1.0.0 | 2026-08-05 | Full 23 WPs; link/register/derived types; waves A–D + event |
| 0.2.0 | 2026-08-04 | Templates in-repo; Wave A only |
| 0.1.0 | 2026-08-04 | Initial draft |

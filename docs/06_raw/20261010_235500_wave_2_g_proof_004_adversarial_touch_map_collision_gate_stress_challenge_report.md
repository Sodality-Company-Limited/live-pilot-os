# 🛡️ Empirical Adversarial Challenge & Stress Verification Report: Wave 2 (G-PROOF-004)

**Document Reference:** `docs/06_raw/20261010_235500_wave_2_g_proof_004_adversarial_touch_map_collision_gate_stress_challenge_report.md`  
**Milestone:** Wave 2 (G-PROOF-004: Touch-Map Collision Gate & Goal Contract Conformance)  
**Author:** `challenger_wave2_2` (Empirical Challenger & Adversarial Verifier)  
**Target Modules:**  
- [scripts/lib/touch-map-analyzer.mjs](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L1-L426)  
- [scripts/harness/touch-map-collision-gate.mjs](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/touch-map-collision-gate.mjs#L1-L207)  
**Adversarial Suite:** [tests/unit/test-touch-map-collision-gate-adversarial.mjs](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-touch-map-collision-gate-adversarial.mjs#L1-L440)  
**Date:** 2026-10-10T23:55:00Z  
**Verdict:** **REJECT** (Critical flaw identified: recursive glob pattern `**` silently discarded in markdown parser leading to fail-open concurrency safety breach)

---

## Executive Summary

Operating under the Soda OS Global Engineering Constitution (Article I: Zero Mocks, Article II: Mandatory Verification, Pillar 4: Formal Verification & Mathematical Invariants, Pillar 6: Deadlock Prevention & Concurrency Isolation), an independent adversarial stress-testing campaign was executed against the newly implemented Touch-Map Collision Gate and Path Analyzer for Wave 2 ([G-PROOF-004](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/_archived/G-PROOF-004.md#L1-L268)).

A dedicated 31-test zero-mock adversarial test suite ([test-touch-map-collision-gate-adversarial.mjs](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-touch-map-collision-gate-adversarial.mjs#L1-L440)) was authored and executed directly against the target modules. The suite probed seven hostile failure vectors:
1. **Hostile Path Pairs & Normalization Invariants (5 tests):** Verified prefix bleed boundary safety (`foo` vs `food`, `src/foo` vs `src/food`, `src/app` vs `src/apple`), Windows/Unix slash normalization (`src\lib\core.js` vs `src/lib/core.js`), redundant multi-slash collapse (`a///b` vs `a/b`), leading dot-slash normalization (`./src` vs `src`, `.\src\file.js`), and trailing slash boundary preservation.
2. **Sibling Directory Isolation vs Parent-Child Containment (2 tests):** Proved sibling isolation (`src/crates/kernel` vs `src/crates/transport`) and symmetric parent-child directory containment (`src` vs `src/crates/kernel/lib.rs`).
3. **Complex Glob Permutations (7 tests):** Proved single asterisk `*`, double asterisk `**`, extension globs `*.mjs`, character escaping for framework routes `src/pages/[id].js`, `?` single-character wildcards, and literal negative globs.
4. **Shared Tracking File Sanitization (3 tests):** Validated exact regex patterns in `SHARED_TRACKING_PATTERNS` while preventing over-filtering on non-tracking domain files.
5. **Large Touch Map Scaling & Memory Consumption (3 tests):** Evaluated $1,000 \times 1,000$ disjoint path comparisons ($1,000,000$ comparisons) in **572.65ms** with only **1.11MB** heap delta; tested 1,000 paths with single boundary collision in **571.47ms**; and tested 20 goals $\times$ 50 paths (190 pairwise checks, 475,000 comparisons) in **329.65ms**.
6. **Programmatic and CLI Concurrency Gate Invocations (7 tests):** Verified exit codes 0 and 1, `--json` structured diagnostics, `--strict` mode enforcement on empty touch maps, and certified that all 9 currently active repository goals maintain 0 collisions.
7. **Empirical Flaw Reproduction & Vulnerability Oracles (4 tests):** Identified and empirically proved three defects, including one **CRITICAL** vulnerability where recursive globs (`**`) are silently stripped from goal markdown cards, causing the collision gate to fail open.

Due to the critical defect in `parseTouchMap`, the formal verdict is declared as **REJECT**.

---

## 1. Structured Code & Architectural Evaluation (WHERE, WHY, FOR WHOM, HOW)

### 1.1 Path Normalization Engine (`normalizePath`)
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L58-L66](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L58-L66)
- **WHY:** Disparate developer platforms (Windows backslashes `\`, POSIX forward slashes `/`, redundant slashes, relative dot prefixes `./`) create false disjointness if not mapped to a canonical normal form prior to set intersection.
- **FOR WHOM:** Concurrency Gate Harness, Worktree Allocator, and Subagent Orchestrator.
- **HOW:** Converts backslashes to forward slashes, strips leading `./`, collapses consecutive slashes, and trims whitespace.

### 1.2 Boundary-Safe Collision Evaluator (`pathsCollide`)
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L153-L193](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L153-L193)
- **WHY:** Subagents executing concurrently in isolated Git worktrees must guarantee $\text{TouchMap}(G_i) \cap \text{TouchMap}(G_j) = \emptyset$. A false negative results in write-write git conflicts; a false positive stalls parallel pipeline throughput.
- **FOR WHOM:** DAG Wave Scheduler, Parallel Worktree Provisioner, and Git Index Lock Arbitrator.
- **HOW:** Evaluates exact equality, extracts base directory prefixes, tests boundary-delimited containment (`cleanB.startsWith(prefixA + '/')`), and compiles wildcard patterns to regex via `globToRegex`.

### 1.3 Markdown Touch Map Parser (`parseTouchMap`)
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L202-L268](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L202-L268)
- **WHY:** Extracts declared file write targets from Section 2 (`## Touch map`) of active goal markdown cards across `docs/07-backlog/goals/`.
- **FOR WHOM:** CLI Collision Gate Runner, Goal Lifecycle Gatekeeper.
- **HOW:** Scans markdown content for `## Touch map` heading, parses bullet lines (`-` or `*`), strips backticks and leading bullet markers, and filters out comments and placeholder lines before sanitizing via `sanitizeTouchMap`.

---

## 2. Adversarial Findings & Flaw Analysis

### Finding 1 [CRITICAL]: Silent Omission of Recursive Double-Asterisk (`**`) Globs in Markdown Parser
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L249](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L249)
- **Code Snippet:**
  ```javascript
  // scripts/lib/touch-map-analyzer.mjs:242-254
  if (
    item &&
    item !== '—' &&
    item !== '*' &&
    !item.startsWith('<!--') &&
    !item.startsWith('[Path') &&
    !item.startsWith('**') &&
    !item.includes('**') &&              // <--- CRITICAL FLAW
    !item.toLowerCase().includes('(declared on goal card)')
  ) {
    touchMap.push(item);
  }
  ```
- **Attack Scenario & Empirical Proof:**
  When a goal card specifies a recursive glob pattern under `## Touch map`:
  ```markdown
  ## Touch map
  - `docs/**`
  - `src/**/*.ts`
  ```
  `parseTouchMap` executes line 249: `!item.includes('**')`. Because `'docs/**'.includes('**')` is `true`, the condition evaluates to `false`, and the path is **silently discarded**.
  Empirical test in [test-touch-map-collision-gate-adversarial.mjs#L400-L432](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-touch-map-collision-gate-adversarial.mjs#L400-L432) demonstrates:
  - Input: `['docs/**', 'src/**/*.ts', 'src/index.ts']`
  - Parsed Output: `['src/index.ts']` (`docs/**` and `src/**/*.ts` dropped!)
- **Blast Radius & Fail-Open Breach:**
  If Goal $G_A$ claims `docs/**` and concurrent Goal $G_B$ claims `docs/guide.md`, $G_A$'s parsed touch map is empty (`[]`). The collision gate evaluates $\emptyset \cap \{\text{docs/guide.md}\} = \emptyset$ and reports:
  `✅ ALL TOUCH MAPS DISJOINT: 0 collisions detected across active goals.`
  Both goals are admitted to parallel execution, resulting in silent git conflicts and overwritten worktree changes.
- **Remediation:**
  The author intended to ignore markdown bold headers (e.g. `**Declared Files:**`), but used `!item.includes('**')` instead of checking for bold markdown wrapping. Replace lines 248–249 with:
  ```javascript
  !(item.startsWith('**') && item.endsWith('**')) &&
  ```

### Finding 2 [MEDIUM]: Intermediate Wildcard Cross-Glob Collision Bypass
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L159-L162](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L159-L162)
- **Code Snippet:**
  ```javascript
  const prefixA = cleanA.replace(/\/\*\*$/, '').replace(/\/\*$/, '').replace(/\/$/, '');
  const prefixB = cleanB.replace(/\/\*\*$/, '').replace(/\/\*$/, '').replace(/\/$/, '');
  ```
- **Attack Scenario & Empirical Proof:**
  Consider Path A: `src/crates/*/lib.rs` and Path B: `src/crates/kernel/*`. Both patterns match `src/crates/kernel/lib.rs`.
  Because `cleanA` ends with `/lib.rs`, `prefixA` is not stripped and remains `'src/crates/*/lib.rs'`.
  The prefix comparison `'src/crates/*/lib.rs'.startsWith('src/crates/kernel/')` fails (`false`), and neither glob regex matches the unexpanded asterisk in the other path. `pathsCollide` returns `false`.
- **Remediation:**
  Extract the static directory prefix before the first wildcard token:
  ```javascript
  const staticPrefixA = cleanA.split(/[*?]/)[0].replace(/\/+$/, '');
  const staticPrefixB = cleanB.split(/[*?]/)[0].replace(/\/+$/, '');
  ```

### Finding 3 [LOW]: Redundant Slash After Leading Dot-Slash (`.//src`) Normalization Order
- **WHERE:** [scripts/lib/touch-map-analyzer.mjs#L61-L65](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/touch-map-analyzer.mjs#L61-L65)
- **Code Snippet:**
  ```javascript
  return String(p)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .trim();
  ```
- **Attack Scenario & Empirical Proof:**
  Input `.//src` has `.replace(/^\.\//, '')` run before `.replace(/\/+/g, '/')`. It strips `.` and the first `/`, leaving `/src` (leading slash). As a result, `normalizePath('.//src')` yields `'/src'`, which fails to collide with `'src'`.
- **Remediation:**
  Collapse consecutive slashes before stripping leading dot-slash:
  ```javascript
  return String(p)
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim();
  ```

---

## 3. Stress Test Results Matrix

| # | Stress Test Vector | Hostile Fixtures | Expected Invariant | Empirical Result | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1.1** | Prefix Bleed Boundary Safety | `foo` vs `food`, `src/foo` vs `src/food`, `src/app` vs `src/apple` | No collision across distinct boundaries | All 5 pairs returned `false` | **PASS** |
| **1.2** | Windows vs Unix Slashes | `src\lib\core.js` vs `src/lib/core.js`, `src\crates\*` | Exact match & prefix match across slash types | All 4 pairs returned `true` | **PASS** |
| **1.3** | Redundant Slash Collapse | `a///b` vs `a/b`, `src///crates///kernel///lib.rs` | Consecutive slashes collapsed | All 5 pairs returned `true` | **PASS** |
| **1.4** | Leading Dot Slash | `./src` vs `src`, `.\src\file.js` vs `src/file.js` | Leading dot-slashes normalized | All 4 pairs returned `true` | **PASS** |
| **1.5** | Trailing Slashes | `src/dir/` vs `src/dir`, `src/dir/` vs `src/dir/file.js` | Directory boundaries preserved | All 4 pairs returned expected | **PASS** |
| **2.1** | Sibling Directory Isolation | `src/crates/kernel` vs `src/crates/transport` | Disjoint branches do not collide | All 6 pairs returned `false` | **PASS** |
| **2.2** | Parent-Child Directory Containment | `src` vs `src/crates/kernel/lib.rs` | Containment is symmetric and detected | All 4 pairs returned `true` | **PASS** |
| **3.1** | Single Asterisk Globs | `src/*` vs `src/foo.js`, `src/*.js` vs `src/sub/foo.js` | Single `*` does not cross directory slash | All 5 pairs returned expected | **PASS** |
| **3.2** | Double Asterisk Globs | `src/**/*.js` vs `src/a/b/c/foo.js`, `src/**` vs `src` | Recursive traversal matched | All 8 pairs returned expected | **PASS** |
| **3.3** | Extension Globs | `*.mjs` vs `test.mjs`, `*.mjs` vs `src/test.mjs` | Extension matched at correct directory level | All 4 pairs returned expected | **PASS** |
| **3.4** | Cross-Glob Overlaps | `src/**/*.js` vs `src/components/*.js` | Symmetric recursive overlap detected | Both returned `true` | **PASS** |
| **3.5** | Escaped Characters | `src/pages/[id].js` vs `src/pages/123.js` | Square brackets treated as literal characters | Returned `false` (no char-class bypass) | **PASS** |
| **3.6** | Single Char `?` Wildcard | `src/file?.js` vs `src/file1.js` vs `src/file10.js` | Matches exactly 1 character | Returned `true` for 1 char, `false` for 2 chars | **PASS** |
| **4.1** | Shared Tracking Filtering | `docs/00-project-snapshot.md`, `CLARIFICATION.md` | Filtered from touch maps | All 11 patterns recognized | **PASS** |
| **5.1** | Scale: 1,000 vs 1,000 Disjoint | 1,000 paths/map ($1,000,000$ comparisons) | Latency < 2000ms, Heap < 50MB | **572.65ms**, **1.11MB** heap delta | **PASS** |
| **5.2** | Scale: 1,000 vs 1,000 Colliding | Collision injected at path 999 | Detected reliably, Latency < 2000ms | **571.47ms**, caught overlap | **PASS** |
| **5.3** | Scale: 20 Goals Matrix | 20 goals $\times$ 50 paths (190 pairs) | Latency < 1500ms | **329.65ms**, clean | **PASS** |
| **6.1** | Programmatic Clean Gate | Disjoint synthetic goals | Exits 0, `pass: true` | `exitCode: 0, pass: true` | **PASS** |
| **6.2** | Programmatic Colliding Gate | Colliding synthetic goals | Exits 1, `pass: false` | `exitCode: 1, pass: false` | **PASS** |
| **6.3** | CLI Disjoint Invocation | Disjoint goal files via subprocess | Exit code 0 | Exited 0, summary printed | **PASS** |
| **6.4** | CLI Colliding Invocation | Overlapping goal files via subprocess | Exit code 1, stderr error matrix | Exited 1, collision detailed | **PASS** |
| **6.5** | CLI `--json` Output | Subprocess with `--json` | Exit 0/1 with valid JSON schema | Valid JSON parsed | **PASS** |
| **6.6** | CLI `--strict` Mode | Empty touch map goal | Exit code 1 in strict mode | Exited 1 with strict violation | **PASS** |
| **6.7** | Active Repository Goals | All 9 active goals in `docs/07-backlog/goals/` | 0 collisions across active goals | **0 collisions**, certified | **PASS** |
| **7.1** | **Vulnerability 1 Reproduction** | Markdown containing `- \`docs/**\`` | Recursive glob retained | **FAILED (Vulnerability Confirmed):** `docs/**` dropped | **BUG** |
| **7.2** | **Vulnerability 1 Fail-Open** | Goal A: `docs/**`, Goal B: `docs/guide.md` | Collision gate flags collision (exit 1) | **FAILED (Vulnerability Confirmed):** reported clean (exit 0) | **BUG** |
| **7.3** | **Vulnerability 2 Reproduction** | `src/crates/*/lib.rs` vs `src/crates/kernel/*` | Collision detected | **FAILED:** reported false | **BUG** |
| **7.4** | **Vulnerability 3 Reproduction** | `normalizePath('.//src')` | Resolves to `'src'` | **FAILED:** resolved to `'/src'` | **BUG** |

---

## 4. Conclusion & Actionable Verdict

**Final Verdict: REJECT**

While the library and CLI harness demonstrate exceptional performance (sub-600ms on 1,000,000 comparisons), robust prefix bleed prevention, and reliable CLI subprocess controls, the presence of `!item.includes('**')` on line 249 of `scripts/lib/touch-map-analyzer.mjs` represents a **critical concurrency isolation flaw**. Any active goal that touches a recursive glob pattern (`**`) will have its touch map silently stripped, causing the collision gate to fail open and allow conflicting concurrent tasks to run simultaneously.

**Required Action for Worker / Lead:**
1. Update `scripts/lib/touch-map-analyzer.mjs` line 249 to replace `!item.includes('**')` with `!(item.startsWith('**') && item.endsWith('**'))`.
2. Add a unit test in `tests/unit/test-touch-map-collision-gate.mjs` verifying that markdown containing `docs/**` and `src/**/*.ts` parses correctly and triggers collisions against child files.
3. Re-run `node --test tests/unit/test-touch-map-collision-gate-adversarial.mjs` and update proof receipt byte hashes before resubmitting for verification.

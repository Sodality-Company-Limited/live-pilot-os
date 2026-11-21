---
description: Central Ecosystem Synchronization & Cross-Project Parity Protocol
alwaysApply: true
---

# Central Ecosystem Synchronization & Cross-Project Parity Protocol

This document establishes the mandatory protocol for maintaining 100% bitwise parity, zero governance drift, and automated synchronization across all 54 downstream repositories in `/Users/batrarethsudprasert/projects` that utilize Soda OS.

---

## 1. The Central Ecosystem Synchronization Invariant

Soda OS (`/Users/batrarethsudprasert/projects/soda-os`) is the **Single Source of Truth (SSOT)** for all governance rules, autonomous agent skills, verification harnesses, shared libraries, and schema contracts across the Sodality ecosystem.

Whenever any Soda OS core framework file is updated or modified:
- Governance rules in `.agents/rules/*.md`
- Agent skills in `.agents/skills/soda-*`
- Verification harnesses in `scripts/harness/*.mjs`
- Core libraries in `scripts/lib/*.mjs`
- Schema contracts in `schemas/*.json`
- Archival and concurrency scripts in `scripts/goals/*.js`
- Canonical CLI entrypoints (`cli.js`)

The Agent MUST immediately execute the central ecosystem cross-project synchronization engine:
```bash
node ./cli.js sync-ecosystem
```
Or with first-class CLI command:
```bash
soda-os sync-ecosystem
```

---

## 2. Project Tier Taxonomy

The ecosystem synchronizer categorizes discovered repositories into distinct architectural tiers:

| Tier | Category | Target Projects | Synchronization Scope |
|---|---|---|---|
| **Tier A** | Full Goal-Driven Repositories | `sodality-aether`, `sodality-aexis`, `sodality-nextjs`, `sodality-creator-hub`, `sodality-rabbit-app`, `omni-quant-system`, `litter-green-api`, `ledgends`, `agentic-ai-use-cases` | Complete framework mirror (rules, skills, harnesses, libs, schemas, architecture guides) + automated epic queue reconciliation, project snapshot, and dashboard synchronization. |
| **Tier B** | Governed Microkernels & Domain Engines | `sodality-aecho`, `sodality-aeflux`, `sodality-aegis`, `sodality-aeonix`, `sodality-aeris`, `sodality-aethos`, `sodality-aeidolon`, `Qwen3-ASR`, `Qwen3-TTS`, `mistral.rs`, `hermes-agent`, `claude-code`, etc. (45 repos total) | Core rules, agent skills, verification harnesses, shared libraries, and schema contracts. Backlog queues are not forced unless declared. |
| **Tier C** | Extended Ecosystem Candidates | Repositories with custom `.soda-os-version` or explicit opt-in | Targeted sync based on local `framework-manifest.yml`. |

---

## 3. Dynamic Discovery & Parity Invariants

1. **Dynamic File Aggregation:**
   - The synchronizer scans Soda OS source directories dynamically, aggregating all active rules, skills, libraries, harnesses, and schemas without hardcoded omissions.
2. **Zero Drift Invariant:**
   - Files distributed from Soda OS must match the source bit-for-bit. Modifying governance rules or verification harnesses directly inside a downstream project without backporting to Soda OS is strictly prohibited.
3. **Fail-Closed Execution:**
   - If any repository synchronization encounters an I/O error, permissions failure, or schema invalidation, the synchronizer emits a detailed error report and fails with non-zero exit code.
4. **Mandatory Post-Update Trigger:**
   - Never declare completion of a Soda OS update without executing `node ./cli.js sync-ecosystem` and verifying that all 54 repositories report clean synchronization (0 errors, 0 skipped).

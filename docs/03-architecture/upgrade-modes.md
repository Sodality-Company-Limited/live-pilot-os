# Soda OS Upgrade Modes: Framework-Source vs. Downstream-Project

This document specifies the dual-mode upgrade architecture implemented in `cli.js` under Goal G-CORE-011.

---

## 1. Architectural Motivation

Soda OS serves two distinct roles:
1. **Framework Source Repository (`@sodality/soda-os`):** Owns distribution templates, standard rules, governance skills, and master verification harnesses.
2. **Downstream Application Target:** Consumes framework templates, rules, and workflows while maintaining application-specific code, missions, and goals.

Treating the framework source as an ordinary downstream project produces false drift warnings (reporting downstream scaffold files like `AGENTS.md` and `docs/07-backlog/goals.md` as missing in root) and risks instantiating downstream stubs into the framework repository.

---

## 2. Repository Kind Detection

Detection executes deterministically via `detectRepositoryKind(dir)` in `cli.js`:

```javascript
function detectRepositoryKind(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === '@sodality/soda-os' || pkg.name === 'soda-os' || pkg.repository_kind === 'framework_source') {
        return 'framework_source';
      }
    } catch {}
  }
  if (fs.existsSync(path.join(dir, 'template', 'framework-manifest.yml')) && fs.existsSync(path.join(dir, 'cli.js'))) {
    return 'framework_source';
  }
  return 'downstream_project';
}
```

---

## 3. Operational Modes

### Mode A: `framework_source` (Framework Source Integrity Mode)
- **Target:** Framework source repository.
- **Behavior:**
  - Suppresses downstream missing-file drift warnings.
  - Verifies rule count and skill count parity between root `.agents/` and `template/.agents/`.
  - Enforces 100% synchronization of framework assets.
  - Recommends master harness verification (`npm test`, `npm run test:template`).

### Mode B: `downstream_project` (Application Upgrade Mode)
- **Target:** Client applications utilizing Soda OS.
- **Behavior:**
  - Evaluates Phase 1 mechanical sync candidates against `template/framework-manifest.yml`.
  - Protects files declared in `manifest.never_touch`.
  - Identifies hybrid files declared in `manifest.merge` for Phase 2 semantic merge.
  - Emits version stamp `.soda-os-version` upon upgrade completion.

---

## 4. Verification and Invariants

- **Zero-Mock Invariant:** Executable via real filesystem inspection and subprocess invocation.
- **Sub-50ms Latency SLA:** Repository detection and parity reporting complete in sub-50ms.
- **Parity Guarantee:** Root and template copies of framework rules and skills must maintain 100% synchronization.

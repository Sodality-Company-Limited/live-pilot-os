---
name: soda-blast-radius-analyzer
description: Traces AST import/export graphs, calculates transitive blast radius sets, and enforces touch map boundary isolation.
---

# Soda Blast Radius Analyzer Skill

## Purpose
Traces static and dynamic dependencies across JavaScript/TypeScript and Node.js codebases to calculate the exact transitive impact set $B(S)$ of a planned code change. Enforces touch map containment fail-closed, ensuring that unintended downstream consumers are detected before making cross-module mutations.

## When to Use
- Before refactoring shared core libraries, contracts, or schemas (`scripts/lib/`, `schemas/`).
- Verifying that all downstream consumers impacted by a function signature change are declared in the active goal touch map.
- Analyzing repository call graphs during PR reviews or pre-commit checks.

## Commands & Workflows
```bash
# Analyze impact set via node script
node -e "
  import { buildDependencyGraph, computeTransitiveBlastRadius, verifyTouchMapContainment } from './scripts/lib/blast-radius-analyzer.mjs';
  import fs from 'node:fs';
  const fileMap = {
    'scripts/lib/foo.mjs': fs.readFileSync('scripts/lib/foo.mjs', 'utf8')
  };
  const graph = buildDependencyGraph(fileMap);
  const blast = computeTransitiveBlastRadius(['scripts/lib/foo.mjs'], graph);
  console.log(verifyTouchMapContainment(blast, ['scripts/lib/foo.mjs']));
"
```

## Invariants & Rules
1. **Zero Mocks (Article I):** All graph traversals operate on real filesystem paths and source tokens.
2. **Monotonicity (INV-033-001):** The blast radius set $B(S)$ is strictly monotonic ($S_1 \subseteq S_2 \implies B(S_1) \subseteq B(S_2)$).
3. **Soundness & Completeness (INV-033-002):** All direct and transitive importers within the repository are resolved with zero false negatives.
4. **Touch Map Containment:** If any impacted consumer is missing from the goal's declared touch map, execution halts fail-closed (`TouchMapViolation`).

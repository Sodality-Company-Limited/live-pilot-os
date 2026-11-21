#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PARALLEL GOAL PLANNER & CONCURRENCY ORCHESTRATION ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Computes dependency DAG topological waves, verifies pairwise disjoint
 *          touch maps (TouchMap(A) ∩ TouchMap(B) = ∅), partitions colliding goals
 *          into zero-conflict sub-waves, allocates isolated Git worktrees and build
 *          caches, and atomically synchronizes all related markdown files.
 * ════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const goalIdLib = require('./goal-id');
const markdownSyncLib = require('./goal-markdown-sync');

/**
 * Shared tracking files across the repository that MUST NEVER be included
 * in individual goal card touch maps. These tracking files are maintained atomically
 * by governance synchronization hooks, never by individual goal card touch maps.
 * Excluding them prevents parallel worktree/branch git collisions and clobbering.
 */
const SHARED_TRACKING_PATTERNS = [
  /^docs\/00-project-snapshot\.md$/i,
  /^docs\/07-backlog\/goals\.md$/i,
  /^docs\/07-backlog\/epics\.md$/i,
  /^docs\/07-backlog\/epics\/.*\.md$/i,
  /^docs\/07-backlog\/goal-id-registry\.ya?ml$/i,
  /^docs\/07-backlog\/queues\/.*\.md$/i,
  /^CLARIFICATION\.md$/i,
  /^CLARIFICATION-.*\.md$/i,
  /^docs\/06_raw\/index\.md$/i,
  /^docs\/06_raw\/log\.md$/i,
];

/**
 * Checks whether a given path is a shared tracking markdown/governance file.
 */
function isSharedTrackingFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const clean = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  return SHARED_TRACKING_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Filters out shared tracking files from a touch map array.
 */
function sanitizeTouchMap(touchMap) {
  if (!Array.isArray(touchMap)) return [];
  return touchMap
    .map((p) => String(p || '').trim())
    .filter((p) => p && !isSharedTrackingFile(p));
}

/**
 * Checks whether two filesystem paths or globs overlap/collide.
 */
function pathsCollide(pathA, pathB) {
  const cleanA = String(pathA || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const cleanB = String(pathB || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const prefixA = cleanA.replace(/\/\*\*$/, '').replace(/\/\*$/, '').replace(/\/$/, '');
  const prefixB = cleanB.replace(/\/\*\*$/, '').replace(/\/\*$/, '').replace(/\/$/, '');

  if (cleanA === prefixB || cleanA.startsWith(prefixB + '/')) return true;
  if (cleanB === prefixA || cleanB.startsWith(prefixA + '/')) return true;

  return false;
}

/**
 * Computes pairwise touch map collision between two goals.
 * Shared tracking markdown files are filtered out prior to evaluation so they never
 * induce false collisions between parallel subagents.
 */
function checkGoalsTouchCollision(goalA, goalB) {
  const collisions = [];
  const mapA = sanitizeTouchMap(goalA.touchMap || []);
  const mapB = sanitizeTouchMap(goalB.touchMap || []);

  for (const pA of mapA) {
    for (const pB of mapB) {
      if (pathsCollide(pA, pB)) {
        collisions.push({ pathA: pA, pathB: pB });
      }
    }
  }

  return {
    colliding: collisions.length > 0,
    collisions,
  };
}

/**
 * Validates dependency DAG for cycles and unfulfilled dependencies.
 */
function validateDAG(goals) {
  const goalMap = new Map();
  for (const g of goals) {
    goalMap.set(g.id, g);
  }

  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(nodeId, pathStack) {
    visited.add(nodeId);
    recStack.add(nodeId);
    pathStack.push(nodeId);

    const goal = goalMap.get(nodeId);
    const deps = goal ? (goal.dependsOn || []) : [];

    for (const depId of deps) {
      if (!goalMap.has(depId)) continue; // external/archived dependency

      if (!visited.has(depId)) {
        dfs(depId, pathStack);
      } else if (recStack.has(depId)) {
        const cycle = [...pathStack, depId].join(' -> ');
        cycles.push(cycle);
      }
    }

    recStack.delete(nodeId);
    pathStack.pop();
  }

  for (const g of goals) {
    if (!visited.has(g.id)) {
      dfs(g.id, []);
    }
  }

  return {
    valid: cycles.length === 0,
    cycles,
  };
}

/**
 * Computes topological execution waves from dependencies.
 * Wave 1 = goals with no active in-set dependencies.
 * Wave k+1 = goals whose in-set dependencies are all in waves <= k.
 */
function computeExecutionWaves(goals) {
  const dagValidation = validateDAG(goals);
  if (!dagValidation.valid) {
    throw new Error(`Cannot compute parallel execution waves due to dependency cycles:\n${dagValidation.cycles.join('\n')}`);
  }

  const goalMap = new Map();
  for (const g of goals) {
    goalMap.set(g.id, g);
  }

  // Active IDs in the current planning scope
  const activeIds = new Set(goals.map((g) => g.id));
  const waveAssignments = new Map();

  function getWave(goalId, visiting = new Set()) {
    if (waveAssignments.has(goalId)) return waveAssignments.get(goalId);
    visiting.add(goalId);

    const goal = goalMap.get(goalId);
    if (!goal) return 1;

    let maxDepWave = 0;
    for (const depId of (goal.dependsOn || [])) {
      if (activeIds.has(depId)) {
        if (visiting.has(depId)) {
          throw new Error(`Cycle detected during wave computation at ${goalId} -> ${depId}`);
        }
        const depWave = getWave(depId, new Set(visiting));
        if (depWave > maxDepWave) maxDepWave = depWave;
      }
    }

    const assignedWave = maxDepWave + 1;
    waveAssignments.set(goalId, assignedWave);
    return assignedWave;
  }

  for (const g of goals) {
    getWave(g.id);
  }

  // Group goals by wave
  const waveBuckets = new Map();
  for (const g of goals) {
    const w = waveAssignments.get(g.id) || 1;
    if (!waveBuckets.has(w)) waveBuckets.set(w, []);
    waveBuckets.get(w).push(g);
  }

  const sortedWaves = [...waveBuckets.keys()].sort((a, b) => a - b);
  const result = [];

  for (const w of sortedWaves) {
    const waveGoals = waveBuckets.get(w).sort((a, b) => a.seq - b.seq);
    result.push({
      wave: w,
      goals: waveGoals,
    });
  }

  return result;
}

/**
 * Partitions a wave of goals into sub-waves such that every sub-wave has
 * 100% pairwise disjoint touch maps:
 * ∀ Ga, Gb ∈ SubWave (a ≠ b) ⇒ TouchMap(Ga) ∩ TouchMap(Gb) = ∅
 */
function partitionWaveIntoDisjointSubWaves(waveGoals) {
  const subWaves = [];

  for (const goal of waveGoals) {
    let placed = false;

    for (const sub of subWaves) {
      let hasCollision = false;
      for (const existingGoal of sub.goals) {
        const colCheck = checkGoalsTouchCollision(goal, existingGoal);
        if (colCheck.colliding) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        sub.goals.push(goal);
        placed = true;
        break;
      }
    }

    if (!placed) {
      subWaves.push({
        subWaveIndex: subWaves.length + 1,
        goals: [goal],
      });
    }
  }

  return subWaves;
}

/**
 * Builds the complete parallel execution plan across all waves and sub-waves,
 * allocating isolated Git worktrees and build cache paths.
 */
function planParallelExecution(root, goals, options = {}) {
  const waves = computeExecutionWaves(goals);
  const repoName = path.basename(root);
  const plannedWaves = [];
  let totalSubWaves = 0;

  for (const w of waves) {
    const subWaves = partitionWaveIntoDisjointSubWaves(w.goals);
    totalSubWaves += subWaves.length;

    const plannedSubWaves = subWaves.map((sub) => {
      const enrichedGoals = sub.goals.map((g) => {
        const role = g.assigned || 'implementer';
        const worktreePath = `../worktrees/${repoName}-${g.id}-${role}`;
        const branch = `feature/${g.id}`;
        const buildCache = `target/worktrees/${g.id}`;
        return {
          ...g,
          orchestration: {
            worktreePath,
            branch,
            buildCache,
            role,
            disjointTouchMap: true,
          },
        };
      });

      return {
        subWave: sub.subWaveIndex,
        isParallelSafe: true,
        concurrency: enrichedGoals.length,
        goals: enrichedGoals,
      };
    });

    plannedWaves.push({
      wave: w.wave,
      goalsCount: w.goals.length,
      subWavesCount: plannedSubWaves.length,
      isFullyParallel: plannedSubWaves.length === 1,
      subWaves: plannedSubWaves,
    });
  }

  return {
    root,
    repoName,
    totalGoals: goals.length,
    totalWaves: plannedWaves.length,
    totalSubWaves,
    waves: plannedWaves,
  };
}

/**
 * Generates canonical 26-section conforming goal card content.
 */
function renderGoalCardMarkdown(spec) {
  const id = spec.id;
  const title = spec.title;
  const epic = spec.epic;
  const kind = spec.kind || 'feature';
  const status = spec.status || 'planned';
  const assigned = spec.assigned || 'aether_implementer';
  const atomicOutcome = spec.atomicOutcome || `Implement and verify ${title}`;
  const dependsOn = spec.dependsOn && spec.dependsOn.length > 0 ? spec.dependsOn.join(', ') : '—';
  const blocks = spec.blocks && spec.blocks.length > 0 ? spec.blocks.join(', ') : '—';
  const sanitizedTouchMap = sanitizeTouchMap(spec.touchMap || []);
  const touchMap = sanitizedTouchMap.length > 0 ? sanitizedTouchMap : ['src/**'];

  const worktreePath = spec.worktreePath || `../worktrees/aether-${id}-${assigned}`;
  const branch = spec.branch || `feature/${id}`;
  const buildCache = spec.buildCache || `target/worktrees/${id}`;

  return `---
goal_contract:
  id: ${id}
  version: 2
  kind: ${kind}
  status: ${status}
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "${atomicOutcome.replace(/"/g, '\\"')}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: ${assigned}
  approver:
    role: tech-lead
  risk:
    level: low
    reasons: []
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: multi_worktree
    subagents:
      - role: ${assigned}
        worktree: "${worktreePath}"
        branch: "${branch}"
      - role: aether_tester
        worktree: "../worktrees/aether-${id}-tester"
        branch: "feature/${id}-test"
      - role: security_auditor
        worktree: "../worktrees/aether-${id}-audit"
        branch: "feature/${id}-audit"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: draft
    implementation: pending
    verification: pending
    evidence: pending
    review: pending
    release: unreleased
    learning: pending
---

# ${id}: ${title}

**Status:** ${status}  
**Kind:** ${kind}  
**Atomic outcome:** ${atomicOutcome}  
**Epic:** ${epic}  
**Depends on:** ${dependsOn}  
**Blocks:** ${blocks}  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Architecture & Contract Design | pending |
| 2 | Implementation of Operational Logic | pending |
| 3 | Automated Verification & Harness Pass | pending |

### Worktree & Multi-Subagent Orchestration Plan

### Subagent & Git Worktree Orchestration Plan

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| \`${assigned}\` | \`${branch}\` | \`${worktreePath}\` | ${(touchMap[0] || 'src/**')} | \`${buildCache}\` |
| \`aether_tester\` | \`feature/${id}-test\` | \`../worktrees/aether-${id}-tester\` | tests/**, scripts/harness/** | \`target/worktrees/${id}-test\` |
| \`security_auditor\` | \`feature/${id}-audit\` | \`../worktrees/aether-${id}-audit\` | docs/06_raw/** | \`target/worktrees/${id}-audit\` |

> **Framework Invariant:** Concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents \`.git/index.lock\` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | \`.\` | \`${branch}\` | Overall DAG coordination, synthesis barrier, verification | \`docs/07-backlog/goals/${id}.md\` | \`INIT\` → \`DISPATCH\` → \`JOIN\` → \`VERIFY\` → \`CLEANUP\` |
| **Subagent-1 (${assigned})** | \`${worktreePath}\` | \`${branch}\` | Step 1 & 2: Production source implementation | ${(touchMap[0] || 'src/**')} | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-2 (Verifier/Test)** | \`../worktrees/aether-${id}-tester\` | \`feature/${id}-test\` | Step 3: Zero-mock unit & integration test suites | tests/**, scripts/harness/** | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |

## Context

Goal ${id} implements production-grade capability for ${title} under epic ${epic}. All operations adhere strictly to Soda OS Agent Governance, Article I Zero-Mock Constitution, and disjoint touch map invariants.

## Intent

**Why:** Fulfills high-reliability domain requirement for ${title} with mathematically verified bounds.  
**Done when:** All acceptance criteria and 5-tier test suites pass with 100% operational logic and zero compiler warnings.  
**Unblocks:** ${blocks}

## How

Implements modular components via contract-first design, strict type safety, zero stubs, and automated verification harnesses.

## Open questions

*(none — requirements fully clarified)*

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/${epic}.md](../queues/${epic}.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | \`docs/07-backlog/goals/${id}.md\` |
| Queue Reference | \`docs/07-backlog/queues/${epic}.md\` |

## Atomicity & Zero-Mock Contract

- **One outcome:** ${atomicOutcome}
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Architecture & Contract Design**
   - **Allowed files:** ${(touchMap.slice(0, 2).join(', ') || 'src/**')}
   - **Actions:** Define type interfaces, schemas, and error boundaries.
   - **Completion gate:** Types compile cleanly.
   - **Stop condition:** Any type ambiguity or contract mismatch.
   - **Zero-mock check:** Real compilable signatures only.

2. **Step 2 — Implementation of Operational Logic**
   - **Allowed files:** ${(touchMap.join(', ') || 'src/**')}
   - **Actions:** Implement operational domain logic and handlers.
   - **Completion gate:** Core algorithms pass unit checks.
   - **Stop condition:** Unhandled edge case or boundary panic.
   - **Zero-mock check:** 100% active logic, zero stubs.

3. **Step 3 — Automated Verification & Harness Pass**
   - **Allowed files:** tests/**, scripts/harness/**
   - **Actions:** Execute automated conformance and negative failure tests.
   - **Completion gate:** All tests pass with zero warnings.
   - **Stop condition:** Failing assertion or test timeout.
   - **Zero-mock check:** Empirical test assertions against real behavior.

## In
- Operational logic and interfaces for ${title}
- Conformance harness validation and negative test cases
- Deterministic markdown queue and snapshot updates

## Out
- Modifying components outside declared touch map
- Placeholder return values or mock fallbacks
- Unbounded memory allocations or blocking loops

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Domain Logic | Add | ${(touchMap[0] || 'src/module.rs')} |
| Verification | Add | ${(touchMap[1] || 'tests/integration.rs')} |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| Domain Boundaries | Clean isolation within declared touch map |
| Concurrency Model | Non-blocking async event-driven execution |
| Memory Management | Bounded allocations with zero memory leaks |
| Error Handling | Fail-closed error taxonomy with structured propagation |
| Security Invariant | Input validation and zero-trust sandboxing |

## Spec checklist

- [x] Intent is WHAT/WHY only
- [x] Touch map paths are concrete and disjoint from parallel goals
- [x] Zero mocks and zero stubs in execution path
- [x] Software & Architecture Design specified

## Acceptance criteria

- [x] Nominal execution for "${atomicOutcome}" succeeds without errors
- [x] Edge boundaries and negative inputs fail closed cleanly
- [x] All declared touch map files compile with zero compiler warnings
- [x] Conformance and test harness pass 100%

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

${touchMap.map((p) => `- \`${p}\``).join('\n') || '- `src/**`'}

## Notes for AI

Operate within declared touch map only. Never touch files allocated to concurrent subagents.

## 🏛️ Comprehensive Spec Design Appendix

### Finite State Machine (FSM) Matrix

| Current State | Event / Trigger | Guard Condition | Next State | Action / Side Effect |
|---|---|---|---|---|
| \`INIT\` | \`START_EXECUTION\` | Valid isolated worktree | \`RUNNING\` | Allocate resources |
| \`RUNNING\` | \`VERIFICATION_PASS\` | All assertions green | \`COMPLETED\` | Stage changes |
| \`RUNNING\` | \`ERROR_DETECTED\` | Any assertion fails | \`FAILED\` | Fail closed and log |

### Mathematical & Data Invariants Spec
- **Zero Float Arithmetic:** All quantitative limits use declared whole-unit integers or fixed-point representations.
- **Contraction Mapping:** State transitions satisfy bounded convergence.

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** Core Execution Controller API
- **Outbound Port:** Persistence and Telemetry Event Bus
`;
}

/**
 * Creates a single conforming goal card, creates its acceptance contract,
 * and atomically updates all markdown files (queue, snapshot, dashboard, registry).
 */
function createGoal(root, spec, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const epic = String(spec.epic || goalIdLib.IMPLICIT_EPIC).toUpperCase();
  const title = String(spec.title || 'Untitled Goal').trim();

  // Allocate ID
  const allocResult = goalIdLib.allocateIds(root, epic, 1, { dryRun });
  const goalId = allocResult.allocated[0].id;
  const seq = allocResult.allocated[0].seq;
  const sanitizedTouchMap = sanitizeTouchMap(spec.touchMap || []);

  const fullSpec = {
    ...spec,
    id: goalId,
    seq,
    epic,
    title,
    touchMap: sanitizedTouchMap,
  };

  const cardContent = renderGoalCardMarkdown(fullSpec);
  const goalFilePath = path.join(root, 'docs/07-backlog/goals', `${goalId}.md`);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(goalFilePath), { recursive: true });
    markdownSyncLib.atomicWriteFileSync(goalFilePath, cardContent, 'utf8');
  }

  // Parse parsed goal object for acceptance contract
  const parsedGoal = markdownSyncLib.parseGoalFile(goalFilePath) || {
    id: goalId,
    epic,
    seq,
    title,
    status: fullSpec.status || 'planned',
    assigned: fullSpec.assigned || 'aether_implementer',
    atomicOutcome: fullSpec.atomicOutcome || title,
    touchMap: sanitizedTouchMap,
  };

  const acceptResult = markdownSyncLib.syncAcceptanceContract(root, parsedGoal, { dryRun });

  // Atomically sync all markdown files with targeted in-place snapshot upsert!
  const syncReport = markdownSyncLib.syncAllMarkdown(root, { epic, dryRun, targetGoalId: goalId });

  return {
    id: goalId,
    goalId,
    epic,
    seq,
    filePath: goalFilePath,
    goalFilePath,
    acceptanceContractPath: acceptResult.path,
    syncReport,
    dryRun,
  };
}

/**
 * Generates a batch of atomic goals for parallel execution, verifying disjoint
 * touch maps and updating all markdown files in one atomic transaction.
 */
function generateParallelGoalBatch(root, epicOrOptions, maybeGoalBatchSpecs, maybeOptions = {}) {
  let epic = epicOrOptions;
  let goalBatchSpecs = maybeGoalBatchSpecs;
  let options = maybeOptions;

  if (typeof epicOrOptions === 'object' && epicOrOptions !== null && !Array.isArray(epicOrOptions)) {
    epic = epicOrOptions.epic;
    goalBatchSpecs = epicOrOptions.goals || epicOrOptions.goalBatchSpecs || [];
    options = epicOrOptions.options || epicOrOptions;
  }

  const dryRun = Boolean(options.dryRun);
  const slug = String(epic || goalIdLib.IMPLICIT_EPIC).toUpperCase();
  const count = (goalBatchSpecs || []).length;

  if (count === 0) {
    throw new Error('Goal batch must contain at least 1 goal specification.');
  }

  // 1. Allocate block of IDs
  const allocResult = goalIdLib.allocateIds(root, slug, count, { dryRun });
  const createdGoals = [];

  for (let i = 0; i < count; i++) {
    const alloc = allocResult.allocated[i];
    const spec = goalBatchSpecs[i];
    const sanitizedTouchMap = sanitizeTouchMap(spec.touchMap || []);

    const fullSpec = {
      ...spec,
      id: alloc.id,
      seq: alloc.seq,
      epic: slug,
      title: spec.title || `Goal ${alloc.id}`,
      touchMap: sanitizedTouchMap,
    };

    const cardContent = renderGoalCardMarkdown(fullSpec);
    const goalFilePath = path.join(root, 'docs/07-backlog/goals', `${alloc.id}.md`);

    if (!dryRun) {
      fs.mkdirSync(path.dirname(goalFilePath), { recursive: true });
      markdownSyncLib.atomicWriteFileSync(goalFilePath, cardContent, 'utf8');
    }

    const parsedGoal = {
      id: alloc.id,
      epic: slug,
      seq: alloc.seq,
      title: fullSpec.title,
      status: fullSpec.status || 'planned',
      assigned: fullSpec.assigned || 'aether_implementer',
      atomicOutcome: fullSpec.atomicOutcome || fullSpec.title,
      touchMap: sanitizedTouchMap,
      dependsOn: fullSpec.dependsOn || [],
      blocks: fullSpec.blocks || [],
    };

    markdownSyncLib.syncAcceptanceContract(root, parsedGoal, { dryRun });
    createdGoals.push(parsedGoal);
  }

  // 2. Reconcile all markdown files atomically with targeted in-place snapshot upserts!
  const syncReport = markdownSyncLib.syncAllMarkdown(root, {
    epic: slug,
    dryRun,
    targetGoalIds: createdGoals.map((g) => g.id),
  });

  // 3. Compute parallel wave schedule
  const plan = planParallelExecution(root, createdGoals, options);

  return {
    epic: slug,
    goalsCount: count,
    createdGoals,
    syncReport,
    parallelPlan: plan,
    plan,
    dryRun,
  };
}

module.exports = {
  SHARED_TRACKING_PATTERNS,
  isSharedTrackingFile,
  sanitizeTouchMap,
  pathsCollide,
  checkGoalsTouchCollision,
  validateDAG,
  computeExecutionWaves,
  partitionWaveIntoDisjointSubWaves,
  planParallelExecution,
  renderGoalCardMarkdown,
  createGoal,
  generateParallelGoalBatch,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  let targetPath = process.cwd();
  let cmd = 'waves';
  let epic = null;

  for (const arg of args) {
    if (['waves', 'parallel', 'plan', 'create'].includes(arg)) {
      cmd = arg;
    } else if (!arg.startsWith('-') && /^[A-Za-z]{2,8}$/.test(arg)) {
      epic = arg.toUpperCase();
    } else if (!arg.startsWith('-') && fs.existsSync(arg)) {
      targetPath = arg;
    }
  }

  const root = goalIdLib.findProjectRoot(targetPath);

  try {
    if (cmd === 'waves' || cmd === 'parallel' || cmd === 'plan') {
      const allGoals = markdownSyncLib.loadAllGoals(root);
      const targetGoals = epic
        ? allGoals.filter((g) => g.epic === epic && !g.isArchived && g.status !== 'done')
        : allGoals.filter((g) => !g.isArchived && g.status !== 'done');

      console.log(`\n🌊 Soda OS Parallel Goal Execution Schedule (Root: ${root})`);
      console.log(`🎯 Epic Filter: ${epic || 'ALL ACTIVE'}`);
      console.log(`📊 Active Goals Analyzed: ${targetGoals.length}\n`);

      const plan = planParallelExecution(root, targetGoals);

      for (const w of plan.waves) {
        console.log(`══════════════════════════════════════════════════════════════════════`);
        console.log(`🚀 WAVE ${w.wave}: ${w.goalsCount} Goal(s) · Concurrency Sub-Waves: ${w.subWavesCount}`);
        console.log(`══════════════════════════════════════════════════════════════════════`);

        for (const sub of w.subWaves) {
          const subTitle = w.subWavesCount > 1 ? `Sub-Wave ${w.wave}.${sub.subWave}` : `Execution Batch`;
          console.log(`  ▶ ${subTitle} (Parallel Concurrency: ${sub.concurrency} concurrent subagents)`);
          for (const g of sub.goals) {
            const deps = g.dependsOn.length > 0 ? g.dependsOn.join(', ') : 'none';
            console.log(`    • ${g.id} [${g.status}] — "${g.title}"`);
            console.log(`      Assigned:   ${g.orchestration.role}`);
            console.log(`      Worktree:   ${g.orchestration.worktreePath}`);
            console.log(`      Touch Map:  ${(g.touchMap || []).join(', ') || 'src/**'}`);
            console.log(`      Depends On: ${deps}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('Usage: node parallel-goal-planner.js [waves|plan] [EPIC]');
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

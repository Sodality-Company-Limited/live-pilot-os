/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🗺️ SODA OS MULTI-PHASE PLAN COMPILER & DAG ACYCLICITY GATE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Topological plan compilation, strict cycle detection, and touch map
 *          disjointness verification for parallel multi-phase swarms.
 * Invariants: Zero Mocks (Article I), DAG Acyclicity (INV-036-001),
 *             Touch Map Disjointness (INV-036-002)
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const MULTIPHASE_PLAN_STATES = Object.freeze({
  PLAN_PARSED: 'PlanParsed',
  GRAPH_CONSTRUCTED: 'GraphConstructed',
  CYCLES_CHECKED: 'CyclesChecked',
  TOUCHMAPS_VALIDATED: 'TouchMapsValidated',
  PLAN_COMPILED: 'PlanCompiled',
  COMPILATION_REJECTED: 'CompilationRejected'
});

export const VALID_MULTIPHASE_PLAN_TRANSITIONS = Object.freeze({
  [MULTIPHASE_PLAN_STATES.PLAN_PARSED]: [
    MULTIPHASE_PLAN_STATES.GRAPH_CONSTRUCTED,
    MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED
  ],
  [MULTIPHASE_PLAN_STATES.GRAPH_CONSTRUCTED]: [
    MULTIPHASE_PLAN_STATES.CYCLES_CHECKED,
    MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED
  ],
  [MULTIPHASE_PLAN_STATES.CYCLES_CHECKED]: [
    MULTIPHASE_PLAN_STATES.TOUCHMAPS_VALIDATED,
    MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED
  ],
  [MULTIPHASE_PLAN_STATES.TOUCHMAPS_VALIDATED]: [
    MULTIPHASE_PLAN_STATES.PLAN_COMPILED,
    MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED
  ],
  [MULTIPHASE_PLAN_STATES.PLAN_COMPILED]: [],
  [MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED]: []
});

export function transitionMultiphasePlanState(fromState, toState) {
  const allowed = VALID_MULTIPHASE_PLAN_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidMultiphasePlanStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

/**
 * Detects cycles in a directed dependency graph using depth-first search.
 * Graph format: { [nodeId]: [dependencyIds] } (node depends on each dependency)
 */
export function detectDependencyCycles(graph = {}) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, path) {
    visited.add(node);
    recStack.add(node);

    const deps = graph[node] || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (dfs(dep, [...path, dep])) {
          return true;
        }
      } else if (recStack.has(dep)) {
        cycles.push([...path, dep]);
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return {
    hasCycle: cycles.length > 0,
    cycles
  };
}

/**
 * Verifies that a set of concurrent phases have strictly disjoint touch maps.
 * Returns { isDisjoint: boolean, overlaps: string[] }
 */
export function verifyPhaseTouchMapDisjointness(phases = []) {
  const fileOwners = new Map();
  const overlaps = new Set();

  for (const phase of phases) {
    const files = phase.touchMap || [];
    for (const file of files) {
      if (fileOwners.has(file)) {
        overlaps.add(file);
      } else {
        fileOwners.set(file, phase.id);
      }
    }
  }

  return {
    isDisjoint: overlaps.size === 0,
    overlaps: Array.from(overlaps)
  };
}

/**
 * Compiles a multi-phase plan into topologically sorted execution waves.
 * Enforces acyclicity (INV-036-001) and parallel touch map disjointness (INV-036-002).
 */
export function compileMultiPhasePlan(plan = {}) {
  if (!plan || !Array.isArray(plan.phases)) {
    throw new Error('MultiphasePlanError: Invalid plan descriptor; "phases" array required');
  }

  let state = MULTIPHASE_PLAN_STATES.PLAN_PARSED;

  // 1. Construct dependency adjacency graph
  state = transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.GRAPH_CONSTRUCTED);
  const graph = {};
  const phaseMap = new Map();

  for (const phase of plan.phases) {
    phaseMap.set(phase.id, phase);
    graph[phase.id] = Array.isArray(phase.depends_on) ? [...phase.depends_on] : [];
  }

  // 2. Check for cycles (INV-036-001)
  state = transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.CYCLES_CHECKED);
  const cycleRes = detectDependencyCycles(graph);
  if (cycleRes.hasCycle) {
    transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED);
    throw new Error(`CyclicPlanDependencyError: Circular dependency detected in plan: ${JSON.stringify(cycleRes.cycles)}`);
  }

  // 3. Topological Wave Sorting (Kahn's / Level-based)
  const inDegree = new Map();
  const outgoing = new Map();

  for (const phase of plan.phases) {
    inDegree.set(phase.id, (graph[phase.id] || []).length);
    outgoing.set(phase.id, []);
  }

  for (const [node, deps] of Object.entries(graph)) {
    for (const dep of deps) {
      if (outgoing.has(dep)) {
        outgoing.get(dep).push(node);
      }
    }
  }

  const waves = [];
  const processed = new Set();
  let currentWaveNodes = [];

  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      currentWaveNodes.push(id);
    }
  }

  while (currentWaveNodes.length > 0) {
    const wavePhases = currentWaveNodes.map(id => phaseMap.get(id));

    // 4. Validate touch map disjointness within parallel wave (INV-036-002)
    const disjointRes = verifyPhaseTouchMapDisjointness(wavePhases);
    if (!disjointRes.isDisjoint) {
      transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.COMPILATION_REJECTED);
      throw new Error(`OverlappingTouchMapError: Parallel phases in wave conflict on files: ${disjointRes.overlaps.join(', ')}`);
    }

    waves.push(wavePhases);
    for (const id of currentWaveNodes) {
      processed.add(id);
    }

    const nextWaveNodes = [];
    for (const id of currentWaveNodes) {
      const dependents = outgoing.get(id) || [];
      for (const dep of dependents) {
        const remainingDeps = (graph[dep] || []).filter(d => !processed.has(d));
        if (remainingDeps.length === 0 && !nextWaveNodes.includes(dep)) {
          nextWaveNodes.push(dep);
        }
      }
    }

    currentWaveNodes = nextWaveNodes;
  }

  state = transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.TOUCHMAPS_VALIDATED);
  state = transitionMultiphasePlanState(state, MULTIPHASE_PLAN_STATES.PLAN_COMPILED);

  return {
    status: state,
    planId: plan.id,
    totalPhases: plan.phases.length,
    waveCount: waves.length,
    waves
  };
}

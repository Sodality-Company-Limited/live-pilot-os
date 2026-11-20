/**
 * @file git-stack-orchestrator.mjs
 * @description Git stack planner, topological rebase coordinator, and branch ancestry validator.
 * Enforces DAG acyclicity, strict topological ordering, and safe stack reporting.
 */

/**
 * Detects cycles in branch stack dependencies using depth-first search.
 * @param {Array<{name: string, parent: string}>} branches
 * @returns {{hasCycle: boolean, cycle: string[]}}
 */
export function detectStackCycles(branches) {
  const adj = new Map();
  for (const b of branches) {
    adj.set(b.name, b.parent);
  }

  const visited = new Set();
  const recStack = new Set();

  for (const b of branches) {
    if (hasCycleUtil(b.name, adj, visited, recStack)) {
      return {
        hasCycle: true,
        cycle: Array.from(recStack)
      };
    }
  }

  return { hasCycle: false, cycle: [] };
}

function hasCycleUtil(node, adj, visited, recStack) {
  if (recStack.has(node)) return true;
  if (visited.has(node)) return false;

  visited.add(node);
  recStack.add(node);

  const parent = adj.get(node);
  if (parent && adj.has(parent)) {
    if (hasCycleUtil(parent, adj, visited, recStack)) {
      return true;
    }
  }

  recStack.delete(node);
  return false;
}

/**
 * Validates that every branch in the stack connects back to an established base or known parent.
 * @param {Array<{name: string, parent: string}>} branches
 * @param {string} rootBase - Base branch (e.g. main, develop).
 * @returns {{valid: boolean, brokenChains: string[]}}
 */
export function validateStackAncestry(branches, rootBase = 'main') {
  const branchNames = new Set(branches.map(b => b.name));
  branchNames.add(rootBase);

  const brokenChains = [];

  for (const b of branches) {
    if (!branchNames.has(b.parent)) {
      brokenChains.push(b.name);
    }
  }

  return {
    valid: brokenChains.length === 0,
    brokenChains
  };
}

/**
 * Builds a topological rebase plan for stacked branches.
 * @param {Array<{name: string, parent: string}>} branches
 * @param {string} rootBase - Target base branch.
 * @returns {Array<{order: number, name: string, parent: string}>} Ordered rebase plan.
 */
export function buildStackPlan(branches, rootBase = 'main') {
  const cycleCheck = detectStackCycles(branches);
  if (cycleCheck.hasCycle) {
    throw new Error(`Circular dependency detected in branch stack: ${cycleCheck.cycle.join(' -> ')}`);
  }

  const ancestry = validateStackAncestry(branches, rootBase);
  if (!ancestry.valid) {
    throw new Error(`Broken branch ancestry in stack: branches missing parents: ${ancestry.brokenChains.join(', ')}`);
  }

  // Topological sorting: level calculation from rootBase
  const branchMap = new Map(branches.map(b => [b.name, b]));
  const levels = new Map();

  function getDepth(name) {
    if (name === rootBase) return 0;
    if (levels.has(name)) return levels.get(name);
    const b = branchMap.get(name);
    if (!b) return 0;
    const depth = 1 + getDepth(b.parent);
    levels.set(name, depth);
    return depth;
  }

  for (const b of branches) {
    getDepth(b.name);
  }

  const sorted = [...branches].sort((a, b) => {
    const depthA = levels.get(a.name) || 0;
    const depthB = levels.get(b.name) || 0;
    if (depthA !== depthB) return depthA - depthB;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((b, idx) => ({
    order: idx + 1,
    name: b.name,
    parent: b.parent,
    depth: levels.get(b.name) || 1
  }));
}

/**
 * Formats a human-readable visual stack diagram.
 * @param {Array<{name: string, parent: string, commitCount?: number}>} branches
 * @param {string} rootBase
 * @returns {string} Formatted ascii representation.
 */
export function formatStackReport(branches, rootBase = 'main') {
  const plan = buildStackPlan(branches, rootBase);
  const lines = [
    `📦 Git Branch Stack Overview (Base: ${rootBase})`,
    `──────────────────────────────────────────────`,
    `  [0] 🌿 ${rootBase} (root)`
  ];

  for (const step of plan) {
    const indent = '  '.repeat(step.depth);
    lines.push(`${indent}└─▶ [${step.order}] 🔀 ${step.name} (on ${step.parent})`);
  }

  return lines.join('\n');
}

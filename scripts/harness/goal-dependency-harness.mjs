#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL DEPENDENCY DAG HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Validates dependency graph integrity across goals:
 * 1. Topological ordering and cycle detection.
 * 2. Unresolved dependency reference detection.
 * 3. Lifecycle state compatibility (e.g. ready goals cannot depend on draft goals).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';

/**
 * Builds and validates directed dependency graph.
 */
export function buildAndValidateDependencyDAG(goalMap) {
  const errors = [];
  const warnings = [];

  const goalIds = Object.keys(goalMap);

  // 1. Verify all referenced dependency IDs exist
  for (const id of goalIds) {
    const goal = goalMap[id];
    const deps = goal.dependencies || [];

    for (const depId of deps) {
      if (depId === '—' || depId === 'none' || !depId) continue;
      if (!goalMap[depId]) {
        errors.push(`Goal ${id} references non-existent dependency: "${depId}".`);
      }
    }
  }

  // 2. Cycle detection via DFS
  const visited = new Set();
  const recStack = new Set();

  function dfsDetectCycle(nodeId, pathStack) {
    visited.add(nodeId);
    recStack.add(nodeId);
    pathStack.push(nodeId);

    const goal = goalMap[nodeId];
    const deps = goal ? (goal.dependencies || []) : [];

    for (const depId of deps) {
      if (depId === '—' || depId === 'none' || !goalMap[depId]) continue;

      if (!visited.has(depId)) {
        const hasCycle = dfsDetectCycle(depId, pathStack);
        if (hasCycle) return true;
      } else if (recStack.has(depId)) {
        const cyclePath = [...pathStack, depId].join(' -> ');
        errors.push(`Dependency cycle detected: ${cyclePath}`);
        return true;
      }
    }

    recStack.delete(nodeId);
    pathStack.pop();
    return false;
  }

  for (const id of goalIds) {
    if (!visited.has(id)) {
      dfsDetectCycle(id, []);
    }
  }

  // 3. State compatibility
  // A goal marked 'ready' or 'in_progress' cannot depend on an uncompleted goal ('draft', 'planned')
  for (const id of goalIds) {
    const goal = goalMap[id];
    const status = (goal.status || '').toLowerCase();
    const deps = goal.dependencies || [];

    if (['ready', 'in_progress', 'review', 'approved'].includes(status)) {
      for (const depId of deps) {
        if (depId === '—' || depId === 'none') continue;
        const depGoal = goalMap[depId];
        if (depGoal) {
          const depStatus = (depGoal.status || '').toLowerCase();
          if (['draft', 'planned', 'blocked'].includes(depStatus)) {
            errors.push(`Goal ${id} has status "${status}" but its upstream dependency ${depId} is "${depStatus}". Upstream must be complete before downstream can start.`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Parses all goals in directory into a goalMap.
 */
export function loadGoalMapFromDirectory(goalsDir) {
  const goalMap = {};
  if (!existsSync(goalsDir)) return goalMap;

  const loadFromDir = (dir) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith('.md') && !entry.startsWith('_')) {
        const fullPath = join(dir, entry);
        const content = readFileSync(fullPath, 'utf8');
        const id = basename(entry, '.md');

        const statusMatch = content.match(/\*\*Status:\*\*\s*([a-zA-Z_]+)/i);
        const status = statusMatch ? statusMatch[1].trim() : 'draft';

        const depMatch = content.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
        let dependencies = [];
        if (depMatch) {
          const raw = depMatch[1].trim();
          dependencies = raw.split(/[\s,]+/).map(s => s.trim()).filter(s => s && s.startsWith('G-'));
        }

        goalMap[id] = {
          id,
          status,
          dependencies,
          path: fullPath
        };
      }
    }
  };

  loadFromDir(goalsDir);
  loadFromDir(join(goalsDir, '_archived'));

  return goalMap;
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('goal-dependency-harness.mjs')) {
  const dir = process.argv[2] || resolve(process.cwd(), 'docs/07-backlog/goals');
  const goalMap = loadGoalMapFromDirectory(dir);
  const res = buildAndValidateDependencyDAG(goalMap);

  if (!res.valid) {
    console.error(`❌ Dependency DAG validation failed:\n  - ${res.errors.join('\n  - ')}`);
    process.exit(1);
  } else {
    console.log(`✅ Dependency DAG validated successfully across ${Object.keys(goalMap).length} goals.`);
  }
}

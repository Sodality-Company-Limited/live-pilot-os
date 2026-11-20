/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS SEMANTIC BLAST RADIUS ANALYZER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: AST import dependency graph analysis, transitive blast radius tracing,
 *          and touch map boundary containment verification.
 * Invariants: Zero Mocks (Article I), Monotonicity (INV-033-001), Completeness (INV-033-002)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import path from 'node:path';

export const BLAST_RADIUS_STATES = Object.freeze({
  FILES_IDENTIFIED: 'FilesIdentified',
  GRAPH_BUILT: 'GraphBuilt',
  TRANSITIVE_COMPUTED: 'TransitiveComputed',
  CONTAINMENT_CHECKED: 'ContainmentChecked',
  TOUCH_MAP_COMPLIANT: 'TouchMapCompliant',
  TOUCH_MAP_VIOLATION: 'TouchMapViolation'
});

export const VALID_BLAST_TRANSITIONS = Object.freeze({
  [BLAST_RADIUS_STATES.FILES_IDENTIFIED]: [BLAST_RADIUS_STATES.GRAPH_BUILT],
  [BLAST_RADIUS_STATES.GRAPH_BUILT]: [BLAST_RADIUS_STATES.TRANSITIVE_COMPUTED],
  [BLAST_RADIUS_STATES.TRANSITIVE_COMPUTED]: [BLAST_RADIUS_STATES.CONTAINMENT_CHECKED],
  [BLAST_RADIUS_STATES.CONTAINMENT_CHECKED]: [
    BLAST_RADIUS_STATES.TOUCH_MAP_COMPLIANT,
    BLAST_RADIUS_STATES.TOUCH_MAP_VIOLATION
  ],
  [BLAST_RADIUS_STATES.TOUCH_MAP_COMPLIANT]: [],
  [BLAST_RADIUS_STATES.TOUCH_MAP_VIOLATION]: []
});

export function transitionBlastRadiusState(fromState, toState) {
  const allowed = VALID_BLAST_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidBlastRadiusStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

const IMPORT_EXPORT_REGEX = /(?:import\s+[\s\S]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|export\s+[\s\S]*?from\s+['"]([^'"]+)['"])/g;

/**
 * Normalizes relative import specifiers to POSIX repository-relative paths.
 */
export function resolveImportPath(importerPath, specifier) {
  if (!specifier.startsWith('.')) {
    // External dependency/package import (not local repo file)
    return null;
  }
  const dir = path.dirname(importerPath);
  const resolved = path.normalize(path.join(dir, specifier)).replace(/\\/g, '/');
  return resolved;
}

/**
 * Builds the bidirectional dependency graph from an in-memory map of file paths to contents.
 * graph.importers[targetFile] = Set of files that import targetFile.
 */
export function buildDependencyGraph(fileMap) {
  const importers = {};
  const dependencies = {};

  for (const filePath of Object.keys(fileMap)) {
    importers[filePath] = importers[filePath] || new Set();
    dependencies[filePath] = dependencies[filePath] || new Set();
  }

  for (const [importerPath, content] of Object.entries(fileMap)) {
    IMPORT_EXPORT_REGEX.lastIndex = 0;
    let match;
    while ((match = IMPORT_EXPORT_REGEX.exec(content)) !== null) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) continue;

      const targetPath = resolveImportPath(importerPath, specifier);
      if (targetPath) {
        // Record relationship
        dependencies[importerPath].add(targetPath);
        importers[targetPath] = importers[targetPath] || new Set();
        importers[targetPath].add(importerPath);
      }
    }
  }

  return {
    importers,
    dependencies
  };
}

/**
 * Computes the complete transitive blast radius set B(S) using BFS.
 * Monotonic: S1 ⊆ S2 ==> B(S1) ⊆ B(S2).
 * Complete: If A imports B transitively, A ∈ B({B}).
 */
export function computeTransitiveBlastRadius(seedFiles, graph) {
  const blastRadius = new Set();
  const queue = [];

  for (const seed of seedFiles) {
    if (!blastRadius.has(seed)) {
      blastRadius.add(seed);
      queue.push(seed);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const directImporters = graph.importers[current];
    if (directImporters) {
      for (const importer of directImporters) {
        if (!blastRadius.has(importer)) {
          blastRadius.add(importer);
          queue.push(importer);
        }
      }
    }
  }

  return blastRadius;
}

/**
 * Verifies whether all files in the blast radius are declared within the goal touch map.
 */
export function verifyTouchMapContainment(blastRadius, touchMap) {
  const normalizedTouchMap = new Set(touchMap.map(p => p.replace(/\\/g, '/')));
  const escapes = [];

  for (const file of blastRadius) {
    const normFile = file.replace(/\\/g, '/');
    let isCovered = normalizedTouchMap.has(normFile);

    // Support directory touch map coverage (e.g. '.agents/skills/foo/')
    if (!isCovered) {
      for (const entry of normalizedTouchMap) {
        if (entry.endsWith('/') && normFile.startsWith(entry)) {
          isCovered = true;
          break;
        }
      }
    }

    if (!isCovered) {
      escapes.push(file);
    }
  }

  return {
    compliant: escapes.length === 0,
    escapes: escapes.sort()
  };
}

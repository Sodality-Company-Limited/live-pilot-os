#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS TOUCH-MAP COLLISION GATE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: DAVE Concurrency Assurance & Formal Verification (G-PROOF-004)
 * Purpose: Automated concurrency gate validating that active or concurrent goals
 *          maintain strictly disjoint filesystem touch maps (TouchMap(A) ∩ TouchMap(B) = ∅),
 *          preventing write-write collisions and .git/index.lock contention across
 *          parallel subagent worktrees.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolve } from 'node:path';
import {
  parseTouchMap,
  pathsCollide,
  checkTouchMapCollision,
  analyzePairwiseCollisions,
  sanitizeTouchMap,
} from '../lib/touch-map-analyzer.mjs';

/**
 * Discovers active goal markdown cards in docs/07-backlog/goals/.
 * Ignores template cards (_template.md), dotfiles, and archived subdirectories.
 *
 * @param {string} goalsDir - Directory containing goal cards
 * @returns {Array<string>} List of absolute file paths to active goal cards
 */
export function discoverActiveGoals(goalsDir) {
  if (!fs.existsSync(goalsDir)) return [];
  const entries = fs.readdirSync(goalsDir, { withFileTypes: true });
  const goalPaths = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    if (!entry.name.endsWith('.md')) continue;

    goalPaths.push(path.join(goalsDir, entry.name));
  }

  // Sort deterministically
  goalPaths.sort();
  return goalPaths;
}

/**
 * Executes the touch-map collision gate.
 *
 * @param {object} options
 * @param {Array<string>} [options.targets=[]] - Specific goal IDs or file paths
 * @param {string} [options.baseDir=process.cwd()] - Project root directory
 * @param {boolean} [options.strict=false] - Fail if any goal has an empty touch map
 * @param {boolean} [options.json=false] - Emit structured JSON output
 * @param {boolean} [options.verbose=false] - Print verbose per-goal touch maps
 * @returns {{ exitCode: number, result: object }}
 */
export function runCollisionGate(options = {}) {
  const baseDir = options.baseDir || process.cwd();
  const goalsDir = path.resolve(baseDir, 'docs/07-backlog/goals');

  let targets = Array.isArray(options.targets) ? options.targets.filter(Boolean) : [];

  if (targets.length === 0) {
    targets = discoverActiveGoals(goalsDir);
  }

  const analysis = analyzePairwiseCollisions(targets, {
    strict: Boolean(options.strict),
    baseDir,
  });

  const exitCode = analysis.clean ? 0 : 1;

  return {
    exitCode,
    result: {
      timestamp: new Date().toISOString(),
      pass: analysis.clean,
      strict: Boolean(options.strict),
      goalCount: analysis.goals.length,
      analyzedPairsCount: analysis.analyzedPairsCount,
      totalCollisions: analysis.totalCollisions,
      collisionMatrix: analysis.collisionMatrix,
      emptyTouchMapGoals: analysis.emptyTouchMapGoals,
      goals: analysis.goals.map((g) => ({
        id: g.id,
        filePath: g.filePath ? path.relative(baseDir, g.filePath) : null,
        touchMapCount: g.touchMap.length,
        touchMap: g.touchMap,
      })),
    },
  };
}

/**
 * Main CLI entrypoint.
 *
 * @param {Array<string>} args - Command-line arguments
 */
export function main(args = process.argv.slice(2)) {
  let strict = false;
  let jsonOutput = false;
  let verbose = false;
  const targets = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--strict') {
      strict = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/harness/touch-map-collision-gate.mjs [options] [goal-ids-or-paths...]

Options:
  --strict    Fail-closed if any goal has an empty or unparsable touch map
  --json      Output machine-readable JSON summary to stdout
  --verbose   Display detailed touch maps for every evaluated goal
  --help, -h  Show this help message

Examples:
  node scripts/harness/touch-map-collision-gate.mjs
  node scripts/harness/touch-map-collision-gate.mjs --strict --verbose
  node scripts/harness/touch-map-collision-gate.mjs G-PROOF-003 G-PROOF-004
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      targets.push(arg);
    }
  }

  const { exitCode, result } = runCollisionGate({
    targets,
    strict,
    json: jsonOutput,
    verbose,
  });

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n', () => {
      process.exit(exitCode);
    });
    return;
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🛡️ SODA OS TOUCH-MAP COLLISION GATE (CONCURRENCY VERIFICATION)');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log(`Goals Evaluated:     ${result.goalCount}`);
  console.log(`Pairwise Checks:     ${result.analyzedPairsCount}`);
  console.log(`Strict Mode:         ${result.strict ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Total Collisions:    ${result.totalCollisions}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');

  if (verbose) {
    console.log('📋 Evaluated Goals & Touch Maps:');
    for (const g of result.goals) {
      console.log(`  • [${g.id}] (${g.filePath || 'inline'}): ${g.touchMapCount} path(s)`);
      for (const p of g.touchMap) {
        console.log(`      - ${p}`);
      }
    }
    console.log('────────────────────────────────────────────────────────────────────────────────');
  }

  if (result.emptyTouchMapGoals.length > 0) {
    if (result.strict) {
      console.error(`⚠️ Strict Mode Violation: Goals with empty touch maps:`);
      for (const id of result.emptyTouchMapGoals) {
        console.error(`    - ${id}`);
      }
    } else {
      console.log(`ℹ️ Notice: Goals with empty touch maps: ${result.emptyTouchMapGoals.join(', ')}`);
    }
  }

  if (result.pass) {
    console.log('✅ ALL TOUCH MAPS DISJOINT: 0 collisions detected across active goals.');
    console.log('   Pairwise isolation invariant TouchMap(Gi) ∩ TouchMap(Gj) = ∅ certified.');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.error('❌ TOUCH MAP COLLISION DETECTED: Concurrent write conflicts found:');
    for (const c of result.collisionMatrix) {
      console.error(`  ⚠️ Collision: [${c.goalA}] <─> [${c.goalB}]`);
      for (const col of c.collisions) {
        console.error(`      - Path A: ${col.pathA}`);
        console.error(`      - Path B: ${col.pathB} (${col.reason})`);
      }
    }
    console.log('════════════════════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Invoke main when run directly
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main(process.argv.slice(2));
}

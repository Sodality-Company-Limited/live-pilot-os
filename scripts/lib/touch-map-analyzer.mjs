/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS TOUCH MAP ANALYZER & CONCURRENCY COLLISION DETECTOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: DAVE Mathematical Invariant & Assurance Architecture (G-PROOF-004)
 * Purpose: Parses Section 2 touch maps from goal markdown cards, normalizes paths,
 *          evaluates strict pairwise set disjointness (TouchMap(A) ∩ TouchMap(B) = ∅),
 *          handles directory prefix containment, glob patterns, and shared tracking
 *          file sanitization with fail-closed safety.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Shared tracking files across the repository that MUST NEVER be included
 * in individual goal card touch maps. These tracking files are maintained atomically
 * by governance synchronization hooks, never by individual goal card touch maps.
 * Excluding them prevents parallel worktree/branch git collisions and false alarms.
 */
export const SHARED_TRACKING_PATTERNS = [
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
 *
 * @param {string} filePath - Path to check
 * @returns {boolean} True if filePath matches shared tracking patterns
 */
export function isSharedTrackingFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const clean = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  return SHARED_TRACKING_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Normalizes a path string:
 * - Converts backslashes to forward slashes
 * - Strips leading './'
 * - Collapses consecutive slashes
 * - Strips trailing whitespace
 *
 * @param {string} p - Raw path
 * @returns {string} Normalized path
 */
export function normalizePath(p) {
  if (p === null || p === undefined) return '';
  return String(p)
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim();
}

/**
 * Converts a glob pattern string into a RegExp for path testing.
 *
 * @param {string} globStr - Glob pattern string
 * @returns {RegExp}
 */
export function globToRegex(globStr) {
  let regexStr = '^';
  let i = 0;
  while (i < globStr.length) {
    const c = globStr[i];
    if (c === '*' && globStr[i + 1] === '*') {
      // ** matches zero or more directories/path segments
      if (globStr[i + 2] === '/') {
        regexStr += '(?:.+/)?';
        i += 3;
      } else {
        regexStr += '.*';
        i += 2;
      }
    } else if (c === '*') {
      // * matches any characters except slash
      regexStr += '[^/]*';
      i += 1;
    } else if (c === '?') {
      // ? matches any single non-slash character
      regexStr += '[^/]';
      i += 1;
    } else if ('[].+^${}()|\\'.includes(c)) {
      regexStr += '\\' + c;
      i += 1;
    } else {
      regexStr += c;
      i += 1;
    }
  }
  regexStr += '$';
  return new RegExp(regexStr);
}

/**
 * Filters out shared tracking files and empty/invalid entries from a touch map.
 * Returns a deduplicated array of normalized paths.
 *
 * @param {Array<string>|Set<string>} touchMap - Array or Set of file paths
 * @returns {Array<string>} Sanitized touch map paths
 */
export function sanitizeTouchMap(touchMap) {
  if (!touchMap) return [];
  const list = Array.isArray(touchMap)
    ? touchMap
    : touchMap instanceof Set
      ? Array.from(touchMap)
      : [];

  const seen = new Set();
  const sanitized = [];

  for (const entry of list) {
    const clean = normalizePath(entry);
    if (!clean) continue;
    if (isSharedTrackingFile(clean)) continue;
    if (!seen.has(clean)) {
      seen.add(clean);
      sanitized.push(clean);
    }
  }

  return sanitized;
}

/**
 * Checks whether two filesystem paths or globs overlap/collide.
 * Handles:
 * - Exact path matches (`src/lib.rs` == `src/lib.rs`)
 * - Directory prefix containment (`src/lib` contains `src/lib/index.ts`)
 * - Wildcard globs (`src/crates/*` overlaps `src/crates/kernel/lib.rs`)
 * - Recursive globs (`docs/**` overlaps `docs/02-product/brief.md`)
 * - Suffix pattern globs (`*.mjs` matches `test.mjs`)
 * - Guarantees boundary safety (e.g. `src/foo` does NOT collide with `src/food`)
 *
 * @param {string} pathA - First path or glob
 * @param {string} pathB - Second path or glob
 * @returns {boolean} True if paths collide
 */
export function pathsCollide(pathA, pathB) {
  const cleanA = normalizePath(pathA);
  const cleanB = normalizePath(pathB);
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Extract base prefixes by stripping wildcards and trailing slashes
  const prefixA = cleanA.split(/[*?]/)[0].replace(/\/+$/, '');
  const prefixB = cleanB.split(/[*?]/)[0].replace(/\/+$/, '');

  const hasWildcardA = cleanA.includes('*') || cleanA.includes('?');
  const hasWildcardB = cleanB.includes('*') || cleanB.includes('?');

  const coversAllA = !hasWildcardA || cleanA === prefixA + '/**' || cleanA === prefixA + '/*';
  const coversAllB = !hasWildcardB || cleanB === prefixB + '/**' || cleanB === prefixB + '/*';

  // Exact directory match or child containment
  if (prefixA && coversAllA && (cleanB === prefixA || cleanB.startsWith(prefixA + '/'))) return true;
  if (prefixB && coversAllB && (cleanA === prefixB || cleanA.startsWith(prefixB + '/'))) return true;

  // If base prefixes are identical and non-empty and both cover all children
  if (prefixA && prefixB && prefixA === prefixB && coversAllA && coversAllB) return true;

  if (hasWildcardA) {
    const reA = globToRegex(cleanA);
    if (reA.test(cleanB)) return true;
  }

  if (hasWildcardB) {
    const reB = globToRegex(cleanB);
    if (reB.test(cleanA)) return true;
  }

  // Cross-glob base overlap: e.g. src/crates/* and src/crates/sub/*
  if (hasWildcardA && hasWildcardB) {
    if (prefixA && prefixB) {
      if (prefixA.startsWith(prefixB + '/') || prefixB.startsWith(prefixA + '/')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts and parses Section 2 (## Touch map) from goal card markdown content or file path.
 *
 * @param {string|object} goalPathOrContent - File path string, markdown content string, or goal object
 * @param {object} [options={}] - Options (e.g., raw: boolean to bypass sanitization)
 * @returns {Array<string>} Array of parsed touch map paths (augmented with metadata)
 */
export function parseTouchMap(goalPathOrContent, options = {}) {
  let content = '';
  let filePath = null;

  if (typeof goalPathOrContent === 'string') {
    // Check if it's an existing file path
    if (fs.existsSync(goalPathOrContent) && fs.statSync(goalPathOrContent).isFile()) {
      filePath = goalPathOrContent;
      content = fs.readFileSync(goalPathOrContent, 'utf8');
    } else {
      content = goalPathOrContent;
    }
  } else if (goalPathOrContent && typeof goalPathOrContent === 'object') {
    if (Array.isArray(goalPathOrContent.touchMap)) {
      return options.raw ? goalPathOrContent.touchMap : sanitizeTouchMap(goalPathOrContent.touchMap);
    }
    content = goalPathOrContent.content || '';
    filePath = goalPathOrContent.filePath || null;
  }

  const touchMap = [];

  // Match ## Touch map section until next ## heading or EOF
  const touchMapSection = content.match(/(?:^|\n)##\s+Touch\s+map\b[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i);
  if (touchMapSection) {
    const lines = touchMapSection[1].split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match bullet items: - `path` or - path or * `path` or * path
      const bulletMatch = line.match(/^(?:[-*]\s*)+`?([^`\n]+)`?/);
      if (bulletMatch) {
        let item = bulletMatch[1].trim();
        // Remove trailing backtick if present
        if (item.endsWith('`')) {
          item = item.slice(0, -1).trim();
        }
        // Remove any leading asterisk / dashes
        item = item.replace(/^[*-\s]+/, '').trim();
        if (
          item &&
          item !== '—' &&
          item !== '*' &&
          !item.startsWith('<!--') &&
          !item.startsWith('[Path') &&
          !(item.startsWith('**') && item.endsWith('**')) &&
          !(item.includes('**') && (!/(?:^|\/)\*\*(?:\/|$)/.test(item) || item.endsWith(':'))) &&
          !item.toLowerCase().includes('(declared on goal card)')
        ) {
          touchMap.push(item);
        }
      }
    }
  }

  const result = options.raw ? touchMap : sanitizeTouchMap(touchMap);
  if (filePath) {
    Object.defineProperty(result, 'filePath', {
      value: filePath,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return result;
}

/**
 * Computes pairwise touch map collision between two touch maps.
 * Sanitizes both maps to exclude shared tracking files prior to collision checking.
 *
 * @param {Array<string>|object} touchMapA - First touch map or goal object
 * @param {Array<string>|object} touchMapB - Second touch map or goal object
 * @returns {{ colliding: boolean, collisions: Array<{ pathA: string, pathB: string, reason: string }> }}
 */
export function checkTouchMapCollision(touchMapA, touchMapB) {
  const mapA = Array.isArray(touchMapA)
    ? sanitizeTouchMap(touchMapA)
    : (touchMapA && Array.isArray(touchMapA.touchMap))
      ? sanitizeTouchMap(touchMapA.touchMap)
      : sanitizeTouchMap(touchMapA);

  const mapB = Array.isArray(touchMapB)
    ? sanitizeTouchMap(touchMapB)
    : (touchMapB && Array.isArray(touchMapB.touchMap))
      ? sanitizeTouchMap(touchMapB.touchMap)
      : sanitizeTouchMap(touchMapB);

  const collisions = [];

  for (const pA of mapA) {
    for (const pB of mapB) {
      if (pathsCollide(pA, pB)) {
        collisions.push({
          pathA: pA,
          pathB: pB,
          reason: pA === pB ? 'exact_path_match' : 'path_prefix_or_glob_overlap',
        });
      }
    }
  }

  return {
    colliding: collisions.length > 0,
    collisions,
    overlapCount: collisions.length,
    touchMapA: mapA,
    touchMapB: mapB,
  };
}

/**
 * Analyzes pairwise collisions across a list of goals.
 * Evaluates TouchMap(Gi) ∩ TouchMap(Gj) for all i < j.
 *
 * @param {Array<string|object>} goalsList - List of goal paths, IDs, or goal objects
 * @param {object} [options={}] - Options:
 *   - strict: boolean (if true, empty touch maps in active goals flag an issue)
 *   - baseDir: string (base directory for resolving goal cards, defaults to process.cwd())
 * @returns {{
 *   hasCollision: boolean,
 *   clean: boolean,
 *   totalCollisions: number,
 *   collisionMatrix: Array<{ goalA: string, goalB: string, filePathA: string, filePathB: string, collisions: Array<object> }>,
 *   goals: Array<{ id: string, filePath: string, touchMap: Array<string> }>,
 *   analyzedPairsCount: number,
 *   emptyTouchMapGoals: Array<string>
 * }}
 */
export function analyzePairwiseCollisions(goalsList, options = {}) {
  const baseDir = options.baseDir || process.cwd();
  const normalizedGoals = [];
  const emptyTouchMapGoals = [];

  for (const item of goalsList) {
    if (!item) continue;

    let id = null;
    let filePath = null;
    let touchMap = [];

    if (typeof item === 'string') {
      // If it looks like a path
      if (item.endsWith('.md')) {
        filePath = path.isAbsolute(item) ? item : path.resolve(baseDir, item);
        id = path.basename(item, '.md').toUpperCase();
      } else {
        // Goal ID given (e.g. G-PROOF-004)
        id = item.toUpperCase();
        const candidateActive = path.resolve(baseDir, `docs/07-backlog/goals/${id}.md`);
        const candidateArchived = path.resolve(baseDir, `docs/07-backlog/goals/_archived/${id}.md`);
        if (fs.existsSync(candidateActive)) {
          filePath = candidateActive;
        } else if (fs.existsSync(candidateArchived)) {
          filePath = candidateArchived;
        } else {
          filePath = candidateActive;
        }
      }

      if (fs.existsSync(filePath)) {
        touchMap = parseTouchMap(filePath);
      } else {
        touchMap = [];
      }
    } else if (typeof item === 'object') {
      id = item.id || (item.filePath ? path.basename(item.filePath, '.md').toUpperCase() : 'UNKNOWN');
      filePath = item.filePath || null;
      if (Array.isArray(item.touchMap)) {
        touchMap = sanitizeTouchMap(item.touchMap);
      } else if (item.content) {
        touchMap = parseTouchMap(item.content);
      } else if (filePath && fs.existsSync(filePath)) {
        touchMap = parseTouchMap(filePath);
      }
    }

    if (touchMap.length === 0) {
      emptyTouchMapGoals.push(id);
    }

    normalizedGoals.push({
      id,
      filePath,
      touchMap,
    });
  }

  const collisionMatrix = [];
  let pairsCount = 0;

  for (let i = 0; i < normalizedGoals.length; i++) {
    for (let j = i + 1; j < normalizedGoals.length; j++) {
      pairsCount += 1;
      const gA = normalizedGoals[i];
      const gB = normalizedGoals[j];

      const check = checkTouchMapCollision(gA.touchMap, gB.touchMap);
      if (check.colliding) {
        collisionMatrix.push({
          goalA: gA.id,
          goalB: gB.id,
          filePathA: gA.filePath,
          filePathB: gB.filePath,
          collisions: check.collisions,
        });
      }
    }
  }

  const strictViolation = Boolean(options.strict) && emptyTouchMapGoals.length > 0;
  const hasCollision = collisionMatrix.length > 0 || strictViolation;

  return {
    hasCollision,
    clean: !hasCollision,
    totalCollisions: collisionMatrix.length,
    collisionMatrix,
    goals: normalizedGoals,
    analyzedPairsCount: pairsCount,
    emptyTouchMapGoals,
  };
}

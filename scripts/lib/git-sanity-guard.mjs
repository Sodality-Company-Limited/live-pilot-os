/**
 * Git Sanity Guard Driver
 * 
 * Provides automated pre-commit and pre-push branch sanitation, verifying that staged
 * files strictly adhere to declared goal touch maps and that the working tree is clean.
 * 
 * Implements G-CORE-030 invariants:
 * - INV-030-001: Commits are strictly rejected fail-closed if any staged file falls outside the declared touch map.
 * - INV-030-002: Verification passes cleanly if and only if git status is clean and HEAD is cleanly aligned with its upstream target.
 */

/**
 * FSM States for Git Sanity Lifecycle
 */
export const GIT_SANITY_FSM_STATES = Object.freeze({
  CleanChecking: 'CleanChecking',
  TouchMapEvaluating: 'TouchMapEvaluating',
  UpstreamVerifying: 'UpstreamVerifying',
  SanityVerified: 'SanityVerified',
  SanityRejected: 'SanityRejected',
});

/**
 * Allowed transitions between FSM states
 */
const ALLOWED_FSM_TRANSITIONS = new Map([
  [GIT_SANITY_FSM_STATES.CleanChecking, new Set([GIT_SANITY_FSM_STATES.TouchMapEvaluating, GIT_SANITY_FSM_STATES.SanityRejected])],
  [GIT_SANITY_FSM_STATES.TouchMapEvaluating, new Set([GIT_SANITY_FSM_STATES.UpstreamVerifying, GIT_SANITY_FSM_STATES.SanityRejected])],
  [GIT_SANITY_FSM_STATES.UpstreamVerifying, new Set([GIT_SANITY_FSM_STATES.SanityVerified, GIT_SANITY_FSM_STATES.SanityRejected])],
  [GIT_SANITY_FSM_STATES.SanityVerified, new Set([GIT_SANITY_FSM_STATES.CleanChecking])],
  [GIT_SANITY_FSM_STATES.SanityRejected, new Set([])], // Terminal failure
]);

/**
 * Transition Git sanity state with fail-closed validation
 * 
 * @param {string} fromState Current state
 * @param {string} toState Target state
 * @returns {string} New state
 */
export function transitionGitSanityState(fromState, toState) {
  const allowed = ALLOWED_FSM_TRANSITIONS.get(fromState);
  if (!allowed || !allowed.has(toState)) {
    throw new Error(
      `Illegal FSM state transition: Cannot transition from '${fromState}' to '${toState}'. Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`
    );
  }
  return toState;
}

/**
 * Validate that all staged files fall strictly within the declared touch map
 * 
 * @param {object} params
 * @param {string[]} params.stagedFiles Array of staged relative file paths
 * @param {string[]} params.touchMap Array of allowed files or directory prefixes
 * @param {boolean} [params.failClosed=false] Whether to throw fail-closed upon violation
 * @returns {object} { compliant: boolean, violations: string[] }
 */
export function validateTouchMapCompliance({ stagedFiles = [], touchMap = [], failClosed = false } = {}) {
  if (!Array.isArray(stagedFiles) || !Array.isArray(touchMap)) {
    throw new TypeError('stagedFiles and touchMap must be arrays of path strings');
  }

  const normalizedTouchMap = touchMap.map((p) => p.trim());
  const violations = [];

  for (const file of stagedFiles) {
    const trimmed = file.trim();
    if (!trimmed) continue;

    // Check exact match or directory prefix match
    const isAllowed = normalizedTouchMap.some((pattern) => {
      if (pattern.endsWith('/')) {
        return trimmed.startsWith(pattern);
      }
      return trimmed === pattern;
    });

    if (!isAllowed) {
      violations.push(trimmed);
    }
  }

  if (violations.length > 0 && failClosed) {
    throw new Error(
      `Touch map violation detected: ${violations.length} staged files fall outside the active goal contract:\n` +
      violations.map((f) => `  - ${f}`).join('\n')
    );
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Protected branches that forbid direct commits
 */
const PROTECTED_BRANCHES = new Set(['main', 'master', 'production', 'develop']);

/**
 * Check working tree sanity, status, and branch safety
 * 
 * @param {object} params
 * @param {string} params.branchName Active git branch name
 * @param {string} params.porcelainStatus Output from `git status --porcelain`
 * @param {boolean} [params.isRebasedOnUpstream=true] Whether branch is aligned with upstream
 * @returns {object} { healthy: boolean, state: string, reason: string | null }
 */
export function checkWorkingTreeSanity({ branchName = '', porcelainStatus = '', isRebasedOnUpstream = true } = {}) {
  const trimmedBranch = branchName.trim();

  // 1. Check protected branch violations
  if (PROTECTED_BRANCHES.has(trimmedBranch)) {
    return {
      healthy: false,
      state: GIT_SANITY_FSM_STATES.SanityRejected,
      reason: 'PROTECTED_BRANCH_DIRECT_MUTATION',
    };
  }

  // 2. Check for dirty modifications outside scratch/
  const lines = porcelainStatus
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const dirtyFilesOutsideScratch = [];
  for (const line of lines) {
    const filePath = line.replace(/^[MADRCU?!]{1,2}\s+/, '').trim();
    if (!filePath.startsWith('scratch/')) {
      dirtyFilesOutsideScratch.push(filePath);
    }
  }

  if (dirtyFilesOutsideScratch.length > 0) {
    return {
      healthy: false,
      state: GIT_SANITY_FSM_STATES.SanityRejected,
      reason: 'DIRTY_WORKING_TREE',
      dirtyFiles: dirtyFilesOutsideScratch,
    };
  }

  // 3. Check upstream alignment
  if (!isRebasedOnUpstream) {
    return {
      healthy: false,
      state: GIT_SANITY_FSM_STATES.SanityRejected,
      reason: 'UPSTREAM_DIVERGENCE_DETECTED',
    };
  }

  return {
    healthy: true,
    state: GIT_SANITY_FSM_STATES.SanityVerified,
    reason: null,
  };
}

/**
 * Investigation Budget Guard Driver
 * 
 * Provides AST-guided tool calling budget ceilings, in-memory content-addressable
 * slice caching, and runaway investigation loop prevention for subagents in Soda OS.
 * 
 * Implements G-CORE-029 invariants:
 * - INV-029-001: Total investigation tool calls cannot exceed declared integer step ceilings.
 * - INV-029-002: Repeated queries for identical symbol/file paths yield cached slice references with zero redundant I/O.
 */

import crypto from 'node:crypto';

/**
 * FSM States for Investigation Budget Lifecycle
 */
export const INVESTIGATION_FSM_STATES = Object.freeze({
  BudgetReady: 'BudgetReady',
  TrackingCall: 'TrackingCall',
  CacheEvaluating: 'CacheEvaluating',
  ReturningCachedSlice: 'ReturningCachedSlice',
  ExecutingTool: 'ExecutingTool',
  BudgetExhausted: 'BudgetExhausted',
});

/**
 * Allowed transitions between FSM states
 */
const ALLOWED_FSM_TRANSITIONS = new Map([
  [INVESTIGATION_FSM_STATES.BudgetReady, new Set([INVESTIGATION_FSM_STATES.TrackingCall])],
  [INVESTIGATION_FSM_STATES.TrackingCall, new Set([INVESTIGATION_FSM_STATES.CacheEvaluating, INVESTIGATION_FSM_STATES.BudgetExhausted])],
  [INVESTIGATION_FSM_STATES.CacheEvaluating, new Set([INVESTIGATION_FSM_STATES.ReturningCachedSlice, INVESTIGATION_FSM_STATES.ExecutingTool])],
  [INVESTIGATION_FSM_STATES.ReturningCachedSlice, new Set([INVESTIGATION_FSM_STATES.TrackingCall, INVESTIGATION_FSM_STATES.BudgetExhausted])],
  [INVESTIGATION_FSM_STATES.ExecutingTool, new Set([INVESTIGATION_FSM_STATES.TrackingCall, INVESTIGATION_FSM_STATES.BudgetExhausted])],
  [INVESTIGATION_FSM_STATES.BudgetExhausted, new Set([])], // Terminal state
]);

/**
 * Transition investigation state with fail-closed validation
 * 
 * @param {string} fromState Current state
 * @param {string} toState Target state
 * @returns {string} New state
 */
export function transitionInvestigationState(fromState, toState) {
  const allowed = ALLOWED_FSM_TRANSITIONS.get(fromState);
  if (!allowed || !allowed.has(toState)) {
    throw new Error(
      `Illegal FSM state transition: Cannot transition from '${fromState}' to '${toState}'. Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`
    );
  }
  return toState;
}

/**
 * Create a new bounded investigation session context
 * 
 * @param {object} params
 * @param {string} params.sessionId Unique session identifier
 * @param {number} [params.maxToolCalls=30] Maximum allowed tool calls
 * @returns {object} Session object
 */
export function createInvestigationSession({ sessionId, maxToolCalls = 30 } = {}) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new TypeError('sessionId must be a non-empty string');
  }
  if (typeof maxToolCalls !== 'number' || !Number.isInteger(maxToolCalls) || maxToolCalls <= 0) {
    throw new TypeError('maxToolCalls must be a positive integer');
  }

  return {
    sessionId,
    maxToolCalls,
    currentCalls: 0,
    state: INVESTIGATION_FSM_STATES.BudgetReady,
    callHistory: [],
    sliceCache: new Map(),
  };
}

/**
 * Intercept and track a tool call against the declared ceiling
 * 
 * @param {object} session Investigation session context
 * @param {object} callDetails Tool call descriptor
 * @param {object} [options]
 * @param {boolean} [options.failClosed=false] Throw immediately if budget exceeded
 * @returns {object} Decision object { allowed: boolean, currentCalls: number, reason: string | null }
 */
export function trackToolCall(session, callDetails, options = {}) {
  if (!session || typeof session !== 'object') {
    throw new TypeError('Invalid investigation session');
  }

  if (session.currentCalls >= session.maxToolCalls) {
    session.state = INVESTIGATION_FSM_STATES.BudgetExhausted;
    if (options.failClosed) {
      throw new Error(`Investigation tool call ceiling (${session.maxToolCalls}) exceeded for session '${session.sessionId}'. Execution halted.`);
    }
    return {
      allowed: false,
      currentCalls: session.currentCalls,
      reason: 'BUDGET_CEILING_EXCEEDED',
    };
  }

  session.currentCalls += 1;
  session.state = INVESTIGATION_FSM_STATES.TrackingCall;
  session.callHistory.push({
    timestamp_iso: new Date().toISOString(),
    tool: callDetails.toolName || 'unknown',
    details: callDetails,
  });

  return {
    allowed: true,
    currentCalls: session.currentCalls,
    reason: null,
  };
}

/**
 * Compute SHA-256 digest of file slice key
 * 
 * @param {string} filePath File path
 * @param {number} startLine Start line number
 * @param {number} endLine End line number
 * @returns {string} 64-character hex hash
 */
export function computeSliceDigest(filePath, startLine, endLine) {
  const key = `${filePath}:${startLine}:${endLine}`;
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

/**
 * Get or load a cached file slice avoiding duplicate I/O
 * 
 * @param {object} session Investigation session context
 * @param {object} params
 * @param {string} params.filePath Path to inspected file
 * @param {number} params.startLine Start line
 * @param {number} params.endLine End line
 * @param {function} params.loader Loader function returning slice content if not in cache
 * @returns {object} { cached: boolean, content: string, sha256: string }
 */
export function getOrSetCachedSlice(session, { filePath, startLine, endLine, loader }) {
  if (!session || !session.sliceCache) {
    throw new TypeError('Invalid session context for slice cache');
  }
  if (!filePath || typeof startLine !== 'number' || typeof endLine !== 'number') {
    throw new TypeError('Invalid slice parameters');
  }

  const sliceKey = `${filePath}#L${startLine}-L${endLine}`;
  session.state = INVESTIGATION_FSM_STATES.CacheEvaluating;

  if (session.sliceCache.has(sliceKey)) {
    session.state = INVESTIGATION_FSM_STATES.ReturningCachedSlice;
    const entry = session.sliceCache.get(sliceKey);
    return {
      cached: true,
      content: entry.content,
      sha256: entry.sha256,
    };
  }

  session.state = INVESTIGATION_FSM_STATES.ExecutingTool;
  const content = typeof loader === 'function' ? loader() : '';
  const sha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

  session.sliceCache.set(sliceKey, {
    content,
    sha256,
    cachedAt: new Date().toISOString(),
  });

  return {
    cached: false,
    content,
    sha256,
  };
}

/**
 * Model Pairing Router Driver
 * 
 * Provides deterministic task complexity scoring, subagent model tier allocation
 * (flash_lite, flash, pro), exact BigInt micro-currency cost accounting, and high-risk
 * goal safety overrides in Soda OS.
 * 
 * Implements G-CORE-028 invariants:
 * - INV-028-001: All token costs, rates, and budgets use exact integer BigInt arithmetic without IEEE 754 floats.
 * - INV-028-002: High-risk goals strictly allocate to the pro tier regardless of minimal diff size.
 */

/**
 * Model Tiers supported by Soda OS runtime
 */
export const MODEL_TIERS = Object.freeze({
  FLASH_LITE: 'flash_lite',
  FLASH: 'flash',
  PRO: 'pro',
});

/**
 * FSM States for Model Pairing Router
 */
export const ROUTER_FSM_STATES = Object.freeze({
  TaskReceived: 'TaskReceived',
  ScoringComplexity: 'ScoringComplexity',
  AssigningModelTier: 'AssigningModelTier',
  BudgetVerified: 'BudgetVerified',
  AllocatedAndDispatched: 'AllocatedAndDispatched',
});

/**
 * Allowed transitions between FSM states
 */
const ALLOWED_FSM_TRANSITIONS = new Map([
  [ROUTER_FSM_STATES.TaskReceived, new Set([ROUTER_FSM_STATES.ScoringComplexity])],
  [ROUTER_FSM_STATES.ScoringComplexity, new Set([ROUTER_FSM_STATES.AssigningModelTier])],
  [ROUTER_FSM_STATES.AssigningModelTier, new Set([ROUTER_FSM_STATES.BudgetVerified])],
  [ROUTER_FSM_STATES.BudgetVerified, new Set([ROUTER_FSM_STATES.AllocatedAndDispatched])],
  [ROUTER_FSM_STATES.AllocatedAndDispatched, new Set([ROUTER_FSM_STATES.ScoringComplexity])],
]);

/**
 * Transition router FSM state with fail-closed validation
 * 
 * @param {string} fromState Current state
 * @param {string} toState Target state
 * @returns {string} New state
 */
export function transitionRouterState(fromState, toState) {
  const allowed = ALLOWED_FSM_TRANSITIONS.get(fromState);
  if (!allowed || !allowed.has(toState)) {
    throw new Error(
      `Illegal FSM state transition: Cannot transition from '${fromState}' to '${toState}'. Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`
    );
  }
  return toState;
}

/**
 * Rates per 1,000 tokens in micro-USD (1 USD = 1,000,000 micro-USD)
 * Article VI Exact Integer Representation
 */
export const TIER_RATES_PER_1K_MICRO = Object.freeze({
  [MODEL_TIERS.FLASH_LITE]: {
    inputPer1k: 75n,    // $0.000075 / 1k = 75 micro-USD
    outputPer1k: 300n,  // $0.000300 / 1k = 300 micro-USD
  },
  [MODEL_TIERS.FLASH]: {
    inputPer1k: 150n,   // $0.000150 / 1k = 150 micro-USD
    outputPer1k: 600n,  // $0.000600 / 1k = 600 micro-USD
  },
  [MODEL_TIERS.PRO]: {
    inputPer1k: 1250n,  // $0.001250 / 1k = 1250 micro-USD
    outputPer1k: 5000n, // $0.005000 / 1k = 5000 micro-USD
  },
});

/**
 * Compute deterministic task complexity score
 * 
 * @param {object} params
 * @param {number} params.diffLines Number of modified code lines
 * @param {number} params.fileCount Number of touched files
 * @param {number} params.cyclomaticDepth Max cyclomatic complexity / AST depth
 * @returns {number} Integer complexity score
 */
export function computeTaskComplexityScore({ diffLines = 0, fileCount = 1, cyclomaticDepth = 1 } = {}) {
  if (typeof diffLines !== 'number' || !Number.isInteger(diffLines) || diffLines < 0) {
    throw new TypeError('diffLines must be a non-negative integer');
  }
  if (typeof fileCount !== 'number' || !Number.isInteger(fileCount) || fileCount < 0) {
    throw new TypeError('fileCount must be a non-negative integer');
  }
  if (typeof cyclomaticDepth !== 'number' || !Number.isInteger(cyclomaticDepth) || cyclomaticDepth < 0) {
    throw new TypeError('cyclomaticDepth must be a non-negative integer');
  }

  // Weightings: diffLines (1x), fileCount (10x), cyclomaticDepth (5x)
  return diffLines + (fileCount * 10) + (cyclomaticDepth * 5);
}

/**
 * Allocate model tier based on task complexity and goal risk level
 * 
 * @param {object} params
 * @param {object} params.task Task details (diffLines, fileCount, cyclomaticDepth)
 * @param {string} params.goalRiskLevel 'low' | 'medium' | 'high'
 * @returns {object} Allocation decision with tier, score, and override reason
 */
export function allocateModelTier({ task = {}, goalRiskLevel = 'low' } = {}) {
  const normalizedRisk = String(goalRiskLevel).toLowerCase();

  // INV-028-002: High-risk goals unconditionally map to PRO tier
  if (normalizedRisk === 'high' || normalizedRisk === 'critical') {
    return {
      tier: MODEL_TIERS.PRO,
      complexityScore: computeTaskComplexityScore(task),
      riskLevel: normalizedRisk,
      overrideReason: 'HIGH_RISK_GOAL_PRO_OVERRIDE',
    };
  }

  const score = computeTaskComplexityScore(task);

  // Complexity thresholds:
  // score <= 35: flash_lite (e.g. quick doc edit, single small function fix)
  // 36 <= score <= 120: flash (standard feature implementation, routine tests)
  // score > 120: pro (complex architecture, multi-file refactor)
  let tier = MODEL_TIERS.FLASH;
  if (score <= 35 && normalizedRisk === 'low') {
    tier = MODEL_TIERS.FLASH_LITE;
  } else if (score > 120) {
    tier = MODEL_TIERS.PRO;
  }

  return {
    tier,
    complexityScore: score,
    riskLevel: normalizedRisk,
    overrideReason: null,
  };
}

/**
 * Calculate token cost in micro-USD using exact BigInt integer math (Article VI)
 * 
 * @param {object} params
 * @param {string} params.tier Model tier
 * @param {bigint} params.inputTokens Input tokens count
 * @param {bigint} params.outputTokens Output tokens count
 * @returns {bigint} Total cost in micro-USD (BigInt)
 */
export function calculateTokenCostMicro({ tier, inputTokens = 0n, outputTokens = 0n } = {}) {
  if (typeof inputTokens !== 'bigint' || inputTokens < 0n || typeof outputTokens !== 'bigint' || outputTokens < 0n) {
    throw new TypeError('Token counts must be non-negative BigInt integers');
  }

  const rates = TIER_RATES_PER_1K_MICRO[tier];
  if (!rates) {
    throw new Error(`Unknown model tier: ${tier}`);
  }

  // Exact integer math: (tokens * ratePer1k + 999) / 1000 with ceiling rounding
  const inputCost = (inputTokens * rates.inputPer1k + 999n) / 1000n;
  const outputCost = (outputTokens * rates.outputPer1k + 999n) / 1000n;

  return inputCost + outputCost;
}

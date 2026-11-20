/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🚀 SODA OS AUTONOMOUS AUTOPILOT FLEET RUNNER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Supervisor driving continuous backlog draining, bounded execution loops,
 *          and fail-closed error handling for multi-goal swarming.
 * Invariants: Zero Mocks (Article I), Loop Boundedness (INV-035-001),
 *             Monotonic Queue Progress (INV-035-002)
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const AUTOPILOT_STATES = Object.freeze({
  QUEUE_INSPECTED: 'QueueInspected',
  GOAL_SELECTED: 'GoalSelected',
  EXECUTION_DISPATCHED: 'ExecutionDispatched',
  RESULT_EVALUATED: 'ResultEvaluated',
  QUEUE_UPDATED: 'QueueUpdated',
  AUTOPILOT_COMPLETED: 'AutopilotCompleted',
  FAIL_CLOSED_ABORTED: 'FailClosedAborted'
});

export const VALID_AUTOPILOT_TRANSITIONS = Object.freeze({
  [AUTOPILOT_STATES.QUEUE_INSPECTED]: [
    AUTOPILOT_STATES.GOAL_SELECTED,
    AUTOPILOT_STATES.AUTOPILOT_COMPLETED
  ],
  [AUTOPILOT_STATES.GOAL_SELECTED]: [
    AUTOPILOT_STATES.EXECUTION_DISPATCHED,
    AUTOPILOT_STATES.FAIL_CLOSED_ABORTED
  ],
  [AUTOPILOT_STATES.EXECUTION_DISPATCHED]: [
    AUTOPILOT_STATES.RESULT_EVALUATED
  ],
  [AUTOPILOT_STATES.RESULT_EVALUATED]: [
    AUTOPILOT_STATES.QUEUE_UPDATED,
    AUTOPILOT_STATES.FAIL_CLOSED_ABORTED
  ],
  [AUTOPILOT_STATES.QUEUE_UPDATED]: [
    AUTOPILOT_STATES.QUEUE_INSPECTED,
    AUTOPILOT_STATES.AUTOPILOT_COMPLETED
  ],
  [AUTOPILOT_STATES.AUTOPILOT_COMPLETED]: [],
  [AUTOPILOT_STATES.FAIL_CLOSED_ABORTED]: []
});

export function transitionAutopilotState(fromState, toState) {
  const allowed = VALID_AUTOPILOT_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidAutopilotStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

/**
 * Evaluates backlog items to identify eligible goals ready for execution.
 * A goal is eligible if:
 * 1. Its status is 'ready' (or promotable 'draft'/'planned').
 * 2. All of its dependencies are satisfied (i.e. 'done' or absent).
 */
export function evaluateBacklogQueue(goals = []) {
  const completedIds = new Set(
    goals.filter(g => g.status === 'done').map(g => g.id)
  );

  const eligible = [];
  const blocked = [];
  const completed = [];

  for (const goal of goals) {
    if (goal.status === 'done') {
      completed.push(goal);
      continue;
    }

    const dependencies = Array.isArray(goal.depends_on)
      ? goal.depends_on
      : (typeof goal.depends_on === 'string' && goal.depends_on && goal.depends_on !== '—')
        ? [goal.depends_on]
        : [];

    const isUnblocked = dependencies.every(dep => completedIds.has(dep));

    if (isUnblocked && (goal.status === 'ready' || goal.status === 'draft' || goal.status === 'planned')) {
      eligible.push(goal);
    } else {
      blocked.push(goal);
    }
  }

  return { eligible, blocked, completed };
}

/**
 * Executes the bounded autopilot loop across eligible goals.
 * Enforces:
 * - INV-035-001 (Boundedness): Iteration count <= maxIterations.
 * - INV-035-002 (Monotonicity): Queue length is non-increasing.
 * - Fail-closed abort on any non-zero exit code or error.
 */
export async function runAutopilotLoop({
  goals = [],
  maxIterations = 10,
  executor,
  onStep
} = {}) {
  if (typeof executor !== 'function') {
    throw new Error('AutopilotError: An async goal executor function is required');
  }

  let currentState = AUTOPILOT_STATES.QUEUE_INSPECTED;
  let iterations = 0;
  const goalsCompleted = [];
  const maxIters = Math.max(0, parseInt(maxIterations, 10) || 0);

  while (iterations < maxIters) {
    const queueEval = evaluateBacklogQueue(goals);

    if (typeof onStep === 'function') {
      onStep({
        iteration: iterations,
        remainingQueueLength: queueEval.eligible.length + queueEval.blocked.length,
        eligibleCount: queueEval.eligible.length
      });
    }

    if (queueEval.eligible.length === 0) {
      // Backlog drained or remaining goals blocked
      currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.AUTOPILOT_COMPLETED);
      break;
    }

    const targetGoal = queueEval.eligible[0];
    currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.GOAL_SELECTED);

    currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.EXECUTION_DISPATCHED);
    iterations++;

    let execResult;
    try {
      execResult = await executor(targetGoal);
    } catch (err) {
      execResult = { success: false, exitCode: 1, error: err.message };
    }

    currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.RESULT_EVALUATED);

    if (!execResult || !execResult.success || execResult.exitCode !== 0) {
      currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.FAIL_CLOSED_ABORTED);
      return {
        status: currentState,
        iterationsCompleted: iterations,
        goalsCompleted,
        failedGoalId: targetGoal.id,
        error: execResult?.error || `Goal ${targetGoal.id} failed with exit code ${execResult?.exitCode}`
      };
    }

    targetGoal.status = 'done';
    goalsCompleted.push(targetGoal.id);
    currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.QUEUE_UPDATED);

    // Prepare for next iteration
    const nextEval = evaluateBacklogQueue(goals);
    if (nextEval.eligible.length === 0 || iterations >= maxIters) {
      currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.AUTOPILOT_COMPLETED);
      break;
    } else {
      currentState = transitionAutopilotState(currentState, AUTOPILOT_STATES.QUEUE_INSPECTED);
    }
  }

  if (currentState !== AUTOPILOT_STATES.AUTOPILOT_COMPLETED && currentState !== AUTOPILOT_STATES.FAIL_CLOSED_ABORTED) {
    currentState = AUTOPILOT_STATES.AUTOPILOT_COMPLETED;
  }

  return {
    status: currentState,
    iterationsCompleted: iterations,
    goalsCompleted,
    remainingGoalsCount: evaluateBacklogQueue(goals).eligible.length
  };
}

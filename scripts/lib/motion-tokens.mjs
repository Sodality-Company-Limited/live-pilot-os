/**
 * Directional Easing Physics Taxonomy & Motion Token Integration
 * Grounded in LottieFiles Motion Design Skill principles:
 * - Entrances: Decelerate (fast arrival, graceful landing)
 * - Exits: Accelerate (slow start, fast departure)
 * - State Changes: Symmetric Ease-In-Out
 */

export const DIRECTIONAL_EASING = Object.freeze({
  entrance: 'cubic-bezier(0, 0, 0.2, 1)', // Decelerate curve
  exit: 'cubic-bezier(0.4, 0, 1, 1)',      // Accelerate curve
  state: 'cubic-bezier(0.4, 0, 0.2, 1)'    // Symmetric ease-in-out
});

export const SPEED_BUDGETS = Object.freeze({
  micro: { min: 100, max: 200, default: 150 },
  component: { min: 200, max: 300, default: 250 },
  modal: { min: 300, max: 400, default: 350 },
  page: { min: 400, max: 500, default: 450 }
});

/**
 * Resolves the directional easing curve.
 * @param {'entrance' | 'exit' | 'state'} direction 
 * @returns {string} cubic-bezier curve string
 */
export function getEasingForTransition(direction) {
  if (!DIRECTIONAL_EASING[direction]) {
    throw new Error(`Invalid transition direction: ${direction}. Must be entrance, exit, or state.`);
  }
  return DIRECTIONAL_EASING[direction];
}

/**
 * Validates if a duration in milliseconds is within a category speed budget.
 * @param {'micro' | 'component' | 'modal' | 'page'} category 
 * @param {number} durationMs 
 * @returns {boolean}
 */
export function validateDurationBudget(category, durationMs) {
  const budget = SPEED_BUDGETS[category];
  if (!budget) {
    throw new Error(`Invalid speed budget category: ${category}`);
  }
  return durationMs >= budget.min && durationMs <= budget.max;
}

/**
 * Resolves a complete motion token object.
 * @param {'entrance' | 'exit' | 'state'} direction 
 * @param {'micro' | 'component' | 'modal' | 'page'} category 
 * @returns {{ direction: string, category: string, durationMs: number, easing: string, cssTransition: string }}
 */
export function resolveMotionToken(direction, category) {
  const easing = getEasingForTransition(direction);
  const budget = SPEED_BUDGETS[category];
  if (!budget) {
    throw new Error(`Invalid speed budget category: ${category}`);
  }
  const durationMs = budget.default;
  return {
    direction,
    category,
    durationMs,
    easing,
    cssTransition: `all ${durationMs}ms ${easing}`
  };
}

/**
 * The One-Third Spatial Motion Invariant & Stagger Cap Guard
 * Invariants:
 * 1. Spatial offset for translation must not exceed 1/3 of the element's bounding dimension.
 * 2. Absolute maximum spatial cap is 24px for component entrances/exits to prevent jarring layout jumps.
 * 3. Stagger sequences are capped at 5 discrete steps; subsequent items enter as a unified trailing batch.
 * 4. Total cumulative group stagger sequence must not exceed 600ms latency budget.
 */

export const MAX_SPATIAL_OFFSET_CAP_PX = 24;
export const MAX_STAGGER_STEPS = 5;
export const MAX_TOTAL_STAGGER_LATENCY_MS = 600;

/**
 * Validates spatial offset bounds.
 * @param {{ dimensionPx: number, offsetPx: number, customCapPx?: number }} params
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSpatialOffset({ dimensionPx, offsetPx, customCapPx }) {
  const cap = customCapPx || MAX_SPATIAL_OFFSET_CAP_PX;
  const absOffset = Math.abs(offsetPx);

  if (absOffset > cap) {
    return {
      valid: false,
      reason: `Offset ${absOffset}px exceeds maximum spatial cap of ${cap}px.`
    };
  }

  const oneThirdBound = dimensionPx / 3.0;
  if (absOffset > oneThirdBound) {
    return {
      valid: false,
      reason: `Offset ${absOffset}px exceeds 1/3 bound (${oneThirdBound.toFixed(1)}px) of element dimension ${dimensionPx}px.`
    };
  }

  return { valid: true };
}

/**
 * Calculates deterministic stagger timing with a hard cap of 5 steps.
 * @param {number} itemCount
 * @param {number} stepMs
 * @param {number} itemDurationMs
 * @returns {Array<{ index: number, delayMs: number, durationMs: number }>}
 */
export function calculateStaggerTiming(itemCount, stepMs, itemDurationMs) {
  const sequence = [];
  for (let i = 0; i < itemCount; i++) {
    const effectiveStep = Math.min(i, MAX_STAGGER_STEPS - 1);
    sequence.push({
      index: i,
      delayMs: effectiveStep * stepMs,
      durationMs: itemDurationMs
    });
  }
  return sequence;
}

/**
 * Validates whether a proposed stagger sequence exceeds the cumulative duration SLA.
 * @param {{ itemCount: number, stepMs: number, itemDurationMs: number }} params
 * @returns {{ valid: boolean, totalDurationMs: number, reason?: string }}
 */
export function validateStaggerSequence({ itemCount, stepMs, itemDurationMs }) {
  const effectiveSteps = Math.min(Math.max(itemCount - 1, 0), MAX_STAGGER_STEPS - 1);
  const totalDurationMs = (effectiveSteps * stepMs) + itemDurationMs;

  if (totalDurationMs > MAX_TOTAL_STAGGER_LATENCY_MS) {
    return {
      valid: false,
      totalDurationMs,
      reason: `Cumulative sequence duration ${totalDurationMs}ms exceeds ${MAX_TOTAL_STAGGER_LATENCY_MS}ms budget.`
    };
  }

  return {
    valid: true,
    totalDurationMs
  };
}

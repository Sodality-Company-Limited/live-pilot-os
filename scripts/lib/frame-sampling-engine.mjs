/**
 * DAVE Frame-Accurate Discrete Visual Sampling Engine
 * Invariants:
 * 1. Headless screenshots are sampled at deterministic frame intervals, never arbitrary wall-clock sleeps.
 * 2. Mandatory sampling points: 0% (start), 50% (midpoint), 100% (settled).
 * 3. Optional inflection sampling at 25% and 75% for non-linear easing verification.
 */

/**
 * Computes deterministic discrete sampling frames for visual regression testing.
 * @param {{ durationMs: number, fps?: number, includeInflections?: boolean }} options 
 * @returns {{ durationMs: number, fps: number, totalFrames: number, startFrame: number, midpointFrame: number, settledFrame: number, sampleFrames: number[] }}
 */
export function computeDiscreteSamplingFrames(options) {
  const durationMs = options.durationMs || 300;
  const fps = options.fps || 60;
  const includeInflections = Boolean(options.includeInflections);

  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const startFrame = 0;
  const midpointFrame = Math.round(totalFrames * 0.5);
  const settledFrame = totalFrames;

  const sampleFrames = [startFrame];

  if (includeInflections) {
    const q1 = Math.round(totalFrames * 0.25);
    sampleFrames.push(q1);
  }

  sampleFrames.push(midpointFrame);

  if (includeInflections) {
    const q3 = Math.round(totalFrames * 0.75);
    sampleFrames.push(q3);
  }

  sampleFrames.push(settledFrame);

  return {
    durationMs,
    fps,
    totalFrames,
    startFrame,
    midpointFrame,
    settledFrame,
    sampleFrames: Array.from(new Set(sampleFrames)).sort((a, b) => a - b)
  };
}

/**
 * Validates that all sampled frames stay strictly within the total frame envelope.
 * @param {{ totalFrames: number, sampleFrames: number[] }} plan 
 * @returns {boolean}
 */
export function validateSamplingCoverage(plan) {
  if (!plan || !Array.isArray(plan.sampleFrames) || typeof plan.totalFrames !== 'number') {
    return false;
  }
  return plan.sampleFrames.every(f => f >= 0 && f <= plan.totalFrames);
}

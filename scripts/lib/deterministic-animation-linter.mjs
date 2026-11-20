/**
 * Wall-Clock & Unclamped Interpolation Static Linter
 * Grounded in Remotion deterministic rendering laws:
 * - One clock only: forbids Date.now(), performance.now() in visual render routines
 * - Zero uncoordinated async timers: forbids setTimeout, setInterval in frame calculations
 * - Determinism: forbids Math.random(), requires seeded PRNG
 * - Clamping: requires interpolate() to explicitly declare clamp bounds
 */

/**
 * Lints code snippet for non-deterministic visual animation violations.
 * @param {string} source 
 * @returns {{ valid: boolean, violations: Array<{ type: string, message: string }> }}
 */
export function lintDeterministicAnimationCode(source) {
  const violations = [];

  // Check 1: Forbidden wall-clock time
  if (/(?:Date\.now|performance\.now)\s*\(\s*\)/.test(source)) {
    violations.push({
      type: 'FORBIDDEN_WALL_CLOCK_TIME',
      message: 'Detected wall-clock timing (Date.now/performance.now). Must use frame-driven clock (useCurrentFrame or VirtualFrameClock).'
    });
  }

  // Check 2: Forbidden async timers
  if (/(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/.test(source)) {
    violations.push({
      type: 'FORBIDDEN_ASYNC_TIMER',
      message: 'Detected asynchronous timer (setTimeout/setInterval/requestAnimationFrame). Animation must be mathematically bound to frame indices.'
    });
  }

  // Check 3: Forbidden unseeded random
  if (/Math\.random\s*\(\s*\)/.test(source)) {
    violations.push({
      type: 'FORBIDDEN_UNSEEDED_RANDOM',
      message: 'Detected Math.random(). Must use deterministic seeded pseudo-random generator.'
    });
  }

  // Check 4: Unclamped interpolation calls
  // Detects interpolate(frame, [...], [...]) without { extrapolate... clamp }
  const interpolateMatches = source.match(/interpolate\s*\([^;]+?\)/g) || [];
  for (const match of interpolateMatches) {
    if (!/extrapolateLeft|extrapolateRight|clamp/i.test(match)) {
      violations.push({
        type: 'UNCLAMPED_INTERPOLATION',
        message: 'interpolate() call missing explicit clamp options (extrapolateLeft/extrapolateRight: clamp).'
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

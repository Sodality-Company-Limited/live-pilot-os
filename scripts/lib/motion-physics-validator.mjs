/**
 * Automated Motion Physics & Reduced-Motion Static Code Validator
 * Invariants:
 * 1. ZERO linear transitions on spatial movement (transform, translate, scale).
 * 2. Capped speed budgets (default <= 400ms without exemption comment).
 * 3. Mandatory prefers-reduced-motion fallback when non-essential animations are declared.
 */

/**
 * Validates motion CSS or styled content.
 * @param {string} source
 * @returns {{ valid: boolean, violations: Array<{ type: string, message: string }> }}
 */
export function validateMotionPhysicsCode(source) {
  const violations = [];

  // Check 1: Forbidden linear spatial movement
  const linearRegex = /transition\s*:[^;]*(?:transform|translate|scale)[^;]*linear|transition\s*:[^;]*linear[^;]*(?:transform|translate|scale)/i;
  if (linearRegex.test(source)) {
    violations.push({
      type: 'FORBIDDEN_LINEAR_MOTION',
      message: 'Linear easing detected on spatial transform/scale/translate property. Must use physics spring or cubic-bezier curve.'
    });
  }

  // Check 2: Duration speed budget (> 400ms)
  const durationMatch = source.match(/transition\s*:[^;]*?(\d+)(ms|s)/i);
  if (durationMatch) {
    let durationMs = parseInt(durationMatch[1], 10);
    if (durationMatch[2].toLowerCase() === 's') {
      durationMs *= 1000;
    }
    const isExempt = /@motion-exempt/.test(source);
    if (durationMs > 400 && !isExempt) {
      violations.push({
        type: 'DURATION_BUDGET_EXCEEDED',
        message: `Duration ${durationMs}ms exceeds standard 400ms speed budget without @motion-exempt.`
      });
    }
  }

  // Check 3: Reduced motion query check if @keyframes or infinite animation exists
  const hasKeyframesOrInfinite = /@keyframes|animation\s*:[^;]*infinite/i.test(source);
  const hasReducedMotion = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(source);

  if (hasKeyframesOrInfinite && !hasReducedMotion) {
    violations.push({
      type: 'MISSING_REDUCED_MOTION_FALLBACK',
      message: 'Persistent or keyframe animation declared without mandatory @media (prefers-reduced-motion: reduce) fallback.'
    });
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Lints a collection of style files or code blocks.
 * @param {Array<{ file: string, content: string }>} files
 * @returns {{ totalFiles: number, failedFiles: number, results: Array<{ file: string, valid: boolean, violations: Array<any> }> }}
 */
export function lintMotionStyles(files) {
  let failedFiles = 0;
  const results = files.map(f => {
    const res = validateMotionPhysicsCode(f.content);
    if (!res.valid) failedFiles++;
    return {
      file: f.file,
      valid: res.valid,
      violations: res.violations
    };
  });

  return {
    totalFiles: files.length,
    failedFiles,
    results
  };
}

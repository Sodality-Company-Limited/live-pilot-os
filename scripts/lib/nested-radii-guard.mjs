/**
 * Mathematical Nested Radii Geometry Engine & Layout Linter
 * Grounded in elayadesign landing page design invariants:
 * - Nested Radii Formula: r_inner = r_outer - padding
 * - Condition: Applied when padding/gap < 32px
 * - Threshold: If r_inner < 2px, snap to 0px (square)
 */

export const NESTED_RADII_GAP_LIMIT_PX = 32;
export const NESTED_RADII_MIN_THRESHOLD_PX = 2;

/**
 * Calculates the mathematically concentric inner radius.
 * @param {number} outerRadiusPx 
 * @param {number} paddingPx 
 * @returns {number}
 */
export function calculateNestedRadius(outerRadiusPx, paddingPx) {
  const diff = outerRadiusPx - paddingPx;
  if (diff < NESTED_RADII_MIN_THRESHOLD_PX) {
    return 0;
  }
  return diff;
}

/**
 * Validates concentric geometry between container and child element.
 * @param {{ radiusPx: number, paddingPx: number }} container 
 * @param {{ radiusPx: number }} child 
 * @returns {{ valid: boolean, expectedRadiusPx?: number, reason?: string }}
 */
export function validateNestedRadiiGeometry(container, child) {
  // If gap/padding is 32px or greater, outer and inner radii are perceptually decoupled
  if (container.paddingPx >= NESTED_RADII_GAP_LIMIT_PX) {
    return { valid: true };
  }

  const expectedRadiusPx = calculateNestedRadius(container.radiusPx, container.paddingPx);

  if (Math.abs(child.radiusPx - expectedRadiusPx) > 1) {
    return {
      valid: false,
      expectedRadiusPx,
      reason: `Concentricity violation: Child radius ${child.radiusPx}px does not match expected nested radius ${expectedRadiusPx}px (outer: ${container.radiusPx}px - padding: ${container.paddingPx}px).`
    };
  }

  return {
    valid: true,
    expectedRadiusPx
  };
}

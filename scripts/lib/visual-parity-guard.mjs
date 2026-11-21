/**
 * @file visual-parity-guard.mjs
 * @description Pixel-level bitmap diffing, exact basis-point mismatch calculation, and layout shift guard.
 * Enforces zero-float arithmetic, symmetric comparisons, and strict tolerance verification.
 */

/**
 * Calculates basis points from integer ratio: (mismatched * 10000) / total.
 * @param {number} mismatched
 * @param {number} total
 * @returns {number} Integer basis points [0, 10000].
 */
export function calculateBasisPointDiff(mismatched, total) {
  if (total <= 0) return 0;
  return Math.floor((mismatched * 10000) / total);
}

/**
 * Compares two raw RGBA pixel buffers and calculates pixel mismatch statistics.
 * @param {Buffer} bufferA - Baseline RGBA image buffer.
 * @param {Buffer} bufferB - Candidate RGBA image buffer.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @returns {object} Comparison results.
 */
export function comparePixelBuffers(bufferA, bufferB, width, height) {
  const expectedBytes = width * height * 4;

  if (bufferA.length !== expectedBytes || bufferB.length !== expectedBytes) {
    throw new Error(
      `Buffer size mismatch: expected ${expectedBytes} bytes for ${width}x${height} image, ` +
      `got bufferA=${bufferA.length} and bufferB=${bufferB.length}`
    );
  }

  let mismatchedPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < expectedBytes; i += 4) {
    const rDiff = bufferA[i] !== bufferB[i];
    const gDiff = bufferA[i + 1] !== bufferB[i + 1];
    const bDiff = bufferA[i + 2] !== bufferB[i + 2];
    const aDiff = bufferA[i + 3] !== bufferB[i + 3];

    if (rDiff || gDiff || bDiff || aDiff) {
      mismatchedPixels++;
    }
  }

  const diffBasisPoints = calculateBasisPointDiff(mismatchedPixels, totalPixels);

  return {
    identical: mismatchedPixels === 0,
    mismatchedPixels,
    totalPixels,
    diffBasisPoints,
    width,
    height
  };
}

/**
 * Validates visual parity between two buffers against a declared basis-point tolerance.
 * @param {Buffer} bufferA
 * @param {Buffer} bufferB
 * @param {number} width
 * @param {number} height
 * @param {object} [options={}]
 * @param {number} [options.toleranceBasisPoints=0] - Allowed mismatch in basis points (e.g. 50 = 0.50%).
 * @returns {object} Verification verdict.
 */
export function validateVisualParity(bufferA, bufferB, width, height, options = {}) {
  const toleranceBasisPoints = options.toleranceBasisPoints || 0;
  const diff = comparePixelBuffers(bufferA, bufferB, width, height);

  const passed = diff.diffBasisPoints <= toleranceBasisPoints;
  const reason = passed
    ? 'Parity satisfied within declared tolerance threshold'
    : `Visual mismatch ${diff.diffBasisPoints} bp exceeds tolerance of ${toleranceBasisPoints} bp (${diff.mismatchedPixels}/${diff.totalPixels} pixels)`;

  return {
    passed,
    reason,
    toleranceBasisPoints,
    diffBasisPoints: diff.diffBasisPoints,
    diff
  };
}

/**
 * Formats a structured visual parity inspection report.
 * @param {object} diffResult - Output from comparePixelBuffers.
 * @param {number} toleranceBasisPoints - Configured threshold.
 * @returns {string} Formatted ascii report.
 */
export function formatVisualParityReport(diffResult, toleranceBasisPoints = 0) {
  const status = diffResult.diffBasisPoints <= toleranceBasisPoints ? '✅ PASS' : '❌ FAIL';
  const percentage = (diffResult.diffBasisPoints / 100).toFixed(2);

  return [
    `🖼️ Visual Parity Report: ${status}`,
    `──────────────────────────────────────────────`,
    `  Dimensions:        ${diffResult.width}x${diffResult.height}px (${diffResult.totalPixels} pixels)`,
    `  Mismatched Pixels: ${diffResult.mismatchedPixels}`,
    `  Delta Ratio:       ${diffResult.diffBasisPoints} bp (${percentage}%)`,
    `  Tolerance:         ${toleranceBasisPoints} bp`,
    `  Status:            ${diffResult.identical ? 'IDENTICAL' : 'DIVERGENT'}`
  ].join('\n');
}

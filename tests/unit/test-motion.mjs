import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MOTION_RECEIPT_PATH,
  DEFAULT_MOTION_EVIDENCE_PATH,
  MAX_MOTION_DURATION_MS,
  LAYOUT_THRASHING_PROPERTIES,
  verifyMotionTokens,
  verifyPrefersReducedMotion,
  scanLayoutThrashingAndDurations,
  emitMotionReceipt,
  runMotionSuite
} from '../../scripts/harness/motion-harness.mjs';

describe('Motion and Interaction Fidelity Unit Test Suite (G-WEB-009)', () => {
  const cwd = process.cwd();
  const motionCssPath = path.join(cwd, 'code/src/styles/motion.css');
  const tokensCssPath = path.join(cwd, 'code/src/tokens/index.css');
  const harnessPath = path.join(cwd, 'scripts/harness/motion-harness.mjs');
  const receiptPath = path.join(cwd, DEFAULT_MOTION_RECEIPT_PATH);
  const evidencePath = path.join(cwd, DEFAULT_MOTION_EVIDENCE_PATH);

  it('1. should verify physical presence and content of motion touch map assets', () => {
    assert.ok(fs.existsSync(motionCssPath), `motion.css must exist at ${motionCssPath}`);
    assert.ok(fs.existsSync(tokensCssPath), `tokens index.css must exist at ${tokensCssPath}`);
    assert.ok(fs.existsSync(harnessPath), `motion-harness.mjs must exist at ${harnessPath}`);

    const content = fs.readFileSync(motionCssPath, 'utf8');
    assert.ok(content.length > 500, 'motion.css must contain substantial production motion definitions');
    assert.ok(content.includes('@import'), 'motion.css must import token foundations');
    assert.ok(content.includes('G-WEB-009'), 'motion.css must reference goal G-WEB-009');
  });

  it('2. should verify motion timing tokens and strict 300ms duration upper bound', () => {
    const tokenResult = verifyMotionTokens(motionCssPath, cwd);
    assert.equal(tokenResult.valid, true, `Token verification failed: ${tokenResult.violations.join(', ')}`);
    assert.equal(tokenResult.violations.length, 0);
    assert.ok(tokenResult.hash.startsWith('sha256:'), 'Must compute valid SHA-256 hash');
    assert.ok(tokenResult.durationsChecked >= 4, 'Must verify all required duration tokens');
  });

  it('3. should verify cubic-bezier velocity curves and physics parameters', () => {
    const tokenResult = verifyMotionTokens(motionCssPath, cwd);
    assert.ok(tokenResult.easingsChecked >= 4, 'Must verify standard, decelerate, accelerate, spring easings');

    const content = fs.readFileSync(motionCssPath, 'utf8');
    assert.ok(content.includes('--motion-ease-standard: cubic-bezier('));
    assert.ok(content.includes('--motion-ease-decelerate: cubic-bezier('));
    assert.ok(content.includes('--motion-ease-accelerate: cubic-bezier('));
    assert.ok(content.includes('--motion-ease-spring: cubic-bezier('));
  });

  it('4. should verify max transition duration ceiling constant is 300ms', () => {
    assert.equal(MAX_MOTION_DURATION_MS, 300, 'Maximum allowable UI transition duration must be 300ms');
  });

  it('5. should verify all keyframes strictly use GPU-accelerated transform/opacity with zero layout thrashing', () => {
    const scan = scanLayoutThrashingAndDurations('code', cwd);
    assert.equal(scan.valid, true, `Layout thrashing detected: ${scan.violations.join(', ')}`);
    assert.ok(scan.keyframesAudited >= 4, 'Must audit all workspace keyframes');
    assert.equal(LAYOUT_THRASHING_PROPERTIES.length, 8);
    assert.ok(LAYOUT_THRASHING_PROPERTIES.includes('top'));
    assert.ok(LAYOUT_THRASHING_PROPERTIES.includes('left'));
    assert.ok(LAYOUT_THRASHING_PROPERTIES.includes('width'));
    assert.ok(LAYOUT_THRASHING_PROPERTIES.includes('height'));
  });

  it('6. should assert absence of linear easing anti-patterns across workspace', () => {
    const scan = scanLayoutThrashingAndDurations('code', cwd);
    const linearViolations = scan.violations.filter(v => v.includes('Linear easing'));
    assert.equal(linearViolations.length, 0, 'No linear easing anti-patterns allowed');
  });

  it('7. should verify accessibility prefers-reduced-motion media query overrides', () => {
    const reducedMotion = verifyPrefersReducedMotion(motionCssPath, cwd);
    assert.equal(reducedMotion.valid, true, `Reduced motion verification failed: ${reducedMotion.violations.join(', ')}`);
    assert.equal(reducedMotion.hasReducedMotionQuery, true);
    assert.equal(reducedMotion.hasDurationOverride, true);
    assert.equal(reducedMotion.hasTransitionOverride, true);
    assert.equal(reducedMotion.hasScrollOverride, true);
  });

  it('8. should execute full motion verification suite cleanly with zero violations', () => {
    const suite = runMotionSuite(cwd);
    assert.equal(suite.valid, true, `Motion suite failed: ${suite.errors.join(', ')}`);
    assert.equal(suite.errors.length, 0);
    assert.ok(suite.scan.filesScanned >= 5, 'Must scan all relevant code files');
  });

  it('9. should emit valid cryptographic motion proof receipts bound to exact git revision', () => {
    const { proofPath, evidencePath, receipt } = emitMotionReceipt(cwd);
    assert.ok(fs.existsSync(proofPath), `Receipt must exist at ${proofPath}`);
    assert.ok(fs.existsSync(evidencePath), `Evidence receipt must exist at ${evidencePath}`);

    assert.equal(receipt.goal_id, 'G-WEB-009');
    assert.equal(receipt.artifact_id, 'ART-MOTION-RECEIPT');
    assert.equal(receipt.classification, 'executable_invariant');
    assert.equal(receipt.status, 'PASSED');
    assert.equal(receipt.certification, 'PASS');
    assert.deepEqual(receipt.violations, { critical: 0, serious: 0, moderate: 0, minor: 0 });

    assert.equal(receipt.motion_metrics.max_transition_duration_ms, 300);
    assert.equal(receipt.motion_metrics.max_duration_ceiling_satisfied, true);
    assert.equal(receipt.motion_metrics.prefers_reduced_motion_override_active, true);
    assert.ok(receipt.source_files.length >= 3, 'Must hash touch map files');
  });

  it('10. should fail closed on missing motion stylesheet or simulated layout thrashing property', () => {
    // Fail-closed on missing file
    assert.throws(
      () => verifyMotionTokens('/invalid/missing/motion.css', cwd),
      /Motion stylesheet missing/
    );

    assert.throws(
      () => verifyPrefersReducedMotion('/invalid/missing/motion.css', cwd),
      /Motion stylesheet missing/
    );

    // Fail-closed detection of layout thrashing property
    const badKeyframe = '@keyframes badMotion { 0% { top: 0px; } 100% { top: 50px; } }';
    assert.ok(
      LAYOUT_THRASHING_PROPERTIES.some(prop => new RegExp(`\\b${prop}\\s*:`, 'i').test(badKeyframe)),
      'Must detect top as a prohibited layout thrashing property'
    );
  });

  it('11. should verify GPU hardware acceleration classes and will-change hints in motion.css', () => {
    const content = fs.readFileSync(motionCssPath, 'utf8');
    const classes = [
      '.motion-fade-in',
      '.motion-fade-out',
      '.motion-slide-up',
      '.motion-slide-down',
      '.motion-scale-up',
      '.motion-interactive'
    ];
    for (const cls of classes) {
      assert.ok(content.includes(cls), `motion.css must define microinteraction class ${cls}`);
    }
    assert.ok(content.includes('will-change: transform, opacity;'), 'Must declare will-change GPU hints for interactive elements');
  });

  it('12. should verify proof receipt passes proof-receipt-validator harness', async () => {
    const { validateProofReceipt } = await import('../../scripts/harness/proof-receipt-validator.mjs');
    const validation = validateProofReceipt(evidencePath);
    assert.equal(validation.valid, true, `Proof receipt validation failed: ${validation.errors.join(', ')}`);
    assert.equal(validation.receipt.goal_id, 'G-WEB-009');
    assert.equal(validation.receipt.certification, 'PASS');
  });
});


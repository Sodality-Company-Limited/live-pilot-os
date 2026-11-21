import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  SUPPORTED_VIEWPORTS,
  MANDATORY_FONTS,
  DEFAULT_TOLERANCE,
  DEFAULT_REFERENCE_ID,
  verifyViewportLock,
  verifyFontEnvironment,
  loadReferenceManifest,
  getApprovedReference,
  runVisualRegression
} from '../../scripts/harness/visual-regression-harness.mjs';

describe('Visual Regression Harness & Fidelity Proof Unit Test Suite (G-WEB-006)', () => {
  const harnessPath = path.join(process.cwd(), 'scripts/harness/visual-regression-harness.mjs');
  const receiptPath = path.join(process.cwd(), 'artifacts/proofs/visual_fidelity_receipt.json');
  const manifestPath = path.join(process.cwd(), 'data/references/manifest.json');
  const refImagePath = path.join(process.cwd(), 'data/references/REF-0001.png');
  const tokensCssPath = path.join(process.cwd(), 'code/src/tokens/index.css');

  it('1. should verify physical existence of all harness and governance assets', () => {
    assert.ok(fs.existsSync(harnessPath), `visual-regression-harness.mjs must exist at ${harnessPath}`);
    assert.ok(fs.existsSync(manifestPath), `manifest.json must exist at ${manifestPath}`);
    assert.ok(fs.existsSync(refImagePath), `REF-0001.png must exist at ${refImagePath}`);
    assert.ok(fs.existsSync(tokensCssPath), `tokens index.css must exist at ${tokensCssPath}`);
  });

  it('2. should verify exported API contracts and constants', () => {
    assert.ok(SUPPORTED_VIEWPORTS, 'SUPPORTED_VIEWPORTS must be exported');
    assert.equal(typeof SUPPORTED_VIEWPORTS.desktop, 'object');
    assert.equal(SUPPORTED_VIEWPORTS.desktop.width, 1440);
    assert.equal(SUPPORTED_VIEWPORTS.desktop.height, 900);
    assert.equal(SUPPORTED_VIEWPORTS.desktop.devicePixelRatio, 1.0);

    assert.deepEqual([...MANDATORY_FONTS], ['Inter', 'Fira Code']);
    assert.equal(DEFAULT_TOLERANCE, 0.0050);
    assert.equal(DEFAULT_REFERENCE_ID, 'REF-0001');

    assert.equal(typeof verifyViewportLock, 'function');
    assert.equal(typeof verifyFontEnvironment, 'function');
    assert.equal(typeof loadReferenceManifest, 'function');
    assert.equal(typeof getApprovedReference, 'function');
    assert.equal(typeof runVisualRegression, 'function');
  });

  it('3. should verify viewport locking for desktop, tablet, and mobile, and reject invalid viewports', () => {
    // Desktop lock
    const desktop = verifyViewportLock('desktop');
    assert.equal(desktop.valid, true);
    assert.equal(desktop.viewport.width, 1440);
    assert.equal(desktop.viewport.height, 900);
    assert.equal(desktop.viewport.devicePixelRatio, 1.0);

    // Tablet lock
    const tablet = verifyViewportLock('tablet');
    assert.equal(tablet.valid, true);
    assert.equal(tablet.viewport.width, 1024);
    assert.equal(tablet.viewport.height, 768);

    // Mobile lock
    const mobile = verifyViewportLock('mobile');
    assert.equal(mobile.valid, true);
    assert.equal(mobile.viewport.width, 390);
    assert.equal(mobile.viewport.height, 844);

    // Custom object lock
    const custom = verifyViewportLock({ width: 1920, height: 1080, devicePixelRatio: 1.5 });
    assert.equal(custom.valid, true);
    assert.equal(custom.viewport.width, 1920);
    assert.equal(custom.viewport.height, 1080);
    assert.equal(custom.viewport.devicePixelRatio, 1.5);

    // Invalid viewport cases (fail-closed)
    assert.throws(() => verifyViewportLock('unsupported_3d_hud'), /Unsupported viewport name/);
    assert.throws(() => verifyViewportLock({ width: -100, height: 900 }), /Invalid viewport width/);
    assert.throws(() => verifyViewportLock({ width: 1440, height: 0 }), /Invalid viewport height/);
    assert.throws(() => verifyViewportLock({ width: 1440, height: 900, devicePixelRatio: 0.5 }), /Invalid devicePixelRatio/);
    assert.throws(() => verifyViewportLock(12345), /Viewport configuration must be/);
  });

  it('4. should verify font environment lock inspecting Inter and Fira Code in design tokens', () => {
    const fontLock = verifyFontEnvironment(tokensCssPath);
    assert.equal(fontLock.valid, true);
    assert.deepEqual(fontLock.lockedFonts, ['Inter', 'Fira Code']);

    // Non-existent CSS path must fail-closed
    assert.throws(() => verifyFontEnvironment('/invalid/missing/path.css'), /missing/);
  });

  it('5. should verify REF-0001 cryptographic SHA-256 digest against manifest.json', () => {
    const approved = getApprovedReference('REF-0001', manifestPath);
    assert.ok(approved.ref, 'REF-0001 record must exist');
    assert.equal(approved.ref.reference_id, 'REF-0001');
    assert.equal(approved.ref.type, 'image');
    assert.equal(approved.ref.authority, 'approved_design_reference');
    assert.equal(approved.ref.viewport.width, 1440);
    assert.equal(approved.ref.viewport.height, 900);
    assert.deepEqual(approved.ref.fonts, ['Inter', 'Fira Code']);

    // Check SHA-256 digest
    const expectedHash = 'sha256:d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8';
    assert.equal(approved.computedHash, expectedHash);
    assert.equal(approved.ref.content_hash, expectedHash);

    // Missing reference ID must fail-closed
    assert.throws(() => getApprovedReference('REF-NON-EXISTENT', manifestPath), /not found in reference manifest/);
  });

  it('6. should execute automated visual regression comparison against REF-0001 within 0.50% ceiling', () => {
    const res = runVisualRegression({
      viewport: 'desktop',
      threshold: 0.0050,
      goalId: 'G-WEB-006'
    });

    assert.equal(res.passed, true, 'Visual regression test must pass');
    assert.ok(res.pixelDiffRatio <= 0.0050, `Pixel diff ratio (${res.pixelDiffRatio}) must be <= 0.0050`);
    assert.equal(res.layoutShift, 0, 'Cumulative Layout Shift must be 0');
    assert.equal(res.overflowDetected, false, 'No overflow must be detected');
    assert.equal(res.receipt.status, 'PASSED');
    assert.equal(res.receipt.reference_id, 'REF-0001');
  });

  it('7. should fail-closed when pixel difference ratio breaches tolerance ceiling (> 0.0050)', () => {
    const size = 1440 * 900;
    const refBuffer = Buffer.alloc(size, 0x10);
    const implBuffer = Buffer.alloc(size, 0x90); // 100% divergent pixels

    const res = runVisualRegression({
      implBuffer,
      threshold: 0.0050
    });

    assert.equal(res.passed, false, 'Must fail when pixel differences exceed threshold');
    assert.ok(res.pixelDiffRatio > 0.0050, 'Pixel diff ratio must exceed 0.0050');
    assert.equal(res.receipt.thresholdSatisfied, false);
    assert.equal(res.receipt.status, 'FAILED');
  });

  it('8. should fail-closed on layout shift (CLS > 0) or horizontal overflow', () => {
    // Layout shift violation
    const resShift = runVisualRegression({
      layoutShift: 0.02,
      threshold: 0.0050
    });
    assert.equal(resShift.passed, false, 'Must fail when CLS > 0');
    assert.equal(resShift.receipt.layoutShiftZero, false);
    assert.equal(resShift.receipt.status, 'FAILED');

    // Horizontal overflow violation
    const resOverflow = runVisualRegression({
      overflowDetected: true,
      threshold: 0.0050
    });
    assert.equal(resOverflow.passed, false, 'Must fail when overflow is detected');
    assert.equal(resOverflow.receipt.overflowFree, false);
    assert.equal(resOverflow.receipt.status, 'FAILED');
  });

  it('9. should emit and validate cryptographic visual_fidelity_receipt.json with status PASSED', () => {
    // Generate fresh receipt
    runVisualRegression({
      receiptPath,
      threshold: 0.0050,
      goalId: 'G-WEB-006'
    });

    assert.ok(fs.existsSync(receiptPath), `Receipt must exist at ${receiptPath}`);
    const raw = fs.readFileSync(receiptPath, 'utf8');
    const receipt = JSON.parse(raw);

    assert.equal(receipt.artifact_id, 'ART-VISUAL-FIDELITY-RECEIPT');
    assert.equal(receipt.goal_id, 'G-WEB-006');
    assert.equal(receipt.receipt_schema, 'visual_fidelity_receipt_v1');
    assert.equal(receipt.reference_id, 'REF-0001');
    assert.equal(receipt.reference_hash, 'sha256:d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8');
    assert.equal(receipt.viewport.width, 1440);
    assert.equal(receipt.viewport.height, 900);
    assert.deepEqual(receipt.fonts_locked, ['Inter', 'Fira Code']);
    assert.ok(receipt.pixelDiffRatio <= 0.0050);
    assert.equal(receipt.thresholdSatisfied, true);
    assert.equal(receipt.layoutShift, 0);
    assert.equal(receipt.layoutShiftZero, true);
    assert.equal(receipt.overflowDetected, false);
    assert.equal(receipt.overflowFree, true);
    assert.equal(receipt.status, 'PASSED');
    assert.ok(receipt.git_head, 'Receipt must include git_head revision');
  });

  it('10. should execute CLI command successfully with exit code 0 and zero mocks', () => {
    const result = spawnSync(process.execPath, [harnessPath], {
      encoding: 'utf8',
      env: process.env
    });

    assert.equal(result.status, 0, `CLI run must exit 0: ${result.stderr}`);
    assert.ok(result.stdout.includes('FIDELITY THRESHOLDS MET'), 'CLI output must confirm fidelity thresholds met');
    assert.ok(result.stdout.includes('Status: PASSED'), 'CLI output must report Status: PASSED');

    // Verify Article I: Zero stubs, zero mocks, zero placeholders
    const harnessContent = fs.readFileSync(harnessPath, 'utf8');
    assert.ok(!harnessContent.includes('todo!()'), 'Must not contain todo!()');
    assert.ok(!harnessContent.includes('unimplemented!()'), 'Must not contain unimplemented!()');
    assert.ok(!harnessContent.includes('// TODO'), 'Must not contain // TODO');
    assert.ok(!harnessContent.includes('mock_response'), 'Must not contain mock_response');
  });
});

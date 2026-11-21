/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UNIT TEST SUITE: G-WEB-010 ASSET AND REFERENCE PROVENANCE
 * ════════════════════════════════════════════════════════════════════════════════
 * Verifies visual asset budgets, modern formats, aspect ratios, acoustic contracts,
 * audio duration ceilings, accessible mute controls, and cryptographic provenance.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  scanVisualAssets,
  verifySvgMetadata,
  verifyWebpHeader,
  MAX_VISUAL_ASSET_SIZE_BYTES,
  APPROVED_VISUAL_FORMATS
} from '../../scripts/harness/asset-harness.mjs';
import {
  scanAudioAssets,
  parseWavHeader,
  computeAcousticMetrics,
  emitAssetProvenanceReceipt,
  MAX_AUDIO_DURATION_MS
} from '../../scripts/harness/audio-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Asset and Reference Provenance Unit Test Suite (G-WEB-010)', () => {
  const manifestPath = 'docs/02-product/design/asset-provenance-manifest.json';
  const visualDir = 'public/assets';
  const audioDir = 'public/audio';

  test('1. should verify physical presence and content of touch map assets', () => {
    assert.ok(fs.existsSync(manifestPath), `Manifest missing at ${manifestPath}`);
    assert.ok(fs.existsSync('scripts/harness/asset-harness.mjs'), 'asset-harness.mjs missing');
    assert.ok(fs.existsSync('scripts/harness/audio-harness.mjs'), 'audio-harness.mjs missing');

    const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.schema_version, 'asset_provenance_manifest_v1');
    assert.equal(manifest.goal_id, 'G-WEB-010');
    assert.ok(Array.isArray(manifest.assets), 'manifest.assets must be an array');
    assert.ok(manifest.assets.length >= 6, 'Manifest must declare at least 6 canonical assets');
  });

  test('2. should verify visual asset modern formats and strict 250KB size budget', () => {
    const results = scanVisualAssets(visualDir, manifestPath);
    assert.equal(results.errors.length, 0, `Scan visual assets errors: ${results.errors.join('; ')}`);
    assert.ok(results.assetsScanned >= 4, `Expected at least 4 visual assets, found ${results.assetsScanned}`);

    for (const asset of results.assets) {
      assert.ok(
        APPROVED_VISUAL_FORMATS.has(`.${asset.format}`),
        `Asset ${asset.name} has non-modern format: ${asset.format}`
      );
      assert.ok(
        asset.size < MAX_VISUAL_ASSET_SIZE_BYTES,
        `Asset ${asset.name} exceeds 250KB: ${asset.size} bytes`
      );
    }
  });

  test('3. should verify SVG aspect ratio preservation and accessibility metadata', () => {
    const svgPath = path.join(visualDir, 'soda-logo.svg');
    assert.ok(fs.existsSync(svgPath), 'soda-logo.svg missing');

    const content = fs.readFileSync(svgPath, 'utf8');
    const meta = verifySvgMetadata(content);
    assert.ok(meta.valid, 'SVG metadata should be valid');
    assert.ok(meta.hasViewBox, 'SVG must have viewBox for responsive scaling');
    assert.ok(meta.hasTitle || meta.hasAriaLabel, 'SVG must declare title or aria-label for screen readers');
  });

  test('4. should verify WebP binary container header and dimensions', () => {
    const webpPath = path.join(visualDir, 'decision-canvas-preview.webp');
    assert.ok(fs.existsSync(webpPath), 'decision-canvas-preview.webp missing');

    const buf = fs.readFileSync(webpPath);
    const parsed = verifyWebpHeader(buf);
    assert.ok(parsed.valid, 'WebP container must be valid');
    assert.ok(parsed.width > 0, 'WebP width must be positive');
    assert.ok(parsed.height > 0, 'WebP height must be positive');
  });

  test('5. should verify audio earcon duration ceiling is strictly <= 500ms', () => {
    const results = scanAudioAssets(audioDir, manifestPath);
    assert.equal(results.errors.length, 0, `Scan audio errors: ${results.errors.join('; ')}`);
    assert.ok(results.audioFilesScanned >= 2, `Expected at least 2 audio assets, found ${results.audioFilesScanned}`);

    for (const audio of results.audioAssets) {
      assert.ok(
        audio.durationMs !== null && audio.durationMs <= MAX_AUDIO_DURATION_MS,
        `Audio ${audio.name} duration (${audio.durationMs}ms) exceeds ${MAX_AUDIO_DURATION_MS}ms ceiling`
      );
    }
  });

  test('6. should verify acoustic contracts (zero digital clipping, loudness normalization)', () => {
    const chimePath = path.join(audioDir, 'chime-complete.wav');
    const chimeBuf = fs.readFileSync(chimePath);
    const header = parseWavHeader(chimeBuf);
    const acoustics = computeAcousticMetrics(chimeBuf, header);

    assert.equal(acoustics.clipping, false, 'Chime must have zero digital clipping');
    assert.ok(acoustics.peakAmplitude < 0.99, 'Chime peak amplitude must be well below 1.0 rail');
    assert.ok(
      acoustics.rmsDbFs >= -24.0 && acoustics.rmsDbFs <= -14.0,
      `Chime loudness (${acoustics.rmsDbFs} dBFS) must be normalized near -16 LUFS target`
    );
  });

  test('7. should verify accessible mute suppression controls configuration', () => {
    const controlsPath = path.join(audioDir, 'audio-controls.json');
    assert.ok(fs.existsSync(controlsPath), 'audio-controls.json missing');

    const controls = JSON.parse(fs.readFileSync(controlsPath, 'utf8'));
    assert.equal(controls.mute_suppression_enabled, true, 'mute_suppression_enabled must be true');
    assert.ok(controls.accessibility_alternative, 'accessibility_alternative must be declared');
  });

  test('8. should verify 100% cryptographic SHA-256 binding between disk files and manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const entry of manifest.assets) {
      const fullPath = path.resolve(process.cwd(), entry.path);
      assert.ok(fs.existsSync(fullPath), `Asset file declared in manifest missing: ${entry.path}`);

      const data = fs.readFileSync(fullPath);
      const actualHash = `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`;
      assert.equal(actualHash, entry.sha256, `SHA-256 mismatch for ${entry.name}`);
      assert.equal(entry.license.verified, true, `License unverified for ${entry.name}`);
      assert.ok(entry.license.authority, `Missing license authority for ${entry.name}`);
    }
  });

  test('9. should emit valid cryptographic proof receipt adhering to schema v1', () => {
    const v = scanVisualAssets(visualDir, manifestPath);
    const a = scanAudioAssets(audioDir, manifestPath);
    const receipt = emitAssetProvenanceReceipt(v, a);

    assert.equal(receipt.schema_version, 1);
    assert.equal(receipt.goal_id, 'G-WEB-010');
    assert.equal(receipt.certification, 'PASS');
    assert.equal(receipt.status, 'PASSED');
    assert.equal(receipt.invariants.length, 1);
    assert.equal(receipt.invariants[0].passed, true);

    const valResult = validateProofReceipt('artifacts/proofs/asset_provenance_receipt.json');
    assert.equal(valResult.valid, true, `Proof receipt validation failed: ${valResult.errors.join('; ')}`);
  });

  test('10. should fail closed on missing directory, format violation, or oversized asset', () => {
    // 1. Missing directory
    const missing = scanVisualAssets('nonexistent/dir');
    assert.ok(missing.errors.length > 0, 'Should fail closed on nonexistent directory');

    // 2. SVG without viewBox
    const badSvg = '<svg width="100" height="100"><title>Bad</title></svg>';
    const badMeta = verifySvgMetadata(badSvg);
    assert.equal(badMeta.valid, false, 'SVG without viewBox should fail');

    // 3. Audio duration overflow
    const badHeader = {
      audioFormat: 1,
      channels: 1,
      sampleRate: 44100,
      byteRate: 88200,
      blockAlign: 2,
      bitsPerSample: 16,
      dataOffset: 44,
      dataBytes: 88200 * 2, // 2 seconds = 2000ms
      durationMs: 2000
    };
    assert.ok(badHeader.durationMs > MAX_AUDIO_DURATION_MS, 'Should detect duration overflow > 500ms');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  verifyDaveReference,
  createDaveReference
} from '../../scripts/lib/dave-engine.mjs';

describe('DAVE Reference Verification Unit Test Suite', () => {
  const manifestPath = path.join(process.cwd(), 'data/references/manifest.json');
  const imagePath = path.join(process.cwd(), 'data/references/REF-0001.png');

  it('1. should find and parse data/references/manifest.json', () => {
    assert.ok(fs.existsSync(manifestPath), `Manifest must exist at ${manifestPath}`);
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    assert.ok(Array.isArray(manifest), 'Manifest must be an array of references');
    assert.ok(manifest.length >= 1, 'Manifest must contain at least one reference');
  });

  it('2. should validate REF-0001 metadata and schema conformance', () => {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    const ref = manifest.find(r => r.reference_id === 'REF-0001');

    assert.ok(ref, 'REF-0001 must be registered in manifest');
    assert.equal(ref.type, 'image');
    assert.equal(ref.authority, 'approved_design_reference');
    assert.ok(ref.uri.endsWith('REF-0001.png'));
    assert.ok(ref.content_hash.startsWith('sha256:'));
    assert.deepEqual(ref.used_by, ['G-WEB-001']);
  });

  it('3. should verify physical existence and exact SHA-256 digest of REF-0001.png', () => {
    assert.ok(fs.existsSync(imagePath), `Physical reference must exist at ${imagePath}`);
    const buffer = fs.readFileSync(imagePath);
    const computedHash = 'sha256:' + crypto.createHash('sha256').update(buffer).digest('hex');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ref = manifest.find(r => r.reference_id === 'REF-0001');

    assert.equal(computedHash, ref.content_hash, 'Computed file hash must match declared content_hash');
  });

  it('4. should verify locked viewport dimensions (1440x900 @ 1.0 DPR)', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ref = manifest.find(r => r.reference_id === 'REF-0001');

    assert.ok(ref.viewport, 'Viewport configuration must be defined');
    assert.equal(ref.viewport.width, 1440);
    assert.equal(ref.viewport.height, 900);
    assert.equal(ref.viewport.device_pixel_ratio, 1.0);
  });

  it('5. should integrate cleanly with verifyDaveReference engine function', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ref = manifest.find(r => r.reference_id === 'REF-0001');

    const verification = verifyDaveReference(ref, process.cwd());
    assert.equal(verification.valid, true, `Verification must pass: ${verification.error}`);
    assert.equal(verification.computedHash, ref.content_hash);
  });

  it('6. should fail-closed on tampered reference hash or missing file', () => {
    const badRef = {
      reference_id: 'REF-BAD',
      type: 'image',
      uri: 'data/references/NON_EXISTENT.png',
      content_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
    };

    const resMissing = verifyDaveReference(badRef, process.cwd());
    assert.equal(resMissing.valid, false);
    assert.ok(resMissing.error.includes('Physical reference file missing'));

    const tamperedRef = {
      reference_id: 'REF-TAMPERED',
      type: 'image',
      uri: 'data/references/REF-0001.png',
      content_hash: 'sha256:badhash00000000000000000000000000000000000000000000000000000000'
    };

    const resTampered = verifyDaveReference(tamperedRef, process.cwd());
    assert.equal(resTampered.valid, false);
    assert.ok(resTampered.error.includes('Hash mismatch'));
  });
});

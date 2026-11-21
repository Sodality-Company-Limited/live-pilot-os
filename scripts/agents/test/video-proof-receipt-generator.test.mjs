import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  synthesizeVideoProofManifest,
  generateReleaseSummaryCardSVG
} from '../../../scripts/lib/video-proof-receipt-generator.mjs';

describe('Programmatic Video Proof-Receipt Generator & Release Card Synthesizer', () => {
  it('Synthesizes valid video composition manifest containing Goal ID, title, author persona, passing test count, and commit hash', () => {
    const manifest = synthesizeVideoProofManifest({
      goalId: 'G-CORE-041',
      title: 'Programmatic Video Proof-Receipt Generator',
      persona: 'system-architect',
      passingTests: 135,
      commitHash: 'a1b2c3d4e5f6',
      durationSeconds: 15,
      fps: 30
    });

    assert.equal(manifest.goalId, 'G-CORE-041');
    assert.equal(manifest.fps, 30);
    assert.equal(manifest.durationInFrames, 450); // 15s * 30fps
    assert.equal(manifest.composition.width, 1920);
    assert.equal(manifest.composition.height, 1080);
    assert.equal(manifest.metadata.passingTests, 135);
    assert.equal(manifest.metadata.commitHash, 'a1b2c3d4e5f6');
  });

  it('Generates discrete SVG storyboard frames representing 15-second release announcement video', () => {
    const manifest = synthesizeVideoProofManifest({
      goalId: 'G-UX-036',
      title: 'DAVE Discrete Visual Sampling',
      persona: 'qa-engineer',
      passingTests: 135,
      commitHash: 'deadbeef1234'
    });

    const svg = generateReleaseSummaryCardSVG(manifest);
    assert.equal(typeof svg, 'string');
    assert.match(svg, /<svg/);
    assert.match(svg, /G-UX-036/);
    assert.match(svg, /DAVE Discrete Visual Sampling/);
    assert.match(svg, /135 Tests Passing/);
    assert.match(svg, /deadbeef1234/);
  });

  it('rejects manifest synthesis when mandatory parameters are missing', () => {
    assert.throws(
      () => synthesizeVideoProofManifest({ goalId: '' }),
      /Missing required goalId/
    );
    assert.throws(
      () => synthesizeVideoProofManifest({ goalId: 'G-TEST', title: '' }),
      /Missing required title/
    );
  });
});

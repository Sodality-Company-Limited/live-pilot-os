import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScrollTaglineActivation,
  parseTaglineWords
} from '../../../scripts/lib/scroll-tagline-engine.mjs';

describe('Autonomous soda-landing-page Scroll Tagline Reveal Engine', () => {
  it('parseTaglineWords cleanly splits sentence into word tokens', () => {
    const text = 'Engineering verifiable autonomous systems for enterprise scale';
    const words = parseTaglineWords(text);
    assert.equal(words.length, 7);
    assert.equal(words[0], 'Engineering');
    assert.equal(words[6], 'scale');
  });

  it('computeScrollTaglineActivation accurately determines active word count from scroll progress', () => {
    const text = 'Autonomous software engineering without compromise';
    // 5 words total.
    // Progress 0.0 -> 0 active
    const p0 = computeScrollTaglineActivation(text, 0.0);
    assert.equal(p0.activeWordCount, 0);
    assert.equal(p0.words.every(w => !w.active), true);

    // Progress 0.5 -> 3 active words (5 * 0.5 = 2.5 -> ceil = 3)
    const p50 = computeScrollTaglineActivation(text, 0.5);
    assert.equal(p50.activeWordCount, 3);
    assert.equal(p50.words[0].active, true);
    assert.equal(p50.words[1].active, true);
    assert.equal(p50.words[2].active, true);
    assert.equal(p50.words[3].active, false);

    // Progress 1.0 -> all 5 active
    const p100 = computeScrollTaglineActivation(text, 1.0);
    assert.equal(p100.activeWordCount, 5);
    assert.equal(p100.words.every(w => w.active), true);
  });

  it('clamps scroll progress between 0 and 1 safely', () => {
    const text = 'Safe bounds';
    const pUnder = computeScrollTaglineActivation(text, -0.5);
    assert.equal(pUnder.activeWordCount, 0);

    const pOver = computeScrollTaglineActivation(text, 1.8);
    assert.equal(pOver.activeWordCount, 2);
  });
});

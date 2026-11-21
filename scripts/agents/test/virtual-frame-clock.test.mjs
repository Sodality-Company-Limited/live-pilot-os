import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VirtualFrameClock,
  createSeededPRNG,
  calculateFrameFromMs,
  calculateMsFromFrame
} from '../../../scripts/lib/virtual-frame-clock.mjs';

describe('Deterministic Virtual Frame Clock & Seeded PRNG Harness', () => {
  it('VirtualFrameClock accurately computes elapsed milliseconds and frames across declared FPS rates (30, 60, 120)', () => {
    const clock60 = new VirtualFrameClock({ fps: 60 });
    assert.equal(clock60.currentFrame, 0);
    assert.equal(clock60.elapsedMs, 0);

    clock60.advanceFrames(30);
    assert.equal(clock60.currentFrame, 30);
    assert.equal(clock60.elapsedMs, 500); // 30 frames at 60fps = 500ms

    const clock30 = new VirtualFrameClock({ fps: 30 });
    clock30.advanceFrames(15);
    assert.equal(clock30.elapsedMs, 500);

    const clock120 = new VirtualFrameClock({ fps: 120 });
    clock120.advanceFrames(60);
    assert.equal(clock120.elapsedMs, 500);
  });

  it('Seeded PRNG generates bit-identical reproducible pseudo-random streams for identical seeds', () => {
    const prng1 = createSeededPRNG(1337);
    const prng2 = createSeededPRNG(1337);

    const stream1 = Array.from({ length: 10 }, () => prng1());
    const stream2 = Array.from({ length: 10 }, () => prng2());

    assert.deepEqual(stream1, stream2);

    const prngDiff = createSeededPRNG(9999);
    const streamDiff = Array.from({ length: 10 }, () => prngDiff());
    assert.notDeepEqual(stream1, streamDiff);
  });

  it('calculateFrameFromMs and calculateMsFromFrame accurately map time domain', () => {
    assert.equal(calculateFrameFromMs(500, 60), 30);
    assert.equal(calculateMsFromFrame(30, 60), 500);
    assert.equal(calculateFrameFromMs(1000, 30), 30);
    assert.equal(calculateMsFromFrame(30, 30), 1000);
  });
});

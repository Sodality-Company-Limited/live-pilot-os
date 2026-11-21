import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSpatialOffset,
  validateStaggerSequence,
  calculateStaggerTiming
} from '../../../scripts/lib/stagger-spatial-guard.mjs';

describe('The One-Third Spatial Motion Invariant & Stagger Cap Guard', () => {
  it('blocks component entrance translations exceeding 1/3 of bounding dimension or 24px default cap', () => {
    // Container is 48px height, 1/3 is 16px. An offset of 20px exceeds 1/3 bound.
    const resOverThird = validateSpatialOffset({ dimensionPx: 48, offsetPx: 20 });
    assert.equal(resOverThird.valid, false);
    assert.match(resOverThird.reason, /exceeds 1\/3/);

    // Default max cap is 24px even if container is 300px
    const resOverCap = validateSpatialOffset({ dimensionPx: 300, offsetPx: 30 });
    assert.equal(resOverCap.valid, false);
    assert.match(resOverCap.reason, /exceeds maximum spatial cap of 24px/);

    // Compliant translation
    const resOk = validateSpatialOffset({ dimensionPx: 48, offsetPx: 12 });
    assert.equal(resOk.valid, true);
  });

  it('enforces stagger sequences to maximum 5 items with remaining items entering as unified batch', () => {
    const sequence = calculateStaggerTiming(8, 30, 200);
    assert.equal(sequence.length, 8);
    // Items 0..4 have distinct staggered delays
    assert.equal(sequence[0].delayMs, 0);
    assert.equal(sequence[1].delayMs, 30);
    assert.equal(sequence[4].delayMs, 120);
    // Items 5..7 are unified in the 5th tier (cap of 5)
    assert.equal(sequence[5].delayMs, 120);
    assert.equal(sequence[7].delayMs, 120);
  });

  it('asserts cumulative sequence duration does not exceed 600ms total latency budget', () => {
    // 5 items, step 40ms, element duration 250ms -> total = (4 * 40) + 250 = 410ms (<= 600ms)
    const validSeq = validateStaggerSequence({ itemCount: 5, stepMs: 40, itemDurationMs: 250 });
    assert.equal(validSeq.valid, true);

    // 5 items, step 150ms, element duration 300ms -> total = (4 * 150) + 300 = 900ms (> 600ms)
    const invalidSeq = validateStaggerSequence({ itemCount: 5, stepMs: 150, itemDurationMs: 300 });
    assert.equal(invalidSeq.valid, false);
    assert.match(invalidSeq.reason, /exceeds 600ms/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDiscreteSamplingFrames,
  validateSamplingCoverage
} from '../../../scripts/lib/frame-sampling-engine.mjs';

describe('DAVE Frame-Accurate Discrete Visual Sampling Engine', () => {
  it('Calculates exact frame indices for 0%, 50%, and 100% animation states based on composition FPS', () => {
    // 300ms animation at 60fps -> durationInFrames = round(0.3 * 60) = 18 frames
    const plan = computeDiscreteSamplingFrames({ durationMs: 300, fps: 60 });
    assert.equal(plan.totalFrames, 18);
    assert.equal(plan.startFrame, 0);
    assert.equal(plan.midpointFrame, 9);
    assert.equal(plan.settledFrame, 18);
    assert.deepEqual(plan.sampleFrames, [0, 9, 18]);
  });

  it('Enforces minimum sampling resolution to catch curve inflection points during easing transitions', () => {
    // Easing transitions require extra inflection checkpoints at 25% and 75%
    const planWithInflections = computeDiscreteSamplingFrames({
      durationMs: 400,
      fps: 60,
      includeInflections: true
    });
    // 400ms at 60fps = 24 frames
    assert.equal(planWithInflections.totalFrames, 24);
    assert.deepEqual(planWithInflections.sampleFrames, [0, 6, 12, 18, 24]);
  });

  it('validateSamplingCoverage ensures no sample frames exceed total composition boundary', () => {
    const validPlan = computeDiscreteSamplingFrames({ durationMs: 250, fps: 60 });
    assert.equal(validateSamplingCoverage(validPlan), true);

    const corruptedPlan = { totalFrames: 10, sampleFrames: [0, 5, 15] };
    assert.equal(validateSamplingCoverage(corruptedPlan), false);
  });
});

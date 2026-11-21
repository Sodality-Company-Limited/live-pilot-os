import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lintDeterministicAnimationCode
} from '../../../scripts/lib/deterministic-animation-linter.mjs';

describe('Wall-Clock & Unclamped Interpolation Static Linter', () => {
  it('Rejects visual animation code invoking Date.now(), setTimeout, or setInterval when deterministic mode is enabled', () => {
    const badCode = `
      function startAnimation() {
        const start = Date.now();
        setTimeout(() => {
          console.log('Finished after', Date.now() - start);
        }, 300);
      }
    `;
    const result = lintDeterministicAnimationCode(badCode);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'FORBIDDEN_WALL_CLOCK_TIME'));
    assert.ok(result.violations.some(v => v.type === 'FORBIDDEN_ASYNC_TIMER'));
  });

  it('Flags raw Math.random() calls and requires seeded random generators', () => {
    const randomCode = `
      const particleX = Math.random() * 500;
    `;
    const result = lintDeterministicAnimationCode(randomCode);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'FORBIDDEN_UNSEEDED_RANDOM'));
  });

  it('Asserts interpolate() calls declare explicit extrapolateLeft and extrapolateRight clamping options', () => {
    const unclamped = `
      const scale = interpolate(frame, [0, 30], [1, 1.5]);
    `;
    const result = lintDeterministicAnimationCode(unclamped);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'UNCLAMPED_INTERPOLATION'));

    const clamped = `
      const scale = interpolate(frame, [0, 30], [1, 1.5], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      });
    `;
    const okResult = lintDeterministicAnimationCode(clamped);
    assert.equal(okResult.valid, true);
  });
});

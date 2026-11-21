import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONAL_EASING,
  SPEED_BUDGETS,
  getEasingForTransition,
  validateDurationBudget,
  resolveMotionToken
} from '../../../scripts/lib/motion-tokens.mjs';

describe('Directional Easing Physics Taxonomy & Motion Tokens', () => {
  it('exports valid cubic bezier curves for entrance, exit, and state changes', () => {
    assert.equal(typeof DIRECTIONAL_EASING.entrance, 'string');
    assert.match(DIRECTIONAL_EASING.entrance, /^cubic-bezier\(/);
    assert.equal(typeof DIRECTIONAL_EASING.exit, 'string');
    assert.match(DIRECTIONAL_EASING.exit, /^cubic-bezier\(/);
    assert.equal(typeof DIRECTIONAL_EASING.state, 'string');
    assert.match(DIRECTIONAL_EASING.state, /^cubic-bezier\(/);
  });

  it('speed budgets strictly adhere to micro (100-200ms), component (200-300ms), and modal (300-400ms) bounds', () => {
    assert.ok(SPEED_BUDGETS.micro.min >= 100 && SPEED_BUDGETS.micro.max <= 200);
    assert.ok(SPEED_BUDGETS.component.min >= 200 && SPEED_BUDGETS.component.max <= 300);
    assert.ok(SPEED_BUDGETS.modal.min >= 300 && SPEED_BUDGETS.modal.max <= 400);
    assert.ok(SPEED_BUDGETS.page.min >= 400 && SPEED_BUDGETS.page.max <= 500);
  });

  it('getEasingForTransition resolves directional easing curves accurately', () => {
    assert.equal(getEasingForTransition('entrance'), DIRECTIONAL_EASING.entrance);
    assert.equal(getEasingForTransition('exit'), DIRECTIONAL_EASING.exit);
    assert.equal(getEasingForTransition('state'), DIRECTIONAL_EASING.state);
    assert.throws(() => getEasingForTransition('unknown_direction'), /Invalid transition direction/);
  });

  it('validateDurationBudget enforces threshold boundaries', () => {
    assert.equal(validateDurationBudget('micro', 150), true);
    assert.equal(validateDurationBudget('micro', 250), false);
    assert.equal(validateDurationBudget('component', 250), true);
    assert.equal(validateDurationBudget('modal', 350), true);
    assert.equal(validateDurationBudget('modal', 450), false);
  });

  it('resolveMotionToken returns comprehensive token CSS object', () => {
    const token = resolveMotionToken('entrance', 'component');
    assert.equal(token.easing, DIRECTIONAL_EASING.entrance);
    assert.equal(token.durationMs, 250);
    assert.equal(token.cssTransition, `all 250ms ${DIRECTIONAL_EASING.entrance}`);
  });
});

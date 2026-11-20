import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_ARCHETYPES,
  resolveMotionArchetypeConfig,
  validateArchetypeSuitability
} from '../../../scripts/lib/motion-personality-engine.mjs';

describe('Emotional Intent & Four-Archetype Motion Personality Matrix', () => {
  it('Playful archetype defines spring physics with 3-10% overshoot and energetic settling', () => {
    const playful = resolveMotionArchetypeConfig('playful');
    assert.equal(playful.name, 'playful');
    assert.ok(playful.spring.overshootPercent >= 3 && playful.spring.overshootPercent <= 10);
    assert.ok(playful.spring.dampingRatio < 1.0); // Under-damped for bounce
  });

  it('Premium archetype enforces critical damping with zero overshoot and cubic bezier deceleration', () => {
    const premium = resolveMotionArchetypeConfig('premium');
    assert.equal(premium.name, 'premium');
    assert.equal(premium.spring.overshootPercent, 0);
    assert.equal(premium.spring.dampingRatio, 1.0); // Critically damped
    assert.equal(premium.easing, 'cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('Corporate archetype enforces sub-200ms utilitarian execution with zero embellishment', () => {
    const corporate = resolveMotionArchetypeConfig('corporate');
    assert.equal(corporate.name, 'corporate');
    assert.ok(corporate.durationMs <= 200);
    assert.equal(corporate.spring.overshootPercent, 0);
  });

  it('Energetic archetype enforces snappy acceleration and high stiffness', () => {
    const energetic = resolveMotionArchetypeConfig('energetic');
    assert.equal(energetic.name, 'energetic');
    assert.ok(energetic.spring.stiffness >= 250);
  });

  it('validateArchetypeSuitability matches user emotional target accurately', () => {
    assert.equal(validateArchetypeSuitability('delightful', 'playful'), true);
    assert.equal(validateArchetypeSuitability('luxury', 'premium'), true);
    assert.equal(validateArchetypeSuitability('banking', 'corporate'), true);
    assert.equal(validateArchetypeSuitability('banking', 'playful'), false);
  });
});

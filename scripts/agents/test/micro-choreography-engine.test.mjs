import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNarrativeChoreographySession,
  CHOREOGRAPHY_STAGES
} from '../../../scripts/lib/micro-choreography-engine.mjs';

describe('Directorial Micro-Choreography & Multi-Layer Narrative Sequence Engine', () => {
  it('Coordinates Setup -> Action -> Resolution state machine transitions without race conditions', () => {
    const session = createNarrativeChoreographySession({
      elementId: 'confirm-payment-btn',
      hapticEnabled: true
    });

    assert.equal(session.getCurrentStage(), CHOREOGRAPHY_STAGES.IDLE);

    // Setup stage (e.g. hover anticipation / scale 0.98)
    const setupResult = session.transitionTo(CHOREOGRAPHY_STAGES.SETUP, { durationMs: 100 });
    assert.equal(setupResult.success, true);
    assert.equal(session.getCurrentStage(), CHOREOGRAPHY_STAGES.SETUP);

    // Action stage (press event + haptic click)
    const actionResult = session.transitionTo(CHOREOGRAPHY_STAGES.ACTION, {
      durationMs: 150,
      hapticType: 'mediumImpact'
    });
    assert.equal(actionResult.success, true);
    assert.equal(actionResult.hapticTriggered, 'mediumImpact');
    assert.equal(session.getCurrentStage(), CHOREOGRAPHY_STAGES.ACTION);

    // Resolution stage (checkmark animation + success haptic)
    const resolutionResult = session.transitionTo(CHOREOGRAPHY_STAGES.RESOLUTION, {
      durationMs: 250,
      hapticType: 'success'
    });
    assert.equal(resolutionResult.success, true);
    assert.equal(resolutionResult.hapticTriggered, 'success');
    assert.equal(session.getCurrentStage(), CHOREOGRAPHY_STAGES.RESOLUTION);
  });

  it('Triggers secondary layers synchronously with hero element', () => {
    const session = createNarrativeChoreographySession({
      elementId: 'order-card',
      hapticEnabled: false
    });

    session.registerSecondaryLayer('shadow-expansion', { triggerOn: CHOREOGRAPHY_STAGES.ACTION });
    session.registerSecondaryLayer('ambient-glow', { triggerOn: CHOREOGRAPHY_STAGES.RESOLUTION });

    session.transitionTo(CHOREOGRAPHY_STAGES.SETUP);
    const actionStep = session.transitionTo(CHOREOGRAPHY_STAGES.ACTION);
    assert.ok(actionStep.triggeredSecondaryLayers.includes('shadow-expansion'));
    assert.ok(!actionStep.triggeredSecondaryLayers.includes('ambient-glow'));

    const resolutionStep = session.transitionTo(CHOREOGRAPHY_STAGES.RESOLUTION);
    assert.ok(resolutionStep.triggeredSecondaryLayers.includes('ambient-glow'));
  });

  it('rejects invalid or regressive state transitions', () => {
    const session = createNarrativeChoreographySession({ elementId: 'test-widget' });
    session.transitionTo(CHOREOGRAPHY_STAGES.SETUP);
    session.transitionTo(CHOREOGRAPHY_STAGES.ACTION);
    
    // Regressing from ACTION back to SETUP is rejected
    assert.throws(() => session.transitionTo(CHOREOGRAPHY_STAGES.SETUP), /Invalid choreography stage transition/);
  });
});

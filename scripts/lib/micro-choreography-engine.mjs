/**
 * Directorial Micro-Choreography & Multi-Layer Narrative Sequence Engine
 * Invariants:
 * 1. State machine progression: IDLE -> SETUP -> ACTION -> RESOLUTION -> IDLE.
 * 2. Deterministic synchronization of secondary/ambient reaction layers.
 * 3. Haptic impact event dispatching without blocking UI rendering loop.
 */

export const CHOREOGRAPHY_STAGES = Object.freeze({
  IDLE: 'IDLE',
  SETUP: 'SETUP',
  ACTION: 'ACTION',
  RESOLUTION: 'RESOLUTION'
});

const ALLOWED_STAGE_TRANSITIONS = {
  [CHOREOGRAPHY_STAGES.IDLE]: [CHOREOGRAPHY_STAGES.SETUP, CHOREOGRAPHY_STAGES.ACTION],
  [CHOREOGRAPHY_STAGES.SETUP]: [CHOREOGRAPHY_STAGES.ACTION, CHOREOGRAPHY_STAGES.IDLE],
  [CHOREOGRAPHY_STAGES.ACTION]: [CHOREOGRAPHY_STAGES.RESOLUTION, CHOREOGRAPHY_STAGES.IDLE],
  [CHOREOGRAPHY_STAGES.RESOLUTION]: [CHOREOGRAPHY_STAGES.IDLE]
};

export class NarrativeChoreographySession {
  constructor(config = {}) {
    this.elementId = config.elementId || 'unknown-element';
    this.hapticEnabled = Boolean(config.hapticEnabled);
    this.currentStage = CHOREOGRAPHY_STAGES.IDLE;
    this.secondaryLayers = new Map(); // layerId -> { triggerOn: string }
  }

  getCurrentStage() {
    return this.currentStage;
  }

  registerSecondaryLayer(layerId, options = {}) {
    const triggerOn = options.triggerOn || CHOREOGRAPHY_STAGES.ACTION;
    this.secondaryLayers.set(layerId, { triggerOn });
  }

  transitionTo(nextStage, metadata = {}) {
    const allowed = ALLOWED_STAGE_TRANSITIONS[this.currentStage] || [];
    if (!allowed.includes(nextStage)) {
      throw new Error(`Invalid choreography stage transition from ${this.currentStage} to ${nextStage}`);
    }

    this.currentStage = nextStage;
    const triggeredSecondaryLayers = [];

    // Trigger secondary layers registered for this stage
    for (const [layerId, opts] of this.secondaryLayers.entries()) {
      if (opts.triggerOn === nextStage) {
        triggeredSecondaryLayers.push(layerId);
      }
    }

    const response = {
      success: true,
      stage: nextStage,
      durationMs: metadata.durationMs || 150,
      triggeredSecondaryLayers
    };

    if (this.hapticEnabled && metadata.hapticType) {
      response.hapticTriggered = metadata.hapticType;
    }

    return response;
  }
}

/**
 * Creates a new choreography session.
 * @param {object} config
 * @returns {NarrativeChoreographySession}
 */
export function createNarrativeChoreographySession(config) {
  return new NarrativeChoreographySession(config);
}

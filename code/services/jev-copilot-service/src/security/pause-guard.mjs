// Emergency Pause & Circuit Breaker Guard for jev-copilot-service
// Listens to emergency pause control events and enforces fail-closed execution on mutation/suggestion commands.
// Preserves read-only status and health queries.

export const PAUSE_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED'
});

export class EmergencyPauseActiveError extends Error {
  /**
   * @param {string} [reason]
   */
  constructor(reason = 'Emergency pause is active across system') {
    super(`EmergencyPauseActiveError [LP05004]: ${reason}`);
    this.name = 'EmergencyPauseActiveError';
    this.code = 'LP05004';
    this.status = 422;
  }
}

export class PauseGuard {
  /**
   * @param {object} [options]
   * @param {string} [options.tenantId]
   * @param {boolean} [options.initiallyPaused=false]
   */
  constructor(options = {}) {
    this.tenantId = options.tenantId || null;
    this.isPaused = Boolean(options.initiallyPaused);
    this.pausedAt = options.initiallyPaused ? new Date().toISOString() : null;
    this.pauseReason = options.initiallyPaused ? 'Initial configuration' : null;
    this.pauseTriggeredBy = null;
    this.correlationId = null;

    // Listeners for pause state changes
    this.listeners = new Set();
  }

  /**
   * Check if emergency pause is currently engaged.
   * @returns {boolean}
   */
  isEmergencyPaused() {
    return this.isPaused;
  }

  /**
   * Fail-closed guard: Throws LP05004 if emergency pause is active.
   * All suggestion creation, generation, and delivery operations MUST call this check.
   *
   * @throws {EmergencyPauseActiveError}
   */
  assertNotPaused() {
    if (this.isPaused) {
      throw new EmergencyPauseActiveError(
        `Operation rejected fail-closed: Emergency pause is active (reason: ${this.pauseReason || 'operator action'})`
      );
    }
  }

  /**
   * Trigger emergency pause.
   *
   * @param {object} params
   * @param {string} [params.reason]
   * @param {string} [params.actor]
   * @param {string} [params.correlationId]
   * @returns {object} Current pause state
   */
  engagePause({ reason = 'Emergency pause command received', actor = 'system', correlationId = null } = {}) {
    this.isPaused = true;
    this.pausedAt = new Date().toISOString();
    this.pauseReason = reason;
    this.pauseTriggeredBy = actor;
    this.correlationId = correlationId;

    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Safe listener dispatch
      }
    }
    return state;
  }

  /**
   * Resume normal operations after emergency pause is lifted.
   *
   * @param {object} params
   * @param {string} [params.actor]
   * @param {string} [params.reason]
   * @returns {object} Current pause state
   */
  resumeOperations({ actor = 'operator', reason = 'Emergency pause resolved' } = {}) {
    this.isPaused = false;
    this.pausedAt = null;
    this.pauseReason = null;
    this.pauseTriggeredBy = null;
    this.correlationId = null;

    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Safe listener dispatch
      }
    }
    return state;
  }

  /**
   * Get current state snapshot.
   */
  getState() {
    return {
      status: this.isPaused ? PAUSE_STATUSES.PAUSED : PAUSE_STATUSES.ACTIVE,
      is_paused: this.isPaused,
      paused_at: this.pausedAt,
      reason: this.pauseReason,
      triggered_by: this.pauseTriggeredBy,
      correlation_id: this.correlationId
    };
  }

  /**
   * Subscribe to pause state transitions.
   * @param {(state: object) => void} callback
   * @returns {() => void} unsubscribe
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Handle incoming NATS control events:
   * 'livepilot.v1.control.pause.request' or 'livepilot.v1.control.emergency_pause.changed'
   *
   * @param {object} message
   */
  handleControlMessage(message) {
    if (!message) return;

    const payload = message.payload || message;
    const action = payload.action || (payload.paused === true ? 'pause' : payload.paused === false ? 'resume' : null);

    if (action === 'pause' || payload.paused === true) {
      this.engagePause({
        reason: payload.reason || 'NATS control pause signal',
        actor: payload.actor || 'control-service',
        correlationId: payload.correlation_id || null
      });
    } else if (action === 'resume' || payload.paused === false) {
      this.resumeOperations({
        actor: payload.actor || 'control-service',
        reason: payload.reason || 'NATS control resume signal'
      });
    }
  }
}

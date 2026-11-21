// NATS Ingestion Consumer for jev-copilot-service
// Ingests real-time signals/cues and triggers suggestion generation workflow.

export const INGESTION_SUBJECTS = Object.freeze({
  SIGNAL_CUE: 'livepilot.v1.signal.cue',
  TELEMETRY_SPIKE: 'livepilot.v1.signal.telemetry.spike',
  CATALOG_FACT_CHANGED: 'livepilot.v1.catalog.fact.changed',
  CONTROL_PAUSE: 'livepilot.v1.control.pause.request'
});

export class NatsConsumer {
  /**
   * @param {object} connection - NATS connection or bus
   * @param {import('../handlers/suggestion-command-handler.mjs').SuggestionCommandHandler} commandHandler
   */
  constructor(connection, commandHandler) {
    if (!connection) {
      throw new Error('NatsConsumer requires a connection');
    }
    if (!commandHandler) {
      throw new Error('NatsConsumer requires a SuggestionCommandHandler');
    }
    this.connection = connection;
    this.commandHandler = commandHandler;
    this.subscriptions = [];
  }

  /**
   * Register subscriptions to signal cues and control topics.
   */
  async start() {
    if (typeof this.connection.subscribe !== 'function') {
      throw new Error('Connection does not support subscribe');
    }

    // Subscribe to incoming signal cues
    const sub = this.connection.subscribe(INGESTION_SUBJECTS.SIGNAL_CUE, async (msg) => {
      await this.handleIncomingCue(msg);
    });
    this.subscriptions.push(sub);
    return this;
  }

  /**
   * Handle an incoming signal cue message.
   * @param {object} msg
   */
  async handleIncomingCue(msg) {
    let payload;
    if (typeof msg.data === 'string') {
      payload = JSON.parse(msg.data);
    } else if (msg.data instanceof Uint8Array) {
      payload = JSON.parse(Buffer.from(msg.data).toString('utf8'));
    } else if (typeof msg.data === 'object' && msg.data !== null) {
      payload = msg.data;
    } else {
      throw new Error('Invalid message data format');
    }

    const headers = msg.headers || {};
    const tenantId = payload.tenant_id || headers['X-Tenant-Id'];
    const liveSessionId = payload.live_session_id || headers['X-Session-Id'];
    const idempotencyKey = payload.idempotency_key || headers['X-Idempotency-Key'] || payload.cue_id;
    const correlationId = headers['X-Correlation-Id'] || payload.correlation_id;

    if (!tenantId || !liveSessionId) {
      if (typeof msg.respond === 'function') {
        msg.respond(JSON.stringify({ status: 'rejected', error: 'MISSING_TENANT_OR_SESSION' }));
      }
      return;
    }

    const command = {
      tenant_id: tenantId,
      live_session_id: liveSessionId,
      idempotency_key: idempotencyKey,
      correlation_id: correlationId,
      signal_ids: payload.signal_ids || [payload.cue_id || 'sig-default'],
      user_prompt: payload.prompt || payload.text || 'Generate host cue based on incoming stream signal',
      prompt_template_id: payload.prompt_template_id || 'tpl-host-cue-v1',
      prompt_revision: payload.prompt_revision || 'rev-01',
      system_instruction: payload.system_instruction,
      context_evidence: payload.evidence_refs || payload.context_evidence || []
    };

    const result = await this.commandHandler.handleCreateSuggestion(command);

    if (typeof msg.respond === 'function') {
      msg.respond(JSON.stringify(result));
    }

    return result;
  }

  /**
   * Stop subscriptions.
   */
  async stop() {
    for (const sub of this.subscriptions) {
      if (sub && typeof sub.unsubscribe === 'function') {
        await sub.unsubscribe();
      }
    }
    this.subscriptions = [];
  }
}

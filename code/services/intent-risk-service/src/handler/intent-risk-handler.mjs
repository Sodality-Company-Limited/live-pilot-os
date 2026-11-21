import { classifyIntent, rankRisk } from '../domain/intent-risk-engine.mjs';

export class IntentRiskHandler {
  constructor(store = { idempotency: new Set(), outbox: [], facts: [] }) {
    this.store = store;
  }

  async handleSignal(envelope) {
    const { tenant_id, live_session_id, idempotency_key, text, correlation_id, causation_id } = envelope;

    if (!tenant_id || !live_session_id) {
      throw new Error('AUTHENTICATION_REQUIRED: Missing tenant or session boundary');
    }

    const scopedKey = `${tenant_id}:${idempotency_key}`;
    if (this.store.idempotency.has(scopedKey)) {
      return { success: true, duplicate: true, outbox_appended: false };
    }

    const intent = classifyIntent(text);
    const risk = rankRisk(text);

    this.store.facts.push({
      tenant_id,
      live_session_id,
      intent,
      risk,
      occurred_at: new Date().toISOString()
    });

    if (intent && intent.outcome === 'DETECTED') {
      this.store.outbox.push({
        subject: 'livepilot.v1.telemetry.intent.detected',
        tenant_id,
        payload: {
          event_type: 'telemetry.intent.detected.v1',
          tenant_id,
          live_session_id,
          correlation_id,
          causation_id,
          category: intent.category,
          confidence: intent.confidence,
          evidence: intent.evidence
        }
      });
    }

    if (risk && risk.outcome === 'RANKED') {
      this.store.outbox.push({
        subject: 'livepilot.v1.risk.severity.ranked',
        tenant_id,
        payload: {
          event_type: 'risk.severity.ranked.v1',
          tenant_id,
          live_session_id,
          correlation_id,
          causation_id,
          category: risk.category,
          severity: risk.severity,
          score: risk.score,
          handling: risk.handling,
          evidence: risk.evidence
        }
      });
    }

    this.store.idempotency.add(scopedKey);
    return { success: true, duplicate: false, outbox_appended: true };
  }
}

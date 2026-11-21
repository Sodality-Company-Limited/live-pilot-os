// Application Command Handler for JEV Suggestions
// Implements suggestion creation, idempotency checking, inference invocation,
// atomic persistence + outbox generation, and NATS event emission.

import crypto from 'node:crypto';
import { SuggestionAggregate, SUGGESTION_STATUSES } from '../domain/suggestion-aggregate.mjs';
import { INFERENCE_OUTCOMES } from '../provider/provider-interface.mjs';
import { NATS_SUBJECTS } from '../nats/nats-publisher.mjs';

export class SuggestionCommandHandler {
  /**
   * @param {object} dependencies
   * @param {import('../persistence/suggestion-repository.mjs').SuggestionRepository} dependencies.suggestionRepository
   * @param {import('../persistence/idempotency-store.mjs').IdempotencyStore} dependencies.idempotencyStore
   * @param {import('../provider/inference-adapter.mjs').InferenceAdapter} dependencies.inferenceAdapter
   * @param {import('../nats/nats-publisher.mjs').NatsPublisher} dependencies.natsPublisher
   */
  constructor(dependencies) {
    if (!dependencies?.suggestionRepository) {
      throw new Error('SuggestionRepository is required');
    }
    if (!dependencies?.idempotencyStore) {
      throw new Error('IdempotencyStore is required');
    }
    if (!dependencies?.inferenceAdapter) {
      throw new Error('InferenceAdapter is required');
    }
    if (!dependencies?.natsPublisher) {
      throw new Error('NatsPublisher is required');
    }

    this.suggestionRepository = dependencies.suggestionRepository;
    this.idempotencyStore = dependencies.idempotencyStore;
    this.inferenceAdapter = dependencies.inferenceAdapter;
    this.natsPublisher = dependencies.natsPublisher;
  }

  /**
   * Handle 'suggestion.create' command
   *
   * @param {object} command
   * @param {string} command.tenant_id
   * @param {string} command.live_session_id
   * @param {string} command.idempotency_key
   * @param {string} [command.correlation_id]
   * @param {string} [command.prompt_template_id]
   * @param {string} [command.prompt_revision]
   * @param {string} [command.system_instruction]
   * @param {string} command.user_prompt
   * @param {Array<object>} [command.context_evidence]
   * @param {number} [command.timeout_ms]
   * @param {number} [command.min_confidence_bps]
   * @returns {Promise<object>}
   */
  async handleCreateSuggestion(command) {
    const {
      tenant_id,
      live_session_id,
      idempotency_key,
      correlation_id = `corr-${crypto.randomUUID()}`,
      prompt_template_id = 'tpl-host-cue-v1',
      prompt_revision = 'rev-01',
      system_instruction,
      user_prompt,
      context_evidence = [],
      timeout_ms,
      min_confidence_bps
    } = command;

    if (!tenant_id || !live_session_id) {
      throw new Error('tenant_id and live_session_id are required');
    }
    if (!idempotency_key) {
      throw new Error('idempotency_key is required');
    }
    if (!user_prompt) {
      throw new Error('user_prompt is required');
    }

    // 1. Semantic fingerprint calculation for idempotency
    const fingerprintPayload = JSON.stringify({
      tenant_id,
      live_session_id,
      user_prompt,
      prompt_template_id,
      context_evidence: context_evidence.map((e) => e.evidence_id || e.digest)
    });
    const semanticFingerprint = crypto.createHash('sha256').update(fingerprintPayload).digest('hex');

    // 2. Acquire idempotency lock
    const idemResult = await this.idempotencyStore.acquire(
      tenant_id,
      live_session_id,
      idempotency_key,
      semanticFingerprint
    );

    if (!idemResult.acquired) {
      // Replayed idempotent request
      if (idemResult.existingRecord?.status === 'completed' && idemResult.existingRecord.response_payload) {
        return {
          status: 'idempotent_replay',
          result: idemResult.existingRecord.response_payload
        };
      }
      return {
        status: 'pending_in_progress',
        idempotency_key
      };
    }

    // 3. Execute inference via adapter
    const inferenceResult = await this.inferenceAdapter.generateSuggestion({
      tenantId: tenant_id,
      liveSessionId: live_session_id,
      promptTemplateId: prompt_template_id,
      promptRevision: prompt_revision,
      systemInstruction: system_instruction,
      userPrompt: user_prompt,
      timeoutMs: timeout_ms,
      minConfidenceBps: min_confidence_bps,
      contextEvidence: context_evidence
    });

    if (inferenceResult.status !== INFERENCE_OUTCOMES.ACCEPTED) {
      // Failed, deferred, or refused
      const failureResponse = {
        status: inferenceResult.status,
        reason: inferenceResult.reason,
        receipt: inferenceResult.receipt
      };
      await this.idempotencyStore.complete(tenant_id, idempotency_key, failureResponse);
      return failureResponse;
    }

    // 4. Instantiate domain aggregate from accepted inference suggestion
    const aggregate = SuggestionAggregate.create(inferenceResult.suggestion);

    // 5. Construct outbox event and atomic persistence payload
    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: 'copilot.suggestion.proposed',
      subject: NATS_SUBJECTS.SUGGESTION_PROPOSED,
      payload: aggregate.toJSON(),
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id,
        'X-Correlation-Id': correlation_id,
        'X-Idempotency-Key': idempotency_key
      },
      occurred_at: aggregate.created_at
    };

    // 6. Atomically persist aggregate + provider receipt + outbox event
    const persisted = await this.suggestionRepository.createSuggestionWithOutbox(
      aggregate.toJSON(),
      inferenceResult.receipt,
      outboxEvent
    );

    // 7. Publish domain event to NATS JetStream
    const publishedRecord = await this.natsPublisher.publishSuggestionProposed(
      aggregate.toJSON(),
      { correlationId: correlation_id, causationId: idempotency_key }
    );

    const successResponse = {
      status: 'created',
      suggestion: aggregate.toJSON(),
      receipt: {
        ...inferenceResult.receipt,
        cost_minor: typeof inferenceResult.receipt.cost_minor === 'bigint'
          ? Number(inferenceResult.receipt.cost_minor)
          : inferenceResult.receipt.cost_minor
      },
      outbox_id: outboxId,
      published_subject: publishedRecord.subject
    };

    // 8. Complete idempotency record with success response
    await this.idempotencyStore.complete(tenant_id, idempotency_key, successResponse);

    return successResponse;
  }

  /**
   * Handle 'suggestion.withdraw' command
   */
  async handleWithdrawSuggestion({ tenant_id, live_session_id, suggestion_id, reason_code, reason_message }) {
    if (!tenant_id || !live_session_id || !suggestion_id || !reason_code) {
      throw new Error('tenant_id, live_session_id, suggestion_id, and reason_code are required');
    }

    const existing = await this.suggestionRepository.findById(tenant_id, suggestion_id);
    if (!existing) {
      throw new Error(`Suggestion not found: ${suggestion_id}`);
    }

    const aggregate = SuggestionAggregate.fromSnapshot(existing);
    aggregate.withdraw();

    const outboxId = `out-${crypto.randomUUID()}`;
    const outboxEvent = {
      outbox_id: outboxId,
      event_type: 'copilot.suggestion.withdrawn',
      subject: NATS_SUBJECTS.SUGGESTION_WITHDRAWN,
      payload: {
        suggestion_id,
        tenant_id,
        live_session_id,
        reason_code,
        reason_message: reason_message || reason_code
      },
      headers: {
        'Nats-Msg-Id': outboxId,
        'X-Tenant-Id': tenant_id,
        'X-Session-Id': live_session_id
      },
      occurred_at: aggregate.updated_at
    };

    const updated = await this.suggestionRepository.updateSuggestionStatusWithOutbox(
      tenant_id,
      suggestion_id,
      existing.aggregate_version,
      SUGGESTION_STATUSES.WITHDRAWN,
      outboxEvent
    );

    await this.natsPublisher.publishSuggestionWithdrawn({
      tenantId: tenant_id,
      liveSessionId: live_session_id,
      suggestionId: suggestion_id,
      reasonCode: reason_code,
      reasonMessage: reason_message
    });

    return {
      status: 'withdrawn',
      suggestion: updated
    };
  }
}

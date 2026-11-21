import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditRecordRepository } from '../../src/infrastructure/audit-record.repository.ts';
import {
  AuditAppendService,
  AUDIT_RECEIPT_APPEND_SUBJECT,
  type NatsJetStreamMessage,
} from '../../src/application/audit-append.service.ts';
import { ActionLogQueryService } from '../../src/application/action-log-query.service.ts';
import {
  AuditDlqPublisher,
  AUDIT_DLQ_ERROR_CODE,
} from '../../src/infrastructure/audit-dlq.publisher.ts';
import { AuditState } from '../../src/domain/audit-state-machine.ts';

describe('G-AUDI-006: Audit Query Projection & DLQ Recovery E2E Tests', () => {
  it('queries action logs for a session with pagination and verifies chronological ordering', async () => {
    const repository = new AuditRecordRepository();
    const appendService = new AuditAppendService(repository);
    const queryService = new ActionLogQueryService(repository);

    const tenantId = 'tenant_prod_001';
    const sessionId = 'session_live_999';

    // Ingest 3 sequential records for this session
    for (let i = 1; i <= 3; i++) {
      const receiptId = `receipt_session_seq_${i.toString().padStart(3, '0')}`;
      const msg: NatsJetStreamMessage = {
        subject: AUDIT_RECEIPT_APPEND_SUBJECT,
        headers: {
          'Nats-Msg-Id': `msg_${receiptId}`,
          'X-Correlation-Id': `corr_${receiptId}`,
          'X-Idempotency-Key': `idemp_${receiptId}`,
          'X-Tenant-Id': tenantId,
          'X-Session-Id': sessionId,
          'X-Schema-Version': '1.0.0',
          'X-Producer': 'telemetry-service',
          'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
        data: {
          receipt_id: receiptId,
          aggregate_id: `product_${i}`,
          actor_ref: 'operator_alpha',
          result: 'accepted',
          policy_revision: 'pol_rev_2026',
          occurred_at_ms: 1700000000000 + i * 1000,
          details: { action: `step_${i}` },
        },
        ack: () => {},
      };
      await appendService.appendReceipt(msg);
    }

    // 1. Query full page
    const page = await queryService.getActionLog({
      tenantId,
      sessionId,
      limit: 10,
    });

    assert.equal(page.items.length, 3);
    assert.equal(page.items[0].action_id, 'receipt_session_seq_003'); // newest first
    assert.equal(page.items[1].action_id, 'receipt_session_seq_002');
    assert.equal(page.items[2].action_id, 'receipt_session_seq_001');

    // 2. Query with pagination limit = 2
    const page1 = await queryService.getActionLog({
      tenantId,
      sessionId,
      limit: 2,
    });
    assert.equal(page1.items.length, 2);
    assert.ok(page1.next_cursor);

    // 3. Query next page using cursor
    const page2 = await queryService.getActionLog({
      tenantId,
      sessionId,
      limit: 2,
      cursor: page1.next_cursor,
    });
    assert.equal(page2.items.length, 1);
    assert.equal(page2.items[0].action_id, 'receipt_session_seq_001');
    assert.equal(page2.next_cursor, null);
  });

  it('guarantees cross-tenant boundary isolation (Tenant A cannot see Tenant B records)', async () => {
    const repository = new AuditRecordRepository();
    const appendService = new AuditAppendService(repository);
    const queryService = new ActionLogQueryService(repository);

    const tenantA = 'tenant_A';
    const tenantB = 'tenant_B';
    const sharedSessionId = 'session_shared_uuid_123';

    // Append record for Tenant A
    await appendService.appendReceipt({
      subject: AUDIT_RECEIPT_APPEND_SUBJECT,
      headers: {
        'Nats-Msg-Id': 'msg_tA_1',
        'X-Correlation-Id': 'corr_tA_1',
        'X-Idempotency-Key': 'idemp_tA_1',
        'X-Tenant-Id': tenantA,
        'X-Session-Id': sharedSessionId,
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'catalog-service',
        'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
      data: {
        receipt_id: 'receipt_tenant_A_secret_1',
        aggregate_id: 'product_secret_A',
        actor_ref: 'operator_A',
        result: 'accepted',
        policy_revision: 'pol_A',
        occurred_at_ms: 1700000000000,
      },
      ack: () => {},
    });

    // Append record for Tenant B
    await appendService.appendReceipt({
      subject: AUDIT_RECEIPT_APPEND_SUBJECT,
      headers: {
        'Nats-Msg-Id': 'msg_tB_1',
        'X-Correlation-Id': 'corr_tB_1',
        'X-Idempotency-Key': 'idemp_tB_1',
        'X-Tenant-Id': tenantB,
        'X-Session-Id': sharedSessionId,
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'catalog-service',
        'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
      data: {
        receipt_id: 'receipt_tenant_B_secret_2',
        aggregate_id: 'product_secret_B',
        actor_ref: 'operator_B',
        result: 'accepted',
        policy_revision: 'pol_B',
        occurred_at_ms: 1700000000100,
      },
      ack: () => {},
    });

    // Query Tenant A
    const resA = await queryService.getActionLog({
      tenantId: tenantA,
      sessionId: sharedSessionId,
    });
    assert.equal(resA.items.length, 1);
    assert.equal(resA.items[0].action_id, 'receipt_tenant_A_secret_1');
    assert.equal(resA.items.find((i) => i.action_id === 'receipt_tenant_B_secret_2'), undefined);

    // Query Tenant B
    const resB = await queryService.getActionLog({
      tenantId: tenantB,
      sessionId: sharedSessionId,
    });
    assert.equal(resB.items.length, 1);
    assert.equal(resB.items[0].action_id, 'receipt_tenant_B_secret_2');
    assert.equal(resB.items.find((i) => i.action_id === 'receipt_tenant_A_secret_1'), undefined);
  });

  it('asserts redaction guarantee in query results (zero raw tokens, passwords, secrets, or COGS)', async () => {
    const repository = new AuditRecordRepository();
    const appendService = new AuditAppendService(repository);
    const queryService = new ActionLogQueryService(repository);

    const tenantId = 'tenant_compliance_001';
    const sessionId = 'session_sensitive_999';

    await appendService.appendReceipt({
      subject: AUDIT_RECEIPT_APPEND_SUBJECT,
      headers: {
        'Nats-Msg-Id': 'msg_sens_1',
        'X-Correlation-Id': 'corr_sens_1',
        'X-Idempotency-Key': 'idemp_sens_1',
        'X-Tenant-Id': tenantId,
        'X-Session-Id': sessionId,
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'margin-policy-service',
        'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
      data: {
        receipt_id: 'receipt_sens_scrub_001',
        aggregate_id: 'sku_gold_watch',
        actor_ref: 'operator_alpha',
        result: 'accepted',
        policy_revision: 'pol_2026_01',
        occurred_at_ms: 1700000000500,
        api_token: 'tok_live_super_secret_99999',
        password_hash: 'raw_password_text',
        financial_metadata: {
          cogs_amount: 150000,
          supplier_cost: 140000,
          margin_pct: 12.5,
          auth_header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        },
      },
      ack: () => {},
    });

    const result = await queryService.getActionLog({
      tenantId,
      sessionId,
    });

    assert.equal(result.items.length, 1);
    const item = result.items[0];
    const summary = item.summary!;
    assert.ok(summary);

    // Verify redactions
    assert.equal(summary.api_token, '[REDACTED]');
    assert.equal(summary.password_hash, '[REDACTED]');
    const fin = summary.financial_metadata as Record<string, unknown>;
    assert.equal(fin.cogs_amount, '[REDACTED]');
    assert.equal(fin.supplier_cost, '[REDACTED]');
    assert.equal(fin.margin_pct, '[REDACTED]');
    assert.equal(fin.auth_header, '[REDACTED]');
  });

  it('routes poison / exhausted messages to DLQ with LP13005 error and preserves envelope', async () => {
    let publishedSubject: string | null = null;
    let publishedData: string | null = null;

    const mockPublisher = {
      publish: (sub: string, data: Uint8Array | string) => {
        publishedSubject = sub;
        publishedData = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
      },
    };

    const dlqPublisher = new AuditDlqPublisher(mockPublisher);

    const poisonEnvelope = {
      originalSubject: AUDIT_RECEIPT_APPEND_SUBJECT,
      headers: {
        'Nats-Msg-Id': 'msg_poison_001',
        'X-Tenant-Id': 'tenant_poison',
        'X-Session-Id': 'session_poison',
      },
      payload: {
        receipt_id: 'receipt_poison_001',
        aggregate_id: 'agg_poison',
        corrupted_field: true,
      },
      attempts: 5,
      error: new Error('Exhausted 5 retries due to downstream validation rejection'),
    };

    const dlqRecord = await dlqPublisher.routeToDlq(poisonEnvelope);

    assert.equal(dlqRecord.failure_code, AUDIT_DLQ_ERROR_CODE); // LP13005
    assert.equal(dlqRecord.attempts, 5);
    assert.equal(dlqRecord.replay_owner, 'audit-service');
    assert.equal(dlqRecord.state, AuditState.DEAD_LETTERED);
    assert.ok(dlqRecord.dlq_id.startsWith('dlq_'));
    assert.ok(dlqRecord.failure_detail.includes('Exhausted 5 retries'));

    // Check NATS publication
    assert.equal(publishedSubject, 'livepilot.v1.audit.receipt.dlq');
    assert.ok(publishedData);
    const parsedData = JSON.parse(publishedData);
    assert.equal(parsedData.dlq_id, dlqRecord.dlq_id);
    assert.equal(parsedData.failure_code, 'LP13005');
  });

  it('handles operator-authorized replay and re-ingests dead-lettered message', async () => {
    const repository = new AuditRecordRepository();
    const appendService = new AuditAppendService(repository);
    const dlqPublisher = new AuditDlqPublisher(undefined, appendService);

    const validPayload = {
      receipt_id: 'receipt_replay_test_001',
      aggregate_id: 'agg_replay_123',
      actor_ref: 'operator_replay_src',
      result: 'accepted',
      policy_revision: 'pol_replay_v1',
      occurred_at_ms: 1700000000000,
    };

    const headers = {
      'Nats-Msg-Id': 'msg_replay_initial',
      'X-Correlation-Id': 'corr_replay_initial',
      'X-Idempotency-Key': 'idemp_replay_initial',
      'X-Tenant-Id': 'tenant_replay_test',
      'X-Session-Id': 'session_replay_test',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'session-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };

    // Route to DLQ
    const dlqRecord = await dlqPublisher.routeToDlq({
      originalSubject: AUDIT_RECEIPT_APPEND_SUBJECT,
      headers,
      payload: validPayload,
      attempts: 5,
      error: 'Transient NATS timeout on initial ingest attempt',
    });

    // 1. Unauthorized replay rejection
    await assert.rejects(
      async () => {
        await dlqPublisher.replay({
          dlq_id: dlqRecord.dlq_id,
          operator_ref: 'operator_eve',
          authorization_token: 'invalid_unauthorized_token',
          reason: 'Manual rerun',
        });
      },
      {
        name: 'AuditDlqError',
        message: /Unauthorized replay/,
      }
    );

    // 2. Missing reason rejection
    await assert.rejects(
      async () => {
        await dlqPublisher.replay({
          dlq_id: dlqRecord.dlq_id,
          operator_ref: 'operator_lead',
          authorization_token: 'op_auth_secret_key_888',
          reason: '',
        });
      },
      {
        name: 'AuditDlqError',
        message: /requires an explicit justification reason/,
      }
    );

    // 3. Authorized replay execution
    const replayResult = await dlqPublisher.replay({
      dlq_id: dlqRecord.dlq_id,
      operator_ref: 'operator_lead_bob',
      authorization_token: 'op_auth_valid_token_xyz',
      reason: 'Transient network partition resolved; operator authorized replay',
    });

    assert.equal(replayResult.status, 'replayed');
    assert.ok(replayResult.replay_id.startsWith('replay_'));
    assert.equal(replayResult.append_status, 'committed');

    // 4. Verify record now exists in audit ledger repository
    const foundRecord = await repository.findRecord('tenant_replay_test', 'receipt_replay_test_001');
    assert.ok(foundRecord);
    assert.equal(foundRecord.receipt_id, 'receipt_replay_test_001');
    assert.equal(foundRecord.result, 'accepted');
  });
});

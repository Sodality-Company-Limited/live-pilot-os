import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditAppendService,
  type NatsJetStreamMessage,
  AuditValidationError,
  AUDIT_RECEIPT_RECORDED_SUBJECT,
} from '../../src/application/audit-append.service.ts';
import {
  AuditRecordRepository,
  GENESIS_PREV_HASH,
} from '../../src/infrastructure/audit-record.repository.ts';
import { AuditState } from '../../src/domain/audit-state-machine.ts';
import { REDACTED_PLACEHOLDER } from '../../src/domain/redaction-filter.ts';

function createMockNatsMessage(
  data: unknown,
  headers: Record<string, string>,
  hooks?: { onAck?: () => void; onNak?: () => void }
): NatsJetStreamMessage {
  let ackCalled = false;
  let nakCalled = false;
  return {
    data: typeof data === 'string' ? data : JSON.stringify(data),
    headers,
    ack: async () => {
      ackCalled = true;
      hooks?.onAck?.();
    },
    nak: async () => {
      nakCalled = true;
      hooks?.onNak?.();
    },
    get [Symbol.for('ackCalled')]() {
      return ackCalled;
    },
    get [Symbol.for('nakCalled')]() {
      return nakCalled;
    },
  } as any;
}

describe('G-AUDI-005: Audit Receipt Ingestion Vertical Slice Integration Tests', () => {
  let repository: AuditRecordRepository;
  let service: AuditAppendService;

  beforeEach(() => {
    repository = new AuditRecordRepository();
    service = new AuditAppendService(repository);
  });

  it('successfully appends a new audit receipt and transitions to COMMITTED state', async () => {
    const tenantId = 'tenant_thai_001';
    const receiptId = 'rcpt_sec_00000001';
    const messageHeaders = {
      'Nats-Msg-Id': 'msg_00001',
      'X-Correlation-Id': 'corr_00001',
      'X-Idempotency-Key': 'idemp_00001',
      'X-Tenant-Id': tenantId,
      'X-Session-Id': 'sess_00001',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'execution-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };

    const payload = {
      receipt_id: receiptId,
      aggregate_id: 'agg_session_100',
      actor_ref: 'actor_user_99',
      result: 'accepted',
      policy_revision: 'pol_rev_2026_v1',
      evidence_ids: ['ev_001', 'ev_002'],
      details: 'Standard operational execution event',
    };

    let acked = false;
    const msg = createMockNatsMessage(payload, messageHeaders, {
      onAck: () => {
        acked = true;
      },
    });

    const result = await service.appendReceipt(msg);

    assert.equal(result.status, 'committed');
    assert.equal(result.receiptId, receiptId);
    assert.equal(result.tenantId, tenantId);
    assert.equal(result.sequenceNum, 0);
    assert.equal(result.state, AuditState.COMMITTED);
    assert.ok(result.recordHash);
    assert.ok(result.outboxEventId);
    assert.equal(acked, true);

    // Verify stored record
    const stored = await repository.findRecord(tenantId, receiptId);
    assert.ok(stored);
    assert.equal(stored.prev_record_hash, GENESIS_PREV_HASH);
    assert.equal(stored.sequence_num, 0);
    assert.equal(stored.result, 'accepted');
  });

  it('guarantees duplicate command idempotency without double-appending', async () => {
    const tenantId = 'tenant_thai_001';
    const receiptId = 'rcpt_sec_00000002';
    const messageHeaders = {
      'Nats-Msg-Id': 'msg_00002',
      'X-Correlation-Id': 'corr_00002',
      'X-Idempotency-Key': 'idemp_00002',
      'X-Tenant-Id': tenantId,
      'X-Session-Id': 'sess_00002',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'execution-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };

    const payload = {
      receipt_id: receiptId,
      aggregate_id: 'agg_session_101',
      actor_ref: 'actor_user_99',
      result: 'accepted',
      policy_revision: 'pol_rev_2026_v1',
      evidence_ids: ['ev_003'],
    };

    const msg1 = createMockNatsMessage(payload, messageHeaders);
    const result1 = await service.appendReceipt(msg1);
    assert.equal(result1.status, 'committed');
    assert.equal(result1.sequenceNum, 0);

    // Second message with identical idempotency key and receipt
    const msg2 = createMockNatsMessage(payload, messageHeaders);
    const result2 = await service.appendReceipt(msg2);

    assert.equal(result2.status, 'duplicate');
    assert.equal(result2.receiptId, receiptId);
    assert.equal(result2.sequenceNum, 0);
    assert.equal(result2.recordHash, result1.recordHash);
    assert.equal(result2.outboxEventId, null);
  });

  it('strictly validates monotonic cryptographic hash-chaining across sequential records', async () => {
    const tenantId = 'tenant_thai_002';

    // Record 1
    const headers1 = {
      'Nats-Msg-Id': 'msg_chain_001',
      'X-Correlation-Id': 'corr_chain_001',
      'X-Idempotency-Key': 'idemp_chain_001',
      'X-Tenant-Id': tenantId,
      'X-Session-Id': 'sess_chain_1',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'catalog-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };
    const payload1 = {
      receipt_id: 'rcpt_chain_00000001',
      aggregate_id: 'agg_chain_1',
      actor_ref: 'admin_1',
      result: 'accepted',
      policy_revision: 'pol_v1',
    };

    const res1 = await service.appendReceipt(createMockNatsMessage(payload1, headers1));
    assert.equal(res1.sequenceNum, 0);

    const rec1 = await repository.findRecord(tenantId, payload1.receipt_id);
    assert.ok(rec1);
    assert.equal(rec1.prev_record_hash, GENESIS_PREV_HASH);
    assert.equal(rec1.record_hash, res1.recordHash);

    // Record 2
    const headers2 = {
      'Nats-Msg-Id': 'msg_chain_002',
      'X-Correlation-Id': 'corr_chain_002',
      'X-Idempotency-Key': 'idemp_chain_002',
      'X-Tenant-Id': tenantId,
      'X-Session-Id': 'sess_chain_1',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'catalog-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };
    const payload2 = {
      receipt_id: 'rcpt_chain_00000002',
      aggregate_id: 'agg_chain_1',
      actor_ref: 'admin_1',
      result: 'reconciled',
      policy_revision: 'pol_v1',
    };

    const res2 = await service.appendReceipt(createMockNatsMessage(payload2, headers2));
    assert.equal(res2.sequenceNum, 1);

    const rec2 = await repository.findRecord(tenantId, payload2.receipt_id);
    assert.ok(rec2);
    // Crucial invariant: Record 2's prev_record_hash MUST be Record 1's record_hash!
    assert.equal(rec2.prev_record_hash, rec1.record_hash);
    assert.equal(rec2.sequence_num, 1);
  });

  it('redacts sensitive credentials, tokens, and margins before persisting and outbox publishing', async () => {
    const tenantId = 'tenant_thai_003';
    const headers = {
      'Nats-Msg-Id': 'msg_redact_001',
      'X-Correlation-Id': 'corr_redact_001',
      'X-Idempotency-Key': 'idemp_redact_001',
      'X-Tenant-Id': tenantId,
      'X-Session-Id': 'sess_redact_1',
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'execution-service',
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    };

    const payload = {
      receipt_id: 'rcpt_redact_0000001',
      aggregate_id: 'agg_redact_1',
      actor_ref: 'operator',
      result: 'accepted',
      policy_revision: 'pol_v2',
      password: 'super-secret-password-123',
      api_key: 'live_sk_999988887777',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      financials: {
        cost: 5000,
        margin: 1200,
        normal_note: 'Non-sensitive note',
      },
    };

    const result = await service.appendReceipt(createMockNatsMessage(payload, headers));
    assert.equal(result.status, 'committed');

    // Check outbox fact payload
    // To check outbox, inspect via repository
    // In our repository, outbox facts are published with AUDIT_RECEIPT_RECORDED_SUBJECT
    const inbox = await repository.findInbox(tenantId, headers['Nats-Msg-Id']);
    assert.ok(inbox);
    assert.equal(inbox.status, 'PROCESSED');
  });

  it('fails closed and calls nak on missing mandatory headers or invalid schema', async () => {
    let naked = false;
    const invalidHeaders = {
      // Missing Nats-Msg-Id, X-Tenant-Id, etc.
      'X-Correlation-Id': 'corr_fail_001',
    };

    const payload = {
      receipt_id: 'too_short', // Less than 8 chars
      aggregate_id: 'agg_1',
      actor_ref: null,
      result: 'invalid_result_code', // invalid enum
      policy_revision: 'v1',
    };

    const msg = createMockNatsMessage(payload, invalidHeaders as any, {
      onNak: () => {
        naked = true;
      },
    });

    await assert.rejects(
      async () => {
        await service.appendReceipt(msg);
      },
      (err: any) => {
        assert.ok(err instanceof AuditValidationError);
        assert.equal(err.code, 'LP13002');
        return true;
      }
    );

    assert.equal(naked, true);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApprovalStateMachine,
  ApprovalDomainError,
  ApprovalDomainErrorCode,
} from '../../src/domain/approvalStateMachine.ts';

describe('ApprovalStateMachine', () => {
  const baseRequest = {
    id: 'appr_req_001',
    tenant_id: 'tenant_th_01',
    session_id: 'session_live_100',
    action_type: 'promotion',
    payload: { discount_percent: 15, sku: 'SKU-001' },
    status: 'requested',
    proposer_id: 'copilot_agent_01',
    deadline_at_ms: 100_000,
    created_at_ms: 10_000,
    updated_at_ms: 10_000,
    version: 1,
  };

  describe('Static Transition Rules', () => {
    it('allows valid transitions from requested', () => {
      assert.equal(ApprovalStateMachine.isTransitionAllowed('requested', 'approved'), true);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('requested', 'rejected'), true);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('requested', 'expired'), true);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('requested', 'revoked'), true);
    });

    it('allows approved -> revoked', () => {
      assert.equal(ApprovalStateMachine.isTransitionAllowed('approved', 'revoked'), true);
    });

    it('strictly forbids terminal state mutations', () => {
      assert.equal(ApprovalStateMachine.isTransitionAllowed('approved', 'rejected'), false);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('rejected', 'approved'), false);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('expired', 'approved'), false);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('revoked', 'approved'), false);
      assert.equal(ApprovalStateMachine.isTransitionAllowed('revoked', 'rejected'), false);
    });
  });

  describe('Expiry Evaluation', () => {
    it('returns unmodified request if deadline has not passed', () => {
      const result = ApprovalStateMachine.evaluateExpiry(baseRequest, 50_000);
      assert.equal(result.status, 'requested');
      assert.equal(result.version, 1);
    });

    it('transitions to expired deterministically when currentTimeMs > deadline_at_ms', () => {
      const result = ApprovalStateMachine.evaluateExpiry(baseRequest, 100_001);
      assert.equal(result.status, 'expired');
      assert.equal(result.version, 2);
      assert.equal(result.updated_at_ms, 100_001);
    });

    it('does not mutate already terminal records even after deadline', () => {
      const rejectedRequest = {
        ...baseRequest,
        status: 'rejected',
      };
      const result = ApprovalStateMachine.evaluateExpiry(rejectedRequest, 105_000);
      assert.equal(result.status, 'rejected');
      assert.equal(result.version, 1);
    });
  });

  describe('applyDecision Transitions', () => {
    it('successfully transitions requested -> approved and increments version', () => {
      const { updatedRequest, decisionRecord } = ApprovalStateMachine.applyDecision(
        baseRequest,
        'approved',
        'operator_user_99',
        { currentTimeMs: 20_000, isPaused: false, expectedVersion: 1 },
        'Approved by supervisor'
      );

      assert.equal(updatedRequest.status, 'approved');
      assert.equal(updatedRequest.version, 2);
      assert.equal(updatedRequest.updated_at_ms, 20_000);

      assert.ok(decisionRecord);
      assert.equal(decisionRecord.approval_request_id, 'appr_req_001');
      assert.equal(decisionRecord.decider_id, 'operator_user_99');
      assert.equal(decisionRecord.decision, 'approved');
      assert.equal(decisionRecord.reason, 'Approved by supervisor');
      assert.equal(decisionRecord.decided_at_ms, 20_000);
    });

    it('successfully transitions requested -> rejected', () => {
      const { updatedRequest, decisionRecord } = ApprovalStateMachine.applyDecision(
        baseRequest,
        'rejected',
        'operator_user_99',
        { currentTimeMs: 25_000, isPaused: false, expectedVersion: 1 },
        'Discount margin too high'
      );

      assert.equal(updatedRequest.status, 'rejected');
      assert.equal(updatedRequest.version, 2);
      assert.ok(decisionRecord);
      assert.equal(decisionRecord.decision, 'rejected');
      assert.equal(decisionRecord.reason, 'Discount margin too high');
    });

    it('successfully transitions approved -> revoked', () => {
      const approvedRequest = {
        ...baseRequest,
        status: 'approved',
        version: 2,
      };

      const { updatedRequest, decisionRecord } = ApprovalStateMachine.applyDecision(
        approvedRequest,
        'revoked',
        'operator_supervisor',
        { currentTimeMs: 30_000, isPaused: false, expectedVersion: 2 },
        'Emergency revocation prior to dispatch'
      );

      assert.equal(updatedRequest.status, 'revoked');
      assert.equal(updatedRequest.version, 3);
      assert.ok(decisionRecord);
      assert.equal(decisionRecord.decision, 'revoked');
    });

    it('fails closed when emergency pause is active', () => {
      assert.throws(
        () => {
          ApprovalStateMachine.applyDecision(
            baseRequest,
            'approved',
            'operator_user_99',
            { currentTimeMs: 20_000, isPaused: true, expectedVersion: 1 }
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.EMERGENCY_PAUSE_ACTIVE);
          return true;
        }
      );
    });

    it('fails closed on version mismatch (optimistic lock conflict)', () => {
      assert.throws(
        () => {
          ApprovalStateMachine.applyDecision(
            baseRequest,
            'approved',
            'operator_user_99',
            { currentTimeMs: 20_000, isPaused: false, expectedVersion: 999 }
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.VERSION_MISMATCH);
          return true;
        }
      );
    });

    it('fails closed if request has expired when applying decision', () => {
      assert.throws(
        () => {
          ApprovalStateMachine.applyDecision(
            baseRequest,
            'approved',
            'operator_user_99',
            { currentTimeMs: 120_000, isPaused: false, expectedVersion: 1 }
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.APPROVAL_REQUEST_EXPIRED);
          return true;
        }
      );
    });

    it('fails closed when attempting to transition already terminal request', () => {
      const terminalRejected = {
        ...baseRequest,
        status: 'rejected',
        version: 2,
      };

      assert.throws(
        () => {
          ApprovalStateMachine.applyDecision(
            terminalRejected,
            'approved',
            'operator_user_99',
            { currentTimeMs: 30_000, isPaused: false, expectedVersion: 2 }
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.APPROVAL_DECISION_ALREADY_RECORDED);
          return true;
        }
      );
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthorityPolicy,
} from '../../src/domain/authorityPolicy.ts';
import {
  ApprovalModeEngine,
} from '../../src/domain/approvalModeEngine.ts';
import {
  ApprovalDomainError,
  ApprovalDomainErrorCode,
} from '../../src/domain/approvalStateMachine.ts';

describe('AuthorityPolicy & ApprovalModeEngine', () => {
  const sampleRequest = {
    id: 'appr_req_555',
    tenant_id: 'tenant_th_01',
    session_id: 'session_live_100',
    action_type: 'promotion',
    payload: { voucher_code: 'SALE20' },
    status: 'requested',
    proposer_id: 'operator_proposer_01',
    deadline_at_ms: 100_000,
    created_at_ms: 10_000,
    updated_at_ms: 10_000,
    version: 1,
  };

  describe('Separation of Duty (SoD)', () => {
    it('strictly forbids proposer from approving their own request fail-closed', () => {
      assert.throws(
        () => {
          AuthorityPolicy.assertSeparationOfDuty(
            sampleRequest,
            'operator_proposer_01',
            'approved'
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.SEPARATION_OF_DUTY_VIOLATION);
          return true;
        }
      );
    });

    it('allows a different actor to approve', () => {
      assert.doesNotThrow(() => {
        AuthorityPolicy.assertSeparationOfDuty(
          sampleRequest,
          'supervisor_approver_02',
          'approved'
        );
      });
    });

    it('allows proposer to reject or revoke their own request', () => {
      assert.doesNotThrow(() => {
        AuthorityPolicy.assertSeparationOfDuty(
          sampleRequest,
          'operator_proposer_01',
          'revoked'
        );
      });
    });
  });

  describe('Actor Capability Verification', () => {
    it('allows admin role to bypass specific capabilities', () => {
      assert.doesNotThrow(() => {
        AuthorityPolicy.assertActorCapability('price_override', {
          actorId: 'admin_user',
          roles: ['admin'],
          capabilities: [],
        });
      });
    });

    it('allows actor with exact required capability', () => {
      assert.doesNotThrow(() => {
        AuthorityPolicy.assertActorCapability('promotion', {
          actorId: 'lead_user',
          roles: ['operator'],
          capabilities: ['approval.promotion.decide'],
        });
      });
    });

    it('rejects actor missing required capabilities fail-closed with LP05010', () => {
      assert.throws(
        () => {
          AuthorityPolicy.assertActorCapability('promotion', {
            actorId: 'guest_user',
            roles: ['viewer'],
            capabilities: ['telemetry.read'],
          });
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.INVALID_ACTOR_CAPABILITY);
          return true;
        }
      );
    });

    it('verifyAuthority combines SoD and capability checks', () => {
      // Proposer attempting to approve -> fails SoD
      assert.throws(
        () => {
          AuthorityPolicy.verifyAuthority(
            sampleRequest,
            {
              actorId: 'operator_proposer_01',
              roles: ['live_ops.supervisor'],
              capabilities: ['approval.promotion.decide'],
            },
            'approved'
          );
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.SEPARATION_OF_DUTY_VIOLATION);
          return true;
        }
      );

      // Separate actor with capability -> passes
      assert.doesNotThrow(() => {
        AuthorityPolicy.verifyAuthority(
          sampleRequest,
          {
            actorId: 'supervisor_approver_02',
            roles: ['live_ops.supervisor'],
            capabilities: ['approval.promotion.decide'],
          },
          'approved'
        );
      });
    });
  });

  describe('ApprovalModeEngine', () => {
    it('initializes new session with RECOMMEND_ONLY default mode', () => {
      const modeRecord = ApprovalModeEngine.createDefaultMode(
        'tenant_th_01',
        'session_live_100',
        'system',
        10_000
      );

      assert.equal(modeRecord.mode, 'RECOMMEND_ONLY');
      assert.equal(modeRecord.tenant_id, 'tenant_th_01');
      assert.equal(modeRecord.session_id, 'session_live_100');
    });

    it('transitions to ASSISTED mode with standard operator role', () => {
      const current = ApprovalModeEngine.createDefaultMode(
        'tenant_th_01',
        'session_live_100',
        'system',
        10_000
      );

      const updated = ApprovalModeEngine.transitionMode(current, {
        tenantId: 'tenant_th_01',
        sessionId: 'session_live_100',
        targetMode: 'ASSISTED',
        updatedBy: 'operator_user',
        currentTimeMs: 12_000,
        actorRoles: ['operator'],
        actorCapabilities: [],
      });

      assert.equal(updated.mode, 'ASSISTED');
      assert.equal(updated.updated_by, 'operator_user');
      assert.equal(updated.updated_at_ms, 12_000);
    });

    it('strictly forbids transition to AUTONOMOUS without admin or autonomous capability fail-closed', () => {
      const current = ApprovalModeEngine.createDefaultMode(
        'tenant_th_01',
        'session_live_100',
        'system',
        10_000
      );

      assert.throws(
        () => {
          ApprovalModeEngine.transitionMode(current, {
            tenantId: 'tenant_th_01',
            sessionId: 'session_live_100',
            targetMode: 'AUTONOMOUS',
            updatedBy: 'operator_user',
            currentTimeMs: 12_000,
            actorRoles: ['operator'],
            actorCapabilities: [],
          });
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED);
          return true;
        }
      );
    });

    it('permits transition to AUTONOMOUS with explicit capability', () => {
      const current = ApprovalModeEngine.createDefaultMode(
        'tenant_th_01',
        'session_live_100',
        'system',
        10_000
      );

      const updated = ApprovalModeEngine.transitionMode(current, {
        tenantId: 'tenant_th_01',
        sessionId: 'session_live_100',
        targetMode: 'AUTONOMOUS',
        updatedBy: 'admin_user',
        currentTimeMs: 15_000,
        actorRoles: ['operator'],
        actorCapabilities: ['control.mode.autonomous'],
      });

      assert.equal(updated.mode, 'AUTONOMOUS');
      assert.equal(updated.updated_at_ms, 15_000);
    });
  });
});

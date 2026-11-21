import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EmergencyPauseEngine,
} from '../../src/domain/emergencyPauseEngine.ts';
import {
  ApprovalDomainError,
  ApprovalDomainErrorCode,
} from '../../src/domain/approvalStateMachine.ts';

describe('EmergencyPauseEngine', () => {
  const sampleContext = {
    tenantId: 'tenant_th_01',
    sessionId: 'session_live_100',
  };

  describe('isPaused Scoping Hierarchy', () => {
    it('returns false when pause records list is empty', () => {
      assert.equal(EmergencyPauseEngine.isPaused(sampleContext, []), false);
    });

    it('returns false when pause records exist but is_paused is false', () => {
      const records = [
        {
          scope: 'GLOBAL',
          tenant_id: '*',
          session_id: '*',
          is_paused: false,
          triggered_by: 'admin',
          triggered_at_ms: 10_000,
          updated_at_ms: 12_000,
        },
      ];
      assert.equal(EmergencyPauseEngine.isPaused(sampleContext, records), false);
    });

    it('evaluates true for GLOBAL active pause regardless of tenant/session', () => {
      const records = [
        {
          scope: 'GLOBAL',
          tenant_id: '*',
          session_id: '*',
          is_paused: true,
          triggered_by: 'automated_risk_engine',
          triggered_at_ms: 10_000,
          updated_at_ms: 10_000,
        },
      ];
      assert.equal(EmergencyPauseEngine.isPaused(sampleContext, records), true);
      assert.equal(
        EmergencyPauseEngine.isPaused(
          { tenantId: 'other_tenant', sessionId: 'other_session' },
          records
        ),
        true
      );
    });

    it('evaluates true for TENANT scoped pause only for matching tenant', () => {
      const records = [
        {
          scope: 'TENANT',
          tenant_id: 'tenant_th_01',
          session_id: '*',
          is_paused: true,
          triggered_by: 'tenant_admin',
          triggered_at_ms: 10_000,
          updated_at_ms: 10_000,
        },
      ];
      assert.equal(EmergencyPauseEngine.isPaused(sampleContext, records), true);
      assert.equal(
        EmergencyPauseEngine.isPaused(
          { tenantId: 'tenant_sg_02', sessionId: 'session_live_100' },
          records
        ),
        false
      );
    });

    it('evaluates true for SESSION scoped pause only for matching tenant and session', () => {
      const records = [
        {
          scope: 'SESSION',
          tenant_id: 'tenant_th_01',
          session_id: 'session_live_100',
          is_paused: true,
          triggered_by: 'lead_operator',
          triggered_at_ms: 10_000,
          updated_at_ms: 10_000,
        },
      ];
      assert.equal(EmergencyPauseEngine.isPaused(sampleContext, records), true);
      assert.equal(
        EmergencyPauseEngine.isPaused(
          { tenantId: 'tenant_th_01', sessionId: 'session_live_200' },
          records
        ),
        false
      );
    });
  });

  describe('assertNotPaused Guard', () => {
    it('passes cleanly when pause is inactive', () => {
      assert.doesNotThrow(() => {
        EmergencyPauseEngine.assertNotPaused(sampleContext, []);
      });
    });

    it('throws LP05004 fail-closed when pause is active', () => {
      const records = [
        {
          scope: 'GLOBAL',
          tenant_id: '*',
          session_id: '*',
          is_paused: true,
          triggered_by: 'admin',
          triggered_at_ms: 10_000,
          updated_at_ms: 10_000,
        },
      ];

      assert.throws(
        () => {
          EmergencyPauseEngine.assertNotPaused(sampleContext, records);
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.EMERGENCY_PAUSE_ACTIVE);
          return true;
        }
      );
    });
  });

  describe('transitionPause', () => {
    it('creates active pause record from human operator or automated risk system', () => {
      const pauseRecord = EmergencyPauseEngine.transitionPause({
        scope: 'SESSION',
        tenantId: 'tenant_th_01',
        sessionId: 'session_live_100',
        isPaused: true,
        triggeredBy: 'automated_risk_engine',
        currentTimeMs: 15_000,
        reason: 'Sudden spike in negative comments detected',
        actorRole: 'automated_risk_engine',
      });

      assert.equal(pauseRecord.is_paused, true);
      assert.equal(pauseRecord.scope, 'SESSION');
      assert.equal(pauseRecord.triggered_by, 'automated_risk_engine');
      assert.equal(pauseRecord.reason, 'Sudden spike in negative comments detected');
      assert.equal(pauseRecord.triggered_at_ms, 15_000);
    });

    it('allows authorized human operator to deactivate emergency pause', () => {
      const resumeRecord = EmergencyPauseEngine.transitionPause({
        scope: 'SESSION',
        tenantId: 'tenant_th_01',
        sessionId: 'session_live_100',
        isPaused: false,
        triggeredBy: 'operator_human_01',
        currentTimeMs: 16_000,
        reason: 'Situation stabilized',
        actorRole: 'lead_operator',
      });

      assert.equal(resumeRecord.is_paused, false);
      assert.equal(resumeRecord.triggered_by, 'operator_human_01');
    });

    it('strictly forbids automated systems from deactivating emergency pause fail-closed', () => {
      assert.throws(
        () => {
          EmergencyPauseEngine.transitionPause({
            scope: 'SESSION',
            tenantId: 'tenant_th_01',
            sessionId: 'session_live_100',
            isPaused: false,
            triggeredBy: 'agent_bot_01',
            currentTimeMs: 16_000,
            actorRole: 'agent',
          });
        },
        (err) => {
          assert.ok(err instanceof ApprovalDomainError);
          assert.equal(err.code, ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED);
          return true;
        }
      );
    });
  });
});

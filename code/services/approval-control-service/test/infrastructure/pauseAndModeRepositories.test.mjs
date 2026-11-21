import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePoolManager } from '../../src/persistence/database.ts';
import { EmergencyPauseRepository } from '../../src/infrastructure/emergencyPauseRepository.ts';
import { ApprovalModeRepository } from '../../src/infrastructure/approvalModeRepository.ts';
import { ApprovalDomainError, ApprovalDomainErrorCode } from '../../src/domain/approvalStateMachine.ts';

class MockControlStateEngine {
  constructor() {
    this.emergency_pauses = new Map();
    this.approval_modes = new Map();
  }

  createClient() {
    return {
      query: async (sqlText, params = []) => {
        const trimmed = sqlText.trim();
        if (trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK')) {
          return { rows: [], rowCount: 0 };
        }
        if (trimmed.includes("set_config('app.tenant_id'")) {
          return { rows: [{ set_config: params[0] }], rowCount: 1 };
        }

        // Emergency Pause queries
        if (trimmed.includes('SELECT * FROM approval.emergency_pauses')) {
          const [tenant_id, session_id] = params;
          const rows = [];
          for (const rec of this.emergency_pauses.values()) {
            if (rec.tenant_id === tenant_id && (rec.session_id === session_id || rec.scope === 'TENANT' || rec.scope === 'GLOBAL')) {
              rows.push(rec);
            }
          }
          return { rows, rowCount: rows.length };
        }

        if (trimmed.includes('INSERT INTO approval.emergency_pauses')) {
          const [scope, tenant_id, session_id, is_paused, reason, triggered_by, triggered_at_ms, updated_at_ms] = params;
          const key = `${tenant_id}:${session_id}:${scope}`;
          const rec = {
            scope,
            tenant_id,
            session_id,
            is_paused,
            reason,
            triggered_by,
            triggered_at_ms,
            updated_at_ms,
          };
          this.emergency_pauses.set(key, rec);
          return { rows: [rec], rowCount: 1 };
        }

        // Approval Mode queries
        if (trimmed.includes('SELECT * FROM approval.approval_modes')) {
          const [tenant_id, session_id] = params;
          const key = `${tenant_id}:${session_id}`;
          const rec = this.approval_modes.get(key);
          return { rows: rec ? [rec] : [], rowCount: rec ? 1 : 0 };
        }

        if (trimmed.includes('INSERT INTO approval.approval_modes')) {
          const [tenant_id, session_id, mode, updated_by, updated_at_ms] = params;
          const key = `${tenant_id}:${session_id}`;
          const rec = {
            tenant_id,
            session_id,
            mode,
            updated_by,
            updated_at_ms,
          };
          this.approval_modes.set(key, rec);
          return { rows: [rec], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      },
      release: () => {},
    };
  }
}

describe('EmergencyPause & ApprovalMode Repositories Suite', () => {
  let db;
  let mockEngine;
  let pauseRepo;
  let modeRepo;

  beforeEach(() => {
    mockEngine = new MockControlStateEngine();
    db = new DatabasePoolManager();
    db.getClient = async () => mockEngine.createClient();
    pauseRepo = new EmergencyPauseRepository(db);
    modeRepo = new ApprovalModeRepository(db);
  });

  describe('EmergencyPauseRepository', () => {
    it('defaults to not paused when no pause record exists', async () => {
      const isPaused = await pauseRepo.isPaused('tenant-1', 'session-1');
      assert.equal(isPaused, false);
    });

    it('sets emergency pause active and propagates to isPaused evaluation', async () => {
      const rec = await pauseRepo.setPauseState({
        scope: 'SESSION',
        tenant_id: 'tenant-1',
        session_id: 'session-1',
        is_paused: true,
        triggered_by: 'operator-1',
        reason: 'Host disconnecting',
        actor_role: 'admin',
      });

      assert.equal(rec.is_paused, true);
      assert.equal(rec.scope, 'SESSION');

      const isPaused = await pauseRepo.isPaused('tenant-1', 'session-1');
      assert.equal(isPaused, true);
    });

    it('strictly forbids automated systems from deactivating pause fail-closed', async () => {
      // First pause it
      await pauseRepo.setPauseState({
        scope: 'SESSION',
        tenant_id: 'tenant-1',
        session_id: 'session-1',
        is_paused: true,
        triggered_by: 'operator-1',
        actor_role: 'admin',
      });

      // Attempt resume from bot/service
      await assert.rejects(
        async () => {
          await pauseRepo.setPauseState({
            scope: 'SESSION',
            tenant_id: 'tenant-1',
            session_id: 'session-1',
            is_paused: false, // Resume
            triggered_by: 'automated-risk-engine',
            actor_role: 'automated_risk_engine', // Automated role rejected!
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

  describe('ApprovalModeRepository', () => {
    it('defaults to RECOMMEND_ONLY for uninitialized session', async () => {
      const mode = await modeRepo.getMode('tenant-1', 'session-fresh');
      assert.equal(mode.mode, 'RECOMMEND_ONLY');
    });

    it('transitions to ASSISTED mode with operator role', async () => {
      const updated = await modeRepo.updateMode({
        tenant_id: 'tenant-1',
        session_id: 'session-fresh',
        target_mode: 'ASSISTED',
        updated_by: 'operator-1',
        actor_roles: ['operator'],
        actor_capabilities: [],
      });

      assert.equal(updated.mode, 'ASSISTED');
      const fetched = await modeRepo.getMode('tenant-1', 'session-fresh');
      assert.equal(fetched.mode, 'ASSISTED');
    });

    it('rejects transition to AUTONOMOUS without required capabilities fail-closed', async () => {
      await assert.rejects(
        async () => {
          await modeRepo.updateMode({
            tenant_id: 'tenant-1',
            session_id: 'session-fresh',
            target_mode: 'AUTONOMOUS',
            updated_by: 'operator-1',
            actor_roles: ['operator'],
            actor_capabilities: [], // Missing autonomous capability or admin
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

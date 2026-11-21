import assert from 'node:assert/strict';
import test from 'node:test';
import { PromotionAggregate } from '../../code/apps/services/promotion-service/src/domain/promotion-aggregate';
import { PromotionControl, PromotionControlError } from '../../code/apps/services/promotion-service/src/application/promotion-control';
import { PromotionExpiryWorker } from '../../code/apps/services/promotion-service/src/workers/promotion-expiry.worker';

const actor = (capabilities: readonly string[]) => ({ id: 'operator-1', tenantId: 'tenant-1', capabilities });
const command = (to: 'expired' | 'cancelled', version: number, revision: number, key: string, preconditions: Record<string, unknown>) => ({
  to, actor: actor(['promotion:transition', `promotion:${to === 'expired' ? 'expire' : 'cancel'}`]), sessionId: 'session-1', expectedVersion: version,
  controlRevision: revision, idempotencyKey: key, fingerprint: `${key}:fingerprint`, preconditions,
});

test('global and scoped pauses fail closed and block issue/dispatch', () => {
  const control = new PromotionControl();
  control.updatePause({ actor: actor(['promotion:pause']), scope: 'tenant', scopeId: 'tenant-1', paused: true, expectedRevision: 0, idempotencyKey: 'pause-1', fingerprint: 'a' });
  assert.throws(() => control.assertDispatchAllowed({ tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-1', controlRevision: 1 }), (error: unknown) => error instanceof PromotionControlError && error.code === 'PROMOTION_PAUSED');
  assert.throws(() => control.assertDispatchAllowed({ tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-1', controlRevision: 0 }), /stale/i);
  assert.throws(() => new PromotionControl({ known: false }).assertDispatchAllowed({ tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-1', controlRevision: 0 }), /unavailable/i);
});

test('worker permits legal expiry and cancellation but preserves actor/version/evidence guards', () => {
  const control = new PromotionControl();
  const worker = new PromotionExpiryWorker(control);
  const expired = new PromotionAggregate('promo-expire', 'tenant-1', 'pending');
  const result = worker.expire({ ...command('expired', 0, 0, 'expire-1', { expired: true }), promotion: expired, tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-expire' });
  assert.equal(result.state, 'expired');
  const cancelled = new PromotionAggregate('promo-cancel', 'tenant-1', 'pending');
  assert.throws(() => worker.cancel({ ...command('cancelled', 0, 0, 'cancel-1', {}), promotion: cancelled, tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-cancel' }), /reason/i);
  const cancelledResult = worker.cancel({ ...command('cancelled', 0, 0, 'cancel-2', { reason: 'operator requested' }), promotion: cancelled, tenantId: 'tenant-1', sessionId: 'session-1', promotionId: 'promo-cancel' });
  assert.equal(cancelledResult.state, 'cancelled');
});

test('pause commands require capability, current revision, and same-key idempotency', () => {
  const control = new PromotionControl();
  const pause = { actor: actor(['promotion:pause']), scope: 'global' as const, paused: true, expectedRevision: 0, idempotencyKey: 'pause-1', fingerprint: 'same' };
  assert.throws(() => control.updatePause({ ...pause, actor: actor([]) }), /capability/i);
  const first = control.updatePause(pause);
  assert.deepEqual(control.updatePause(pause), first);
  assert.throws(() => control.updatePause({ ...pause, fingerprint: 'different' }), /another command/i);
  assert.throws(() => control.updatePause({ ...pause, idempotencyKey: 'pause-2' }), /stale/i);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { PromotionAggregate, PromotionDomainError } from '../../code/apps/services/promotion-service/src/domain/promotion-aggregate';

const actor = (capabilities: readonly string[] = ['promotion:transition']) => ({ id: 'actor-1', tenantId: 'tenant-1', capabilities });
const command = (to: Parameters<PromotionAggregate['transition']>[0]['to'], expectedVersion: number, key: string, preconditions = {}) => ({ to, expectedVersion, idempotencyKey: key, fingerprint: `${key}-fingerprint`, actor: actor(), preconditions });

test('executes the valid lifecycle and increments the resource version', () => {
  const promotion = new PromotionAggregate('promo-1', 'tenant-1');
  promotion.transition(command('pending', 0, 'submit-1', { submissionValid: true }));
  promotion.transition(command('approved', 1, 'approve-1', { approvalEvidence: true }));
  promotion.transition(command('issued', 2, 'issue-1', { issuanceEvidence: true }));
  const result = promotion.transition(command('expired', 3, 'expire-1', { expired: true }));
  assert.deepEqual({ state: result.state, version: result.version }, { state: 'expired', version: 4 });
});

test('rejects unknown, illegal, unauthorized, stale, and missing-evidence commands', () => {
  const promotion = new PromotionAggregate('promo-1', 'tenant-1');
  assert.throws(() => promotion.transition(command('unknown', 0, 'unknown')), (error: unknown) => error instanceof PromotionDomainError && error.code === 'INVALID_INPUT');
  assert.throws(() => promotion.transition(command('issued', 0, 'illegal')), (error: unknown) => error instanceof PromotionDomainError && error.code === 'ILLEGAL_TRANSITION');
  assert.throws(() => promotion.transition(command('pending', 0, 'no-evidence')), (error: unknown) => error instanceof PromotionDomainError && error.code === 'PRECONDITION_FAILED');
  assert.throws(() => promotion.transition({ ...command('pending', 0, 'denied', { submissionValid: true }), actor: actor([]) }), (error: unknown) => error instanceof PromotionDomainError && error.code === 'UNAUTHORIZED');
  assert.throws(() => promotion.transition(command('pending', 4, 'stale', { submissionValid: true })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'VERSION_CONFLICT');
});

test('replays an identical idempotent command and rejects a conflicting fingerprint', () => {
  const promotion = new PromotionAggregate('promo-1', 'tenant-1');
  const first = promotion.transition(command('pending', 0, 'same-key', { submissionValid: true }));
  const replay = promotion.transition(command('pending', 0, 'same-key', { submissionValid: true }));
  assert.equal(replay.idempotent, true);
  assert.equal(replay.version, first.version);
  assert.throws(() => promotion.transition({ ...command('pending', 0, 'same-key', { submissionValid: true }), fingerprint: 'different' }), (error: unknown) => error instanceof PromotionDomainError && error.code === 'IDEMPOTENCY_CONFLICT');
});

test('requires reasons and expiry evidence, and enforces tenant ownership', () => {
  const promotion = new PromotionAggregate('promo-1', 'tenant-1');
  assert.throws(() => promotion.transition({ ...command('pending', 0, 'submit', { submissionValid: true }), actor: { ...actor(), tenantId: 'other' } }), (error: unknown) => error instanceof PromotionDomainError && error.code === 'TENANT_MISMATCH');
  assert.throws(() => promotion.transition(command('pending', 0, 'submit-no-reason', { submissionValid: false })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'PRECONDITION_FAILED');
});

test('supports rejected and cancelled terminal outcomes and fail-closes unknown aggregates', () => {
  const rejected = new PromotionAggregate('promo-rejected', 'tenant-1');
  rejected.transition(command('pending', 0, 'submit-r', { submissionValid: true }));
  const rejectedResult = rejected.transition(command('rejected', 1, 'reject-r', { reason: 'policy denied' }));
  assert.equal(rejectedResult.state, 'rejected');
  assert.throws(() => rejected.transition(command('pending', 2, 'reopen-r', { submissionValid: true })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'ILLEGAL_TRANSITION');

  const cancelled = new PromotionAggregate('promo-cancelled', 'tenant-1');
  cancelled.transition(command('pending', 0, 'submit-c', { submissionValid: true }));
  const cancelledResult = cancelled.transition(command('cancelled', 1, 'cancel-c', { reason: 'withdrawn' }));
  assert.equal(cancelledResult.state, 'cancelled');

  const unknown = new PromotionAggregate('promo-unknown', 'tenant-1', 'unknown');
  assert.throws(() => unknown.transition(command('pending', 0, 'recover-unknown', { submissionValid: true })), (error: unknown) => error instanceof PromotionDomainError && error.code === 'ILLEGAL_TRANSITION');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarginCalculator, assertMinorUnits } from '../src/domain/margin-calculator.mjs';
import { MarginRepository } from '../src/storage/margin-repository.mjs';
import { MarginPolicyService } from '../src/margin-policy-service.mjs';

describe('G-MARG-004: Margin Policy Service Vertical Slice', () => {
  describe('Article V & Zero-Float Invariants: assertMinorUnits', () => {
    it('should accept valid integer BigInts and numbers', () => {
      assert.equal(assertMinorUnits(100, 'test'), 100n);
      assert.equal(assertMinorUnits(100n, 'test'), 100n);
      assert.equal(assertMinorUnits('100', 'test'), 100n);
    });

    it('should reject floats and string numbers with decimals', () => {
      assert.throws(
        () => assertMinorUnits(99.99, 'price_minor'),
        /Strict Zero-Float Violation/
      );
      assert.throws(
        () => assertMinorUnits('99.99', 'price_minor'),
        /Strict Zero-Float Violation/
      );
      assert.throws(
        () => assertMinorUnits(NaN, 'price_minor'),
        /Strict Zero-Float Violation/
      );
    });
  });

  describe('F03.3-FLOW-001 & FLOW-002: Safe Discount Margin Evaluation (APPROVED)', () => {
    it('should approve discount where net contribution margin exceeds floor (1000 bps = 10%)', async () => {
      // Scenario:
      // Price = 1000.00 THB (100000 minor)
      // Discount = 100.00 THB (10000 minor) -> Effective Price = 900.00 THB (90000 minor)
      // COGS = 500.00 THB (50000 minor)
      // Platform Fee = 50.00 THB (5000 minor)
      // Shipping Fee = 40.00 THB (4000 minor)
      // Net Margin = 90000 - 50000 - 5000 - 4000 = 31000 minor (310.00 THB)
      // margin_bps = (31000 * 10000) / 90000 = 310000000 / 90000 = 3444 bps (34.44%)
      // Floor = 1000 bps (10.00%)
      // Verdict = APPROVED

      const calc = MarginCalculator.evaluate({
        price_minor: 100000n,
        candidate_discount_minor: 10000n,
        cogs_minor: 50000n,
        platform_fee_minor: 5000n,
        shipping_fee_minor: 4000n,
        floor_bps: 1000
      });

      assert.equal(calc.status, 'APPROVED');
      assert.equal(calc.effective_price_minor, 90000n);
      assert.equal(calc.net_margin_minor, 31000n);
      assert.equal(calc.margin_bps, 3444);
      assert.equal(calc.safer_alternative_discount_minor, null);
    });
  });

  describe('F03.3-FLOW-003: Loss-Making or Sub-Floor Discount Evaluation (REJECTED)', () => {
    it('should reject discount where margin falls below floor policy and compute safer alternative', async () => {
      // Scenario:
      // Price = 1000.00 THB (100000 minor)
      // Candidate Discount = 450.00 THB (45000 minor) -> Effective Price = 550.00 THB (55000 minor)
      // COGS = 500.00 THB (50000 minor)
      // Platform Fee = 50.00 THB (5000 minor)
      // Shipping Fee = 40.00 THB (4000 minor)
      // Net Margin = 55000 - 50000 - 5000 - 4000 = -4000 minor (-40.00 THB)
      // margin_bps = (-4000 * 10000) / 55000 = -727 bps (-7.27%)
      // Floor = 1000 bps (10.00%)
      // Verdict = REJECTED

      const calc = MarginCalculator.evaluate({
        price_minor: 100000n,
        candidate_discount_minor: 45000n,
        cogs_minor: 50000n,
        platform_fee_minor: 5000n,
        shipping_fee_minor: 4000n,
        floor_bps: 1000
      });

      assert.equal(calc.status, 'REJECTED');
      assert.equal(calc.effective_price_minor, 55000n);
      assert.equal(calc.net_margin_minor, -4000n);
      assert.equal(calc.margin_bps, -727);
      assert.ok(calc.safer_alternative_discount_minor !== null);
      // Safer alternative calculation:
      // Total costs = 59000. margin_multiplier = 9000.
      // min_effective_price = ceil(59000 * 10000 / 9000) = ceil(590000 / 9) = 65556
      // max_discount = 100000 - 65556 = 34444 minor
      assert.equal(calc.safer_alternative_discount_minor, 34444n);
      assert.ok(calc.safer_alternative_margin_bps >= 1000);
    });
  });

  describe('Transactional Outbox & Service End-to-End Vertical Slice', () => {
    it('should process evaluation request, write verdict, and record outbox event atomically', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      const request = {
        tenant_id: 'tenant_live_001',
        live_session_id: 'session_thb_999',
        product_id: 'prod_sku_101',
        sku: 'SKU-COSMETIC-01',
        price_minor: '100000',
        candidate_discount_minor: '10000',
        cogs_minor: '40000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '5000',
        idempotency_key: 'idemp_key_slice_001',
        currency: 'THB',
        scale: 2
      };

      const result = await service.handleEvaluationRequest(request);

      assert.equal(result.status, 'APPROVED');
      assert.equal(result.net_margin_minor, '40000');
      assert.equal(result.margin_bps, 4444);
      assert.equal(result.is_idempotent_replay, false);

      // Verify outbox record exists
      const pendingOutbox = await repository.getPendingOutbox('tenant_live_001');
      assert.equal(pendingOutbox.length, 1);
      assert.equal(pendingOutbox[0].subject, 'livepilot.v1.margin.verdict.approved');
      assert.equal(pendingOutbox[0].payload.status, 'APPROVED');
      assert.equal(pendingOutbox[0].payload.sku, 'SKU-COSMETIC-01');

      // Verify idempotency replay returns same verdict without new outbox entries
      const replay = await service.handleEvaluationRequest(request);
      assert.equal(replay.is_idempotent_replay, true);
      assert.equal(replay.verdict_id, result.verdict_id);

      const pendingAfterReplay = await repository.getPendingOutbox('tenant_live_001');
      assert.equal(pendingAfterReplay.length, 1);
    });

    it('should reject loss-making discount and emit rejected verdict outbox event', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      const request = {
        tenant_id: 'tenant_live_001',
        live_session_id: 'session_thb_999',
        product_id: 'prod_sku_102',
        sku: 'SKU-COSMETIC-02',
        price_minor: '100000',
        candidate_discount_minor: '50000',
        cogs_minor: '45000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '5000',
        currency: 'THB',
        scale: 2
      };

      const result = await service.handleEvaluationRequest(request);

      assert.equal(result.status, 'REJECTED');
      assert.equal(result.net_margin_minor, '-5000');
      assert.equal(result.margin_bps, -1000);

      const pendingOutbox = await repository.getPendingOutbox('tenant_live_001');
      assert.equal(pendingOutbox.length, 1);
      assert.equal(pendingOutbox[0].subject, 'livepilot.v1.margin.verdict.rejected');
      assert.equal(pendingOutbox[0].payload.status, 'REJECTED');
    });
  });
});

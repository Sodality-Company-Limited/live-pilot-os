import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarginPolicyService, DLQ_SUBJECT } from '../src/margin-policy-service.mjs';
import { MarginRepository } from '../src/storage/margin-repository.mjs';
import { AlternativesEngine, VERIFIED_BUNDLES } from '../src/domain/alternatives-engine.mjs';

describe('G-MARG-005: Margin Reliability, Alternatives, and Re-evaluation Suite', () => {
  describe('F03.3-FLOW-004: Human Approval Routing (NEEDS_APPROVAL)', () => {
    it('should route proposal to NEEDS_APPROVAL when margin falls within conditional review band (1000-1500 bps)', async () => {
      const repository = new MarginRepository();
      // Configure policy with floor 1000 bps (10.00%) and review band 1500 bps (15.00%)
      await repository.savePolicy({
        tenant_id: 'tenant_rel_01',
        policy_name: 'default_margin_policy',
        version: 1,
        floor_bps: 1000,
        review_band_bps: 1500,
        auto_approve_threshold_minor: 50000n,
        currency: 'THB',
        scale: 2,
        is_active: true
      });

      const service = new MarginPolicyService({ repository });

      // Scenario:
      // Price = 1000.00 THB (100000 minor)
      // Discount = 100.00 THB (10000 minor) -> Effective = 900.00 THB (90000 minor)
      // COGS = 700.00 THB (70000 minor)
      // Platform Fee = 50.00 THB (5000 minor)
      // Shipping Fee = 40.00 THB (4000 minor)
      // Net Margin = 90000 - 70000 - 5000 - 4000 = 11000 minor (110.00 THB)
      // Margin BPS = (11000 * 10000) / 90000 = 1222 bps (12.22%)
      // 1000 <= 1222 < 1500 -> Status MUST be NEEDS_APPROVAL
      const request = {
        tenant_id: 'tenant_rel_01',
        live_session_id: 'session_live_44',
        product_id: 'prod_sku_44',
        sku: 'SKU-GLOW-44',
        price_minor: '100000',
        candidate_discount_minor: '10000',
        cogs_minor: '70000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '4000',
        currency: 'THB',
        scale: 2
      };

      const result = await service.handleEvaluationRequest(request);

      assert.equal(result.status, 'NEEDS_APPROVAL');
      assert.equal(result.margin_bps, 1222);
      assert.equal(result.floor_bps, 1000);
      assert.ok(result.safer_alternatives !== null);

      // Verify outbox subject
      const pendingOutbox = await repository.getPendingOutbox('tenant_rel_01');
      assert.equal(pendingOutbox.length, 1);
      assert.equal(pendingOutbox[0].subject, 'livepilot.v1.margin.verdict.needs_approval');
      assert.equal(pendingOutbox[0].payload.status, 'NEEDS_APPROVAL');
    });
  });

  describe('F03.3-FLOW-005: Safer Discount Alternatives and Bundle Suggestions', () => {
    it('should calculate exact maximum allowable discount guaranteeing floor margin and recommend bundles', () => {
      // Single item discount calculation:
      // Price = 1000.00 THB (100000)
      // COGS = 500.00 THB (50000), Platform Fee = 50.00 (5000), Shipping = 40.00 (4000)
      // Total costs = 59000 minor
      // Floor = 1000 bps (10.00%)
      const calc = AlternativesEngine.calculateMaxAllowableDiscount({
        price_minor: 100000n,
        candidate_discount_minor: 45000n, // Requested 450.00 THB
        cogs_minor: 50000n,
        platform_fee_minor: 5000n,
        shipping_fee_minor: 4000n,
        floor_bps: 1000
      });

      // min_effective_price = ceil(59000 * 10000 / 9000) = ceil(590000 / 9) = 65556 minor
      // max_discount = 100000 - 65556 = 34444 minor
      assert.equal(calc.max_discount_minor, 34444n);
      assert.equal(calc.effective_price_minor, 65556n);
      assert.ok(calc.expected_margin_bps >= 1000);

      // Bundle suggestions: Duo Glow Set (BUNDLE_01)
      const alternatives = AlternativesEngine.generateAlternatives({
        price_minor: 100000n,
        candidate_discount_minor: 45000n,
        cogs_minor: 50000n,
        platform_fee_minor: 5000n,
        shipping_fee_minor: 4000n,
        floor_bps: 1000
      });

      assert.equal(alternatives.safer_discount.max_allowable_discount_minor, '34444');
      assert.ok(alternatives.suggested_bundles.length > 0);
      const duoBundle = alternatives.suggested_bundles.find(b => b.bundle_id === 'BUNDLE_01');
      assert.ok(duoBundle !== undefined);
      assert.equal(duoBundle.bundle_name, 'Duo Glow Set');
      assert.equal(duoBundle.price_minor, '59000');
      assert.equal(duoBundle.expected_margin_bps, 4793);
    });

    it('should return safer alternatives when service evaluates a rejected discount', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      const request = {
        tenant_id: 'tenant_rel_02',
        live_session_id: 'session_live_55',
        product_id: 'prod_sku_55',
        sku: 'SKU-GLOW-55',
        price_minor: '100000',
        candidate_discount_minor: '50000', // 50% discount -> loss making
        cogs_minor: '60000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '5000',
        currency: 'THB',
        scale: 2
      };

      const result = await service.handleEvaluationRequest(request);
      assert.equal(result.status, 'REJECTED');
      assert.ok(result.safer_alternatives !== null);
      assert.ok(result.safer_alternatives.safer_discount !== undefined);
      assert.ok(result.safer_alternatives.suggested_bundles.length >= 1);
    });
  });

  describe('F03.3-FLOW-007: Margin Evidence Preservation', () => {
    it('should preserve immutable evidence hash, policy version, and correlation lineage', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      const request = {
        tenant_id: 'tenant_rel_03',
        live_session_id: 'session_live_66',
        product_id: 'prod_sku_66',
        sku: 'SKU-GLOW-66',
        price_minor: '100000',
        candidate_discount_minor: '10000',
        cogs_minor: '40000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '5000',
        correlation_id: 'trace_evidence_001',
        causation_id: 'cause_evidence_001',
        currency: 'THB',
        scale: 2
      };

      const result = await service.handleEvaluationRequest(request);
      assert.ok(result.evidence);
      assert.equal(result.evidence.flow_id, 'F03.3-FLOW-002');
      assert.equal(result.evidence.correlation_id, 'trace_evidence_001');
      assert.equal(result.evidence.causation_id, 'cause_evidence_001');
      assert.ok(result.evidence.request_hash.length === 64);
      assert.equal(result.evidence.calculated_margin_bps, 4444);
    });
  });

  describe('F03.3-FLOW-008: Stale Economics Re-evaluation on Catalog Update', () => {
    it('should invalidate pending approval and re-evaluate proposal when catalog price or COGS changes', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      // First evaluation results in NEEDS_APPROVAL
      const initialRequest = {
        tenant_id: 'tenant_rel_04',
        live_session_id: 'session_live_77',
        product_id: 'prod_sku_77',
        sku: 'SKU-GLOW-77',
        price_minor: '100000',
        candidate_discount_minor: '10000', // effective 90000
        cogs_minor: '70000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '4000',
        idempotency_key: 'idemp_flow_008_a',
        currency: 'THB',
        scale: 2
      };

      const verdict1 = await service.handleEvaluationRequest(initialRequest);
      assert.equal(verdict1.status, 'NEEDS_APPROVAL');

      // Now catalog updates COGS to 85000 (cost spike), rendering the discount loss-making
      const catalogUpdateEvent = {
        event_id: 'evt_catalog_update_01',
        tenant_id: 'tenant_rel_04',
        product_id: 'prod_sku_77',
        sku: 'SKU-GLOW-77',
        new_price_minor: '100000',
        new_cogs_minor: '85000', // COGS increased
        currency: 'THB',
        scale: 2,
        correlation_id: 'trace_reeval_001'
      };

      const reevalResults = await service.staleEconomicsHandler.handleCatalogProductUpdated(catalogUpdateEvent);
      assert.equal(reevalResults.length, 1);
      assert.equal(reevalResults[0].action, 'RE_EVALUATED');
      assert.equal(reevalResults[0].result.status, 'REJECTED'); // Stale pending discount is now REJECTED
      assert.ok(reevalResults[0].result.net_margin_minor === '-4000');
    });
  });

  describe('Idempotency Caching & Deduplication Guard', () => {
    it('should return cached verdict without emitting duplicate outbox events for duplicate idempotency key', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      const request = {
        tenant_id: 'tenant_rel_05',
        live_session_id: 'session_live_88',
        product_id: 'prod_sku_88',
        sku: 'SKU-GLOW-88',
        price_minor: '100000',
        candidate_discount_minor: '10000',
        cogs_minor: '40000',
        platform_fee_minor: '5000',
        shipping_fee_minor: '5000',
        idempotency_key: 'idemp_dedup_unique_key',
        currency: 'THB',
        scale: 2
      };

      const firstCall = await service.handleEvaluationRequest(request);
      assert.equal(firstCall.is_idempotent_replay, false);

      const pendingFirst = await repository.getPendingOutbox('tenant_rel_05');
      assert.equal(pendingFirst.length, 1);

      // Replay identical idempotency key
      const secondCall = await service.handleEvaluationRequest(request);
      assert.equal(secondCall.is_idempotent_replay, true);
      assert.equal(secondCall.verdict_id, firstCall.verdict_id);

      // Outbox MUST still contain exactly 1 event (zero duplicate outbox emissions)
      const pendingSecond = await repository.getPendingOutbox('tenant_rel_05');
      assert.equal(pendingSecond.length, 1);
    });
  });

  describe('Fatal Error DLQ Routing', () => {
    it('should intercept fatal unhandled error and route to DLQ outbox subject', async () => {
      const repository = new MarginRepository();
      const service = new MarginPolicyService({ repository });

      // Malformed request with non-integer floating point that triggers strict zero-float violation
      const invalidRequest = {
        tenant_id: 'tenant_rel_06',
        live_session_id: 'session_live_99',
        product_id: 'prod_sku_99',
        sku: 'SKU-GLOW-99',
        price_minor: 123.456, // Strict Zero Float violation
        candidate_discount_minor: '1000',
        cogs_minor: '500',
        platform_fee_minor: '10',
        shipping_fee_minor: '10',
        currency: 'THB',
        scale: 2
      };

      const dlqResult = await service.handleEvaluationRequest(invalidRequest);
      assert.equal(dlqResult.status, 'DLQ_ROUTED');
      assert.equal(dlqResult.dlq_subject, DLQ_SUBJECT);
      assert.match(dlqResult.error_message, /Strict Zero-Float Violation/);

      // Verify repository recorded DLQ outbox record
      const dlqOutbox = repository.outbox.filter(o => o.subject === DLQ_SUBJECT);
      assert.equal(dlqOutbox.length, 1);
      assert.equal(dlqOutbox[0].status, 'DEAD_LETTER');
      assert.equal(dlqOutbox[0].payload.dlq_reason, dlqResult.error_message);
    });
  });
});

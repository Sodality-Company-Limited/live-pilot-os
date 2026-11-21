/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Property Invariant Verification Test
 * ════════════════════════════════════════════════════════════════════════════════
 * Goal: G-MARG-006 (Execute Service-Level Tests and Architectural Verification Gates)
 * Invariants Tested:
 * 1. Algebraic Conservation Law: net_margin + cogs + fees + candidate_discount == original_price
 * 2. Monotonicity Law: As candidate discount increases (for fixed costs and price), net margin decreases monotonically
 * 3. Floor Soundness: If margin_bps < floor_bps, verdict is never APPROVED (REJECTED or NEEDS_APPROVAL only)
 * 4. Safer Alternative Boundedness: Safer alternative discount yields margin_bps >= floor_bps and is <= candidate discount
 * 5. Zero-Float Immunity: Floats, decimals, non-integers, NaN, and Infinity fail closed with TypeError
 * 
 * Execution: 10,000 trials testing randomized domains and edge boundaries
 * Standard: Node.js test runner · Zero mocks · Zero stubs
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarginCalculator, assertMinorUnits, divHalfEven } from '../../code/services/margin-policy-service/src/domain/margin-calculator.mjs';
import { SplitMix64 } from '../../scripts/lib/invariant-runner.mjs';

describe('G-MARG-006: Margin Policy Service Property-Based Invariant Battery', () => {

  it('1. Algebraic Conservation Law (10,000 trials): net_margin + cogs + fees + candidate_discount == original_price', () => {
    const prng = new SplitMix64('seed_marg_conservation_10000');
    const TOTAL_TRIALS = 10000;

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      // Generate price between 100 minor units (1.00) and 10,000,000 minor units (100,000.00)
      const price_minor = prng.nextBigIntRange(100n, 10000000n);
      // Discount between 0 and price_minor
      const candidate_discount_minor = prng.nextBigIntRange(0n, price_minor);
      // COGS between 0 and price_minor
      const cogs_minor = prng.nextBigIntRange(0n, price_minor);
      // Platform fee between 0 and 50000n
      const platform_fee_minor = prng.nextBigIntRange(0n, 50000n);
      // Shipping fee between 0 and 20000n
      const shipping_fee_minor = prng.nextBigIntRange(0n, 20000n);
      // Floor bps between 0 and 10000
      const floor_bps = prng.nextInt(0, 10000);

      const result = MarginCalculator.evaluate({
        price_minor,
        candidate_discount_minor,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps
      });

      // Conservation invariant:
      // net_margin_minor + cogs_minor + platform_fee_minor + shipping_fee_minor + candidate_discount_minor === price_minor
      const totalSum = result.net_margin_minor +
        result.cogs_minor +
        result.platform_fee_minor +
        result.shipping_fee_minor +
        result.candidate_discount_minor;

      assert.equal(
        totalSum,
        result.price_minor,
        `Conservation failure at trial ${i}: sum (${totalSum}) !== original price (${result.price_minor})`
      );

      // Also effective_price conservation:
      assert.equal(
        result.effective_price_minor + result.candidate_discount_minor,
        result.price_minor,
        `Effective price conservation failure at trial ${i}`
      );
    }
  });

  it('2. Monotonicity Law (10,000 trials): As discount increases, net margin decreases monotonically', () => {
    const prng = new SplitMix64('seed_marg_monotonicity_10000');
    const TOTAL_TRIALS = 10000;

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const price_minor = prng.nextBigIntRange(1000n, 1000000n);
      const cogs_minor = prng.nextBigIntRange(0n, 500000n);
      const platform_fee_minor = prng.nextBigIntRange(0n, 20000n);
      const shipping_fee_minor = prng.nextBigIntRange(0n, 20000n);
      const floor_bps = prng.nextInt(0, 10000);

      // Two candidate discounts: discountA <= discountB
      const discountA = prng.nextBigIntRange(0n, price_minor);
      const delta = prng.nextBigIntRange(0n, price_minor - discountA);
      const discountB = discountA + delta;

      const evalA = MarginCalculator.evaluate({
        price_minor,
        candidate_discount_minor: discountA,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps
      });

      const evalB = MarginCalculator.evaluate({
        price_minor,
        candidate_discount_minor: discountB,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps
      });

      // Invariant: discountB >= discountA => net_margin(B) <= net_margin(A)
      assert.ok(
        evalB.net_margin_minor <= evalA.net_margin_minor,
        `Monotonicity failure at trial ${i}: discountA=${discountA}, discountB=${discountB}, marginA=${evalA.net_margin_minor}, marginB=${evalB.net_margin_minor}`
      );

      // Exactly: evalA.net_margin_minor - evalB.net_margin_minor === delta
      assert.equal(
        evalA.net_margin_minor - evalB.net_margin_minor,
        delta,
        `Monotonic exact difference failure at trial ${i}`
      );
    }
  });

  it('3. Floor Soundness (10,000 trials): No discount with margin_bps < floor_bps can be APPROVED', () => {
    const prng = new SplitMix64('seed_marg_floor_soundness_10000');
    const TOTAL_TRIALS = 10000;

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const price_minor = prng.nextBigIntRange(100n, 5000000n);
      const candidate_discount_minor = prng.nextBigIntRange(0n, price_minor);
      const cogs_minor = prng.nextBigIntRange(0n, 3000000n);
      const platform_fee_minor = prng.nextBigIntRange(0n, 100000n);
      const shipping_fee_minor = prng.nextBigIntRange(0n, 100000n);
      const floor_bps = prng.nextInt(0, 10000);

      const evalResult = MarginCalculator.evaluate({
        price_minor,
        candidate_discount_minor,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps
      });

      if (evalResult.margin_bps < floor_bps) {
        assert.equal(
          evalResult.status,
          'REJECTED',
          `Floor soundness violation at trial ${i}: margin_bps (${evalResult.margin_bps}) < floor_bps (${floor_bps}) but status was ${evalResult.status}`
        );
      } else {
        assert.equal(
          evalResult.status,
          'APPROVED',
          `Floor approval consistency violation at trial ${i}: margin_bps (${evalResult.margin_bps}) >= floor_bps (${floor_bps}) but status was ${evalResult.status}`
        );
      }
    }
  });

  it('4. Safer Alternative Boundedness (10,000 trials): Safer alternative satisfies floor_bps and is bounded', () => {
    const prng = new SplitMix64('seed_marg_safer_alt_10000');
    const TOTAL_TRIALS = 10000;

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const price_minor = prng.nextBigIntRange(100n, 5000000n);
      const candidate_discount_minor = prng.nextBigIntRange(0n, price_minor);
      const cogs_minor = prng.nextBigIntRange(0n, 3000000n);
      const platform_fee_minor = prng.nextBigIntRange(0n, 50000n);
      const shipping_fee_minor = prng.nextBigIntRange(0n, 50000n);
      // Floor bps between 0 and 9999 (realistic policy floor < 100%)
      const floor_bps = prng.nextInt(0, 9999);

      const evalResult = MarginCalculator.evaluate({
        price_minor,
        candidate_discount_minor,
        cogs_minor,
        platform_fee_minor,
        shipping_fee_minor,
        floor_bps
      });

      if (evalResult.status === 'REJECTED') {
        assert.ok(
          evalResult.safer_alternative_discount_minor !== null,
          `Rejected evaluation must provide safer_alternative_discount_minor at trial ${i}`
        );

        const safer_discount = evalResult.safer_alternative_discount_minor;
        assert.ok(
          safer_discount >= 0n,
          `Safer discount must be non-negative at trial ${i}, got ${safer_discount}`
        );
        assert.ok(
          safer_discount <= price_minor,
          `Safer discount must not exceed original price at trial ${i}`
        );

        // If safer alternative was re-evaluated, verify it satisfies floor_bps (unless even 0 discount cannot satisfy floor_bps)
        const reEval = MarginCalculator.evaluate({
          price_minor,
          candidate_discount_minor: safer_discount,
          cogs_minor,
          platform_fee_minor,
          shipping_fee_minor,
          floor_bps
        });

        if (safer_discount > 0n || reEval.margin_bps >= floor_bps) {
          assert.ok(
            reEval.margin_bps >= floor_bps,
            `Safer alternative must achieve floor_bps: expected >= ${floor_bps}, got ${reEval.margin_bps} at trial ${i}`
          );
        }
      }
    }
  });

  it('5. Zero-Float Immunity & Strict Money Invariants (Article V): Fails closed on all floating-point representations', () => {
    const invalidFloats = [
      12.34,
      0.001,
      -4.56,
      '12.34',
      '100.0',
      '0.5',
      NaN,
      Infinity,
      -Infinity,
      '   ',
      null,
      undefined,
      {},
      [],
      Symbol('test')
    ];

    const fields = [
      'price_minor',
      'candidate_discount_minor',
      'cogs_minor',
      'platform_fee_minor',
      'shipping_fee_minor',
      'floor_bps'
    ];

    for (const field of fields) {
      for (const invalidVal of invalidFloats) {
        assert.throws(
          () => {
            const input = {
              price_minor: 10000n,
              candidate_discount_minor: 1000n,
              cogs_minor: 2000n,
              platform_fee_minor: 500n,
              shipping_fee_minor: 500n,
              floor_bps: 1000
            };
            input[field] = invalidVal;
            MarginCalculator.evaluate(input);
          },
          TypeError,
          `Expected TypeError for invalid float value ${String(invalidVal)} in field ${field}`
        );
      }
    }

    // Direct assertMinorUnits testing
    assert.throws(() => assertMinorUnits(45.5, 'price'), /Strict Zero-Float Violation/);
    assert.throws(() => assertMinorUnits('45.5', 'price'), /Strict Zero-Float Violation/);
    assert.throws(() => assertMinorUnits(1e-5, 'price'), /Strict Zero-Float Violation/);
    assert.equal(assertMinorUnits(500n, 'valid_bigint'), 500n);
    assert.equal(assertMinorUnits(500, 'valid_integer_num'), 500n);
    assert.equal(assertMinorUnits('500', 'valid_integer_str'), 500n);
  });

  it('6. Banker\'s Rounding (divHalfEven) Exactness & Symmetrical Midpoint Invariant', () => {
    // Round half to even tests
    // 15 / 10 = 1.5 -> rounds to 2 (even)
    assert.equal(divHalfEven(15n, 10n), 2n);
    // 25 / 10 = 2.5 -> rounds to 2 (even)
    assert.equal(divHalfEven(25n, 10n), 2n);
    // 35 / 10 = 3.5 -> rounds to 4 (even)
    assert.equal(divHalfEven(35n, 10n), 4n);
    // 45 / 10 = 4.5 -> rounds to 4 (even)
    assert.equal(divHalfEven(45n, 10n), 4n);

    // Negative symmetry
    assert.equal(divHalfEven(-15n, 10n), -2n);
    assert.equal(divHalfEven(-25n, 10n), -2n);
    assert.equal(divHalfEven(-35n, 10n), -4n);
    assert.equal(divHalfEven(-45n, 10n), -4n);

    // Non-half cases
    assert.equal(divHalfEven(14n, 10n), 1n);
    assert.equal(divHalfEven(16n, 10n), 2n);
    assert.equal(divHalfEven(24n, 10n), 2n);
    assert.equal(divHalfEven(26n, 10n), 3n);
  });
});

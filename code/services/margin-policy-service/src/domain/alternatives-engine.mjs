/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Safer Alternatives Engine
 * ════════════════════════════════════════════════════════════════════════════════
 * Invariants:
 * - Exact integer minor-unit math · Zero float tolerance · Banker's Rounding
 * - Calculates maximum allowable discount that guarantees margin_bps >= floor_bps
 *   Formula:
 *     effective_price = price - discount
 *     net_margin = effective_price - total_costs
 *     margin_bps = round_half_even(net_margin * 10000n / effective_price)
 *     To satisfy margin_bps >= floor_bps:
 *       effective_price * (10000n - floor_bps) >= total_costs * 10000n
 *       min_effective_price = ceil(total_costs * 10000n / (10000n - floor_bps))
 *       max_discount = price - min_effective_price (capped at original discount and >= 0)
 * - Bundle Alternatives:
 *   Proposes verified safer bundles (e.g., Duo Glow Set) when single-item discounts fail.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { assertMinorUnits, divHalfEven } from './margin-calculator.mjs';

/**
 * Standard known bundle catalog for alternative recommendations
 */
export const VERIFIED_BUNDLES = [
  {
    bundle_id: 'BUNDLE_01',
    bundle_name: 'Duo Glow Set',
    sku: 'BUNDLE-DUO-GLOW',
    price_minor: 59000n, // THB 590.00
    candidate_discount_minor: 0n,
    cogs_minor: 26000n, // THB 260.00
    platform_fee_minor: 4720n, // 8% = THB 47.20
    shipping_fee_minor: 0n,
    currency: 'THB',
    scale: 2,
    expected_margin_bps: 4793 // 47.93%
  }
];

export class AlternativesEngine {
  /**
   * Calculates maximum allowable discount minor units to achieve at least floor_bps.
   *
   * @param {Object} input
   * @param {bigint|number|string} input.price_minor
   * @param {bigint|number|string} input.cogs_minor
   * @param {bigint|number|string} input.platform_fee_minor
   * @param {bigint|number|string} input.shipping_fee_minor
   * @param {bigint|number|string} input.floor_bps
   * @param {bigint|number|string} [input.candidate_discount_minor]
   * @returns {{ max_discount_minor: bigint, effective_price_minor: bigint, expected_margin_bps: number }}
   */
  static calculateMaxAllowableDiscount(input) {
    const price_minor = assertMinorUnits(input.price_minor, 'price_minor');
    const cogs_minor = assertMinorUnits(input.cogs_minor, 'cogs_minor');
    const platform_fee_minor = assertMinorUnits(input.platform_fee_minor, 'platform_fee_minor');
    const shipping_fee_minor = assertMinorUnits(input.shipping_fee_minor, 'shipping_fee_minor');
    const floor_bps = assertMinorUnits(input.floor_bps, 'floor_bps');

    const total_costs_minor = cogs_minor + platform_fee_minor + shipping_fee_minor;
    const margin_multiplier = 10000n - floor_bps;

    if (margin_multiplier <= 0n) {
      return {
        max_discount_minor: 0n,
        effective_price_minor: price_minor,
        expected_margin_bps: 0
      };
    }

    const numerator = total_costs_minor * 10000n;
    const div = numerator / margin_multiplier;
    const rem = numerator % margin_multiplier;
    const min_effective_price = rem === 0n ? div : div + 1n;

    if (price_minor < min_effective_price) {
      return {
        max_discount_minor: 0n,
        effective_price_minor: price_minor,
        expected_margin_bps: price_minor > 0n ? Number(divHalfEven((price_minor - total_costs_minor) * 10000n, price_minor)) : 0
      };
    }

    let max_discount_minor = price_minor - min_effective_price;
    if (input.candidate_discount_minor !== undefined && input.candidate_discount_minor !== null) {
      const candidate_minor = assertMinorUnits(input.candidate_discount_minor, 'candidate_discount_minor');
      if (max_discount_minor > candidate_minor) {
        max_discount_minor = candidate_minor;
      }
    }

    const effective_price_minor = price_minor - max_discount_minor;
    const net_margin_minor = effective_price_minor - total_costs_minor;
    const expected_margin_bps = effective_price_minor > 0n
      ? Number(divHalfEven(net_margin_minor * 10000n, effective_price_minor))
      : 0;

    return {
      max_discount_minor,
      effective_price_minor,
      expected_margin_bps
    };
  }

  /**
   * Generates alternative suggestions (both safer discount alternative and bundle suggestions).
   *
   * @param {Object} input
   * @param {bigint|number|string} input.price_minor
   * @param {bigint|number|string} input.candidate_discount_minor
   * @param {bigint|number|string} input.cogs_minor
   * @param {bigint|number|string} input.platform_fee_minor
   * @param {bigint|number|string} input.shipping_fee_minor
   * @param {bigint|number|string} input.floor_bps
   * @param {string} [input.currency='THB']
   * @param {number} [input.scale=2]
   * @param {Array<Object>} [availableBundles]
   * @returns {Object}
   */
  static generateAlternatives(input, availableBundles = VERIFIED_BUNDLES) {
    const floor_bps = assertMinorUnits(input.floor_bps, 'floor_bps');
    const saferDiscount = this.calculateMaxAllowableDiscount(input);

    // Filter bundles that satisfy floor_bps
    const suggestedBundles = availableBundles.filter(b => {
      const net_margin = b.price_minor - b.candidate_discount_minor - b.cogs_minor - b.platform_fee_minor - b.shipping_fee_minor;
      const effective_price = b.price_minor - b.candidate_discount_minor;
      if (effective_price <= 0n) return false;
      const bps = Number(divHalfEven(net_margin * 10000n, effective_price));
      return bps >= Number(floor_bps);
    }).map(b => ({
      bundle_id: b.bundle_id,
      bundle_name: b.bundle_name,
      sku: b.sku,
      price_minor: b.price_minor.toString(),
      currency: b.currency,
      scale: b.scale,
      expected_margin_bps: b.expected_margin_bps
    }));

    return {
      safer_discount: {
        max_allowable_discount_minor: saferDiscount.max_discount_minor.toString(),
        effective_price_minor: saferDiscount.effective_price_minor.toString(),
        expected_margin_bps: saferDiscount.expected_margin_bps
      },
      suggested_bundles: suggestedBundles
    };
  }
}

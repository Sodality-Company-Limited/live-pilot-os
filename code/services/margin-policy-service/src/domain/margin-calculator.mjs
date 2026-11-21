/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Core Margin Calculator Domain
 * ════════════════════════════════════════════════════════════════════════════════
 * Standard: Exact integer minor-unit math · Zero float tolerance · Banker's Rounding
 * Invariants:
 *   - effective_price = price_minor - candidate_discount_minor
 *   - net_margin_minor = effective_price - cogs_minor - platform_fee_minor - shipping_fee_minor
 *   - margin_bps = Banker's rounded (net_margin_minor * 10000n) / effective_price
 *   - verdict: APPROVED if margin_bps >= floor_bps, else REJECTED
 * ════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Asserts that the value is an integer BigInt or integer string/number, and strictly rejects floats.
 * @param {unknown} val
 * @param {string} fieldName
 * @returns {bigint}
 */
export function assertMinorUnits(val, fieldName) {
  if (val === null || val === undefined) {
    throw new TypeError(`Field '${fieldName}' is required and cannot be null or undefined.`);
  }

  if (typeof val === 'number') {
    if (!Number.isFinite(val) || !Number.isInteger(val)) {
      throw new TypeError(`Strict Zero-Float Violation: Field '${fieldName}' must be an exact integer, got floating point or non-finite number ${val}.`);
    }
    return BigInt(val);
  }

  if (typeof val === 'string') {
    if (val.trim() === '' || val.includes('.')) {
      throw new TypeError(`Strict Zero-Float Violation: Field '${fieldName}' string representation '${val}' contains a decimal point or is empty.`);
    }
    try {
      return BigInt(val.trim());
    } catch {
      throw new TypeError(`Field '${fieldName}' cannot be parsed as an integer BigInt: '${val}'.`);
    }
  }

  if (typeof val === 'bigint') {
    return val;
  }

  throw new TypeError(`Field '${fieldName}' has invalid type '${typeof val}'. Expected BigInt, integer number, or integer string.`);
}

/**
 * Banker's Rounding (Round Half to Even) division for BigInts:
 * Computes round_half_even(numerator / denominator)
 * @param {bigint} num
 * @param {bigint} den
 * @returns {bigint}
 */
export function divHalfEven(num, den) {
  if (den === 0n) {
    throw new RangeError('Division by zero in divHalfEven.');
  }

  const isNeg = (num < 0n) !== (den < 0n);
  const a = num < 0n ? -num : num;
  const b = den < 0n ? -den : den;

  const quotient = a / b;
  const remainder = a % b;
  const doubleRemainder = remainder * 2n;

  let rounded = quotient;
  if (doubleRemainder > b) {
    rounded = quotient + 1n;
  } else if (doubleRemainder === b) {
    // Exactly halfway: round to nearest even number
    if (quotient % 2n !== 0n) {
      rounded = quotient + 1n;
    }
  }

  return isNeg ? -rounded : rounded;
}

/**
 * @typedef {Object} MarginInput
 * @property {bigint|number|string} price_minor
 * @property {bigint|number|string} candidate_discount_minor
 * @property {bigint|number|string} cogs_minor
 * @property {bigint|number|string} platform_fee_minor
 * @property {bigint|number|string} shipping_fee_minor
 * @property {number|bigint|string} floor_bps - Basis points floor (e.g. 1000 = 10.00%)
 * @property {string} [currency='THB']
 * @property {number} [scale=2]
 */

/**
 * @typedef {Object} MarginEvaluationResult
 * @property {bigint} price_minor
 * @property {bigint} candidate_discount_minor
 * @property {bigint} effective_price_minor
 * @property {bigint} cogs_minor
 * @property {bigint} platform_fee_minor
 * @property {bigint} shipping_fee_minor
 * @property {bigint} net_margin_minor
 * @property {number} margin_bps
 * @property {number} floor_bps
 * @property {'APPROVED'|'REJECTED'} status
 * @property {string} currency
 * @property {number} scale
 * @property {bigint|null} safer_alternative_discount_minor
 * @property {number|null} safer_alternative_margin_bps
 */

export class MarginCalculator {
  /**
   * Evaluates margin against floor policy.
   * @param {MarginInput} input
   * @returns {MarginEvaluationResult}
   */
  static evaluate(input) {
    if (!input || typeof input !== 'object') {
      throw new TypeError('MarginCalculator input must be an object.');
    }

    const price_minor = assertMinorUnits(input.price_minor, 'price_minor');
    const candidate_discount_minor = assertMinorUnits(input.candidate_discount_minor, 'candidate_discount_minor');
    const cogs_minor = assertMinorUnits(input.cogs_minor, 'cogs_minor');
    const platform_fee_minor = assertMinorUnits(input.platform_fee_minor, 'platform_fee_minor');
    const shipping_fee_minor = assertMinorUnits(input.shipping_fee_minor, 'shipping_fee_minor');
    const floor_bps_bigint = assertMinorUnits(input.floor_bps, 'floor_bps');

    if (price_minor < 0n) throw new RangeError('price_minor cannot be negative.');
    if (candidate_discount_minor < 0n) throw new RangeError('candidate_discount_minor cannot be negative.');
    if (cogs_minor < 0n) throw new RangeError('cogs_minor cannot be negative.');
    if (platform_fee_minor < 0n) throw new RangeError('platform_fee_minor cannot be negative.');
    if (shipping_fee_minor < 0n) throw new RangeError('shipping_fee_minor cannot be negative.');
    if (floor_bps_bigint < 0n || floor_bps_bigint > 10000n) {
      throw new RangeError('floor_bps must be between 0 and 10000 (0% - 100%).');
    }

    const floor_bps = Number(floor_bps_bigint);
    const effective_price_minor = price_minor - candidate_discount_minor;
    if (effective_price_minor < 0n) {
      throw new RangeError('candidate_discount_minor cannot exceed price_minor.');
    }

    const net_margin_minor = effective_price_minor - cogs_minor - platform_fee_minor - shipping_fee_minor;

    let margin_bps = 0;
    if (effective_price_minor > 0n) {
      const bpsBig = divHalfEven(net_margin_minor * 10000n, effective_price_minor);
      margin_bps = Number(bpsBig);
    } else {
      // Effective price is 0: if net_margin_minor is negative, bps is extreme negative, else 0
      margin_bps = net_margin_minor < 0n ? -10000 : 0;
    }

    const isApproved = margin_bps >= floor_bps;
    const status = isApproved ? 'APPROVED' : 'REJECTED';

    let safer_alternative_discount_minor = null;
    let safer_alternative_margin_bps = null;

    if (!isApproved) {
      // Calculate max allowed discount that satisfies floor_bps:
      // (effective_price - cogs - platform_fee - shipping) / effective_price >= floor_bps / 10000
      // effective_price * (1 - floor_bps / 10000) >= total_costs
      // effective_price * (10000 - floor_bps) >= total_costs * 10000
      const total_costs_minor = cogs_minor + platform_fee_minor + shipping_fee_minor;
      const margin_multiplier = 10000n - floor_bps_bigint;

      if (margin_multiplier > 0n) {
        // min_effective_price = ceil(total_costs * 10000 / margin_multiplier)
        const numerator = total_costs_minor * 10000n;
        const div = numerator / margin_multiplier;
        const rem = numerator % margin_multiplier;
        const min_effective_price = rem === 0n ? div : div + 1n;

        if (price_minor >= min_effective_price) {
          const max_discount = price_minor - min_effective_price;
          safer_alternative_discount_minor = max_discount >= 0n ? max_discount : 0n;
          const alt_effective = price_minor - safer_alternative_discount_minor;
          const alt_net = alt_effective - total_costs_minor;
          safer_alternative_margin_bps = alt_effective > 0n ? Number(divHalfEven(alt_net * 10000n, alt_effective)) : 0;
        } else {
          safer_alternative_discount_minor = 0n;
          safer_alternative_margin_bps = 0;
        }
      }
    }

    return {
      price_minor,
      candidate_discount_minor,
      effective_price_minor,
      cogs_minor,
      platform_fee_minor,
      shipping_fee_minor,
      net_margin_minor,
      margin_bps,
      floor_bps,
      status,
      currency: input.currency || 'THB',
      scale: input.scale !== undefined ? Number(input.scale) : 2,
      safer_alternative_discount_minor,
      safer_alternative_margin_bps
    };
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MULTI-CURRENCY MONEY & MONETARY ARITHMETIC ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Invariant: Multi-Currency ISO 4217 Minor-Unit Exact Integer Arithmetic
 * Standard: ZERO Float Math · Half-Even Banker's Rounding · Fowler's Money Pattern
 *
 * Underlying Principles:
 *   1. Composite Value Object: Money = <amount_minor: BigInt, currency: ISO_4217, scale: u8>
 *   2. ISO 4217 Dynamic Decimal Exponent Scaling:
 *      - 0-decimal: JPY, KRW, VND, CLP, UGX (1 unit = 1 minor unit, e=0)
 *      - 2-decimal: USD, EUR, GBP, THB, SGD (1 unit = 100 minor units, e=2)
 *      - 3-decimal: BHD, KWD, OMR, JOD, TND (1 unit = 1000 minor units, e=3)
 *      - 4-decimal: CLF (1 unit = 10000 minor units, e=4)
 *   3. Strict Zero-Float Math: All internal states, allocations, and sums use BigInt.
 *   4. Currency Isolation Barrier: Cross-currency algebra requires explicit FxRate.
 *   5. Fowler's Remainder-Preserving Allocation: Sum of allocations equals original amount.
 *   6. Deterministic Banker's Rounding (Half-Even): Unbiased FX & multi-ratio math.
 * ════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Standard ISO 4217 Currency Registry.
 */
export const ISO_4217_CURRENCIES = {
  // 0-Decimal Currencies (e = 0)
  JPY: { code: 'JPY', numeric: '392', exponent: 0, name: 'Japanese Yen', symbol: '¥' },
  KRW: { code: 'KRW', numeric: '410', exponent: 0, name: 'South Korean Won', symbol: '₩' },
  VND: { code: 'VND', numeric: '704', exponent: 0, name: 'Vietnamese Dong', symbol: '₫' },
  CLP: { code: 'CLP', numeric: '152', exponent: 0, name: 'Chilean Peso', symbol: '$' },
  UGX: { code: 'UGX', numeric: '800', exponent: 0, name: 'Ugandan Shilling', symbol: 'USh' },
  PYG: { code: 'PYG', numeric: '600', exponent: 0, name: 'Paraguayan Guaraní', symbol: '₲' },

  // 2-Decimal Currencies (e = 2)
  THB: { code: 'THB', numeric: '764', exponent: 2, name: 'Thai Baht', symbol: '฿' },
  USD: { code: 'USD', numeric: '840', exponent: 2, name: 'US Dollar', symbol: '$' },
  EUR: { code: 'EUR', numeric: '978', exponent: 2, name: 'Euro', symbol: '€' },
  GBP: { code: 'GBP', numeric: '826', exponent: 2, name: 'Pound Sterling', symbol: '£' },
  SGD: { code: 'SGD', numeric: '702', exponent: 2, name: 'Singapore Dollar', symbol: 'S$' },
  AUD: { code: 'AUD', numeric: '036', exponent: 2, name: 'Australian Dollar', symbol: 'A$' },
  CAD: { code: 'CAD', numeric: '124', exponent: 2, name: 'Canadian Dollar', symbol: 'C$' },
  CHF: { code: 'CHF', numeric: '756', exponent: 2, name: 'Swiss Franc', symbol: 'CHF' },
  CNY: { code: 'CNY', numeric: '156', exponent: 2, name: 'Chinese Yuan', symbol: '¥' },
  HKD: { code: 'HKD', numeric: '344', exponent: 2, name: 'Hong Kong Dollar', symbol: 'HK$' },
  NZD: { code: 'NZD', numeric: '554', exponent: 2, name: 'New Zealand Dollar', symbol: 'NZ$' },
  MYR: { code: 'MYR', numeric: '458', exponent: 2, name: 'Malaysian Ringgit', symbol: 'RM' },
  IDR: { code: 'IDR', numeric: '360', exponent: 2, name: 'Indonesian Rupiah', symbol: 'Rp' },
  PHP: { code: 'PHP', numeric: '608', exponent: 2, name: 'Philippine Peso', symbol: '₱' },
  INR: { code: 'INR', numeric: '356', exponent: 2, name: 'Indian Rupee', symbol: '₹' },

  // 3-Decimal Currencies (e = 3)
  BHD: { code: 'BHD', numeric: '048', exponent: 3, name: 'Bahraini Dinar', symbol: 'BD' },
  KWD: { code: 'KWD', numeric: '414', exponent: 3, name: 'Kuwaiti Dinar', symbol: 'KD' },
  OMR: { code: 'OMR', numeric: '512', exponent: 3, name: 'Omani Rial', symbol: 'OMR' },
  JOD: { code: 'JOD', numeric: '400', exponent: 3, name: 'Jordanian Dinar', symbol: 'JD' },
  TND: { code: 'TND', numeric: '788', exponent: 3, name: 'Tunisian Dinar', symbol: 'DT' },

  // 4-Decimal Currencies (e = 4)
  CLF: { code: 'CLF', numeric: '990', exponent: 4, name: 'Unidad de Fomento', symbol: 'UF' }
};

/**
 * Currency Registry for dynamic extensibility (e.g. crypto, tokens, loyalty points).
 */
const dynamicCurrencyRegistry = new Map(Object.entries(ISO_4217_CURRENCIES));

/**
 * Register a custom currency or asset definition.
 */
export function registerCurrency(currencyDef) {
  if (!currencyDef || typeof currencyDef.code !== 'string') {
    throw new InvalidMoneyError('Currency definition must include string code');
  }
  const code = currencyDef.code.toUpperCase();
  const exponent = Number(currencyDef.exponent);
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 18) {
    throw new InvalidMoneyError(`Invalid currency exponent: ${currencyDef.exponent}. Must be integer between 0 and 18.`);
  }
  const normalized = {
    code,
    numeric: currencyDef.numeric ? String(currencyDef.numeric) : '000',
    exponent,
    name: currencyDef.name || code,
    symbol: currencyDef.symbol || code
  };
  dynamicCurrencyRegistry.set(code, normalized);
  return normalized;
}

/**
 * Lookup a currency definition by code.
 */
export function getCurrency(currencyCode) {
  if (typeof currencyCode !== 'string') {
    throw new InvalidMoneyError(`Currency code must be a string, got ${typeof currencyCode}`);
  }
  const code = currencyCode.toUpperCase();
  const cur = dynamicCurrencyRegistry.get(code);
  if (!cur) {
    throw new InvalidMoneyError(`Unsupported ISO 4217 currency code: '${currencyCode}'. Register it via registerCurrency().`);
  }
  return cur;
}

/**
 * Custom Error Taxonomies
 */
export class CurrencyMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidMoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

export class FxRateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FxRateError';
  }
}

export class LedgerImbalanceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'LedgerImbalanceError';
    this.details = details;
  }
}

/**
 * Deterministic Banker's Rounding (Half-Even) on BigInt rational division.
 * Computes round_half_even(numerator / denominator).
 *
 * Underlying Algorithm:
 *   q = floor(n / d)
 *   r = |n % d|
 *   d_abs = |d|
 *   2 * r < d_abs  => round towards zero
 *   2 * r > d_abs  => round away from zero
 *   2 * r == d_abs => round to nearest EVEN quotient
 */
export function roundHalfEven(numerator, denominator) {
  const n = BigInt(numerator);
  const d = BigInt(denominator);

  if (d === 0n) {
    throw new InvalidMoneyError('Division by zero in rational rounding');
  }

  const isNegative = (n < 0n) !== (d < 0n);
  const absN = n < 0n ? -n : n;
  const absD = d < 0n ? -d : d;

  let q = absN / absD;
  const r = absN % absD;

  if (r !== 0n) {
    const twoR = r * 2n;
    if (twoR > absD) {
      q += 1n;
    } else if (twoR === absD) {
      // Tie-break: round to even integer
      if (q % 2n !== 0n) {
        q += 1n;
      }
    }
  }

  return isNegative ? -q : q;
}

/**
 * Immutable Multi-Currency Money Value Object.
 */
export class Money {
  /**
   * @param {bigint|string|number} amountMinor - Amount in atomic integer minor units (e.g. Cents, Pence, Yen, Fils, Minor Units).
   * @param {string} currencyCode - ISO 4217 Currency Code.
   */
  constructor(amountMinor, currencyCode) {
    const cur = getCurrency(currencyCode);
    
    // Strict Zero-Float Check: Never allow IEEE 754 floating point numbers
    if (typeof amountMinor === 'number') {
      if (!Number.isInteger(amountMinor) || !Number.isSafeInteger(amountMinor)) {
        throw new InvalidMoneyError(
          `Float value ${amountMinor} prohibited for monetary amount. Use BigInt, integer string, or Money.fromMajor().`
        );
      }
    }

    try {
      this.amount = BigInt(amountMinor);
    } catch (err) {
      throw new InvalidMoneyError(`Cannot convert monetary amount '${amountMinor}' to BigInt minor units: ${err.message}`);
    }

    this.currency = cur.code;
    this.scale = cur.exponent;
    Object.freeze(this);
  }

  /**
   * Factory: Construct from minor units.
   */
  static fromMinor(amountMinor, currencyCode) {
    return new Money(amountMinor, currencyCode);
  }

  /**
   * Factory: Construct zero value for given currency.
   */
  static zero(currencyCode) {
    return new Money(0n, currencyCode);
  }

  /**
   * Factory: Parse decimal major string without converting to IEEE 754 floats.
   * e.g., "1250.50" with THB (scale 2) -> 125050n
   *       "150" with JPY (scale 0) -> 150n
   *       "1.250" with BHD (scale 3) -> 1250n
   */
  static fromMajor(majorStringOrInt, currencyCode) {
    const cur = getCurrency(currencyCode);
    const str = String(majorStringOrInt).trim();

    if (!/^-?\d+(\.\d+)?$/.test(str)) {
      throw new InvalidMoneyError(`Invalid major currency format: '${majorStringOrInt}'`);
    }

    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    const wholePart = parts[0] || '0';
    let fracPart = parts[1] || '';

    // If fractional digits exceed currency scale, use deterministic Half-Even rounding
    if (fracPart.length > cur.exponent) {
      const retainedFrac = fracPart.slice(0, cur.exponent);
      const droppedFrac = fracPart.slice(cur.exponent);
      const baseMinor = BigInt(wholePart + retainedFrac);
      const droppedNumerator = BigInt(droppedFrac);
      const droppedDenominator = 10n ** BigInt(droppedFrac.length);
      const roundedAdjustment = roundHalfEven(droppedNumerator, droppedDenominator);
      let adjusted = baseMinor + roundedAdjustment;
      if (isNegative) adjusted = -adjusted;
      return new Money(adjusted, cur.code);
    }

    // Pad fractional digits to scale
    while (fracPart.length < cur.exponent) {
      fracPart += '0';
    }

    const combinedStr = wholePart + fracPart;
    let minor = BigInt(combinedStr);
    if (isNegative) minor = -minor;

    return new Money(minor, cur.code);
  }

  /**
   * Addition of two Money instances. Enforces same currency.
   */
  add(other) {
    this.#assertSameCurrency(other, 'add');
    return new Money(this.amount + other.amount, this.currency);
  }

  /**
   * Subtraction of two Money instances. Enforces same currency.
   */
  sub(other) {
    this.#assertSameCurrency(other, 'sub');
    return new Money(this.amount - other.amount, this.currency);
  }

  /**
   * Scalar multiplication by an integer factor.
   */
  multiplyInteger(factor) {
    if (typeof factor === 'number') {
      if (!Number.isInteger(factor) || !Number.isSafeInteger(factor)) {
        throw new InvalidMoneyError(`Scalar multiplication requires integer factor, got float ${factor}`);
      }
    }
    return new Money(this.amount * BigInt(factor), this.currency);
  }

  /**
   * Fowler's Remainder-Preserving Allocation Algorithm.
   * Splits Money across an array of integer ratios without losing a single minor unit.
   * Invariant: sum(allocated) === original.amount
   *
   * @param {number[]|bigint[]} ratios - List of positive integer weight ratios.
   * @returns {Money[]} Array of allocated Money instances.
   */
  allocate(ratios) {
    if (!Array.isArray(ratios) || ratios.length === 0) {
      throw new InvalidMoneyError('allocate() requires non-empty array of integer ratios');
    }

    const bigRatios = ratios.map((r, idx) => {
      const b = BigInt(r);
      if (b < 0n) {
        throw new InvalidMoneyError(`Ratio at index ${idx} must be non-negative, got ${r}`);
      }
      return b;
    });

    const totalWeight = bigRatios.reduce((acc, r) => acc + r, 0n);
    if (totalWeight === 0n) {
      throw new InvalidMoneyError('Sum of allocation ratios must be strictly positive');
    }

    const isNegative = this.amount < 0n;
    const absAmount = isNegative ? -this.amount : this.amount;

    let remainder = absAmount;
    const results = [];

    // First pass: assign base floor shares
    for (let i = 0; i < bigRatios.length; i++) {
      const share = (absAmount * bigRatios[i]) / totalWeight;
      results.push(share);
      remainder -= share;
    }

    // Second pass: distribute remaining minor units (remainder pennies) one by one
    let idx = 0;
    while (remainder > 0n) {
      results[idx] += 1n;
      remainder -= 1n;
      idx = (idx + 1) % results.length;
    }

    return results.map(val => new Money(isNegative ? -val : val, this.currency));
  }

  /**
   * Checks equality with another Money instance.
   */
  equals(other) {
    if (!(other instanceof Money)) return false;
    return this.currency === other.currency && this.amount === other.amount;
  }

  /**
   * Compares with another Money instance.
   */
  compare(other) {
    this.#assertSameCurrency(other, 'compare');
    if (this.amount < other.amount) return -1;
    if (this.amount > other.amount) return 1;
    return 0;
  }

  isZero() {
    return this.amount === 0n;
  }

  isPositive() {
    return this.amount > 0n;
  }

  isNegative() {
    return this.amount < 0n;
  }

  abs() {
    return new Money(this.amount < 0n ? -this.amount : this.amount, this.currency);
  }

  negate() {
    return new Money(-this.amount, this.currency);
  }

  /**
   * Returns exact decimal string in major units without floating point conversion.
   */
  toMajorString() {
    if (this.scale === 0) {
      return this.amount.toString();
    }

    const isNeg = this.amount < 0n;
    const absVal = isNeg ? -this.amount : this.amount;
    const divisor = 10n ** BigInt(this.scale);
    const whole = absVal / divisor;
    const frac = absVal % divisor;

    let fracStr = frac.toString().padStart(this.scale, '0');
    return `${isNeg ? '-' : ''}${whole}.${fracStr}`;
  }

  /**
   * Human-readable string representation with currency symbol / code.
   */
  toString() {
    const cur = getCurrency(this.currency);
    return `${this.toMajorString()} ${cur.code}`;
  }

  /**
   * JSON serialization contract.
   */
  toJSON() {
    return {
      amount_minor: this.amount.toString(),
      currency: this.currency,
      scale: this.scale,
      formatted: this.toMajorString()
    };
  }

  /**
   * Deserialization from JSON contract.
   */
  static fromJSON(json) {
    if (!json || typeof json.amount_minor !== 'string' || typeof json.currency !== 'string') {
      throw new InvalidMoneyError('Invalid Money JSON contract');
    }
    return new Money(BigInt(json.amount_minor), json.currency);
  }

  #assertSameCurrency(other, operation) {
    if (!(other instanceof Money)) {
      throw new InvalidMoneyError(`Expected Money instance for ${operation}, got ${typeof other}`);
    }
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(
        `Cross-currency arithmetic forbidden: cannot ${operation} ${this.currency} and ${other.currency}. Execute explicit FxRate conversion first.`
      );
    }
  }
}

/**
 * Foreign Exchange (FX) Rate Value Object.
 * Represents: 1 BaseCurrency = (rateNumerator / rateDenominator) QuoteCurrency.
 */
export class FxRate {
  constructor(baseCurrency, quoteCurrency, rateNumerator, rateDenominator, meta = {}) {
    const baseCur = getCurrency(baseCurrency);
    const quoteCur = getCurrency(quoteCurrency);

    const num = BigInt(rateNumerator);
    const den = BigInt(rateDenominator);

    if (num <= 0n || den <= 0n) {
      throw new FxRateError(`FxRate numerator and denominator must be positive: got ${num}/${den}`);
    }

    this.baseCurrency = baseCur.code;
    this.quoteCurrency = quoteCur.code;
    this.rateNumerator = num;
    this.rateDenominator = den;
    this.timestampUtc = meta.timestampUtc || new Date().toISOString();
    this.provider = meta.provider || 'internal_ledger';
    Object.freeze(this);
  }

  /**
   * Construct FxRate from exact decimal string.
   * e.g. "36.5250" -> 365250n / 10000n
   */
  static fromDecimalString(baseCurrency, quoteCurrency, rateString, meta = {}) {
    const str = String(rateString).trim();
    if (!/^\d+(\.\d+)?$/.test(str)) {
      throw new FxRateError(`Invalid FX rate string: '${rateString}'`);
    }

    const parts = str.split('.');
    const whole = parts[0] || '0';
    const frac = parts[1] || '';
    const scale = frac.length;

    const numerator = BigInt(whole + frac);
    const denominator = 10n ** BigInt(scale);

    return new FxRate(baseCurrency, quoteCurrency, numerator, denominator, meta);
  }

  /**
   * Invert this FX rate (Quote becomes Base).
   */
  invert() {
    return new FxRate(
      this.quoteCurrency,
      this.baseCurrency,
      this.rateDenominator,
      this.rateNumerator,
      { timestampUtc: this.timestampUtc, provider: `${this.provider}_inverted` }
    );
  }
}

/**
 * Foreign Exchange Conversion Engine with Deterministic Banker's Rounding.
 */
export class FxConverter {
  /**
   * Convert Money to target currency using explicit FxRate.
   *
   * Mathematical Conversion Formula:
   *   target_scale = quote_cur.exponent
   *   source_scale = base_cur.exponent
   *   scale_diff = target_scale - source_scale
   *
   *   numerator = source_minor * rate_num * 10^max(0, scale_diff)
   *   denominator = rate_den * 10^max(0, -scale_diff)
   *
   *   target_minor = round_half_even(numerator / denominator)
   */
  static convert(money, fxRate) {
    if (!(money instanceof Money)) {
      throw new InvalidMoneyError('FxConverter requires a valid Money instance');
    }
    if (!(fxRate instanceof FxRate)) {
      throw new FxRateError('FxConverter requires a valid FxRate instance');
    }
    if (money.currency !== fxRate.baseCurrency) {
      throw new CurrencyMismatchError(
        `FxRate base currency ${fxRate.baseCurrency} does not match source Money currency ${money.currency}`
      );
    }

    const baseCur = getCurrency(fxRate.baseCurrency);
    const quoteCur = getCurrency(fxRate.quoteCurrency);

    const scaleDiff = quoteCur.exponent - baseCur.exponent;

    let scaleFactorNum = 1n;
    let scaleFactorDen = 1n;

    if (scaleDiff > 0) {
      scaleFactorNum = 10n ** BigInt(scaleDiff);
    } else if (scaleDiff < 0) {
      scaleFactorDen = 10n ** BigInt(-scaleDiff);
    }

    const numerator = money.amount * fxRate.rateNumerator * scaleFactorNum;
    const denominator = fxRate.rateDenominator * scaleFactorDen;

    const targetMinor = roundHalfEven(numerator, denominator);
    return new Money(targetMinor, quoteCur.code);
  }
}

/**
 * Multi-Currency Double-Entry Ledger Validator.
 * Verifies that a set of debit and credit entries balances to 0 for each currency.
 */
export class DoubleEntryLedgerValidator {
  /**
   * Validates that transaction debits and credits balance per currency.
   *
   * @param {Array<{ account_id: string, money: Money, direction: 'DEBIT'|'CREDIT' }>} entries
   */
  static validateTransaction(entries) {
    if (!Array.isArray(entries) || entries.length < 2) {
      throw new LedgerImbalanceError('Double-entry transaction requires at least two balanced entries');
    }

    const currencyLedger = new Map();

    for (const [idx, entry] of entries.entries()) {
      if (!entry.account_id || !(entry.money instanceof Money)) {
        throw new InvalidMoneyError(`Invalid ledger entry at index ${idx}`);
      }
      const dir = String(entry.direction).toUpperCase();
      if (dir !== 'DEBIT' && dir !== 'CREDIT') {
        throw new InvalidMoneyError(`Invalid entry direction '${entry.direction}' at index ${idx}. Must be DEBIT or CREDIT.`);
      }

      const cur = entry.money.currency;
      if (!currencyLedger.has(cur)) {
        currencyLedger.set(cur, { debitSum: 0n, creditSum: 0n });
      }

      const record = currencyLedger.get(cur);
      if (dir === 'DEBIT') {
        record.debitSum += entry.money.amount;
      } else {
        record.creditSum += entry.money.amount;
      }
    }

    // Check balance for every currency involved
    const imbalances = [];
    for (const [cur, record] of currencyLedger.entries()) {
      if (record.debitSum !== record.creditSum) {
        imbalances.push({
          currency: cur,
          debit_minor: record.debitSum.toString(),
          credit_minor: record.creditSum.toString(),
          delta_minor: (record.debitSum - record.creditSum).toString()
        });
      }
    }

    if (imbalances.length > 0) {
      throw new LedgerImbalanceError(
        `Transaction violates double-entry conservation invariant across ${imbalances.length} currency partitions`,
        { imbalances }
      );
    }

    return {
      balanced: true,
      currencyCount: currencyLedger.size,
      currencies: Array.from(currencyLedger.keys())
    };
  }
}


export function validateIso4217Currency(code, allowDynamic = false) {
  if (typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(ISO_4217_CURRENCIES, clean)) return true;
  if (allowDynamic && dynamicCurrencyRegistry.has(clean)) return true;
  return false;
}

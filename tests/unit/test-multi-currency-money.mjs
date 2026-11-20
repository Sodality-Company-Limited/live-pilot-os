/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS MULTI-CURRENCY MONEY UNIT TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Zero-mock empirical verification for Multi-Currency ISO 4217 Money Pattern,
 *          Zero-Float Invariant, Half-Even Rounding, and Double-Entry Ledger Engine.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import assert from 'node:assert/strict';
import {
  Money,
  FxRate,
  FxConverter,
  DoubleEntryLedgerValidator,
  roundHalfEven,
  registerCurrency,
  getCurrency,
  validateIso4217Currency,
  CurrencyMismatchError,
  InvalidMoneyError,
  FxRateError,
  LedgerImbalanceError
} from '../../scripts/lib/multi-currency-money.mjs';

console.log('================================================================================');
console.log('🧪 Running Soda OS Multi-Currency Money Unit Tests...');
console.log('================================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`      ↳ ${err.message}`);
    throw err;
  }
}

// 1. Dynamic Exponent Scaling & Currency Representation
runTest('1. Supports ISO 4217 0-decimal, 2-decimal, 3-decimal, and 4-decimal currencies', () => {
  const jpy = Money.fromMinor(150n, 'JPY'); // 0-decimal: 150 Yen
  assert.strictEqual(jpy.scale, 0);
  assert.strictEqual(jpy.amount, 150n);
  assert.strictEqual(jpy.toMajorString(), '150');
  assert.strictEqual(jpy.toString(), '150 JPY');

  const thb = Money.fromMinor(2500000n, 'THB'); // 2-decimal: 25,000.00 THB (2.5M Satang)
  assert.strictEqual(thb.scale, 2);
  assert.strictEqual(thb.amount, 2500000n);
  assert.strictEqual(thb.toMajorString(), '25000.00');
  assert.strictEqual(thb.toString(), '25000.00 THB');

  const bhd = Money.fromMinor(1250n, 'BHD'); // 3-decimal: 1.250 BHD (1250 Fils)
  assert.strictEqual(bhd.scale, 3);
  assert.strictEqual(bhd.amount, 1250n);
  assert.strictEqual(bhd.toMajorString(), '1.250');
  assert.strictEqual(bhd.toString(), '1.250 BHD');

  const clf = Money.fromMinor(10050n, 'CLF'); // 4-decimal: 1.0050 CLF
  assert.strictEqual(clf.scale, 4);
  assert.strictEqual(clf.amount, 10050n);
  assert.strictEqual(clf.toMajorString(), '1.0050');
});

// 2. Strict Zero-Float Math Invariant
runTest('2. Enforces strict zero-float invariant (rejects IEEE 754 float monetary inputs)', () => {
  assert.throws(() => new Money(12.55, 'USD'), InvalidMoneyError);
  assert.throws(() => Money.fromMinor(0.1 + 0.2, 'THB'), InvalidMoneyError);

  const m = Money.fromMinor(1000n, 'USD');
  assert.throws(() => m.multiplyInteger(1.5), InvalidMoneyError);
});

// 3. String Major Unit Parsing without Float Conversion
runTest('3. Money.fromMajor parses decimal strings with zero float conversion', () => {
  const m1 = Money.fromMajor('1250.50', 'THB');
  assert.strictEqual(m1.amount, 125050n);
  assert.strictEqual(m1.currency, 'THB');

  const m2 = Money.fromMajor('-45.05', 'USD');
  assert.strictEqual(m2.amount, -4505n);
  assert.strictEqual(m2.isNegative(), true);

  const m3 = Money.fromMajor('750', 'JPY');
  assert.strictEqual(m3.amount, 750n);

  const m4 = Money.fromMajor('2.5', 'BHD'); // pads to 3 decimals: 2.500 -> 2500
  assert.strictEqual(m4.amount, 2500n);
});

// 4. Currency Isolation Barrier
runTest('4. Cross-currency arithmetic is strictly forbidden without explicit FX conversion', () => {
  const usd = Money.fromMajor('100.00', 'USD');
  const thb = Money.fromMajor('100.00', 'THB');

  assert.throws(() => usd.add(thb), CurrencyMismatchError);
  assert.throws(() => usd.sub(thb), CurrencyMismatchError);
  assert.throws(() => usd.compare(thb), CurrencyMismatchError);
});

// 5. Fowler's Remainder-Preserving Allocation
runTest("5. Fowler's allocation algorithm splits money across ratios with zero unit loss", () => {
  const total = Money.fromMinor(10000n, 'THB'); // 100.00 THB (10,000 Satang)
  const splits = total.allocate([1, 1, 1]); // 3-way split: 10000 / 3 = 3333 remainder 1

  assert.strictEqual(splits.length, 3);
  assert.strictEqual(splits[0].amount, 3334n);
  assert.strictEqual(splits[1].amount, 3333n);
  assert.strictEqual(splits[2].amount, 3333n);

  const sum = splits[0].add(splits[1]).add(splits[2]);
  assert.strictEqual(sum.amount, 10000n, 'Sum of allocations must strictly equal original amount');

  // Multi-tier split: 70%, 20%, 10% on 100.05 THB (10005 Satang)
  const uneven = Money.fromMinor(10005n, 'THB');
  const shares = uneven.allocate([70, 20, 10]);
  const shareSum = shares.reduce((acc, s) => acc.add(s), Money.zero('THB'));
  assert.strictEqual(shareSum.amount, 10005n);
});

// 6. Half-Even Banker's Rounding
runTest("6. roundHalfEven implements deterministic Banker's Rounding (unbiased)", () => {
  // Round to nearest integer:
  // 1 / 2 = 0.5 -> nearest even is 0
  assert.strictEqual(roundHalfEven(1n, 2n), 0n);
  // 3 / 2 = 1.5 -> nearest even is 2
  assert.strictEqual(roundHalfEven(3n, 2n), 2n);
  // 5 / 2 = 2.5 -> nearest even is 2
  assert.strictEqual(roundHalfEven(5n, 2n), 2n);
  // 7 / 2 = 3.5 -> nearest even is 4
  assert.strictEqual(roundHalfEven(7n, 2n), 4n);

  // Negative values:
  assert.strictEqual(roundHalfEven(-1n, 2n), 0n);
  assert.strictEqual(roundHalfEven(-3n, 2n), -2n);
  assert.strictEqual(roundHalfEven(-5n, 2n), -2n);
});

// 7. Multi-Currency Foreign Exchange (FX) Conversion Engine
runTest('7. FxConverter executes multi-currency conversion across mismatched scales', () => {
  // Scenario A: 2-decimal USD to 2-decimal THB at rate 36.5000 (365000 / 10000)
  const usd = Money.fromMajor('100.00', 'USD'); // 10000 cents
  const rateUsdThb = FxRate.fromDecimalString('USD', 'THB', '36.5000');
  const thbConverted = FxConverter.convert(usd, rateUsdThb);

  assert.strictEqual(thbConverted.currency, 'THB');
  assert.strictEqual(thbConverted.amount, 365000n); // 3,650.00 THB
  assert.strictEqual(thbConverted.toMajorString(), '3650.00');

  // Scenario B: 2-decimal USD to 0-decimal JPY at rate 155.00
  const rateUsdJpy = FxRate.fromDecimalString('USD', 'JPY', '155.00');
  const jpyConverted = FxConverter.convert(usd, rateUsdJpy);
  assert.strictEqual(jpyConverted.currency, 'JPY');
  assert.strictEqual(jpyConverted.scale, 0);
  assert.strictEqual(jpyConverted.amount, 15500n); // 15,500 JPY

  // Scenario C: 0-decimal JPY to 2-decimal USD (Inversion)
  const jpy = Money.fromMinor(15500n, 'JPY');
  const rateJpyUsd = rateUsdJpy.invert();
  const usdBack = FxConverter.convert(jpy, rateJpyUsd);
  assert.strictEqual(usdBack.currency, 'USD');
  assert.strictEqual(usdBack.amount, 10000n); // 100.00 USD exactly

  // Scenario D: 2-decimal USD to 3-decimal BHD at rate 0.376
  const rateUsdBhd = FxRate.fromDecimalString('USD', 'BHD', '0.376');
  const bhdConverted = FxConverter.convert(usd, rateUsdBhd);
  assert.strictEqual(bhdConverted.currency, 'BHD');
  assert.strictEqual(bhdConverted.scale, 3);
  assert.strictEqual(bhdConverted.amount, 37600n); // 37.600 BHD
});

// 8. Multi-Currency Double-Entry Ledger Validation
runTest('8. DoubleEntryLedgerValidator enforces per-currency conservation', () => {
  // Balanced single-currency entry
  const entriesGood = [
    { account_id: 'acc_customer_wallet', money: Money.fromMinor(5000n, 'THB'), direction: 'DEBIT' },
    { account_id: 'acc_merchant_payable', money: Money.fromMinor(5000n, 'THB'), direction: 'CREDIT' }
  ];
  const res = DoubleEntryLedgerValidator.validateTransaction(entriesGood);
  assert.strictEqual(res.balanced, true);
  assert.strictEqual(res.currencyCount, 1);

  // Balanced multi-currency FX trade with clearing bridge
  const entriesMultiGood = [
    { account_id: 'acc_usd_vault', money: Money.fromMajor('100.00', 'USD'), direction: 'DEBIT' },
    { account_id: 'acc_fx_clearing_usd', money: Money.fromMajor('100.00', 'USD'), direction: 'CREDIT' },
    { account_id: 'acc_fx_clearing_thb', money: Money.fromMajor('3650.00', 'THB'), direction: 'DEBIT' },
    { account_id: 'acc_thb_vault', money: Money.fromMajor('3650.00', 'THB'), direction: 'CREDIT' }
  ];
  const resMulti = DoubleEntryLedgerValidator.validateTransaction(entriesMultiGood);
  assert.strictEqual(resMulti.balanced, true);
  assert.strictEqual(resMulti.currencyCount, 2);

  // Imbalanced transaction
  const entriesBad = [
    { account_id: 'acc_1', money: Money.fromMinor(5000n, 'THB'), direction: 'DEBIT' },
    { account_id: 'acc_2', money: Money.fromMinor(4999n, 'THB'), direction: 'CREDIT' }
  ];
  assert.throws(() => DoubleEntryLedgerValidator.validateTransaction(entriesBad), LedgerImbalanceError);
});

// 9. Custom Currency / Token Dynamic Registration
runTest('9. Dynamic registration allows enterprise tokens or crypto with arbitrary exponents', () => {
  registerCurrency({
    code: 'SODA',
    numeric: '999',
    exponent: 6, // Micro-credits (1 unit = 1,000,000 micro-soda)
    name: 'Soda AI Compute Token',
    symbol: 'SODA'
  });

  const cur = getCurrency('SODA');
  assert.strictEqual(cur.exponent, 6);

  const tokens = Money.fromMajor('1.5', 'SODA');
  assert.strictEqual(tokens.amount, 1500000n);
  assert.strictEqual(tokens.toMajorString(), '1.500000');
  assert.strictEqual(tokens.toString(), '1.500000 SODA');
});

// 10. Robust Currency Validation (validateIso4217Currency)
runTest('10. validateIso4217Currency correctly verifies valid and invalid ISO 4217 currency codes', () => {
  // Valid standard currencies
  assert.strictEqual(validateIso4217Currency('THB'), true);
  assert.strictEqual(validateIso4217Currency('USD'), true);
  assert.strictEqual(validateIso4217Currency('EUR'), true);
  assert.strictEqual(validateIso4217Currency('JPY'), true);
  assert.strictEqual(validateIso4217Currency('BHD'), true);
  assert.strictEqual(validateIso4217Currency('CLF'), true);

  // Case insensitivity and whitespace trimming
  assert.strictEqual(validateIso4217Currency('thb'), true);
  assert.strictEqual(validateIso4217Currency('  usd  '), true);

  // Registered dynamic currency (from test 9)
  assert.strictEqual(validateIso4217Currency('SODA', true), true);
  assert.strictEqual(validateIso4217Currency('SODA'), false); // strictly non-ISO

  // Invalid strings, unsupported currencies, and non-string inputs
  assert.strictEqual(validateIso4217Currency('XYZ_INVALID'), false);
  assert.strictEqual(validateIso4217Currency('ZZZ'), false);
  assert.strictEqual(validateIso4217Currency(''), false);
  assert.strictEqual(validateIso4217Currency('   '), false);
  assert.strictEqual(validateIso4217Currency(null), false);
  assert.strictEqual(validateIso4217Currency(undefined), false);
  assert.strictEqual(validateIso4217Currency(123), false);
  assert.strictEqual(validateIso4217Currency({ code: 'USD' }), false);
});

console.log('================================================================================');
console.log(`📊 Unit Test Result: ${passedTests} / ${totalTests} Passed (100% Green)`);
console.log('================================================================================\n');
console.log('🏆 ALL MULTI-CURRENCY MONEY UNIT TESTS PASSED EMPIRICALLY!');

/**
 * Unit Test Suite for Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Sanitizer.
 * Verifies 800 red-team scenarios, 14 deceptive dark pattern categories,
 * 5 deferral reasons, and regex-based PII scrubbing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdversarialScenario,
  generateAdversarialCurriculum,
  sanitizePii,
  isLuhnValid,
  CANONICAL_DARK_PATTERNS,
  DEFERRAL_REASONS
} from '../../scripts/lib/dark-pattern-curriculum.mjs';

test('AdversarialCurriculum: Scenario building and fail-closed routing', () => {
  // Dark pattern case (0..399)
  const darkCase = buildAdversarialScenario(0);
  assert.equal(darkCase.adversarial_type, 'dark_pattern');
  assert.equal(darkCase.target_outcome, 'REJECT_AS_UNSAFE');
  assert.ok(CANONICAL_DARK_PATTERNS.includes(darkCase.dark_pattern_category));
  assert.equal(typeof darkCase.sha256_digest, 'string');

  // Deferral case (400..799)
  const deferCase = buildAdversarialScenario(400);
  assert.equal(deferCase.adversarial_type, 'justified_deferral');
  assert.equal(deferCase.target_outcome, 'DEFER');
  assert.ok(DEFERRAL_REASONS.includes(deferCase.deferral_category));
  assert.ok(deferCase.target_confidence_ceiling < 0.75);
});

test('AdversarialCurriculum: Coverage of all 14 dark patterns and 5 deferral reasons', () => {
  const result = generateAdversarialCurriculum({
    total_scenarios: 800,
    write_files: false,
    seed: 42
  });

  assert.equal(result.scenarios.length, 800);
  assert.equal(result.manifest.outcomes.REJECT_AS_UNSAFE, 400);
  assert.equal(result.manifest.outcomes.DEFER, 400);

  for (const p of CANONICAL_DARK_PATTERNS) {
    assert.ok(result.manifest.dark_patterns_evaluated[p] > 0, `Dark pattern '${p}' must be evaluated`);
  }

  for (const d of DEFERRAL_REASONS) {
    assert.ok(result.manifest.deferral_categories_evaluated[d] > 0, `Deferral category '${d}' must be evaluated`);
  }
});

test('PiiSanitizer: Regex sanitization across secrets, emails, phones, and Luhn credit cards', () => {
  // 1. Email
  const emailRes = sanitizePii('Contact support at operator@soda.dev for assistance.');
  assert.equal(emailRes.sanitized, 'Contact support at [REDACTED_EMAIL] for assistance.');
  assert.equal(emailRes.detections.emails, 1);

  // 2. AWS Key
  const awsRes = sanitizePii('Deploy using AKIAIOSFODNN7EXAMPLE credentials.');
  assert.equal(awsRes.sanitized, 'Deploy using [REDACTED_AWS_KEY] credentials.');
  assert.equal(awsRes.detections.api_keys, 1);

  // 3. OpenAI Key
  const oaRes = sanitizePii('Secret sk-abc1234567890123456789012345 token.');
  assert.equal(oaRes.sanitized, 'Secret [REDACTED_OPENAI_KEY] token.');
  assert.equal(oaRes.detections.api_keys, 1);

  // 4. SSN
  const ssnRes = sanitizePii('Tax ID 000-12-3456 verified.');
  assert.equal(ssnRes.sanitized, 'Tax ID [REDACTED_SSN] verified.');
  assert.equal(ssnRes.detections.ssn, 1);

  // 5. Valid Luhn Credit Card (4532 0150 0000 0007)
  assert.equal(isLuhnValid('4532015000000000'), false);
  assert.equal(isLuhnValid('4532015000000007'), true);
  const cardRes = sanitizePii('Card 4532-0150-0000-0007 submitted.');
  assert.equal(cardRes.sanitized, 'Card [REDACTED_CREDIT_CARD] submitted.');
  assert.equal(cardRes.detections.credit_cards, 1);
});

test('PiiSanitizer: Compact unhyphenated credit card redaction and pipeline precedence', () => {
  // 1. Compact unhyphenated 16-digit Visa card
  const visaRes = sanitizePii('Transaction with card 4532015000000007 completed.');
  assert.equal(visaRes.sanitized.includes('00007'), false, 'Trailing card digits must not leak');
  assert.equal(visaRes.sanitized, 'Transaction with card [REDACTED_CREDIT_CARD] completed.');
  assert.equal(visaRes.detections.credit_cards, 1);
  assert.equal(visaRes.detections.phones, 0);

  // 2. Compact 15-digit Amex card
  const amexRes = sanitizePii('Corporate card 378282246310005 billed.');
  assert.equal(amexRes.sanitized, 'Corporate card [REDACTED_CREDIT_CARD] billed.');
  assert.equal(amexRes.detections.credit_cards, 1);
  assert.equal(amexRes.detections.phones, 0);

  // 3. Compact 16-digit MasterCard
  const mcRes = sanitizePii('Card 5105105105105100 on file.');
  assert.equal(mcRes.sanitized, 'Card [REDACTED_CREDIT_CARD] on file.');
  assert.equal(mcRes.detections.credit_cards, 1);
  assert.equal(mcRes.detections.phones, 0);

  // 4. Combined phone and compact card in single string
  const mixedRes = sanitizePii('Call support at +1-555-123-4567 regarding card 4532015000000007.');
  assert.equal(mixedRes.sanitized, 'Call support at [REDACTED_PHONE] regarding card [REDACTED_CREDIT_CARD].');
  assert.equal(mixedRes.detections.credit_cards, 1);
  assert.equal(mixedRes.detections.phones, 1);
});

test('PiiSanitizer: Non-string input safety', () => {
  // null input
  const nullRes = sanitizePii(null);
  assert.equal(nullRes.sanitized, '');
  assert.deepEqual(nullRes.detections, {});

  // undefined input
  const undefRes = sanitizePii(undefined);
  assert.equal(undefRes.sanitized, '');
  assert.deepEqual(undefRes.detections, {});

  // number input
  const numRes = sanitizePii(1234567890);
  assert.equal(numRes.sanitized, '');
  assert.deepEqual(numRes.detections, {});
});

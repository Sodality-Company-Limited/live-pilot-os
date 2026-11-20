import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lintMarketingCopyStrings,
  BANNED_AI_BUZZWORDS,
  BANNED_PLACEHOLDER_NAMES
} from '../../../scripts/lib/marketing-copy-linter.mjs';

describe('Marketing Copy Anti-Buzzword & Organic Data Static Linter', () => {
  it('Rejects marketing copy containing banned AI buzzwords (elevate, seamless, unleash, game-changer, delve)', () => {
    assert.ok(BANNED_AI_BUZZWORDS.includes('elevate'));
    assert.ok(BANNED_AI_BUZZWORDS.includes('seamless'));
    assert.ok(BANNED_AI_BUZZWORDS.includes('unleash'));

    const badCopy = 'Elevate your team with a seamless AI workflow to unleash potential.';
    const res = lintMarketingCopyStrings(badCopy);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'BANNED_AI_BUZZWORD'));
  });

  it('Flags generic placeholder brands and insists on contextual naming', () => {
    assert.ok(BANNED_PLACEHOLDER_NAMES.includes('acme corp'));
    assert.ok(BANNED_PLACEHOLDER_NAMES.includes('john doe'));

    const genericCopy = 'Trusted by leaders at Acme Corp and SmartFlow.';
    const res = lintMarketingCopyStrings(genericCopy);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'GENERIC_PLACEHOLDER_BRAND'));
  });

  it('Enforces organic, credible data formats over round fake numbers', () => {
    const fakeDataCopy = 'Achieve 99.99% reliability with a 50% discount and $100.00 pricing.';
    const res = lintMarketingCopyStrings(fakeDataCopy);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'NON_ORGANIC_METRIC'));
  });

  it('Approves clean, organic, and grounded marketing copy', () => {
    const goodCopy = 'Built for high frequency risk engines running 47.2% faster on Apple Silicon.';
    const res = lintMarketingCopyStrings(goodCopy);
    assert.equal(res.valid, true);
    assert.equal(res.violations.length, 0);
  });
});

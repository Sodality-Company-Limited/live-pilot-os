import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrincipleAttribution } from '../../lib/principle-attribution-validator.mjs';

test('approves valid principle citation with concrete decision alteration', () => {
  const payload = {
    principle: 'soda-os/article-vi-zero-float',
    decision_altered: 'Replaced float division with integer div_half_even scale 2',
    file: 'scripts/lib/multi-currency-money.mjs'
  };

  const res = validatePrincipleAttribution(payload);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
  assert.equal(res.record.principle, 'soda-os/article-vi-zero-float');
});

test('rejects hollow attribution with trivial decision', () => {
  const payload = {
    principle: 'soda-os/article-i',
    decision_altered: 'None'
  };

  const res = validatePrincipleAttribution(payload);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Hollow attribution rejected')));
});

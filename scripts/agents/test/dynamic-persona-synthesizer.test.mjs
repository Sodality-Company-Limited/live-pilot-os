import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeOnTheFlyPersona } from '../lib/dynamic-persona-synthesizer.mjs';
import { spawnSubagent } from '../lib/subagent-spawner.mjs';

test('synthesizeOnTheFlyPersona generates precise single-persona string and directives from goal and step context', () => {
  const synthesized = synthesizeOnTheFlyPersona({
    role: 'implementer',
    mandate: 'Implement Stripe webhook idempotency check in payment service',
    goalId: 'G-PAY-001',
    touchMap: ['src/payments/stripe-webhook.ts'],
  });

  assert.equal(typeof synthesized.persona, 'string');
  // Must satisfy single-persona invariant (no spaces, commas, or 'and')
  assert.equal(synthesized.persona.trim().split(/\s*(?:,|\||\band\b)\s*/i).filter(Boolean).length, 1);
  assert.match(synthesized.persona, /payment|stripe|webhook/);
  assert.match(synthesized.directives, /zero mocks/i);
});

test('synthesizeOnTheFlyPersona handles tester role with domain synthesis', () => {
  const synthesized = synthesizeOnTheFlyPersona({
    role: 'tester',
    mandate: 'Write mutation and property test suite for integer multi-currency money arithmetic',
    goalId: 'G-CORE-006',
    touchMap: ['scripts/lib/multi-currency-money.mjs', 'scripts/agents/test/money.test.mjs'],
  });

  assert.equal(synthesized.role, 'tester');
  assert.match(synthesized.persona, /currency|money|math|tester/);
  assert.match(synthesized.directives, /zero stubs/i);
});

test('spawnSubagent autonomously synthesizes persona on-the-fly when persona is omitted', async () => {
  const res = await spawnSubagent({
    provider: 'codex',
    goalId: 'G-PAY-001',
    role: 'implementer',
    // persona is intentionally omitted to trigger on-the-fly synthesis!
    goalStatus: 'ready',
    mandate: 'Implement OAuth token refresh mechanism',
    touchMap: ['src/auth/oauth.ts'],
  });

  // Gating must succeed because persona was generated on the fly
  assert.ok(res.persona);
  assert.match(res.persona, /auth|oauth|security|token|implementer/);
  assert.equal(res.persona.trim().split(/\s*(?:,|\||\band\b)\s*/i).filter(Boolean).length, 1);
});

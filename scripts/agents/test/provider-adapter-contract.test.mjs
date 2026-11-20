import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareProviderSession, validateCoordinatorDispatchLifecycle } from '../lib/provider-adapter-contract.mjs';

test('prepares a provider-neutral bounded session', () => {
  const result = prepareProviderSession({
    goalId: 'G-TEST-001',
    role: 'implementer',
    persona: 'focused implementer',
    goalStatus: 'ready',
    mandate: 'Fix one scoped bug',
    touchMap: ['src/a.ts'],
  });
  assert.equal(result.allowed, true);
  assert.match(result.prompt, /G-TEST-001/);
  assert.match(result.prompt, /Persona: focused implementer/);
  assert.equal(result.cancellation.signal, 'SIGTERM');
  assert.equal(result.telemetry.sessionKey.length, 16);
  assert.equal(result.usage.source, 'estimate');
  assert.equal(result.budget.exceeded, false);
});

test('does not prepare an invalid provider session', () => {
  const result = prepareProviderSession({ goalId: 'G-TEST-001', role: 'tester', persona: 'focused tester', goalStatus: 'draft' });
  assert.equal(result.allowed, false);
  assert.ok(result.gate.errors.includes('empty touch map'));
});

test('rejects a session that already exceeds its token budget', () => {
  const result = prepareProviderSession({
    goalId: 'G-TEST-001', role: 'implementer', persona: 'focused implementer', goalStatus: 'ready',
    mandate: 'x', touchMap: ['src/a.ts'],
    usage: { input_tokens: 24000, output_tokens: 8000 },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.error, 'input token budget exceeded');
});

test('rejects a spawn whose input tokens exceed the input ceiling even when total is below the combined ceiling', () => {
  const result = prepareProviderSession({
    goalId: 'G-TEST-001', role: 'implementer', persona: 'focused implementer', goalStatus: 'ready',
    mandate: 'x', touchMap: ['src/a.ts'],
    usage: { input_tokens: 24000, output_tokens: 1 },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.budget.inputExceeded, true);
  assert.equal(result.error, 'input token budget exceeded');
});

test('rejects an identical input prompt reused for the same goal', () => {
  const input = {
    goalId: 'G-TEST-001', role: 'implementer', persona: 'focused implementer', goalStatus: 'ready',
    mandate: 'Fix one scoped bug', touchMap: ['src/a.ts'],
  };
  const first = prepareProviderSession(input);
  const second = prepareProviderSession(input, new Set(), new Set([`${input.goalId}:${first.promptHash}`]));
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.ok(second.gate.errors.includes('duplicate input prompt for goal'));
});

test('validates end-to-end coordinator-to-subagent dispatch lifecycle', () => {
  const validPacket = {
    goalId: 'G-AG-020',
    role: 'implementer',
    persona: 'lifecycle-verifier',
    goalStatus: 'ready',
    mandate: 'Validate dispatch pipeline',
    touchMap: ['scripts/agents/lib/provider-adapter-contract.mjs'],
  };

  const dispatch = validateCoordinatorDispatchLifecycle(validPacket);
  assert.equal(dispatch.status, 'dispatched');
  assert.equal(dispatch.goalId, 'G-AG-020');
  assert.equal(dispatch.persona, 'lifecycle-verifier');
  assert.equal(dispatch.cancellation.signal, 'SIGTERM');
  assert.equal(typeof dispatch.sessionKey, 'string');
  assert.equal(dispatch.sessionKey.length, 16);

  const invalidPacket = {
    goalId: 'G-AG-020',
    role: 'implementer',
    persona: 'lifecycle-verifier',
    goalStatus: 'draft', // Unpromoted goal cannot be dispatched
    mandate: 'Validate dispatch pipeline',
    touchMap: ['scripts/agents/lib/provider-adapter-contract.mjs'],
  };

  const rejected = validateCoordinatorDispatchLifecycle(invalidPacket);
  assert.equal(rejected.status, 'rejected');
  assert.ok(rejected.reason.includes('goal status is not executable: draft'));
});



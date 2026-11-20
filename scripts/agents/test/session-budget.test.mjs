import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionKey, validateSpawnRequest } from '../lib/session-budget.mjs';

const base = {
  goalId: 'G-DOKS-PROD-001',
  role: 'implementer',
  persona: 'focused implementer',
  goalStatus: 'ready',
  touchMap: ['code/src/a.ts'],
  contextBytes: 1000,
  childCount: 0,
};

test('allows a bounded executable request', () => {
  assert.equal(validateSpawnRequest(base).allowed, true);
});

test('loads the repository runtime budget instead of only hardcoded limits', () => {
  const result = validateSpawnRequest({ ...base, contextBytes: 120001 });
  assert.equal(result.limits.maxContextBytes, 120000);
  assert.equal(result.allowed, false);
});

test('rejects duplicate sessions and oversized context', () => {
  const key = sessionKey(base);
  const result = validateSpawnRequest({ ...base, contextBytes: 120001 }, new Set([key]));
  assert.equal(result.allowed, false);
  assert.ok(result.errors.includes('context exceeds byte budget'));
  assert.ok(result.errors.includes('duplicate active session'));
});

test('rejects non-executable goals and empty touch maps', () => {
  const result = validateSpawnRequest({ ...base, goalStatus: 'draft', touchMap: [] });
  assert.equal(result.allowed, false);
  assert.ok(result.errors.includes('goal status is not executable: draft'));
  assert.ok(result.errors.includes('empty touch map'));
});

test('requires exactly one persona', () => {
  assert.ok(validateSpawnRequest({ ...base, persona: undefined }).errors.includes('missing persona'));
  assert.ok(validateSpawnRequest({ ...base, persona: ['implementer', 'reviewer'] }).errors.includes('persona must be exactly one string'));
  assert.ok(validateSpawnRequest({ ...base, persona: 'implementer and reviewer' }).errors.includes('persona must identify exactly one persona'));
});

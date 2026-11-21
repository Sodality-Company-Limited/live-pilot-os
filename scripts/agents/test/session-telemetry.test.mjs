import test from 'node:test';
import assert from 'node:assert/strict';
import { compactSessionRecord, failureFingerprint } from '../lib/session-telemetry.mjs';

test('creates stable fingerprints for the same failure', () => {
  const input = { command: 'npm test', exitCode: 1, error: 'same error', paths: ['src/a.ts'] };
  assert.equal(failureFingerprint(input), failureFingerprint(input));
});

test('stores metrics without prompts or logs', () => {
  const record = compactSessionRecord({ goalId: 'G-TEST-001', role: 'tester', outputTokens: 5, stopReason: 'complete' });
  assert.equal(record.outputTokens, 5);
  assert.equal(Object.hasOwn(record, 'prompt'), false);
  assert.equal(Object.hasOwn(record, 'logs'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCompletionClaim } from '../../lib/verification-before-completion.mjs';

test('permits completion claim backed by fresh green test exitCode 0', () => {
  const validClaim = {
    command: 'node --test scripts/agents/test/*.test.mjs',
    exitCode: 0,
    stdoutDigest: 'hash_abc123_pass',
    executedAt: new Date().toISOString()
  };

  const res = verifyCompletionClaim(validClaim);
  assert.equal(res.allowed, true);
  assert.equal(res.exitCode, 0);
});

test('rejects completion claim when exitCode is non-zero', () => {
  const failingClaim = {
    command: 'cargo test',
    exitCode: 101,
    stdoutDigest: 'hash_err'
  };

  const res = verifyCompletionClaim(failingClaim);
  assert.equal(res.allowed, false);
  assert.ok(res.reason.includes('failed with exitCode 101'));
});

test('rejects unverified completion claim with no command', () => {
  const emptyClaim = {};
  const res = verifyCompletionClaim(emptyClaim);
  assert.equal(res.allowed, false);
  assert.ok(res.reason.includes('MUST cite an explicit verification command'));
});

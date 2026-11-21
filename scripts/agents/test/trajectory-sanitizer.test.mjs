import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText, sanitizeTrajectory } from '../lib/trajectory-sanitizer.mjs';

test('sanitizeText scrubs secret tokens, API keys, and private keys', () => {
  const sensitiveInput = `
    Here is OpenAI key: sk-proj-1234567890abcdef1234567890abcdef12345678
    Here is Anthropic key: sk-ant-api03-1234567890abcdef1234567890abcdef-1234567890abcdef1234567890abcdef
    Here is GitHub token: ghp_1234567890abcdefghijklmnopqrstuvwxyz12
    Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignaturePart
    -----BEGIN RSA PRIVATE KEY-----
    MIIEowIBAAKCAQEA0Y12345fake
    -----END RSA PRIVATE KEY-----
  `;

  const sanitized = sanitizeText(sensitiveInput);

  assert.doesNotMatch(sanitized, /sk-proj-[a-zA-Z0-9_-]{20,}/);
  assert.doesNotMatch(sanitized, /sk-ant-api03-[a-zA-Z0-9_-]{20,}/);
  assert.doesNotMatch(sanitized, /ghp_[a-zA-Z0-9]{20,}/);
  assert.doesNotMatch(sanitized, /Bearer eyJ[a-zA-Z0-9._-]+/);
  assert.doesNotMatch(sanitized, /-----BEGIN RSA PRIVATE KEY-----/);
  assert.match(sanitized, /\[REDACTED_API_KEY\]|\[REDACTED_TOKEN\]|\[REDACTED_SECRET\]|\[REDACTED_PRIVATE_KEY\]/);
});

test('sanitizeTrajectory recursively scrubs nested fields in trajectory records', () => {
  const rawTrajectory = {
    sessionKey: 'sess-001',
    goalId: 'G-ML-029',
    fullPrompt: 'Fix bug with key sk-proj-abcdef12345678901234567890abcdef12345678',
    rawResponse: 'Authorized with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
    tools: {
      'read_file': 1
    }
  };

  const sanitized = sanitizeTrajectory(rawTrajectory);

  assert.equal(sanitized.sessionKey, 'sess-001');
  assert.doesNotMatch(sanitized.fullPrompt, /sk-proj-/);
  assert.doesNotMatch(sanitized.rawResponse, /eyJhbGciOiJIUzI1Ni/);
  assert.match(sanitized.fullPrompt, /\[REDACTED_API_KEY\]/);
});

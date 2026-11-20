import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompactPrompt } from '../lib/compact-prompt.mjs';

test('builds a small execution contract with one explicit persona', () => {
  const prompt = buildCompactPrompt({
    goalId: 'G-TEST-001',
    role: 'implementer',
    persona: 'focused implementer',
    mandate: 'Fix the failing parser test',
    touchMap: ['src/parser.ts'],
    acceptance: ['parser test passes'],
    commands: ['node --test src/parser.test.ts'],
  });
  assert.match(prompt, /G-TEST-001/);
  assert.match(prompt, /src\/parser\.ts/);
  assert.match(prompt, /Persona: focused implementer/);
  assert.match(prompt, /--- MANDATORY EPHEMERAL WORKER CONTRACT ---/);
  assert.ok(prompt.length < 2000);
});

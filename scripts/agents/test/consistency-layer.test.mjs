import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePersona, CANONICAL_PERSONAS } from '../lib/persona-registry.mjs';
import { resolveModelForProvider, MODEL_TIERS } from '../lib/model-registry.mjs';
import { buildCompactPrompt } from '../lib/compact-prompt.mjs';

test('resolvePersona returns official directives for standard personas', () => {
  const p = resolvePersona('backend-api-engineer', 'implementer');
  assert.equal(p.role, 'implementer');
  assert.match(p.directives, /strict contract boundaries/i);
  assert.match(p.directives, /zero mocks and zero stubs/i);
});

test('resolvePersona derives safe fallback directives for custom profile personas', () => {
  const p = resolvePersona('payment-vault-specialist', 'implementer');
  assert.equal(p.title, 'payment-vault-specialist');
  assert.match(p.directives, /zero mocks, zero stubs/i);
});

test('resolveModelForProvider maps reasoning tier correctly across CLIs', () => {
  assert.equal(resolveModelForProvider('codex', null, 'reasoning'), 'o3-mini');
  assert.equal(resolveModelForProvider('claude', null, 'reasoning'), 'claude-3-7-sonnet');
  assert.equal(resolveModelForProvider('gemini', null, 'reasoning'), 'gemini-2.5-pro');
  assert.equal(resolveModelForProvider('antigravity', null, 'reasoning'), 'gemini-2.5-pro');
  assert.equal(resolveModelForProvider('ollama', null, 'reasoning'), 'qwen2.5-coder:14b');
});

test('resolveModelForProvider maps balanced tier correctly across CLIs', () => {
  assert.equal(resolveModelForProvider('codex', null, 'balanced'), 'gpt-4o');
  assert.equal(resolveModelForProvider('claude', null, 'balanced'), 'claude-3-5-haiku');
  assert.equal(resolveModelForProvider('gemini', null, 'balanced'), 'gemini-2.0-flash');
  assert.equal(resolveModelForProvider('ollama', null, 'balanced'), 'gemma4');
});

test('buildCompactPrompt wraps prompt in constitutional execution envelope with persona directives', () => {
  const prompt = buildCompactPrompt({
    goalId: 'G-PAY-001',
    role: 'implementer',
    persona: 'backend-api-engineer',
    mandate: 'Add Stripe webhook route',
    touchMap: ['src/routes/stripe.ts'],
    acceptance: ['Return 200 on valid signature', 'Return 400 on forged signature'],
    commands: ['npm test'],
  });

  assert.match(prompt, /=== SODA OS SUBAGENT BOUNDED EXECUTION CONTRACT ===/);
  assert.match(prompt, /Persona Directives: Enforce strict contract boundaries/);
  assert.match(prompt, /Declared Touch Map: src\/routes\/stripe\.ts/);
  assert.match(prompt, /Zero mocks, zero stubs/);
  assert.match(prompt, /Mandatory Constitutional Invariants/);
});

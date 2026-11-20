import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePluginManifest } from '../../lib/soda-plugin-compiler.mjs';

const sampleManifest = {
  name: 'soda-superpowers',
  version: '1.0.0',
  description: 'Execution discipline plugin for Soda OS',
  capabilities: ['systematic-debugging', 'two-stage-review'],
  tools: [
    { name: 'soda-debug', command: 'node scripts/lib/systematic-debugger.mjs', description: 'Run systematic debugger' }
  ]
};

test('compiles plugin manifest for Antigravity target', () => {
  const res = compilePluginManifest(sampleManifest, 'antigravity');
  assert.equal(res.name, 'soda-superpowers');
  assert.equal(res.type, 'antigravity-extension');
  assert.equal(res.tools[0].name, 'soda-debug');
});

test('compiles plugin manifest for Claude target', () => {
  const res = compilePluginManifest(sampleManifest, 'claude');
  assert.equal(res.name, 'soda-superpowers');
  assert.equal(res.commands[0].name, 'soda-debug');
});

test('compiles plugin manifest for Codex target', () => {
  const res = compilePluginManifest(sampleManifest, 'codex');
  assert.equal(res.extension_id, 'soda-superpowers');
  assert.equal(res.subcommands[0].alias, 'soda-debug');
});

test('throws on unsupported provider target', () => {
  assert.throws(() => {
    compilePluginManifest(sampleManifest, 'unknown-cli');
  }, /Unsupported target provider/);
});

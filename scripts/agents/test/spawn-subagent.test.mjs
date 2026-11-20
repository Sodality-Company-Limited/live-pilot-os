import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexArgs, parseCodexOutput, spawnCodexSubagent } from '../lib/adapters/codex-adapter.mjs';
import { buildAntigravityArgs, parseAntigravityOutput, spawnAntigravitySubagent } from '../lib/adapters/antigravity-adapter.mjs';
import { spawnSubagent } from '../lib/subagent-spawner.mjs';

test('buildCodexArgs constructs non-interactive exec CLI arguments', () => {
  const args = buildCodexArgs({
    prompt: 'Fix one scoped bug',
    sandbox: 'workspace-write',
    worktree: true,
    cd: '/path/to/repo',
    model: 'o3-mini',
  });
  assert.ok(args.includes('exec'));
  assert.ok(args.includes('--sandbox'));
  assert.ok(args.includes('workspace-write'));
  assert.ok(args.includes('--worktree'));
  assert.ok(args.includes('--cd'));
  assert.ok(args.includes('/path/to/repo'));
  assert.ok(args.includes('--model'));
  assert.ok(args.includes('o3-mini'));
  assert.ok(args.includes('--json'));
  assert.equal(args[args.length - 1], 'Fix one scoped bug');
});

test('parseCodexOutput extracts status, changed files, and token metrics from JSONL / text', () => {
  const sampleJsonl = [
    JSON.stringify({ type: 'item.created', item: { type: 'message', role: 'assistant', text: 'Changes applied to src/index.ts' } }),
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 120, output_tokens: 45 } }),
  ].join('\n');

  const parsed = parseCodexOutput({
    stdout: sampleJsonl,
    stderr: '',
    exitCode: 0,
  });

  assert.equal(parsed.status, 'complete');
  assert.equal(parsed.inputTokens, 120);
  assert.equal(parsed.outputTokens, 45);
  assert.ok(parsed.summary.length > 0);
});

test('buildAntigravityArgs constructs print mode agy CLI arguments', () => {
  const args = buildAntigravityArgs({
    prompt: 'Run tests on touch map',
    sandbox: true,
    dangerouslySkipPermissions: true,
    model: 'gemini-2.5-pro',
    outputFormat: 'json',
    timeoutSeconds: 60,
  });
  assert.ok(args.includes('--print'));
  assert.ok(args.includes('--dangerously-skip-permissions'));
  assert.ok(args.includes('--sandbox'));
  assert.ok(args.includes('--output-format'));
  assert.ok(args.includes('json'));
  assert.ok(args.includes('--print-timeout'));
  assert.ok(args.includes('60s'));
  assert.ok(args.includes('--model'));
  assert.ok(args.includes('gemini-2.5-pro'));
  assert.equal(args[args.length - 1], 'Run tests on touch map');
});

test('parseAntigravityOutput parses json response and token estimation', () => {
  const jsonOutput = JSON.stringify({
    response: 'Task complete. All tests passing.',
    stats: { input_tokens: 250, output_tokens: 80 },
  });

  const parsed = parseAntigravityOutput({
    stdout: jsonOutput,
    stderr: '',
    exitCode: 0,
  });

  assert.equal(parsed.status, 'complete');
  assert.equal(parsed.inputTokens, 250);
  assert.equal(parsed.outputTokens, 80);
  assert.match(parsed.summary, /Task complete/);
});

test('spawnSubagent rejects invalid spawn request fail-closed', async () => {
  const res = await spawnSubagent({
    provider: 'codex',
    goalId: 'G-TEST-001',
    role: 'implementer',
    persona: 'developer-a and developer-b', // Invalid: multiple personas
    goalStatus: 'ready',
    mandate: 'Run step 1',
    touchMap: ['src/a.ts'],
  });

  assert.equal(res.status, 'rejected');
  assert.ok(res.errors.some((e) => e.includes('persona')));
});

test('spawnSubagent rejects unexecutable goal status', async () => {
  const res = await spawnSubagent({
    provider: 'antigravity',
    goalId: 'G-TEST-002',
    role: 'tester',
    persona: 'quality-engineer',
    goalStatus: 'draft', // Invalid: draft goals cannot be dispatched
    mandate: 'Run tests',
    touchMap: ['test/a.test.js'],
  });

  assert.equal(res.status, 'rejected');
  assert.ok(res.errors.some((e) => e.includes('not executable')));
});

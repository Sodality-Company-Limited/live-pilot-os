import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiArgs, parseGeminiOutput } from '../lib/adapters/gemini-adapter.mjs';
import { buildClaudeArgs, parseClaudeOutput } from '../lib/adapters/claude-adapter.mjs';
import { buildAiderArgs, parseAiderOutput } from '../lib/adapters/aider-adapter.mjs';
import { buildOllamaArgs, parseOllamaOutput } from '../lib/adapters/ollama-adapter.mjs';
import { buildGooseArgs, parseGooseOutput } from '../lib/adapters/goose-adapter.mjs';

test('buildGeminiArgs builds non-interactive prompt arguments with yolo mode', () => {
  const args = buildGeminiArgs({
    prompt: 'Implement feature in src/app.js',
    model: 'gemini-2.5-pro',
    worktree: true,
    sandbox: true,
    approvalMode: 'yolo',
  });
  assert.ok(args.includes('-p'));
  assert.ok(args.includes('Implement feature in src/app.js'));
  assert.ok(args.includes('-m'));
  assert.ok(args.includes('gemini-2.5-pro'));
  assert.ok(args.includes('-w'));
  assert.ok(args.includes('-s'));
  assert.ok(args.includes('--approval-mode'));
  assert.ok(args.includes('yolo'));
});

test('parseGeminiOutput extracts status and changed files', () => {
  const output = parseGeminiOutput({
    stdout: 'Created src/app.js and modified package.json. All tasks finished.',
    stderr: '',
    exitCode: 0,
  });
  assert.equal(output.status, 'complete');
  assert.ok(output.changedFiles.includes('src/app.js') || output.changedFiles.includes('package.json'));
});

test('buildClaudeArgs builds non-interactive claude -p arguments', () => {
  const args = buildClaudeArgs({
    prompt: 'Fix scoped bug in payment.ts',
    model: 'claude-3-7-sonnet',
    dangerouslySkipPermissions: true,
    outputFormat: 'json',
  });
  assert.ok(args.includes('-p'));
  assert.ok(args.includes('Fix scoped bug in payment.ts'));
  assert.ok(args.includes('--model'));
  assert.ok(args.includes('claude-3-7-sonnet'));
  assert.ok(args.includes('--dangerously-skip-permissions'));
  assert.ok(args.includes('--output-format'));
  assert.ok(args.includes('json'));
});

test('parseClaudeOutput parses JSON structured result with tokens', () => {
  const sampleJson = JSON.stringify({
    result: 'Bug fixed cleanly',
    usage: { input_tokens: 300, output_tokens: 150 },
    changed_files: ['payment.ts'],
  });
  const output = parseClaudeOutput({
    stdout: sampleJson,
    stderr: '',
    exitCode: 0,
  });
  assert.equal(output.status, 'complete');
  assert.equal(output.inputTokens, 300);
  assert.equal(output.outputTokens, 150);
  assert.deepEqual(output.changedFiles, ['payment.ts']);
});

test('buildAiderArgs builds headless non-interactive aider arguments', () => {
  const args = buildAiderArgs({
    prompt: 'Refactor database adapter',
    model: 'claude-3-7-sonnet',
    touchMap: ['src/db.ts'],
    yesAlways: true,
  });
  assert.ok(args.includes('--message'));
  assert.ok(args.includes('Refactor database adapter'));
  assert.ok(args.includes('--yes-always'));
  assert.ok(args.includes('--no-stream'));
  assert.ok(args.includes('--model'));
  assert.ok(args.includes('claude-3-7-sonnet'));
  assert.ok(args.includes('src/db.ts'));
});

test('parseAiderOutput extracts changed files and summary', () => {
  const stdout = 'Applied edit to src/db.ts\nCommit 1234abc: Refactor database adapter';
  const output = parseAiderOutput({
    stdout,
    stderr: '',
    exitCode: 0,
  });
  assert.equal(output.status, 'complete');
  assert.ok(output.changedFiles.includes('src/db.ts'));
});

test('buildOllamaArgs builds local ollama run arguments', () => {
  const args = buildOllamaArgs({
    prompt: 'Check code for errors',
    model: 'gemma4',
    format: 'json',
    hidethinking: true,
  });
  assert.equal(args[0], 'run');
  assert.equal(args[1], 'gemma4');
  assert.equal(args[2], 'Check code for errors');
  assert.ok(args.includes('--format'));
  assert.ok(args.includes('json'));
  assert.ok(args.includes('--hidethinking'));
});

test('parseOllamaOutput parses json response', () => {
  const output = parseOllamaOutput({
    stdout: JSON.stringify({ response: 'No syntax errors found', status: 'clean' }),
    stderr: '',
    exitCode: 0,
  });
  assert.equal(output.status, 'complete');
  assert.match(output.summary, /No syntax errors found/);
});

test('buildGooseArgs builds headless goose run arguments', () => {
  const args = buildGooseArgs({
    prompt: 'Run unit test checks',
  });
  assert.equal(args[0], 'run');
  assert.ok(args.includes('--text'));
  assert.ok(args.includes('Run unit test checks'));
});

test('parseGooseOutput extracts status', () => {
  const output = parseGooseOutput({
    stdout: 'All checks passed successfully.',
    stderr: '',
    exitCode: 0,
  });
  assert.equal(output.status, 'complete');
});

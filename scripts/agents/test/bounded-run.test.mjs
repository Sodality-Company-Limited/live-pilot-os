import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bounded-run.mjs');

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

test('returns compact redacted evidence for a failed command', async () => {
  const result = await run(['node', '-e', 'console.error("token=secret-value"); process.exit(1)']);
  const evidence = JSON.parse(result.out);
  assert.equal(result.code, 1);
  assert.equal(evidence.status, 'needs-review');
  assert.match(evidence.stderr[0], /token=\[REDACTED\]/);
});

test('returns blocked when command exceeds timeout', async () => {
  const result = await run(['node', '-e', 'setTimeout(() => {}, 5000)'], {
    AGENT_COMMAND_TIMEOUT_MS: '50',
  });
  const evidence = JSON.parse(result.out);
  assert.equal(result.code, 124);
  assert.equal(evidence.status, 'blocked');
  assert.equal(evidence.timed_out, true);
});

test('limits captured output lines', async () => {
  const result = await run(['node', '-e', 'console.log(Array.from({length: 20}, (_, i) => i).join("\\n"))'], {
    AGENT_MAX_OUTPUT_LINES: '3',
  });
  const evidence = JSON.parse(result.out);
  assert.equal(result.code, 0);
  assert.ok(evidence.stdout.length <= 3);
});

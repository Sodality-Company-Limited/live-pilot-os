import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spawnerPath = path.resolve(__dirname, '..', 'spawn-subagent.mjs');

function runCli(args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [spawnerPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('CLI prints help on --help', async () => {
  const { code, stdout } = await runCli(['--help']);
  assert.equal(code, 0);
  assert.match(stdout, /Soda OS.*Subagent Spawner CLI/);
  assert.match(stdout, /--provider/);
});

test('CLI exits with code 2 on missing required arguments', async () => {
  const { code, stdout } = await runCli(['--goal', 'G-001']);
  assert.equal(code, 2);
  assert.match(stdout, /Required Options:/);
});

test('CLI rejects non-executable goal status and emits JSON error', async () => {
  const { code, stderr } = await runCli([
    '--provider', 'codex',
    '--goal', 'G-TEST-999',
    '--role', 'implementer',
    '--persona', 'unit-tester',
    '--task', 'Do work',
    '--status', 'draft',
    '--touch', 'src/app.ts',
  ]);
  assert.equal(code, 1);
  assert.match(stderr, /goal status is not executable: draft/);
});

test('CLI rejects multiple personas and emits JSON error', async () => {
  const { code, stderr } = await runCli([
    '--provider', 'antigravity',
    '--goal', 'G-TEST-999',
    '--role', 'implementer',
    '--persona', 'tester-1 and tester-2',
    '--task', 'Do work',
    '--touch', 'src/app.ts',
  ]);
  assert.equal(code, 1);
  assert.match(stderr, /persona must identify exactly one persona/);
});

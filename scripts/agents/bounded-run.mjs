#!/usr/bin/env node
/** Run one bounded command and emit compact, secret-redacted JSON evidence. */
import { spawn } from 'node:child_process';

const [,, command, ...args] = process.argv;
if (!command) {
  console.error('Usage: node scripts/agents/bounded-run.mjs <command> [args...]');
  process.exit(2);
}

const timeoutMs = Number(process.env.AGENT_COMMAND_TIMEOUT_MS ?? 300_000);
const maxLines = Number(process.env.AGENT_MAX_OUTPUT_LINES ?? 120);
const redact = (value) => value
  .replace(/(authorization|cookie|token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');

const child = spawn(command, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  detached: process.platform !== 'win32',
});
let stdout = '';
let stderr = '';
let timedOut = false;
const collect = (target, chunk) => {
  const next = `${target}${chunk}`;
  return next.split('\n').slice(-maxLines * 2).join('\n');
};
child.stdout.on('data', (chunk) => { stdout = collect(stdout, chunk); });
child.stderr.on('data', (chunk) => { stderr = collect(stderr, chunk); });

const timer = setTimeout(() => {
  timedOut = true;
  const kill = (signal) => {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch { /* process already exited */ }
  };
  kill('SIGTERM');
  setTimeout(() => kill('SIGKILL'), 10_000).unref();
}, timeoutMs);

const cancel = () => {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
  } catch { /* process already exited */ }
};
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);

child.on('close', (code, signal) => {
  clearTimeout(timer);
  const lines = (value) => redact(value).split('\n').filter(Boolean).slice(-maxLines);
  const status = timedOut ? 'blocked' : code === 0 ? 'complete' : 'needs-review';
  process.stdout.write(`${JSON.stringify({
    status,
    command: [command, ...args],
    exit_code: code,
    signal,
    timed_out: timedOut,
    stdout: lines(stdout),
    stderr: lines(stderr),
  })}\n`);
  process.exit(timedOut ? 124 : code ?? 1);
});

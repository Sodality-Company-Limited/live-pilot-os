/**
 * Goose CLI Adapter for Soda OS Subagents.
 * Interacts with `goose` CLI non-interactively using `goose run --text`.
 */
import { spawn } from 'node:child_process';
import { runBoundedProviderSession } from '../provider-session-harness.mjs';

export function buildGooseArgs(options = {}) {
  const {
    prompt,
    model,
    provider,
  } = options;

  const args = ['run'];

  if (prompt) {
    args.push('--text', prompt);
  }

  if (model) {
    args.push('--model', model);
  }

  if (provider) {
    args.push('--provider', provider);
  }

  return args;
}

export function parseGooseOutput({ stdout = '', stderr = '', exitCode = 0, timedOut = false }) {
  let inputTokens = 0;
  let outputTokens = 0;
  const changedFiles = new Set();

  const fileMatches = stdout.match(/(?:Created|Modified|Updated|Wrote)\s+([^\s,;]+)/gi);
  if (fileMatches) {
    for (const match of fileMatches) {
      const parts = match.split(/\s+/);
      if (parts[1] && (parts[1].includes('/') || parts[1].includes('.'))) {
        changedFiles.add(parts[1].replace(/[`'"]/g, ''));
      }
    }
  }

  inputTokens = Math.max(1, Math.ceil(stdout.length / 4));
  outputTokens = Math.max(1, Math.ceil((stdout.length + stderr.length) / 8));

  const status = timedOut ? 'blocked' : exitCode === 0 ? 'complete' : 'needs-review';

  return {
    status,
    exitCode,
    timedOut,
    inputTokens,
    outputTokens,
    changedFiles: Array.from(changedFiles),
    summary: stdout.slice(-1000).trim(),
    stderr: stderr.trim(),
  };
}

export async function spawnGooseSubagent({
  prompt,
  budget,
  model,
  provider,
  cd = process.cwd(),
  gooseBin = 'goose',
  timeoutMs = 300_000,
  onTelemetry,
}) {
  const args = buildGooseArgs({
    prompt,
    model,
    provider,
  });

  let child;
  let stdoutData = '';
  let stderrData = '';
  let processExitCode = null;
  let timedOut = false;

  const session = await runBoundedProviderSession({
    budget,
    start: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        child = spawn(gooseBin, args, {
          cwd: cd,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 5000).unref();
          } catch {}
        }, timeoutMs);

        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          try { child.kill('SIGTERM'); } catch {}
        });

        child.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });
        child.on('error', (err) => { clearTimeout(timer); reject(err); });
        child.on('close', (code) => { clearTimeout(timer); processExitCode = code; resolve(); });
      });
    },
    onTelemetry,
    onCleanup: async () => {
      if (child && !child.killed && child.exitCode === null) {
        try { child.kill('SIGKILL'); } catch {}
      }
    },
  });

  const parsed = parseGooseOutput({
    stdout: stdoutData,
    stderr: stderrData,
    exitCode: processExitCode,
    timedOut,
  });

  return { ...parsed, session };
}

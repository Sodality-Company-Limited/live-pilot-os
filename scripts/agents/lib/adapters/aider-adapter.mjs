/**
 * Aider CLI Adapter for Soda OS Subagents.
 * Interacts with `aider` CLI non-interactively using `--message` and `--yes-always`.
 */
import { spawn } from 'node:child_process';
import { runBoundedProviderSession } from '../provider-session-harness.mjs';

export function buildAiderArgs(options = {}) {
  const {
    prompt,
    model,
    touchMap = [],
    yesAlways = true,
    noStream = true,
  } = options;

  const args = [];

  if (prompt) {
    args.push('--message', prompt);
  }

  if (yesAlways) {
    args.push('--yes-always');
  }

  if (noStream) {
    args.push('--no-stream');
  }

  if (model) {
    args.push('--model', model);
  }

  for (const file of touchMap) {
    args.push(file);
  }

  return args;
}

export function parseAiderOutput({ stdout = '', stderr = '', exitCode = 0, timedOut = false }) {
  let inputTokens = 0;
  let outputTokens = 0;
  const changedFiles = new Set();

  const fileMatches = stdout.match(/(?:Applied edit to|Commit [0-9a-f]+:\s*.*|modified:\s*)([^\s\n\r]+)/gi);
  if (fileMatches) {
    for (const match of fileMatches) {
      const parts = match.trim().split(/\s+/);
      const file = parts[parts.length - 1];
      if (file && (file.includes('/') || file.includes('.'))) {
        changedFiles.add(file.replace(/[`'"]/g, ''));
      }
    }
  }

  // Also match general path patterns mentioned in aider diff summaries
  const genericPathMatches = stdout.match(/(?:(?:src|test|tests|lib|scripts|docs)\/[^\s,;\n\r]+)/g);
  if (genericPathMatches) {
    for (const file of genericPathMatches) {
      changedFiles.add(file.replace(/[`'"]/g, ''));
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

export async function spawnAiderSubagent({
  prompt,
  budget,
  model,
  touchMap = [],
  yesAlways = true,
  noStream = true,
  cd = process.cwd(),
  aiderBin = 'aider',
  timeoutMs = 300_000,
  onTelemetry,
}) {
  const args = buildAiderArgs({
    prompt,
    model,
    touchMap,
    yesAlways,
    noStream,
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
        child = spawn(aiderBin, args, {
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

  const parsed = parseAiderOutput({
    stdout: stdoutData,
    stderr: stderrData,
    exitCode: processExitCode,
    timedOut,
  });

  return { ...parsed, session };
}

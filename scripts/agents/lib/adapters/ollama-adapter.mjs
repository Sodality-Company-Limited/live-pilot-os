/**
 * Ollama CLI Adapter for Soda OS Subagents.
 * Interacts with local `ollama` CLI non-interactively using `ollama run`.
 */
import { spawn } from 'node:child_process';
import { runBoundedProviderSession } from '../provider-session-harness.mjs';

export function buildOllamaArgs(options = {}) {
  const {
    prompt,
    model = 'gemma4',
    format = 'json',
    hidethinking = true,
  } = options;

  const args = ['run', model];

  if (prompt) {
    args.push(prompt);
  }

  if (format) {
    args.push('--format', format);
  }

  if (hidethinking) {
    args.push('--hidethinking');
  }

  return args;
}

export function parseOllamaOutput({ stdout = '', stderr = '', exitCode = 0, timedOut = false }) {
  let inputTokens = 0;
  let outputTokens = 0;
  let summary = '';
  const changedFiles = new Set();

  const trimmed = stdout.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      summary = data.response || data.message || data.text || '';
      if (Array.isArray(data.changed_files)) {
        for (const f of data.changed_files) changedFiles.add(f);
      }
    } catch {}
  }

  if (!summary) {
    summary = stdout.trim();
  }

  inputTokens = Math.max(1, Math.ceil(stdout.length / 4));
  outputTokens = Math.max(1, Math.ceil(summary.length / 4));

  const status = timedOut ? 'blocked' : exitCode === 0 ? 'complete' : 'needs-review';

  return {
    status,
    exitCode,
    timedOut,
    inputTokens,
    outputTokens,
    changedFiles: Array.from(changedFiles),
    summary: summary || stdout.slice(-1000).trim(),
    stderr: stderr.trim(),
  };
}

export async function spawnOllamaSubagent({
  prompt,
  budget,
  model = 'gemma4',
  format = 'json',
  hidethinking = true,
  cd = process.cwd(),
  ollamaBin = 'ollama',
  timeoutMs = 300_000,
  onTelemetry,
}) {
  const args = buildOllamaArgs({
    prompt,
    model,
    format,
    hidethinking,
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
        child = spawn(ollamaBin, args, {
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

  const parsed = parseOllamaOutput({
    stdout: stdoutData,
    stderr: stderrData,
    exitCode: processExitCode,
    timedOut,
  });

  return { ...parsed, session };
}

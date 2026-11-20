/**
 * Antigravity CLI (agy) Adapter for Soda OS Subagents.
 * Interacts with local `agy` binary in print mode (`agy --print`).
 */
import { spawn } from 'node:child_process';
import { runBoundedProviderSession } from '../provider-session-harness.mjs';

/**
 * Builds the exact CLI arguments for invoking `agy`.
 */
export function buildAntigravityArgs(options = {}) {
  const {
    prompt,
    sandbox = true,
    dangerouslySkipPermissions = true,
    model,
    effort,
    outputFormat = 'json',
    timeoutSeconds = 300,
    addDirs = [],
    project,
  } = options;

  const args = ['--print'];

  if (dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (sandbox) {
    args.push('--sandbox');
  }

  if (outputFormat) {
    args.push('--output-format', outputFormat);
  }

  if (timeoutSeconds) {
    args.push('--print-timeout', `${timeoutSeconds}s`);
  }

  if (model) {
    args.push('--model', model);
  }

  if (effort) {
    args.push('--effort', effort);
  }

  if (project) {
    args.push('--project', project);
  }

  for (const dir of addDirs) {
    args.push('--add-dir', dir);
  }

  if (prompt) {
    args.push(prompt);
  }

  return args;
}

/**
 * Parses Antigravity CLI output.
 */
export function parseAntigravityOutput({ stdout = '', stderr = '', exitCode = 0, timedOut = false }) {
  let inputTokens = 0;
  let outputTokens = 0;
  let summary = '';
  const changedFiles = new Set();

  const trimmed = stdout.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      summary = data.response || data.text || data.summary || data.message || '';
      if (data.stats || data.usage) {
        const u = data.stats || data.usage;
        inputTokens = Number(u.input_tokens || u.prompt_tokens || 0);
        outputTokens = Number(u.output_tokens || u.completion_tokens || 0);
      }
      if (Array.isArray(data.changed_files || data.files)) {
        for (const f of data.changed_files || data.files) changedFiles.add(f);
      }
    } catch {}
  }

  if (!summary) {
    summary = stdout.trim();
  }

  // Token fallback if not explicitly provided
  if (inputTokens === 0 && outputTokens === 0) {
    inputTokens = Math.max(1, Math.ceil(stdout.length / 4));
    outputTokens = Math.max(1, Math.ceil(summary.length / 4));
  }

  // Detect file modifications mentioned in summary
  const fileMatches = summary.match(/(?:created|modified|updated|wrote)\s+([^\s,;]+)/gi);
  if (fileMatches) {
    for (const match of fileMatches) {
      const parts = match.split(/\s+/);
      if (parts[1] && (parts[1].includes('/') || parts[1].includes('.'))) {
        changedFiles.add(parts[1].replace(/[`'"]/g, ''));
      }
    }
  }

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

/**
 * Spawns an Antigravity subagent process with budget observation and timeout limits.
 */
export async function spawnAntigravitySubagent({
  prompt,
  budget,
  sandbox = true,
  dangerouslySkipPermissions = true,
  model,
  effort,
  outputFormat = 'json',
  timeoutSeconds = 300,
  addDirs = [],
  project,
  cd = process.cwd(),
  agyBin = 'agy',
  onTelemetry,
}) {
  const args = buildAntigravityArgs({
    prompt,
    sandbox,
    dangerouslySkipPermissions,
    model,
    effort,
    outputFormat,
    timeoutSeconds,
    addDirs,
    project,
  });

  let child;
  let stdoutData = '';
  let stderrData = '';
  let processExitCode = null;
  let timedOut = false;

  const session = await runBoundedProviderSession({
    budget,
    start: async ({ signal, observe }) => {
      await new Promise((resolve, reject) => {
        child = spawn(agyBin, args, {
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
        }, (timeoutSeconds + 10) * 1000);

        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          try {
            child.kill('SIGTERM');
          } catch {}
        });

        child.stdout.on('data', (chunk) => {
          stdoutData += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          processExitCode = code;
          resolve();
        });
      });
    },
    onTelemetry,
    onCleanup: async () => {
      if (child && !child.killed && child.exitCode === null) {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    },
  });

  const parsed = parseAntigravityOutput({
    stdout: stdoutData,
    stderr: stderrData,
    exitCode: processExitCode,
    timedOut,
  });

  return {
    ...parsed,
    session,
  };
}

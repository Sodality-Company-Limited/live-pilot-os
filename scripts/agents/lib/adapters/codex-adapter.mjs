/**
 * Codex CLI Adapter for Soda OS Subagents.
 * Interacts with local `codex` binary non-interactively using `codex exec`.
 */
import { spawn } from 'node:child_process';
import { runBoundedProviderSession } from '../provider-session-harness.mjs';

/**
 * Builds the exact CLI arguments for invoking `codex exec`.
 */
export function buildCodexArgs(options = {}) {
  const {
    prompt,
    sandbox = 'workspace-write',
    worktree = false,
    cd,
    model,
    profile,
    outputSchema,
    dangerouslyBypassApprovals = false,
  } = options;

  const args = ['exec'];

  if (dangerouslyBypassApprovals) {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  } else if (sandbox) {
    args.push('--sandbox', sandbox);
  }

  if (worktree) {
    args.push('--worktree');
  }

  if (cd) {
    args.push('--cd', cd);
  }

  if (model) {
    args.push('--model', model);
  }

  if (profile) {
    args.push('--profile', profile);
  }

  if (outputSchema) {
    args.push('--output-schema', outputSchema);
  }

  // Use JSON output for programmatic telemetry and event inspection
  args.push('--json');

  if (prompt) {
    args.push(prompt);
  }

  return args;
}

/**
 * Parses Codex CLI JSONL and stdout output.
 */
export function parseCodexOutput({ stdout = '', stderr = '', exitCode = 0, timedOut = false }) {
  let inputTokens = 0;
  let outputTokens = 0;
  const messages = [];
  const changedFiles = new Set();

  const lines = stdout.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    try {
      const event = JSON.parse(line);
      if (event.usage) {
        if (event.usage.input_tokens) inputTokens += Number(event.usage.input_tokens);
        if (event.usage.output_tokens) outputTokens += Number(event.usage.output_tokens);
      }
      if (event.item && event.item.text) {
        messages.push(event.item.text);
      } else if (event.text) {
        messages.push(event.text);
      }
      if (event.type === 'file.modified' && event.path) {
        changedFiles.add(event.path);
      }
    } catch {
      // Non-JSON line (fallback log)
      if (line.includes('Modified: ') || line.includes('Updated: ')) {
        const fileMatch = line.match(/(?:Modified|Updated):\s*([^\s]+)/i);
        if (fileMatch) changedFiles.add(fileMatch[1]);
      }
    }
  }

  // Fallback token estimation if CLI didn't emit usage events
  if (inputTokens === 0 && outputTokens === 0) {
    inputTokens = Math.max(1, Math.ceil(stdout.length / 4));
    outputTokens = Math.max(1, Math.ceil((stdout.length + stderr.length) / 8));
  }

  const status = timedOut ? 'blocked' : exitCode === 0 ? 'complete' : 'needs-review';

  return {
    status,
    exitCode,
    timedOut,
    inputTokens,
    outputTokens,
    changedFiles: Array.from(changedFiles),
    summary: messages.join('\n') || stdout.slice(-1000).trim(),
    stderr: stderr.trim(),
  };
}

/**
 * Spawns a Codex subagent process with budget observation and timeout limits.
 */
export async function spawnCodexSubagent({
  prompt,
  budget,
  sandbox = 'workspace-write',
  worktree = false,
  cd = process.cwd(),
  model,
  profile,
  outputSchema,
  dangerouslyBypassApprovals = false,
  // The unified spawner uses this provider-neutral option name. Keep the
  // Codex-specific flag as an alias so bounded Soda sessions actually use
  // the requested non-interactive execution mode.
  dangerouslySkipPermissions = false,
  timeoutMs = 300_000,
  codexBin = 'codex',
  onTelemetry,
}) {
  const args = buildCodexArgs({
    prompt,
    sandbox,
    worktree,
    cd,
    model,
    profile,
    outputSchema,
    dangerouslyBypassApprovals: dangerouslyBypassApprovals || dangerouslySkipPermissions,
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
        child = spawn(codexBin, args, {
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
          try {
            child.kill('SIGTERM');
          } catch {}
        });

        child.stdout.on('data', (chunk) => {
          const str = chunk.toString();
          stdoutData += str;
          // Dynamically observe tokens from incremental stream if present
          const m = str.match(/"input_tokens":\s*(\d+).*?"output_tokens":\s*(\d+)/);
          if (m) {
            observe({ inputTokens: Number(m[1]), outputTokens: Number(m[2]) });
          }
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

  const parsed = parseCodexOutput({
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

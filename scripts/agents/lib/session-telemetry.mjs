import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);

export function failureFingerprint({ command, exitCode, error, paths = [] }) {
  return digest([command, exitCode, error, ...[...paths].sort()].join('\n'));
}

export function compactSessionRecord(input) {
  return {
    timestamp: new Date().toISOString(), goalId: input.goalId, role: input.role, persona: input.persona ?? null,
    sessionKey: input.sessionKey ?? null, turns: input.turns ?? 0,
    inputTokens: input.inputTokens ?? 0, outputTokens: input.outputTokens ?? 0,
    childAgents: input.childAgents ?? 0, elapsedSeconds: input.elapsedSeconds ?? 0,
    stopReason: input.stopReason ?? 'unknown', failureFingerprint: input.failureFingerprint ?? null,
  };
}

export async function appendSessionRecord(record, repoRoot = process.cwd()) {
  const dir = path.join(repoRoot, '.agents', 'telemetry');
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(path.join(dir, 'sessions.jsonl'), `${JSON.stringify(compactSessionRecord(record))}\n`);
}

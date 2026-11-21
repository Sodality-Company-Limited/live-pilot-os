import fs from 'node:fs';
import path from 'node:path';

const fallback = Object.freeze({
  maxContextBytes: 120_000,
  maxChildren: 3,
  maxTouchFiles: 40,
  maxInputTokens: 24_000,
  maxOutputTokens: 8_000,
  workerMaxTurns: 12,
  workerMaxTokens: 30_000,
  autoReapOnHandoff: true,
});

/** Read the small scalar budget subset without requiring an external YAML package. */
export function loadRuntimeBudget(repoRoot = process.cwd()) {
  const file = path.join(repoRoot, '.agents', 'runtime-budget.yaml');
  let source = '';
  try { source = fs.readFileSync(file, 'utf8'); } catch { return { ...fallback }; }
  const read = (key, defaultValue) => {
    const match = source.match(new RegExp(`^\\s+${key}:\\s*([0-9]+)\\s*$`, 'm'));
    return match ? Number(match[1]) : defaultValue;
  };
  const readBool = (key, defaultValue) => {
    const match = source.match(new RegExp(`^\\s+${key}:\\s*(true|false)\\s*$`, 'm'));
    return match ? match[1] === 'true' : defaultValue;
  };
  return {
    maxContextBytes: read('max_context_bytes', fallback.maxContextBytes),
    maxChildren: read('max_parallel_agents', fallback.maxChildren),
    maxTouchFiles: read('max_touch_files', fallback.maxTouchFiles),
    maxInputTokens: read('max_input_tokens', fallback.maxInputTokens),
    maxOutputTokens: read('max_output_tokens', fallback.maxOutputTokens),
    workerMaxTurns: read('worker_max_turns', fallback.workerMaxTurns),
    workerMaxTokens: read('worker_max_tokens', fallback.workerMaxTokens),
    autoReapOnHandoff: readBool('auto_reap_on_handoff', fallback.autoReapOnHandoff),
  };
}

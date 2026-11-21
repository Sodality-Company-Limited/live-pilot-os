/**
 * Adapter Registry for Soda OS Subagents.
 */
import { spawnCodexSubagent } from './codex-adapter.mjs';
import { spawnAntigravitySubagent } from './antigravity-adapter.mjs';
import { spawnGeminiSubagent } from './gemini-adapter.mjs';
import { spawnClaudeSubagent } from './claude-adapter.mjs';
import { spawnAiderSubagent } from './aider-adapter.mjs';
import { spawnOllamaSubagent } from './ollama-adapter.mjs';
import { spawnGooseSubagent } from './goose-adapter.mjs';

export const ADAPTER_REGISTRY = {
  codex: {
    name: 'Codex CLI',
    binary: 'codex',
    spawn: spawnCodexSubagent,
  },
  antigravity: {
    name: 'Antigravity CLI',
    binary: 'agy',
    aliases: ['agy'],
    spawn: spawnAntigravitySubagent,
  },
  gemini: {
    name: 'Gemini CLI',
    binary: 'gemini',
    aliases: ['google-gemini'],
    spawn: spawnGeminiSubagent,
  },
  claude: {
    name: 'Claude Code CLI',
    binary: 'claude',
    aliases: ['claude-code'],
    spawn: spawnClaudeSubagent,
  },
  aider: {
    name: 'Aider CLI',
    binary: 'aider',
    spawn: spawnAiderSubagent,
  },
  ollama: {
    name: 'Ollama CLI',
    binary: 'ollama',
    spawn: spawnOllamaSubagent,
  },
  goose: {
    name: 'Goose CLI',
    binary: 'goose',
    spawn: spawnGooseSubagent,
  },
};

export function resolveProvider(name = 'codex') {
  const normalized = String(name).toLowerCase().trim();
  if (ADAPTER_REGISTRY[normalized]) return ADAPTER_REGISTRY[normalized];

  for (const [key, adapter] of Object.entries(ADAPTER_REGISTRY)) {
    if (adapter.aliases && adapter.aliases.includes(normalized)) {
      return adapter;
    }
  }

  return null;
}

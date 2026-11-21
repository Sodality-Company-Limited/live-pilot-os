import crypto from 'node:crypto';
import { loadRuntimeBudget } from './runtime-budget.mjs';

export function sessionKey({ goalId, role, persona, promptHash = '', touchMap = [] }) {
  const normalized = [goalId, role, persona, promptHash, ...[...touchMap].sort()].join('\n');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function validateSpawnRequest(request, activeKeys = new Set(), usedPromptHashes = new Set()) {
  const limits = loadRuntimeBudget(request.repoRoot);
  const errors = [];
  const touchMap = Array.isArray(request.touchMap) ? request.touchMap : [];
  if (!request.goalId) errors.push('missing goalId');
  if (!request.role) errors.push('missing role');
  if (!request.persona) errors.push('missing persona');
  if (Array.isArray(request.persona) || typeof request.persona !== 'string') {
    errors.push('persona must be exactly one string');
  } else if (request.persona.trim().split(/\s*(?:,|\||\band\b)\s*/i).filter(Boolean).length !== 1) {
    errors.push('persona must identify exactly one persona');
  }
  if (request.promptHash && usedPromptHashes.has(`${request.goalId}:${request.promptHash}`)) {
    errors.push('duplicate input prompt for goal');
  }
  if (request.goalStatus && request.goalStatus !== 'ready' && request.goalStatus !== 'in_progress') {
    errors.push(`goal status is not executable: ${request.goalStatus}`);
  }
  if (touchMap.length === 0) errors.push('empty touch map');
  if (touchMap.length > limits.maxTouchFiles) errors.push('touch map exceeds file limit');
  if ((request.contextBytes ?? 0) > limits.maxContextBytes) errors.push('context exceeds byte budget');
  if ((request.childCount ?? 0) >= limits.maxChildren) errors.push('parallel child limit reached');
  const key = sessionKey({ ...request, touchMap });
  if (activeKeys.has(key)) errors.push('duplicate active session');
  return { allowed: errors.length === 0, errors, key, limits };
}

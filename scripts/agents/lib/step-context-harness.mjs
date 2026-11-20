import crypto from 'node:crypto';

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_INPUT_TOKENS = 12000;

const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/**
 * Compile the smallest input packet needed for one subagent step.
 * Full goal documents must remain coordinator-only and are intentionally not accepted.
 */
export function compileStepContextPacket(input, options = {}) {
  const allowedFiles = [...new Set(input.allowedFiles ?? [])];
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const packet = {
    goalId: input.goalId,
    stepId: input.stepId,
    role: input.role,
    persona: input.persona,
    objective: input.objective,
    acceptance: [...(input.acceptance ?? [])],
    allowedFiles,
    excerpts: [...(input.excerpts ?? [])],
    contextDigest: input.contextDigest ?? null,
    blockers: [...(input.blockers ?? [])],
    verificationCommand: input.verificationCommand,
  };
  const validation = validateStepContextPacket(packet, options);
  if (!validation.valid) return { packet: null, ...validation };
  return { packet: { ...packet, packetHash: hash(packet) }, ...validation };
}

export function validateStepContextPacket(packet, options = {}) {
  const errors = [];
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxInputTokens = options.maxInputTokens ?? DEFAULT_MAX_INPUT_TOKENS;
  const forbidden = ['goal', 'goalCard', 'goalFile', 'fullGoal', 'fullWorkPlan', 'repositoryContext', 'wikiCorpus'];

  for (const field of forbidden) {
    if (Object.hasOwn(packet, field)) errors.push(`full context field is forbidden: ${field}`);
  }
  if (!packet.goalId) errors.push('missing goalId');
  if (!packet.stepId) errors.push('missing stepId');
  if (!packet.role) errors.push('missing role');
  if (!packet.persona || typeof packet.persona !== 'string') errors.push('exactly one persona is required');
  if (!packet.objective) errors.push('missing step objective');
  if (!packet.verificationCommand) errors.push('missing verification command');
  if (!Array.isArray(packet.allowedFiles) || packet.allowedFiles.length === 0) errors.push('empty allowed files');
  if ((packet.allowedFiles?.length ?? 0) > maxFiles) errors.push(`allowed files exceed limit: ${maxFiles}`);

  const estimatedInputTokens = Math.ceil(Buffer.byteLength(JSON.stringify(packet), 'utf8') / 4);
  if (estimatedInputTokens > maxInputTokens) errors.push(`input tokens exceed limit: ${maxInputTokens}`);
  return { valid: errors.length === 0, errors, estimatedInputTokens };
}

export function isDuplicateStepContext(packet, seenHashes = new Set()) {
  const key = `${packet.goalId}:${packet.packetHash ?? hash(packet)}`;
  return { duplicate: seenHashes.has(key), key };
}

/**
 * Acquire an exclusive single-owner lease for LLM Wiki retrieval for a goal.
 * Exactly one dedicated context subagent may search the LLM Wiki per goal.
 * All other subagents must consume that digest and their touch-map files only.
 */
export function acquireWikiRetrievalLease(goalId, leaseHolderId, activeLeases = new Map(), options = {}) {
  if (!goalId || typeof goalId !== 'string') {
    return { allowed: false, error: 'goalId is required' };
  }
  if (!leaseHolderId || typeof leaseHolderId !== 'string') {
    return { allowed: false, error: 'leaseHolderId is required' };
  }

  const existing = activeLeases.get(goalId);
  const now = options.now ? options.now() : Date.now();
  const ttlMs = options.ttlMs ?? 300000; // 5 minutes default TTL

  if (existing) {
    if (existing.leaseHolderId === leaseHolderId) {
      // Re-entrant renewal by current holder
      existing.acquiredAt = now;
      existing.expiresAt = now + ttlMs;
      return { allowed: true, lease: existing, renewed: true };
    }
    if (now < existing.expiresAt) {
      return {
        allowed: false,
        error: `exclusive single-owner lease already held by ${existing.leaseHolderId}`,
        currentHolder: existing.leaseHolderId,
        expiresAt: existing.expiresAt,
      };
    }
    // Expired lease can be reclaimed
  }

  const lease = {
    goalId,
    leaseHolderId,
    acquiredAt: now,
    expiresAt: now + ttlMs,
  };
  activeLeases.set(goalId, lease);
  return { allowed: true, lease, renewed: false };
}

/**
 * Release an active single-owner LLM Wiki retrieval lease.
 */
export function releaseWikiRetrievalLease(goalId, leaseHolderId, activeLeases = new Map()) {
  if (!goalId || !leaseHolderId) {
    return { released: false, error: 'goalId and leaseHolderId are required' };
  }
  const existing = activeLeases.get(goalId);
  if (!existing) {
    return { released: false, error: `no active lease for goal: ${goalId}` };
  }
  if (existing.leaseHolderId !== leaseHolderId) {
    return {
      released: false,
      error: `lease is held by ${existing.leaseHolderId}, not ${leaseHolderId}`,
    };
  }
  activeLeases.delete(goalId);
  return { released: true, goalId, leaseHolderId };
}


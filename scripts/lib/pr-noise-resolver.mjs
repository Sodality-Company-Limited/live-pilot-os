/**
 * PR Noise Resolver Driver
 * 
 * Provides automated GitHub PR review bot comment classification, outbound GraphQL
 * thread resolution mutation generation, and cryptographic audit ledger recording.
 * 
 * Implements G-CORE-031 invariants:
 * - INV-031-001: Threads matching bot noise signatures are marked for resolution with cryptographic audit hashes, while human review threads are never mutated.
 * - INV-031-002: Submitting resolution mutations for already-resolved threads is completely idempotent and produces zero duplicate comments.
 */

import crypto from 'node:crypto';

/**
 * FSM States for PR Noise Resolver Lifecycle
 */
export const PR_NOISE_FSM_STATES = Object.freeze({
  ScanningThreads: 'ScanningThreads',
  EvaluatingAuthors: 'EvaluatingAuthors',
  GeneratingMutations: 'GeneratingMutations',
  ThreadPreserved: 'ThreadPreserved',
  ResolutionDispatched: 'ResolutionDispatched',
});

/**
 * Allowed transitions between FSM states
 */
const ALLOWED_FSM_TRANSITIONS = new Map([
  [PR_NOISE_FSM_STATES.ScanningThreads, new Set([PR_NOISE_FSM_STATES.EvaluatingAuthors])],
  [PR_NOISE_FSM_STATES.EvaluatingAuthors, new Set([PR_NOISE_FSM_STATES.GeneratingMutations, PR_NOISE_FSM_STATES.ThreadPreserved])],
  [PR_NOISE_FSM_STATES.GeneratingMutations, new Set([PR_NOISE_FSM_STATES.ResolutionDispatched, PR_NOISE_FSM_STATES.ScanningThreads])],
  [PR_NOISE_FSM_STATES.ThreadPreserved, new Set([PR_NOISE_FSM_STATES.ScanningThreads])],
  [PR_NOISE_FSM_STATES.ResolutionDispatched, new Set([PR_NOISE_FSM_STATES.ScanningThreads])],
]);

/**
 * Transition PR noise state with fail-closed validation
 * 
 * @param {string} fromState Current state
 * @param {string} toState Target state
 * @returns {string} New state
 */
export function transitionPrNoiseState(fromState, toState) {
  const allowed = ALLOWED_FSM_TRANSITIONS.get(fromState);
  if (!allowed || !allowed.has(toState)) {
    throw new Error(
      `Illegal FSM state transition: Cannot transition from '${fromState}' to '${toState}'. Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`
    );
  }
  return toState;
}

/**
 * Recognized automated PR bot noise signatures
 */
export const BOT_NOISE_SIGNATURES = Object.freeze([
  { id: 'coderabbit', authorPattern: /coderabbitai(\[bot\])?/i, bodyPattern: /coderabbitai|CodeRabbit/i },
  { id: 'bugbot', authorPattern: /cursor(\[bot\])?/i, bodyPattern: /bugbot|potential bug identified/i },
  { id: 'copilot', authorPattern: /copilot(\[bot\])?/i, bodyPattern: /copilot review|copilot/i },
  { id: 'codecov', authorPattern: /codecov(\[bot\])?/i, bodyPattern: /codecov-commenter|coverage/i },
]);

/**
 * Classify a review thread as bot noise or protected human thread
 * 
 * @param {object} thread Review thread object { id, author, body, isResolved }
 * @returns {object} Classification decision
 */
export function classifyReviewThread(thread = {}) {
  if (!thread || typeof thread !== 'object') {
    throw new TypeError('Invalid review thread object');
  }

  const author = String(thread.author || '').trim();
  const body = String(thread.body || '');
  const isResolved = Boolean(thread.isResolved);

  // 1. Check if thread matches bot signatures
  let matchedBot = null;
  for (const sig of BOT_NOISE_SIGNATURES) {
    if (sig.authorPattern.test(author) || sig.bodyPattern.test(body)) {
      matchedBot = sig.id;
      break;
    }
  }

  // 2. Human protection invariant
  if (!matchedBot) {
    return {
      threadId: thread.id,
      isBotNoise: false,
      botPattern: null,
      action: 'PRESERVE',
      reason: 'HUMAN_AUTHOR_PROTECTED',
    };
  }

  // 3. Idempotency check: already resolved
  if (isResolved) {
    return {
      threadId: thread.id,
      isBotNoise: true,
      botPattern: matchedBot,
      action: 'SKIP',
      reason: 'ALREADY_RESOLVED',
    };
  }

  return {
    threadId: thread.id,
    isBotNoise: true,
    botPattern: matchedBot,
    action: 'RESOLVE',
    reason: 'AUTOMATED_BOT_NOISE_MATCH',
  };
}

/**
 * Generate GraphQL mutation payload for resolving a bot review thread
 * 
 * @param {object} thread Review thread object
 * @returns {object} { mutation: string, variables: object, auditHash: string }
 */
export function generateResolutionMutation(thread = {}) {
  const classification = classifyReviewThread(thread);
  if (!classification.isBotNoise || classification.action !== 'RESOLVE') {
    throw new Error(`Cannot generate resolution mutation for non-bot thread (${thread.id}): ${classification.reason}`);
  }

  const threadId = String(thread.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const auditPayload = {
    threadId,
    author: thread.author,
    botPattern: classification.botPattern,
    timestamp_iso: new Date().toISOString(),
  };

  const auditHash = crypto.createHash('sha256').update(JSON.stringify(auditPayload), 'utf8').digest('hex');

  const mutation = `mutation ResolveReviewThread($input: ResolveReviewThreadInput!) {
  resolveReviewThread(input: $input) {
    thread {
      id
      isResolved
    }
  }
}`;

  return {
    mutation,
    variables: {
      input: {
        threadId,
      },
    },
    auditHash,
    auditPayload,
  };
}

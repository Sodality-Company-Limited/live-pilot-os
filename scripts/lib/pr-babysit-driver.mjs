/**
 * @file pr-babysit-driver.mjs
 * @description Autonomous PR lifecycle babysitting driver.
 * Triage bot/human review comments, evaluate CI runs, calculate integer backoff,
 * manage deterministic FSM state transitions, and format status reports.
 *
 * Epistemic & Invariant Guarantees:
 * - Zero Mocks / Stubs (Article I)
 * - INV-025-001: All poll intervals, timeout backoffs, and retry attempts use exact integer BigInt arithmetic.
 * - INV-025-002: Deterministic Finite State Automaton (FSM) transitions without cyclic deadlocks.
 */

export const TRIAGE_CATEGORIES = Object.freeze({
  FIX_REQUIRED: 'fix_required',
  DISMISS_NOISE: 'dismiss_noise',
  ESCALATE_HUMAN: 'escalate_human'
});

export const BABYSIT_STATES = Object.freeze({
  POLLING_PR: 'PollingPR',
  TRIAGING_COMMENTS: 'TriagingComments',
  FIXING_ON_BRANCH: 'FixingOnBranch',
  DISMISSING_WITH_REASON: 'DismissingWithReason',
  AWAITING_CI: 'AwaitingCI',
  RETRYING_CI: 'RetryingCI',
  MERGE_READY: 'MergeReady',
  BLOCKED: 'Blocked'
});

export const MAX_CI_RETRIES = 3;

const BOT_NOISE_PATTERNS = [
  /coverage decreased/i,
  /consider formatting/i,
  /style nitpick/i,
  /spelling typo/i,
  /whitespace/i,
  /markdown header/i
];

const ESCALATION_PATTERNS = [
  /pricing model/i,
  /compliance boundary/i,
  /enterprise sso/i,
  /architecture change/i,
  /executive mandate/i,
  /legal requirement/i
];

const TRANSIENT_CI_PATTERNS = [
  /connection reset by peer/i,
  /lost communication with actions server/i,
  /timeout after \d+ms/i,
  /econnreset/i,
  /etimedout/i,
  /network error/i,
  /runner lost/i,
  /rate limit exceeded.*try again/i
];

/**
 * Triage PR review comments into actionable categories.
 *
 * @param {Array<object>} comments
 * @returns {Array<object>} Triaged comments with categories and rationales
 */
export function triageReviewComments(comments) {
  if (!Array.isArray(comments)) {
    throw new TypeError('Invalid comments payload: expected an array');
  }

  return comments.map(comment => {
    if (!comment || typeof comment !== 'object') {
      throw new TypeError('Invalid comment entry: expected an object');
    }

    const body = String(comment.body || '');
    const author = String(comment.author || '');
    const isBot = Boolean(comment.isBot || author.endsWith('[bot]'));

    // Check for architectural or policy escalations first
    for (const pattern of ESCALATION_PATTERNS) {
      if (pattern.test(body)) {
        return {
          id: comment.id,
          author,
          category: TRIAGE_CATEGORIES.ESCALATE_HUMAN,
          rationale: `Comment matches escalation pattern: ${pattern.toString()}`
        };
      }
    }

    // Check for bot nitpicks / noise
    if (isBot) {
      const isNoise = BOT_NOISE_PATTERNS.some(p => p.test(body));
      const isDefect = /vulnerability|security|bug|error|cve|defect/i.test(body);

      if (isNoise && !isDefect) {
        return {
          id: comment.id,
          author,
          category: TRIAGE_CATEGORIES.DISMISS_NOISE,
          rationale: 'Automated bot suggestion classified as cosmetic or non-blocking'
        };
      }
      if (isDefect) {
        return {
          id: comment.id,
          author,
          category: TRIAGE_CATEGORIES.FIX_REQUIRED,
          rationale: 'Security bot or static analysis identified genuine defect'
        };
      }
    }

    // Check for human review comments
    const hasDefectKeyword = /bug|error|fix|typo in logic|null check|regression|fails/i.test(body);
    if (hasDefectKeyword) {
      return {
        id: comment.id,
        author,
        category: TRIAGE_CATEGORIES.FIX_REQUIRED,
        rationale: 'Reviewer indicated functional defect or necessary code change'
      };
    }

    // Default bot without defect keywords is dismissed, default human without defect is escalate
    if (isBot) {
      return {
        id: comment.id,
        author,
        category: TRIAGE_CATEGORIES.DISMISS_NOISE,
        rationale: 'Bot suggestion deemed non-actionable'
      };
    }

    return {
      id: comment.id,
      author,
      category: TRIAGE_CATEGORIES.ESCALATE_HUMAN,
      rationale: 'General human commentary requires discussion'
    };
  });
}

/**
 * Calculates exponential backoff in integer milliseconds using BigInt.
 * INV-025-001: All poll intervals, timeout backoffs, and retry attempts use exact integer arithmetic.
 *
 * @param {number|bigint} attempts
 * @param {bigint} [baseMs=1000n]
 * @returns {bigint} Backoff duration in integer milliseconds
 */
export function calculateBackoffMs(attempts, baseMs = 1000n) {
  if (typeof attempts !== 'number' && typeof attempts !== 'bigint') {
    throw new TypeError('Attempts must be non-negative integer');
  }

  const n = Number(attempts);
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('Attempts must be non-negative integer');
  }

  const base = typeof baseMs === 'bigint' ? baseMs : BigInt(baseMs);
  const factor = 1n << BigInt(n);
  return base * factor;
}

/**
 * Evaluate CI run status, determining if failure is transient (retryable)
 * or deterministic (requiring code remediation).
 *
 * @param {object} check
 * @param {object} [options={}]
 * @returns {object} CI evaluation result
 */
export function evaluateCiStatus(check, options = {}) {
  if (!check || typeof check !== 'object') {
    throw new TypeError('Invalid check object');
  }

  const attempts = Number(options.attempts || 0);
  const approved = Boolean(options.approved);
  const conclusion = String(check.conclusion || 'pending');
  const output = String(check.output || '');

  if (conclusion === 'success') {
    return {
      isGreen: true,
      retryEligible: false,
      isTransient: false,
      action: approved ? 'ready_to_merge' : 'awaiting_review',
      attempts
    };
  }

  // Check if failure is transient
  const isTransient = TRANSIENT_CI_PATTERNS.some(p => p.test(output));

  if (isTransient) {
    if (attempts < MAX_CI_RETRIES) {
      const backoffMs = calculateBackoffMs(attempts, 1000n);
      return {
        isGreen: false,
        retryEligible: true,
        isTransient: true,
        action: 'retry',
        backoffMs,
        attempts: attempts + 1
      };
    } else {
      return {
        isGreen: false,
        retryEligible: false,
        isTransient: true,
        action: 'fail_closed',
        attempts
      };
    }
  }

  // Deterministic failure (compiler error, broken test assertion, etc.)
  return {
    isGreen: false,
    retryEligible: false,
    isTransient: false,
    action: 'fix_required',
    attempts
  };
}

/**
 * Executes a deterministic state transition for the babysit FSM.
 * INV-025-002: Babysit state transitions form a deterministic finite state automaton without cyclic deadlocks.
 *
 * @param {string} currentState
 * @param {object} eventPayload
 * @returns {object} New state descriptor
 */
export function transitionBabysitState(currentState, eventPayload = {}) {
  const { event } = eventPayload;

  switch (currentState) {
    case BABYSIT_STATES.POLLING_PR:
      if (event === 'REVIEWS_RECEIVED') {
        return { state: BABYSIT_STATES.TRIAGING_COMMENTS, context: eventPayload };
      }
      if (event === 'NO_REVIEWS_POLL_AGAIN') {
        return { state: BABYSIT_STATES.POLLING_PR, context: eventPayload };
      }
      break;

    case BABYSIT_STATES.TRIAGING_COMMENTS:
      if (event === 'DEFECTS_DETECTED') {
        return { state: BABYSIT_STATES.FIXING_ON_BRANCH, context: eventPayload };
      }
      if (event === 'ONLY_NOISE_DETECTED') {
        return { state: BABYSIT_STATES.DISMISSING_WITH_REASON, context: eventPayload };
      }
      if (event === 'ALL_CLEAR') {
        return { state: BABYSIT_STATES.AWAITING_CI, context: eventPayload };
      }
      break;

    case BABYSIT_STATES.FIXING_ON_BRANCH:
      if (event === 'PUSH_COMPLETE') {
        return { state: BABYSIT_STATES.AWAITING_CI, context: eventPayload };
      }
      break;

    case BABYSIT_STATES.DISMISSING_WITH_REASON:
      if (event === 'DISMISS_COMPLETE') {
        return { state: BABYSIT_STATES.AWAITING_CI, context: eventPayload };
      }
      break;

    case BABYSIT_STATES.AWAITING_CI:
      if (event === 'CI_TRANSIENT_FAILURE') {
        const attempts = Number(eventPayload.attempts || 0);
        if (attempts < MAX_CI_RETRIES) {
          return { state: BABYSIT_STATES.RETRYING_CI, context: eventPayload };
        }
        return { state: BABYSIT_STATES.BLOCKED, context: eventPayload };
      }
      if (event === 'CI_RETRIES_EXCEEDED' || event === 'FATAL_FAILURE') {
        return { state: BABYSIT_STATES.BLOCKED, context: eventPayload };
      }
      if (event === 'CI_SUCCESS_APPROVED') {
        return { state: BABYSIT_STATES.MERGE_READY, context: eventPayload };
      }
      break;

    case BABYSIT_STATES.RETRYING_CI:
      if (event === 'RETRY_DISPATCHED') {
        return { state: BABYSIT_STATES.AWAITING_CI, context: eventPayload };
      }
      break;

    default:
      break;
  }

  throw new Error(`Invalid state transition: No path defined from ${currentState} with event ${event}`);
}

/**
 * Format a comprehensive, structured Markdown status report.
 *
 * @param {object} params
 * @returns {string} Markdown status report
 */
export function formatBabysitReport(params) {
  const {
    prNumber,
    branch,
    state,
    triagedComments = [],
    ciEvaluation = {}
  } = params;

  let report = `# PR Babysit Status Report: #${prNumber}\n\n`;
  report += `## WHERE\n`;
  report += `- Branch: \`${branch}\`\n`;
  report += `- State: \`${state}\`\n\n`;

  report += `## WHY\n`;
  report += `Continuous automated review triage and CI monitoring ensures PRs land green without manual intervention.\n\n`;

  report += `## HOW\n`;
  report += `### CI Evaluation\n`;
  report += `- Green: ${ciEvaluation.isGreen ? 'Yes' : 'No'}\n`;
  report += `- Attempts: ${ciEvaluation.attempts || 0} / ${MAX_CI_RETRIES}\n\n`;

  report += `### Triaged Review Comments (${triagedComments.length})\n`;
  if (triagedComments.length === 0) {
    report += `*No review comments registered.*\n`;
  } else {
    report += `| ID | Author | Category | Rationale |\n`;
    report += `|---|---|---|---|\n`;
    for (const c of triagedComments) {
      report += `| ${c.id} | ${c.author || 'unknown'} | \`${c.category}\` | ${c.rationale} |\n`;
    }
  }

  return report;
}

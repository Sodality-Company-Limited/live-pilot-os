/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS 10-STATE UX DECISION RUNTIME LIFECYCLE STATE MACHINE & DOUBT ROUTER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1 / G-UX-002)
 * Purpose: Deterministic 10-state Finite State Machine (FSM) and dynamic Doubt
 *          Router implementing "Rewarding Doubt". Governs transitions from
 *          OBSERVE through EMIT_DECISION, routing low-confidence proposals
 *          (c < 0.75) to DEFER and deceptive patterns to REJECT_AS_UNSAFE fail-closed.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { UX_LIFECYCLE_STATES, validateUxDecisionContract } from './ux-decision-contract.mjs';

export const CONFIDENCE_THRESHOLD = 0.7500;

export const TERMINAL_STATES = Object.freeze(['EMIT_DECISION', 'DEFER', 'REJECT_AS_UNSAFE']);

export class InvalidStateTransitionError extends Error {
  constructor(currentState, event, reason) {
    super(`Invalid state transition from '${currentState}' via event '${event}': ${reason}`);
    this.name = 'InvalidStateTransitionError';
    this.currentState = currentState;
    this.event = event;
    this.reason = reason;
  }
}

export class SafetyViolationError extends Error {
  constructor(message, violationDetails = {}) {
    super(message);
    this.name = 'SafetyViolationError';
    this.violationDetails = violationDetails;
  }
}

/**
 * Transition Table Definition:
 * maps State -> { Event -> { targetState, guard: (context, payload) => boolean, reason: string } }
 */
export const STATE_TRANSITIONS = {
  OBSERVE: {
    input_received: {
      target: 'PERCEIVE',
      guard: (ctx, payload) => payload && (payload.hasArtifacts === true || payload.imageBuffer || payload.sceneData),
      reason: 'Raw multimodal assets and declared viewports must be provided'
    },
    input_error: {
      target: 'DEFER',
      guard: () => true,
      reason: 'Input data corrupted, unreadable, or missing required files'
    }
  },
  PERCEIVE: {
    scene_graph_synthesized: {
      target: 'CRITIQUE_WCAG',
      guard: (ctx, payload) => payload && (payload.sceneGraphValid === true || payload.sceneGraph),
      reason: 'Acyclic UI Scene Graph DAG must be verified with valid node/edge topology'
    },
    perception_failed: {
      target: 'DEFER',
      guard: () => true,
      reason: 'Visual grounding or bounding box alignment failure'
    }
  },
  CRITIQUE_WCAG: {
    a11y_evaluated: {
      target: 'CRITIQUE_HEURISTICS',
      guard: (ctx, payload) => payload && payload.wcagHardFail !== true,
      reason: 'WCAG 2.2 AAA accessibility evaluation completed with remediable or compliant findings'
    },
    wcag_hard_fail: {
      target: 'REJECT_AS_UNSAFE',
      guard: (ctx, payload) => payload && payload.wcagHardFail === true,
      reason: 'Irremediable WCAG 2.2 AAA contrast violation or inescapable keyboard trap detected'
    }
  },
  CRITIQUE_HEURISTICS: {
    heuristics_scored: {
      target: 'DEBATE',
      guard: (ctx, payload) => payload && payload.catastrophicLoss !== true,
      reason: 'Nielsen 10 usability heuristics scored without unrecoverable destructive action'
    },
    heuristic_catastrophe: {
      target: 'DEFER',
      guard: (ctx, payload) => payload && payload.catastrophicLoss === true,
      reason: 'Destructive action lacking reversible undo window or confirmation dialog'
    }
  },
  DEBATE: {
    proposals_gathered: {
      target: 'RESOLVE_COLLISION',
      guard: (ctx, payload) => payload && payload.darkPatternDetected !== true,
      reason: 'Specialist persona proposals collected without ethical dark patterns'
    },
    dark_pattern_detected: {
      target: 'REJECT_AS_UNSAFE',
      guard: (ctx, payload) => payload && payload.darkPatternDetected === true,
      reason: 'Deceptive design pattern (confirmshaming, sneak-into-basket, hidden fees) detected'
    }
  },
  RESOLVE_COLLISION: {
    collisions_resolved: {
      target: 'EVALUATE_CONFIDENCE',
      guard: (ctx, payload) => payload && payload.deadlock !== true,
      reason: 'Pairwise property overlaps resolved via 4-tier priority hierarchy'
    },
    deadlock_detected: {
      target: 'DEFER',
      guard: (ctx, payload) => payload && payload.deadlock === true,
      reason: 'Equal-tier conflict between specialists cannot be resolved deterministically'
    }
  },
  EVALUATE_CONFIDENCE: {
    autonomy_authorized: {
      target: 'EMIT_DECISION',
      guard: (ctx, payload) => {
        const conf = typeof payload?.confidence === 'number' ? payload.confidence : ctx.confidence;
        const verified = payload?.evidence_verified ?? ctx.evidence_verified;
        const risk = payload?.risk_level ?? ctx.risk_level ?? 'low';
        const veto = payload?.veto_asserted ?? ctx.veto_asserted;
        return conf >= CONFIDENCE_THRESHOLD && verified === true && !veto && (risk === 'low' || risk === 'medium');
      },
      reason: `Calibrated confidence >= ${CONFIDENCE_THRESHOLD}, evidence verified, low/medium risk, and zero vetos`
    },
    confidence_low: {
      target: 'DEFER',
      guard: (ctx, payload) => {
        const conf = typeof payload?.confidence === 'number' ? payload.confidence : ctx.confidence;
        const verified = payload?.evidence_verified ?? ctx.evidence_verified;
        const risk = payload?.risk_level ?? ctx.risk_level;
        return conf < CONFIDENCE_THRESHOLD || verified === false || risk === 'high' || risk === 'critical';
      },
      reason: 'Calibrated confidence < 0.75, unverified evidence, or high/critical risk requires human review'
    },
    safety_breach: {
      target: 'REJECT_AS_UNSAFE',
      guard: (ctx, payload) => payload && (payload.veto_asserted === true || payload.safety_breach === true),
      reason: 'Safety policy breach, overconfidence threshold exceeded, or ethics veto asserted'
    }
  },
  EMIT_DECISION: {},
  DEFER: {},
  REJECT_AS_UNSAFE: {}
};

/**
 * Dynamic Doubt Router implementing "Rewarding Doubt" (G-UX-002).
 * Evaluates candidate decision parameters and returns deterministic routing target.
 *
 * @param {object} candidate - The candidate decision evaluation parameters.
 * @returns {{ route: 'EMIT_DECISION'|'DEFER'|'REJECT_AS_UNSAFE', authorized: boolean, reason: string, metrics: object }}
 */
export function routeDoubt(candidate = {}) {
  const {
    confidence = 0.0,
    confidence_calibrated = false,
    risk_level = 'medium',
    evidence_verified = false,
    veto_asserted = false,
    dark_pattern_detected = false,
    wcag_hard_fail = false
  } = candidate;

  const metrics = {
    confidence,
    confidence_calibrated,
    risk_level,
    evidence_verified,
    veto_asserted,
    dark_pattern_detected
  };

  // Tier 1 Fail-Closed Safety Veto
  if (dark_pattern_detected === true || wcag_hard_fail === true) {
    return {
      route: 'REJECT_AS_UNSAFE',
      authorized: false,
      reason: 'Deceptive dark pattern or irremediable accessibility barrier detected fail-closed',
      metrics
    };
  }

  if (veto_asserted === true) {
    return {
      route: 'REJECT_AS_UNSAFE',
      authorized: false,
      reason: 'Non-negotiable specialist veto asserted fail-closed',
      metrics
    };
  }

  // Validate numerical confidence bounds fail-closed ([0.0, 1.0])
  if (
    typeof confidence !== 'number' ||
    Number.isNaN(confidence) ||
    !Number.isFinite(confidence) ||
    confidence < 0.0 ||
    confidence > 1.0
  ) {
    return {
      route: 'DEFER',
      authorized: false,
      reason: 'Invalid, non-finite, or uncalibrated confidence probability',
      metrics
    };
  }

  // Uncalibrated confidence cannot authorize autonomous progression
  if (confidence_calibrated !== true) {
    return {
      route: 'DEFER',
      authorized: false,
      reason: 'Confidence score is not calibrated via strictly proper scoring rules',
      metrics
    };
  }

  // Physical evidence verification gate
  if (evidence_verified !== true) {
    return {
      route: 'DEFER',
      authorized: false,
      reason: 'Cited evidence has not been physically verified against working tree digests',
      metrics
    };
  }

  // Proper doubt threshold boundary (c < 0.7500 -> DEFER)
  if (confidence < CONFIDENCE_THRESHOLD) {
    const formattedConf = typeof confidence === 'number' && Number.isFinite(confidence) ? confidence.toFixed(4) : String(confidence);
    return {
      route: 'DEFER',
      authorized: false,
      reason: `Calibrated confidence ${formattedConf} is below strict threshold ${CONFIDENCE_THRESHOLD.toFixed(4)}`,
      metrics
    };
  }

  // Risk-weighted gating
  if (risk_level === 'high' || risk_level === 'critical') {
    return {
      route: 'DEFER',
      authorized: false,
      reason: `Operational risk level '${risk_level}' mandates human review authorization`,
      metrics
    };
  }

  // All invariants satisfied -> Proceed with decision emission
  return {
    route: 'EMIT_DECISION',
    authorized: true,
    reason: 'Confidence, evidence, and risk invariants satisfied; autonomous progression authorized',
    metrics
  };
}

/**
 * 10-State UX Decision Runtime Lifecycle State Machine.
 */
export class UxDecisionLifecycleEngine {
  constructor(initialState = 'OBSERVE', initialContext = {}) {
    if (!UX_LIFECYCLE_STATES.includes(initialState)) {
      throw new Error(`Invalid initial state: "${initialState}". Must be one of: ${UX_LIFECYCLE_STATES.join(', ')}`);
    }
    this.currentState = initialState;
    this.context = {
      confidence: 0.0,
      confidence_calibrated: false,
      risk_level: 'medium',
      evidence_verified: false,
      veto_asserted: false,
      dark_pattern_detected: false,
      ...initialContext
    };
    this.history = [
      {
        state: this.currentState,
        event: 'INIT',
        timestamp: new Date().toISOString(),
        payload: { ...this.context }
      }
    ];
  }

  getState() {
    return this.currentState;
  }

  getContext() {
    return { ...this.context };
  }

  getHistory() {
    return [...this.history];
  }

  isTerminal() {
    return TERMINAL_STATES.includes(this.currentState);
  }

  /**
   * Dispatches an event to trigger a state transition.
   *
   * @param {string} event - The transition event name.
   * @param {object} [payload={}] - Associated transition data and context mutations.
   * @returns {{ previousState: string, currentState: string, event: string }}
   */
  transition(event, payload = {}) {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(
        this.currentState,
        event,
        `Cannot transition out of terminal state '${this.currentState}'. Lifecycle is closed.`
      );
    }

    const availableTransitions = STATE_TRANSITIONS[this.currentState];
    if (!availableTransitions || !availableTransitions[event]) {
      throw new InvalidStateTransitionError(
        this.currentState,
        event,
        `Event '${event}' is not recognized from current state '${this.currentState}'. Valid events: ${Object.keys(availableTransitions || {}).join(', ') || 'none'}`
      );
    }

    const rule = availableTransitions[event];
    const guardPassed = rule.guard(this.context, payload);
    if (!guardPassed) {
      throw new InvalidStateTransitionError(
        this.currentState,
        event,
        `Guard condition failed: ${rule.reason}`
      );
    }

    const previousState = this.currentState;
    this.currentState = rule.target;
    this.context = { ...this.context, ...payload };

    this.history.push({
      state: this.currentState,
      previousState,
      event,
      timestamp: new Date().toISOString(),
      payload: { ...payload }
    });

    return {
      previousState,
      currentState: this.currentState,
      event
    };
  }

  /**
   * Executes the Doubt Router against current or provided parameters.
   *
   * @param {object} [candidateParams={}] - Optional candidate parameters.
   * @returns {{ route: string, authorized: boolean, reason: string }}
   */
  evaluateDoubt(candidateParams = {}) {
    const merged = { ...this.context, ...candidateParams };
    return routeDoubt(merged);
  }

  /**
   * Executes a full lifecycle traversal from OBSERVE through terminal state for a given contract.
   *
   * @param {object} decisionContract - Candidate UX Decision Contract.
   * @param {object} [runtimeOptions={}] - Optional environment flags.
   * @returns {{ finalState: string, history: object[], decisionContract: object, routingOutcome: object }}
   */
  runFullLifecycle(decisionContract, runtimeOptions = {}) {
    const validation = validateUxDecisionContract(decisionContract);
    if (!validation.valid) {
      this.transition('input_error', { validationErrors: validation.errors });
      return {
        finalState: this.currentState,
        history: this.getHistory(),
        decisionContract,
        routingOutcome: { route: 'DEFER', authorized: false, reason: 'Schema validation failed' }
      };
    }

    // Step 1: OBSERVE -> PERCEIVE
    this.transition('input_received', {
      hasArtifacts: true,
      decisionContract,
      ...runtimeOptions
    });

    // Step 2: PERCEIVE -> CRITIQUE_WCAG
    if (runtimeOptions.perceptionFailed) {
      this.transition('perception_failed');
      decisionContract.lifecycle_state = this.currentState;
      return { finalState: this.currentState, history: this.getHistory(), decisionContract, routingOutcome: { route: 'DEFER', authorized: false, reason: 'Perception failed' } };
    }
    this.transition('scene_graph_synthesized', { sceneGraphValid: true });

    // Step 3: CRITIQUE_WCAG -> CRITIQUE_HEURISTICS (or REJECT_AS_UNSAFE)
    if (runtimeOptions.wcagHardFail) {
      this.transition('wcag_hard_fail', { wcagHardFail: true });
      decisionContract.lifecycle_state = this.currentState;
      return { finalState: this.currentState, history: this.getHistory(), decisionContract, routingOutcome: { route: 'REJECT_AS_UNSAFE', authorized: false, reason: 'WCAG 2.2 AAA hard fail' } };
    }
    this.transition('a11y_evaluated', { wcagHardFail: false });

    // Step 4: CRITIQUE_HEURISTICS -> DEBATE (or DEFER)
    if (runtimeOptions.catastrophicLoss) {
      this.transition('heuristic_catastrophe', { catastrophicLoss: true });
      decisionContract.lifecycle_state = this.currentState;
      return { finalState: this.currentState, history: this.getHistory(), decisionContract, routingOutcome: { route: 'DEFER', authorized: false, reason: 'Heuristic catastrophic loss' } };
    }
    this.transition('heuristics_scored');

    // Step 5: DEBATE -> RESOLVE_COLLISION (or REJECT_AS_UNSAFE)
    if (runtimeOptions.darkPatternDetected) {
      this.transition('dark_pattern_detected', { darkPatternDetected: true });
      decisionContract.lifecycle_state = this.currentState;
      return { finalState: this.currentState, history: this.getHistory(), decisionContract, routingOutcome: { route: 'REJECT_AS_UNSAFE', authorized: false, reason: 'Deceptive dark pattern detected' } };
    }
    this.transition('proposals_gathered', { darkPatternDetected: false });

    // Step 6: RESOLVE_COLLISION -> EVALUATE_CONFIDENCE (or DEFER)
    if (runtimeOptions.deadlock) {
      this.transition('deadlock_detected', { deadlock: true });
      decisionContract.lifecycle_state = this.currentState;
      return { finalState: this.currentState, history: this.getHistory(), decisionContract, routingOutcome: { route: 'DEFER', authorized: false, reason: 'Equal-tier deadlock' } };
    }
    this.transition('collisions_resolved', { deadlock: false });

    // Step 7: EVALUATE_CONFIDENCE -> Terminal State via Doubt Router
    const routeOutcome = this.evaluateDoubt({
      confidence: decisionContract.confidence,
      confidence_calibrated: decisionContract.confidence_calibrated,
      risk_level: decisionContract.risk_level,
      evidence_verified: runtimeOptions.evidence_verified ?? true,
      veto_asserted: runtimeOptions.veto_asserted ?? false,
      dark_pattern_detected: runtimeOptions.darkPatternDetected ?? false
    });

    if (routeOutcome.route === 'EMIT_DECISION') {
      this.transition('autonomy_authorized', {
        confidence: decisionContract.confidence,
        evidence_verified: true,
        risk_level: decisionContract.risk_level,
        veto_asserted: false
      });
      decisionContract.lifecycle_state = 'EMIT_DECISION';
    } else if (routeOutcome.route === 'DEFER') {
      this.transition('confidence_low', {
        confidence: decisionContract.confidence,
        reason: routeOutcome.reason
      });
      decisionContract.lifecycle_state = 'DEFER';
    } else {
      this.transition('safety_breach', {
        veto_asserted: true,
        reason: routeOutcome.reason
      });
      decisionContract.lifecycle_state = 'REJECT_AS_UNSAFE';
    }

    return {
      finalState: this.currentState,
      history: this.getHistory(),
      decisionContract,
      routingOutcome: routeOutcome
    };
  }
}

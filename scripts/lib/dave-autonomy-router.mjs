import crypto from 'node:crypto';

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ DAVE SYSTEM 1 AUTONOMY ROUTER & PERMISSION GATE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: DAVE (Goal G-DAVE-005)
 * Paradigm: Dynamic Four-Way Autonomy Router & Fail-Closed Permission Gate
 * 
 * Invariants:
 *  1. execution_permission === 'permitted' <=> route === 'proceed'
 *  2. P(proceed | risk in {high, critical} AND evidence == unverified) = 0
 *  3. Any detected cross-domain conflict forces route: 'human_review'
 *  4. Missing/corrupt inputs default fail-closed to human_review with blocked permission
 *  5. 16/16 Cartesian product coverage across Risk x Evidence x Confidence
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const ROUTING_ACTIONS = Object.freeze(['proceed', 'verify', 'defer', 'human_review']);

export const EXECUTION_PERMISSIONS = Object.freeze([
  'permitted',
  'blocked_until_verified',
  'blocked_until_approved',
  'rejected'
]);

export const RISK_TIERS = Object.freeze(['low', 'medium', 'high', 'critical']);

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Authoritative 16-State Truth Table Definition:
 * Dimensions:
 *  - Risk: low (includes normal), medium, high, critical
 *  - Evidence: verified, unverified
 *  - Confidence: high (>= 0.85), low (< 0.85)
 */
export const TRUTH_TABLE_16 = Object.freeze([
  // Low Risk (Normal)
  {
    risk: 'low',
    evidence: 'verified',
    confidence: 'high',
    route: 'proceed',
    execution_permission: 'permitted',
    description: 'Low-risk verified decision with high confidence executes autonomously.'
  },
  {
    risk: 'low',
    evidence: 'verified',
    confidence: 'low',
    route: 'verify',
    execution_permission: 'blocked_until_verified',
    description: 'Low-risk verified decision with low confidence requires verification pass.'
  },
  {
    risk: 'low',
    evidence: 'unverified',
    confidence: 'high',
    route: 'verify',
    execution_permission: 'blocked_until_verified',
    description: 'Low-risk unverified decision requires verification before proceeding.'
  },
  {
    risk: 'low',
    evidence: 'unverified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'Low-risk unverified decision with low confidence is deferred.'
  },

  // Medium Risk
  {
    risk: 'medium',
    evidence: 'verified',
    confidence: 'high',
    route: 'verify',
    execution_permission: 'blocked_until_verified',
    description: 'Medium-risk verified decision requires automated verification pass.'
  },
  {
    risk: 'medium',
    evidence: 'verified',
    confidence: 'low',
    route: 'verify',
    execution_permission: 'blocked_until_verified',
    description: 'Medium-risk verified decision with low confidence requires verification pass.'
  },
  {
    risk: 'medium',
    evidence: 'unverified',
    confidence: 'high',
    route: 'verify',
    execution_permission: 'blocked_until_verified',
    description: 'Medium-risk unverified decision requires verification plan pass.'
  },
  {
    risk: 'medium',
    evidence: 'unverified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'Medium-risk unverified decision with low confidence is rejected/deferred.'
  },

  // High Risk
  {
    risk: 'high',
    evidence: 'verified',
    confidence: 'high',
    route: 'human_review',
    execution_permission: 'blocked_until_approved',
    description: 'High-risk verified decision with high confidence requires human tech-lead approval.'
  },
  {
    risk: 'high',
    evidence: 'verified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'High-risk verified decision with low confidence is deferred fail-closed.'
  },
  {
    risk: 'high',
    evidence: 'unverified',
    confidence: 'high',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'High-risk unverified decision cannot proceed; deferred fail-closed.'
  },
  {
    risk: 'high',
    evidence: 'unverified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'High-risk unverified decision with low confidence is rejected/deferred.'
  },

  // Critical Risk
  {
    risk: 'critical',
    evidence: 'verified',
    confidence: 'high',
    route: 'human_review',
    execution_permission: 'blocked_until_approved',
    description: 'Critical-risk verified decision requires mandatory human approval.'
  },
  {
    risk: 'critical',
    evidence: 'verified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'Critical-risk verified decision with low confidence is deferred.'
  },
  {
    risk: 'critical',
    evidence: 'unverified',
    confidence: 'high',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'Critical-risk unverified decision cannot execute; deferred fail-closed.'
  },
  {
    risk: 'critical',
    evidence: 'unverified',
    confidence: 'low',
    route: 'defer',
    execution_permission: 'rejected',
    description: 'Critical-risk unverified decision with low confidence is deferred.'
  }
]);

/**
 * Normalizes risk string to canonical risk tier: 'low', 'medium', 'high', 'critical'.
 * Maps 'normal' -> 'low'. Returns null if invalid.
 */
export function normalizeRiskTier(rawRisk) {
  if (typeof rawRisk !== 'string') return null;
  const clean = rawRisk.trim().toLowerCase();
  if (clean === 'normal') return 'low';
  if (RISK_TIERS.includes(clean)) return clean;
  return null;
}

/**
 * Normalizes confidence input into category ('high' | 'low') and numeric value.
 * Valid range: [0.0, 1.0]. Threshold: 0.85.
 */
export function normalizeConfidence(rawConfidence) {
  if (typeof rawConfidence === 'number') {
    if (!Number.isFinite(rawConfidence) || rawConfidence < 0.0 || rawConfidence > 1.0) {
      return { valid: false, category: null, value: null };
    }
    const cat = rawConfidence >= HIGH_CONFIDENCE_THRESHOLD ? 'high' : 'low';
    return { valid: true, category: cat, value: rawConfidence };
  }

  if (typeof rawConfidence === 'string') {
    const clean = rawConfidence.trim().toLowerCase();
    if (clean === 'high') return { valid: true, category: 'high', value: 0.95 };
    if (clean === 'low') return { valid: true, category: 'low', value: 0.50 };
  }

  return { valid: false, category: null, value: null };
}

/**
 * Normalizes evidence input to category ('verified' | 'unverified').
 */
export function normalizeEvidence(rawEvidence, evidenceVerifiedField, evidenceArray) {
  if (typeof evidenceVerifiedField === 'boolean') {
    return evidenceVerifiedField ? 'verified' : 'unverified';
  }

  if (typeof rawEvidence === 'string') {
    const clean = rawEvidence.trim().toLowerCase();
    if (clean === 'verified') return 'verified';
    if (clean === 'unverified') return 'unverified';
  }

  if (typeof rawEvidence === 'boolean') {
    return rawEvidence ? 'verified' : 'unverified';
  }

  if (Array.isArray(evidenceArray)) {
    if (evidenceArray.length === 0) return 'unverified';
    const allVerified = evidenceArray.every(item => item && (item.verified === true || item.status === 'verified'));
    return allVerified ? 'verified' : 'unverified';
  }

  return 'unverified';
}

/**
 * Evaluates the 16-state truth table directly.
 */
export function evaluateRoutingTruthTable16({ risk, evidence, confidence }) {
  const normRisk = normalizeRiskTier(risk);
  const normConf = normalizeConfidence(confidence);
  const normEvid = normalizeEvidence(evidence);

  if (!normRisk || !normConf.valid) {
    return {
      route: 'human_review',
      execution_permission: 'blocked_until_approved',
      reason: 'Fail-closed: invalid or missing risk tier or confidence score.'
    };
  }

  const match = TRUTH_TABLE_16.find(
    entry => entry.risk === normRisk &&
             entry.evidence === normEvid &&
             entry.confidence === normConf.category
  );

  if (!match) {
    return {
      route: 'human_review',
      execution_permission: 'blocked_until_approved',
      reason: `Fail-closed: unmapped state permutation (${normRisk}, ${normEvid}, ${normConf.category}).`
    };
  }

  return {
    route: match.route,
    execution_permission: match.execution_permission,
    reason: match.description
  };
}

/**
 * Generates an automated verification plan containing executable harness suites.
 */
export function generateVerificationPlan(decision, normRisk) {
  const suites = [
    {
      name: 'dave_schema_conformance',
      command: 'node scripts/harness/dave-decision-schema-harness.mjs',
      required: true,
      description: 'Validates DAVE decision schema and required fields.'
    },
    {
      name: 'routing_truth_table_conformance',
      command: 'node scripts/harness/routing-truth-table-harness.mjs --strict',
      required: true,
      description: 'Validates autonomy policy and fail-closed routing constraints.'
    }
  ];

  if (decision && decision.decision_type) {
    if (['ux_ui_design', 'visual_asset', 'animation_motion'].includes(decision.decision_type)) {
      suites.push({
        name: 'visual_fidelity_verification',
        command: 'node scripts/harness/dave-visual-diff-harness.mjs',
        required: true,
        description: 'Verifies pixel diff tolerance and visual regression.'
      });
    }
    if (decision.references && decision.references.length > 0) {
      suites.push({
        name: 'reference_hash_verification',
        command: 'node scripts/harness/dave-reference-harness.mjs',
        required: true,
        description: 'Verifies SHA-256 digests of all content-addressed references.'
      });
    }
  }

  if (normRisk === 'medium' || normRisk === 'high' || normRisk === 'critical') {
    suites.push({
      name: 'trace_verification',
      command: 'node scripts/harness/dave-trace-harness.mjs',
      required: true,
      description: 'Ensures state machine trajectory integrity and audit trail persistence.'
    });
  }

  return suites;
}

/**
 * Generates a cryptographic authorization token for permitted autonomous executions.
 */
export function generateCryptographicAuthToken(decisionId, route, executionPermission) {
  if (route !== 'proceed' || executionPermission !== 'permitted') {
    return null;
  }
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${decisionId || 'DAVE-ANON'}:${route}:${executionPermission}:${timestamp}:${nonce}`;
  const signature = crypto.createHash('sha256').update(payload).digest('hex');
  return `AUTH-DAVE-V1-${signature}-${nonce}`;
}

/**
 * DaveAutonomyRouter Class
 * Hexagonal Driving Port for DAVE decision evaluation and fail-closed gating.
 */
export class DaveAutonomyRouter {
  constructor(options = {}) {
    this.secret = options.secret || 'soda-os-dave-runtime-kernel';
    this.highConfidenceThreshold = options.highConfidenceThreshold || HIGH_CONFIDENCE_THRESHOLD;
  }

  getTruthTable() {
    return TRUTH_TABLE_16;
  }

  /**
   * Main Driving Port: Evaluates candidate decision and assigns route + execution_permission.
   * @param {object} decision - Candidate decision record
   * @returns {object} Routing result containing route, permission, token, verification plan, and telemetry.
   */
  route(decision) {
    // Edge case: Null or non-object input fails closed to human_review
    if (!decision || typeof decision !== 'object') {
      return {
        decision_id: null,
        route: 'human_review',
        execution_permission: 'blocked_until_approved',
        auth_token: null,
        verification_plan: [],
        conflicts_detected: false,
        reason: 'Fail-closed: candidate decision is null or non-object payload.',
        timestamp: new Date().toISOString()
      };
    }

    const decisionId = decision.decision_id || null;

    // Invariant 3: Any cross-domain conflict strictly forces route: 'human_review'
    const conflicts = Array.isArray(decision.conflicts) ? decision.conflicts : [];
    if (conflicts.length > 0) {
      return {
        decision_id: decisionId,
        route: 'human_review',
        execution_permission: 'blocked_until_approved',
        auth_token: null,
        verification_plan: [],
        conflicts_detected: true,
        conflicts,
        reason: `Cross-domain conflicts detected (${conflicts.length}). Autonomous execution locked fail-closed pending tech-lead human review.`,
        timestamp: new Date().toISOString()
      };
    }

    // Risk normalization
    const normRisk = normalizeRiskTier(decision.risk);
    if (!normRisk) {
      return {
        decision_id: decisionId,
        route: 'human_review',
        execution_permission: 'blocked_until_approved',
        auth_token: null,
        verification_plan: [],
        conflicts_detected: false,
        reason: `Fail-closed: unrecognized or missing risk tier '${decision.risk}'.`,
        timestamp: new Date().toISOString()
      };
    }

    // Confidence normalization
    const normConf = normalizeConfidence(decision.confidence);
    if (!normConf.valid) {
      return {
        decision_id: decisionId,
        route: 'human_review',
        execution_permission: 'blocked_until_approved',
        auth_token: null,
        verification_plan: [],
        conflicts_detected: false,
        reason: `Fail-closed: invalid confidence score '${decision.confidence}'. Must be finite number in [0.0, 1.0].`,
        timestamp: new Date().toISOString()
      };
    }

    // Evidence normalization
    const normEvid = normalizeEvidence(
      decision.evidence,
      decision.evidenceVerified,
      Array.isArray(decision.evidence) ? decision.evidence : []
    );

    // Evaluate 16-state truth table
    const tableResult = evaluateRoutingTruthTable16({
      risk: normRisk,
      evidence: normEvid,
      confidence: normConf.value
    });

    const route = tableResult.route;
    const permission = tableResult.execution_permission;

    // Attach automated verification plan if routed to 'verify'
    const verificationPlan = (route === 'verify') ? generateVerificationPlan(decision, normRisk) : [];

    // Issue cryptographic authorization token IF AND ONLY IF route is 'proceed'
    const authToken = generateCryptographicAuthToken(decisionId, route, permission);

    return {
      decision_id: decisionId,
      route,
      execution_permission: permission,
      auth_token: authToken,
      verification_plan: verificationPlan,
      conflicts_detected: false,
      evaluated_state: {
        risk: normRisk,
        evidence: normEvid,
        confidence_category: normConf.category,
        confidence_score: normConf.value
      },
      reason: tableResult.reason,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Convenient standalone helper function.
 */
export function routeDecision(decision, options = {}) {
  const router = new DaveAutonomyRouter(options);
  return router.route(decision);
}

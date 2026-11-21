/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CANONICAL UX DECISION CONTRACT VALIDATOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1 / G-UX-001)
 * Purpose: Native validator for Draft 2020-12 UX Decision Contracts. Enforces
 *          zero-mock compliance, structural integrity, 5-state component matrices,
 *          viewport contracts, 12-persona involvement, and proper scoring rules.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const UX_DECISION_SCHEMA_VERSION = 1;

export const UX_LIFECYCLE_STATES = Object.freeze([
  'OBSERVE',
  'PERCEIVE',
  'CRITIQUE_WCAG',
  'CRITIQUE_HEURISTICS',
  'DEBATE',
  'RESOLVE_COLLISION',
  'EVALUATE_CONFIDENCE',
  'EMIT_DECISION',
  'DEFER',
  'REJECT_AS_UNSAFE'
]);

export const UX_DECISION_CATEGORIES = Object.freeze([
  'layout',
  'typography',
  'color_theme',
  'navigation',
  'motion_microinteraction',
  'component_state',
  'form_input',
  'feedback_modal',
  'accessibility_remediation',
  'i18n_localization',
  'ethical_guardrail'
]);

export const UX_EXECUTION_POLICIES = Object.freeze([
  'autonomous_execute',
  'defer_to_human',
  'verify_required',
  'fail_closed_blocked'
]);

export const UX_RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

export const CANONICAL_UX_PERSONAS = Object.freeze([
  'design_systems_lead',
  'accessibility_auditor',
  'interaction_choreographer',
  'visual_balance_density',
  'typography_scale_architect',
  'motion_haptics_engineer',
  'ergonomics_cognitive_critic',
  'color_contrast_specialist',
  'enterprise_info_architect',
  'dark_pattern_ethics_watchdog',
  'microcopy_tone_specialist',
  'i18n_multilocale_stylist'
]);

export const COMPONENT_STATES = Object.freeze(['empty', 'loading', 'partial', 'full', 'error']);

export class UxDecisionContractValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'UxDecisionContractValidationError';
    this.errors = errors;
  }
}

/**
 * Validates whether a value is a non-null object (and not an array).
 */
function isPlainObject(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates RFC 3339 / ISO 8601 date-time string.
 */
function isValidIsoDateTime(str) {
  if (typeof str !== 'string') return false;
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(str)) return false;
  const timestamp = Date.parse(str);
  return !Number.isNaN(timestamp);
}

/**
 * Validates a UX Decision Contract object against schema invariants.
 *
 * @param {object} contract - The candidate UX decision contract object.
 * @param {object} [options={}] - Validation options (e.g. strictAdditionalProperties).
 * @returns {{ valid: boolean, errors: string[], details: object }}
 */
export function validateUxDecisionContract(contract, options = {}) {
  const errors = [];
  const details = {};

  if (!isPlainObject(contract)) {
    return {
      valid: false,
      errors: ['UX Decision Contract must be a non-null JSON object.'],
      details: {}
    };
  }

  // Check top-level additional properties
  const allowedTopLevelKeys = new Set([
    'schema_version',
    'decision_id',
    'goal_id',
    'timestamp',
    'lifecycle_state',
    'execution_policy',
    'decision',
    'confidence',
    'confidence_calibrated',
    'scoring_rule',
    'risk_level',
    'evidence',
    'references',
    'personas_involved',
    'proposals',
    'state_matrix',
    'viewport_contract',
    'conflicts_detected',
    'alternatives_rejected',
    'verification_plan',
    'ledger_record'
  ]);

  for (const key of Object.keys(contract)) {
    if (!allowedTopLevelKeys.has(key)) {
      errors.push(`Additional property '${key}' is forbidden on root UX Decision Contract.`);
    }
  }

  // 1. schema_version
  if (contract.schema_version === undefined) {
    errors.push("Missing required field 'schema_version'.");
  } else if (contract.schema_version !== UX_DECISION_SCHEMA_VERSION) {
    errors.push(`Invalid 'schema_version': expected ${UX_DECISION_SCHEMA_VERSION}, got ${contract.schema_version}.`);
  }

  // 2. decision_id
  if (!contract.decision_id || typeof contract.decision_id !== 'string') {
    errors.push("Missing or invalid required field 'decision_id'.");
  } else if (!/^UX-DEC-[0-9]{4}-[0-9]{3,}$/.test(contract.decision_id)) {
    errors.push(`'decision_id' "${contract.decision_id}" does not match required pattern ^UX-DEC-[0-9]{4}-[0-9]{3,}$.`);
  }

  // 3. goal_id
  if (!contract.goal_id || typeof contract.goal_id !== 'string') {
    errors.push("Missing or invalid required field 'goal_id'.");
  } else if (!/^(G-[A-Z0-9]+-[0-9]{3}|G-[0-9]{3}|G-xxx)$/.test(contract.goal_id)) {
    errors.push(`'goal_id' "${contract.goal_id}" does not match canonical Soda OS pattern.`);
  }

  // 4. timestamp
  if (!contract.timestamp) {
    errors.push("Missing required field 'timestamp'.");
  } else if (!isValidIsoDateTime(contract.timestamp)) {
    errors.push(`'timestamp' "${contract.timestamp}" must be a valid RFC 3339 date-time string.`);
  }

  // 5. lifecycle_state
  if (!contract.lifecycle_state) {
    errors.push("Missing required field 'lifecycle_state'.");
  } else if (!UX_LIFECYCLE_STATES.includes(contract.lifecycle_state)) {
    errors.push(`Invalid 'lifecycle_state': "${contract.lifecycle_state}". Must be one of: ${UX_LIFECYCLE_STATES.join(', ')}.`);
  }

  // 6. execution_policy (optional)
  if (contract.execution_policy !== undefined && !UX_EXECUTION_POLICIES.includes(contract.execution_policy)) {
    errors.push(`Invalid 'execution_policy': "${contract.execution_policy}". Must be one of: ${UX_EXECUTION_POLICIES.join(', ')}.`);
  }

  // 7. decision object
  if (!contract.decision) {
    errors.push("Missing required field 'decision'.");
  } else if (!isPlainObject(contract.decision)) {
    errors.push("'decision' must be a non-null object.");
  } else {
    const d = contract.decision;
    const allowedDecisionKeys = new Set(['summary', 'category', 'touch_map', 'tokens_applied']);
    for (const k of Object.keys(d)) {
      if (!allowedDecisionKeys.has(k)) {
        errors.push(`Additional property '${k}' is forbidden in 'decision'.`);
      }
    }

    if (typeof d.summary !== 'string' || d.summary.trim().length < 10) {
      errors.push("decision.summary must be a string with length >= 10.");
    }
    if (!UX_DECISION_CATEGORIES.includes(d.category)) {
      errors.push(`decision.category "${d.category}" is invalid. Must be one of: ${UX_DECISION_CATEGORIES.join(', ')}.`);
    }
    if (!Array.isArray(d.touch_map) || d.touch_map.length === 0) {
      errors.push("decision.touch_map must be a non-empty array of file path strings.");
    } else {
      for (const item of d.touch_map) {
        if (typeof item !== 'string' || item.trim().length === 0) {
          errors.push("All items in decision.touch_map must be non-empty strings.");
          break;
        }
      }
    }
    if (!isPlainObject(d.tokens_applied)) {
      errors.push("decision.tokens_applied must be an object mapping roles to semantic tokens.");
    } else {
      for (const [role, tokenVal] of Object.entries(d.tokens_applied)) {
        if (typeof tokenVal !== 'string') {
          errors.push(`decision.tokens_applied['${role}'] must be a token name string.`);
        }
      }
    }
  }

  // 8. confidence
  if (typeof contract.confidence !== 'number' || Number.isNaN(contract.confidence) || !Number.isFinite(contract.confidence)) {
    errors.push("Missing or non-numeric required field 'confidence'.");
  } else if (contract.confidence < 0.0 || contract.confidence > 1.0) {
    errors.push(`'confidence' ${contract.confidence} is out of bounds; must be strictly within [0.0, 1.0].`);
  }

  // 9. confidence_calibrated
  if (contract.confidence_calibrated !== true) {
    errors.push("'confidence_calibrated' must be explicitly boolean true.");
  }

  // 10. scoring_rule (optional)
  if (contract.scoring_rule !== undefined) {
    if (!isPlainObject(contract.scoring_rule)) {
      errors.push("'scoring_rule' must be an object.");
    } else {
      const sr = contract.scoring_rule;
      const allowedSrKeys = new Set(['brier_loss', 'proper_log_score', 'overconfidence_penalty', 'doubt_reward', 'ece_rolling']);
      for (const k of Object.keys(sr)) {
        if (!allowedSrKeys.has(k)) {
          errors.push(`Additional property '${k}' is forbidden in 'scoring_rule'.`);
        }
      }
      if (sr.brier_loss !== undefined && (typeof sr.brier_loss !== 'number' || !Number.isFinite(sr.brier_loss) || sr.brier_loss < 0.0)) {
        errors.push("scoring_rule.brier_loss must be a non-negative number.");
      }
      if (sr.proper_log_score !== undefined && (typeof sr.proper_log_score !== 'number' || !Number.isFinite(sr.proper_log_score))) {
        errors.push("scoring_rule.proper_log_score must be a number.");
      }
      if (sr.overconfidence_penalty !== undefined && (typeof sr.overconfidence_penalty !== 'number' || !Number.isFinite(sr.overconfidence_penalty) || sr.overconfidence_penalty < 0.0)) {
        errors.push("scoring_rule.overconfidence_penalty must be a non-negative number.");
      }
      if (sr.doubt_reward !== undefined && (typeof sr.doubt_reward !== 'number' || !Number.isFinite(sr.doubt_reward) || sr.doubt_reward < 0.0)) {
        errors.push("scoring_rule.doubt_reward must be a non-negative number.");
      }
      if (sr.ece_rolling !== undefined && (typeof sr.ece_rolling !== 'number' || !Number.isFinite(sr.ece_rolling) || sr.ece_rolling < 0.0 || sr.ece_rolling > 1.0)) {
        errors.push("scoring_rule.ece_rolling must be a number in [0.0, 1.0].");
      }
    }
  }

  // 11. risk_level
  if (!contract.risk_level) {
    errors.push("Missing required field 'risk_level'.");
  } else if (!UX_RISK_LEVELS.includes(contract.risk_level)) {
    errors.push(`Invalid 'risk_level': "${contract.risk_level}". Must be one of: ${UX_RISK_LEVELS.join(', ')}.`);
  }

  // 12. evidence
  if (!Array.isArray(contract.evidence) || contract.evidence.length === 0) {
    errors.push("'evidence' must be a non-empty array of file paths or token locators.");
  } else {
    for (const ev of contract.evidence) {
      if (typeof ev !== 'string' || ev.trim().length === 0) {
        errors.push("All items in 'evidence' must be non-empty strings.");
        break;
      }
    }
  }

  // 13. references
  if (!Array.isArray(contract.references)) {
    errors.push("Missing required field 'references' (must be an array).");
  } else {
    for (let i = 0; i < contract.references.length; i++) {
      const ref = contract.references[i];
      if (!isPlainObject(ref)) {
        errors.push(`references[${i}] must be an object.`);
        continue;
      }
      const allowedRefKeys = new Set(['reference_id', 'content_hash', 'uri', 'authority']);
      for (const k of Object.keys(ref)) {
        if (!allowedRefKeys.has(k)) {
          errors.push(`Additional property '${k}' is forbidden in references[${i}].`);
        }
      }
      if (!ref.reference_id || !/^REF-[0-9]{4}$/.test(ref.reference_id)) {
        errors.push(`references[${i}].reference_id "${ref.reference_id}" must match pattern ^REF-[0-9]{4}$.`);
      }
      if (!ref.content_hash || !/^sha256:[a-f0-9]{64}$/.test(ref.content_hash)) {
        errors.push(`references[${i}].content_hash "${ref.content_hash}" must match pattern ^sha256:[a-f0-9]{64}$.`);
      }
      if (typeof ref.uri !== 'string' || ref.uri.trim().length === 0) {
        errors.push(`references[${i}].uri must be a non-empty string.`);
      }
    }
  }

  // 14. personas_involved
  if (!Array.isArray(contract.personas_involved) || contract.personas_involved.length === 0) {
    errors.push("'personas_involved' must be a non-empty array of canonical persona identifiers.");
  } else {
    for (const p of contract.personas_involved) {
      if (!CANONICAL_UX_PERSONAS.includes(p)) {
        errors.push(`personas_involved contains unrecognized persona "${p}".`);
      }
    }
  }

  // 15. proposals (optional)
  if (contract.proposals !== undefined) {
    if (!Array.isArray(contract.proposals)) {
      errors.push("'proposals' must be an array.");
    } else {
      for (let i = 0; i < contract.proposals.length; i++) {
        const prop = contract.proposals[i];
        if (!isPlainObject(prop)) {
          errors.push(`proposals[${i}] must be an object.`);
          continue;
        }
        const allowedPropKeys = new Set(['persona', 'property', 'proposed_value', 'rationale', 'evidence', 'confidence', 'veto_asserted', 'veto_reason']);
        for (const k of Object.keys(prop)) {
          if (!allowedPropKeys.has(k)) {
            errors.push(`Additional property '${k}' is forbidden in proposals[${i}].`);
          }
        }
        if (!prop.persona || !CANONICAL_UX_PERSONAS.includes(prop.persona)) {
          errors.push(`proposals[${i}].persona "${prop.persona}" is invalid.`);
        }
        if (typeof prop.property !== 'string' || prop.property.trim().length === 0) {
          errors.push(`proposals[${i}].property must be a non-empty string.`);
        }
        if (prop.proposed_value === undefined) {
          errors.push(`proposals[${i}].proposed_value is required.`);
        }
        if (typeof prop.rationale !== 'string' || prop.rationale.trim().length === 0) {
          errors.push(`proposals[${i}].rationale must be a non-empty string.`);
        }
        if (typeof prop.confidence !== 'number' || !Number.isFinite(prop.confidence) || prop.confidence < 0.0 || prop.confidence > 1.0) {
          errors.push(`proposals[${i}].confidence must be a number in [0.0, 1.0].`);
        }
      }
    }
  }

  // 16. state_matrix
  if (!contract.state_matrix) {
    errors.push("Missing required field 'state_matrix'.");
  } else if (!isPlainObject(contract.state_matrix)) {
    errors.push("'state_matrix' must be an object.");
  } else {
    const sm = contract.state_matrix;
    for (const stateName of COMPONENT_STATES) {
      if (sm[stateName] === undefined || sm[stateName] === null) {
        errors.push(`state_matrix is missing mandatory 5-state component branch '${stateName}'.`);
      } else if (!isPlainObject(sm[stateName])) {
        errors.push(`state_matrix.${stateName} must be a specification object.`);
      }
    }
    for (const k of Object.keys(sm)) {
      if (!COMPONENT_STATES.includes(k)) {
        errors.push(`state_matrix contains unrecognized state branch '${k}'.`);
      }
    }
  }

  // 17. viewport_contract
  if (!contract.viewport_contract) {
    errors.push("Missing required field 'viewport_contract'.");
  } else if (!isPlainObject(contract.viewport_contract)) {
    errors.push("'viewport_contract' must be an object.");
  } else {
    const vc = contract.viewport_contract;
    const allowedVcKeys = new Set(['viewports', 'max_overflow_px', 'cls_score']);
    for (const k of Object.keys(vc)) {
      if (!allowedVcKeys.has(k)) {
        errors.push(`Additional property '${k}' is forbidden in 'viewport_contract'.`);
      }
    }
    if (!Array.isArray(vc.viewports) || vc.viewports.length === 0) {
      errors.push("viewport_contract.viewports must be a non-empty array.");
    } else {
      for (let i = 0; i < vc.viewports.length; i++) {
        const vp = vc.viewports[i];
        if (!isPlainObject(vp)) {
          errors.push(`viewport_contract.viewports[${i}] must be an object.`);
          continue;
        }
        if (typeof vp.name !== 'string' || vp.name.trim().length === 0) {
          errors.push(`viewport_contract.viewports[${i}].name must be a non-empty string.`);
        }
        if (typeof vp.width !== 'number' || !Number.isInteger(vp.width) || vp.width <= 0) {
          errors.push(`viewport_contract.viewports[${i}].width must be a positive integer.`);
        }
        if (typeof vp.height !== 'number' || !Number.isInteger(vp.height) || vp.height <= 0) {
          errors.push(`viewport_contract.viewports[${i}].height must be a positive integer.`);
        }
      }
    }
    if (typeof vc.max_overflow_px !== 'number' || !Number.isFinite(vc.max_overflow_px) || vc.max_overflow_px !== 0) {
      errors.push(`viewport_contract.max_overflow_px must be 0 (got ${vc.max_overflow_px}); horizontal overflow is strictly forbidden.`);
    }
    if (typeof vc.cls_score !== 'number' || !Number.isFinite(vc.cls_score) || vc.cls_score > 0.0) {
      errors.push(`viewport_contract.cls_score must be <= 0.0 (got ${vc.cls_score}); zero cumulative layout shift required.`);
    }
  }

  // 18. conflicts_detected (optional)
  if (contract.conflicts_detected !== undefined) {
    if (!Array.isArray(contract.conflicts_detected)) {
      errors.push("'conflicts_detected' must be an array.");
    } else {
      for (let i = 0; i < contract.conflicts_detected.length; i++) {
        const c = contract.conflicts_detected[i];
        if (!isPlainObject(c)) {
          errors.push(`conflicts_detected[${i}] must be an object.`);
          continue;
        }
        const allowedConflictKeys = new Set(['persona_pair', 'property', 'values_in_conflict', 'resolution_applied', 'winning_persona', 'severity']);
        for (const k of Object.keys(c)) {
          if (!allowedConflictKeys.has(k)) {
            errors.push(`Additional property '${k}' is forbidden in conflicts_detected[${i}].`);
          }
        }
        if (!Array.isArray(c.persona_pair) || c.persona_pair.length !== 2) {
          errors.push(`conflicts_detected[${i}].persona_pair must be an array of exactly 2 persona strings.`);
        }
        if (typeof c.property !== 'string' || c.property.trim().length === 0) {
          errors.push(`conflicts_detected[${i}].property must be a non-empty string.`);
        }
        if (typeof c.resolution_applied !== 'string' || c.resolution_applied.trim().length === 0) {
          errors.push(`conflicts_detected[${i}].resolution_applied must be a non-empty string.`);
        }
        if (typeof c.winning_persona !== 'string' || c.winning_persona.trim().length === 0) {
          errors.push(`conflicts_detected[${i}].winning_persona must be a non-empty string.`);
        }
        if (!UX_RISK_LEVELS.includes(c.severity)) {
          errors.push(`conflicts_detected[${i}].severity must be one of: ${UX_RISK_LEVELS.join(', ')}.`);
        }
      }
    }
  }

  // 19. alternatives_rejected (optional)
  if (contract.alternatives_rejected !== undefined) {
    if (!Array.isArray(contract.alternatives_rejected)) {
      errors.push("'alternatives_rejected' must be an array.");
    } else {
      for (let i = 0; i < contract.alternatives_rejected.length; i++) {
        const alt = contract.alternatives_rejected[i];
        if (!isPlainObject(alt)) {
          errors.push(`alternatives_rejected[${i}] must be an object.`);
          continue;
        }
        if (typeof alt.alternative !== 'string' || alt.alternative.trim().length === 0) {
          errors.push(`alternatives_rejected[${i}].alternative must be a non-empty string.`);
        }
        if (typeof alt.rejection_reason !== 'string' || alt.rejection_reason.trim().length === 0) {
          errors.push(`alternatives_rejected[${i}].rejection_reason must be a non-empty string.`);
        }
      }
    }
  }

  // 20. verification_plan
  if (!Array.isArray(contract.verification_plan) || contract.verification_plan.length === 0) {
    errors.push("'verification_plan' must be a non-empty array of test or harness commands.");
  } else {
    for (const v of contract.verification_plan) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        errors.push("All items in 'verification_plan' must be non-empty strings.");
        break;
      }
    }
  }

  // 21. ledger_record (optional)
  if (contract.ledger_record !== undefined) {
    if (!isPlainObject(contract.ledger_record)) {
      errors.push("'ledger_record' must be an object.");
    } else {
      const lr = contract.ledger_record;
      const allowedLrKeys = new Set(['prev_hash', 'record_hash', 'sequence_id', 'merkle_root']);
      for (const k of Object.keys(lr)) {
        if (!allowedLrKeys.has(k)) {
          errors.push(`Additional property '${k}' is forbidden in 'ledger_record'.`);
        }
      }
      if (!lr.prev_hash || !/^[a-f0-9]{64}$/.test(lr.prev_hash)) {
        errors.push("ledger_record.prev_hash must be a 64-char hex SHA-256 string.");
      }
      if (!lr.record_hash || !/^[a-f0-9]{64}$/.test(lr.record_hash)) {
        errors.push("ledger_record.record_hash must be a 64-char hex SHA-256 string.");
      }
      if (typeof lr.sequence_id !== 'number' || !Number.isInteger(lr.sequence_id) || lr.sequence_id < 0) {
        errors.push("ledger_record.sequence_id must be a non-negative integer.");
      }
      if (lr.merkle_root !== undefined && !/^[a-f0-9]{64}$/.test(lr.merkle_root)) {
        errors.push("ledger_record.merkle_root must be a 64-char hex SHA-256 string.");
      }
    }
  }

  details.fieldCount = Object.keys(contract).length;
  details.errorCount = errors.length;

  return {
    valid: errors.length === 0,
    errors,
    details
  };
}

/**
 * Creates a valid, fully populated default UX Decision Contract for baseline testing.
 *
 * @param {object} [overrides={}] - Optional property overrides.
 * @returns {object} A valid UX decision contract.
 */
export function createDefaultUxDecision(overrides = {}) {
  const base = {
    schema_version: UX_DECISION_SCHEMA_VERSION,
    decision_id: 'UX-DEC-0001-001',
    goal_id: 'G-UX-001',
    timestamp: '2026-10-14T04:00:00Z',
    lifecycle_state: 'OBSERVE',
    execution_policy: 'autonomous_execute',
    decision: {
      summary: 'Establish responsive 3-column decision canvas with 280px command rail and locked semantic tokens.',
      category: 'layout',
      touch_map: ['code/src/components/DecisionCanvas.tsx', 'code/src/tokens/index.css'],
      tokens_applied: {
        background: '--color-surface-base',
        foreground: '--color-content-primary',
        spacing: '--space-4',
        border: '--color-border-subtle'
      }
    },
    confidence: 0.92,
    confidence_calibrated: true,
    scoring_rule: {
      brier_loss: 0.08,
      proper_log_score: -0.15,
      overconfidence_penalty: 0.0,
      doubt_reward: 0.05,
      ece_rolling: 0.03
    },
    risk_level: 'low',
    evidence: [
      'docs/03-architecture/design-tokens.md',
      'schemas/ux-decision-contract.schema.json'
    ],
    references: [
      {
        reference_id: 'REF-0001',
        content_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uri: 'docs/02-product/design/reference/REF-0001.png',
        authority: 'ux_design_system_spec'
      }
    ],
    personas_involved: [
      'design_systems_lead',
      'accessibility_auditor',
      'interaction_choreographer',
      'visual_balance_density'
    ],
    proposals: [
      {
        persona: 'design_systems_lead',
        property: 'layout.grid',
        proposed_value: 'grid-cols-[280px_1fr_320px]',
        rationale: 'Align with canonical 3-column desktop layout using standardized command rail token.',
        evidence: ['docs/03-architecture/design-tokens.md'],
        confidence: 0.95,
        veto_asserted: false
      }
    ],
    state_matrix: {
      empty: {
        render: 'EmptyDecisionState',
        message: 'No active decision in progress. Select a canvas node to initiate deliberation.'
      },
      loading: {
        render: 'SkeletonCanvasShimmer',
        duration_ms: 150
      },
      partial: {
        render: 'PartialDeliberationStream',
        visible_personas: 4
      },
      full: {
        render: 'FullDeliberationCanvas',
        interactive: true
      },
      error: {
        render: 'DecisionErrorCard',
        retry_action: 'retry_deliberation'
      }
    },
    viewport_contract: {
      viewports: [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'tablet', width: 1024, height: 768 },
        { name: 'mobile', width: 390, height: 844 }
      ],
      max_overflow_px: 0,
      cls_score: 0.0
    },
    conflicts_detected: [],
    alternatives_rejected: [
      {
        alternative: 'Floating modal overlay instead of persistent 3-column workspace',
        rejection_reason: 'Violates OOUX <= 3 clicks wayfinding rule and obstructs evidence panel.'
      }
    ],
    verification_plan: [
      'node scripts/harness/ux-decision-schema-harness.mjs',
      'node --test tests/unit/test-ux-decision-contract.mjs'
    ],
    ledger_record: {
      prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      record_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      sequence_id: 1,
      merkle_root: 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2'
    }
  };

  return { ...base, ...overrides };
}

/**
 * Loads a UX Decision Contract from a JSON file and validates it.
 *
 * @param {string} filePath - Absolute or relative path to the contract JSON file.
 * @returns {{ valid: boolean, errors: string[], contract: object|null }}
 */
export function loadUxDecisionContract(filePath) {
  const resolvedPath = resolve(process.cwd(), filePath);
  if (!existsSync(resolvedPath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
      contract: null
    };
  }

  let contract;
  try {
    const raw = readFileSync(resolvedPath, 'utf8');
    contract = JSON.parse(raw);
  } catch (err) {
    return {
      valid: false,
      errors: [`JSON Parse error: ${err.message}`],
      contract: null
    };
  }

  const res = validateUxDecisionContract(contract);
  return {
    valid: res.valid,
    errors: res.errors,
    contract
  };
}

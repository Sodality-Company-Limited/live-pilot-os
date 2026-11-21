/**
 * Profile-Conditioned TDD Lifecycle Checker
 */

export const CODING_KINDS = new Set(['feature', 'bugfix', 'api', 'refactor', 'qa', 'migration']);
export const STRICT_TDD_PROFILES = new Set(['core', 'formal_verification', 'dave_platform']);

export function evaluateTddRequirement(goalContract) {
  if (!goalContract) {
    return { strictTddRequired: false, reason: 'No goal contract provided' };
  }

  const kind = (goalContract.kind || '').toLowerCase();
  const profiles = Array.isArray(goalContract.profiles) ? goalContract.profiles : [];

  const isCodingKind = CODING_KINDS.has(kind);
  const hasStrictProfile = profiles.some(p => STRICT_TDD_PROFILES.has(p));

  if (isCodingKind || hasStrictProfile) {
    return {
      strictTddRequired: true,
      protocol: 'RED_GREEN_REFACTOR',
      reason: `Goal kind="${kind}" with profiles=[${profiles.join(', ')}] requires strict test-first verification before implementation.`
    };
  }

  return {
    strictTddRequired: false,
    protocol: 'SPEC_VERIFICATION_FIRST',
    reason: `Declarative/governance kind="${kind}" requires schema/conformance verification rather than unit tests.`
  };
}

export function validateStepTddSequence(goalContract, stepAction, testExistsBeforeCode) {
  const req = evaluateTddRequirement(goalContract);
  if (!req.strictTddRequired) {
    return { valid: true };
  }

  if (stepAction === 'IMPLEMENT_CODE' && !testExistsBeforeCode) {
    return {
      valid: false,
      error: `TDD Invariant Violation: Attempted to implement code before failing test exists under protocol ${req.protocol}.`
    };
  }

  return { valid: true };
}

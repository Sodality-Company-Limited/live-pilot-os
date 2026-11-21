/**
 * Principle-to-Decision Attribution Validator
 * Validates that any principle or invariant citation maps to an explicit, concrete altered decision.
 */

export function validatePrincipleAttribution(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: ['Attribution payload must be an object']
    };
  }

  const { principle, decision_altered, file } = payload;
  const errors = [];

  if (!principle || typeof principle !== 'string' || principle.trim().length < 3) {
    errors.push('Missing or invalid "principle" identifier');
  }

  if (!decision_altered || typeof decision_altered !== 'string' || decision_altered.trim().length < 10) {
    errors.push('Missing or substanceless "decision_altered". Must explain the concrete choice altered.');
  }

  if (decision_altered && /none|n\/a|not applicable|no change/i.test(decision_altered.trim())) {
    errors.push('Hollow attribution rejected: "decision_altered" must not be trivial or empty.');
  }

  return {
    valid: errors.length === 0,
    errors,
    record: {
      principle,
      decision_altered,
      file: file || 'unspecified',
      timestamp: new Date().toISOString()
    }
  };
}

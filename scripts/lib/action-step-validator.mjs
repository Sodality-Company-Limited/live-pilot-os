/**
 * Action Step Validator
 * Validates step-level micro-task action definitions against schemas/action-step.schema.json
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function validateActionStep(stepObject) {
  const errors = [];
  if (!stepObject || typeof stepObject !== 'object') {
    return { valid: false, errors: ['Step definition must be an object'] };
  }

  const requiredFields = [
    'step_id',
    'goal_id',
    'objective',
    'persona',
    'touch_map',
    'verification_command',
    'completion_gate',
    'stop_condition'
  ];

  for (const field of requiredFields) {
    if (stepObject[field] === undefined || stepObject[field] === null || stepObject[field] === '') {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (typeof stepObject.step_id !== 'number' || stepObject.step_id < 1) {
    errors.push('step_id must be an integer >= 1');
  }

  if (typeof stepObject.goal_id !== 'string' || !/^G-[A-Za-z0-9_-]+$/.test(stepObject.goal_id)) {
    errors.push(`Invalid goal_id format: "${stepObject.goal_id}"`);
  }

  if (!Array.isArray(stepObject.touch_map) || stepObject.touch_map.length === 0) {
    errors.push('touch_map must be a non-empty array of file paths');
  }

  if (stepObject.timeout_ms !== undefined && (typeof stepObject.timeout_ms !== 'number' || stepObject.timeout_ms < 1000)) {
    errors.push('timeout_ms must be an integer >= 1000');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

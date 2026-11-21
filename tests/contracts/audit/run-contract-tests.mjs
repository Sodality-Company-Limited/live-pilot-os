#!/usr/bin/env node

/**
 * Audit Receipt Contract Validator & Test Runner (G-AUDI-002)
 *
 * Zero-dependency JSON Schema Draft 2020-12 validator + envelope header
 * consistency verifier executing directly against:
 *   docs/03-architecture/api/schemas/nats/audit-receipt.schema.json
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();
export const SCHEMA_PATH = resolve(ROOT_DIR, 'docs/03-architecture/api/schemas/nats/audit-receipt.schema.json');
export const VALID_FIXTURES_PATH = resolve(ROOT_DIR, 'tests/contracts/audit/fixtures/audit-receipt.valid.json');
export const INVALID_FIXTURES_PATH = resolve(ROOT_DIR, 'tests/contracts/audit/fixtures/audit-receipt.invalid.json');

function matchesJsonType(value, expectedType) {
  switch (expectedType) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return false;
  }
}

/**
 * Validates an instance against a Draft 2020-12 JSON Schema document.
 * Returns `{ valid: boolean, errors: Array<{ path: string, keyword: string, message: string }> }`.
 */
export function validateAgainstSchema(instance, schema, rootSchema = schema, instancePath = '') {
  const errors = [];

  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeOk = allowedTypes.some((t) => matchesJsonType(instance, t));
    if (!typeOk) {
      errors.push({
        path: instancePath || '/',
        keyword: 'type',
        message: `Expected type ${allowedTypes.join('|')}, got ${Array.isArray(instance) ? 'array' : instance === null ? 'null' : typeof instance}`
      });
      return { valid: false, errors };
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(instance)) {
    errors.push({
      path: instancePath || '/',
      keyword: 'enum',
      message: `Value ${JSON.stringify(instance)} is not in enum [${schema.enum.join(', ')}]`
    });
  }

  if (typeof instance === 'string') {
    const charLen = [...instance].length;
    if (typeof schema.minLength === 'number' && charLen < schema.minLength) {
      errors.push({
        path: instancePath || '/',
        keyword: 'minLength',
        message: `String length ${charLen} is less than minLength ${schema.minLength}`
      });
    }
    if (typeof schema.maxLength === 'number' && charLen > schema.maxLength) {
      errors.push({
        path: instancePath || '/',
        keyword: 'maxLength',
        message: `String length ${charLen} exceeds maxLength ${schema.maxLength}`
      });
    }
  }

  if (matchesJsonType(instance, 'object')) {
    if (Array.isArray(schema.required)) {
      for (const reqKey of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(instance, reqKey)) {
          errors.push({
            path: `${instancePath}/${reqKey}`,
            keyword: 'required',
            message: `Missing required property "${reqKey}"`
          });
        }
      }
    }

    const props = schema.properties || {};
    for (const [key, val] of Object.entries(instance)) {
      const propPath = `${instancePath}/${key}`;
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        const subResult = validateAgainstSchema(val, props[key], rootSchema, propPath);
        errors.push(...subResult.errors);
      } else if (schema.additionalProperties === false) {
        errors.push({
          path: propPath,
          keyword: 'additionalProperties',
          message: `Unexpected unversioned property "${key}" is forbidden (additionalProperties: false)`
        });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        const subResult = validateAgainstSchema(val, schema.additionalProperties, rootSchema, propPath);
        errors.push(...subResult.errors);
      }
    }
  }

  if (matchesJsonType(instance, 'array') && schema.items) {
    instance.forEach((item, idx) => {
      const itemResult = validateAgainstSchema(item, schema.items, rootSchema, `${instancePath}/${idx}`);
      errors.push(...itemResult.errors);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

const REQUIRED_HEADERS = [
  'Nats-Msg-Id',
  'X-Correlation-Id',
  'X-Idempotency-Key',
  'X-Tenant-Id',
  'X-Session-Id',
  'X-Schema-Version',
  'X-Producer',
  'X-Traceparent',
  'X-Mode'
];

/**
 * Validates NATS transport envelope headers for audit receipt messages.
 */
export function validateEnvelopeHeaders(headers) {
  const errors = [];
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return {
      valid: false,
      errors: [{ path: '/headers', keyword: 'type', message: 'Headers must be an object' }]
    };
  }

  for (const h of REQUIRED_HEADERS) {
    if (typeof headers[h] !== 'string' || headers[h].trim().length === 0) {
      errors.push({
        path: `/headers/${h}`,
        keyword: 'required',
        message: `Missing or empty required header: ${h}`
      });
    }
  }

  if (headers['X-Mode'] && !['SIMULATED', 'SANDBOX', 'CONFIRMED'].includes(headers['X-Mode'])) {
    errors.push({
      path: '/headers/X-Mode',
      keyword: 'enum',
      message: `Invalid X-Mode: ${headers['X-Mode']}`
    });
  }

  if (headers['X-Traceparent'] && !/^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/.test(headers['X-Traceparent'])) {
    errors.push({
      path: '/headers/X-Traceparent',
      keyword: 'pattern',
      message: `Invalid W3C traceparent header format: ${headers['X-Traceparent']}`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function loadContractArtifacts() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const validBundle = JSON.parse(readFileSync(VALID_FIXTURES_PATH, 'utf8'));
  const invalidBundle = JSON.parse(readFileSync(INVALID_FIXTURES_PATH, 'utf8'));
  return { schema, validBundle, invalidBundle };
}

export function runContractSuite() {
  const { schema, validBundle, invalidBundle } = loadContractArtifacts();
  const failures = [];
  let passedChecks = 0;

  // 1. Verify schema dialect
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    failures.push(`Schema must declare Draft 2020-12, found: ${schema.$schema}`);
  } else {
    passedChecks++;
  }

  // 2. Verify all result enums ('accepted', 'rejected', 'failed', 'unknown', 'reconciled') are covered
  const requiredResults = ['accepted', 'rejected', 'failed', 'unknown', 'reconciled'];
  const coveredResults = new Set(validBundle.fixtures.map((f) => f.receipt.result));
  for (const r of requiredResults) {
    if (!coveredResults.has(r)) {
      failures.push(`Missing valid golden fixture for result enum: ${r}`);
    } else {
      passedChecks++;
    }
  }

  // 3. Verify actor_ref variants: null and string
  const hasNullActor = validBundle.fixtures.some((f) => f.receipt.actor_ref === null);
  const hasStringActor = validBundle.fixtures.some((f) => typeof f.receipt.actor_ref === 'string');
  if (!hasNullActor) {
    failures.push('Missing valid golden fixture with actor_ref = null');
  } else {
    passedChecks++;
  }
  if (!hasStringActor) {
    failures.push('Missing valid golden fixture with actor_ref as string');
  } else {
    passedChecks++;
  }

  // 4. Verify evidence_ids variants: omitted, empty array, populated array
  const hasOmittedEvidence = validBundle.fixtures.some((f) => f.receipt.evidence_ids === undefined);
  const hasEmptyEvidence = validBundle.fixtures.some((f) => Array.isArray(f.receipt.evidence_ids) && f.receipt.evidence_ids.length === 0);
  const hasPopulatedEvidence = validBundle.fixtures.some((f) => Array.isArray(f.receipt.evidence_ids) && f.receipt.evidence_ids.length > 0);
  if (!hasOmittedEvidence) {
    failures.push('Missing valid golden fixture with omitted evidence_ids');
  } else {
    passedChecks++;
  }
  if (!hasEmptyEvidence) {
    failures.push('Missing valid golden fixture with empty evidence_ids array');
  } else {
    passedChecks++;
  }
  if (!hasPopulatedEvidence) {
    failures.push('Missing valid golden fixture with populated evidence_ids array');
  } else {
    passedChecks++;
  }

  // 5. Validate each valid fixture against schema and envelope headers
  for (const fixture of validBundle.fixtures) {
    const schemaResult = validateAgainstSchema(fixture.receipt, schema, schema, '');
    if (!schemaResult.valid) {
      failures.push(`Valid fixture "${fixture.id}" failed schema validation: ${JSON.stringify(schemaResult.errors)}`);
    } else {
      passedChecks++;
    }

    if (fixture.headers) {
      const headerResult = validateEnvelopeHeaders(fixture.headers);
      if (!headerResult.valid) {
        failures.push(`Valid fixture "${fixture.id}" failed envelope header validation: ${JSON.stringify(headerResult.errors)}`);
      } else {
        passedChecks++;
      }
    }
  }

  // 6. Validate each invalid fixture fails closed with expected keywords / path
  for (const fixture of invalidBundle.fixtures) {
    const res = validateAgainstSchema(fixture.receipt, schema, schema, '');
    if (res.valid) {
      failures.push(`Invalid fixture "${fixture.id}" unexpectedly passed schema validation`);
      continue;
    }

    const keywordsFound = new Set(res.errors.map((e) => e.keyword));
    const missingKeywords = (fixture.expected_keywords || []).filter((kw) => !keywordsFound.has(kw));
    if (missingKeywords.length > 0) {
      failures.push(
        `Invalid fixture "${fixture.id}" failed for unexpected keyword. Missing [${missingKeywords.join(', ')}]; actual errors: ${JSON.stringify(res.errors)}`
      );
      continue;
    }

    if (fixture.expected_path_substring) {
      const pathMatch = res.errors.some((e) => e.path.includes(fixture.expected_path_substring));
      if (!pathMatch) {
        failures.push(
          `Invalid fixture "${fixture.id}" did not report expected path "${fixture.expected_path_substring}"; actual errors: ${JSON.stringify(res.errors)}`
        );
        continue;
      }
    }

    passedChecks++;
  }

  return {
    ok: failures.length === 0,
    passedChecks,
    validCount: validBundle.fixtures.length,
    invalidCount: invalidBundle.fixtures.length,
    failures
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const result = runContractSuite();
  if (!result.ok) {
    console.error(`Audit Receipt Contract Suite: FAIL (${result.failures.length} failure(s))`);
    for (const err of result.failures) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `Audit Receipt Contract Suite: PASS (${result.validCount} valid golden fixtures, ${result.invalidCount} invalid fail-closed fixtures, ${result.passedChecks} total checks)`
  );
}

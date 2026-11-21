#!/usr/bin/env node

/**
 * Telemetry Signal Contract Validator & Test Runner (G-TELM-002)
 *
 * Zero-dependency JSON Schema Draft 2020-12 validator + envelope header
 * consistency verifier executing directly against:
 *   docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();
export const SCHEMA_PATH = resolve(ROOT_DIR, 'docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json');
export const VALID_FIXTURES_PATH = resolve(ROOT_DIR, 'tests/contracts/telemetry/fixtures/telemetry-signal.valid.json');
export const INVALID_FIXTURES_PATH = resolve(ROOT_DIR, 'tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json');

const RFC3339_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates RFC 3339 date-time formatting including calendar day bounds.
 */
export function isValidRfc3339DateTime(value) {
  if (typeof value !== 'string') return false;
  const match = RFC3339_DATE_TIME_RE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const tz = match[7];

  if (month < 1 || month > 12) return false;
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  if (day < 1 || day > daysInMonth[month - 1]) return false;
  if (hour > 23 || minute > 59 || second > 60) return false;

  if (tz !== 'Z') {
    const [tzH, tzM] = tz.slice(1).split(':').map(Number);
    if (tzH > 23 || tzM > 59) return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported external $ref: ${ref}`);
  }
  const parts = ref.slice(2).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = rootSchema;
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Unresolvable JSON Schema $ref: ${ref}`);
    }
    current = current[part];
  }
  return current;
}

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
 * Validates an arbitrary instance against a JSON Schema Draft 2020-12 document.
 * Returns `{ valid: boolean, errors: Array<{ path: string, keyword: string, message: string }> }`.
 */
export function validateAgainstSchema(instance, schema, rootSchema = schema, instancePath = '') {
  const errors = [];

  if (schema.$ref) {
    const target = resolveRef(rootSchema, schema.$ref);
    const refResult = validateAgainstSchema(instance, target, rootSchema, instancePath);
    errors.push(...refResult.errors);
  }

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

  if ('const' in schema && instance !== schema.const) {
    errors.push({
      path: instancePath || '/',
      keyword: 'const',
      message: `Expected constant value ${JSON.stringify(schema.const)}, got ${JSON.stringify(instance)}`
    });
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
    if (typeof schema.pattern === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(instance)) {
        errors.push({
          path: instancePath || '/',
          keyword: 'pattern',
          message: `String ${JSON.stringify(instance)} does not match pattern ${schema.pattern}`
        });
      }
    }
    if (schema.format === 'date-time' && !isValidRfc3339DateTime(instance)) {
      errors.push({
        path: instancePath || '/',
        keyword: 'format',
        message: `String ${JSON.stringify(instance)} is not a valid RFC 3339 date-time`
      });
    }
  }

  if (typeof instance === 'number') {
    if (typeof schema.minimum === 'number' && instance < schema.minimum) {
      errors.push({
        path: instancePath || '/',
        keyword: 'minimum',
        message: `Number ${instance} is less than minimum ${schema.minimum}`
      });
    }
    if (typeof schema.maximum === 'number' && instance > schema.maximum) {
      errors.push({
        path: instancePath || '/',
        keyword: 'maximum',
        message: `Number ${instance} exceeds maximum ${schema.maximum}`
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

  return {
    valid: errors.length === 0,
    errors
  };
}

const HEADER_ENVELOPE_BINDINGS = [
  ['tenant_id', 'X-Tenant-Id', 'LP02001'],
  ['session_id', 'X-Session-Id', 'LP02002'],
  ['correlation_id', 'X-Correlation-Id', 'LP12002'],
  ['idempotency_key', 'X-Idempotency-Key', 'LP12002'],
  ['schema_version', 'X-Schema-Version', 'LP12002'],
  ['producer', 'X-Producer', 'LP12002'],
  ['mode', 'X-Mode', 'LP05003']
];

/**
 * Performs full TelemetrySignal contract validation:
 * 1. JSON Schema Draft 2020-12 conformance
 * 2. Envelope-to-header scope consistency
 * 3. Cryptographic payload_hash verification (when present)
 */
export function validateTelemetrySignalEnvelope(signal, schema) {
  const schemaResult = validateAgainstSchema(signal, schema, schema, '');
  const errors = schemaResult.errors.map((err) => ({
    ...err,
    code: err.path === '/signal_type' && err.keyword === 'enum' ? 'LP12003' : 'LP12002'
  }));

  if (signal && typeof signal === 'object' && signal.headers && typeof signal.headers === 'object') {
    for (const [bodyField, headerField, code] of HEADER_ENVELOPE_BINDINGS) {
      if (
        typeof signal[bodyField] === 'string' &&
        typeof signal.headers[headerField] === 'string' &&
        signal[bodyField] !== signal.headers[headerField]
      ) {
        errors.push({
          path: `/headers/${headerField}`,
          keyword: 'envelopeHeaderMismatch',
          code,
          message: `Header "${headerField}" (${signal.headers[headerField]}) does not match envelope "${bodyField}" (${signal[bodyField]})`
        });
      }
    }
  }

  if (
    signal &&
    typeof signal === 'object' &&
    typeof signal.payload_hash === 'string' &&
    /^[a-f0-9]{64}$/.test(signal.payload_hash) &&
    signal.payload &&
    typeof signal.payload === 'object' &&
    !Array.isArray(signal.payload)
  ) {
    const computedHash = createHash('sha256').update(JSON.stringify(signal.payload)).digest('hex');
    if (computedHash !== signal.payload_hash) {
      errors.push({
        path: '/payload_hash',
        keyword: 'payloadHashIntegrity',
        code: 'LP12002',
        message: `payload_hash mismatch: expected ${computedHash}, got ${signal.payload_hash}`
      });
    }
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

  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    failures.push(`Schema must declare Draft 2020-12, found: ${schema.$schema}`);
  } else {
    passedChecks++;
  }

  // Verify semantic category coverage (chat, purchase, engagement, system)
  const requiredCategories = ['chat', 'purchase', 'engagement', 'system'];
  const coveredCategories = new Set(validBundle.fixtures.map((f) => f.category));
  for (const cat of requiredCategories) {
    if (!coveredCategories.has(cat)) {
      failures.push(`Missing valid golden fixture category: ${cat}`);
    } else {
      passedChecks++;
    }
  }

  // Verify every canonical enum signal_type is exercised
  const enumTypes = schema.properties.signal_type.enum;
  const coveredTypes = new Set(validBundle.fixtures.map((f) => f.signal.signal_type));
  for (const signalType of enumTypes) {
    if (!coveredTypes.has(signalType)) {
      failures.push(`Missing valid golden fixture for schema signal_type enum: ${signalType}`);
    } else {
      passedChecks++;
    }
  }

  for (const fixture of validBundle.fixtures) {
    const res = validateTelemetrySignalEnvelope(fixture.signal, schema);
    if (!res.valid) {
      failures.push(
        `Valid fixture "${fixture.id}" failed validation: ${JSON.stringify(res.errors)}`
      );
    } else if (!fixture.signal.headers || !fixture.signal.headers['X-Traceparent']) {
      failures.push(`Valid fixture "${fixture.id}" is missing required envelope headers or X-Traceparent`);
    } else {
      passedChecks++;
    }
  }

  for (const fixture of invalidBundle.fixtures) {
    const schemaOnly = validateAgainstSchema(fixture.signal, schema, schema, '');
    const fullRes = validateTelemetrySignalEnvelope(fixture.signal, schema);

    if (fullRes.valid) {
      failures.push(`Invalid fixture "${fixture.id}" unexpectedly passed full envelope validation`);
      continue;
    }

    if (!fixture.schema_valid_only && schemaOnly.valid) {
      failures.push(`Invalid fixture "${fixture.id}" unexpectedly passed raw JSON Schema validation`);
      continue;
    }

    const keywordsFound = new Set(fullRes.errors.map((e) => e.keyword));
    const missingKeywords = (fixture.expected_keywords || []).filter((kw) => !keywordsFound.has(kw));
    if (missingKeywords.length > 0) {
      failures.push(
        `Invalid fixture "${fixture.id}" failed for wrong reason. Missing keywords [${missingKeywords.join(', ')}]; actual errors: ${JSON.stringify(fullRes.errors)}`
      );
      continue;
    }

    if (fixture.expected_path_substring) {
      const pathMatch = fullRes.errors.some((e) => e.path.includes(fixture.expected_path_substring));
      if (!pathMatch) {
        failures.push(
          `Invalid fixture "${fixture.id}" did not report expected path "${fixture.expected_path_substring}"; actual errors: ${JSON.stringify(fullRes.errors)}`
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
    console.error(`Telemetry Signal Contract Suite: FAIL (${result.failures.length} failure(s))`);
    for (const err of result.failures) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `Telemetry Signal Contract Suite: PASS (${result.validCount} valid golden fixtures, ${result.invalidCount} invalid fail-closed fixtures, ${result.passedChecks} total checks)`
  );
}

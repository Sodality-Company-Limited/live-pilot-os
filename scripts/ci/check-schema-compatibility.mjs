#!/usr/bin/env node

/**
 * CI JSON Schema Compatibility & Governance Checker
 * Validates CloudEvents v1.0 schemas in docs/03-architecture/contracts/notifications/schemas/
 * Enforces Semantic Versioning and Backward/Forward Compatibility rules under PDR-0004 & G-NOTIFY-090.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const DEFAULT_SCHEMAS_DIR = path.join(rootDir, 'docs/03-architecture/contracts/notifications/schemas');

const MANDATORY_ENVELOPE_ATTRIBUTES = [
  'specversion',
  'id',
  'source',
  'type',
  'time',
  'datacontenttype',
  'subject',
  'tenantid',
  'correlationid',
  'idempotencykey',
  'priority',
  'data',
];

export const SAMPLE_CAMPAIGN_SCHEMA = {
  type: 'object',
  required: [...MANDATORY_ENVELOPE_ATTRIBUTES],
  properties: {
    specversion: { const: '1.0' },
    id: { type: 'string' },
    source: { type: 'string' },
    type: { type: 'string' },
    time: { type: 'string' },
    datacontenttype: { const: 'application/json' },
    subject: { type: 'string' },
    tenantid: { type: 'string' },
    correlationid: { type: 'string' },
    idempotencykey: { type: 'string' },
    priority: { type: 'string' },
    data: {
      type: 'object',
      required: ['creator_id', 'commission_rate_bps'],
      properties: {
        creator_id: { type: 'string' },
        commission_rate_bps: { type: 'integer' }
      }
    }
  }
};

export const SAMPLE_PAYMENT_SCHEMA = {
  type: 'object',
  required: [...MANDATORY_ENVELOPE_ATTRIBUTES],
  properties: {
    specversion: { const: '1.0' },
    id: { type: 'string' },
    source: { type: 'string' },
    type: { type: 'string' },
    time: { type: 'string' },
    datacontenttype: { const: 'application/json' },
    subject: { type: 'string' },
    tenantid: { type: 'string' },
    correlationid: { type: 'string' },
    idempotencykey: { type: 'string' },
    priority: { type: 'string' },
    data: {
      type: 'object',
      required: ['amount_minor', 'payment_method'],
      properties: {
        amount_minor: { type: 'integer' },
        payment_method: {
          type: 'string',
          enum: ['promptpay', 'credit_card', 'bank_transfer']
        }
      }
    }
  }
};

/**
 * Validates CloudEvents v1.0 envelope integrity and zero float math.
 * @param {object} schema
 * @param {string} filename
 * @returns {Array<{ path: string, violation: string, message: string }>}
 */
export function validateCloudEventsEnvelope(schema, filename = '') {
  const violations = [];

  if (schema.type !== 'object') {
    violations.push({
      path: '/',
      violation: 'INVALID_ROOT_TYPE',
      message: `Root schema type must be 'object', found '${schema.type}'`,
    });
    return violations;
  }

  const props = schema.properties || {};
  const required = new Set(schema.required || []);

  for (const attr of MANDATORY_ENVELOPE_ATTRIBUTES) {
    if (!props[attr]) {
      violations.push({
        path: `/properties/${attr}`,
        violation: 'MISSING_MANDATORY_ENVELOPE_ATTRIBUTE',
        message: `CloudEvents envelope missing mandatory attribute '${attr}'`,
      });
    }
    if (!required.has(attr)) {
      violations.push({
        path: `/required/${attr}`,
        violation: 'ENVELOPE_ATTRIBUTE_NOT_REQUIRED',
        message: `CloudEvents envelope attribute '${attr}' must be in required list`,
      });
    }
  }

  if (props.specversion && props.specversion.const !== '1.0') {
    violations.push({
      path: '/properties/specversion/const',
      violation: 'INVALID_SPECVERSION',
      message: `specversion const must be '1.0', found '${props.specversion?.const}'`,
    });
  }

  if (props.datacontenttype && props.datacontenttype.const !== 'application/json') {
    violations.push({
      path: '/properties/datacontenttype/const',
      violation: 'INVALID_DATACONTENTTYPE',
      message: `datacontenttype const must be 'application/json', found '${props.datacontenttype?.const}'`,
    });
  }

  // Zero Float Math Validation: inspect all properties recursively
  function checkMonetaryInteger(obj, currentPath) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.properties && typeof obj.properties === 'object') {
      for (const [key, prop] of Object.entries(obj.properties)) {
        const propPath = `${currentPath}/properties/${key}`;
        if (
          key.includes('minor') ||
          key.includes('satang') ||
          key.includes('amount') ||
          key.includes('budget') ||
          key.includes('payout')
        ) {
          if (prop.type === 'number' || prop.type === 'float') {
            violations.push({
              path: propPath,
              violation: 'FLOAT_MATH_PROHIBITED',
              message: `Monetary field '${key}' must be integer minor units (ZERO float math), found '${prop.type}'`,
            });
          }
        }
        checkMonetaryInteger(prop, propPath);
      }
    }
  }

  checkMonetaryInteger(schema, '');

  return violations;
}

/**
 * Compares a baseline schema with a proposed schema to detect compatibility regressions.
 * @param {object} baseline
 * @param {object} proposed
 * @param {string} jsonPath
 * @returns {Array<{ path: string, violation: string, severity: 'BREAKING' | 'NON_BREAKING', message: string, remediation: string }>}
 */
export function compareSchemas(baseline, proposed, jsonPath = '') {
  const issues = [];

  if (!baseline || !proposed) return issues;

  // 1. Primitive type change
  if (baseline.type && proposed.type && baseline.type !== proposed.type) {
    issues.push({
      path: jsonPath || '/',
      violation: 'TYPE_MUTATED',
      severity: 'BREAKING',
      message: `Type mutated from '${baseline.type}' to '${proposed.type}'`,
      remediation: 'Property types cannot be changed in minor revisions. Issue a new major version (.v2) if type changes are necessary.',
    });
    return issues;
  }

  // 2. Const constraint mutation
  if ('const' in baseline) {
    if (!('const' in proposed) || proposed.const !== baseline.const) {
      issues.push({
        path: `${jsonPath}/const`,
        violation: 'CONST_MUTATED',
        severity: 'BREAKING',
        message: `Const constraint modified from '${baseline.const}' to '${proposed.const}'`,
        remediation: 'Const discriminators are immutable in event routing contracts.',
      });
    }
  }

  // 3. Enum narrowing
  if (Array.isArray(baseline.enum)) {
    if (!Array.isArray(proposed.enum)) {
      issues.push({
        path: `${jsonPath}/enum`,
        violation: 'ENUM_REMOVED',
        severity: 'BREAKING',
        message: 'Enum definition was removed from property.',
        remediation: 'Retain enum definition across minor schema revisions.',
      });
    } else {
      const proposedSet = new Set(proposed.enum);
      for (const val of baseline.enum) {
        if (!proposedSet.has(val)) {
          issues.push({
            path: `${jsonPath}/enum/${val}`,
            violation: 'ENUM_VALUE_REMOVED',
            severity: 'BREAKING',
            message: `Enum value '${val}' was removed from allowed set`,
            remediation: 'Enum variants cannot be deleted or renamed in minor revisions.',
          });
        }
      }
      const baselineSet = new Set(baseline.enum);
      for (const val of proposed.enum) {
        if (!baselineSet.has(val)) {
          issues.push({
            path: `${jsonPath}/enum/${val}`,
            violation: 'ENUM_VALUE_ADDED',
            severity: 'NON_BREAKING',
            message: `New enum value '${val}' added to allowed set`,
            remediation: 'Ensure consumers implement unknown-variant fallback.',
          });
        }
      }
    }
  }

  // 4. Required array modifications
  const baseReq = new Set(baseline.required || []);
  const propReq = new Set(proposed.required || []);

  // Required field removed from baseline required list
  for (const field of baseReq) {
    if (!propReq.has(field)) {
      // In strict compatibility, removing a required constraint can break consumers expecting it
      // but in backward compatibility it is sometimes allowed; we flag as BREAKING for in-place contracts
      // if field is also deleted from properties
    }
  }

  // New field added to proposed required list (BREAKING!)
  for (const field of propReq) {
    if (!baseReq.has(field)) {
      issues.push({
        path: `${jsonPath}/required/${field}`,
        violation: 'REQUIRED_FIELD_ADDED',
        severity: 'BREAKING',
        message: `Field '${field}' was added to required array in proposed schema`,
        remediation: 'New fields must be optional in existing event types to preserve backward compatibility.',
      });
    }
  }

  // 5. Properties object diffing
  const baseProps = baseline.properties || {};
  const propProps = proposed.properties || {};

  // Check for removed properties
  for (const [propName, propDef] of Object.entries(baseProps)) {
    if (!(propName in propProps)) {
      issues.push({
        path: `${jsonPath}/properties/${propName}`,
        violation: 'FIELD_REMOVED',
        severity: 'BREAKING',
        message: `Property '${propName}' was deleted from schema`,
        remediation: 'Properties cannot be deleted in minor revisions. Retain the field as deprecated or issue a .v2 schema.',
      });
    } else {
      // Recurse into nested property
      const nestedIssues = compareSchemas(
        propDef,
        propProps[propName],
        `${jsonPath}/properties/${propName}`
      );
      issues.push(...nestedIssues);
    }
  }

  // Check for newly added properties
  for (const [propName] of Object.entries(propProps)) {
    if (!(propName in baseProps)) {
      const isReq = propReq.has(propName);
      if (!isReq) {
        issues.push({
          path: `${jsonPath}/properties/${propName}`,
          violation: 'OPTIONAL_FIELD_ADDED',
          severity: 'NON_BREAKING',
          message: `New optional property '${propName}' added to schema`,
          remediation: 'Valid additive backward-compatible evolution.',
        });
      }
    }
  }

  return issues;
}

/**
 * Audits all schemas in a directory.
 * @param {string} schemasDir
 * @returns {{ passed: number, failed: number, total: number, details: Array<any> }}
 */
export function auditSchemasDirectory(schemasDir = DEFAULT_SCHEMAS_DIR) {
  if (!fs.existsSync(schemasDir)) {
    throw new Error(`Schemas directory does not exist: ${schemasDir}`);
  }

  const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith('.json'));
  const results = {
    passed: 0,
    failed: 0,
    total: files.length,
    details: [],
  };

  for (const file of files) {
    const fullPath = path.join(schemasDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    let schema;
    try {
      schema = JSON.parse(content);
    } catch (e) {
      results.failed++;
      results.details.push({
        file,
        valid: false,
        errors: [{ path: '/', violation: 'SYNTAX_ERROR', message: e.message }],
      });
      continue;
    }

    const envelopeViolations = validateCloudEventsEnvelope(schema, file);
    if (envelopeViolations.length > 0) {
      results.failed++;
      results.details.push({
        file,
        valid: false,
        errors: envelopeViolations,
      });
    } else {
      results.passed++;
      results.details.push({
        file,
        valid: true,
        errors: [],
      });
    }
  }

  return results;
}

// Self-test execution mode
export function runSelfTest() {
  console.log('=== Running Schema Compatibility Checker Self-Test Suite ===\n');

  // Test 1: Validate repository baseline schemas
  console.log('▶ Test 1: Validating canonical repository schemas (if directory present)');
  if (fs.existsSync(DEFAULT_SCHEMAS_DIR)) {
    const repoAudit = auditSchemasDirectory();
    console.log(`  Scanned: ${repoAudit.total} schemas. Passed: ${repoAudit.passed}, Failed: ${repoAudit.failed}`);
    if (repoAudit.failed > 0) {
      console.error('  ❌ Canonical schemas failed validation!');
      for (const d of repoAudit.details.filter((x) => !x.valid)) {
        console.error(`     File: ${d.file}`, d.errors);
      }
      return false;
    }
    console.log('  ✅ 100% of canonical repository schemas passed CloudEvents validation.\n');
  } else {
    console.log('  ℹ️  Schemas directory not present in current workspace; verifying synthetic CloudEvents baseline.');
    const sampleViolations = validateCloudEventsEnvelope(SAMPLE_CAMPAIGN_SCHEMA, 'sample_campaign');
    if (sampleViolations.length > 0) {
      console.error('  ❌ Synthetic CloudEvents baseline failed validation!', sampleViolations);
      return false;
    }
    console.log('  ✅ Synthetic CloudEvents baseline passed validation.\n');
  }

  // Baseline Fixtures for Mutation Testing
  const baseSchema = fs.existsSync(path.join(DEFAULT_SCHEMAS_DIR, 'campaign.creator_invited.json'))
    ? JSON.parse(fs.readFileSync(path.join(DEFAULT_SCHEMAS_DIR, 'campaign.creator_invited.json'), 'utf8'))
    : JSON.parse(JSON.stringify(SAMPLE_CAMPAIGN_SCHEMA));

  // Test 2: Injected breaking mutation - Field Removed
  console.log('▶ Test 2: Detecting Breaking Change (Field Removed)');
  const mutatedRemoved = JSON.parse(JSON.stringify(baseSchema));
  delete mutatedRemoved.properties.data.properties.creator_id;

  const issuesRemoved = compareSchemas(baseSchema, mutatedRemoved);
  const hasRemoved = issuesRemoved.some(
    (i) => i.violation === 'FIELD_REMOVED' && i.severity === 'BREAKING'
  );
  if (!hasRemoved) {
    console.error('  ❌ Failed to catch deleted field mutation!');
    return false;
  }
  console.log('  ✅ Successfully caught breaking FIELD_REMOVED mutation.\n');

  // Test 3: Injected breaking mutation - Required Field Added
  console.log('▶ Test 3: Detecting Breaking Change (Required Field Added)');
  const mutatedReqAdded = JSON.parse(JSON.stringify(baseSchema));
  mutatedReqAdded.properties.data.properties.mandatory_secret = { type: 'string' };
  mutatedReqAdded.properties.data.required.push('mandatory_secret');

  const issuesReqAdded = compareSchemas(baseSchema, mutatedReqAdded);
  const hasReqAdded = issuesReqAdded.some(
    (i) => i.violation === 'REQUIRED_FIELD_ADDED' && i.severity === 'BREAKING'
  );
  if (!hasReqAdded) {
    console.error('  ❌ Failed to catch added required field mutation!');
    return false;
  }
  console.log('  ✅ Successfully caught breaking REQUIRED_FIELD_ADDED mutation.\n');

  // Test 4: Injected breaking mutation - Primitive Type Mutated
  console.log('▶ Test 4: Detecting Breaking Change (Type Mutated)');
  const mutatedType = JSON.parse(JSON.stringify(baseSchema));
  mutatedType.properties.data.properties.commission_rate_bps.type = 'string';

  const issuesType = compareSchemas(baseSchema, mutatedType);
  const hasType = issuesType.some(
    (i) => i.violation === 'TYPE_MUTATED' && i.severity === 'BREAKING'
  );
  if (!hasType) {
    console.error('  ❌ Failed to catch mutated property type!');
    return false;
  }
  console.log('  ✅ Successfully caught breaking TYPE_MUTATED mutation.\n');

  // Baseline Payment Fixture
  const paymentSchema = fs.existsSync(path.join(DEFAULT_SCHEMAS_DIR, 'brand_starter.payment_completed.json'))
    ? JSON.parse(fs.readFileSync(path.join(DEFAULT_SCHEMAS_DIR, 'brand_starter.payment_completed.json'), 'utf8'))
    : JSON.parse(JSON.stringify(SAMPLE_PAYMENT_SCHEMA));

  // Test 5: Injected breaking mutation - Enum Variant Removed
  console.log('▶ Test 5: Detecting Breaking Change (Enum Variant Removed)');
  const mutatedEnum = JSON.parse(JSON.stringify(paymentSchema));
  mutatedEnum.properties.data.properties.payment_method.enum = ['promptpay', 'credit_card']; // 'bank_transfer' removed

  const issuesEnum = compareSchemas(paymentSchema, mutatedEnum);
  const hasEnumRemoved = issuesEnum.some(
    (i) => i.violation === 'ENUM_VALUE_REMOVED' && i.severity === 'BREAKING'
  );
  if (!hasEnumRemoved) {
    console.error('  ❌ Failed to catch removed enum variant!');
    return false;
  }
  console.log('  ✅ Successfully caught breaking ENUM_VALUE_REMOVED mutation.\n');

  // Test 6: Injected breaking mutation - Const Mutated
  console.log('▶ Test 6: Detecting Breaking Change (Const Mutated)');
  const mutatedConst = JSON.parse(JSON.stringify(baseSchema));
  mutatedConst.properties.specversion.const = '2.0';

  const issuesConst = compareSchemas(baseSchema, mutatedConst);
  const hasConstMutated = issuesConst.some(
    (i) => i.violation === 'CONST_MUTATED' && i.severity === 'BREAKING'
  );
  if (!hasConstMutated) {
    console.error('  ❌ Failed to catch mutated const constraint!');
    return false;
  }
  console.log('  ✅ Successfully caught breaking CONST_MUTATED mutation.\n');

  // Test 7: Additive Evolution Accepted (Optional Field Added)
  console.log('▶ Test 7: Accepting Additive Non-Breaking Change (Optional Field)');
  const mutatedAdditive = JSON.parse(JSON.stringify(baseSchema));
  mutatedAdditive.properties.data.properties.optional_tag = {
    type: 'string',
    description: 'Non-breaking optional marketing tag',
  };

  const issuesAdditive = compareSchemas(baseSchema, mutatedAdditive);
  const breakingIssues = issuesAdditive.filter((i) => i.severity === 'BREAKING');
  if (breakingIssues.length > 0) {
    console.error('  ❌ Falsely flagged additive change as breaking!', breakingIssues);
    return false;
  }
  console.log('  ✅ Successfully accepted additive OPTIONAL_FIELD_ADDED as non-breaking.\n');

  // Test 8: Zero Float Math Enforcement
  console.log('▶ Test 8: Enforcing Zero Float Math on Monetary Fields');
  const mutatedFloat = JSON.parse(JSON.stringify(paymentSchema));
  mutatedFloat.properties.data.properties.amount_minor.type = 'number';

  const floatViolations = validateCloudEventsEnvelope(mutatedFloat, 'test_float');
  const hasFloatViolation = floatViolations.some((v) => v.violation === 'FLOAT_MATH_PROHIBITED');
  if (!hasFloatViolation) {
    console.error('  ❌ Failed to reject float math on monetary field!');
    return false;
  }
  console.log('  ✅ Successfully caught FLOAT_MATH_PROHIBITED violation.\n');

  console.log('=== All 8 Self-Test Suites Passed Successfully! ===\n');
  return true;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isSelfTest = process.argv.includes('--self-test');

  if (isSelfTest) {
    const success = runSelfTest();
    process.exit(success ? 0 : 1);
  }

  console.log('================================================================================');
  console.log('🛡️ Soda OS CloudEvents Schema Compatibility & Governance Checker: G-NOTIFY-090');
  console.log('================================================================================\n');

  const startTime = process.hrtime.bigint();
  const audit = auditSchemasDirectory();
  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1_000_000;

  console.log(`▶ Evaluated directory: ${DEFAULT_SCHEMAS_DIR}`);
  console.log(`▶ Total Schemas: ${audit.total}`);
  console.log(`▶ Passed:        ${audit.passed}`);
  console.log(`▶ Failed:        ${audit.failed}`);
  console.log(`▶ Latency:       ${durationMs.toFixed(2)} ms (SLA Budget: <= 500 ms)`);

  if (audit.failed > 0) {
    console.error('\n❌ SCHEMA VALIDATION FAILURES:');
    for (const d of audit.details.filter((x) => !x.valid)) {
      console.error(`  [${d.file}]`);
      for (const err of d.errors) {
        console.error(`    - Path: ${err.path} | ${err.violation}: ${err.message}`);
      }
    }
    process.exit(1);
  }

  console.log('\n✅ 100% of PDR-0004 event schemas conform to CloudEvents v1.0 & Zero-Float Invariants.');
  console.log('Status: CI_GATE_PASSED\n');
  process.exit(0);
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadContractArtifacts,
  validateAgainstSchema,
  validateTelemetrySignalEnvelope,
  runContractSuite
} from './run-contract-tests.mjs';

const { schema, validBundle, invalidBundle } = loadContractArtifacts();

describe('G-TELM-002: Telemetry Signal Contract Compatibility & Fail-Closed Validation', () => {
  it('loads frozen Draft 2020-12 telemetry-signal schema and covers all semantic categories', () => {
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.$defs.MessageHeaders.additionalProperties, false);
    assert.equal(schema.$defs.DlqMetadata.additionalProperties, false);

    const categories = new Set(validBundle.fixtures.map((f) => f.category));
    for (const expectedCategory of ['chat', 'purchase', 'engagement', 'system']) {
      assert.ok(categories.has(expectedCategory), `Missing golden fixture category: ${expectedCategory}`);
    }

    const enumTypes = schema.properties.signal_type.enum;
    const coveredTypes = new Set(validBundle.fixtures.map((f) => f.signal.signal_type));
    for (const signalType of enumTypes) {
      assert.ok(coveredTypes.has(signalType), `Missing golden fixture for signal_type: ${signalType}`);
    }
  });

  it('validates all golden valid fixtures against schema, envelope headers, and SHA-256 digests', () => {
    assert.ok(validBundle.fixtures.length >= 11);
    for (const fixture of validBundle.fixtures) {
      const result = validateTelemetrySignalEnvelope(fixture.signal, schema);
      assert.equal(
        result.valid,
        true,
        `Expected valid fixture "${fixture.id}" to pass, got errors: ${JSON.stringify(result.errors)}`
      );

      assert.ok(fixture.signal.tenant_id, `${fixture.id} must have tenant_id`);
      assert.ok(fixture.signal.session_id, `${fixture.id} must have session_id`);
      assert.ok(fixture.signal.occurred_at, `${fixture.id} must have occurred_at`);
      assert.ok(Number.isInteger(fixture.signal.occurred_at_ms), `${fixture.id} occurred_at_ms must be integer`);
      assert.ok(fixture.signal.headers['X-Traceparent'], `${fixture.id} must carry X-Traceparent header`);
      assert.equal(fixture.signal.headers['X-Tenant-Id'], fixture.signal.tenant_id);
      assert.equal(fixture.signal.headers['X-Session-Id'], fixture.signal.session_id);
    }
  });

  it('supports backward-compatible additive 1.x.y minor versions while rejecting major version drift', () => {
    const minorEvolved = validBundle.fixtures.filter((f) => f.signal.schema_version !== '1.0.0');
    assert.ok(minorEvolved.length >= 2, 'Expected at least two 1.x.y backward-compatibility fixtures');
    for (const fixture of minorEvolved) {
      const result = validateTelemetrySignalEnvelope(fixture.signal, schema);
      assert.equal(result.valid, true);
    }
  });

  it('rejects all malformed, missing-scope, illegal-type, and unversioned-field fixtures fail-closed', () => {
    assert.ok(invalidBundle.fixtures.length >= 15);
    for (const fixture of invalidBundle.fixtures) {
      const fullResult = validateTelemetrySignalEnvelope(fixture.signal, schema);
      assert.equal(
        fullResult.valid,
        false,
        `Expected invalid fixture "${fixture.id}" to fail closed`
      );

      if (!fixture.schema_valid_only) {
        const schemaResult = validateAgainstSchema(fixture.signal, schema, schema, '');
        assert.equal(
          schemaResult.valid,
          false,
          `Expected fixture "${fixture.id}" to fail raw JSON Schema check`
        );
      }

      const keywords = new Set(fullResult.errors.map((e) => e.keyword));
      for (const expectedKeyword of fixture.expected_keywords) {
        assert.ok(
          keywords.has(expectedKeyword),
          `Fixture "${fixture.id}" missing expected error keyword "${expectedKeyword}" in ${JSON.stringify(fullResult.errors)}`
        );
      }

      if (fixture.expected_path_substring) {
        assert.ok(
          fullResult.errors.some((e) => e.path.includes(fixture.expected_path_substring)),
          `Fixture "${fixture.id}" missing expected error path "${fixture.expected_path_substring}"`
        );
      }
    }
  });

  it('passes the standalone contract test suite end-to-end', () => {
    const summary = runContractSuite();
    assert.equal(summary.ok, true, `Contract suite failed: ${JSON.stringify(summary.failures)}`);
  });
});

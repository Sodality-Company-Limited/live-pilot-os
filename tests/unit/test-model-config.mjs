#!/usr/bin/env node
/**
 * tests/unit/test-model-config.mjs
 *
 * Unit test suite for G-ML-017: Model-Provider and Checkpoint Configuration Subsystem
 * Tests ModelConfig schema parsing, boundaries, env overrides, and pre-flight health checks.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ModelConfig, ModelEndpointUnreachableError, SUPPORTED_PROVIDERS } from '../../scripts/lib/model-config.mjs';

const originalEnv = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('SODA_MODEL_')) {
      delete process.env[key];
    }
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// 1. Default configuration
test('test_default_configuration_instantiation', async () => {
  resetEnv();
  const config = new ModelConfig();
  assert.equal(config.provider, 'local');
  assert.equal(config.endpoint, 'http://127.0.0.1:8000/v1');
  assert.equal(config.checkpoint, 'v1.0.0');
  assert.equal(config.timeoutMs, 5000);
  assert.equal(config.healthTimeoutMs, 2000);
  assert.equal(config.thresholdTau, 0.80);
  assert.equal(config.apiKey, null);
  assert.equal(config.healthPath, '/health');
});

// 2. Custom options parsing
test('test_custom_options_parsing', async () => {
  resetEnv();
  const config = new ModelConfig({
    provider: 'vllm',
    endpoint: 'http://serving-cluster.internal:8000/v1/',
    checkpoint: 'soda-os-cognitive-v1.0.0',
    timeoutMs: 3500,
    healthTimeoutMs: 1200,
    thresholdTau: 0.85,
    apiKey: 'sk-test-key-12345',
    healthPath: '/v1/health'
  });

  assert.equal(config.provider, 'vllm');
  assert.equal(config.endpoint, 'http://serving-cluster.internal:8000/v1');
  assert.equal(config.checkpoint, 'soda-os-cognitive-v1.0.0');
  assert.equal(config.timeoutMs, 3500);
  assert.equal(config.healthTimeoutMs, 1200);
  assert.equal(config.thresholdTau, 0.85);
  assert.equal(config.apiKey, 'sk-test-key-12345');
  assert.equal(config.healthPath, '/v1/health');
});

// 3. Serialization and secret redaction
test('test_json_serialization_and_redaction', async () => {
  resetEnv();
  const config = new ModelConfig({
    provider: 'ollama',
    apiKey: 'super-secret-token'
  });

  const redacted = config.toJSON(true);
  assert.equal(redacted.apiKey, '***REDACTED***');
  assert.equal(redacted.provider, 'ollama');

  const unredacted = config.toJSON(false);
  assert.equal(unredacted.apiKey, 'super-secret-token');
});

// 4. Rejection of invalid provider fail-closed
test('test_fail_closed_invalid_provider', async () => {
  resetEnv();
  assert.throws(() => {
    new ModelConfig({ provider: 'unsupported_cloud_ai' });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ provider: 12345 });
  }, RangeError);
});

// 5. Rejection of invalid endpoint URI fail-closed
test('test_fail_closed_invalid_endpoint_uri', async () => {
  resetEnv();
  assert.throws(() => {
    new ModelConfig({ endpoint: 'not-a-valid-uri' });
  }, TypeError);

  assert.throws(() => {
    new ModelConfig({ endpoint: 'ftp://files.internal/v1' });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ endpoint: '' });
  }, TypeError);
});

// 6. Rejection of invalid checkpoint string
test('test_fail_closed_invalid_checkpoint', async () => {
  resetEnv();
  assert.throws(() => {
    new ModelConfig({ checkpoint: '' });
  }, TypeError);

  assert.throws(() => {
    new ModelConfig({ checkpoint: '   ' });
  }, TypeError);
});

// 7. Rejection of invalid timeouts
test('test_fail_closed_invalid_timeouts', async () => {
  resetEnv();
  assert.throws(() => {
    new ModelConfig({ timeoutMs: -100 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ timeoutMs: 0 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ timeoutMs: 999999 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ healthTimeoutMs: 0 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ healthTimeoutMs: 50000 });
  }, RangeError);
});

// 8. Rejection of out-of-bounds thresholdTau
test('test_fail_closed_threshold_bounds', async () => {
  resetEnv();
  assert.throws(() => {
    new ModelConfig({ thresholdTau: -0.01 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ thresholdTau: 1.01 });
  }, RangeError);

  assert.throws(() => {
    new ModelConfig({ thresholdTau: NaN });
  }, RangeError);
});

// 9. Environment variable overrides
test('test_environment_variable_overrides', async () => {
  resetEnv();
  process.env.SODA_MODEL_PROVIDER = 'remote';
  process.env.SODA_MODEL_ENDPOINT = 'https://ai-gateway.internal/v1';
  process.env.SODA_MODEL_CHECKPOINT = 'checkpoint-env-v2';
  process.env.SODA_MODEL_TIMEOUT_MS = '4200';
  process.env.SODA_MODEL_HEALTH_TIMEOUT_MS = '1800';
  process.env.SODA_MODEL_THRESHOLD_TAU = '0.75';
  process.env.SODA_MODEL_API_KEY = 'env-api-key';

  const config = new ModelConfig();
  assert.equal(config.provider, 'remote');
  assert.equal(config.endpoint, 'https://ai-gateway.internal/v1');
  assert.equal(config.checkpoint, 'checkpoint-env-v2');
  assert.equal(config.timeoutMs, 4200);
  assert.equal(config.healthTimeoutMs, 1800);
  assert.equal(config.thresholdTau, 0.75);
  assert.equal(config.apiKey, 'env-api-key');

  resetEnv();
});

// 10. File-based configuration loading
test('test_file_based_configuration_loading', async () => {
  resetEnv();
  const tmpFile = path.resolve(process.cwd(), '.tmp_test_model_config.json');
  try {
    fs.writeFileSync(tmpFile, JSON.stringify({
      provider: 'ollama',
      endpoint: 'http://localhost:11434/v1',
      checkpoint: 'llama3-calibrated',
      timeoutMs: 4000,
      thresholdTau: 0.70
    }));

    const config = ModelConfig.fromFile(tmpFile);
    assert.equal(config.provider, 'ollama');
    assert.equal(config.endpoint, 'http://localhost:11434/v1');
    assert.equal(config.checkpoint, 'llama3-calibrated');
    assert.equal(config.timeoutMs, 4000);
    assert.equal(config.thresholdTau, 0.70);

    // Overrides passed to constructor take precedence over file
    const configWithOverride = ModelConfig.fromFile(tmpFile, { thresholdTau: 0.95 });
    assert.equal(configWithOverride.thresholdTau, 0.95);
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
});

// 11. Static validation method
test('test_static_config_validation', async () => {
  const validResult = ModelConfig.validate({
    provider: 'vllm',
    endpoint: 'http://127.0.0.1:8000/v1',
    checkpoint: 'v1.0.0',
    timeoutMs: 5000,
    thresholdTau: 0.8
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);

  const invalidResult = ModelConfig.validate({
    provider: 'invalid_type',
    endpoint: 'not_url',
    thresholdTau: 2.5
  });
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.errors.length >= 3, true);
});

// 12. Pre-flight health check on healthy server
test('test_health_check_healthy_endpoint', async () => {
  resetEnv();
  const server = http.createServer((req, res) => {
    if ((req.url === '/health' || req.url === '/v1/health') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', model: 'dual-head-v1' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const config = new ModelConfig({
      endpoint: `http://127.0.0.1:${port}/v1`,
      healthPath: '/health'
    });

    const result = await config.checkHealth();
    assert.equal(result.healthy, true);
    assert.equal(result.status, 200);
    assert.equal(typeof result.latencyMs, 'number');
    assert.equal(result.latencyMs >= 0, true);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// 13. Pre-flight health check on unhealthy server (500 Error)
test('test_health_check_server_error_rejection', async () => {
  resetEnv();
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Service Unavailable');
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const config = new ModelConfig({
      endpoint: `http://127.0.0.1:${port}/v1`,
      healthPath: '/health'
    });

    // throwOnError = true (default)
    await assert.rejects(async () => {
      await config.checkHealth();
    }, (err) => {
      assert.equal(err instanceof ModelEndpointUnreachableError, true);
      assert.equal(err.code, 'HTTP_ERROR');
      assert.equal(err.status, 503);
      return true;
    });

    // throwOnError = false
    const fallbackResult = await config.checkHealth({ throwOnError: false });
    assert.equal(fallbackResult.healthy, false);
    assert.equal(fallbackResult.status, 503);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// 14. Pre-flight health check on unreachable endpoint (Connection Refused)
test('test_health_check_connection_refused', async () => {
  resetEnv();
  // Port 59199 is assumed unbound
  const config = new ModelConfig({
    endpoint: 'http://127.0.0.1:59199/v1',
    healthTimeoutMs: 500
  });

  await assert.rejects(async () => {
    await config.checkHealth();
  }, (err) => {
    assert.equal(err instanceof ModelEndpointUnreachableError, true);
    assert.equal(err.code === 'CONNECTION_REFUSED' || err.code === 'ENDPOINT_UNREACHABLE', true);
    return true;
  });

  const softResult = await config.checkHealth({ throwOnError: false });
  assert.equal(softResult.healthy, false);
  assert.equal(softResult.status, 0);
});

// 15. Pre-flight health check timeout SLA breach
test('test_health_check_timeout_abort', async () => {
  resetEnv();
  const server = http.createServer((req, res) => {
    // Hangs indefinitely without responding
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const config = new ModelConfig({
      endpoint: `http://127.0.0.1:${port}/v1`,
      healthTimeoutMs: 150
    });

    await assert.rejects(async () => {
      await config.checkHealth({ timeoutMs: 150 });
    }, (err) => {
      assert.equal(err instanceof ModelEndpointUnreachableError, true);
      assert.equal(err.code, 'TIMEOUT');
      return true;
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// Runner
async function runTests() {
  const args = process.argv.slice(2);
  let filter = null;
  const kIdx = args.indexOf('-k');
  if (kIdx !== -1 && args[kIdx + 1]) {
    filter = args[kIdx + 1];
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING MODEL CONFIGURATION UNIT TEST SUITE (G-ML-017)');
  if (filter) {
    console.log(`   Applying filter: -k "${filter}"`);
  }
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    if (filter && !name.includes(filter)) {
      continue;
    }
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Summary: ${passed} / ${passed + failed} Tests Passed (${((passed / (passed + failed || 1)) * 100).toFixed(1)}%)`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

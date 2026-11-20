#!/usr/bin/env node
/**
 * tests/integration/test-model-adapter.mjs
 *
 * Integration test suite for ModelAdapter and ModelInferenceError (G-ML-013)
 *
 * Implements real network socket testing against a live node:http server on port 0.
 * Invariant: ZERO MOCKS, ZERO STUBS, ZERO TEST DOUBLES. Real network sockets only.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { ModelAdapter, ModelInferenceError, createLocalInferenceServer } from '../../scripts/lib/model-adapter.mjs';

const filterArgIndex = process.argv.indexOf('-k');
const filterKeyword = filterArgIndex !== -1 && process.argv[filterArgIndex + 1] ? process.argv[filterArgIndex + 1] : null;

async function runTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🧪 SODA OS MODEL ADAPTER LIVE INTEGRATION TEST SUITE (G-ML-013)');
  console.log('   Testing real HTTP socket transport, timeouts, schemas, and confidence bounds');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name, fn) {
    if (filterKeyword && !name.includes(filterKeyword)) {
      return;
    }
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 1: Successful Inference with Calibrated Output
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_successful_inference_and_calibration', async () => {
    let receivedBody = null;
    let receivedAuth = null;

    const testServer = await createLocalInferenceServer(async (req, res) => {
      receivedAuth = req.headers['authorization'];
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      receivedBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'Proceeding with migration sequence under verified consensus.',
        confidence: 0.942,
        decisionToken: 'proceed',
        tokenCount: 42
      }));
    });

    try {
      const adapter = new ModelAdapter({
        endpointUrl: testServer.url,
        timeoutMs: 2000,
        agentId: 'agent-ci-runner',
        apiKey: 'sk-soda-test-token-1234'
      });

      const result = await adapter.generateDecision('Evaluate database migration risk.');

      assert.equal(receivedAuth, 'Bearer sk-soda-test-token-1234');
      assert.equal(receivedBody.prompt, 'Evaluate database migration risk.');
      assert.equal(receivedBody.agent_id, 'agent-ci-runner');

      assert.equal(result.text, 'Proceeding with migration sequence under verified consensus.');
      assert.equal(result.confidence, 0.942);
      assert.equal(result.decisionToken, 'proceed');
      assert.equal(result.tokenCount, 42);
      assert.ok(result.latencyMs >= 0, 'latencyMs must be non-negative');
      assert.ok(typeof result.timestamp === 'string');
      assert.ok(!isNaN(Date.parse(result.timestamp)));
    } finally {
      await testServer.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 2: Strict Confidence Bounds Validation
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_error_handling_invalid_confidence_above_one', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'Decision with out-of-bounds confidence',
        confidence: 1.05,
        decisionToken: 'proceed'
      }));
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('Test prompt'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'INVALID_CONFIDENCE');
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  await test('test_error_handling_invalid_confidence_negative', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text: 'Decision with negative confidence',
        confidence: -0.01,
        decisionToken: 'proceed'
      }));
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('Test prompt'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'INVALID_CONFIDENCE');
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  await test('test_error_handling_invalid_confidence_non_finite_nan', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Non-finite can arrive as null or missing or invalid float
      res.end('{"text": "Decision with null confidence", "confidence": null}');
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('Test prompt'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'INVALID_CONFIDENCE');
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 3: Fail-Closed Gateway Timeout Handling
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_error_handling_gateway_timeout_sla_breach', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      // Intentionally delay responding beyond the SLA timeout limit
      setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text: 'Delayed completion', confidence: 0.8 }));
        }
      }, 300);
    });

    try {
      const adapter = new ModelAdapter({
        endpointUrl: testServer.url,
        timeoutMs: 50 // Short 50ms SLA budget
      });

      await assert.rejects(
        async () => adapter.generateDecision('Timeout test'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'GATEWAY_TIMEOUT');
          assert.match(err.message, /timed out after 50ms SLA limit/);
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 4: Network Partition and HTTP Error Escalation
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_error_handling_network_partition_connection_refused', async () => {
    // Unallocated ephemeral port that immediately refuses connection
    const adapter = new ModelAdapter({
      endpointUrl: 'http://127.0.0.1:49876/v1/decision',
      timeoutMs: 1000
    });

    await assert.rejects(
      async () => adapter.generateDecision('Network partition test'),
      (err) => {
        assert.ok(err instanceof ModelInferenceError);
        assert.equal(err.code, 'NETWORK_PARTITION');
        return true;
      }
    );
  });

  await test('test_error_handling_gateway_http_500_server_error', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CUDA out of memory error during inference' }));
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('CUDA test'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'HTTP_ERROR');
          assert.equal(err.status, 500);
          assert.match(err.message, /HTTP 500/);
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 5: Malformed JSON Payload Rejection
  // ─────────────────────────────────────────────────────────────────────────────
  await test('test_error_handling_malformed_non_json_html_error', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>');
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('Malformed payload test'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'MALFORMED_RESPONSE');
          assert.match(err.message, /Expected valid JSON/);
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  await test('test_error_handling_missing_text_completion_field', async () => {
    const testServer = await createLocalInferenceServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ confidence: 0.85, decisionToken: 'proceed' }));
    });

    try {
      const adapter = new ModelAdapter({ endpointUrl: testServer.url, timeoutMs: 2000 });
      await assert.rejects(
        async () => adapter.generateDecision('Missing text test'),
        (err) => {
          assert.ok(err instanceof ModelInferenceError);
          assert.equal(err.code, 'MALFORMED_RESPONSE');
          assert.match(err.message, /Missing or non-string text completion field/);
          return true;
        }
      );
    } finally {
      await testServer.close();
    }
  });

  await test('test_error_handling_invalid_empty_prompt', async () => {
    const adapter = new ModelAdapter();
    await assert.rejects(
      async () => adapter.generateDecision(''),
      (err) => {
        assert.ok(err instanceof ModelInferenceError);
        assert.equal(err.code, 'INVALID_PROMPT');
        return true;
      }
    );
  });

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Integration Test Results: ${passedTests} / ${totalTests} Passed (100.0%)`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  recordModularTelemetry,
  readSessionTelemetry,
  listSessionTelemetry,
} from '../lib/modular-telemetry-engine.mjs';

test('recordModularTelemetry writes individual JSON file and creates LLM Wiki markdown report in docs/06_raw', async () => {
  const telemetryData = {
    goalId: 'G-PAY-001',
    role: 'implementer',
    persona: 'backend-api-engineer',
    provider: 'Codex CLI',
    model: 'o3-mini',
    sessionKey: '9a8f1b2c3d4e5f60',
    mandate: 'Implement Stripe webhook signature verification',
    declaredTouchMap: ['src/routes/stripe.ts'],
    changedFiles: ['src/routes/stripe.ts'],
    turns: 2,
    inputTokens: 1450,
    outputTokens: 420,
    elapsedSeconds: 4,
    status: 'complete',
    exitCode: 0,
    summary: 'Created Stripe signature verification endpoint with zero mocks.',
    tools: { read_file: 2, edit_file: 1, run_command: 1 },
    verification: {
      command: 'npm test',
      passed: true,
      testsRun: 8,
      testsPassed: 8,
    },
  };

  const result = await recordModularTelemetry(telemetryData, process.cwd());

  assert.ok(result.jsonPath.endsWith('.json'));
  assert.ok(result.wikiPath.endsWith('.md'));
  assert.match(result.wikiPath, /docs\/06_raw\//);

  // 1. Verify modular JSON file
  const jsonContent = JSON.parse(await fs.readFile(result.jsonPath, 'utf-8'));
  assert.equal(jsonContent.goalId, 'G-PAY-001');
  assert.equal(jsonContent.persona, 'backend-api-engineer');
  assert.equal(jsonContent.status, 'complete');
  assert.deepEqual(jsonContent.changedFiles, ['src/routes/stripe.ts']);

  // 2. Verify LLM Wiki markdown report
  const wikiContent = await fs.readFile(result.wikiPath, 'utf-8');
  assert.match(wikiContent, /# 📊 Subagent Execution Telemetry/);
  assert.match(wikiContent, /G-PAY-001/);
  assert.match(wikiContent, /backend-api-engineer/);
  assert.match(wikiContent, /Stripe signature verification/);
  assert.match(wikiContent, /npm test/);

  // 3. Verify indexing in docs/06_raw/index.md and log.md
  const indexContent = await fs.readFile(path.join(process.cwd(), 'docs/06_raw/index.md'), 'utf-8');
  assert.match(indexContent, new RegExp(path.basename(result.wikiPath)));

  const logContent = await fs.readFile(path.join(process.cwd(), 'docs/06_raw/log.md'), 'utf-8');
  assert.match(logContent, /Subagent Execution Telemetry/);
});

test('readSessionTelemetry retrieves session details by goalId or sessionKey', async () => {
  const records = await listSessionTelemetry('G-PAY-001', process.cwd());
  assert.ok(records.length > 0);
  assert.equal(records[0].goalId, 'G-PAY-001');
});

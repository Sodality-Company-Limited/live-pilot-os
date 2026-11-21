import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { recordCognitiveTrajectory, readCognitiveTrajectory } from '../lib/cognitive-trajectory-recorder.mjs';

test('recordCognitiveTrajectory persists sanitized full-fidelity trajectory and returns valid digest', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soda-traj-test-'));

  const sampleTrajectory = {
    sessionKey: 'test-sess-999',
    goalId: 'G-ML-029',
    provider: 'Codex CLI',
    model: 'o3-mini',
    persona: 'machine_learning_engineer',
    role: 'implementer',
    mandate: 'Implement cognitive trajectory recorder with API key sk-proj-1234567890abcdef1234567890abcdef12345678',
    touchMap: ['scripts/agents/lib/cognitive-trajectory-recorder.mjs'],
    fullPrompt: 'Fix prompt with token ghp_1234567890abcdefghijklmnopqrstuvwxyz12',
    rawResponse: 'Generated code cleanly with exitCode 0',
    summary: 'Successfully persisted trajectory',
    status: 'complete',
    exitCode: 0,
    changedFiles: ['scripts/agents/lib/cognitive-trajectory-recorder.mjs'],
    inputTokens: 1200,
    outputTokens: 350,
    elapsedSeconds: 3,
    turns: 1,
    tools: {
      'write_file': 1
    },
    verification: {
      command: 'npm test',
      passed: true,
      testsRun: 5,
      testsPassed: 5
    }
  };

  const result = await recordCognitiveTrajectory(sampleTrajectory, tmpDir);

  assert.ok(result.trajectoryPath);
  assert.ok(result.digest);
  assert.equal(typeof result.digest, 'string');
  assert.equal(result.digest.length, 64);

  // Read saved record
  const saved = await readCognitiveTrajectory(result.trajectoryPath);
  assert.ok(saved);
  assert.equal(saved.sessionKey, 'test-sess-999');
  assert.equal(saved.digest, result.digest);
  assert.doesNotMatch(saved.fullPrompt, /ghp_/);
  assert.doesNotMatch(saved.mandate, /sk-proj-/);
  assert.match(saved.fullPrompt, /\[REDACTED_TOKEN\]/);

  // Clean up
  await fs.rm(tmpDir, { recursive: true, force: true });
});

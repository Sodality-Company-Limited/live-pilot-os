import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  calculateCalibratedRewardFromTrajectory,
  generateRlcdPreferencePairsFromTrajectories,
  partitionPreferenceSplits,
  buildTrajectoryRlcdDataset
} from '../../scripts/lib/dave-trajectory-builder.mjs';

test('calculateCalibratedRewardFromTrajectory assigns higher reward to complete runs with passing tests', () => {
  const successTraj = {
    status: 'complete',
    exitCode: 0,
    elapsedSeconds: 2,
    inputTokens: 1000,
    outputTokens: 200,
    verification: { passed: true, testsRun: 5, testsPassed: 5 }
  };

  const failureTraj = {
    status: 'needs-review',
    exitCode: 1,
    elapsedSeconds: 15,
    inputTokens: 5000,
    outputTokens: 2000,
    verification: { passed: false, testsRun: 5, testsPassed: 2 }
  };

  const rSuccess = calculateCalibratedRewardFromTrajectory(successTraj);
  const rFailure = calculateCalibratedRewardFromTrajectory(failureTraj);

  assert.ok(rSuccess > rFailure);
  assert.ok(rSuccess > 0.5);
  assert.ok(rFailure < 0.0);
  assert.ok(rSuccess <= 1.0);
  assert.ok(rFailure >= -1.0);
});

test('generateRlcdPreferencePairsFromTrajectories constructs validated contrastive pairs', () => {
  const trajectories = [
    {
      sessionKey: 'sess-win-1',
      goalId: 'G-TEST-001',
      mandate: 'Build Stripe Webhook',
      fullPrompt: 'Fix stripe webhook signature',
      rawResponse: 'export function verifyStripe() { return true; }',
      status: 'complete',
      exitCode: 0,
      elapsedSeconds: 2,
      inputTokens: 1000,
      outputTokens: 300,
      verification: { passed: true, testsRun: 4, testsPassed: 4 }
    },
    {
      sessionKey: 'sess-lose-1',
      goalId: 'G-TEST-001',
      mandate: 'Build Stripe Webhook',
      fullPrompt: 'Fix stripe webhook signature',
      rawResponse: 'throw new Error("unimplemented");',
      status: 'blocked',
      exitCode: 1,
      elapsedSeconds: 8,
      inputTokens: 2000,
      outputTokens: 100,
      verification: { passed: false, testsRun: 4, testsPassed: 0 }
    }
  ];

  const pairs = generateRlcdPreferencePairsFromTrajectories(trajectories);
  assert.equal(pairs.length, 1);
  const pair = pairs[0];
  assert.ok(pair.chosen);
  assert.ok(pair.rejected);
  assert.equal(pair.chosen.session_key, 'sess-win-1');
  assert.equal(pair.rejected.session_key, 'sess-lose-1');
  assert.ok(pair.chosen.reward > pair.rejected.reward);
  assert.ok(pair.metadata.delta_reward > 0);
  assert.equal(pair.metadata.margin_valid, true);
});

test('partitionPreferenceSplits enforces disjoint train/val/test splits without leakage', () => {
  const pairs = Array.from({ length: 20 }, (_, i) => ({
    pair_id: `pair-${i}`,
    metadata: { goal_id: `G-TASK-${i % 5}` },
    prompt: `Task ${i}`
  }));

  const { train, val, test: testSet } = partitionPreferenceSplits(pairs, {
    trainRatio: 0.8,
    valRatio: 0.1,
    testRatio: 0.1
  });

  assert.equal(train.length + val.length + testSet.length, pairs.length);
  const trainIds = new Set(train.map((p) => p.pair_id));
  const valIds = new Set(val.map((p) => p.pair_id));
  const testIds = new Set(testSet.map((p) => p.pair_id));

  // Verify 0% intersection across partitions
  for (const id of valIds) assert.ok(!trainIds.has(id));
  for (const id of testIds) {
    assert.ok(!trainIds.has(id));
    assert.ok(!valIds.has(id));
  }
});

test('buildTrajectoryRlcdDataset ingests trajectories and exports split datasets to disk', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soda-rlcd-test-'));
  const trajDir = path.join(tmpDir, 'trajectories');
  await fs.mkdir(trajDir, { recursive: true });

  const winTraj = {
    sessionKey: 's1',
    goalId: 'G-BUILD-01',
    fullPrompt: 'Solve problem A',
    rawResponse: 'Solved cleanly',
    status: 'complete',
    exitCode: 0,
    elapsedSeconds: 1,
    inputTokens: 500,
    outputTokens: 100,
    verification: { passed: true, testsRun: 2, testsPassed: 2 }
  };

  const loseTraj = {
    sessionKey: 's2',
    goalId: 'G-BUILD-01',
    fullPrompt: 'Solve problem A',
    rawResponse: 'Failed with syntax error',
    status: 'needs-review',
    exitCode: 1,
    elapsedSeconds: 5,
    inputTokens: 1500,
    outputTokens: 50,
    verification: { passed: false, testsRun: 2, testsPassed: 0 }
  };

  await fs.writeFile(path.join(trajDir, 'win.json'), JSON.stringify(winTraj), 'utf-8');
  await fs.writeFile(path.join(trajDir, 'lose.json'), JSON.stringify(loseTraj), 'utf-8');

  const outDir = path.join(tmpDir, 'rlcd_output');
  const result = await buildTrajectoryRlcdDataset({
    trajectoryDir: trajDir,
    outputDir: outDir
  });

  assert.ok(result.totalPairs >= 1);
  assert.ok(result.manifest);
  assert.ok(await fs.stat(path.join(outDir, 'train.jsonl')));

  await fs.rm(tmpDir, { recursive: true, force: true });
});

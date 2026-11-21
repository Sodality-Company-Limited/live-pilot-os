import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  exportDaveRlcdData,
  recordDaveTrajectory
} from '../../scripts/lib/dave-engine.mjs';

describe('G-WEB-012: Production Readiness and Learning Unit Test Suite', () => {
  const tmpDir = path.join(process.cwd(), 'artifacts/test-g-web-012');

  function setupTmpDir() {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  }

  function cleanupTmpDir() {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  it('1. AC-WEB-012-01: All 9 specialized DAVE verification harnesses must pass with exit code 0', () => {
    const harnesses = [
      'scripts/harness/dave-decision-schema-harness.mjs',
      'scripts/harness/dave-reference-harness.mjs',
      'scripts/harness/dave-decision-trace-harness.mjs',
      'scripts/harness/ui-spec-conformance-harness.mjs',
      'scripts/harness/token-guardrail-harness.mjs',
      'scripts/harness/visual-regression-harness.mjs',
      'scripts/harness/motion-harness.mjs',
      'scripts/harness/asset-harness.mjs',
      'scripts/harness/audio-harness.mjs'
    ];

    for (const harness of harnesses) {
      assert.ok(fs.existsSync(harness), `Harness file must exist: ${harness}`);
      const res = spawnSync(process.execPath, [harness], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env
      });
      assert.equal(res.status, 0, `Harness ${harness} failed with exit code ${res.status}:\n${res.stderr || res.stdout}`);
    }
  });

  it('2. AC-WEB-012-02: Strictly proper logarithmic scoring and asymmetric 10x penalty math', () => {
    setupTmpDir();
    const ledgerPath = path.join(tmpDir, 'test-scoring-ledger.jsonl');
    const outPath = path.join(tmpDir, 'test-scoring-out.jsonl');

    // 1. Correct decision with high confidence: R = ln(0.95) ~ -0.0513, penalty = 0
    recordDaveTrajectory(ledgerPath, {
      decision_id: 'DEC-001',
      goal_id: 'G-TEST-001',
      decision_type: 'ux_ui_design',
      confidence: 0.95,
      empirical_outcome: { correct: true },
      human_action: 'approve'
    });

    // 2. Incorrect decision with low confidence: R = ln(1 - 0.30) = ln(0.70) ~ -0.3567, penalty = 0 (< 0.80)
    recordDaveTrajectory(ledgerPath, {
      decision_id: 'DEC-002',
      goal_id: 'G-TEST-002',
      decision_type: 'frontend_implementation',
      confidence: 0.30,
      empirical_outcome: { correct: false },
      human_action: 'reject'
    });

    // 3. Incorrect decision with high confidence (Overconfidence):
    // conf = 0.90 -> log_score = ln(1 - 0.90) = ln(0.10) ~ -2.3026
    // penalty = 0.90^2 * 10 = 0.81 * 10 = 8.1000
    // net_reward = -2.3026 - 8.1000 = -10.4026
    recordDaveTrajectory(ledgerPath, {
      decision_id: 'DEC-003',
      goal_id: 'G-TEST-003',
      decision_type: 'security',
      confidence: 0.90,
      empirical_outcome: { correct: false },
      human_action: 'reject'
    });

    const exportedCount = exportDaveRlcdData(ledgerPath, outPath);
    assert.equal(exportedCount, 3);

    const records = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.equal(records.length, 3);

    // Record 1 Check
    assert.equal(records[0].empirical_correct, true);
    assert.equal(records[0].reward.overconfidence_penalty, 0.0);
    assert.ok(Math.abs(records[0].reward.log_score - Math.log(0.95)) < 1e-3);
    assert.equal(records[0].reward.net_reward, records[0].reward.log_score);

    // Record 2 Check
    assert.equal(records[1].empirical_correct, false);
    assert.equal(records[1].reward.overconfidence_penalty, 0.0);
    assert.ok(Math.abs(records[1].reward.log_score - Math.log(0.70)) < 1e-3);
    assert.equal(records[1].reward.net_reward, records[1].reward.log_score);

    // Record 3 Check
    assert.equal(records[2].empirical_correct, false);
    assert.equal(records[2].reward.overconfidence_penalty, 8.1000);
    assert.ok(records[2].reward.net_reward <= -10.0);
    assert.ok(Math.abs(records[2].reward.net_reward - (records[2].reward.log_score - 8.1000)) < 1e-4);

    cleanupTmpDir();
  });

  it('3. AC-WEB-012-03: Exported RLCD dataset conforms to trajectory schema and 80/10/10 split', () => {
    setupTmpDir();
    const ledgerPath = path.join(tmpDir, 'test-split-ledger.jsonl');
    const outPath = path.join(tmpDir, 'test-split-out.jsonl');

    // Create 10 synthetic trajectory records
    for (let i = 1; i <= 10; i++) {
      recordDaveTrajectory(ledgerPath, {
        decision_id: `DEC-${String(i).padStart(3, '0')}`,
        goal_id: `G-SPLIT-${i}`,
        decision_type: 'ux_ui_design',
        decision: { summary: `Action ${i}` },
        confidence: 0.90 + (i % 5) * 0.01,
        empirical_outcome: { correct: i % 2 === 0 },
        human_action: i % 2 === 0 ? 'approve' : 'reject'
      });
    }

    const exportedCount = exportDaveRlcdData(ledgerPath, outPath);
    assert.equal(exportedCount, 10);

    const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.equal(lines.length, 10);

    let trainCount = 0;
    let valCount = 0;
    let testCount = 0;

    for (const rec of lines) {
      assert.ok(rec.trajectory_id && rec.trajectory_id.startsWith('traj-'));
      assert.ok(rec.decision_id);
      assert.ok(rec.decision_type);
      assert.ok(rec.goal_id);
      assert.ok(typeof rec.confidence === 'number');
      assert.ok(typeof rec.empirical_correct === 'boolean');
      assert.ok(rec.reward && typeof rec.reward.net_reward === 'number');
      assert.ok(['train', 'validation', 'test'].includes(rec.split));

      if (rec.split === 'train') trainCount++;
      if (rec.split === 'validation') valCount++;
      if (rec.split === 'test') testCount++;
    }

    // 80% train = 8, 10% val = 1, 10% test = 1
    assert.equal(trainCount, 8);
    assert.equal(valCount, 1);
    assert.equal(testCount, 1);

    cleanupTmpDir();
  });

  it('4. Fail-closed handling on non-existent or empty audit ledger', () => {
    setupTmpDir();
    const badLedger = path.join(tmpDir, 'non-existent-ledger.jsonl');
    const outPath = path.join(tmpDir, 'empty-out.jsonl');

    const count = exportDaveRlcdData(badLedger, outPath);
    assert.equal(count, 0);

    cleanupTmpDir();
  });

  it('5. CLI export-rlcd-data command writes to target path cleanly', () => {
    const targetPath = 'artifacts/rlcd/train_dataset.jsonl';
    const res = spawnSync(process.execPath, [
      'scripts/lib/dave-cli.mjs',
      'export-rlcd-data',
      '--output',
      targetPath
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env
    });

    assert.equal(res.status, 0, `CLI failed: ${res.stderr || res.stdout}`);
    assert.ok(fs.existsSync(targetPath));
    const lines = fs.readFileSync(targetPath, 'utf8').trim().split('\n').filter(Boolean);
    assert.ok(lines.length > 0, 'Exported dataset must not be empty');
  });
});

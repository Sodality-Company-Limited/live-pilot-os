import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ingestDecisionTrajectories,
  normalizeDecisionPrompt,
  mapCorrectionAndOracleLabel,
  calculateCalibratedReward,
  generatePreferencePairs,
  partitionDatasetSplits,
  buildRlcdDataset,
  validatePreferenceRecord,
  RLCD_CORRECTION_CATEGORIES
} from '../../scripts/lib/dave-trajectory-builder.mjs';

describe('DAVE Trajectory Builder & RLCD Preference Dataset Test Suite (G-ML-025)', () => {
  const testDir = path.join(process.cwd(), 'artifacts/test-trajectory-builder');
  const fixtureLedgerPath = path.join(testDir, 'test-decisions.jsonl');
  const fixtureOutputPath = path.join(testDir, 'test-train_dataset.jsonl');

  const sampleDecisions = [
    {
      decision_id: 'DAVE-UX-G-WEB-001',
      decision_type: 'ux_ui_design',
      goal_id: 'G-WEB-001',
      confidence: 0.94,
      risk: 'medium',
      evidence: ['docs/02-product/design/G-WEB-001.md'],
      references: ['REF-0001'],
      assumptions: ['Locked 1440x900 viewport @ 1.0 DPR'],
      alternatives_rejected: ['Fluid auto-fit rejected'],
      verification: ['token-guardrail', 'visual-regression'],
      decision: {
        summary: 'Canonical UX/UI layout and design token hierarchy for G-WEB-001',
        primary_action: 'Lock 1440x900 viewport and 12-column grid'
      },
      empirical_outcome: {
        correct: true,
        pixel_diff_ratio: 0.0018
      },
      human_action: 'approve',
      recorded_at: '2026-10-03T10:06:00.000Z'
    },
    {
      decision_id: 'DAVE-FE-G-WEB-001',
      decision_type: 'frontend_implementation',
      goal_id: 'G-WEB-001',
      confidence: 0.92,
      risk: 'low',
      evidence: ['docs/03-architecture/design-tokens.md'],
      references: ['REF-0001'],
      assumptions: ['React 19 with CSS Modules'],
      alternatives_rejected: ['Tailwind inline styling rejected'],
      verification: ['ui-spec-conformance'],
      decision: {
        summary: 'Component tree and styling strategy for G-WEB-001',
        component_tree: 'WorkspaceLayout > (CommandRail, DecisionCanvas)'
      },
      empirical_outcome: {
        correct: true
      },
      human_action: 'approve',
      recorded_at: '2026-10-03T10:07:00.000Z'
    },
    {
      decision_id: 'DAVE-A11Y-G-WEB-002',
      decision_type: 'accessibility',
      goal_id: 'G-WEB-002',
      confidence: 0.88,
      risk: 'high',
      evidence: ['docs/02-product/design/G-WEB-002.md'],
      references: ['REF-0002'],
      assumptions: ['WCAG 2.2 AA compliance required'],
      alternatives_rejected: ['3.0:1 contrast ratio rejected'],
      verification: ['contrast-check'],
      decision: {
        summary: 'Suboptimal low contrast palette (3.5:1)',
        contrast_ratio: 3.5
      },
      empirical_outcome: {
        correct: false,
        error: 'Contrast ratio 3.5:1 breached WCAG 4.5:1 minimum'
      },
      human_action: 'reject',
      correction: {
        corrected_decision: {
          summary: 'Enforce high contrast palette (4.8:1)',
          contrast_ratio: 4.8
        },
        category: 'accessibility_contrast',
        notes: 'Human reviewer and axe-core detected contrast violation'
      },
      recorded_at: '2026-10-03T10:10:00.000Z'
    },
    {
      decision_id: 'DAVE-ARCH-G-CORE-005',
      decision_type: 'system_architecture',
      goal_id: 'G-CORE-005',
      confidence: 0.96,
      risk: 'high',
      evidence: ['docs/03-architecture/system-topology.md'],
      references: ['REF-0003'],
      assumptions: ['Zero mocks invariant'],
      alternatives_rejected: ['Synchronous HTTP IPC rejected'],
      verification: ['architecture-conformance'],
      decision: {
        summary: 'Synchronous blocking RPC without circuit breaker',
        transport: 'http_sync'
      },
      empirical_outcome: {
        correct: false,
        error: 'Synchronous blocking RPC violates fault tolerance invariant'
      },
      human_action: 'reject',
      correction: {
        corrected_decision: {
          summary: 'Asynchronous NATS JetStream event-driven architecture with outbox pattern',
          transport: 'nats_async'
        },
        category: 'architectural_invariant',
        notes: 'Enforce EDA saga pattern with compensation'
      },
      recorded_at: '2026-10-03T10:15:00.000Z'
    },
    {
      decision_id: 'DAVE-SEC-G-SEC-001',
      decision_type: 'security',
      goal_id: 'G-SEC-001',
      confidence: 0.95,
      risk: 'high',
      evidence: ['docs/03-architecture/security-boundaries.md'],
      references: ['REF-0004'],
      assumptions: ['Zero-trust sandbox boundary'],
      alternatives_rejected: ['Unrestricted container root execution'],
      verification: ['sandbox-isolation'],
      decision: {
        summary: 'Deploy untrusted tool code in root namespace',
        isolation: 'none'
      },
      empirical_outcome: {
        correct: false,
        error: 'Root execution breached zero-trust sandbox policy'
      },
      human_action: 'reject',
      correction: {
        corrected_decision: {
          summary: 'Execute untrusted code in Wasmtime sandbox with 256MB RAM ceiling',
          isolation: 'wasmtime_sandbox'
        },
        category: 'security_isolation',
        notes: 'Least privilege sandboxed execution'
      },
      recorded_at: '2026-10-03T10:20:00.000Z'
    }
  ];

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const lines = sampleDecisions.map(d => JSON.stringify(d)).join('\n') + '\n';
    fs.writeFileSync(fixtureLedgerPath, lines, 'utf8');
  });

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Step 1: Decision Ingestion & Context Normalization
  // ---------------------------------------------------------------------------
  it('1. should ingest decision trajectories and preserve all core attributes without dropping', () => {
    const trajectories = ingestDecisionTrajectories(fixtureLedgerPath);
    assert.equal(trajectories.length, 5);

    const first = trajectories[0];
    assert.equal(first.decision_id, 'DAVE-UX-G-WEB-001');
    assert.equal(first.goal_id, 'G-WEB-001');
    assert.equal(first.confidence, 0.94);
    assert.equal(first.risk, 'medium');
    assert.deepEqual(first.evidence, ['docs/02-product/design/G-WEB-001.md']);
    assert.deepEqual(first.references, ['REF-0001']);
    assert.ok(first.decision);
    assert.ok(first.empirical_outcome);
    assert.equal(first.human_action, 'approve');
  });

  it('2. should fail-closed and reject malformed JSONL or missing goal_id correlation key', () => {
    const malformedPath = path.join(testDir, 'malformed.jsonl');
    fs.writeFileSync(malformedPath, '{"decision_id":"DAVE-01"}\n{"not_json":\n', 'utf8');

    assert.throws(() => {
      ingestDecisionTrajectories(malformedPath);
    }, /(missing goal_id|Malformed JSONL|SyntaxError)/i);

    const missingGoalPath = path.join(testDir, 'missing-goal.jsonl');
    fs.writeFileSync(missingGoalPath, '{"decision_id":"DAVE-01","confidence":0.9}\n', 'utf8');

    assert.throws(() => {
      ingestDecisionTrajectories(missingGoalPath);
    }, /(missing goal_id|missing required correlation key)/i);
  });

  it('3. should normalize decision context into canonical structured prompt representation', () => {
    const normalized = normalizeDecisionPrompt(sampleDecisions[0]);
    assert.ok(typeof normalized === 'string');
    assert.ok(normalized.includes('[TASK CONTEXT]'));
    assert.ok(normalized.includes('Goal: G-WEB-001'));
    assert.ok(normalized.includes('Domain: ux_ui_design'));
    assert.ok(normalized.includes('Risk: medium'));
    assert.ok(normalized.includes('Evidence: docs/02-product/design/G-WEB-001.md'));
    assert.ok(normalized.includes('References: REF-0001'));
    assert.ok(normalized.includes('Assumptions: Locked 1440x900 viewport @ 1.0 DPR'));
  });

  // ---------------------------------------------------------------------------
  // Step 2: Objective Label Oracle & Correction Mapping
  // ---------------------------------------------------------------------------
  it('4. should apply objective harness outcomes as authoritative ground-truth labels', () => {
    const positiveOracle = mapCorrectionAndOracleLabel(sampleDecisions[0]);
    assert.equal(positiveOracle.isCorrect, true);
    assert.equal(positiveOracle.authority, 'empirical_test_harness');

    const negativeOracle = mapCorrectionAndOracleLabel(sampleDecisions[2]);
    assert.equal(negativeOracle.isCorrect, false);
    assert.equal(negativeOracle.authority, 'empirical_test_harness');
  });

  it('5. should map human corrections into contrastive chosen versus rejected completions', () => {
    // For successful decision, original decision is chosen, alternative/suboptimal is rejected
    const posPair = generatePreferencePairs([sampleDecisions[0]])[0];
    assert.equal(posPair.chosen.summary, 'Canonical UX/UI layout and design token hierarchy for G-WEB-001');
    assert.ok(posPair.rejected);
    assert.equal(posPair.oracle_verdict.correct, true);

    // For rejected decision with correction, correction is chosen, original failure is rejected
    const negPair = generatePreferencePairs([sampleDecisions[2]])[0];
    assert.equal(negPair.chosen.summary, 'Enforce high contrast palette (4.8:1)');
    assert.equal(negPair.rejected.summary, 'Suboptimal low contrast palette (3.5:1)');
    assert.equal(negPair.correction_category, 'accessibility_contrast');
    assert.equal(negPair.oracle_verdict.correct, false);
  });

  it('6. should calculate calibrated rewards with asymmetric 10x overconfidence penalties', () => {
    // Correct decision (conf=0.94, y=1): log(0.94) ≈ -0.0619, penalty = 0
    const rewCorrect = calculateCalibratedReward(0.94, true);
    assert.equal(rewCorrect.overconfidence_penalty, 0.0);
    assert.ok(rewCorrect.net_reward > -0.1 && rewCorrect.net_reward < 0);

    // Overconfident error (conf=0.95, y=0): log(1 - 0.95) ≈ -2.9957, penalty = 0.95^2 * 10 = 9.025
    const rewOverconf = calculateCalibratedReward(0.95, false);
    assert.equal(rewOverconf.overconfidence_penalty, 9.025);
    assert.ok(rewOverconf.net_reward < -12.0);

    // Modest confidence error (conf=0.60, y=0): no overconfidence penalty (<0.80)
    const rewModest = calculateCalibratedReward(0.60, false);
    assert.equal(rewModest.overconfidence_penalty, 0.0);
  });

  // ---------------------------------------------------------------------------
  // Step 3: Dataset Splitting, Isolation & Schema Gatekeeper
  // ---------------------------------------------------------------------------
  it('7. should partition dataset into 80% train, 10% val, 10% test with zero sample contamination', () => {
    // Generate 20 test items to test split proportions and contamination
    const manyDecisions = [];
    for (let i = 0; i < 20; i++) {
      manyDecisions.push({
        ...sampleDecisions[i % sampleDecisions.length],
        decision_id: `DAVE-TEST-${i}`,
        goal_id: `G-TEST-${i}`
      });
    }

    const pairs = generatePreferencePairs(manyDecisions);
    const splitResult = partitionDatasetSplits(pairs, {
      trainRatio: 0.8,
      valRatio: 0.1,
      testRatio: 0.1,
      seed: 42
    });

    assert.equal(splitResult.splits.train.length, 16);
    assert.equal(splitResult.splits.validation.length, 2);
    assert.equal(splitResult.splits.test.length, 2);

    // Check zero contamination between splits
    const trainIds = new Set(splitResult.splits.train.map(p => p.trajectory_id));
    const valIds = new Set(splitResult.splits.validation.map(p => p.trajectory_id));
    const testIds = new Set(splitResult.splits.test.map(p => p.trajectory_id));

    for (const id of valIds) {
      assert.equal(trainIds.has(id), false, `Contamination: ${id} in both train and validation`);
    }
    for (const id of testIds) {
      assert.equal(trainIds.has(id), false, `Contamination: ${id} in both train and test`);
      assert.equal(valIds.has(id), false, `Contamination: ${id} in both val and test`);
    }
  });

  it('8. should validate preference record against canonical RLCD training schema', () => {
    const validRecord = {
      trajectory_id: 'traj-42b78a9c',
      goal_id: 'G-WEB-001',
      decision_id: 'DAVE-UX-0001',
      prompt: '[TASK CONTEXT] Goal: G-WEB-001',
      chosen: { summary: 'Approved layout' },
      rejected: { summary: 'Suboptimal layout' },
      confidence: 0.94,
      reward: {
        log_score: -0.0619,
        overconfidence_penalty: 0.0,
        net_reward: -0.0619
      },
      split: 'train'
    };

    const valRes = validatePreferenceRecord(validRecord);
    assert.equal(valRes.valid, true);

    // Missing prompt must fail
    const invalidRecord = { ...validRecord, prompt: '' };
    const invRes = validatePreferenceRecord(invalidRecord);
    assert.equal(invRes.valid, false);
    assert.ok(invRes.errors.some(e => e.includes('prompt')));

    // Out of bounds confidence must fail
    const badConfRecord = { ...validRecord, confidence: 1.5 };
    const badConfRes = validatePreferenceRecord(badConfRecord);
    assert.equal(badConfRes.valid, false);
    assert.ok(badConfRes.errors.some(e => e.includes('confidence')));
  });

  it('9. should build full RLCD preference dataset and export to JSONL successfully', () => {
    const result = buildRlcdDataset({
      ledgerPath: fixtureLedgerPath,
      outputPath: fixtureOutputPath,
      trainRatio: 0.8,
      valRatio: 0.1,
      testRatio: 0.1
    });

    assert.equal(result.totalRecords, 5);
    assert.equal(fs.existsSync(fixtureOutputPath), true);

    const exportedLines = fs.readFileSync(fixtureOutputPath, 'utf8').trim().split('\n');
    assert.equal(exportedLines.length, 5);

    for (const line of exportedLines) {
      const parsed = JSON.parse(line);
      const val = validatePreferenceRecord(parsed);
      assert.equal(val.valid, true, `Record validation failed: ${val.errors.join(', ')}`);
    }
  });
});

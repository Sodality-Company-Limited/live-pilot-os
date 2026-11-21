#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS DAVE DECISION TRAJECTORY BUILDER & RLCD PREFERENCE GENERATOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: ML (Goal G-ML-025)
 * Purpose: Trajectory ingestion pipeline transforming operational DAVE decisions,
 *          human review corrections, and empirical harness outcomes into
 *          structured, contrastive RLCD preference pairs with strict split isolation.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const RLCD_CORRECTION_CATEGORIES = [
  'syntax_conformance',
  'architectural_invariant',
  'visual_fidelity_boundary',
  'accessibility_contrast',
  'security_isolation',
  'confidence_calibration',
  'performance_latency',
  'token_budget',
  'general_correction'
];

/**
 * Ingest decision trajectories from append-only JSONL audit ledger.
 * Merges successive audit states (e.g. proposal, review, empirical outcome) by decision_id.
 * 
 * @param {string} ledgerPath 
 * @param {object} options 
 * @returns {Array<object>} Unified trajectory records
 */
export function ingestDecisionTrajectories(ledgerPath, options = {}) {
  const resolvedPath = path.resolve(process.cwd(), ledgerPath || '.agents/audit/decisions.jsonl');

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Audit ledger file not found: ${resolvedPath}`);
  }

  const rawContent = fs.readFileSync(resolvedPath, 'utf8');
  const lines = rawContent.split('\n').filter(line => line.trim().length > 0);

  const decisionMap = new Map();
  const trajectories = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    let record;
    try {
      record = JSON.parse(rawLine);
    } catch (parseErr) {
      throw new Error(`Malformed JSONL line at ${resolvedPath}:${idx + 1} - ${parseErr.message}`);
    }

    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid record at ${resolvedPath}:${idx + 1}: expected JSON object`);
    }

    // Stop condition check: every trajectory entry MUST have a goal_id correlation key
    if (!record.goal_id) {
      throw new Error(`Record missing goal_id correlation key at ${resolvedPath}:${idx + 1}: ${rawLine}`);
    }

    if (options.goalId && record.goal_id !== options.goalId) {
      continue;
    }

    const key = record.decision_id || `goal-${record.goal_id}-${idx}`;

    if (decisionMap.has(key)) {
      // Merge follow-up review or empirical outcome into existing decision record
      const existing = decisionMap.get(key);
      const merged = {
        ...existing,
        ...record,
        decision: record.decision || existing.decision,
        evidence: Array.from(new Set([...(existing.evidence || []), ...(record.evidence || [])])),
        references: Array.from(new Set([...(existing.references || []), ...(record.references || [])])),
        assumptions: Array.from(new Set([...(existing.assumptions || []), ...(record.assumptions || [])])),
        alternatives_rejected: Array.from(new Set([...(existing.alternatives_rejected || []), ...(record.alternatives_rejected || [])])),
        verification: Array.from(new Set([...(existing.verification || []), ...(record.verification || [])]))
      };
      decisionMap.set(key, merged);
    } else {
      decisionMap.set(key, { ...record });
    }
  }

  for (const entry of decisionMap.values()) {
    trajectories.push(entry);
  }

  return trajectories;
}

/**
 * Normalizes decision context into canonical structured prompt representation.
 * Preserves all domain parameters, references, evidence, assumptions, and constraints.
 * 
 * @param {object} record 
 * @returns {string} Canonical prompt string
 */
export function normalizeDecisionPrompt(record) {
  const goalId = record.goal_id || 'UNKNOWN';
  const domain = record.decision_type || 'system_architecture';
  const risk = record.risk || 'normal';
  const summary = record.decision?.summary || record.summary || 'Unspecified decision task';

  const evidence = Array.isArray(record.evidence) && record.evidence.length > 0
    ? record.evidence.join(', ')
    : 'none';

  const references = Array.isArray(record.references) && record.references.length > 0
    ? record.references.join(', ')
    : 'none';

  const assumptions = Array.isArray(record.assumptions) && record.assumptions.length > 0
    ? record.assumptions.join('; ')
    : 'none declared';

  const rejected = Array.isArray(record.alternatives_rejected) && record.alternatives_rejected.length > 0
    ? record.alternatives_rejected.join('; ')
    : 'none';

  const verifications = Array.isArray(record.verification) && record.verification.length > 0
    ? record.verification.join(', ')
    : 'standard';

  return `[TASK CONTEXT]
Goal: ${goalId}
Domain: ${domain}
Risk: ${risk}
Summary: ${summary}
Evidence: ${evidence}
References: ${references}
Assumptions: ${assumptions}
Alternatives Considered: ${rejected}
Verification Gates: ${verifications}`.trim();
}

/**
 * Evaluates objective harness and human review outcomes as authoritative labels.
 * 
 * @param {object} record 
 * @returns {object} { isCorrect: boolean, authority: string, category: string, correction: object|null }
 */
export function mapCorrectionAndOracleLabel(record) {
  let isCorrect = false;
  let authority = 'objective_oracle';

  if (record.empirical_outcome && typeof record.empirical_outcome.correct === 'boolean') {
    isCorrect = record.empirical_outcome.correct;
    authority = 'empirical_test_harness';
  } else if (record.human_action === 'approve') {
    isCorrect = true;
    authority = 'human_review';
  } else if (record.human_action === 'reject') {
    isCorrect = false;
    authority = 'human_review';
  } else if (record.status === 'approved') {
    isCorrect = true;
    authority = 'human_review';
  } else if (record.status === 'rejected') {
    isCorrect = false;
    authority = 'human_review';
  }

  let category = 'general_correction';
  if (record.correction?.category && RLCD_CORRECTION_CATEGORIES.includes(record.correction.category)) {
    category = record.correction.category;
  } else if (!isCorrect) {
    if (record.decision_type === 'accessibility' || record.empirical_outcome?.error?.includes('contrast')) {
      category = 'accessibility_contrast';
    } else if (record.decision_type === 'security' || record.empirical_outcome?.error?.includes('sandbox')) {
      category = 'security_isolation';
    } else if (record.decision_type === 'system_architecture' || record.empirical_outcome?.error?.includes('invariant')) {
      category = 'architectural_invariant';
    } else if (record.decision_type === 'ux_ui_design' || record.empirical_outcome?.pixel_diff_ratio !== undefined) {
      category = 'visual_fidelity_boundary';
    }
  }

  return {
    isCorrect,
    authority,
    category,
    correction: record.correction || null
  };
}

/**
 * Calculates strictly proper logarithmic reward and asymmetric 10x overconfidence penalty.
 * 
 * Reward formulation:
 *   R_log = y * ln(c) + (1 - y) * ln(1 - c)
 *   P_overconf = (!y && c >= 0.80) ? (c^2 * 10.0) : 0.0
 *   R_net = R_log - P_overconf
 * 
 * @param {number} confidence Model reported confidence in [0.0, 1.0]
 * @param {boolean} isCorrect Ground truth correctness
 * @returns {object} { log_score: number, overconfidence_penalty: number, net_reward: number }
 */
export function calculateCalibratedReward(confidence, isCorrect) {
  const conf = Math.max(0.0, Math.min(1.0, Number(confidence) || 0.5));
  const eps = 1e-6;
  const cClamped = Math.max(eps, Math.min(1.0 - eps, conf));

  const logScore = isCorrect
    ? Math.log(cClamped)
    : Math.log(1.0 - cClamped);

  const overconfPenalty = (!isCorrect && conf >= 0.80)
    ? Math.pow(conf, 2) * 10.0
    : 0.0;

  const netReward = logScore - overconfPenalty;

  return {
    log_score: Number(logScore.toFixed(4)),
    overconfidence_penalty: Number(overconfPenalty.toFixed(4)),
    net_reward: Number(netReward.toFixed(4))
  };
}

/**
 * Generates contrastive preference pairs (chosen vs rejected) from decisions.
 * 
 * @param {Array<object>} decisions 
 * @param {object} options 
 * @returns {Array<object>} Preference pair records
 */
export function generatePreferencePairs(decisions, options = {}) {
  const pairs = [];

  for (let idx = 0; idx < decisions.length; idx++) {
    const dec = decisions[idx];
    const prompt = normalizeDecisionPrompt(dec);
    const oracle = mapCorrectionAndOracleLabel(dec);
    const conf = Number(dec.confidence) || 0.5;
    const reward = calculateCalibratedReward(conf, oracle.isCorrect);

    const trajectoryId = `traj-${crypto.createHash('sha256').update(
      `${dec.goal_id}-${dec.decision_id || idx}-${prompt}`
    ).digest('hex').slice(0, 16)}`;

    let chosen;
    let rejected;

    if (oracle.isCorrect) {
      // Correct outcome: original proposal is chosen, alternatives/suboptimal is rejected
      chosen = dec.decision || { summary: dec.summary || 'Approved action' };

      if (Array.isArray(dec.alternatives_rejected) && dec.alternatives_rejected.length > 0) {
        rejected = {
          summary: dec.alternatives_rejected[0],
          reason: 'Suboptimal design alternative rejected during DAVE expert synthesis'
        };
      } else {
        rejected = {
          summary: `Suboptimal heuristic proposal for ${dec.decision_type || 'task'} lacking verified evidence`,
          reason: 'Bypasses verification gates and design constraints'
        };
      }
    } else {
      // Invariant or test failed: human/oracle correction is chosen, flawed proposal is rejected
      if (oracle.correction?.corrected_decision) {
        chosen = oracle.correction.corrected_decision;
      } else {
        chosen = {
          summary: `Corrected and verified ${dec.decision_type || 'task'} adhering to all invariants`,
          rationale: oracle.correction?.notes || 'Enforces full invariant compliance and passes verification gates'
        };
      }

      rejected = dec.decision || {
        summary: dec.summary || 'Flawed proposal',
        failure_reason: dec.empirical_outcome?.error || 'Failed invariant verification'
      };
    }

    pairs.push({
      trajectory_id: trajectoryId,
      goal_id: dec.goal_id,
      decision_id: dec.decision_id || `DAVE-${idx}`,
      decision_type: dec.decision_type || 'system_architecture',
      prompt,
      chosen,
      rejected,
      confidence: conf,
      reward,
      correction_category: oracle.category,
      oracle_verdict: {
        correct: oracle.isCorrect,
        authority: oracle.authority
      },
      evidence: dec.evidence || [],
      references: dec.references || []
    });
  }

  return pairs;
}

/**
 * Deterministically partitions dataset into train, validation, and test splits.
 * Enforces zero sample contamination across splits.
 * 
 * @param {Array<object>} pairs 
 * @param {object} options 
 * @returns {object} { splits: { train, validation, test }, total, contaminationFree: boolean }
 */
export function partitionDatasetSplits(pairs, options = {}) {
  const trainRatio = options.trainRatio ?? 0.80;
  const valRatio = options.valRatio ?? 0.10;
  const testRatio = options.testRatio ?? 0.10;

  if (Math.abs((trainRatio + valRatio + testRatio) - 1.0) > 1e-4) {
    throw new Error(`Split ratios must sum to 1.0 (got train: ${trainRatio}, val: ${valRatio}, test: ${testRatio})`);
  }

  // Deterministic permutation based on trajectory_id hash
  const sorted = [...pairs].sort((a, b) => {
    const hashA = crypto.createHash('sha256').update(a.trajectory_id).digest('hex');
    const hashB = crypto.createHash('sha256').update(b.trajectory_id).digest('hex');
    return hashA.localeCompare(hashB);
  });

  const total = sorted.length;
  let trainCount = Math.round(total * trainRatio);
  let valCount = Math.round(total * valRatio);

  if (total >= 3) {
    if (trainCount === total) trainCount = total - 2;
    if (valCount === 0 && total >= 3) valCount = 1;
  }
  const testCount = total - trainCount - valCount;

  const trainList = sorted.slice(0, trainCount).map(p => ({ ...p, split: 'train' }));
  const valList = sorted.slice(trainCount, trainCount + valCount).map(p => ({ ...p, split: 'validation' }));
  const testList = sorted.slice(trainCount + valCount).map(p => ({ ...p, split: 'test' }));

  // Strict split isolation and sample contamination verification
  const trainIds = new Set(trainList.map(p => p.trajectory_id));
  const valIds = new Set(valList.map(p => p.trajectory_id));
  const testIds = new Set(testList.map(p => p.trajectory_id));

  for (const id of valIds) {
    if (trainIds.has(id)) {
      throw new Error(`Data leakage: Validation trajectory '${id}' found in Training split.`);
    }
  }

  for (const id of testIds) {
    if (trainIds.has(id)) {
      throw new Error(`Data leakage: Test trajectory '${id}' found in Training split.`);
    }
    if (valIds.has(id)) {
      throw new Error(`Data leakage: Test trajectory '${id}' found in Validation split.`);
    }
  }

  return {
    splits: {
      train: trainList,
      validation: valList,
      test: testList
    },
    total,
    contaminationFree: true
  };
}

/**
 * Validates a single preference pair record against the canonical RLCD training schema.
 * 
 * @param {object} record 
 * @returns {object} { valid: boolean, errors: [] }
 */
export function validatePreferenceRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record must be a non-null object'] };
  }

  if (!record.trajectory_id || typeof record.trajectory_id !== 'string') {
    errors.push('Record missing valid "trajectory_id" string');
  }

  if (!record.prompt || (typeof record.prompt !== 'string' && typeof record.prompt !== 'object')) {
    errors.push('Record missing valid non-empty "prompt"');
  } else if (typeof record.prompt === 'string' && record.prompt.trim().length === 0) {
    errors.push('Record "prompt" string cannot be empty');
  }

  if (!record.chosen) {
    errors.push('Record missing "chosen" proposal completion');
  }

  if (!record.rejected) {
    errors.push('Record missing "rejected" proposal completion');
  }

  if (typeof record.confidence !== 'number' || isNaN(record.confidence) || record.confidence < 0.0 || record.confidence > 1.0) {
    errors.push(`Record "confidence" must be a float in [0.0, 1.0] (got ${record.confidence})`);
  }

  if (record.reward === undefined || record.reward === null) {
    errors.push('Record missing "reward" specification');
  } else if (typeof record.reward === 'object') {
    if (typeof record.reward.net_reward !== 'number' || isNaN(record.reward.net_reward)) {
      errors.push('Record reward object missing numeric "net_reward"');
    }
  } else if (typeof record.reward !== 'number' || isNaN(record.reward)) {
    errors.push('Record "reward" must be a number or an object with "net_reward"');
  }

  if (record.split && !['train', 'validation', 'test'].includes(record.split)) {
    errors.push(`Invalid split declaration: "${record.split}" (must be train, validation, or test)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Builds the complete RLCD preference dataset from the audit ledger,
 * validates all records, and writes to output JSONL file.
 * 
 * @param {object} options 
 * @returns {object} { totalRecords, splits, outputPath }
 */
export function buildRlcdDataset(options = {}) {
  const ledgerPath = options.ledgerPath || '.agents/audit/decisions.jsonl';
  const outputPath = options.outputPath || 'artifacts/rlcd/train_dataset.jsonl';

  const decisions = ingestDecisionTrajectories(ledgerPath, options);
  const pairs = generatePreferencePairs(decisions, options);

  const partitioned = partitionDatasetSplits(pairs, options);
  const allRecords = [
    ...partitioned.splits.train,
    ...partitioned.splits.validation,
    ...partitioned.splits.test
  ];

  for (let i = 0; i < allRecords.length; i++) {
    const val = validatePreferenceRecord(allRecords[i]);
    if (!val.valid) {
      throw new Error(`Dataset record ${i} failed RLCD schema validation: ${val.errors.join(', ')}`);
    }
  }

  const outDir = path.dirname(path.resolve(process.cwd(), outputPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonlContent = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), jsonlContent, 'utf8');

  // Also write individual split files if requested or as standard practice in outDir
  if (options.writeIndividualSplits) {
    const trainPath = path.join(outDir, 'train.jsonl');
    const valPath = path.join(outDir, 'validation.jsonl');
    const testPath = path.join(outDir, 'test.jsonl');

    fs.writeFileSync(trainPath, partitioned.splits.train.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    fs.writeFileSync(valPath, partitioned.splits.validation.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    fs.writeFileSync(testPath, partitioned.splits.test.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  }

  return {
    totalRecords: allRecords.length,
    splits: {
      trainCount: partitioned.splits.train.length,
      valCount: partitioned.splits.validation.length,
      testCount: partitioned.splits.test.length
    },
    outputPath
  };
}

// -----------------------------------------------------------------------------
// CLI Dispatcher
// -----------------------------------------------------------------------------
function printHelp() {
  console.log(`DAVE Decision Trajectory Builder & RLCD Dataset Generator (G-ML-025)
Usage:
  node scripts/lib/dave-trajectory-builder.mjs build-dataset [options]
  node scripts/lib/dave-trajectory-builder.mjs validate-dataset [options]
  node scripts/lib/dave-trajectory-builder.mjs stats [options]

Options:
  --ledger <path>      Path to input decisions JSONL audit ledger (default: .agents/audit/decisions.jsonl)
  --output <path>      Path to output JSONL dataset (default: artifacts/rlcd/train_dataset.jsonl)
  --train-ratio <num>  Train split ratio (default: 0.8)
  --val-ratio <num>    Validation split ratio (default: 0.1)
  --test-ratio <num>   Test split ratio (default: 0.1)
  --goal <id>          Filter by specific goal ID
`);
}

async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  const getArg = (flag, def) => {
    const idx = args.indexOf(flag);
    return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : def;
  };

  const ledgerPath = getArg('--ledger', '.agents/audit/decisions.jsonl');
  const outputPath = getArg('--output', 'artifacts/rlcd/train_dataset.jsonl');
  const trainRatio = parseFloat(getArg('--train-ratio', '0.8'));
  const valRatio = parseFloat(getArg('--val-ratio', '0.1'));
  const testRatio = parseFloat(getArg('--test-ratio', '0.1'));
  const goalId = getArg('--goal', null);

  if (command === 'build-dataset') {
    console.log(`🔨 Building RLCD preference dataset from ${ledgerPath}...`);
    const result = buildRlcdDataset({
      ledgerPath,
      outputPath,
      trainRatio,
      valRatio,
      testRatio,
      goalId,
      writeIndividualSplits: true
    });

    console.log(`✅ RLCD Preference Dataset Successfully Built:`);
    console.log(`   Output: ${result.outputPath}`);
    console.log(`   Total Records: ${result.totalRecords}`);
    console.log(`   Splits: Train=${result.splits.trainCount}, Validation=${result.splits.valCount}, Test=${result.splits.testCount}`);
    console.log(`   Schema Conformance: 100% Verified`);
    process.exit(0);
  }

  if (command === 'validate-dataset') {
    const datasetPath = path.resolve(process.cwd(), outputPath);
    if (!fs.existsSync(datasetPath)) {
      console.error(`❌ Dataset file not found: ${datasetPath}`);
      process.exit(1);
    }

    const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter(Boolean);
    let validCount = 0;
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const record = JSON.parse(lines[i]);
        const val = validatePreferenceRecord(record);
        if (val.valid) {
          validCount++;
        } else {
          errors.push(`Line ${i + 1}: ${val.errors.join(', ')}`);
        }
      } catch (err) {
        errors.push(`Line ${i + 1} parse error: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      console.error(`❌ Dataset validation failed with ${errors.length} errors:`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }

    console.log(`✅ Dataset valid: ${validCount}/${lines.length} records verified.`);
    process.exit(0);
  }

  if (command === 'stats') {
    const datasetPath = path.resolve(process.cwd(), outputPath);
    if (!fs.existsSync(datasetPath)) {
      console.error(`❌ Dataset file not found: ${datasetPath}`);
      process.exit(1);
    }

    const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter(Boolean);
    const splitCounts = { train: 0, validation: 0, test: 0, unspecified: 0 };
    const categories = {};
    let totalConfidence = 0;
    let totalReward = 0;

    for (const line of lines) {
      const rec = JSON.parse(line);
      const sp = rec.split || 'unspecified';
      splitCounts[sp] = (splitCounts[sp] || 0) + 1;

      const cat = rec.correction_category || 'none';
      categories[cat] = (categories[cat] || 0) + 1;

      totalConfidence += (rec.confidence || 0);
      const r = typeof rec.reward === 'object' ? rec.reward.net_reward : Number(rec.reward);
      totalReward += (r || 0);
    }

    console.log(`📊 RLCD Preference Dataset Statistics: ${outputPath}`);
    console.log(`   Total Records: ${lines.length}`);
    console.log(`   Splits:`, splitCounts);
    console.log(`   Categories:`, categories);
    console.log(`   Mean Confidence: ${(totalConfidence / lines.length).toFixed(4)}`);
    console.log(`   Mean Net Reward: ${(totalReward / lines.length).toFixed(4)}`);
    process.exit(0);
  }

  console.error(`Unknown subcommand: ${command}`);
  printHelp();
  process.exit(1);
}

/**
 * Calculates a normalized reward in [-1.0, 1.0] from a full-fidelity CLI trajectory record.
 * 
 * @param {object} traj 
 * @returns {number} Calibrated reward score
 */
export function calculateCalibratedRewardFromTrajectory(traj) {
  let reward = 0.0;

  // 1. Verification outcome (Primary signal)
  if (traj.verification && traj.verification.passed === true) {
    reward += 0.6;
    if (traj.verification.testsRun > 0 && traj.verification.testsPassed === traj.verification.testsRun) {
      reward += 0.15;
    }
  } else if (traj.verification && traj.verification.passed === false) {
    reward -= 0.6;
  }

  // 2. Terminal execution status
  if (traj.status === 'complete' && (traj.exitCode === 0 || traj.exitCode === null)) {
    reward += 0.15;
  } else if (traj.status === 'blocked' || traj.exitCode !== 0) {
    reward -= 0.3;
  }

  // 3. Efficiency penalty (Latency & Tokens)
  const elapsed = traj.elapsedSeconds || 0;
  if (elapsed > 30) {
    reward -= Math.min(0.15, (elapsed - 30) * 0.005);
  } else if (elapsed <= 5) {
    reward += 0.1;
  }

  const tokens = (traj.inputTokens || 0) + (traj.outputTokens || 0);
  if (tokens > 10000) {
    reward -= Math.min(0.1, (tokens - 10000) * 0.00001);
  }

  // Clamp strictly into [-1.0, 1.0]
  return Math.max(-1.0, Math.min(1.0, Number(reward.toFixed(4))));
}

/**
 * Generates contrastive RLCD preference pairs from a collection of CLI agent trajectories.
 * 
 * @param {Array<object>} trajectories 
 * @returns {Array<object>} Validated preference pairs
 */
export function generateRlcdPreferencePairsFromTrajectories(trajectories) {
  const byGoal = new Map();

  for (const traj of trajectories) {
    const key = traj.goalId || 'G-UNSCOPED';
    if (!byGoal.has(key)) {
      byGoal.set(key, []);
    }
    byGoal.get(key).push(traj);
  }

  const pairs = [];

  for (const [goalId, list] of byGoal.entries()) {
    const wins = [];
    const losses = [];

    for (const item of list) {
      const reward = calculateCalibratedRewardFromTrajectory(item);
      const isWin = (item.verification && item.verification.passed) || (item.status === 'complete' && reward > 0.3);
      const entry = {
        action: item.rawResponse || item.summary || '',
        reward,
        passed: Boolean(item.verification ? item.verification.passed : (item.status === 'complete')),
        status: item.status,
        session_key: item.sessionKey,
      };

      if (isWin) {
        wins.push(entry);
      } else {
        losses.push(entry);
      }
    }

    // Form contrastive pairs between wins and losses
    for (let w = 0; w < wins.length; w++) {
      const win = wins[w];
      for (let l = 0; l < losses.length; l++) {
        const loss = losses[l];
        const delta = Number((win.reward - loss.reward).toFixed(4));
        if (delta > 0) {
          pairs.push({
            pair_id: `pair-${goalId}-${win.session_key}-${loss.session_key}`,
            prompt: list[0].fullPrompt || list[0].mandate || `Execute ${goalId}`,
            chosen: win,
            rejected: loss,
            metadata: {
              goal_id: goalId,
              persona: list[0].persona || 'agent',
              provider: list[0].provider || 'multi-cli',
              delta_reward: delta,
              margin_valid: delta >= 0.1,
            },
          });
        }
      }
    }
  }

  return pairs;
}

/**
 * Partitions preference pairs into disjoint train, val, and test splits without leakage.
 * 
 * @param {Array<object>} pairs 
 * @param {object} options 
 * @returns {{ train: Array, val: Array, test: Array }}
 */
export function partitionPreferenceSplits(pairs, options = {}) {
  const trainRatio = options.trainRatio ?? 0.8;
  const valRatio = options.valRatio ?? 0.1;

  const total = pairs.length;
  const trainCount = Math.floor(total * trainRatio);
  const valCount = Math.floor(total * valRatio);

  const train = [];
  const val = [];
  const test = [];

  for (let idx = 0; idx < total; idx++) {
    if (idx < trainCount) {
      train.push(pairs[idx]);
    } else if (idx < trainCount + valCount) {
      val.push(pairs[idx]);
    } else {
      test.push(pairs[idx]);
    }
  }

  return { train, val, test };
}

/**
 * Ingests multi-CLI trajectory files from disk, generates RLCD pairs, and exports split JSONL datasets.
 * 
 * @param {object} options 
 * @returns {Promise<object>} Export manifest
 */
export async function buildTrajectoryRlcdDataset(options = {}) {
  const trajectoryDir = options.trajectoryDir || path.resolve(process.cwd(), '.agents/telemetry/trajectories');
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'artifacts/rlcd');

  const fsPromises = (await import('node:fs/promises')).default;
  await fsPromises.mkdir(outputDir, { recursive: true });

  let trajectories = [];
  try {
    const files = (await fsPromises.readdir(trajectoryDir)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const raw = await fsPromises.readFile(path.join(trajectoryDir, f), 'utf-8');
        trajectories.push(JSON.parse(raw));
      } catch {}
    }
  } catch {}

  const pairs = generateRlcdPreferencePairsFromTrajectories(trajectories);
  const { train, val, test } = partitionPreferenceSplits(pairs, options);

  const writeJsonl = async (filePath, items) => {
    const content = items.map((item) => JSON.stringify(item)).join('\n') + (items.length ? '\n' : '');
    await fsPromises.writeFile(filePath, content, 'utf-8');
  };

  await writeJsonl(path.join(outputDir, 'train.jsonl'), train);
  await writeJsonl(path.join(outputDir, 'val.jsonl'), val);
  await writeJsonl(path.join(outputDir, 'test.jsonl'), test);

  const manifest = {
    totalTrajectories: trajectories.length,
    totalPairs: pairs.length,
    splits: {
      train: train.length,
      val: val.length,
      test: test.length,
    },
    exportedAt: new Date().toISOString(),
  };

  await fsPromises.writeFile(
    path.join(outputDir, 'dataset_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return {
    totalPairs: pairs.length,
    manifest,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runCli().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  });
}

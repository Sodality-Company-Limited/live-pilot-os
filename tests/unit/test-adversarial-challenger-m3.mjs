/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ ADVERSARIAL CHALLENGER SUITE: MILESTONE 3 (G-UX-012, G-UX-013, G-UX-014)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave3_2
 * Role: Empirical Challenger (Critic / Specialist)
 * Scope: Adversarial Stress-Testing, Fuzzing & Invariant Verification
 * Invariants Tested:
 *   1. PII Scrubber Evasion Stress (G-UX-014)
 *   2. Red-Team Dark Pattern & Deferral Fail-Closed Routing (G-UX-014)
 *   3. Preference Dataset Invariance & Loss Aversion (G-UX-013)
 *   4. Trajectory Token Ceiling & Precedence Invariance (G-UX-012)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  sanitizePii,
  isLuhnValid,
  CANONICAL_DARK_PATTERNS,
  DEFERRAL_REASONS,
  buildAdversarialScenario,
  generateAdversarialCurriculum
} from '../../scripts/lib/dark-pattern-curriculum.mjs';

import {
  buildContrastivePair,
  dpoPairToKtoRecords,
  generateContrastivePreferenceDataset,
  FLAW_TAXONOMY,
  KTO_LOSS_AVERSION_LAMBDA
} from '../../scripts/lib/dpo-kto-dataset-builder.mjs';

import {
  buildPersonaTrajectory,
  generatePersonaTrajectories,
  ALL_12_PERSONAS,
  TERMINAL_OUTCOMES
} from '../../scripts/lib/persona-trajectory-builder.mjs';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PII SCRUBBER EVASION STRESS (G-UX-014)
// ═══════════════════════════════════════════════════════════════════════════════

test('Adversarial PII: Luhn Algorithm Rigor across Real Card BINs vs Invalid Numbers', () => {
  // Real Card BIN patterns with valid Luhn checksums
  const validCards = [
    '4532015000000007',       // Visa 16-digit
    '4532 0150 0000 0007',    // Visa 16-digit spaced
    '4532-0150-0000-0007',    // Visa 16-digit hyphenated
    '5105105105105100',       // MasterCard 16-digit (valid Luhn)
    '378282246310005',        // Amex 15-digit (valid Luhn)
    '3782 822463 10005',      // Amex 15-digit spaced
    '371449635398431',        // Amex 15-digit (valid Luhn)
  ];

  // Intentionally invalid numbers (differ by 1 in check digit)
  const invalidCards = [
    '4532015000000000',
    '5412751234123457',
    '378282246310006',
    '6011000990139425',
    '123456789012',           // 12 digits (too short)
    '12345678901234567890',   // 20 digits (too long)
  ];

  for (const card of validCards) {
    const raw = card.replace(/\D/g, '');
    assert.equal(isLuhnValid(raw), true, `Card ${card} must be recognized as Luhn valid`);
    const scrubbed = sanitizePii(`Payment info: ${card} processed.`);
    assert.ok(
      scrubbed.sanitized.includes('[REDACTED_CREDIT_CARD]'),
      `Valid card ${card} must be redacted`
    );
    assert.equal(scrubbed.detections.credit_cards, 1, `Must detect 1 credit card for ${card}`);
  }

  for (const card of invalidCards) {
    const raw = card.replace(/\D/g, '');
    assert.equal(isLuhnValid(raw), false, `Invalid card ${card} must fail Luhn check`);
    const scrubbed = sanitizePii(`Reference id: ${card} logged.`);
    assert.ok(
      !scrubbed.sanitized.includes('[REDACTED_CREDIT_CARD]'),
      `Invalid card ${card} must NOT be falsely redacted as credit card`
    );
  }
});

test('Adversarial PII: Secrets in Code Blocks, JSON Payloads, Markdown & JWTs', () => {
  const secretVectors = [
    // AWS in JSON payload
    {
      input: '{"credentials": {"accessKeyId": "AKIAIOSFODNN7EXAMPLE", "region": "us-east-1"}}',
      forbidden: 'AKIAIOSFODNN7EXAMPLE',
      expectedRedaction: '[REDACTED_AWS_KEY]'
    },
    // GitHub token in backtick code block
    {
      input: 'Run `export GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890` before sync.',
      forbidden: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
      expectedRedaction: '[REDACTED_GITHUB_TOKEN]'
    },
    // OpenAI secret in markdown link
    {
      input: 'Follow setup at [Docs](https://api.openai.com/v1?token=sk-12345678901234567890abcdef)',
      forbidden: 'sk-12345678901234567890abcdef',
      expectedRedaction: '[REDACTED_OPENAI_KEY]'
    },
    // JWT inside authorization header
    {
      input: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature1234567890',
      forbidden: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature1234567890',
      expectedRedaction: '[REDACTED_JWT]'
    }
  ];

  for (const vector of secretVectors) {
    const res = sanitizePii(vector.input);
    assert.ok(!res.sanitized.includes(vector.forbidden), `Secret ${vector.forbidden} leaked in output!`);
    assert.ok(
      res.sanitized.includes(vector.expectedRedaction),
      `Expected redaction marker ${vector.expectedRedaction} not found in ${res.sanitized}`
    );
    assert.ok(res.detections.api_keys >= 1, `Failed to increment api_keys detection count`);
  }
});

test('Adversarial PII: Mixed-case, Subdomains, Plus-Addressing and Weird TLDs', () => {
  const emailVectors = [
    'USER.NAME+TAG@SUB.DOMAIN.CO.UK',
    'chief.officer_99@internal-node.soda.museum',
    'developer+soda-review@aexis.ai',
    'SECURITY_BOT@01-GATE.CORP.TECH'
  ];

  for (const email of emailVectors) {
    const res = sanitizePii(`Notification sent to ${email} for review.`);
    assert.ok(!res.sanitized.includes(email), `Email ${email} was not redacted!`);
    assert.ok(res.sanitized.includes('[REDACTED_EMAIL]'), `Expected [REDACTED_EMAIL] replacement`);
    assert.equal(res.detections.emails, 1);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RED-TEAM DARK PATTERNS & DEFERRAL FAIL-CLOSED ROUTING (G-UX-014)
// ═══════════════════════════════════════════════════════════════════════════════

test('Adversarial Routing: 100% Fail-Closed Enforcement across 800 Scenarios', () => {
  const advFile = resolve(process.cwd(), 'artifacts/curriculum/stage6_adversarial/redteam_800.jsonl');
  assert.ok(existsSync(advFile), `Artifact redteam_800.jsonl must exist`);

  const lines = readFileSync(advFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 800, `Exactly 800 scenarios required`);

  let darkPatternCount = 0;
  let deferralCount = 0;
  const coveredDarkPatterns = new Set();
  const coveredDeferrals = new Set();

  for (let i = 0; i < lines.length; i++) {
    const s = JSON.parse(lines[i]);

    if (s.adversarial_type === 'dark_pattern') {
      darkPatternCount++;
      assert.equal(s.target_outcome, 'REJECT_AS_UNSAFE', `Scenario ${s.scenario_id} must route to REJECT_AS_UNSAFE`);
      assert.ok(s.target_confidence_ceiling <= 0.95, `Dark pattern confidence must have safe ceiling`);
      assert.ok(CANONICAL_DARK_PATTERNS.includes(s.dark_pattern_category), `Unknown dark pattern: ${s.dark_pattern_category}`);
      assert.ok(s.fail_closed_reason.includes('Tier 1 Ethics invariant'), `Must cite Tier 1 Ethics violation`);
      coveredDarkPatterns.add(s.dark_pattern_category);
    } else if (s.adversarial_type === 'justified_deferral') {
      deferralCount++;
      assert.equal(s.target_outcome, 'DEFER', `Scenario ${s.scenario_id} must route to DEFER`);
      assert.ok(s.target_confidence_ceiling < 0.75, `Deferral confidence must be below 0.75 threshold (got ${s.target_confidence_ceiling})`);
      assert.ok(DEFERRAL_REASONS.includes(s.deferral_category), `Unknown deferral reason: ${s.deferral_category}`);
      assert.ok(s.fail_closed_reason.includes('below 0.75 threshold'), `Must cite confidence threshold reason`);
      coveredDeferrals.add(s.deferral_category);
    } else {
      assert.fail(`Unrecognized adversarial_type: ${s.adversarial_type}`);
    }
  }

  assert.equal(darkPatternCount, 400, 'Exactly 400 dark patterns must be present');
  assert.equal(deferralCount, 400, 'Exactly 400 deferral scenarios must be present');
  assert.equal(coveredDarkPatterns.size, 14, 'All 14 canonical dark patterns must be evaluated');
  assert.equal(coveredDeferrals.size, 5, 'All 5 canonical deferral reasons must be evaluated');
});

test('Adversarial Routing: Fuzzing 1,000 Synthetic Scenarios across Seeds', () => {
  for (let seed = 100; seed <= 110; seed++) {
    const dataset = generateAdversarialCurriculum({
      total_scenarios: 100,
      write_files: false,
      seed
    });

    for (const sc of dataset.scenarios) {
      if (sc.adversarial_type === 'dark_pattern') {
        assert.equal(sc.target_outcome, 'REJECT_AS_UNSAFE');
        assert.ok(CANONICAL_DARK_PATTERNS.includes(sc.dark_pattern_category));
      } else {
        assert.equal(sc.target_outcome, 'DEFER');
        assert.ok(DEFERRAL_REASONS.includes(sc.deferral_category));
        assert.ok(sc.target_confidence_ceiling < 0.75);
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PREFERENCE DATASET INVARIANCE & LOSS AVERSION (G-UX-013)
// ═══════════════════════════════════════════════════════════════════════════════

test('Adversarial Preferences: 3,500 DPO Pairs Non-Zero Deltas and AST Distinction', () => {
  const dpoFile = resolve(process.cwd(), 'artifacts/curriculum/stage5_preferences/dpo_pairs.jsonl');
  assert.ok(existsSync(dpoFile), 'dpo_pairs.jsonl must exist');

  const lines = readFileSync(dpoFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3500, 'Exactly 3,500 DPO pairs must exist');

  const flawCounts = {};
  for (const f of FLAW_TAXONOMY) flawCounts[f] = 0;

  for (let i = 0; i < lines.length; i++) {
    const pair = JSON.parse(lines[i]);

    // Check 1: Chosen and Rejected texts must be distinct
    assert.notEqual(pair.chosen.text, pair.rejected.text, `Pair ${pair.pair_id}: chosen and rejected texts must differ`);
    assert.notEqual(pair.chosen.rationale, pair.rejected.rationale, `Pair ${pair.pair_id}: rationales must differ`);

    // Check 2: Confidence of chosen >= confidence of rejected
    assert.ok(
      pair.chosen.calibrated_confidence > pair.rejected.calibrated_confidence,
      `Pair ${pair.pair_id}: chosen confidence must exceed rejected confidence`
    );

    // Check 3: Quantitative deltas must be strictly positive
    assert.ok(
      pair.preference_delta.contrast_margin > 0,
      `Pair ${pair.pair_id}: contrast_margin must be > 0 (got ${pair.preference_delta.contrast_margin})`
    );
    assert.ok(
      pair.preference_delta.accessibility_score_delta > 0,
      `Pair ${pair.pair_id}: accessibility_score_delta must be > 0`
    );
    assert.ok(
      pair.preference_delta.token_efficiency_gain > 0,
      `Pair ${pair.pair_id}: token_efficiency_gain must be > 0`
    );

    // Check 4: Flaw taxonomy classification
    const flaw = pair.preference_delta.primary_flaw;
    assert.ok(FLAW_TAXONOMY.includes(flaw), `Unknown flaw: ${flaw}`);
    flawCounts[flaw]++;
  }

  // All 8 flaws must be represented with balanced frequency
  for (const flaw of FLAW_TAXONOMY) {
    assert.ok(flawCounts[flaw] >= 400, `Flaw ${flaw} under-represented (${flawCounts[flaw]} < 400)`);
  }
});

test('Adversarial Preferences: KTO Records Loss Aversion Lambda = 1.33 Strict Enforcement', () => {
  const ktoFile = resolve(process.cwd(), 'artifacts/curriculum/stage5_preferences/kto_records.jsonl');
  assert.ok(existsSync(ktoFile), 'kto_records.jsonl must exist');

  const lines = readFileSync(ktoFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 7000, 'Exactly 7,000 KTO records must exist');

  let chosenCount = 0;
  let rejectedCount = 0;

  for (const line of lines) {
    const rec = JSON.parse(line);

    if (rec.label === true) {
      chosenCount++;
      assert.equal(rec.weight, 1.0, `Chosen record ${rec.kto_id} must have weight 1.0`);
    } else if (rec.label === false) {
      rejectedCount++;
      assert.equal(rec.weight, KTO_LOSS_AVERSION_LAMBDA, `Rejected record ${rec.kto_id} must have weight ${KTO_LOSS_AVERSION_LAMBDA}`);
      assert.equal(rec.weight, 1.33, `Rejected record weight must be 1.33`);
    } else {
      assert.fail(`Invalid KTO record label: ${rec.label}`);
    }
  }

  assert.equal(chosenCount, 3500, 'Must have 3,500 chosen KTO records');
  assert.equal(rejectedCount, 3500, 'Must have 3,500 rejected KTO records');
});

test('Adversarial Preferences: Zero Sample Contamination Across Train/Val/Test Splits', () => {
  const trainFile = resolve(process.cwd(), 'artifacts/curriculum/stage5_preferences/splits/train.jsonl');
  const valFile = resolve(process.cwd(), 'artifacts/curriculum/stage5_preferences/splits/val.jsonl');
  const testFile = resolve(process.cwd(), 'artifacts/curriculum/stage5_preferences/splits/test.jsonl');

  const trainIds = new Set(readFileSync(trainFile, 'utf8').trim().split('\n').map(l => JSON.parse(l).pair_id));
  const valIds = new Set(readFileSync(valFile, 'utf8').trim().split('\n').map(l => JSON.parse(l).pair_id));
  const testIds = new Set(readFileSync(testFile, 'utf8').trim().split('\n').map(l => JSON.parse(l).pair_id));

  assert.equal(trainIds.size, 2800, 'Train split must contain 2,800 pairs');
  assert.equal(valIds.size, 350, 'Val split must contain 350 pairs');
  assert.equal(testIds.size, 350, 'Test split must contain 350 pairs');

  for (const id of trainIds) {
    assert.equal(valIds.has(id), false, `Sample leakage between Train and Val: ${id}`);
    assert.equal(testIds.has(id), false, `Sample leakage between Train and Test: ${id}`);
  }
  for (const id of valIds) {
    assert.equal(testIds.has(id), false, `Sample leakage between Val and Test: ${id}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TRAJECTORY TOKEN BUDGET & PRECEDENCE INVARIANCE (G-UX-012)
// ═══════════════════════════════════════════════════════════════════════════════

test('Adversarial Trajectories: Precedence Hierarchy and Tier 1 Ethics Veto', () => {
  const trajFile = resolve(process.cwd(), 'artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl');
  assert.ok(existsSync(trajFile), 'trajectories_2500.jsonl must exist');

  const lines = readFileSync(trajFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2500, 'Exactly 2,500 trajectories must exist');

  let rejectAsUnsafeCount = 0;
  let deferCount = 0;
  let emitCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const t = JSON.parse(lines[i]);

    if (t.final_state === 'REJECT_AS_UNSAFE') {
      rejectAsUnsafeCount++;
      // Verify Tier 1 Ethics veto precedence
      assert.ok(
        t.resolution_rationale && t.resolution_rationale.includes('Tier 1 Ethics'),
        `Trajectory ${t.trajectory_id}: REJECT_AS_UNSAFE must cite Tier 1 Ethics veto precedence`
      );
      assert.ok(t.collisions_detected_count >= 1, `Must detect collision on veto`);
    } else if (t.final_state === 'DEFER') {
      deferCount++;
      assert.ok(
        t.calibrated_confidence < 0.75,
        `Trajectory ${t.trajectory_id}: DEFER must have calibrated confidence < 0.75 (got ${t.calibrated_confidence})`
      );
    } else if (t.final_state === 'EMIT_DECISION') {
      emitCount++;
      assert.ok(
        t.calibrated_confidence >= 0.75,
        `Trajectory ${t.trajectory_id}: EMIT_DECISION must have calibrated confidence >= 0.75`
      );
    }
  }

  assert.equal(emitCount, 2000, 'Must have 2,000 EMIT_DECISION trajectories (80%)');
  assert.equal(deferCount, 250, 'Must have 250 DEFER trajectories (10%)');
  assert.equal(rejectAsUnsafeCount, 250, 'Must have 250 REJECT_AS_UNSAFE trajectories (10%)');
});

test('Adversarial Trajectories: EMPIRICAL AUDIT of <= 3000 Token Ceiling', () => {
  const trajFile = resolve(process.cwd(), 'artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl');
  const lines = readFileSync(trajFile, 'utf8').trim().split('\n');

  const violations = [];
  let maxTokens = 0;

  for (let i = 0; i < lines.length; i++) {
    const t = JSON.parse(lines[i]);
    if (t.tokens_consumed > maxTokens) maxTokens = t.tokens_consumed;

    if (t.tokens_consumed > 3000) {
      violations.push({
        trajectory_id: t.trajectory_id,
        tokens_consumed: t.tokens_consumed,
        participating_count: t.participating_personas.length
      });
    }
  }

  console.log(`\n  [Empirical Token Audit] Total trajectories: ${lines.length}, Max tokens consumed: ${maxTokens}, Violations (> 3000): ${violations.length}`);
  if (violations.length > 0) {
    console.log(`  [Violations Sample] First 5 violations:`, violations.slice(0, 5));
  }

  // The dispatch explicitly states: "verify all 2,500 trajectories strictly stay within 3,000 token limit"
  // Goal G-UX-012 line 228 states: "Tokens <= 3000"
  assert.equal(
    violations.length,
    0,
    `CRITICAL BUG FOUND: ${violations.length} trajectories exceed the 3,000 token ceiling! Max observed: ${maxTokens}`
  );
});

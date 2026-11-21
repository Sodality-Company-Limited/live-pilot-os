#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ADVERSARIAL DARK-PATTERN, DEFERRAL & PII HARNESS (G-UX-014)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Stage 6 Data Curriculum & Curation (M3 / G-UX-014)
 * Purpose: Formally verifies the 800 red-team scenarios (400 deceptive patterns
 *          fail-closed to REJECT_AS_UNSAFE, 400 under-specified doubt cases routed to DEFER)
 *          and validates the regex-based PII scrubbing engine across all secret types.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateAdversarialCurriculum,
  sanitizePii,
  CANONICAL_DARK_PATTERNS,
  DEFERRAL_REASONS
} from '../lib/dark-pattern-curriculum.mjs';

const DATA_DIR = 'artifacts/curriculum/stage6_adversarial';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Harness (G-UX-014)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const manifestPath = resolve(process.cwd(), DATA_DIR, 'manifest.json');
  const jsonlPath = resolve(process.cwd(), DATA_DIR, 'redteam_800.jsonl');

  if (!existsSync(manifestPath) || !existsSync(jsonlPath)) {
    console.log('▶ Generating 800 red-team scenarios for Stage 6...');
    generateAdversarialCurriculum({
      total_scenarios: 800,
      output_dir: DATA_DIR,
      write_files: true,
      seed: 20261014
    });
    console.log('  Adversarial curriculum generated successfully.\n');
  }

  // 1. Dataset Artifact Integrity
  console.log('▶ Category 1: Adversarial Curriculum Artifact Integrity');
  assert(existsSync(manifestPath), `Manifest exists at ${DATA_DIR}/manifest.json`);
  assert(existsSync(jsonlPath), `Red-team JSONL exists at ${DATA_DIR}/redteam_800.jsonl`);

  let manifest = null;
  let lines = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    lines = readFileSync(jsonlPath, 'utf8').trim().split('\n');
    assert(manifest.total_scenarios === 800, 'Manifest confirms 800 total scenarios');
    assert(lines.length === 800, 'JSONL contains exactly 800 records');
  } catch (err) {
    assert(false, `Failed to load adversarial dataset: ${err.message}`);
    process.exit(1);
  }

  // 2. 14 Dark Patterns Fail-Closed Coverage
  console.log('\n▶ Category 2: 14 Dark Patterns Fail-Closed (REJECT_AS_UNSAFE)');
  assert(manifest.outcomes.REJECT_AS_UNSAFE === 400, `400 dark patterns routed to REJECT_AS_UNSAFE (found ${manifest.outcomes.REJECT_AS_UNSAFE})`);
  assert(manifest.all_14_dark_patterns_covered === true, 'All 14 canonical dark patterns evaluated');

  for (const p of CANONICAL_DARK_PATTERNS) {
    const count = manifest.dark_patterns_evaluated[p] || 0;
    assert(count > 0, `Dark pattern '${p}' evaluated across ${count} scenarios`);
  }

  // 3. Justified Deferral Coverage
  console.log('\n▶ Category 3: Justified Deferral Routing (DEFER)');
  assert(manifest.outcomes.DEFER === 400, `400 under-specified scenarios routed to DEFER (found ${manifest.outcomes.DEFER})`);

  for (const d of DEFERRAL_REASONS) {
    const count = manifest.deferral_categories_evaluated[d] || 0;
    assert(count > 0, `Deferral category '${d}' evaluated across ${count} scenarios`);
  }

  // 4. PII Sanitization Engine Verification
  console.log('\n▶ Category 4: Multi-Vector PII & Secrets Sanitization');
  const testCorpus = `
    Operator admin@soda.dev with key AKIAIOSFODNN7EXAMPLE and gh_token ghp_123456789012345678901234567890123456.
    Card details: 4532 0150 0000 0007, SSN 123-45-6789, Phone (555) 234-5678.
    OpenAI sk-abcdefghijklmnopqrstuvwxyz1234.
  `;
  const sanitizedRes = sanitizePii(testCorpus);

  assert(!sanitizedRes.sanitized.includes('admin@soda.dev'), 'Email address scrubbed');
  assert(!sanitizedRes.sanitized.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS access key scrubbed');
  assert(!sanitizedRes.sanitized.includes('ghp_123456789012345678901234567890123456'), 'GitHub token scrubbed');
  assert(!sanitizedRes.sanitized.includes('4532 0150 0000 0007'), 'Credit card scrubbed');
  assert(!sanitizedRes.sanitized.includes('123-45-6789'), 'SSN scrubbed');
  assert(!sanitizedRes.sanitized.includes('(555) 234-5678'), 'Phone number scrubbed');
  assert(!sanitizedRes.sanitized.includes('sk-abcdefghijklmnopqrstuvwxyz1234'), 'OpenAI token scrubbed');

  assert(sanitizedRes.detections.emails === 1, 'Detected 1 email');
  assert(sanitizedRes.detections.api_keys >= 3, 'Detected >= 3 API keys');
  assert(sanitizedRes.detections.credit_cards === 1, 'Detected 1 credit card');
  assert(sanitizedRes.detections.ssn === 1, 'Detected 1 SSN');
  assert(sanitizedRes.detections.phones === 1, 'Detected 1 phone');

  // 5. Python Module Check
  console.log('\n▶ Category 5: Python PII Sanitizer Module Check');
  const pyPath = resolve(process.cwd(), 'code/ml/src/curriculum/redteam_pii_sanitizer.py');
  assert(existsSync(pyPath), 'Python module code/ml/src/curriculum/redteam_pii_sanitizer.py exists');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  console.log('✅ Stage 6 Adversarial Dark-Pattern, Deferral Traps & PII Sanitizer verified green.\n');
}

runHarness();

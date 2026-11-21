#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UX DECISION SCHEMA VERIFICATION HARNESS (G-UX-001)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1)
 * Purpose: Automated verification harness asserting 100% schema compliance of
 *          UX decision contracts against schemas/ux-decision-contract.schema.json,
 *          evaluating positive cases and adversarial negative stress vectors.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateUxDecisionContract,
  createDefaultUxDecision,
  UX_DECISION_CATEGORIES,
  CANONICAL_UX_PERSONAS
} from '../lib/ux-decision-contract.mjs';

export function runUxDecisionSchemaHarness(argv = process.argv.slice(2)) {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🛡️ SODA OS UX DECISION SCHEMA VERIFICATION HARNESS (G-UX-001)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const targetPath = argv[0];
  if (targetPath && existsSync(resolve(process.cwd(), targetPath))) {
    const fullPath = resolve(process.cwd(), targetPath);
    console.log(`▶ Ingesting target decision file: ${targetPath}`);
    const raw = readFileSync(fullPath, 'utf8');
    const records = targetPath.endsWith('.jsonl')
      ? raw.split('\n').filter(Boolean).map(l => JSON.parse(l))
      : [JSON.parse(raw)];

    for (const rec of records) {
      const res = validateUxDecisionContract(rec);
      if (res.valid) {
        passed++;
        console.log(`  ✅ Contract ${rec.decision_id || 'UNKNOWN'} valid`);
      } else {
        failed++;
        console.error(`  ❌ Contract ${rec.decision_id || 'UNKNOWN'} failed:`);
        res.errors.forEach(e => console.error(`     - ${e}`));
      }
    }
  } else {
    console.log('▶ Executing Multi-Category Canonical Battery across all 11 UX categories...');

    for (let i = 0; i < UX_DECISION_CATEGORIES.length; i++) {
      const cat = UX_DECISION_CATEGORIES[i];
      const dec = createDefaultUxDecision({
        decision_id: `UX-DEC-0001-${String(i + 1).padStart(3, '0')}`,
        decision: {
          summary: `Execute canonical architectural specification for ${cat} dimension.`,
          category: cat,
          touch_map: [`code/src/styles/${cat}.css`],
          tokens_applied: { primary_role: `--token-${cat}-base` }
        },
        personas_involved: [CANONICAL_UX_PERSONAS[i % CANONICAL_UX_PERSONAS.length]]
      });

      const res = validateUxDecisionContract(dec);
      if (res.valid) {
        passed++;
        console.log(`  ✅ [${cat.toUpperCase()}] Passed canonical schema validation`);
      } else {
        failed++;
        console.error(`  ❌ [${cat.toUpperCase()}] Failed validation: ${res.errors.join('; ')}`);
      }
    }

    console.log('\n▶ Executing Adversarial Fail-Closed Negative Battery...');
    const negativeCases = [
      {
        name: 'Uncalibrated confidence',
        mutate: d => { d.confidence_calibrated = false; }
      },
      {
        name: 'Confidence score > 1.0',
        mutate: d => { d.confidence = 1.15; }
      },
      {
        name: 'Missing error component state',
        mutate: d => { delete d.state_matrix.error; }
      },
      {
        name: 'Horizontal layout overflow violation',
        mutate: d => { d.viewport_contract.max_overflow_px = 12; }
      },
      {
        name: 'Cumulative Layout Shift violation',
        mutate: d => { d.viewport_contract.cls_score = 0.02; }
      },
      {
        name: 'Unknown persona injection',
        mutate: d => { d.personas_involved = ['unauthorized_persona']; }
      },
      {
        name: 'Additional root property leak',
        mutate: d => { d.arbitrary_payload_leak = true; }
      }
    ];

    for (const testCase of negativeCases) {
      const candidate = createDefaultUxDecision();
      testCase.mutate(candidate);
      const res = validateUxDecisionContract(candidate);
      if (!res.valid && res.errors.length > 0) {
        passed++;
        console.log(`  ✅ [REJECTED AS EXPECTED] ${testCase.name} (Caught ${res.errors.length} errors)`);
      } else {
        failed++;
        console.error(`  ❌ [INVARIANT BREACH] ${testCase.name} unexpectedly passed validation!`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Schema Harness Summary: ${passed} Passed, ${failed} Failed`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  return failed === 0;
}

const isDirectScript = process.argv[1] && process.argv[1].endsWith('ux-decision-schema-harness.mjs');
if (isDirectScript) {
  const success = runUxDecisionSchemaHarness(process.argv.slice(2));
  process.exit(success ? 0 : 1);
}

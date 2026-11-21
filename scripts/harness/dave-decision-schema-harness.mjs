#!/usr/bin/env node

/**
 * DAVE Decision Schema Verification Harness
 * Verifies decision records across all 17 domains against schema invariants
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateDaveDecision, DAVE_DECISION_TYPES } from '../lib/dave-engine.mjs';

function runHarness() {
  const args = process.argv.slice(2);
  const targetPath = args[0];

  console.log('🔬 Executing DAVE Decision Schema Verification Harness...');
  console.log(`Registered DAVE Domains: ${DAVE_DECISION_TYPES.length}`);

  let testDecisions = [];

  if (targetPath && fs.existsSync(targetPath)) {
    const raw = fs.readFileSync(targetPath, 'utf8');
    testDecisions = targetPath.endsWith('.jsonl')
      ? raw.split('\n').filter(Boolean).map(line => JSON.parse(line))
      : [JSON.parse(raw)];
  } else {
    // Generate synthetic multi-domain battery across all 17 domains
    testDecisions = DAVE_DECISION_TYPES.map((type, idx) => ({
      decision_id: `DAVE-${type.toUpperCase().slice(0, 4)}-${String(idx + 1).padStart(4, '0')}`,
      decision_type: type,
      goal_id: 'G-DAVE-001',
      decision: {
        summary: `Canonical ${type} baseline decision for DAVE testing`,
        primary_action: 'verify_domain_schema'
      },
      confidence: 0.90,
      risk: 'low',
      evidence: ['docs/03-architecture/design-tokens.md'],
      references: ['REF-0001'],
      assumptions: ['Default platform invariants apply'],
      alternatives_rejected: ['Reject non-conforming architecture'],
      verification: ['dave-decision-schema-harness.mjs'],
      human_action: 'none'
    }));
  }

  let passed = 0;
  let failed = 0;

  for (const dec of testDecisions) {
    const res = validateDaveDecision(dec);
    if (res.valid) {
      passed++;
    } else {
      failed++;
      console.error(`❌ Validation failed for ${dec.decision_id || 'unknown'}:`);
      res.errors.forEach(e => console.error(`   - ${e}`));
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (Total: ${testDecisions.length})`);
  if (failed > 0) {
    process.exit(1);
  }

  console.log('✅ DAVE Decision Schema Verification Harness: ALL DOMAIN CONTRACTS SATISFIED.');
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runHarness();
}

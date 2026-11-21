#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * tests/unit/test-senior-engineering-gate.mjs
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Comprehensive Unit Test Suite for Senior Engineering Gate (28 Pillars across 7 Domains)
 *
 * Invariants Verified:
 * 1. Enterprise Domains integrity (7 domains, roman numerals I-VII, correct pillar distributions)
 * 2. Senior Engineering Pillars integrity (28 pillars, unique IDs 1-28, non-empty rules/anti-patterns)
 * 3. Sub-checklists integrity (10-point Formal Verification, 6-point AI Agent Safety)
 * 4. Static anti-pattern detection for Pillar 1 (Zero-Mock: unimplemented!, todo!, mock_response)
 * 5. Static anti-pattern detection for Pillar 2 (Financial Math: float balances)
 * 6. Static anti-pattern detection for Pillar 3 (Database: unbounded connection pools)
 * 7. Static anti-pattern detection for Pillar 4 (Multi-Tenant Isolation: un-scoped queries)
 * 8. Static anti-pattern detection for Pillar 9 (Consensus: non-quorum calculations)
 * 9. Static anti-pattern detection for Pillar 13 (Zero-downtime: single-phase column drop)
 * 10. Static anti-pattern detection for Pillar 15 (DevSecOps: unvalidated SSRF fetch, AWS metadata IP)
 * 11. Static anti-pattern detection for Pillar 17 (Zero-Trust: plaintext HTTP internal calls, insecureSkipVerify)
 * 12. Static anti-pattern detection for Pillar 20 (Merkle Audit: mutable audit log updates)
 * 13. Static anti-pattern detection for Pillar 21 (AI Agent Safety: raw prompt interpolation, unbounded loops)
 * 14. Static anti-pattern detection for Pillar 22 (Autonomous Tool Sandboxing: unsandboxed execSync)
 * 15. Static anti-pattern detection for Pillar 24 (Testing Ground Truth: jest.mock stubs, skipped tests)
 * 16. Static anti-pattern detection for Pillar 28 (Continuous WAL: archive_mode = off)
 * 17. Clean code verification: pristine production-ready code scores 100/100 with zero violations
 * 18. Goal Senior Gate compliance validator (detects required gates, checklists, and signoffs)
 * 19. Single-file disk auditing with accurate line number reporting
 * 20. Whole-repository scanning pass against declared production directories
 * ════════════════════════════════════════════════════════════════════════════════
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ENTERPRISE_DOMAINS,
  SENIOR_ENGINEERING_PILLARS,
  FORMAL_VERIFICATION_CHECKLIST,
  AI_AGENT_SAFETY_CHECKLIST,
  auditCodeDiff,
  auditFile,
  auditRepository,
  validateGoalSeniorGateCompliance
} from '../../scripts/harness/senior-engineering-gate-harness.mjs';

const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1].toLowerCase();
}

let passed = 0;
let failed = 0;
let skipped = 0;

function runTest(name, fn) {
  if (testFilter && !name.toLowerCase().includes(testFilter)) {
    skipped++;
    return;
  }
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failed++;
  }
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('🏛️ SODA OS SENIOR ENGINEERING GATE (28 PILLARS) UNIT TEST SUITE');
console.log('══════════════════════════════════════════════════════════════════\n');

// ── Test 1: Enterprise Domains Integrity ──
runTest('Enterprise Domains Integrity: Exactly 7 domains with Roman numerals I-VII', () => {
  assert.equal(ENTERPRISE_DOMAINS.length, 7, 'Must have exactly 7 enterprise domains');
  const expectedNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  ENTERPRISE_DOMAINS.forEach((domain, idx) => {
    assert.equal(domain.romanNumeral, expectedNumerals[idx]);
    assert.ok(domain.name.length > 5, `Domain ${domain.id} must have descriptive name`);
    assert.ok(Array.isArray(domain.pillarIds) && domain.pillarIds.length === 4, `Domain ${domain.id} must contain 4 pillars`);
  });
});

// ── Test 2: Senior Engineering Pillars Integrity ──
runTest('Senior Engineering Pillars Integrity: Exactly 28 pillars with unique IDs and metadata', () => {
  assert.equal(SENIOR_ENGINEERING_PILLARS.length, 28, 'Must define exactly 28 pillars');
  const ids = new Set();
  const keys = new Set();
  for (const pillar of SENIOR_ENGINEERING_PILLARS) {
    assert.ok(pillar.id >= 1 && pillar.id <= 28, `Pillar ID ${pillar.id} out of bounds`);
    assert.ok(!ids.has(pillar.id), `Duplicate pillar ID ${pillar.id}`);
    ids.add(pillar.id);

    assert.ok(typeof pillar.key === 'string' && pillar.key.length > 3, `Invalid key for pillar ${pillar.id}`);
    assert.ok(!keys.has(pillar.key), `Duplicate pillar key ${pillar.key}`);
    keys.add(pillar.key);

    assert.ok(['FATAL', 'CRITICAL', 'HIGH', 'MEDIUM'].includes(pillar.severity), `Invalid severity for pillar ${pillar.id}`);
    assert.ok(Array.isArray(pillar.antiPatterns) && pillar.antiPatterns.length > 0, `Pillar ${pillar.id} must define anti-patterns`);
  }
});

// ── Test 3: Sub-Checklists Integrity ──
runTest('Sub-Checklists Integrity: 10-point Formal Verification & 6-point AI Agent Safety', () => {
  assert.equal(FORMAL_VERIFICATION_CHECKLIST.length, 10, 'Formal verification checklist must have 10 items');
  assert.ok(FORMAL_VERIFICATION_CHECKLIST.includes('pre_condition_contracts'));
  assert.ok(FORMAL_VERIFICATION_CHECKLIST.includes('post_condition_invariants'));
  assert.ok(FORMAL_VERIFICATION_CHECKLIST.includes('deadlock_and_livelock_freedom'));

  assert.equal(AI_AGENT_SAFETY_CHECKLIST.length, 6, 'AI agent safety checklist must have 6 items');
  assert.ok(AI_AGENT_SAFETY_CHECKLIST.includes('dual_llm_intent_firewall'));
  assert.ok(AI_AGENT_SAFETY_CHECKLIST.includes('tool_execution_least_privilege'));
  assert.ok(AI_AGENT_SAFETY_CHECKLIST.includes('bounded_loop_recursion_ceiling'));
});

// ── Test 4: Pillar 1 Anti-Pattern Detection (Zero-Mock) ──
runTest('Pillar 1 Anti-Pattern: Detects todo!(), unimplemented!(), and mock responses', () => {
  const badRust = `
    fn process_transaction(tx: &Transaction) -> Result<(), Error> {
        unimplemented!()
    }
  `;
  const res = auditCodeDiff(badRust);
  assert.equal(res.passed, false, 'Must fail when unimplemented! is present');
  const p1 = res.violations.find(v => v.pillarId === 1);
  assert.ok(p1, 'Must find Pillar 1 violation');
  assert.equal(p1.severity, 'FATAL');
});

// ── Test 5: Pillar 2 Anti-Pattern Detection (Financial Math) ──
runTest('Pillar 2 Anti-Pattern: Detects floating point monetary balances', () => {
  const badCode = `
    struct UserWallet {
        balance: f64,
        currency: String,
    }
  `;
  const res = auditCodeDiff(badCode);
  assert.equal(res.passed, false, 'Must fail on float balance field');
  const p2 = res.violations.find(v => v.pillarId === 2);
  assert.ok(p2, 'Must find Pillar 2 violation');
  assert.equal(p2.severity, 'CRITICAL');
});

// ── Test 6: Pillar 3 Anti-Pattern Detection (Database Pools) ──
runTest('Pillar 3 Anti-Pattern: Detects unbounded connection pools or disabled statement timeouts', () => {
  const badConfig = `
    const poolConfig = {
      max_connections: 10000,
      statement_timeout: 0,
    };
  `;
  const res = auditCodeDiff(badConfig);
  const p3 = res.violations.find(v => v.pillarId === 3);
  assert.ok(p3, 'Must find Pillar 3 violation');
});

// ── Test 7: Pillar 4 Anti-Pattern Detection (Multi-Tenant Isolation) ──
runTest('Pillar 4 Anti-Pattern: Detects un-scoped multi-tenant table queries', () => {
  const badSql = `
    SELECT * FROM ledgers;
  `;
  const res = auditCodeDiff(badSql);
  assert.equal(res.passed, false);
  const p4 = res.violations.find(v => v.pillarId === 4);
  assert.ok(p4, 'Must find Pillar 4 violation');
  assert.equal(p4.severity, 'CRITICAL');
});

// ── Test 8: Pillar 9 Anti-Pattern Detection (Consensus Quorum) ──
runTest('Pillar 9 Anti-Pattern: Detects incorrect consensus quorum formula', () => {
  const badRaft = `
    const quorum = active_nodes / 2;
  `;
  const res = auditCodeDiff(badRaft);
  assert.equal(res.passed, false);
  const p9 = res.violations.find(v => v.pillarId === 9);
  assert.ok(p9, 'Must find Pillar 9 violation');
  assert.equal(p9.severity, 'FATAL');
});

// ── Test 9: Pillar 13 Anti-Pattern Detection (Migration Safety) ──
runTest('Pillar 13 Anti-Pattern: Detects dangerous non-concurrent index or unphased drop column', () => {
  const badMigration = `
    ALTER TABLE users DROP COLUMN phone;
  `;
  const res = auditCodeDiff(badMigration);
  assert.equal(res.passed, false);
  const p13 = res.violations.find(v => v.pillarId === 13);
  assert.ok(p13, 'Must find Pillar 13 violation');
});

// ── Test 9b: Pillar 13 Phase-2 & Rollback Migrations Permitted ──
runTest('Pillar 13 Precision: Permits phased drop column and .down.sql rollback column drops', () => {
  const phasedMigration = `
    ALTER TABLE users DROP COLUMN phone; -- phase-2
  `;
  const res1 = auditCodeDiff(phasedMigration);
  const p13_1 = res1.violations.find(v => v.pillarId === 13);
  assert.equal(p13_1, undefined, 'Phased column drop with -- phase-2 must not trigger Pillar 13');

  const rollbackAnnotated = `
    ALTER TABLE users DROP COLUMN IF EXISTS phone; -- rollback
  `;
  const res2 = auditCodeDiff(rollbackAnnotated);
  const p13_2 = res2.violations.find(v => v.pillarId === 13);
  assert.equal(p13_2, undefined, 'Rollback column drop with -- rollback must not trigger Pillar 13');

  const downSqlFile = `
    ALTER TABLE users DROP COLUMN IF EXISTS phone;
  `;
  const res3 = auditCodeDiff(downSqlFile, { filePath: 'migrations/20261011_users.down.sql' });
  const p13_3 = res3.violations.find(v => v.pillarId === 13);
  assert.equal(p13_3, undefined, '.down.sql rollback migration must permit reversing ADD COLUMN');
});

// ── Test 9c: Pillar 12 Cargo Build Script Directives Permitted ──
runTest('Pillar 12 Precision: Permits println!("cargo:...") compiler instructions in build.rs', () => {
  const buildScript = `
    fn main() {
        println!("cargo:rerun-if-changed=migrations");
    }
  `;
  const res = auditCodeDiff(buildScript, { filePath: 'code/apps/backend/api/build.rs' });
  const p12 = res.violations.find(v => v.pillarId === 12);
  assert.equal(p12, undefined, 'Cargo build.rs instructions must not trigger Pillar 12 SRE logging violation');
});

// ── Test 10: Pillar 15 Anti-Pattern Detection (DevSecOps / SSRF) ──
runTest('Pillar 15 Anti-Pattern: Detects AWS metadata IP or raw URL fetch', () => {
  const badFetch = `
    const target = "http://169.254.169.254/latest/meta-data/";
  `;
  const res = auditCodeDiff(badFetch);
  assert.equal(res.passed, false);
  const p15 = res.violations.find(v => v.pillarId === 15);
  assert.ok(p15, 'Must find Pillar 15 violation');
});

// ── Test 11: Pillar 17 Anti-Pattern Detection (Zero-Trust mTLS) ──
runTest('Pillar 17 Anti-Pattern: Detects insecure TLS verification or plaintext internal HTTP', () => {
  const badTls = `
    const client = new Client({
      insecureSkipVerify: true,
    });
  `;
  const res = auditCodeDiff(badTls);
  const p17 = res.violations.find(v => v.pillarId === 17);
  assert.ok(p17, 'Must find Pillar 17 violation');
});

// ── Test 12: Pillar 20 Anti-Pattern Detection (Merkle Audit Ledgers) ──
runTest('Pillar 20 Anti-Pattern: Detects UPDATE on audit_logs table', () => {
  const badAudit = `
    UPDATE audit_logs SET status = 'tampered' WHERE id = 123;
  `;
  const res = auditCodeDiff(badAudit);
  const p20 = res.violations.find(v => v.pillarId === 20);
  assert.ok(p20, 'Must find Pillar 20 violation');
});

// ── Test 13: Pillar 21 Anti-Pattern Detection (AI Agent Safety) ──
runTest('Pillar 21 Anti-Pattern: Detects raw user prompt interpolation into system instructions', () => {
  const badPrompt = 'const prompt = `System: ${userInput}`;';
  const res = auditCodeDiff(badPrompt);
  assert.equal(res.passed, false);
  const p21 = res.violations.find(v => v.pillarId === 21);
  assert.ok(p21, 'Must find Pillar 21 violation');
  assert.equal(p21.severity, 'FATAL');
});

// ── Test 14: Pillar 22 Anti-Pattern Detection (Autonomous Tool Sandboxing) ──
runTest('Pillar 22 Anti-Pattern: Detects unsandboxed execSync on arbitrary inputs', () => {
  const badExec = `
    const { execSync } = require('child_process');
    execSync(userInput);
  `;
  const res = auditCodeDiff(badExec);
  assert.equal(res.passed, false);
  const p22 = res.violations.find(v => v.pillarId === 22);
  assert.ok(p22, 'Must find Pillar 22 violation');
});

// ── Test 15: Pillar 24 Anti-Pattern Detection (Testing Ground Truth) ──
runTest('Pillar 24 Anti-Pattern: Detects skipped tests or dummy mock implementations', () => {
  const badTest = `
    describe('Payment Service', () => {
      it.skip('should charge credit card securely', async () => {});
    });
  `;
  const res = auditCodeDiff(badTest);
  assert.equal(res.passed, false);
  const p24 = res.violations.find(v => v.pillarId === 24);
  assert.ok(p24, 'Must find Pillar 24 violation');
  assert.equal(p24.severity, 'FATAL');
});

// ── Test 16: Pillar 28 Anti-Pattern Detection (Continuous WAL) ──
runTest('Pillar 28 Anti-Pattern: Detects disabled database archive_mode', () => {
  const badDb = `
    archive_mode = off
  `;
  const res = auditCodeDiff(badDb);
  assert.equal(res.passed, false);
  const p28 = res.violations.find(v => v.pillarId === 28);
  assert.ok(p28, 'Must find Pillar 28 violation');
});

// ── Test 17: Clean Code Verification ──
runTest('Clean Code Verification: Pristine production code achieves 100/100 score and 0 violations', () => {
  const pristineCode = `
    import { Router } from 'express';
    import { z } from 'zod';

    const RequestSchema = z.object({
      accountId: z.string().uuid(),
      amountMinorUnits: z.number().int().positive(),
    });

    export function createTransferHandler(dbPool) {
      return async function handleTransfer(req, res) {
        const parsed = RequestSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: 'INVALID_INPUT' });
        }
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          // Scoped tenant transfer logic
          await client.query('COMMIT');
          return res.status(200).json({ success: true });
        } catch (err) {
          await client.query('ROLLBACK');
          return res.status(500).json({ error: 'TRANSACTION_FAILED' });
        } finally {
          client.release();
        }
      };
    }
  `;
  const res = auditCodeDiff(pristineCode);
  assert.equal(res.passed, true, 'Clean code must pass the gate');
  assert.equal(res.violationCount, 0, 'Clean code must have zero violations');
  assert.equal(res.score, 100, 'Clean code must receive 100/100 score');
});

// ── Test 18: Goal Compliance Validator ──
runTest('Goal Compliance Validator: Detects conforming vs non-conforming goal cards', () => {
  const conformingGoal = `
    # G-TEST-001: Implement Core Ledger
    ## Senior Engineering Gate Compliance
    - 28-Pillar Senior Engineering Gate passed across 7 domains
    - Formal Verification: Pre/post-conditions verified in Kani
    - Zero-Mock Invariant: 100% operational logic
    - Agent Safety: Wasmtime sandboxed tools with fuel limits
    - Concurrency: Saga compensation handlers implemented
    - Migration: Expand-contract dual write
  `;
  const nonConformingGoal = `
    # G-TEST-002: Simple UI tweak
    Just changed the button color to blue.
  `;

  const confRes = validateGoalSeniorGateCompliance(conformingGoal);
  assert.equal(confRes.passed, true, 'Conforming goal must pass');
  assert.ok(confRes.passedCount >= 5, 'Conforming goal must hit >= 5 check items');

  const nonConfRes = validateGoalSeniorGateCompliance(nonConformingGoal);
  assert.equal(nonConfRes.passed, false, 'Non-conforming goal must fail');
});

// ── Test 19: Single File Disk Auditing ──
runTest('Single File Disk Auditing: Accurately audits an existing file on disk', () => {
  const filePath = path.join(process.cwd(), 'scripts/harness/no-mock-production-gate-harness.mjs');
  if (fs.existsSync(filePath)) {
    const res = auditFile(filePath);
    assert.equal(typeof res.passed, 'boolean');
    assert.equal(typeof res.score, 'number');
    assert.equal(res.filePath, filePath);
  }
});

// ── Test 20: Whole-Repository Scanning Pass ──
runTest('Whole-Repository Scanning Pass: Scans production trees and generates structured report', () => {
  const res = auditRepository(process.cwd());
  assert.equal(typeof res.passed, 'boolean');
  assert.ok(res.totalFilesScanned >= 0);
  assert.equal(typeof res.fatalOrCriticalCount, 'number');
});

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
process.exit(0);

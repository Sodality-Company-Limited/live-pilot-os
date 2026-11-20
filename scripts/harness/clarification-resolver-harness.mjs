#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CLARIFICATION RESOLVER UNIT TEST HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Module: scripts/harness/clarification-resolver-harness.mjs
 * Purpose: Verifies goal normalization, dynamic path resolution, markdown extraction,
 *          legacy migration, and archival lifecycle without stubs or mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import {
  normalizeGoalId,
  getClarificationFilename,
  resolveClarificationPath,
  resolveArchivedClarificationPath,
  extractGoalIdFromMarkdown,
  extractOwningAgentFromMarkdown,
  generateClarificationHeader,
  migrateLegacyClarification,
  archiveClarificationFile,
} from '../lib/clarification-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const TEST_SANDBOX = path.join(REPO_ROOT, 'docs/07-backlog/clarifications/.test-sandbox');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================================');
console.log('🧪 SODA OS CLARIFICATION RESOLVER UNIT TEST HARNESS');
console.log('================================================================================\n');

// 1. Goal Normalization
runTest('1. normalizeGoalId normalizes diverse goal notations', () => {
  assert.strictEqual(normalizeGoalId('g-core-001'), 'G-CORE-001');
  assert.strictEqual(normalizeGoalId('G-130'), 'G-130');
  assert.strictEqual(normalizeGoalId(' g-pay-042 '), 'G-PAY-042');
  assert.strictEqual(normalizeGoalId('G-EVOLVE-032'), 'G-EVOLVE-032');
  assert.throws(() => normalizeGoalId(''), /Invalid goalId/);
  assert.throws(() => normalizeGoalId(null), /Invalid goalId/);
});

// 2. Filename Derivation
runTest('2. getClarificationFilename derives standard markdown names', () => {
  assert.strictEqual(getClarificationFilename('g-core-001'), 'CLARIFICATION-G-CORE-001.md');
  assert.strictEqual(getClarificationFilename('G-130'), 'CLARIFICATION-G-130.md');
});

// 3. Markdown Extraction
runTest('3. extractGoalIdFromMarkdown extracts Goal IDs from diverse markdown patterns', () => {
  const mdExplicit = '> **Goal ID:** `G-CORE-001`\nSome content';
  assert.strictEqual(extractGoalIdFromMarkdown(mdExplicit), 'G-CORE-001');

  const mdRef = '> **Goal Reference:** [G-PAY-002](file:///path/to/goal.md)\n';
  assert.strictEqual(extractGoalIdFromMarkdown(mdRef), 'G-PAY-002');

  const mdTag = '# State Machine\n[GOAL_ID: G-130]\n';
  assert.strictEqual(extractGoalIdFromMarkdown(mdTag), 'G-130');

  const mdNone = '# Title without goal tag';
  assert.strictEqual(extractGoalIdFromMarkdown(mdNone), null);
});

// 4. Header Generation
runTest('4. generateClarificationHeader synthesizes valid mandatory headers with append-only history', () => {
  const header = generateClarificationHeader({
    goalId: 'g-core-001',
    owningAgent: 'Antigravity Test Agent',
    state: '[STATE: AWAITING_HUMAN_ROUND_1]',
    roundNumber: 1,
    targetFeature: 'Ecosystem Upgrade',
    history: ['Round 1: Initial Ingestion']
  });

  assert.ok(header.includes('**Goal ID:** `G-CORE-001`'));
  assert.ok(header.includes('**Owning Agent/Session:** `Antigravity Test Agent`'));
  assert.ok(header.includes('**State:** `[STATE: AWAITING_HUMAN_ROUND_1]`'));
  assert.ok(header.includes('Round 1 of Socratic Dialogue'));
  assert.ok(header.includes('## 📜 Append-Only Q&A History'));
  assert.ok(header.includes('- Round 1: Initial Ingestion'));
});

// 5. Sandbox Fixture Tests: Path Resolution, Migration, and Archival
runTest('5. Sandbox Resolution, Migration & Archival Lifecycle', () => {
  if (fs.existsSync(TEST_SANDBOX)) {
    fs.rmSync(TEST_SANDBOX, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_SANDBOX, { recursive: true });

  const activePath = path.join(TEST_SANDBOX, 'CLARIFICATION-G-TEST-001.md');
  fs.writeFileSync(activePath, '# Test Active Clarification\n> **Goal ID:** `G-TEST-001`\n', 'utf8');

  // Resolves active
  const resolvedActive = resolveClarificationPath(TEST_SANDBOX, 'g-test-001');
  assert.strictEqual(resolvedActive, activePath);

  // Archive file
  const archived = archiveClarificationFile(TEST_SANDBOX, 'G-TEST-001');
  assert.ok(fs.existsSync(archived));
  assert.ok(!fs.existsSync(activePath));
  assert.strictEqual(archived, path.join(TEST_SANDBOX, 'docs/07-backlog/clarifications/CLARIFICATION-G-TEST-001.md'));

  // Resolves archived
  const resolvedArchived = resolveClarificationPath(TEST_SANDBOX, 'G-TEST-001');
  assert.strictEqual(resolvedArchived, archived);

  // Test legacy migration
  const legacyPath = path.join(TEST_SANDBOX, 'CLARIFICATION.md');
  fs.writeFileSync(legacyPath, '# Legacy\n> **Goal ID:** `G-LEGACY-002`\nStatus: ALIGNMENT_COMPLETE\n', 'utf8');

  const migration = migrateLegacyClarification(TEST_SANDBOX);
  assert.strictEqual(migration.migrated, true);
  assert.strictEqual(migration.goalId, 'G-LEGACY-002');
  assert.ok(!fs.existsSync(legacyPath));
  assert.ok(fs.existsSync(path.join(TEST_SANDBOX, 'docs/07-backlog/clarifications/CLARIFICATION-G-LEGACY-002.md')));

  // Cleanup sandbox
  fs.rmSync(TEST_SANDBOX, { recursive: true, force: true });
});

console.log('--------------------------------------------------------------------------------');
console.log(`📊 Unit Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log('--------------------------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL CLARIFICATION RESOLVER CHECKS PASSED 100% GREEN!\n');
  process.exit(0);
}

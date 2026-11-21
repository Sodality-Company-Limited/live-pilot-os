/**
 * tests/unit/test-decision-ledger.mjs
 *
 * Unit test suite for Evidence and Uncertainty Metadata Ledger (DecisionLedger)
 * Goal: G-ML-015
 *
 * Verifies:
 * 1. Module export and class initialization
 * 2. Physical filesystem evidence citation verification (-k test_citation_verification)
 * 3. Structured record serialization and SHA256 digest computation
 * 4. High-concurrency append-only persistence (50 records)
 * 5. Fail-closed error handling on unwritable destinations
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DecisionLedger } from '../../scripts/lib/decision-ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

// Helper to create isolated temporary directory
function createTempDir(prefix = 'soda_ledger_test_') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Clean up temporary directory
function cleanTempDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    // Ignore cleanup errors in tests
  }
}

// Test Registry
const tests = [
  {
    name: 'test_module_import',
    fn: async () => {
      assert.ok(DecisionLedger, 'DecisionLedger class must be exported');
      const ledger = new DecisionLedger();
      assert.ok(typeof ledger.recordDecision === 'function', 'recordDecision must be a function');
      assert.ok(typeof ledger.appendDecision === 'function', 'appendDecision must be a function');
      assert.ok(typeof ledger.verifyEvidenceCitations === 'function', 'verifyEvidenceCitations must be a function');
      assert.ok(typeof ledger.readDecisions === 'function', 'readDecisions must be a function');
    }
  },
  {
    name: 'test_citation_verification',
    fn: async () => {
      const tempDir = createTempDir('soda_citation_');
      try {
        const existingRelFile = 'sample-evidence.txt';
        const existingAbsFile = path.join(tempDir, existingRelFile);
        fs.writeFileSync(existingAbsFile, 'verified content for test');

        const ledger = new DecisionLedger({ basePath: tempDir });

        // 1. Verify existing file returns verified: true
        const resExisting = ledger.verifyEvidenceCitations([existingRelFile], tempDir);
        assert.equal(resExisting.verified, true, 'Existing file must be verified');
        assert.equal(resExisting.missing.length, 0, 'No missing files for existing citation');
        assert.equal(Boolean(resExisting), true, 'Truthiness check on verified result');

        // 2. Verify non-existent file returns verified: false and lists in missing
        const resMissing = ledger.verifyEvidenceCitations(['non-existent-file.doc'], tempDir);
        assert.equal(resMissing.verified, false, 'Non-existent file must not be verified');
        assert.deepEqual(resMissing.missing, ['non-existent-file.doc'], 'Missing file must be recorded');

        // 3. Verify mixed existing and missing
        const resMixed = ledger.verifyEvidenceCitations([existingRelFile, 'phantom.json'], tempDir);
        assert.equal(resMixed.verified, false, 'Mixed citations must be unverified');
        assert.deepEqual(resMixed.missing, ['phantom.json']);

        // 4. Verify empty evidence array returns verified: false (no citations provided)
        const resEmpty = ledger.verifyEvidenceCitations([], tempDir);
        assert.equal(resEmpty.verified, false, 'Empty evidence array must be unverified');
        assert.equal(resEmpty.missing.length, 0);

        // 5. Verify path traversal escaping workspace is rejected as unverified
        const resTraversal = ledger.verifyEvidenceCitations(['../../../../etc/passwd'], tempDir);
        assert.equal(resTraversal.verified, false, 'Escaping traversal path must be unverified');
        assert.equal(resTraversal.missing.length, 1);

        // 6. Verify non-array throws TypeError
        assert.throws(() => ledger.verifyEvidenceCitations('string-not-array', tempDir), {
          name: 'TypeError',
          message: /evidence must be an array/
        });

        // 7. Verify non-string citation throws TypeError
        assert.throws(() => ledger.verifyEvidenceCitations([12345], tempDir), {
          name: 'TypeError',
          message: /must be strings/
        });
      } finally {
        cleanTempDir(tempDir);
      }
    }
  },
  {
    name: 'test_record_serialization',
    fn: async () => {
      const tempDir = createTempDir('soda_serialization_');
      try {
        const realFile = 'target.txt';
        fs.writeFileSync(path.join(tempDir, realFile), 'grounding evidence');

        const auditPath = path.join(tempDir, 'audit', 'decisions.jsonl');
        const ledger = new DecisionLedger({ auditPath, basePath: tempDir, defaultModelCheckpoint: 'soda-model-v2.1' });

        const candidate = {
          prompt: 'What is the target parameter?',
          answer: 'The parameter is 42',
          confidence: 0.94,
          evidence: [realFile],
          riskLevel: 'normal',
          tokenSpans: [[0, 5], [6, 15]],
          uncertaintyMetrics: { entropy: 0.12, margin: 0.88 },
          reasoningProvenance: { traceId: 'tr_123', stepCount: 3 }
        };

        const record = ledger.recordDecision(candidate);

        // Assert record structure
        assert.ok(record.id.startsWith('dec_'), 'ID must start with dec_');
        assert.ok(record.timestamp, 'Timestamp must exist');
        assert.doesNotThrow(() => new Date(record.timestamp).toISOString(), 'Timestamp must be valid ISO');
        assert.equal(record.modelCheckpoint, 'soda-model-v2.1');
        assert.equal(record.answer, 'The parameter is 42');
        assert.equal(record.confidence, 0.94);
        assert.equal(record.evidenceVerified, true);
        assert.deepEqual(record.missingEvidence, []);
        assert.deepEqual(record.tokenSpans, [[0, 5], [6, 15]]);
        assert.equal(record.uncertaintyMetrics.entropy, 0.12);
        assert.equal(record.reasoningProvenance.traceId, 'tr_123');
        assert.ok(typeof record.contentDigest === 'string' && record.contentDigest.length === 64, 'SHA256 digest length 64');

        // Verify content digest matches SHA256 of payload without contentDigest
        const { contentDigest, ...payloadWithoutDigest } = record;
        const expectedDigest = crypto.createHash('sha256').update(JSON.stringify(payloadWithoutDigest)).digest('hex');
        assert.equal(contentDigest, expectedDigest, 'Content digest must match SHA256 of payload');
      } finally {
        cleanTempDir(tempDir);
      }
    }
  },
  {
    name: 'test_append_persistence_and_read',
    fn: async () => {
      const tempDir = createTempDir('soda_persistence_');
      try {
        const auditPath = path.join(tempDir, 'sub', 'nested', 'decisions.jsonl');
        const ledger = new DecisionLedger({ auditPath, basePath: tempDir });

        const rec1 = ledger.recordDecision({
          answer: 'First action',
          confidence: 0.85,
          evidence: []
        });

        const rec2 = ledger.recordDecision({
          answer: 'Second action',
          confidence: 0.92,
          evidence: []
        });

        assert.ok(fs.existsSync(auditPath), 'Audit file must be created on disk');
        const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
        assert.equal(lines.length, 2, 'Must have exactly 2 lines in audit log');

        const readBack = ledger.readDecisions();
        assert.equal(readBack.length, 2);
        assert.equal(readBack[0].id, rec1.id);
        assert.equal(readBack[1].id, rec2.id);
        assert.equal(readBack[0].answer, 'First action');
        assert.equal(readBack[1].answer, 'Second action');
      } finally {
        cleanTempDir(tempDir);
      }
    }
  },
  {
    name: 'test_concurrent_writes',
    fn: async () => {
      const tempDir = createTempDir('soda_concurrent_');
      try {
        const auditPath = path.join(tempDir, 'concurrent_audit.jsonl');
        const ledger = new DecisionLedger({ auditPath, basePath: tempDir });

        const CONCURRENT_COUNT = 50;
        const writePromises = [];

        for (let i = 0; i < CONCURRENT_COUNT; i++) {
          writePromises.push(
            new Promise((resolve) => {
              const rec = ledger.appendDecision({
                id: `dec_concurrent_${String(i).padStart(3, '0')}`,
                answer: `Concurrent decision index ${i}`,
                confidence: 0.5 + (i % 50) * 0.01,
                evidence: []
              });
              resolve(rec);
            })
          );
        }

        const writtenRecords = await Promise.all(writePromises);
        assert.equal(writtenRecords.length, CONCURRENT_COUNT);

        const readRecords = ledger.readDecisions();
        assert.equal(readRecords.length, CONCURRENT_COUNT, `Audit log must contain exactly ${CONCURRENT_COUNT} records`);

        // Verify each record is unique and has valid content digest
        const seenIds = new Set();
        for (const r of readRecords) {
          assert.ok(!seenIds.has(r.id), `Duplicate ID detected: ${r.id}`);
          seenIds.add(r.id);
          assert.ok(typeof r.contentDigest === 'string' && r.contentDigest.length === 64);
        }
      } finally {
        cleanTempDir(tempDir);
      }
    }
  },
  {
    name: 'test_write_error_halting',
    fn: async () => {
      // Configure an unwritable path using a file as a directory path
      const tempDir = createTempDir('soda_readonly_');
      try {
        const blockingFile = path.join(tempDir, 'blocking_file');
        fs.writeFileSync(blockingFile, 'blocking');

        // Attempting to create a child directory inside a regular file throws ENOTDIR
        const impossiblePath = path.join(blockingFile, 'sub', 'decisions.jsonl');
        const ledger = new DecisionLedger({ auditPath: impossiblePath, basePath: tempDir });

        assert.throws(
          () => {
            ledger.recordDecision({
              answer: 'Should fail to write',
              confidence: 0.9,
              evidence: []
            });
          },
          {
            name: 'Error',
            message: /Audit ledger write failed/
          },
          'Ledger write must throw an Error upon filesystem failure'
        );
      } finally {
        cleanTempDir(tempDir);
      }
    }
  }
];

// CLI runner with -k pattern matching support
async function run() {
  const args = process.argv.slice(2);
  let filterPattern = null;

  const kIndex = args.indexOf('-k');
  if (kIndex !== -1 && args[kIndex + 1]) {
    filterPattern = args[kIndex + 1];
  }

  const selectedTests = filterPattern
    ? tests.filter(t => t.name.includes(filterPattern))
    : tests;

  console.log(`\n▶ Running ${selectedTests.length} DecisionLedger unit tests${filterPattern ? ` matching filter "${filterPattern}"` : ''}...\n`);

  let passed = 0;
  for (const test of selectedTests) {
    try {
      await test.fn();
      console.log(`  ✔ [PASS] ${test.name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${test.name}:`, err);
      process.exit(1);
    }
  }

  console.log(`\n📊 Result: ${passed}/${selectedTests.length} tests passed successfully.\n`);
  process.exit(0);
}

run();

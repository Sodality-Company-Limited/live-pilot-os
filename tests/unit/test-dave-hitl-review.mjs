import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  aggregateGoalAuditTrail,
  formatReviewPacket,
  recordDaveTrajectory
} from '../../scripts/lib/dave-engine.mjs';

const TEST_SCRATCH_DIR = path.resolve(process.cwd(), 'scratch/test-dave-hitl-review');

test.before(() => {
  if (!fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.mkdirSync(TEST_SCRATCH_DIR, { recursive: true });
  }
});

test.after(() => {
  if (fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.rmSync(TEST_SCRATCH_DIR, { recursive: true, force: true });
  }
});

test('G-WEB-011: Step 1 - Aggregate verified decisions, proof receipts, and visual diff metrics', () => {
  // Aggregate real decisions for G-WEB-001 from .agents/audit/decisions.jsonl
  const aggregated = aggregateGoalAuditTrail('G-WEB-001');

  assert.equal(aggregated.goalId, 'G-WEB-001', 'Must match requested goalId');
  assert.ok(Array.isArray(aggregated.decisions), 'Must return array of decisions');
  assert.ok(aggregated.decisions.length >= 2, 'Must find at least DAVE-UX-0001 and DAVE-FE-G-WEB-001');

  // Verify calibrated confidence scores
  assert.ok(typeof aggregated.calibratedConfidence === 'number', 'Must compute calibrated confidence');
  assert.ok(aggregated.calibratedConfidence >= 0.85 && aggregated.calibratedConfidence <= 1.0, 'Calibrated confidence within bounds');

  // Verify risk classification
  assert.ok(['low', 'medium', 'high'].includes(aggregated.riskLevel), 'Risk level must be valid');

  // Verify visual diff metrics extracted
  assert.ok(aggregated.visualDiffMetrics, 'Must include visual diff metrics');
  assert.equal(aggregated.visualDiffMetrics.pixelDiffRatio, 0.0018, 'Must extract exact pixel_diff_ratio from empirical outcome');
  assert.equal(aggregated.visualDiffMetrics.layoutShift, 0, 'Layout shift must be 0');
  assert.equal(aggregated.visualDiffMetrics.overflowDetected, false, 'Overflow must be false');

  // Verify proof receipts ingested
  assert.ok(Array.isArray(aggregated.proofReceipts), 'Must return proof receipts');
  assert.ok(aggregated.proofReceipts.length >= 1, 'Must include G-WEB-001-proof-receipt.json');
  const receipt = aggregated.proofReceipts.find(r => r.goal_id === 'G-WEB-001');
  assert.ok(receipt, 'Found G-WEB-001 proof receipt');
  assert.equal(receipt.certification, 'PASS', 'Proof receipt certification must be PASS');

  // Verify first-class references resolved
  assert.ok(Array.isArray(aggregated.references), 'Must include references array');
  assert.ok(aggregated.references.some(r => r.reference_id === 'REF-0001'), 'Must include REF-0001 reference');
});

test('G-WEB-011: Step 1 Fail-Closed - Fail on missing goal decision record or corrupt ledger', () => {
  // Test unknown goal fails closed without dummy fallbacks
  assert.throws(() => {
    aggregateGoalAuditTrail('G-UNKNOWN-999');
  }, /Missing decision record for goal G-UNKNOWN-999/);

  // Test corrupt ledger line fails closed
  const corruptLedgerPath = path.join(TEST_SCRATCH_DIR, 'corrupt-decisions.jsonl');
  fs.writeFileSync(corruptLedgerPath, '{"valid": true}\nINVALID_JSON_CORRUPTED_LINE\n', 'utf8');

  assert.throws(() => {
    aggregateGoalAuditTrail('G-WEB-001', { ledgerPath: corruptLedgerPath });
  }, /Corrupted decision record in ledger/);
});

test('G-WEB-011: Step 2 - Format high-signal review packet without hidden chain-of-thought', () => {
  const aggregated = aggregateGoalAuditTrail('G-WEB-001');
  const outputPath = path.join(TEST_SCRATCH_DIR, 'test-review-packet.md');

  const packet = formatReviewPacket(aggregated.primaryDecision, aggregated.references, {
    aggregated,
    outputPath
  });

  // Zero chain-of-thought opacity checks
  assert.ok(!packet.includes('thinking:'), 'Must not contain hidden thinking traces');
  assert.ok(!packet.includes('<thought>'), 'Must not contain thought tags');

  // Structured sections verification
  assert.ok(packet.includes('DAVE REVIEW PACKET:'), 'Must contain review packet header');
  assert.ok(packet.includes('Goal: G-WEB-001'), 'Must state goal ID');
  assert.ok(packet.includes('1. DECISION SUMMARY:'), 'Must contain Decision Summary section');
  assert.ok(packet.includes('2. DOMAIN & ACTION:'), 'Must contain Domain & Action section');
  assert.ok(packet.includes('3. FIRST-CLASS REFERENCES:'), 'Must contain First-Class References section');
  assert.ok(packet.includes('4. PROOF RECEIPTS & EMPIRICAL METRICS:'), 'Must contain Proof Receipts & Empirical Metrics section');
  assert.ok(packet.includes('5. EXPLICIT ASSUMPTIONS:'), 'Must contain Explicit Assumptions section');
  assert.ok(packet.includes('6. ALTERNATIVES REJECTED:'), 'Must contain Alternatives Rejected section');
  assert.ok(packet.includes('7. VERIFICATION PLAN:'), 'Must contain Verification Plan section');
  assert.ok(packet.includes('8. HUMAN ACTION REQUIRED:'), 'Must contain Human Action section');

  // Interactive approval checkboxes
  assert.ok(packet.includes('[ ] 1. Approve as proposed'), 'Must have approve checkbox');
  assert.ok(packet.includes('[ ] 2. Reject and replan'), 'Must have reject checkbox');

  // Specific metric facts
  assert.ok(packet.includes('0.0018'), 'Must include exact empirical pixel diff ratio');
  assert.ok(packet.includes('REF-0001'), 'Must include reference ID');
  assert.ok(fs.existsSync(outputPath), 'Output file must be written to disk');
});

test('G-WEB-011: Step 3 - Execute CLI show-review-packet and review with audit logging', () => {
  // Test CLI show-review-packet
  const cliPath = path.resolve(process.cwd(), 'scripts/lib/dave-cli.mjs');
  const showRes = spawnSync(process.execPath, [cliPath, 'show-review-packet', 'G-WEB-001'], {
    encoding: 'utf8'
  });

  assert.equal(showRes.status, 0, `CLI show-review-packet must exit 0: ${showRes.stderr}`);
  assert.ok(showRes.stdout.includes('DAVE REVIEW PACKET:'), 'CLI stdout must contain review packet header');
  assert.ok(showRes.stdout.includes('G-WEB-001'), 'CLI stdout must include G-WEB-001');

  // Ensure artifacts/review/DAVE-REVIEW-PACKET.md exists and is readable
  const reviewPacketPath = path.resolve(process.cwd(), 'artifacts/review/DAVE-REVIEW-PACKET.md');
  assert.ok(fs.existsSync(reviewPacketPath), 'artifacts/review/DAVE-REVIEW-PACKET.md must exist');
  const packetContent = fs.readFileSync(reviewPacketPath, 'utf8');
  assert.ok(packetContent.includes('DAVE REVIEW PACKET:'), 'File must contain review packet header');
  assert.ok(packetContent.includes('G-WEB-001'), 'File must contain G-WEB-001');

  // Test CLI review --approve
  const testLedgerPath = path.join(TEST_SCRATCH_DIR, 'test-audit.jsonl');
  // Copy current ledger for isolated testing
  fs.copyFileSync(path.resolve(process.cwd(), '.agents/audit/decisions.jsonl'), testLedgerPath);

  const approveRes = spawnSync(process.execPath, [cliPath, 'review', 'G-WEB-001', '--approve'], {
    encoding: 'utf8',
    env: { ...process.env, SODA_AUDIT_LEDGER: testLedgerPath }
  });

  assert.equal(approveRes.status, 0, `CLI review --approve must exit 0: ${approveRes.stderr}`);
  assert.ok(approveRes.stdout.includes('APPROVED'), 'CLI stdout must announce APPROVED');

  // Test CLI review without flags must fail
  const badRes = spawnSync(process.execPath, [cliPath, 'review', 'G-WEB-001'], {
    encoding: 'utf8'
  });
  assert.notEqual(badRes.status, 0, 'CLI review without --approve or --reject must exit non-zero');
});

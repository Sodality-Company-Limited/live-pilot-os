#!/usr/bin/env node
/**
 * tests/unit/test-ci-calibration-gate.mjs
 *
 * Comprehensive Unit Test Suite for Goal G-ML-020:
 * CI Calibration Gate and Quality Policy Enforcement
 *
 * Test Coverage:
 * 1. Constant definitions and SLA threshold verification (ECE <= 0.04, Brier <= 0.08, HCER <= 0.01)
 * 2. CLI argument parsing (--help, --artifact, --report, --strict, short flags, equals syntax)
 * 3. Canonical conforming dataset generator (getStandardPassingSuite)
 * 4. Exact mathematical metric extraction (computeMetricsFromDecisions: ECE, Brier, HCER)
 * 5. Input validation and error handling on empty or corrupted decision data
 * 6. Autonomous decision routing policy enforcement (checkRoutingSafety: unverified high-risk invariant)
 * 7. In-memory and file-based gate evaluation (evaluateCalibrationGate)
 * 8. Rejection of ECE threshold breach (> 0.0400)
 * 9. Rejection of Brier score threshold breach (> 0.0800)
 * 10. Rejection of High-Confidence Error Rate threshold breach (> 0.0100)
 * 11. Rejection of routing policy violation in gate evaluation
 * 12. Handling of non-existent and malformed JSON artifact files
 * 13. Subprocess CLI tests: --help exits 0, bare runner exits 0, failing scorecard exits 1
 * 14. Report generation and schema conformance verification
 * 15. Command-line `-k` substring filtering support
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  CALIBRATION_SLAS,
  DEFAULT_ARTIFACT_PATHS,
  getGitCommitHead,
  checkRoutingSafety,
  computeMetricsFromDecisions,
  getStandardPassingSuite,
  evaluateCalibrationGate,
  parseCommandLineArgs
} from '../../scripts/ci/ci-calibration-gate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCRIPT_PATH = path.resolve(REPO_ROOT, 'scripts/ci/ci-calibration-gate.mjs');

const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1].toLowerCase();
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  if (testFilter && !testName.toLowerCase().includes(testFilter)) {
    return;
  }
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    throw err;
  }
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING CI CALIBRATION GATE UNIT TEST SUITE (G-ML-020)');
if (testFilter) {
  console.log(`   Applying filter: -k "${testFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// 1. SLA Constants
runTest('SLA Constants - ECE, Brier, and HCER ceilings match specification', () => {
  assert.equal(CALIBRATION_SLAS.ece, 0.0400, 'ECE ceiling SLA must be exactly 0.0400');
  assert.equal(CALIBRATION_SLAS.brier_score, 0.0800, 'Brier ceiling SLA must be exactly 0.0800');
  assert.equal(CALIBRATION_SLAS.high_confidence_error_rate, 0.0100, 'HCER ceiling SLA must be exactly 0.0100 (1%)');
  assert.ok(Array.isArray(DEFAULT_ARTIFACT_PATHS), 'DEFAULT_ARTIFACT_PATHS must be an array');
});

// 2. Git Provenance
runTest('Git Provenance - getGitCommitHead returns valid 40-character hex SHA', () => {
  const head = getGitCommitHead();
  assert.ok(typeof head === 'string', 'Commit HEAD must be a string');
  assert.match(head, /^[0-9a-f]{40}$/i, 'Commit HEAD must be a 40-char git SHA');
});

// 3. CLI Argument Parsing
runTest('CLI Parsing - handles --help, -h, --artifact, --report, and --strict correctly', () => {
  const opts1 = parseCommandLineArgs(['--help']);
  assert.equal(opts1.help, true);

  const opts2 = parseCommandLineArgs(['-h']);
  assert.equal(opts2.help, true);

  const opts3 = parseCommandLineArgs(['--artifact', 'artifacts/eval/scorecard.json', '--report', 'report.json', '--strict']);
  assert.equal(opts3.artifact, 'artifacts/eval/scorecard.json');
  assert.equal(opts3.report, 'report.json');
  assert.equal(opts3.strict, true);

  const opts4 = parseCommandLineArgs(['-a', 'custom.json', '-r', 'out.json']);
  assert.equal(opts4.artifact, 'custom.json');
  assert.equal(opts4.report, 'out.json');

  const opts5 = parseCommandLineArgs(['--artifact=foo.json', '--report=bar.json']);
  assert.equal(opts5.artifact, 'foo.json');
  assert.equal(opts5.report, 'bar.json');

  const opts6 = parseCommandLineArgs(['--unknown-flag', 'value']);
  assert.deepEqual(opts6.unknown, ['--unknown-flag']);
});

// 4. Standard Passing Baseline Generator
runTest('Passing Baseline - getStandardPassingSuite generates 100 well-calibrated decisions', () => {
  const suite = getStandardPassingSuite();
  assert.ok(suite && Array.isArray(suite.decisions), 'Suite must contain decisions array');
  assert.equal(suite.decisions.length, 100, 'Suite must contain exactly 100 decisions');

  const metrics = computeMetricsFromDecisions(suite.decisions);
  assert.ok(metrics.ece <= CALIBRATION_SLAS.ece, `ECE (${metrics.ece}) must be <= ${CALIBRATION_SLAS.ece}`);
  assert.ok(metrics.brier_score <= CALIBRATION_SLAS.brier_score, `Brier (${metrics.brier_score}) must be <= ${CALIBRATION_SLAS.brier_score}`);
  assert.ok(metrics.high_confidence_error_rate <= CALIBRATION_SLAS.high_confidence_error_rate, `HCER (${metrics.high_confidence_error_rate}) must be <= ${CALIBRATION_SLAS.high_confidence_error_rate}`);
});

// 5. Routing Safety Check
runTest('Routing Safety - detects unverified high-risk proceed and permits safe actions', () => {
  // Safe cases
  const safeDecisions = [
    { risk: 'high', evidence: 'verified', action: 'proceed' },
    { risk: 'high', evidence: 'unverified', action: 'verify' },
    { risk: 'high', evidence: 'unverified', action: 'defer' },
    { risk: 'high', evidence: 'unverified', action: 'human_review' },
    { risk: 'low', evidence: 'unverified', action: 'proceed' },
    { risk: 'medium', evidence: 'unverified', action: 'verify' }
  ];
  const safeViolations = checkRoutingSafety(safeDecisions);
  assert.equal(safeViolations.length, 0, 'Safe decisions should produce 0 violations');

  // Violation case: high risk + unverified + proceed
  const dangerousDecisions = [
    { id: 'rec_viol_1', risk: 'high', evidence: 'unverified', action: 'proceed' },
    { id: 'rec_viol_2', riskLevel: 'HIGH', evidenceStatus: 'false', routing_action: 'proceed' },
    { id: 'rec_viol_3', risk_level: 'high', verified: false, action: 'proceed' }
  ];
  const violations = checkRoutingSafety(dangerousDecisions);
  assert.equal(violations.length, 3, 'All 3 unsafe decisions must be flagged as violations');
  assert.equal(violations[0].recordId, 'rec_viol_1');
  assert.equal(violations[1].recordId, 'rec_viol_2');
  assert.equal(violations[2].recordId, 'rec_viol_3');
});

// 6. Metrics Computation from Decisions
runTest('Metrics Computation - computes exact ECE, Brier score, and HCER', () => {
  // Perfect calibration: confidence 1.0, outcome 1
  const perfect = Array.from({ length: 10 }, (_, i) => ({
    confidence: 1.0,
    outcome: 1
  }));
  const mPerfect = computeMetricsFromDecisions(perfect);
  assert.equal(mPerfect.sampleCount, 10);
  assert.equal(mPerfect.brier_score, 0);
  assert.equal(mPerfect.ece, 0);
  assert.equal(mPerfect.high_confidence_error_rate, 0);

  // Miscalibrated: confidence 0.9, outcome 0 (error on all)
  const miscalibrated = Array.from({ length: 10 }, (_, i) => ({
    confidence: 0.9,
    outcome: 0
  }));
  const mMiscal = computeMetricsFromDecisions(miscalibrated);
  assert.equal(mMiscal.sampleCount, 10);
  assert.equal(mMiscal.brier_score, 0.81);
  assert.equal(mMiscal.high_confidence_error_rate, 1.0);
  assert.equal(mMiscal.ece, 0.9);
});

// 7. Input Validation on Metrics Computation
runTest('Metrics Computation - rejects invalid or empty decisions', () => {
  assert.throws(() => computeMetricsFromDecisions([]), /empty evaluation decisions/);
  assert.throws(() => computeMetricsFromDecisions([{ confidence: NaN, outcome: 1 }]), /Invalid non-finite/);
  assert.throws(() => computeMetricsFromDecisions([{ confidence: 1.5, outcome: 1 }]), /out-of-bounds/);
  assert.throws(() => computeMetricsFromDecisions([{ confidence: -0.1, outcome: 0 }]), /out-of-bounds/);
});

// 8. Gate Evaluation - Canonical Conforming Baseline
runTest('Gate Evaluation - bare execution evaluates conforming baseline and passes', () => {
  const result = evaluateCalibrationGate();
  assert.equal(result.passed, true, 'Default gate evaluation must pass');
  assert.equal(result.exitCode, 0, 'Exit code must be 0');
  assert.equal(result.violations.length, 0, 'Must have zero violations');
  assert.ok(result.metrics.ece <= 0.0400, 'ECE must pass SLA');
  assert.ok(result.metrics.brier_score <= 0.0800, 'Brier must pass SLA');
  assert.ok(result.metrics.high_confidence_error_rate <= 0.0100, 'HCER must pass SLA');
});

// 9. Gate Evaluation - Direct In-Memory Metrics Object Passing
runTest('Gate Evaluation - evaluates conforming in-memory metrics object', () => {
  const conformingMetrics = {
    metrics: {
      ece: 0.0250,
      brier_score: 0.0510,
      high_confidence_error_rate: 0.0050,
      sampleCount: 500
    }
  };
  const result = evaluateCalibrationGate(conformingMetrics);
  assert.equal(result.passed, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.violations.length, 0);
});

// 10. Gate Evaluation - Rejection of ECE Breach
runTest('Gate Evaluation - rejects ECE breach (> 0.0400)', () => {
  const breachECE = {
    metrics: {
      ece: 0.0520,
      brier_score: 0.0500,
      high_confidence_error_rate: 0.0050,
      sampleCount: 500
    }
  };
  const result = evaluateCalibrationGate(breachECE);
  assert.equal(result.passed, false, 'Gate must fail on ECE breach');
  assert.equal(result.exitCode, 1, 'Exit code must be 1 on ECE breach');
  assert.ok(result.violations.some(v => v.includes('ECE ceiling SLA violation')), 'Violation message must identify ECE breach');
});

// 11. Gate Evaluation - Rejection of Brier Score Breach
runTest('Gate Evaluation - rejects Brier score breach (> 0.0800)', () => {
  const breachBrier = {
    metrics: {
      ece: 0.0300,
      brier_score: 0.0950,
      high_confidence_error_rate: 0.0050,
      sampleCount: 500
    }
  };
  const result = evaluateCalibrationGate(breachBrier);
  assert.equal(result.passed, false, 'Gate must fail on Brier breach');
  assert.equal(result.exitCode, 1, 'Exit code must be 1 on Brier breach');
  assert.ok(result.violations.some(v => v.includes('Brier ceiling SLA violation')), 'Violation message must identify Brier breach');
});

// 12. Gate Evaluation - Rejection of HCER Breach
runTest('Gate Evaluation - rejects HCER breach (> 0.0100)', () => {
  const breachHCER = {
    metrics: {
      ece: 0.0300,
      brier_score: 0.0500,
      high_confidence_error_rate: 0.0250,
      sampleCount: 500
    }
  };
  const result = evaluateCalibrationGate(breachHCER);
  assert.equal(result.passed, false, 'Gate must fail on HCER breach');
  assert.equal(result.exitCode, 1, 'Exit code must be 1 on HCER breach');
  assert.ok(result.violations.some(v => v.includes('HCER ceiling SLA violation')), 'Violation message must identify HCER breach');
});

// 13. Gate Evaluation - Rejection of Routing Policy Violation
runTest('Gate Evaluation - rejects unverified high-risk decision routed to proceed', () => {
  const suiteWithViolation = {
    metrics: {
      ece: 0.0200,
      brier_score: 0.0400,
      high_confidence_error_rate: 0.0000,
      sampleCount: 100
    },
    routing_cases: [
      { id: 'unsafe_tx_99', risk: 'high', evidence: 'unverified', action: 'proceed' }
    ]
  };
  const result = evaluateCalibrationGate(suiteWithViolation);
  assert.equal(result.passed, false, 'Gate must fail on routing policy violation');
  assert.equal(result.exitCode, 1, 'Exit code must be 1 on routing violation');
  assert.ok(result.violations.some(v => v.includes('Critical security routing invariant violation')), 'Must report routing violation');
});

// 14. Gate Evaluation - Non-existent file and malformed JSON
runTest('Gate Evaluation - handles non-existent file and malformed JSON cleanly', () => {
  const missingResult = evaluateCalibrationGate('non/existent/path/artifact.json');
  assert.equal(missingResult.passed, false);
  assert.equal(missingResult.exitCode, 1);
  assert.ok(missingResult.error.includes('Artifact file not found'));

  const tmpMalformed = path.resolve(REPO_ROOT, 'artifacts/eval/tmp_malformed.json');
  fs.mkdirSync(path.dirname(tmpMalformed), { recursive: true });
  fs.writeFileSync(tmpMalformed, '{ invalid json content !!!', 'utf8');

  try {
    const malformedResult = evaluateCalibrationGate(tmpMalformed);
    assert.equal(malformedResult.passed, false);
    assert.equal(malformedResult.exitCode, 1);
    assert.ok(malformedResult.error.includes('Malformed JSON artifact'));
  } finally {
    fs.rmSync(tmpMalformed, { force: true });
  }
});

// 15. Subprocess Execution - CLI contract
runTest('Subprocess CLI - verifies exit codes 0 and 1 via node child_process', () => {
  // A. --help exits 0
  const helpProc = spawnSync('node', [SCRIPT_PATH, '--help'], { encoding: 'utf8' });
  assert.equal(helpProc.status, 0, '--help must exit 0');
  assert.ok(helpProc.stdout.includes('Usage: node scripts/ci/ci-calibration-gate.mjs'), 'Help output must show usage manual');

  // B. Bare run exits 0 (conforming baseline)
  const bareProc = spawnSync('node', [SCRIPT_PATH], { encoding: 'utf8' });
  assert.equal(bareProc.status, 0, 'Bare runner must exit 0');
  assert.ok(bareProc.stdout.includes('100% GREEN'), 'Output must confirm 100% GREEN');

  // C. --strict bare run exits 0
  const strictProc = spawnSync('node', [SCRIPT_PATH, '--strict'], { encoding: 'utf8' });
  assert.equal(strictProc.status, 0, '--strict on conforming data must exit 0');

  // D. Target failing scorecard exits 1
  const failProc = spawnSync('node', [SCRIPT_PATH, '-a', 'artifacts/eval/calibration_scorecard.json'], {
    encoding: 'utf8'
  });
  assert.equal(failProc.status, 1, 'Failing scorecard must exit 1');
  assert.ok(failProc.stderr.includes('BREACH DETECTED') || failProc.stdout.includes('BREACH DETECTED'), 'Must report breach detected');

  // E. Unknown flag exits 1
  const unknownProc = spawnSync('node', [SCRIPT_PATH, '--non-existent-option'], { encoding: 'utf8' });
  assert.equal(unknownProc.status, 1, 'Unknown option must exit 1');
});

// 16. Report Generation and Schema Conformance
runTest('Report Generation - exports structured JSON report matching schema', () => {
  const tmpReport = path.resolve(REPO_ROOT, 'artifacts/eval/tmp_test_report.json');
  try {
    const reportProc = spawnSync('node', [SCRIPT_PATH, '--report', tmpReport], { encoding: 'utf8' });
    assert.equal(reportProc.status, 0, 'Report run must exit 0');
    assert.ok(fs.existsSync(tmpReport), 'Report file must be created');

    const report = JSON.parse(fs.readFileSync(tmpReport, 'utf8'));
    assert.equal(report.schema_version, 1, 'Report schema_version must be 1');
    assert.equal(report.status, 'PASS', 'Report status must be PASS');
    assert.equal(report.exit_code, 0, 'Report exit_code must be 0');
    assert.ok(report.generated_at, 'Report must contain generated_at timestamp');
    assert.ok(report.source_revision, 'Report must contain source_revision');
    assert.equal(typeof report.sla_thresholds, 'object');
    assert.ok(Array.isArray(report.checks));
    assert.equal(report.checks.length, 4, 'Must contain 4 SLA checks');
  } finally {
    fs.rmSync(tmpReport, { force: true });
  }
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`🎉 ALL ${passedTests}/${totalTests} CI CALIBRATION GATE TESTS PASSED SUCCESSFULLY!`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');

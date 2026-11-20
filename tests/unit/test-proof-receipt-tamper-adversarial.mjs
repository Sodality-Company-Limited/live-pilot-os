import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

/**
 * Helper to execute proof-receipt-validator CLI synchronously.
 * Returns { status, stdout, stderr }.
 */
function runValidatorCli(targetArg) {
  const scriptPath = path.resolve(process.cwd(), 'scripts/harness/proof-receipt-validator.mjs');
  return spawnSync(process.execPath, [scriptPath, targetArg], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env
  });
}

/**
 * Helper to run a test scenario with a temporary mutated receipt file.
 * Automatically cleans up the temporary directory on completion.
 */
function withTempReceipt(receiptObj, testFn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-receipt-tamper-test-'));
  const tmpFile = path.join(tmpDir, 'tampered-receipt.json');
  try {
    const content = typeof receiptObj === 'string' ? receiptObj : JSON.stringify(receiptObj, null, 2);
    fs.writeFileSync(tmpFile, content, 'utf8');
    testFn(tmpFile, receiptObj);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('Wave 1 (G-PROOF-001) Adversarial Proof Receipt Tamper Challenge Suite', () => {
  const genuineReceiptPath = path.resolve(process.cwd(), 'docs/07-backlog/evidence/G-PROOF-001-proof-receipt.json');
  const genuineReceipt = JSON.parse(fs.readFileSync(genuineReceiptPath, 'utf8'));

  // ══════════════════════════════════════════════════════════════════════════
  // BASELINE: Untampered Receipt Verification
  // ══════════════════════════════════════════════════════════════════════════
  describe('Baseline: Untampered Genuine Receipt Verification', () => {
    it('baseline-1: untampered receipt validates cleanly via in-memory and file API (exit code 0 equivalence)', () => {
      const fileResult = validateProofReceipt(genuineReceiptPath);
      assert.equal(fileResult.valid, true, `File validation must succeed: ${fileResult.errors.join('; ')}`);
      assert.equal(fileResult.errors.length, 0);

      const memResult = validateProofReceipt(genuineReceipt);
      assert.equal(memResult.valid, true, `In-memory validation must succeed: ${memResult.errors.join('; ')}`);
      assert.equal(memResult.errors.length, 0);
    });

    it('baseline-2: untampered receipt validates cleanly via CLI using goal ID (exits 0)', () => {
      const proc = runValidatorCli('G-PROOF-001');
      assert.equal(proc.status, 0, `CLI must exit 0 on genuine goal ID, got ${proc.status}. stderr: ${proc.stderr}`);
      assert.match(proc.stdout, /✅ Proof Receipt Validated/);
      assert.match(proc.stdout, /Goal: G-PROOF-001/);
      assert.match(proc.stdout, /Classification: executable_invariant/);
    });

    it('baseline-3: untampered receipt validates cleanly via CLI using file path (exits 0)', () => {
      const proc = runValidatorCli(genuineReceiptPath);
      assert.equal(proc.status, 0, `CLI must exit 0 on genuine receipt file path. stderr: ${proc.stderr}`);
      assert.match(proc.stdout, /✅ Proof Receipt Validated/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAMPER 1: 1-Byte Alteration in Recorded Source File SHA-256 Hash
  // ══════════════════════════════════════════════════════════════════════════
  describe('Tamper 1: 1-Byte Alteration in Recorded Source File SHA-256 Hash', () => {
    it('tamper-1.1: 1-byte alteration in scripts/lib/mathematical-proof-engine.mjs SHA-256 causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      const origHash = mutated.source_files[0].sha256;
      // Mutate 1 character (first nibble)
      const tamperedHash = (origHash[0] === 'a' ? 'b' : 'a') + origHash.slice(1);
      mutated.source_files[0].sha256 = tamperedHash;

      withTempReceipt(mutated, (tmpFile) => {
        // API verification
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false, 'Validation must fail closed on 1-byte hash tamper');
        assert.ok(res.errors.some(e => e.includes('SHA256 mismatch for scripts/lib/mathematical-proof-engine.mjs')));

        // CLI verification
        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1, 'CLI must exit code 1 on tampered hash');
        assert.match(proc.stderr, /❌ Proof Receipt Validation Failed/);
        assert.match(proc.stderr, /SHA256 mismatch for scripts\/lib\/mathematical-proof-engine\.mjs/);
      });
    });

    it('tamper-1.2: 1-byte alteration in scripts/harness/mathematical-invariant-proof-harness.mjs SHA-256 causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      const origHash = mutated.source_files[1].sha256;
      // Mutate last character
      const tamperedHash = origHash.slice(0, -1) + (origHash.slice(-1) === 'f' ? 'e' : 'f');
      mutated.source_files[1].sha256 = tamperedHash;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('SHA256 mismatch for scripts/harness/mathematical-invariant-proof-harness.mjs')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /SHA256 mismatch for scripts\/harness\/mathematical-invariant-proof-harness\.mjs/);
      });
    });

    it('tamper-1.3: 1-byte alteration in scripts/harness/proof-receipt-validator.mjs SHA-256 causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      const origHash = mutated.source_files[2].sha256;
      // Mutate middle character
      const midIdx = Math.floor(origHash.length / 2);
      const tamperedHash = origHash.slice(0, midIdx) + (origHash[midIdx] === '0' ? '1' : '0') + origHash.slice(midIdx + 1);
      mutated.source_files[2].sha256 = tamperedHash;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('SHA256 mismatch for scripts/harness/proof-receipt-validator.mjs')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /SHA256 mismatch for scripts\/harness\/proof-receipt-validator\.mjs/);
      });
    });

    it('tamper-1.4: altered source file path to non-existent file causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.source_files.push({
        path: 'scripts/non-existent-subsystem.mjs',
        sha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      });

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Referenced source file missing: scripts/non-existent-subsystem.mjs')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Referenced source file missing/);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAMPER 2: Invalid Classification String
  // ══════════════════════════════════════════════════════════════════════════
  describe('Tamper 2: Invalid Classification String', () => {
    it('tamper-2.1: invalid arbitrary classification string causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.classification = 'bogus_claim';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Invalid classification: "bogus_claim"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Invalid classification: "bogus_claim"/);
      });
    });

    it('tamper-2.2: empty string classification causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.classification = '';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Invalid classification: ""')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Invalid classification: ""/);
      });
    });

    it('tamper-2.3: invalid pseudo-classification "unit_test" causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.classification = 'unit_test';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Invalid classification: "unit_test"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Invalid classification: "unit_test"/);
      });
    });

    it('tamper-2.4: classification "formal_proof" claiming unit test suites triggers hard downgrade rejection (exit 1)', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.classification = 'formal_proof';
      mutated.invariants[0].verification_command = 'node --test tests/unit/test-mathematical-proof-engine.mjs';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Unit/integration test suites cannot be classified as "formal_proof"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Unit\/integration test suites cannot be classified as "formal_proof"/);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAMPER 3: Changed Verification Command or Exit Code
  // ══════════════════════════════════════════════════════════════════════════
  describe('Tamper 3: Changed Verification Command or Exit Code', () => {
    it('tamper-3.1: invariant exit_code changed from 0 to 1 causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.invariants[0].exit_code = 1;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('exit_code is 1 (expected 0)')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /exit_code is 1 \(expected 0\)/);
      });
    });

    it('tamper-3.2: invariant exit_code changed to arbitrary non-zero (137 SIGKILL) causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.invariants[0].exit_code = 137;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('exit_code is 137 (expected 0)')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /exit_code is 137 \(expected 0\)/);
      });
    });

    it('tamper-3.3: invariant passed flag set to false causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.invariants[0].passed = false;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('passed flag is not true (failed or skipped proofs are invalid)')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /passed flag is not true/);
      });
    });

    it('tamper-3.4: missing or empty verification_command causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.invariants[0].verification_command;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('missing verification_command')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /missing verification_command/);
      });
    });

    it('tamper-3.5: empty invariants array causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.invariants = [];

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('must contain a non-empty "invariants" array')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /must contain a non-empty "invariants" array/);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAMPER 4: Corrupted Certification Value ("FAIL" or "UNKNOWN")
  // ══════════════════════════════════════════════════════════════════════════
  describe('Tamper 4: Corrupted Certification Value', () => {
    it('tamper-4.1: certification value "FAIL" causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.certification = 'FAIL';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Proof receipt certification must be "PASS", got "FAIL"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Proof receipt certification must be "PASS", got "FAIL"/);
      });
    });

    it('tamper-4.2: certification value "UNKNOWN" causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.certification = 'UNKNOWN';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Proof receipt certification must be "PASS", got "UNKNOWN"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Proof receipt certification must be "PASS", got "UNKNOWN"/);
      });
    });

    it('tamper-4.3: certification value "pass" (lowercase) causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.certification = 'pass';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Proof receipt certification must be "PASS", got "pass"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Proof receipt certification must be "PASS", got "pass"/);
      });
    });

    it('tamper-4.4: certification value "SKIPPED" causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      mutated.certification = 'SKIPPED';

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Proof receipt certification must be "PASS", got "SKIPPED"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Proof receipt certification must be "PASS", got "SKIPPED"/);
      });
    });

    it('tamper-4.5: missing certification causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.certification;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Proof receipt certification must be "PASS"')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Proof receipt certification must be "PASS"/);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAMPER 5: Missing Required Fields
  // ══════════════════════════════════════════════════════════════════════════
  describe('Tamper 5: Missing Required Fields', () => {
    it('tamper-5.1: missing or invalid schema_version causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.schema_version;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Missing or invalid schema_version')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Missing or invalid schema_version/);
      });

      const wrongVersion = JSON.parse(JSON.stringify(genuineReceipt));
      wrongVersion.schema_version = 2;
      withTempReceipt(wrongVersion, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('got 2 (expected 1)')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /got 2 \(expected 1\)/);
      });
    });

    it('tamper-5.2: missing or non-string goal_id causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.goal_id;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Missing or non-string goal_id in proof receipt')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Missing or non-string goal_id/);
      });
    });

    it('tamper-5.3: missing or non-string source_revision causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.source_revision;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Missing or invalid source_revision commit SHA')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Missing or invalid source_revision commit SHA/);
      });
    });

    it('tamper-5.4: missing invariant id causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.invariants[0].id;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('missing id')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /missing id/);
      });
    });

    it('tamper-5.5: missing invariant statement causes fail-closed exit 1', () => {
      const mutated = JSON.parse(JSON.stringify(genuineReceipt));
      delete mutated.invariants[0].statement;

      withTempReceipt(mutated, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('missing statement')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /missing statement/);
      });
    });

    it('tamper-5.6: malformed JSON format in receipt file causes fail-closed exit 1', () => {
      const corruptJson = '{ "schema_version": 1, "goal_id": "G-PROOF-001", UNTERMINATED_SYNTAX...';

      withTempReceipt(corruptJson, (tmpFile) => {
        const res = validateProofReceipt(tmpFile);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Malformed proof receipt JSON')));

        const proc = runValidatorCli(tmpFile);
        assert.equal(proc.status, 1);
        assert.match(proc.stderr, /Malformed proof receipt JSON/);
      });
    });
  });
});

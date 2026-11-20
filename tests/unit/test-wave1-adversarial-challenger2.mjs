/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS ADVERSARIAL CHALLENGER SUITE — WAVE 1 (G-WEB-001, G-WEB-002, G-WEB-003)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: Challenger 2 (Empirical Adversary)
 * Target Goals: G-WEB-001, G-WEB-002, G-WEB-003
 * Scope:
 *   1. AST Token Guardrail Scanner vs Adversarial Hex Injections & Evasions
 *   2. 5-State Behavior Matrix Completeness Across Workspace Components
 *   3. Proof Receipt Cryptographic Structure & Tamper Resilience
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

import { scanFile } from '../../scripts/harness/token-guardrail-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Adversarial Challenge Suite — Wave 1 (Challenger 2)', () => {
  const rootDir = process.cwd();

  // ════════════════════════════════════════════════════════════════════════════
  // 1. AST TOKEN GUARDRAIL SCANNER STRESS TESTS & RAW HEX INJECTION VECTORS
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. AST Token Guardrail Scanner vs Adversarial Hex Injections', () => {
    const tempDir = path.join(rootDir, 'artifacts/challenger2_hex_tests');

    function createFixture(fileName, code) {
      fs.mkdirSync(tempDir, { recursive: true });
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, code, 'utf8');
      return filePath;
    }

    function cleanup() {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    it('1.1 Baseline True Positive: Simple inline hex color is caught', () => {
      const file = createFixture('test_standard_hex.tsx', 'export const C = () => <div className="color:#ff0000">Test</div>;');
      try {
        const violations = scanFile(file);
        assert.ok(violations.length >= 1, 'Standard inline hex must be detected');
        assert.equal(violations[0].rule, 'raw-hex-color');
      } finally {
        cleanup();
      }
    });

    it('1.2 Evasion Vector: Comment appended on same line bypasses scanFile (Finding 1)', () => {
      // The scanner checks `!line.includes("//")`. Any inline comment completely disables hex check!
      const file = createFixture('test_comment_evasion.tsx', 'export const C = () => <div className="text-[#e11d48]" /> // note\n');
      try {
        const violations = scanFile(file);
        // EMPIRICAL OBSERVATION: violations.length === 0 demonstrates the evasion vulnerability!
        const isBypassed = violations.length === 0;
        assert.ok(isBypassed, 'Empirical test proves comment evasion vulnerability exists');
      } finally {
        cleanup();
      }
    });

    it('1.3 Evasion Vector: Multiline JSX style prop formatting bypasses scanFile (Finding 2)', () => {
      // The scanner does line-by-line regex. Splitting style={{ and '#hex' over lines bypasses scanner!
      const code = [
        'export const Multiline = () => (',
        '  <div',
        '    style={{',
        '      color:',
        '        "#2563eb"',
        '    }}',
        '  >',
        '    Content',
        '  </div>',
        ');'
      ].join('\n');
      const file = createFixture('test_multiline_evasion.tsx', code);
      try {
        const violations = scanFile(file);
        const isBypassed = violations.length === 0;
        assert.ok(isBypassed, 'Empirical test proves multiline formatting bypasses line-by-line scanner');
      } finally {
        cleanup();
      }
    });

    it('1.4 Evasion Vector: SVG fill and stroke attributes bypass scanFile (Finding 3)', () => {
      // SVG attributes fill="#10b981" and stroke="#047857" do not include 'className=', 'style=', 'color:', 'background:'
      const code = 'export const Icon = () => <svg><circle fill="#10b981" stroke="#047857" /></svg>;\n';
      const file = createFixture('test_svg_evasion.tsx', code);
      try {
        const violations = scanFile(file);
        const isBypassed = violations.length === 0;
        assert.ok(isBypassed, 'Empirical test proves SVG color attributes bypass scanner');
      } finally {
        cleanup();
      }
    });

    it('1.5 Evasion Vector: CamelCase style object borderColor bypasses scanFile (Finding 4)', () => {
      // "borderColor:" has capital C, so line.includes("color:") is FALSE!
      const code = 'export const styles = { borderColor: "#ef4444" };\n';
      const file = createFixture('test_camel_case_evasion.tsx', code);
      try {
        const violations = scanFile(file);
        const isBypassed = violations.length === 0;
        assert.ok(isBypassed, 'Empirical test proves camelCase style object properties bypass scanner');
      } finally {
        cleanup();
      }
    });

    it('1.6 Evasion Vector: Component file path containing "token" skips scanner entirely (Finding 5)', () => {
      // scanFile checks: `if (!filePath.includes('token') && !filePath.includes('design-tokens'))`
      // A component named token_selector.tsx has filePath containing 'token', so raw hex check is bypassed!
      const code = 'export const TokenSelector = () => <div className="color:#dc2626">Bypass</div>;\n';
      const file = createFixture('token_selector.tsx', code);
      try {
        const violations = scanFile(file);
        const isBypassed = violations.length === 0;
        assert.ok(isBypassed, 'Empirical test proves any filename containing "token" is excluded from hex checks');
      } finally {
        cleanup();
      }
    });

    it('1.7 Verification: Current production files in code/ are free of raw hex despite scanner limitations', () => {
      // Despite scanner flaws on adversarial inputs, verify whether actual production components comply
      const prodFiles = [
        'code/src/components/CommandRail.tsx',
        'code/src/components/DecisionCanvas.tsx',
        'code/src/components/EvidencePanel.tsx',
        'code/src/components/fixtures/workspaceFixtures.ts'
      ];
      for (const rel of prodFiles) {
        const full = path.join(rootDir, rel);
        const text = fs.readFileSync(full, 'utf8');
        // Rigorous independent regex check matching ANY hex color literal
        const hexMatches = text.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        // Only allow SHA-256 comments or color documentation if any
        const unapprovedHex = hexMatches.filter(h => h.length === 4 || h.length === 7 || h.length === 9);
        assert.equal(
          unapprovedHex.length,
          0,
          `Production file ${rel} must contain zero raw hex colors, found: ${unapprovedHex.join(', ')}`
        );
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. 5-STATE MATRIX COMPLETENESS ACROSS CORE WORKSPACE COMPONENTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. 5-State Matrix Completeness Across CommandRail, DecisionCanvas, EvidencePanel', () => {
    const states = ['empty', 'loading', 'partial', 'full', 'error'];
    const fixturesPath = path.join(rootDir, 'code/src/components/fixtures/workspaceFixtures.ts');

    it('2.1 Matrix Completeness: All 3 components have all 5 states declared in workspaceFixtures.ts', () => {
      const content = fs.readFileSync(fixturesPath, 'utf8');

      // Check CommandRail fixtures
      assert.ok(content.includes('commandRailFixtures: Record<'), 'Must export typed commandRailFixtures');
      for (const st of states) {
        assert.ok(content.includes(`${st}:`), `Fixtures must declare state '${st}'`);
      }

      // Check DecisionCanvas fixtures
      assert.ok(content.includes('decisionCanvasFixtures: Record<'), 'Must export typed decisionCanvasFixtures');

      // Check EvidencePanel fixtures
      assert.ok(content.includes('evidencePanelFixtures: Record<'), 'Must export typed evidencePanelFixtures');
    });

    it('2.2 Error State Contract: Deterministic error codes and actionable retry callbacks in fixtures', () => {
      const content = fs.readFileSync(fixturesPath, 'utf8');

      // Deterministic error codes
      assert.ok(content.includes("errorCode: 'ERR_SOCKET_TIMEOUT'"), 'CommandRail must declare ERR_SOCKET_TIMEOUT');
      assert.ok(content.includes("errorCode: 'ERR_DAVE_TOKEN_VIOLATION'"), 'DecisionCanvas must declare ERR_DAVE_TOKEN_VIOLATION');
      assert.ok(content.includes("errorCode: 'ERR_REF_INTEGRITY'"), 'EvidencePanel must declare ERR_REF_INTEGRITY');

      // Actionable retry callbacks
      assert.ok(content.includes('onRetryConnection'), 'CommandRail must provide onRetryConnection trigger');
      assert.ok(content.includes('onRetryFailedDecision'), 'DecisionCanvas must provide onRetryFailedDecision trigger');
      assert.ok(content.includes('onRetryLedgerSync'), 'EvidencePanel must provide onRetryLedgerSync trigger');
    });

    it('2.3 Layout Reservation & Zero CLS: All components declare skeleton and height constraints', () => {
      const crContent = fs.readFileSync(path.join(rootDir, 'code/src/components/CommandRail.tsx'), 'utf8');
      const dcContent = fs.readFileSync(path.join(rootDir, 'code/src/components/DecisionCanvas.tsx'), 'utf8');
      const epContent = fs.readFileSync(path.join(rootDir, 'code/src/components/EvidencePanel.tsx'), 'utf8');

      // CommandRail fixed header height
      assert.ok(crContent.includes('--layout-header-height, 64px'), 'CommandRail must enforce 64px header height constraint');
      assert.ok(crContent.includes('shimmer'), 'CommandRail must use shimmer animation during loading');

      // DecisionCanvas layout reservation
      assert.ok(dcContent.includes("minHeight: '608px'"), 'DecisionCanvas must reserve 608px during loading for Zero CLS');
      assert.ok(dcContent.includes('shimmer'), 'DecisionCanvas must use shimmer animation during loading');

      // EvidencePanel layout reservation
      assert.ok(epContent.includes("aspectRatio: '16/10'"), 'EvidencePanel must reserve 16:10 aspect ratio preview');
      assert.ok(epContent.includes('shimmer'), 'EvidencePanel must use shimmer animation during loading');
    });

    it('2.4 Architectural Finding: Component hardcodes simulation literals in partial/loading states (Finding 6)', () => {
      const dcContent = fs.readFileSync(path.join(rootDir, 'code/src/components/DecisionCanvas.tsx'), 'utf8');
      const epContent = fs.readFileSync(path.join(rootDir, 'code/src/components/EvidencePanel.tsx'), 'utf8');

      // In DecisionCanvas.tsx: "tokens received: 142" is hardcoded in line 547
      const hasHardcodedTokens = dcContent.includes('tokens received: 142');
      assert.ok(hasHardcodedTokens, 'Empirical observation: DecisionCanvas hardcodes "(tokens received: 142)"');

      // In EvidencePanel.tsx: "Hashing 5,940 bytes" is hardcoded in line 356
      const hasHardcodedBytes = epContent.includes('5,940 bytes');
      assert.ok(hasHardcodedBytes, 'Empirical observation: EvidencePanel hardcodes "5,940 bytes" in loading copy');

      // In EvidencePanel.tsx: "Metrics Compiling (18/20 episodes processed)..." is hardcoded in line 513
      const hasHardcodedEpisodes = epContent.includes('18/20 episodes');
      assert.ok(hasHardcodedEpisodes, 'Empirical observation: EvidencePanel hardcodes "18/20 episodes" in partial state copy');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. CRYPTOGRAPHIC STRUCTURE OF PROOF RECEIPTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Proof Receipts Cryptographic Structure & Tamper Resilience', () => {
    const receipts = [
      { goal: 'G-WEB-001', path: 'docs/07-backlog/evidence/G-WEB-001-proof-receipt.json' },
      { goal: 'G-WEB-002', path: 'docs/07-backlog/evidence/G-WEB-002-proof-receipt.json' },
      { goal: 'G-WEB-003', path: 'docs/07-backlog/evidence/G-WEB-003-proof-receipt.json' }
    ];

    it('3.1 Schema & Certification: All Wave 1 receipts satisfy official proof validator', () => {
      for (const item of receipts) {
        const fullPath = path.join(rootDir, item.path);
        assert.ok(fs.existsSync(fullPath), `Receipt file must exist: ${item.path}`);

        const result = validateProofReceipt(fullPath);
        assert.equal(result.valid, true, `Receipt for ${item.goal} must be valid: ${result.errors.join('; ')}`);
        assert.equal(result.receipt.schema_version, 1);
        assert.equal(result.receipt.classification, 'executable_invariant');
        assert.equal(result.receipt.certification, 'PASS');
        assert.equal(result.receipt.invariants[0].passed, true);
        assert.equal(result.receipt.invariants[0].exit_code, 0);
      }
    });

    it('3.2 Cryptographic Byte-Level Verification: All declared source_files match active disk SHA-256 digests', () => {
      for (const item of receipts) {
        const fullPath = path.join(rootDir, item.path);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        assert.ok(Array.isArray(data.source_files), `${item.goal} must declare source_files array`);
        assert.ok(data.source_files.length >= 3, `${item.goal} must declare at least 3 source files`);

        for (const fileEntry of data.source_files) {
          let resolvedPath = path.join(rootDir, fileEntry.path);
          if (!fs.existsSync(resolvedPath) && fileEntry.path.includes('/goals/') && !fileEntry.path.includes('/_archived/')) {
            resolvedPath = path.join(rootDir, fileEntry.path.replace('/goals/', '/goals/_archived/'));
          }

          assert.ok(fs.existsSync(resolvedPath), `Declared source file must physically exist: ${fileEntry.path}`);
          const fileBytes = fs.readFileSync(resolvedPath);
          const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

          assert.equal(
            computedHash,
            fileEntry.sha256,
            `SHA-256 digest for ${fileEntry.path} in ${item.goal} must match physical disk bytes verbatim`
          );
        }
      }
    });

    it('3.3 Git Revision Grounding: source_revision in receipts matches active git commit', () => {
      let headRev = '';
      try {
        headRev = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
      } catch (e) {
        headRev = 'UNKNOWN';
      }

      for (const item of receipts) {
        const fullPath = path.join(rootDir, item.path);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        assert.equal(
          data.source_revision,
          headRev,
          `Receipt source_revision for ${item.goal} must match current git commit HEAD (${headRev})`
        );
      }
    });

    it('3.4 Tampering Resilience Oracle: Mutating any byte in receipt or file triggers validation rejection', () => {
      const receiptPath = path.join(rootDir, 'docs/07-backlog/evidence/G-WEB-001-proof-receipt.json');
      const validReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));

      // Test A: Mutating certification to "FAIL"
      const tamperedCert = { ...validReceipt, certification: 'FAIL' };
      const resCert = validateProofReceipt(tamperedCert);
      assert.equal(resCert.valid, false, 'Validator must reject non-PASS certification');

      // Test B: Mutating source file hash
      const tamperedHash = {
        ...validReceipt,
        source_files: validReceipt.source_files.map((sf, idx) =>
          idx === 0 ? { ...sf, sha256: '0000000000000000000000000000000000000000000000000000000000000000' } : sf
        )
      };
      const resHash = validateProofReceipt(tamperedHash);
      assert.equal(resHash.valid, false, 'Validator must reject tampered SHA-256 digest');
      assert.ok(resHash.errors.some(e => e.includes('SHA256 mismatch')), 'Error must mention SHA256 mismatch');

      // Test C: Illegal classification downgrade
      const tamperedClass = { ...validReceipt, classification: 'unverified_guess' };
      const resClass = validateProofReceipt(tamperedClass);
      assert.equal(resClass.valid, false, 'Validator must reject invalid classification');

      // Test D: Failed invariant flag
      const tamperedInv = {
        ...validReceipt,
        invariants: [{ ...validReceipt.invariants[0], passed: false }]
      };
      const resInv = validateProofReceipt(tamperedInv);
      assert.equal(resInv.valid, false, 'Validator must reject passed=false invariant');
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  scanFile,
  validateTokenDeclaration,
  emitProofReceipt,
  REQUIRED_TOKEN_SCALES
} from '../../scripts/harness/token-guardrail-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Token Guardrail & Theme Contract Unit Test Suite (G-WEB-002)', () => {
  const blueprintPath = path.join(process.cwd(), 'docs/03-architecture/design-tokens.md');
  const cssPath = path.join(process.cwd(), 'code/src/tokens/index.css');

  it('1. should verify physical existence and content of design-tokens.md', () => {
    assert.ok(fs.existsSync(blueprintPath), `Blueprint must exist at ${blueprintPath}`);
    const content = fs.readFileSync(blueprintPath, 'utf8');
    assert.ok(content.length > 500, 'Blueprint must contain substantial specification');
    assert.ok(content.includes('G-WEB-002'), 'Blueprint must reference G-WEB-002');
    assert.ok(content.includes('DAVE-UX-0002'), 'Blueprint must reference DAVE decision');
    assert.ok(content.includes('REF-0001'), 'Blueprint must reference authoritative visual reference');
  });

  it('2. should verify physical existence and valid parsing of code/src/tokens/index.css', () => {
    assert.ok(fs.existsSync(cssPath), `CSS stylesheet must exist at ${cssPath}`);
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.includes(':root'), 'CSS stylesheet must define :root');
    assert.ok(css.includes('[data-theme="dark"]'), 'CSS stylesheet must define [data-theme="dark"]');
    assert.ok(css.includes('[data-theme="light"]'), 'CSS stylesheet must define [data-theme="light"]');
    assert.ok(css.includes('--space-2: 0.5rem'), 'CSS stylesheet must define 8px base spacing');
    assert.ok(css.includes('--font-sans'), 'CSS stylesheet must define sans font family');
    assert.ok(css.includes('--font-mono'), 'CSS stylesheet must define mono font family');
  });

  it('3. should validate complete coverage of required token scales via validateTokenDeclaration', () => {
    const result = validateTokenDeclaration(process.cwd());
    assert.equal(result.valid, true, `validateTokenDeclaration must pass: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0, 'No scale errors should be reported');
  });

  it('4. should confirm all 5 token categories exist in REQUIRED_TOKEN_SCALES', () => {
    const categories = Object.keys(REQUIRED_TOKEN_SCALES);
    assert.ok(categories.includes('spacing'));
    assert.ok(categories.includes('colors'));
    assert.ok(categories.includes('typography'));
    assert.ok(categories.includes('elevation'));
    assert.ok(categories.includes('radii'));
  });

  it('5. should report zero violations when scanning code/src/tokens/index.css', () => {
    const violations = scanFile(cssPath);
    assert.equal(violations.length, 0, 'Tokens definition file itself must produce zero violations');
  });

  it('6. should detect and reject raw hex colors in component code', () => {
    const tempFile = path.join(process.cwd(), 'artifacts/temp_test_violation_hex.jsx');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    try {
      fs.writeFileSync(tempFile, 'export const Bad = () => <div className="color:#ff0033">Fail</div>;\n', 'utf8');
      const v = scanFile(tempFile);
      assert.ok(v.length >= 1, 'Must detect raw hex violation');
      assert.equal(v[0].rule, 'raw-hex-color');
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  it('7. should detect and reject arbitrary Tailwind bracketed spacing (e.g. mt-[37px])', () => {
    const tempFile = path.join(process.cwd(), 'artifacts/temp_test_violation_spacing.jsx');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    try {
      fs.writeFileSync(tempFile, 'export const BadSpacing = () => <div className="mt-[37px] p-[13px]">Fail</div>;\n', 'utf8');
      const v = scanFile(tempFile);
      assert.ok(v.length >= 1, 'Must detect arbitrary bracketed spacing');
      assert.equal(v[0].rule, 'arbitrary-bracket-spacing');
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  it('8. should detect and reject raw inline style hex attributes', () => {
    const tempFile = path.join(process.cwd(), 'artifacts/temp_test_violation_inline.jsx');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    try {
      fs.writeFileSync(tempFile, 'export const BadInline = () => <div style={{ color: "#123456" }}>Fail</div>;\n', 'utf8');
      const v = scanFile(tempFile);
      assert.ok(v.length >= 1, 'Must detect inline style hex violation');
      assert.ok(v.some(item => item.rule === 'inline-style-hex'), 'Must include inline-style-hex violation rule');
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  it('9. should emit valid cryptographic proof receipt passing validateProofReceipt', () => {
    const { proofPath, evidencePath, receipt } = emitProofReceipt(process.cwd());
    assert.ok(fs.existsSync(proofPath), `Proof receipt must exist at ${proofPath}`);
    assert.ok(fs.existsSync(evidencePath), `Evidence receipt must exist at ${evidencePath}`);
    assert.equal(receipt.goal_id, 'G-WEB-002');
    assert.equal(receipt.certification, 'PASS');
    assert.equal(receipt.invariants[0].passed, true);
    assert.equal(receipt.invariants[0].exit_code, 0);

    const valResult = validateProofReceipt(proofPath);
    assert.equal(valResult.valid, true, `Proof receipt must be valid: ${valResult.errors?.join(', ')}`);
  });
});

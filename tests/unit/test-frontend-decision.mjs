import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  validateDaveDecision,
  verifyImplementationGatekeeper
} from '../../scripts/lib/dave-engine.mjs';
import { scanFile } from '../../scripts/harness/token-guardrail-harness.mjs';

describe('Frontend Implementation Decision & WorkspaceLayout Unit Test Suite (G-WEB-004)', () => {
  const decisionDocPath = path.join(process.cwd(), 'docs/03-architecture/frontend-decision-G-WEB-004.md');
  const layoutComponentPath = path.join(process.cwd(), 'code/src/components/layout/WorkspaceLayout.tsx');
  const auditLedgerPath = path.join(process.cwd(), '.agents/audit/decisions.jsonl');
  const decisionJsonPath = path.join(process.cwd(), 'docs/05-decisions/DAVE-FE-0001.json');

  it('1. should verify physical existence and content of frontend-decision-G-WEB-004.md', () => {
    assert.ok(fs.existsSync(decisionDocPath), `Architecture decision doc must exist at ${decisionDocPath}`);
    const content = fs.readFileSync(decisionDocPath, 'utf8');
    assert.ok(content.length > 1000, 'Decision doc must contain substantive specifications');
    assert.ok(content.includes('G-WEB-004'), 'Doc must reference G-WEB-004');
    assert.ok(content.includes('DAVE-FE-0001'), 'Doc must reference DAVE decision DAVE-FE-0001');
    assert.ok(content.includes('REF-0001'), 'Doc must cite reference REF-0001');
  });

  it('2. should verify DOM Hierarchy and semantic landmarks in frontend-decision-G-WEB-004.md', () => {
    const content = fs.readFileSync(decisionDocPath, 'utf8');
    assert.ok(content.includes('header'), 'Doc must specify header landmark');
    assert.ok(content.includes('role="banner"'), 'Doc must specify banner role');
    assert.ok(content.includes('main'), 'Doc must specify main landmark');
    assert.ok(content.includes('role="main"'), 'Doc must specify main role');
    assert.ok(content.includes('aside'), 'Doc must specify aside landmark');
    assert.ok(content.includes('role="complementary"'), 'Doc must specify complementary role');
    assert.ok(content.includes('role="dialog"'), 'Doc must specify dialog role for review modal');
  });

  it('3. should verify CSS Grid and Zero CLS layout strategy specifications', () => {
    const content = fs.readFileSync(decisionDocPath, 'utf8');
    assert.ok(content.includes('grid-template-columns') || content.includes('CSS Grid'), 'Doc must detail CSS Grid layout');
    assert.ok(content.includes('Zero CLS') || content.includes('CLS = 0') || content.includes('Cumulative Layout Shift'), 'Doc must guarantee Zero CLS');
    assert.ok(content.includes('64px'), 'Doc must specify fixed 64px header/command rail');
    assert.ok(content.includes('360px') || content.includes('380px'), 'Doc must specify evidence panel / drawer width');
  });

  it('4. should verify responsive breakpoints (1440px desktop, 1024px tablet, 390px mobile)', () => {
    const content = fs.readFileSync(decisionDocPath, 'utf8');
    assert.ok(content.includes('1440'), 'Doc must cover 1440px desktop breakpoint');
    assert.ok(content.includes('1024'), 'Doc must cover 1024px tablet breakpoint');
    assert.ok(content.includes('390'), 'Doc must cover 390px mobile breakpoint');
  });

  it('5. should verify physical existence and React component architecture of WorkspaceLayout.tsx', () => {
    assert.ok(fs.existsSync(layoutComponentPath), `WorkspaceLayout component must exist at ${layoutComponentPath}`);
    const code = fs.readFileSync(layoutComponentPath, 'utf8');
    assert.ok(code.includes('WorkspaceLayout'), 'Component must export WorkspaceLayout');
    assert.ok(code.includes('role="banner"'), 'Component must render banner role');
    assert.ok(code.includes('role="main"'), 'Component must render main role');
    assert.ok(code.includes('role="complementary"'), 'Component must render complementary role');
    assert.ok(code.includes('interface WorkspaceLayoutProps') || code.includes('type WorkspaceLayoutProps'), 'Component must export TypeScript props interface');
  });

  it('6. should verify zero raw hex colors and zero arbitrary spacing in WorkspaceLayout.tsx', () => {
    const violations = scanFile(layoutComponentPath);
    assert.equal(violations.length, 0, `WorkspaceLayout.tsx must have zero token violations: ${JSON.stringify(violations)}`);
  });

  it('7. should validate DAVE-FE-0001 typed decision record schema via validateDaveDecision', () => {
    assert.ok(fs.existsSync(decisionJsonPath), `Decision JSON must exist at ${decisionJsonPath}`);
    const decision = JSON.parse(fs.readFileSync(decisionJsonPath, 'utf8'));
    assert.equal(decision.decision_id, 'DAVE-FE-0001');
    assert.equal(decision.decision_type, 'frontend_implementation');
    assert.equal(decision.goal_id, 'G-WEB-004');
    assert.equal(decision.confidence, 0.94);
    assert.equal(decision.risk, 'medium');
    assert.equal(decision.human_action, 'approve');

    const result = validateDaveDecision(decision);
    assert.equal(result.valid, true, `DAVE-FE-0001 decision must be valid: ${result.errors.join(', ')}`);
  });

  it('8. should verify DAVE-FE-0001 is recorded in .agents/audit/decisions.jsonl', () => {
    assert.ok(fs.existsSync(auditLedgerPath), `Audit ledger must exist at ${auditLedgerPath}`);
    const lines = fs.readFileSync(auditLedgerPath, 'utf8').split('\n').filter(Boolean);
    const records = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    const match = records.find(r => r.decision_id === 'DAVE-FE-0001');
    assert.ok(match, 'DAVE-FE-0001 must exist in decisions.jsonl');
    assert.equal(match.goal_id, 'G-WEB-004');
    assert.equal(match.confidence, 0.94);
    assert.equal(match.decision_type, 'frontend_implementation');
  });

  it('9. should verify verifyImplementationGatekeeper operational logic and fail-closed security', () => {
    // Missing arguments must fail closed
    const missingUx = verifyImplementationGatekeeper({ goalId: 'G-WEB-001', daveFrontend: 'DAVE-FE-0001', approvedRef: 'REF-0001' });
    assert.equal(missingUx.unlocked, false);
    assert.ok(missingUx.errors.some(e => e.includes('--dave-ux')));

    const missingFe = verifyImplementationGatekeeper({ goalId: 'G-WEB-001', daveUx: 'DAVE-UX-0001', approvedRef: 'REF-0001' });
    assert.equal(missingFe.unlocked, false);
    assert.ok(missingFe.errors.some(e => e.includes('--dave-frontend')));

    const missingRef = verifyImplementationGatekeeper({ goalId: 'G-WEB-001', daveUx: 'DAVE-UX-0001', daveFrontend: 'DAVE-FE-0001' });
    assert.equal(missingRef.unlocked, false);
    assert.ok(missingRef.errors.some(e => e.includes('--approved-reference')));

    // Valid arguments must unlock execution
    const valid = verifyImplementationGatekeeper({
      goalId: 'G-WEB-001',
      daveUx: 'DAVE-UX-0001',
      daveFrontend: 'DAVE-FE-0001',
      approvedRef: 'REF-0001'
    });
    assert.equal(valid.unlocked, true);
    assert.equal(valid.errors.length, 0);
  });

  it('10. should verify CLI implementation gatekeeper unlocks execution cleanly with exit code 0', () => {
    const cmd = 'node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001';
    const output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
    assert.ok(output.includes('ALL GOVERNANCE GATES SATISFIED'), 'CLI must output governance gates satisfied');
    assert.ok(output.includes('Implementation unlocked'), 'CLI must unlock implementation');
  });
});

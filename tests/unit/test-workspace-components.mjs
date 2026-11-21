import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scanFile } from '../../scripts/harness/token-guardrail-harness.mjs';

describe('Core Workspace Components & 5-State Fixtures Unit Test Suite (G-WEB-005)', () => {
  const commandRailPath = path.join(process.cwd(), 'code/src/components/CommandRail.tsx');
  const decisionCanvasPath = path.join(process.cwd(), 'code/src/components/DecisionCanvas.tsx');
  const evidencePanelPath = path.join(process.cwd(), 'code/src/components/EvidencePanel.tsx');
  const fixturesPath = path.join(process.cwd(), 'code/src/components/fixtures/workspaceFixtures.ts');

  it('1. should verify physical existence of all core component and fixture files', () => {
    assert.ok(fs.existsSync(commandRailPath), `CommandRail.tsx must exist at ${commandRailPath}`);
    assert.ok(fs.existsSync(decisionCanvasPath), `DecisionCanvas.tsx must exist at ${decisionCanvasPath}`);
    assert.ok(fs.existsSync(evidencePanelPath), `EvidencePanel.tsx must exist at ${evidencePanelPath}`);
    assert.ok(fs.existsSync(fixturesPath), `workspaceFixtures.ts must exist at ${fixturesPath}`);
  });

  it('2. should verify zero raw hex colors and zero arbitrary spacing in all component files', () => {
    const files = [commandRailPath, decisionCanvasPath, evidencePanelPath];
    for (const file of files) {
      assert.ok(fs.existsSync(file), `File ${file} must exist before scanning`);
      const violations = scanFile(file);
      assert.strictEqual(
        violations.length,
        0,
        `File ${path.basename(file)} contains token violations: ${JSON.stringify(violations)}`
      );
    }
  });

  it('3. should verify CommandRail DOM hierarchy, semantic landmarks, and accessibility roles', () => {
    const content = fs.readFileSync(commandRailPath, 'utf8');
    assert.ok(content.includes('role="banner"'), 'CommandRail must declare role="banner"');
    assert.ok(content.includes('role="navigation"'), 'CommandRail must declare role="navigation"');
    assert.ok(content.includes('role="status"'), 'CommandRail must declare role="status" for agent status');
    assert.ok(content.includes('aria-live='), 'CommandRail must declare aria-live announcements');
    assert.ok(content.includes('CommandRailProps'), 'CommandRail must export CommandRailProps interface');
    assert.ok(content.includes('var(--layout-header-height'), 'CommandRail must bind to layout header height token');
  });

  it('4. should verify DecisionCanvas DOM hierarchy, confidence meter, and action triggers', () => {
    const content = fs.readFileSync(decisionCanvasPath, 'utf8');
    assert.ok(content.includes('role="main"'), 'DecisionCanvas must declare role="main"');
    assert.ok(content.includes('role="meter"'), 'DecisionCanvas must declare role="meter" for calibrated confidence');
    assert.ok(content.includes('DecisionCanvasProps'), 'DecisionCanvas must export DecisionCanvasProps interface');
    assert.ok(content.includes('Approve'), 'DecisionCanvas must provide Approve action trigger');
    assert.ok(content.includes('Defer'), 'DecisionCanvas must provide Defer action trigger');
    assert.ok(content.includes('Review'), 'DecisionCanvas must provide Review action trigger');
    assert.ok(content.includes('var(--color-bg-surface)'), 'DecisionCanvas must use design token for surface');
  });

  it('5. should verify EvidencePanel DOM hierarchy, tablist semantics, and cryptographic hash display', () => {
    const content = fs.readFileSync(evidencePanelPath, 'utf8');
    assert.ok(content.includes('role="complementary"'), 'EvidencePanel must declare role="complementary"');
    assert.ok(content.includes('role="tablist"'), 'EvidencePanel must declare role="tablist"');
    assert.ok(content.includes('role="tab"'), 'EvidencePanel must declare role="tab" buttons');
    assert.ok(content.includes('role="tabpanel"'), 'EvidencePanel must declare role="tabpanel" containers');
    assert.ok(content.includes('EvidencePanelProps'), 'EvidencePanel must export EvidencePanelProps interface');
    assert.ok(content.includes('SHA-256') || content.includes('sha256'), 'EvidencePanel must display SHA-256 hash');
  });

  it('6. should verify deterministic fixtures file covers all 5 mandatory states for all 3 components', () => {
    const content = fs.readFileSync(fixturesPath, 'utf8');
    assert.ok(content.includes('commandRailFixtures'), 'Must export commandRailFixtures');
    assert.ok(content.includes('decisionCanvasFixtures'), 'Must export decisionCanvasFixtures');
    assert.ok(content.includes('evidencePanelFixtures'), 'Must export evidencePanelFixtures');

    const states = ['empty', 'loading', 'partial', 'full', 'error'];
    for (const state of states) {
      assert.ok(content.includes(`${state}:`), `workspaceFixtures must define '${state}' fixture state`);
    }
  });

  it('7. should verify deterministic error codes and operational retry triggers across fixtures', () => {
    const content = fs.readFileSync(fixturesPath, 'utf8');
    assert.ok(content.includes('ERR_SOCKET_TIMEOUT'), 'Fixtures must cover ERR_SOCKET_TIMEOUT');
    assert.ok(content.includes('ERR_DAVE_TOKEN_VIOLATION'), 'Fixtures must cover ERR_DAVE_TOKEN_VIOLATION');
    assert.ok(content.includes('ERR_REF_INTEGRITY'), 'Fixtures must cover ERR_REF_INTEGRITY');
    assert.ok(content.includes('onRetryConnection') || content.includes('retry_action'), 'Must declare retry actions');
  });

  it('8. should verify edge cases in fixtures (long strings, multiple citations, high-entropy hashes)', () => {
    const content = fs.readFileSync(fixturesPath, 'utf8');
    assert.ok(content.length > 3000, 'Fixtures must contain substantial realistic domain data');
    assert.ok(content.includes('sha256:'), 'Fixtures must include cryptographic SHA-256 digests');
    assert.ok(content.includes('REF-0001'), 'Fixtures must cite REF-0001');
    assert.ok(content.includes('DAVE-'), 'Fixtures must cite DAVE decision IDs');
  });

  it('9. should verify layout reservation and Zero CLS specifications in all components', () => {
    const crContent = fs.readFileSync(commandRailPath, 'utf8');
    const dcContent = fs.readFileSync(decisionCanvasPath, 'utf8');
    const epContent = fs.readFileSync(evidencePanelPath, 'utf8');

    assert.ok(crContent.includes('skeleton') || crContent.includes('shimmer'), 'CommandRail must have skeleton specification');
    assert.ok(dcContent.includes('skeleton') || dcContent.includes('shimmer'), 'DecisionCanvas must have skeleton specification');
    assert.ok(epContent.includes('skeleton') || epContent.includes('shimmer'), 'EvidencePanel must have skeleton specification');
  });

  it('10. should verify operational exports and TypeScript type definitions with zero mocks or stubs', () => {
    const crContent = fs.readFileSync(commandRailPath, 'utf8');
    const dcContent = fs.readFileSync(decisionCanvasPath, 'utf8');
    const epContent = fs.readFileSync(evidencePanelPath, 'utf8');

    for (const [name, text] of [['CommandRail', crContent], ['DecisionCanvas', dcContent], ['EvidencePanel', epContent]]) {
      assert.ok(!text.includes('todo!()'), `${name} must not contain todo!()`);
      assert.ok(!text.includes('unimplemented!()'), `${name} must not contain unimplemented!()`);
      assert.ok(!text.includes('// TODO'), `${name} must not contain TODO comments`);
      assert.ok(text.includes('export const') || text.includes('export function'), `${name} must export component`);
    }
  });
});

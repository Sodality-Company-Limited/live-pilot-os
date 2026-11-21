import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateUiSpec,
  validateMarkdownDocs,
  emitProofReceipt,
  MANDATORY_COMPONENTS,
  MANDATORY_STATES
} from '../../scripts/harness/ui-spec-conformance-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('UI-Spec Conformance & 5-State Behavior Matrix Unit Test Suite (G-WEB-003)', () => {
  const inventoryPath = path.join(process.cwd(), 'docs/02-product/design/component-inventory.md');
  const statesPath = path.join(process.cwd(), 'docs/02-product/design/component-states.md');
  const specJsonPath = path.join(process.cwd(), 'docs/02-product/design/ui-spec.json');

  it('1. should verify physical existence and content of component-inventory.md', () => {
    assert.ok(fs.existsSync(inventoryPath), `Component inventory must exist at ${inventoryPath}`);
    const content = fs.readFileSync(inventoryPath, 'utf8');
    assert.ok(content.length > 500, 'Inventory must contain substantive specifications');
    assert.ok(content.includes('G-WEB-003'), 'Inventory must reference G-WEB-003');
    assert.ok(content.includes('DAVE-UX-0003'), 'Inventory must reference DAVE decision');
    assert.ok(content.includes('REF-0001'), 'Inventory must reference visual reference');
    for (const comp of MANDATORY_COMPONENTS) {
      assert.ok(content.includes(comp), `Inventory must document component '${comp}'`);
    }
  });

  it('2. should verify physical existence and content of component-states.md', () => {
    assert.ok(fs.existsSync(statesPath), `Component states document must exist at ${statesPath}`);
    const content = fs.readFileSync(statesPath, 'utf8');
    assert.ok(content.length > 500, 'States document must contain substantive specifications');
    for (const comp of MANDATORY_COMPONENTS) {
      assert.ok(content.includes(comp), `States document must cover component '${comp}'`);
    }
    for (const stateName of ['Empty', 'Loading', 'Partial', 'Full', 'Error']) {
      assert.ok(content.includes(stateName), `States document must cover state '${stateName}'`);
    }
    assert.ok(content.includes('ERR_'), 'States document must specify deterministic error codes');
    assert.ok(content.includes('Retry'), 'States document must specify retry triggers');
  });

  it('3. should verify physical existence and valid parsing of ui-spec.json', () => {
    assert.ok(fs.existsSync(specJsonPath), `UI spec JSON must exist at ${specJsonPath}`);
    const raw = fs.readFileSync(specJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.goal_id, 'G-WEB-003');
    assert.equal(parsed.spec_id, 'SPEC-DAVE-WORKSPACE-V1');
    assert.ok(Array.isArray(parsed.components), 'Components must be an array');
    assert.equal(parsed.components.length, 4, 'Must define exactly 4 workspace components');
  });

  it('4. should validate complete coverage of mandatory components via validateUiSpec', () => {
    const raw = fs.readFileSync(specJsonPath, 'utf8');
    const spec = JSON.parse(raw);
    const result = validateUiSpec(spec);
    assert.equal(result.valid, true, `validateUiSpec must pass: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0);
    assert.equal(result.componentCount, 4);
  });

  it('5. should confirm all 4 mandatory components exist in MANDATORY_COMPONENTS constant', () => {
    assert.deepEqual(MANDATORY_COMPONENTS, ['CommandRail', 'DecisionCanvas', 'EvidencePanel', 'ReviewModal']);
  });

  it('6. should confirm all 5 states exist in MANDATORY_STATES constant', () => {
    assert.deepEqual(MANDATORY_STATES, ['empty', 'loading', 'partial', 'full', 'error']);
  });

  it('7. should validate markdown documentation files via validateMarkdownDocs', () => {
    const docResult = validateMarkdownDocs(process.cwd());
    assert.equal(docResult.valid, true, `Markdown docs validation must pass: ${docResult.errors.join(', ')}`);
  });

  it('8. should detect and reject spec missing a mandatory component', () => {
    const incompleteSpec = {
      components: [
        {
          name: 'CommandRail',
          states: ['empty', 'loading', 'partial', 'full', 'error'],
          accessibility: { role: 'navigation', keyboard_focusable: true, keyboard_triggers: ['Cmd+K'] },
          visual_reference: 'REF-0001',
          skeleton: { enabled: true, layout_reservation_height: '64px' },
          error_contract: { retry_action: 'retry', microcopy: 'Deterministic error description', error_code: 'ERR_1' }
        }
      ]
    };
    const res = validateUiSpec(incompleteSpec);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Missing mandatory workspace component: 'DecisionCanvas'")));
    assert.ok(res.errors.some(e => e.includes("Missing mandatory workspace component: 'EvidencePanel'")));
    assert.ok(res.errors.some(e => e.includes("Missing mandatory workspace component: 'ReviewModal'")));
  });

  it('9. should detect and reject component missing a mandatory state', () => {
    const missingStateSpec = {
      components: MANDATORY_COMPONENTS.map(name => ({
        name,
        states: name === 'DecisionCanvas' ? ['empty', 'loading', 'full', 'error'] : ['empty', 'loading', 'partial', 'full', 'error'], // missing 'partial'
        accessibility: { role: 'main', keyboard_focusable: true, keyboard_triggers: ['j', 'k'] },
        visual_reference: 'REF-0001',
        skeleton: { enabled: true, layout_reservation_height: '480px' },
        error_contract: { retry_action: 'retry', microcopy: 'Deterministic error description', error_code: 'ERR_2' }
      }))
    };
    const res = validateUiSpec(missingStateSpec);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Component 'DecisionCanvas' is missing mandatory states: partial")));
  });

  it('10. should detect and reject component missing accessibility role', () => {
    const missingRoleSpec = {
      components: MANDATORY_COMPONENTS.map(name => ({
        name,
        states: ['empty', 'loading', 'partial', 'full', 'error'],
        accessibility: name === 'EvidencePanel' ? { keyboard_focusable: true, keyboard_triggers: ['Tab'] } : { role: 'region', keyboard_focusable: true, keyboard_triggers: ['Tab'] },
        visual_reference: 'REF-0001',
        skeleton: { enabled: true, layout_reservation_height: '360px' },
        error_contract: { retry_action: 'retry', microcopy: 'Deterministic error description', error_code: 'ERR_3' }
      }))
    };
    const res = validateUiSpec(missingRoleSpec);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Component 'EvidencePanel' is missing accessibility role declaration")));
  });

  it('11. should detect and reject component missing skeleton layout reservation', () => {
    const missingSkeletonSpec = {
      components: MANDATORY_COMPONENTS.map(name => ({
        name,
        states: ['empty', 'loading', 'partial', 'full', 'error'],
        accessibility: { role: 'dialog', keyboard_focusable: true, keyboard_triggers: ['Esc'] },
        visual_reference: 'REF-0001',
        skeleton: name === 'ReviewModal' ? { enabled: true } : { enabled: true, layout_reservation_height: '540px' }, // missing height
        error_contract: { retry_action: 'retry', microcopy: 'Deterministic error description', error_code: 'ERR_4' }
      }))
    };
    const res = validateUiSpec(missingSkeletonSpec);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Component 'ReviewModal' must declare skeleton.layout_reservation_height for zero CLS")));
  });

  it('12. should emit and cryptographically validate G-WEB-003 proof receipt', () => {
    const { proofPath, evidencePath, receipt } = emitProofReceipt(process.cwd());
    assert.ok(fs.existsSync(proofPath), `Proof receipt must exist at ${proofPath}`);
    assert.ok(fs.existsSync(evidencePath), `Evidence receipt must exist at ${evidencePath}`);
    assert.equal(receipt.goal_id, 'G-WEB-003');
    assert.equal(receipt.classification, 'executable_invariant');
    assert.equal(receipt.certification, 'PASS');
    assert.ok(receipt.source_files.length >= 4, 'Must verify at least 4 touch map files');

    const validation = validateProofReceipt(evidencePath);
    assert.equal(validation.valid, true, `Proof receipt validation must pass: ${validation.errors.join(', ')}`);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  INTERACTIVE_ELEMENTS,
  MODAL_FOCUSABLE_ELEMENTS,
  COMPONENT_INTERACTION_STATES,
  EVALUATED_COMPONENTS,
  DEFAULT_REPORT_PATH,
  traverseKeyboardNavigation,
  testComponentStateTransitions,
  verifyFocusTrapsAndAnnouncements,
  runCompleteInteractionPathSuite
} from '../../scripts/lib/interaction-path-verifier.mjs';

describe('G-WEB-015: Interaction-State and Keyboard Path Verification', () => {
  const rootDir = process.cwd();

  test('TC-WEB-015-01: Asset registries, components, and interaction states are immutable and valid', () => {
    assert.ok(Array.isArray(INTERACTIVE_ELEMENTS));
    assert.ok(INTERACTIVE_ELEMENTS.length >= 12, 'Must have at least 12 interactive elements cataloged');

    for (const elem of INTERACTIVE_ELEMENTS) {
      assert.ok(typeof elem.id === 'string' && elem.id.length > 0);
      assert.ok(typeof elem.selector === 'string' && elem.selector.length > 0);
      assert.ok(typeof elem.component === 'string' && EVALUATED_COMPONENTS.includes(elem.component));
      assert.ok(typeof elem.role === 'string');
      assert.equal(typeof elem.tabIndex, 'number');
      assert.ok(elem.tabIndex >= 0, `tabIndex must be non-negative for ${elem.id}`);
      assert.ok(elem.focusRingWidth >= 2, `focusRingWidth must be >= 2px for ${elem.id}`);
      assert.ok(elem.focusRingOffset >= 2, `focusRingOffset must be >= 2px for ${elem.id}`);
      assert.equal(elem.hasVisibleFocus, true, `hasVisibleFocus must be true for ${elem.id}`);
    }

    assert.deepEqual(COMPONENT_INTERACTION_STATES, [
      'default',
      'hover',
      'focus',
      'active',
      'loading',
      'disabled',
      'error'
    ]);

    assert.deepEqual(EVALUATED_COMPONENTS, [
      'CommandRail',
      'DecisionCanvas',
      'EvidencePanel',
      'ReviewModal'
    ]);
  });

  test('TC-WEB-015-02: traverseKeyboardNavigation verifies forward Tab traversal and 100% focus ring coverage', () => {
    const result = traverseKeyboardNavigation();

    assert.equal(result.passed, true);
    assert.equal(result.status, 'PASSED');
    assert.equal(result.total_interactive_elements, INTERACTIVE_ELEMENTS.length);
    assert.equal(result.tab_order_verified, true);
    assert.equal(result.focus_ring_coverage_ratio, 1.0);
    assert.equal(result.missing_focus_indicators, 0);
    assert.equal(result.skipped_tab_indices, 0);
    assert.equal(result.steps.length, INTERACTIVE_ELEMENTS.length);

    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      assert.equal(step.step, i + 1);
      assert.equal(step.key, 'Tab');
      assert.equal(step.active_element_id, INTERACTIVE_ELEMENTS[i].id);
      assert.equal(step.focus_visible, true);
      assert.ok(step.focus_ring_width >= 2);
    }
  });

  test('TC-WEB-015-03: traverseKeyboardNavigation verifies reverse Tab traversal (Shift+Tab)', () => {
    const result = traverseKeyboardNavigation();

    assert.equal(result.reverse_tab_order_verified, true);
    assert.equal(result.reverse_steps_count, INTERACTIVE_ELEMENTS.length);
  });

  test('TC-WEB-015-04: traverseKeyboardNavigation fails closed when focus indicator or tabIndex is invalid', () => {
    const malformedElements = [
      {
        id: 'bad-elem-1',
        component: 'CommandRail',
        selector: 'button.broken',
        role: 'button',
        tabIndex: -1, // Invalid tab index for natural order
        focusRingWidth: 1, // Under 2px ceiling
        focusRingOffset: 0,
        hasVisibleFocus: false
      }
    ];

    const result = traverseKeyboardNavigation(malformedElements);
    assert.equal(result.passed, false);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.missing_focus_indicators, 1);
    assert.equal(result.skipped_tab_indices, 1);
    assert.equal(result.focus_ring_coverage_ratio, 0.0);
  });

  test('TC-WEB-015-05: testComponentStateTransitions evaluates all 7 states across all 4 components', () => {
    const result = testComponentStateTransitions();

    assert.equal(result.passed, true);
    assert.equal(result.status, 'PASSED');
    assert.equal(result.components_tested.length, 4);
    assert.equal(result.states_tested.length, 7);
    assert.equal(result.total_transitions_evaluated, 4 * 7); // 28 transitions
    assert.equal(result.violations_count, 0);
    assert.equal(result.issues.length, 0);

    for (const transition of result.transitions) {
      assert.ok(EVALUATED_COMPONENTS.includes(transition.component));
      assert.ok(COMPONENT_INTERACTION_STATES.includes(transition.to_state));
      assert.equal(transition.styling_valid, true);
      assert.equal(transition.text_clipping, false);
      assert.equal(transition.layout_shift, 0.0000);
    }
  });

  test('TC-WEB-015-06: testComponentStateTransitions enforces zero Cumulative Layout Shift and zero clipping', () => {
    const result = testComponentStateTransitions();

    assert.equal(result.layout_shift_observed, 0.0000);
    assert.equal(result.layout_shift_ceiling, 0.0000);
    assert.equal(result.clipping_detected, false);
  });

  test('TC-WEB-015-07: verifyFocusTrapsAndAnnouncements validates modal focus containment and forward/reverse wrapping', () => {
    const result = verifyFocusTrapsAndAnnouncements();

    assert.equal(result.passed, true);
    assert.equal(result.status, 'PASSED');
    assert.deepEqual(result.modals_tested, ['ReviewModal']);
    assert.equal(result.focus_contained, true);
    assert.equal(result.forward_wrap_verified, true);
    assert.equal(result.reverse_wrap_verified, true);
    assert.equal(result.focus_escapes_detected, 0);
  });

  test('TC-WEB-015-08: verifyFocusTrapsAndAnnouncements validates Esc dismissal and trigger focus restoration', () => {
    const result = verifyFocusTrapsAndAnnouncements();

    assert.equal(result.escape_dismissal_verified, true);
    assert.equal(result.focus_restored, true);
    assert.equal(result.restoration_element, 'btn-open-review-modal');
  });

  test('TC-WEB-015-09: ARIA live regions deliver dynamic announcements with zero unannounced updates', () => {
    const result = verifyFocusTrapsAndAnnouncements();
    const live = result.aria_live_announcements;

    assert.ok(live, 'aria_live_announcements must exist');
    assert.equal(live.conformance_passed, true);
    assert.equal(live.unannounced_state_changes, 0);
    assert.ok(live.total_announcements >= 4);
    assert.ok(live.polite_announcements >= 2);
    assert.ok(live.assertive_announcements >= 1);

    for (const ann of live.announcements) {
      assert.ok(ann.region_id.length > 0);
      assert.ok(['polite', 'assertive'].includes(ann.mode));
      assert.ok(ann.message.length > 0);
      assert.equal(ann.delivered, true);
    }
  });

  test('TC-WEB-015-10: CLI subcommands execute cleanly with exit code 0 and Article I zero-mock check passes', () => {
    const cliScript = path.join(rootDir, 'scripts/lib/interaction-path-verifier.mjs');

    // 1. traverse-keyboard
    const travOutput = execSync(`node ${cliScript} traverse-keyboard`, { encoding: 'utf8' });
    assert.ok(travOutput.includes('Keyboard Traversal Results:'));
    assert.ok(travOutput.includes('Status: PASSED'));

    // 2. test-state-transitions
    const transOutput = execSync(`node ${cliScript} test-state-transitions`, { encoding: 'utf8' });
    assert.ok(transOutput.includes('Component State Transition Results:'));
    assert.ok(transOutput.includes('Status: PASSED'));

    // 3. verify-focus-traps
    const trapOutput = execSync(`node ${cliScript} verify-focus-traps`, { encoding: 'utf8' });
    assert.ok(trapOutput.includes('Focus Trap and ARIA Live Results:'));
    assert.ok(trapOutput.includes('Status: PASSED'));

    // 4. verify-all
    const allOutput = execSync(`node ${cliScript} verify-all`, { encoding: 'utf8' });
    assert.ok(allOutput.includes('Stateful Interaction Path Verification: 100% GREEN'));

    // 5. Verify artifact on disk
    const reportFile = path.join(rootDir, DEFAULT_REPORT_PATH);
    assert.ok(fs.existsSync(reportFile), `Report file must exist at ${reportFile}`);
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(report.schema_version, '1.0.0');
    assert.equal(report.goal_id, 'G-WEB-015');
    assert.equal(report.status, 'PASSED');
    assert.equal(report.certification, 'PASS');

    // 6. Article I Zero-Mock check
    const code = fs.readFileSync(cliScript, 'utf8');
    assert.ok(!code.includes('todo!()'), 'Must not contain todo!()');
    assert.ok(!code.includes('unimplemented!()'), 'Must not contain unimplemented!()');
    assert.ok(!code.includes('mockReturnValue'), 'Must not contain mockReturnValue');
    assert.ok(!code.includes('sinon.stub()'), 'Must not contain sinon.stub()');
  });
});

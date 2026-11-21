# Acceptance Contract: G-WEB-015 Interaction-State and Keyboard Path Verification

**Goal Reference:** [G-WEB-015.md](../../07-backlog/goals/G-WEB-015.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-015: Interaction-State and Keyboard Path Verification. G-WEB-015 delivers a stateful interaction verification suite that tests complete keyboard navigation loops, focus rings, modal focus traps, ARIA live announcements, and 7-state microinteraction transitions across all workspace components (`CommandRail`, `DecisionCanvas`, `EvidencePanel`, `ReviewModal`).

Keyboard navigation ensures 100% reachability of all interactive controls with high-contrast visible focus rings (outline >= 2px, offset >= 2px). Modal dialogues (`ReviewModal`) strictly trap focus with forward and reverse wrapping, and restore focus to trigger elements upon `Esc` key dismissal. The 7-state component FSM (`default` -> `hover` -> `focus` -> `active` -> `loading` -> `disabled` -> `error`) is verified to preserve visual layout fidelity with zero Cumulative Layout Shift ($\text{CLS} = 0.0000$) and zero text clipping.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Keyboard Navigation Loop Traversal and Focus Ring Inspector (AC-WEB-015-01)
```gherkin
Feature: Keyboard Navigation Loop Traversal and Focus Ring Inspector
  As a keyboard-only user or autonomous test agent
  I want sequential Tab keypresses to traverse all interactive elements with visible focus rings
  So that the application is fully operable without a mouse or pointer device.

  Scenario: Sequential Tab and Shift+Tab keypresses traverse interactive DOM nodes with visible focus
    Given an operational Soda OS environment
    When scripts/lib/interaction-path-verifier.mjs traverse-keyboard executes
    Then all interactive elements across CommandRail, DecisionCanvas, and EvidencePanel MUST be visited in natural tab order
    And every focused element MUST exhibit a visible focus indicator (outline >= 2px, outline-offset >= 2px)
    And reverse traversal via Shift+Tab MUST visit all elements in exact reverse sequence
    And skipped tab indices or missing focus indicators MUST fail closed with exit code 1
    And all checks MUST pass with exit code 0 and zero mocks.
```

### Scenario 2: Component State Transition FSM and Pseudo-Class Runner (AC-WEB-015-02)
```gherkin
Feature: Component State Transition FSM and Pseudo-Class Runner
  As a design systems architect or UI engineer
  I want component state transitions across the 7-state FSM to render with zero layout shift
  So that dynamic interactions never cause visual jarring, jitter, or text clipping.

  Scenario: All 7 component interaction states render cleanly with zero Cumulative Layout Shift
    Given an operational Soda OS environment
    When scripts/lib/interaction-path-verifier.mjs test-state-transitions executes
    Then all 4 components (CommandRail, DecisionCanvas, EvidencePanel, ReviewModal) MUST traverse 7 states:
      | default | hover | focus | active | loading | disabled | error |
    And layout shift across all transitions MUST equal exactly 0.0000 (CLS = 0)
    And text clipping MUST be false across all states
    And loading states MUST set aria-busy="true" while preserving box dimensions
    And disabled states MUST set aria-disabled="true" and disable pointer events
    And error states MUST display high-contrast error borders and aria-invalid="true"
    And all checks MUST pass with exit code 0 and zero mocks.
```

### Scenario 3: Accessibility Announcement and Focus Trap Regression Gate (AC-WEB-015-03)
```gherkin
Feature: Accessibility Announcement and Focus Trap Regression Gate
  As an assistive technology user or accessibility specialist
  I want modal dialogs to trap keyboard focus and dynamic state updates to trigger ARIA live announcements
  So that focus never escapes open overlays and screen readers are promptly informed of system changes.

  Scenario: Focus traps contain focus in open modals and ARIA live regions announce state updates
    Given an operational Soda OS environment
    When scripts/lib/interaction-path-verifier.mjs verify-focus-traps executes
    Then ReviewModal MUST contain keyboard focus preventing navigation to background page elements
    And pressing Tab on the last modal element MUST wrap focus forward to the first element
    And pressing Shift+Tab on the first modal element MUST wrap focus reverse to the last element
    And pressing Esc MUST close the modal and restore focus to the trigger element (btn-open-review-modal)
    And ARIA live regions MUST intercept and deliver polite and assertive announcements upon state transitions
    And unannounced dynamic updates MUST be 0
    And report artifact MUST be emitted to artifacts/visual/keyboard-navigation-report.json
    And all checks MUST pass with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

```bash
# 1. Run unit test suite covering keyboard traversal, focus rings, state transitions, and focus traps
node --test tests/unit/test-interaction-path-verifier.mjs

# 2. Traverse keyboard navigation loop and inspect focus rings
node scripts/lib/interaction-path-verifier.mjs traverse-keyboard

# 3. Test component state transitions across the 7-state FSM
node scripts/lib/interaction-path-verifier.mjs test-state-transitions

# 4. Verify modal focus traps and ARIA live announcements
node scripts/lib/interaction-path-verifier.mjs verify-focus-traps

# 5. Verify cryptographic proof receipt validity
node scripts/harness/proof-receipt-validator.mjs docs/07-backlog/evidence/G-WEB-015-proof-receipt.json
```

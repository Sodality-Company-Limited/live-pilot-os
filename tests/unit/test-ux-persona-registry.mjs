import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UxPersonaRegistry,
  PERSONA_TIERS,
  PERSONA_DEFINITIONS,
  DARK_PATTERNS_TAXONOMY,
  PersonaContractError
} from '../../scripts/lib/ux-persona-registry.mjs';

describe('G-UX-003: 12 Typed Agent Persona Contracts & Veto Engine Suite', () => {
  const registry = new UxPersonaRegistry();

  describe('Persona Registration & Priority Tier Structure', () => {
    it('test 1: registers exactly 12 canonical personas', () => {
      const personas = registry.listPersonas();
      assert.strictEqual(personas.length, 12);
    });

    it('test 2: assigns exactly 1 persona to Tier 1 Ethics', () => {
      const tier1 = registry.getPersonasByTier(PERSONA_TIERS.TIER_1_ETHICS);
      assert.strictEqual(tier1.length, 1);
      assert.strictEqual(tier1[0].id, 'dark_pattern_ethics_watchdog');
    });

    it('test 3: assigns exactly 3 personas to Tier 2 Universal Inclusion', () => {
      const tier2 = registry.getPersonasByTier(PERSONA_TIERS.TIER_2_INCLUSION);
      assert.strictEqual(tier2.length, 3);
      const ids = tier2.map(p => p.id);
      assert.ok(ids.includes('accessibility_auditor'));
      assert.ok(ids.includes('i18n_multilocale_stylist'));
      assert.ok(ids.includes('ergonomics_cognitive_critic'));
    });

    it('test 4: assigns exactly 5 personas to Tier 3 Foundations & Architecture', () => {
      const tier3 = registry.getPersonasByTier(PERSONA_TIERS.TIER_3_FOUNDATIONS);
      assert.strictEqual(tier3.length, 5);
      const ids = tier3.map(p => p.id);
      assert.ok(ids.includes('enterprise_info_architect'));
      assert.ok(ids.includes('design_systems_lead'));
      assert.ok(ids.includes('typography_scale_architect'));
      assert.ok(ids.includes('visual_balance_density'));
      assert.ok(ids.includes('interaction_choreographer'));
    });

    it('test 5: assigns exactly 3 personas to Tier 4 Media & Polish', () => {
      const tier4 = registry.getPersonasByTier(PERSONA_TIERS.TIER_4_POLISH);
      assert.strictEqual(tier4.length, 3);
      const ids = tier4.map(p => p.id);
      assert.ok(ids.includes('color_contrast_specialist'));
      assert.ok(ids.includes('motion_haptics_engineer'));
      assert.ok(ids.includes('microcopy_tone_specialist'));
    });

    it('test 6: throws PersonaContractError when retrieving unknown persona', () => {
      assert.throws(() => {
        registry.getPersona('unknown_persona');
      }, PersonaContractError);
    });
  });

  describe('Tier 1 Ethics: Dark-Pattern & Ethics Watchdog Veto', () => {
    it('test 7: asserts Tier 1 Veto on confirmshaming copy', () => {
      const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
        copy: 'No thanks, I hate saving money'
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.strictEqual(res.approved, false);
      assert.ok(res.dark_patterns_found.includes('confirmshaming'));
      assert.ok(res.veto_reason.includes('Tier 1 Veto'));
    });

    it('test 8: asserts Tier 1 Veto on sneak_into_basket pre-checked options', () => {
      const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
        mechanics: { pre_checked_recurring: true }
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.dark_patterns_found.includes('sneak_into_basket'));
    });

    it('test 9: asserts Tier 1 Veto on fake urgency timer', () => {
      const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
        mechanics: { fake_timer: true }
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.dark_patterns_found.includes('fake_urgency'));
    });

    it('test 10: approves clean ethical copy and mechanics', () => {
      const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
        copy: 'Cancel anytime in account settings with one click',
        mechanics: { pre_checked_recurring: false }
      });
      assert.strictEqual(res.veto_asserted, false);
      assert.strictEqual(res.approved, true);
      assert.strictEqual(res.ethical_score, 1.0);
    });
  });

  describe('Tier 2 Inclusion: Accessibility Auditor & WCAG 2.2 AAA Veto', () => {
    it('test 11: asserts Tier 2 Veto on text contrast < 7.0:1 for normal text (e.g. 4.5:1 fails AAA)', () => {
      const res = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 4.5,
        is_large_text: false
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.strictEqual(res.wcag_aaa_compliant, false);
      assert.ok(res.violations.some(v => v.includes('fails WCAG 2.2 AAA') && v.includes('7.0:1')));
    });

    it('test 12: approves text contrast >= 7.0:1 (e.g. 7.5:1)', () => {
      const res = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 7.5,
        is_large_text: false
      });
      assert.strictEqual(res.veto_asserted, false);
      assert.strictEqual(res.approved, true);
    });

    it('test 13: asserts Tier 2 Veto on keyboard navigation trap', () => {
      const res = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 8.0,
        has_keyboard_trap: true
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Keyboard navigation trap detected')));
    });

    it('test 14: asserts Tier 2 Veto on missing focus visible ring', () => {
      const res = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 8.0,
        has_focus_ring: false
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('missing visible focus ring')));
    });

    it('test 15: asserts Tier 2 Veto on touch target size < 24px', () => {
      const res = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 8.0,
        touch_target_px: 18
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Touch target size')));
    });
  });

  describe('Tier 2 Inclusion: i18n & Ergonomics Critics', () => {
    it('test 16: asserts Tier 2 Veto on hardcoded string literals without translation keys', () => {
      const res = registry.evaluateProposal('i18n_multilocale_stylist', {
        raw_strings: ['Welcome to your dashboard']
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Hardcoded user-facing string literals')));
    });

    it('test 17: asserts Tier 2 Veto on physical directional CSS properties (RTL violation)', () => {
      const res = registry.evaluateProposal('i18n_multilocale_stylist', {
        css_properties: ['margin-left', 'padding-right']
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Physical directional CSS properties')));
    });

    it('test 18: asserts Tier 2 Veto on unconfirmed destructive action without undo window', () => {
      const res = registry.evaluateProposal('ergonomics_cognitive_critic', {
        is_destructive: true,
        has_undo_window: false,
        has_confirmation_modal: false
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Irreversible destructive action')));
    });
  });

  describe('Tier 3 Foundations: IA, Design Tokens, Typography, Balance, Interaction', () => {
    it('test 19: asserts Tier 3 Veto on raw hex color literals in design systems lead', () => {
      const res = registry.evaluateProposal('design_systems_lead', {
        raw_hex_used: true
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Raw hex color literal')));
    });

    it('test 20: asserts Tier 3 Veto on horizontal overflow in visual balance density', () => {
      const res = registry.evaluateProposal('visual_balance_density', {
        max_right_px: 1500,
        viewport_width: 1440
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Horizontal overflow detected')));
    });

    it('test 21: asserts Tier 3 Veto on missing mandatory component states in interaction choreographer', () => {
      const res = registry.evaluateProposal('interaction_choreographer', {
        states_declared: ['empty', 'loading', 'full'] // missing partial and error
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Missing mandatory component state')));
    });

    it('test 22: asserts Tier 3 Veto on navigation depth > 3 in enterprise info architect', () => {
      const res = registry.evaluateProposal('enterprise_info_architect', {
        navigation_depth: 5
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('exceeds enterprise <= 3 clicks wayfinding rule')));
    });

    it('test 23: asserts Tier 3 Veto on excessive line length in typography scale architect', () => {
      const res = registry.evaluateProposal('typography_scale_architect', {
        characters_per_line: 110
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('exceeds maximum readability threshold')));
    });
  });

  describe('Tier 4 Polish: Color, Motion & Microcopy Specialists', () => {
    it('test 24: asserts Tier 4 Veto on colorblind-inaccessible palette', () => {
      const res = registry.evaluateProposal('color_contrast_specialist', {
        is_colorblind_safe: false
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('fails red-green colorblind differentiation')));
    });

    it('test 25: asserts Tier 4 Veto on animation duration > 300ms in motion engineer', () => {
      const res = registry.evaluateProposal('motion_haptics_engineer', {
        duration_ms: 600
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('exceeds maximum responsiveness budget')));
    });

    it('test 26: asserts Tier 4 Veto on developer stack trace leaked to end users in microcopy', () => {
      const res = registry.evaluateProposal('microcopy_tone_specialist', {
        copy_string: 'Fatal Error: NullPointerException at Object.<anonymous> (server.js:42)'
      });
      assert.strictEqual(res.veto_asserted, true);
      assert.ok(res.violations.some(v => v.includes('Raw developer stack trace')));
    });
  });

  describe('Registry Aggregation: evaluateAll', () => {
    it('test 27: correctly flags hasTier1Veto and hasTier2Veto across combined proposals', () => {
      const proposals = [
        {
          persona: 'dark_pattern_ethics_watchdog',
          copy: 'No thanks, I hate saving money'
        },
        {
          persona: 'accessibility_auditor',
          contrast_ratio: 4.0
        },
        {
          persona: 'design_systems_lead',
          raw_hex_used: false
        }
      ];

      const summary = registry.evaluateAll(proposals);
      assert.strictEqual(summary.allApproved, false);
      assert.strictEqual(summary.hasTier1Veto, true);
      assert.strictEqual(summary.hasTier2Veto, true);
      assert.strictEqual(summary.evaluations.length, 3);
      assert.strictEqual(summary.vetoReasons.length, 2);
    });

    it('test 28: approves clean multi-persona proposal suite', () => {
      const proposals = [
        {
          persona: 'dark_pattern_ethics_watchdog',
          copy: 'Subscribe to newsletter'
        },
        {
          persona: 'accessibility_auditor',
          contrast_ratio: 7.8,
          has_focus_ring: true,
          has_keyboard_trap: false
        },
        {
          persona: 'design_systems_lead',
          raw_hex_used: false
        }
      ];

      const summary = registry.evaluateAll(proposals);
      assert.strictEqual(summary.allApproved, true);
      assert.strictEqual(summary.hasTier1Veto, false);
      assert.strictEqual(summary.hasTier2Veto, false);
      assert.strictEqual(summary.vetoReasons.length, 0);
    });
  });
});

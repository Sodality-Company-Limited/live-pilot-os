#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UX PERSONA REGISTRY & VETO HARNESS (G-UX-003)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1)
 * Purpose: Automated verification harness asserting 100% compliance across all
 *          12 specialist agent personas, validating priority tiers, input/output
 *          contracts, and non-negotiable Tier 1 & Tier 2 veto enforcements.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import {
  UxPersonaRegistry,
  PERSONA_TIERS,
  PERSONA_DEFINITIONS
} from '../lib/ux-persona-registry.mjs';

export function runUxPersonaRegistryHarness() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🛡️ SODA OS 12 TYPED AGENT PERSONA REGISTRY & VETO HARNESS (G-UX-003)');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const registry = new UxPersonaRegistry();
  let passed = 0;
  let failed = 0;

  // 1. Structural Tier Verification
  console.log('▶ [Stage 1] Verifying 4-Tier Persona Allocation...');
  const tierExpected = {
    [PERSONA_TIERS.TIER_1_ETHICS]: 1,
    [PERSONA_TIERS.TIER_2_INCLUSION]: 3,
    [PERSONA_TIERS.TIER_3_FOUNDATIONS]: 5,
    [PERSONA_TIERS.TIER_4_POLISH]: 3
  };

  for (const [tier, expectedCount] of Object.entries(tierExpected)) {
    const list = registry.getPersonasByTier(Number(tier));
    if (list.length === expectedCount) {
      passed++;
      console.log(`  ✅ Tier ${tier} contains exactly ${expectedCount} persona(s): ${list.map(p => p.id).join(', ')}`);
    } else {
      failed++;
      console.error(`  ❌ Tier ${tier} has ${list.length} personas (expected ${expectedCount})`);
    }
  }

  // 2. Persona Dual Battery (Clean vs Adversarial) across all 12 personas
  console.log('\n▶ [Stage 2] Evaluating Clean vs Adversarial Batteries across all 12 Personas...');

  const personaTestBattery = [
    {
      id: 'dark_pattern_ethics_watchdog',
      clean: { copy: 'Opt in for updates', mechanics: { pre_checked_recurring: false } },
      adversarial: { copy: 'No thanks, I hate saving money', mechanics: {} },
      expectedAdversarialVeto: true
    },
    {
      id: 'accessibility_auditor',
      clean: { contrast_ratio: 8.5, has_focus_ring: true, has_keyboard_trap: false },
      adversarial: { contrast_ratio: 3.5, has_focus_ring: false },
      expectedAdversarialVeto: true
    },
    {
      id: 'i18n_multilocale_stylist',
      clean: { raw_strings: ['i18n.dashboard.welcome'], css_properties: ['margin-inline-start'] },
      adversarial: { raw_strings: ['Hardcoded text'], css_properties: ['margin-left'] },
      expectedAdversarialVeto: true
    },
    {
      id: 'ergonomics_cognitive_critic',
      clean: { is_destructive: true, has_undo_window: true, choices_count: 5 },
      adversarial: { is_destructive: true, has_undo_window: false, has_confirmation_modal: false },
      expectedAdversarialVeto: true
    },
    {
      id: 'enterprise_info_architect',
      clean: { navigation_depth: 2, has_circular_redirect: false, is_orphaned: false },
      adversarial: { navigation_depth: 6, has_circular_redirect: true },
      expectedAdversarialVeto: true
    },
    {
      id: 'design_systems_lead',
      clean: { raw_hex_used: false, arbitrary_tailwind_bracket: false },
      adversarial: { raw_hex_used: true, arbitrary_tailwind_bracket: true },
      expectedAdversarialVeto: true
    },
    {
      id: 'typography_scale_architect',
      clean: { characters_per_line: 65, line_height_ratio: 1.5, is_font_locked: true },
      adversarial: { characters_per_line: 120, line_height_ratio: 1.05 },
      expectedAdversarialVeto: true
    },
    {
      id: 'visual_balance_density',
      clean: { max_right_px: 1200, viewport_width: 1440, cls_score: 0.0 },
      adversarial: { max_right_px: 1600, viewport_width: 1440 },
      expectedAdversarialVeto: true
    },
    {
      id: 'interaction_choreographer',
      clean: { states_declared: ['empty', 'loading', 'partial', 'full', 'error'], has_dead_ends: false },
      adversarial: { states_declared: ['full'], has_dead_ends: true },
      expectedAdversarialVeto: true
    },
    {
      id: 'color_contrast_specialist',
      clean: { is_colorblind_safe: true, palette_harmony: 'oklch-triadic' },
      adversarial: { is_colorblind_safe: false },
      expectedAdversarialVeto: true
    },
    {
      id: 'motion_haptics_engineer',
      clean: { duration_ms: 180, fps: 60, has_reduced_motion_bypass: true },
      adversarial: { duration_ms: 750, fps: 45, has_reduced_motion_bypass: false },
      expectedAdversarialVeto: true
    },
    {
      id: 'microcopy_tone_specialist',
      clean: { copy_string: 'Unable to load profile. Please check your connection and retry.', exposes_stack_trace: false },
      adversarial: { copy_string: 'Exception: NullPointerException at server.js:104', exposes_stack_trace: true },
      expectedAdversarialVeto: true
    }
  ];

  for (const item of personaTestBattery) {
    // 1. Clean evaluation
    const cleanRes = registry.evaluateProposal(item.id, item.clean);
    if (cleanRes.approved === true && cleanRes.veto_asserted === false) {
      passed++;
      console.log(`  ✅ [${item.id}] Clean input approved (Score: ${cleanRes.ethical_score ?? cleanRes.token_compliance ?? cleanRes.wcag_aaa_compliant ?? cleanRes.approved})`);
    } else {
      failed++;
      console.error(`  ❌ [${item.id}] Clean input unexpectedly rejected: ${cleanRes.violations.join('; ')}`);
    }

    // 2. Adversarial evaluation
    const advRes = registry.evaluateProposal(item.id, item.adversarial);
    if (advRes.approved === false && advRes.veto_asserted === item.expectedAdversarialVeto) {
      passed++;
      console.log(`  ✅ [${item.id}] Adversarial violation vetoed fail-closed: ${advRes.veto_reason}`);
    } else {
      failed++;
      console.error(`  ❌ [${item.id}] Adversarial violation was not vetoed!`);
    }
  }

  // 3. Multi-Persona Combined Suite Aggregation
  console.log('\n▶ [Stage 3] Multi-Persona Suite Aggregation...');
  const combinedSuite = personaTestBattery.map(b => ({
    persona: b.id,
    ...b.clean
  }));

  const allCleanSummary = registry.evaluateAll(combinedSuite);
  if (allCleanSummary.allApproved === true && allCleanSummary.hasTier1Veto === false && allCleanSummary.hasTier2Veto === false) {
    passed++;
    console.log('  ✅ 12-persona clean suite evaluated with zero vetoes (100% consensus)');
  } else {
    failed++;
    console.error(`  ❌ Clean suite failed: ${allCleanSummary.vetoReasons.join('; ')}`);
  }

  // Inject 1 Tier 1 veto into the suite
  combinedSuite[0] = { persona: 'dark_pattern_ethics_watchdog', ...personaTestBattery[0].adversarial };
  const contaminatedSummary = registry.evaluateAll(combinedSuite);
  if (contaminatedSummary.allApproved === false && contaminatedSummary.hasTier1Veto === true) {
    passed++;
    console.log('  ✅ Contaminated suite correctly identified Tier 1 Ethics Veto fail-closed');
  } else {
    failed++;
    console.error('  ❌ Contaminated suite failed to detect Tier 1 veto');
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Persona Registry Harness Summary: ${passed} Passed, ${failed} Failed`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  return failed === 0;
}

const isDirectScript = process.argv[1] && process.argv[1].endsWith('ux-persona-registry-harness.mjs');
if (isDirectScript) {
  const success = runUxPersonaRegistryHarness();
  process.exit(success ? 0 : 1);
}

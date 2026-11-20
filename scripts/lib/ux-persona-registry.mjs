/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS 12 TYPED AGENT PERSONA CONTRACTS & VETO ENFORCEMENT ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1 / G-UX-003)
 * Purpose: Authoritative registry of all 12 specialist UX agent personas with
 *          typed input/output schemas, priority tiers, and non-negotiable veto
 *          enforcement (Dark-Pattern Tier 1 Veto, WCAG 2.2 AAA Tier 2 Veto).
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const PERSONA_TIERS = Object.freeze({
  TIER_1_ETHICS: 1,
  TIER_2_INCLUSION: 2,
  TIER_3_FOUNDATIONS: 3,
  TIER_4_POLISH: 4
});

export const DARK_PATTERNS_TAXONOMY = Object.freeze([
  'confirmshaming',
  'sneak_into_basket',
  'fake_urgency',
  'fake_countdown',
  'hidden_costs',
  'drip_pricing',
  'disguised_ads',
  'forced_continuity',
  'roach_motel',
  'privacy_zuckering',
  'misdirection',
  'price_comparison_prevention',
  'bait_and_switch',
  'social_proof_fabrication'
]);

export class PersonaContractError extends Error {
  constructor(personaId, message, violations = []) {
    super(`[Persona ${personaId}] Contract Violation: ${message}`);
    this.name = 'PersonaContractError';
    this.personaId = personaId;
    this.violations = violations;
  }
}

export class PersonaVetoAssertedError extends Error {
  constructor(personaId, tier, reason, evidence = {}) {
    super(`[Persona ${personaId} - Tier ${tier} VETO] ${reason}`);
    this.name = 'PersonaVetoAssertedError';
    this.personaId = personaId;
    this.tier = tier;
    this.reason = reason;
    this.evidence = evidence;
  }
}

/**
 * 12 Canonical Persona Definitions with Typed Evaluation Logic and Veto Enforcement.
 */
export const PERSONA_DEFINITIONS = {
  // ──────────────────────────────────────────────────────────────────────────
  // TIER 1: ETHICS, SECURITY & SOVEREIGN GOVERNANCE
  // ──────────────────────────────────────────────────────────────────────────
  dark_pattern_ethics_watchdog: {
    id: 'dark_pattern_ethics_watchdog',
    name: 'Dark-Pattern & Ethics Watchdog',
    tier: PERSONA_TIERS.TIER_1_ETHICS,
    role: 'Deceptive design detection, ethical persuasion boundaries, fail-closed consumer defense',
    inputSchema: {
      required: ['copy', 'mechanics'],
      properties: {
        copy: 'string',
        mechanics: 'object',
        pricing: 'object',
        opt_out: 'object'
      }
    },
    outputSchema: {
      required: ['ethical_score', 'dark_patterns_found', 'veto_asserted'],
      properties: {
        ethical_score: 'number',
        dark_patterns_found: 'array',
        veto_asserted: 'boolean',
        veto_reason: 'string'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const copy = (proposal.copy || proposal.proposed_value?.copy || '').toLowerCase();
      const mechanics = proposal.mechanics || proposal.proposed_value?.mechanics || {};
      const patternsFound = [];

      // Check all 14 canonical dark patterns across mechanics, top-level flags, and dark_patterns array
      for (const pattern of DARK_PATTERNS_TAXONOMY) {
        if (
          mechanics[pattern] === true ||
          proposal[pattern] === true ||
          proposal.proposed_value?.[pattern] === true ||
          (Array.isArray(proposal.dark_patterns) && proposal.dark_patterns.includes(pattern)) ||
          (Array.isArray(proposal.proposed_value?.dark_patterns) && proposal.proposed_value.dark_patterns.includes(pattern))
        ) {
          if (!patternsFound.includes(pattern)) {
            patternsFound.push(pattern);
          }
        }
      }

      // Check confirmshaming
      const confirmshamingRegex = /\b(no thanks, I hate saving money|no, I don't want to grow|no, I prefer paying full price|no thanks, I'll stay broke)\b/i;
      if (confirmshamingRegex.test(copy)) {
        if (!patternsFound.includes('confirmshaming')) {
          patternsFound.push('confirmshaming');
        }
      }

      // Check sneak into basket / pre-checked options
      if (mechanics.pre_checked_recurring === true || mechanics.pre_checked_addon === true || mechanics.opt_out_hidden === true) {
        if (!patternsFound.includes('sneak_into_basket')) {
          patternsFound.push('sneak_into_basket');
        }
      }

      // Check fake urgency / countdown
      if (mechanics.fake_timer === true || mechanics.fabricated_stock === true || /\b(only \d+ items left! buy now!|your cart will expire in 2 minutes)\b/i.test(copy)) {
        if (!patternsFound.includes('fake_urgency')) {
          patternsFound.push('fake_urgency');
        }
      }

      // Check forced continuity / roach motel
      if (mechanics.cancel_hidden === true || mechanics.phone_call_required_to_cancel === true) {
        if (!patternsFound.includes('roach_motel')) {
          patternsFound.push('roach_motel');
        }
      }

      // Check hidden costs
      if (mechanics.hidden_fee_at_final_step === true) {
        if (!patternsFound.includes('hidden_costs')) {
          patternsFound.push('hidden_costs');
        }
      }

      const vetoAsserted = patternsFound.length > 0;
      const ethicalScore = vetoAsserted ? Math.max(0.0, 1.0 - patternsFound.length * 0.4) : 1.0;

      return {
        persona: 'dark_pattern_ethics_watchdog',
        tier: PERSONA_TIERS.TIER_1_ETHICS,
        approved: !vetoAsserted,
        ethical_score: ethicalScore,
        dark_patterns_found: patternsFound,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted
          ? `Absolute Tier 1 Veto: Detected deceptive pattern(s): ${patternsFound.join(', ')}`
          : null,
        violations: patternsFound.map(p => `Deceptive design pattern: ${p}`)
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 2: UNIVERSAL INCLUSION & LEGAL COMPLIANCE
  // ──────────────────────────────────────────────────────────────────────────
  accessibility_auditor: {
    id: 'accessibility_auditor',
    name: 'Accessibility Auditor',
    tier: PERSONA_TIERS.TIER_2_INCLUSION,
    role: 'WCAG 2.2 AAA validation, 7:1 text contrast, zero keyboard traps, focus rings',
    inputSchema: {
      required: ['contrast_ratio'],
      properties: {
        contrast_ratio: 'number',
        is_large_text: 'boolean',
        has_focus_ring: 'boolean',
        has_keyboard_trap: 'boolean',
        touch_target_px: 'number'
      }
    },
    outputSchema: {
      required: ['wcag_aaa_compliant', 'veto_asserted'],
      properties: {
        wcag_aaa_compliant: 'boolean',
        contrast_ratio: 'number',
        veto_asserted: 'boolean',
        veto_reason: 'string'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const contrast = typeof p.contrast_ratio === 'number' ? p.contrast_ratio : 7.1;
      const isLarge = p.is_large_text === true;
      const hasFocusRing = p.has_focus_ring ?? true;
      const hasTrap = p.has_keyboard_trap ?? false;
      const touchTarget = typeof p.touch_target_px === 'number' ? p.touch_target_px : 44;

      const violations = [];

      // WCAG 2.2 AAA Contrast: Normal text >= 7.0:1, Large text >= 4.5:1
      const requiredContrast = isLarge ? 4.5 : 7.0;
      if (contrast < requiredContrast) {
        violations.push(`Text contrast ratio ${contrast.toFixed(2)}:1 fails WCAG 2.2 AAA requirement (${requiredContrast.toFixed(1)}:1)`);
      }

      if (hasTrap) {
        violations.push('Keyboard navigation trap detected; focus cannot escape element');
      }

      if (!hasFocusRing) {
        violations.push('Interactive control missing visible focus ring (:focus-visible)');
      }

      if (touchTarget < 24) {
        violations.push(`Touch target size ${touchTarget}px fails WCAG 2.2 minimum threshold (24px)`);
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'accessibility_auditor',
        tier: PERSONA_TIERS.TIER_2_INCLUSION,
        approved: !vetoAsserted,
        wcag_aaa_compliant: !vetoAsserted,
        contrast_ratio: contrast,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted
          ? `Absolute Tier 2 Veto: WCAG 2.2 AAA violations: ${violations.join('; ')}`
          : null,
        violations
      };
    }
  },

  i18n_multilocale_stylist: {
    id: 'i18n_multilocale_stylist',
    name: 'Internationalization & Multi-Locale Stylist',
    tier: PERSONA_TIERS.TIER_2_INCLUSION,
    role: 'Bi-directional RTL layout mirroring, CSS logical properties, typed translation keys',
    inputSchema: {
      properties: {
        raw_strings: 'array',
        css_properties: 'array',
        locales: 'array'
      }
    },
    outputSchema: {
      required: ['i18n_compliant', 'veto_asserted'],
      properties: {
        i18n_compliant: 'boolean',
        veto_asserted: 'boolean',
        veto_reason: 'string'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const rawStrings = Array.isArray(p.raw_strings) ? p.raw_strings : [];
      const cssProps = Array.isArray(p.css_properties) ? p.css_properties : [];
      const violations = [];

      // Veto hardcoded string literals
      const hardcoded = rawStrings.filter(s => typeof s === 'string' && s.trim().length > 0 && !s.startsWith('i18n.'));
      if (hardcoded.length > 0) {
        violations.push(`Hardcoded user-facing string literals detected (${hardcoded.length} items); must bind to translation catalog`);
      }

      // Veto physical directional CSS properties
      const physicalCss = ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'left', 'right'];
      const forbiddenProps = cssProps.filter(prop => physicalCss.includes(prop));
      if (forbiddenProps.length > 0) {
        violations.push(`Physical directional CSS properties used (${forbiddenProps.join(', ')}); must use CSS logical properties for RTL mirroring`);
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'i18n_multilocale_stylist',
        tier: PERSONA_TIERS.TIER_2_INCLUSION,
        approved: !vetoAsserted,
        i18n_compliant: !vetoAsserted,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 2 i18n Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  ergonomics_cognitive_critic: {
    id: 'ergonomics_cognitive_critic',
    name: 'Ergonomics & Cognitive Friction Critic',
    tier: PERSONA_TIERS.TIER_2_INCLUSION,
    role: 'Nielsen 10 usability heuristics, Hick’s Law, reversible undo windows, cognitive load bounds',
    inputSchema: {
      properties: {
        is_destructive: 'boolean',
        has_undo_window: 'boolean',
        has_confirmation_modal: 'boolean',
        choices_count: 'number'
      }
    },
    outputSchema: {
      required: ['ergonomics_score', 'veto_asserted'],
      properties: {
        ergonomics_score: 'number',
        veto_asserted: 'boolean',
        veto_reason: 'string'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const isDestructive = p.is_destructive === true;
      const hasUndo = p.has_undo_window === true;
      const hasModal = p.has_confirmation_modal === true;
      const choices = typeof p.choices_count === 'number' ? p.choices_count : 3;
      const violations = [];

      // Destructive action without undo or confirmation gate
      if (isDestructive && !hasUndo && !hasModal) {
        violations.push('Irreversible destructive action lacking both confirmation modal and undo window');
      }

      // Hick's Law cognitive overload (choices > 9)
      if (choices > 9) {
        violations.push(`High choice complexity (${choices} choices) exceeds working memory capacity (7 ± 2 items)`);
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'ergonomics_cognitive_critic',
        tier: PERSONA_TIERS.TIER_2_INCLUSION,
        approved: !vetoAsserted,
        ergonomics_score: vetoAsserted ? 0.4 : 0.95,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 2 Usability Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 3: CORE ARCHITECTURE, IA & VISUAL FOUNDATIONS
  // ──────────────────────────────────────────────────────────────────────────
  enterprise_info_architect: {
    id: 'enterprise_info_architect',
    name: 'Enterprise Information Architect',
    tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
    role: 'OOUX ORCA domain mapping, <= 3 clicks wayfinding, hierarchical breadcrumbs, Cmd+K search',
    inputSchema: {
      properties: {
        navigation_depth: 'number',
        has_circular_redirect: 'boolean',
        is_orphaned: 'boolean'
      }
    },
    outputSchema: {
      required: ['ia_valid', 'veto_asserted'],
      properties: {
        ia_valid: 'boolean',
        navigation_depth: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const depth = typeof p.navigation_depth === 'number' ? p.navigation_depth : 2;
      const circular = p.has_circular_redirect === true;
      const orphaned = p.is_orphaned === true;
      const violations = [];

      if (depth > 3) {
        violations.push(`Navigation depth of ${depth} exceeds enterprise <= 3 clicks wayfinding rule`);
      }
      if (circular) {
        violations.push('Circular navigation redirect loop detected');
      }
      if (orphaned) {
        violations.push('Orphaned route with no upstream breadcrumb or parent navigation binding');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'enterprise_info_architect',
        tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
        approved: !vetoAsserted,
        ia_valid: !vetoAsserted,
        navigation_depth: depth,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 3 IA Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  design_systems_lead: {
    id: 'design_systems_lead',
    name: 'Design Systems Lead',
    tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
    role: 'W3C DTCG token SSOT, semantic role mapping, zero raw styling literals',
    inputSchema: {
      properties: {
        raw_hex_used: 'boolean',
        arbitrary_tailwind_bracket: 'boolean',
        tokens_applied: 'object'
      }
    },
    outputSchema: {
      required: ['token_compliance', 'veto_asserted'],
      properties: {
        token_compliance: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const rawHex = p.raw_hex_used === true;
      const arbitraryTailwind = p.arbitrary_tailwind_bracket === true;
      const violations = [];

      if (rawHex) {
        violations.push('Raw hex color literal used; must bind to registered semantic design token');
      }
      if (arbitraryTailwind) {
        violations.push('Arbitrary bracketed Tailwind literal (e.g. mt-[37px]) used; must snap to design token scale');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'design_systems_lead',
        tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
        approved: !vetoAsserted,
        token_compliance: vetoAsserted ? 0.0 : 1.0,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 3 Token Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  typography_scale_architect: {
    id: 'typography_scale_architect',
    name: 'Typography & Scale Architect',
    tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
    role: 'Modular scales, line length (45-75 CPL), locked woff2 font geometries',
    inputSchema: {
      properties: {
        characters_per_line: 'number',
        line_height_ratio: 'number',
        is_font_locked: 'boolean'
      }
    },
    outputSchema: {
      required: ['typography_score', 'veto_asserted'],
      properties: {
        typography_score: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const cpl = typeof p.characters_per_line === 'number' ? p.characters_per_line : 65;
      const lineHeight = typeof p.line_height_ratio === 'number' ? p.line_height_ratio : 1.5;
      const fontLocked = p.is_font_locked ?? true;
      const violations = [];

      if (cpl > 85) {
        violations.push(`Line length ${cpl} CPL exceeds maximum readability threshold (85 CPL)`);
      }
      if (lineHeight < 1.15) {
        violations.push(`Line height ratio ${lineHeight} is too tight for legible body typography (< 1.15)`);
      }
      if (!fontLocked) {
        violations.push('Typography relies on unlocked system fonts causing variable cross-browser layout metrics');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'typography_scale_architect',
        tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
        approved: !vetoAsserted,
        typography_score: vetoAsserted ? 0.5 : 0.95,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 3 Typography Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  visual_balance_density: {
    id: 'visual_balance_density',
    name: 'Visual Balance & Density Specialist',
    tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
    role: 'Spatial geometry, zero horizontal overflow, zero Cumulative Layout Shift',
    inputSchema: {
      properties: {
        max_right_px: 'number',
        viewport_width: 'number',
        cls_score: 'number'
      }
    },
    outputSchema: {
      required: ['visual_balance_score', 'veto_asserted'],
      properties: {
        visual_balance_score: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const maxRight = typeof p.max_right_px === 'number' ? p.max_right_px : 1440;
      const vpWidth = typeof p.viewport_width === 'number' ? p.viewport_width : 1440;
      const cls = typeof p.cls_score === 'number' ? p.cls_score : 0.0;
      const violations = [];

      if (maxRight > vpWidth) {
        violations.push(`Horizontal overflow detected: element boundary ${maxRight}px exceeds viewport ${vpWidth}px`);
      }
      if (cls > 0.0) {
        violations.push(`Cumulative Layout Shift ${cls} exceeds required zero-CLS threshold`);
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'visual_balance_density',
        tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
        approved: !vetoAsserted,
        visual_balance_score: vetoAsserted ? 0.0 : 1.0,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 3 Layout Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  interaction_choreographer: {
    id: 'interaction_choreographer',
    name: 'Interaction Choreographer',
    tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
    role: '5-state matrix completeness, state machine journeys, feedback loops',
    inputSchema: {
      properties: {
        states_declared: 'array',
        has_dead_ends: 'boolean'
      }
    },
    outputSchema: {
      required: ['states_complete', 'veto_asserted'],
      properties: {
        states_complete: 'boolean',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const states = Array.isArray(p.states_declared) ? p.states_declared : ['empty', 'loading', 'partial', 'full', 'error'];
      const deadEnds = p.has_dead_ends === true;
      const mandatory = ['empty', 'loading', 'partial', 'full', 'error'];
      const missing = mandatory.filter(s => !states.includes(s));
      const violations = [];

      if (missing.length > 0) {
        violations.push(`Missing mandatory component state(s): ${missing.join(', ')}`);
      }
      if (deadEnds) {
        violations.push('User journey flow contains an unhandled state machine dead-end');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'interaction_choreographer',
        tier: PERSONA_TIERS.TIER_3_FOUNDATIONS,
        approved: !vetoAsserted,
        states_complete: !vetoAsserted,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 3 State Completeness Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 4: MEDIA, POLISH & OPTIMIZATION
  // ──────────────────────────────────────────────────────────────────────────
  color_contrast_specialist: {
    id: 'color_contrast_specialist',
    name: 'Color Theory & Contrast Specialist',
    tier: PERSONA_TIERS.TIER_4_POLISH,
    role: 'OKLCH harmonic surface scales, red-green colorblind distinguishing (Protan/Deutan)',
    inputSchema: {
      properties: {
        palette_harmony: 'string',
        is_colorblind_safe: 'boolean',
        contrast_ratio: 'number'
      }
    },
    outputSchema: {
      required: ['color_score', 'veto_asserted'],
      properties: {
        color_score: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const colorblindSafe = p.is_colorblind_safe ?? true;
      const violations = [];

      if (!colorblindSafe) {
        violations.push('Palette fails red-green colorblind differentiation; critical UI states indistinguishable');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'color_contrast_specialist',
        tier: PERSONA_TIERS.TIER_4_POLISH,
        approved: !vetoAsserted,
        color_score: vetoAsserted ? 0.3 : 0.95,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 4 Color Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  motion_haptics_engineer: {
    id: 'motion_haptics_engineer',
    name: 'Motion & Haptics Engineer',
    tier: PERSONA_TIERS.TIER_4_POLISH,
    role: 'Spring curves, 60fps frame budgets, instantaneous reduced-motion bypass',
    inputSchema: {
      properties: {
        duration_ms: 'number',
        fps: 'number',
        has_reduced_motion_bypass: 'boolean'
      }
    },
    outputSchema: {
      required: ['motion_score', 'veto_asserted'],
      properties: {
        motion_score: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const duration = typeof p.duration_ms === 'number' ? p.duration_ms : 200;
      const fps = typeof p.fps === 'number' ? p.fps : 60;
      const bypass = p.has_reduced_motion_bypass ?? true;
      const violations = [];

      if (duration > 300) {
        violations.push(`Micro-interaction duration ${duration}ms exceeds maximum responsiveness budget (300ms)`);
      }
      if (fps < 60) {
        violations.push(`Animation frame rate ${fps}fps drops below 60fps budget`);
      }
      if (!bypass) {
        violations.push('Missing zero-duration bypass under prefers-reduced-motion: reduce');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'motion_haptics_engineer',
        tier: PERSONA_TIERS.TIER_4_POLISH,
        approved: !vetoAsserted,
        motion_score: vetoAsserted ? 0.4 : 0.95,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 4 Motion Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  },

  microcopy_tone_specialist: {
    id: 'microcopy_tone_specialist',
    name: 'Micro-Copy & Tone Specialist',
    tier: PERSONA_TIERS.TIER_4_POLISH,
    role: 'Plain-English error recovery, developer jargon scrubbing, actionable recovery CTAs',
    inputSchema: {
      properties: {
        copy_string: 'string',
        has_recovery_action: 'boolean',
        exposes_stack_trace: 'boolean'
      }
    },
    outputSchema: {
      required: ['copy_score', 'veto_asserted'],
      properties: {
        copy_score: 'number',
        veto_asserted: 'boolean'
      }
    },
    evaluate(proposal = {}, context = {}) {
      const p = proposal.proposed_value || proposal;
      const stackExposed = p.exposes_stack_trace === true;
      const copy = (p.copy_string || '').toLowerCase();
      const violations = [];

      if (stackExposed || /\b(nullpointerexception|traceback|at object\.<anonymous>|syntaxerror|segmentation fault)\b/i.test(copy)) {
        violations.push('Raw developer stack trace or internal exception leaked to end-user UI');
      }

      const vetoAsserted = violations.length > 0;
      return {
        persona: 'microcopy_tone_specialist',
        tier: PERSONA_TIERS.TIER_4_POLISH,
        approved: !vetoAsserted,
        copy_score: vetoAsserted ? 0.2 : 0.95,
        veto_asserted: vetoAsserted,
        veto_reason: vetoAsserted ? `Tier 4 Microcopy Veto: ${violations.join('; ')}` : null,
        violations
      };
    }
  }
};

/**
 * Authoritative UX Persona Registry Class.
 */
export class UxPersonaRegistry {
  constructor() {
    this.personas = new Map();
    for (const [id, def] of Object.entries(PERSONA_DEFINITIONS)) {
      this.personas.set(id, def);
    }
  }

  getPersona(personaId) {
    const p = this.personas.get(personaId);
    if (!p) {
      throw new PersonaContractError(personaId, `Unrecognized persona '${personaId}'`);
    }
    return p;
  }

  listPersonas() {
    return Array.from(this.personas.values());
  }

  getPersonasByTier(tier) {
    return this.listPersonas().filter(p => p.tier === tier);
  }

  evaluateProposal(personaId, proposal, context = {}) {
    const persona = this.getPersona(personaId);
    return persona.evaluate(proposal, context);
  }

  /**
   * Evaluates a suite of proposals across all involved personas.
   *
   * @param {Array<object>} proposals - List of proposals with { persona, ... }
   * @param {object} [context={}] - Shared evaluation context
   * @returns {{ allApproved: boolean, hasTier1Veto: boolean, hasTier2Veto: boolean, evaluations: Array<object>, vetoReasons: Array<string> }}
   */
  evaluateAll(proposals = [], context = {}) {
    const evaluations = [];
    const vetoReasons = [];
    let hasTier1Veto = false;
    let hasTier2Veto = false;

    for (const prop of proposals) {
      const personaId = prop.persona;
      if (!this.personas.has(personaId)) continue;
      const evalResult = this.evaluateProposal(personaId, prop, context);
      evaluations.push(evalResult);

      if (evalResult.veto_asserted) {
        vetoReasons.push(evalResult.veto_reason);
        if (evalResult.tier === PERSONA_TIERS.TIER_1_ETHICS) {
          hasTier1Veto = true;
        } else if (evalResult.tier === PERSONA_TIERS.TIER_2_INCLUSION) {
          hasTier2Veto = true;
        }
      }
    }

    return {
      allApproved: vetoReasons.length === 0,
      hasTier1Veto,
      hasTier2Veto,
      evaluations,
      vetoReasons
    };
  }
}

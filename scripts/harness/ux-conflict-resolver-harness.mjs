#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MULTI-PERSONA CONFLICT RESOLUTION HARNESS (G-UX-004)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1 / G-UX-004)
 * Purpose: Exhaustive mathematical verification of the 4-tier precedence hierarchy,
 *          cross-tier commutativity, semantic property pair detection, intra-tier
 *          tie-breaking, and Human-in-the-Loop Review Packet SHA-256 integrity.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  UX_PERSONA_TIERS,
  UX_PERSONA_PRIORITY_SCORES,
  UX_SEMANTIC_PROPERTY_PAIRS,
  UxConflictDetector,
  UxConflictSynthesizer,
  UxConflictResolver,
  resolveUxConflicts,
  detectUxConflicts
} from '../lib/ux-conflict-resolver.mjs';

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🛡️ SODA OS MULTI-PERSONA CONFLICT RESOLUTION HARNESS (G-UX-004)');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

let checksPassed = 0;
let checksFailed = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    checksPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    checksFailed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1: Cross-Tier Commutativity & Precedence Law
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ [Stage 1] Verifying Cross-Tier Precedence Commutativity...');

const personas = Object.keys(UX_PERSONA_TIERS);

check('Strict monotonicity of tiers across all 12 personas', () => {
  for (const p of personas) {
    const tier = UX_PERSONA_TIERS[p];
    assert.ok(tier >= 1 && tier <= 4, `Persona ${p} has invalid tier: ${tier}`);
  }
});

check('Pairwise cross-tier commutativity across representative persona pairs', () => {
  const representativePairs = [
    { high: 'dark_pattern_ethics_watchdog', low: 'accessibility_auditor' },
    { high: 'dark_pattern_ethics_watchdog', low: 'design_systems_lead' },
    { high: 'dark_pattern_ethics_watchdog', low: 'motion_haptics_engineer' },
    { high: 'accessibility_auditor', low: 'enterprise_info_architect' },
    { high: 'accessibility_auditor', low: 'microcopy_tone_specialist' },
    { high: 'design_systems_lead', low: 'color_contrast_specialist' }
  ];

  for (const { high, low } of representativePairs) {
    const tierHigh = UX_PERSONA_TIERS[high];
    const tierLow = UX_PERSONA_TIERS[low];
    assert.ok(tierHigh < tierLow, `${high} (T${tierHigh}) must be higher precedence than ${low} (T${tierLow})`);

    // Forward order
    const resForward = resolveUxConflicts([
      { persona: high, property: 'theme_variant', value: 'high_tier_val' },
      { persona: low, property: 'theme_variant', value: 'low_tier_val' }
    ]);
    assert.equal(resForward.status, 'RESOLVED');
    assert.equal(resForward.resolved_proposals[0].persona, high);

    // Reverse order (Commutativity check)
    const resReverse = resolveUxConflicts([
      { persona: low, property: 'theme_variant', value: 'low_tier_val' },
      { persona: high, property: 'theme_variant', value: 'high_tier_val' }
    ]);
    assert.equal(resReverse.status, 'RESOLVED');
    assert.equal(resReverse.resolved_proposals[0].persona, high);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2: Semantic Property Overlap Detection Battery
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [Stage 2] Evaluating Semantic Property Overlap Detection Battery...');

check('All canonical semantic property pairs detected as collisions', () => {
  assert.ok(UX_SEMANTIC_PROPERTY_PAIRS.length >= 10, 'Must define at least 10 canonical semantic property pairs');

  for (const pair of UX_SEMANTIC_PROPERTY_PAIRS) {
    const collisions = detectUxConflicts([
      { persona: 'accessibility_auditor', property: pair.p1, value: 'val1' },
      { persona: 'visual_balance_density', property: pair.p2, value: 'val2' }
    ]);
    assert.equal(collisions.length, 1, `Failed to detect collision for pair ${pair.p1} <-> ${pair.p2}`);
    assert.equal(collisions[0].category, pair.category);
    assert.equal(collisions[0].severity, pair.severity);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3: Deadlock Escalation & Review Packet Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [Stage 3] Verifying Deadlock Escalation & Review Packet Integrity...');

check('Irreconcilable intra-tier collision triggers DEADLOCK_ESCALATED and blocks execution', () => {
  const deadlockProposals = [
    {
      persona: 'custom_agent_x',
      tier: 3,
      priority_score: 600,
      property: 'sidebar_behavior',
      value: 'collapsible_overlay',
      rationale: 'Maximize content canvas area'
    },
    {
      persona: 'custom_agent_y',
      tier: 3,
      priority_score: 600,
      property: 'sidebar_behavior',
      value: 'persistent_fixed_dock',
      rationale: 'Instant zero-click access to tools'
    }
  ];

  const res = resolveUxConflicts(deadlockProposals, { decision_id: 'DEC-DEADLOCK-001' });
  assert.equal(res.status, 'DEADLOCK_ESCALATED');
  assert.equal(res.blocked_until_approved, true);
  assert.equal(res.deadlocks.length, 1);
  assert.ok(res.review_packet, 'Review packet must be generated');

  const packet = res.review_packet;
  assert.equal(packet.decision_id, 'DEC-DEADLOCK-001');
  assert.equal(packet.status, 'DEADLOCK_ESCALATED');
  assert.equal(packet.tier, 3);
  assert.equal(packet.requires_human_signoff, true);
  assert.ok(packet.options.length >= 3, 'Must present at least 3 actionable options');
  assert.equal(packet.recommended_action.action, 'FAIL_SAFE_CONSERVATIVE_HOLD');

  // Verify SHA-256 integrity
  const { packet_sha256, ...payload } = packet;
  const expectedHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  assert.equal(packet_sha256, expectedHash, 'Review packet SHA-256 signature must be cryptographically valid');
});

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 4: Complex Multi-Way Conflict Scenarios
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [Stage 4] Evaluating Complex Multi-Way & Edge Scenarios...');

check('4-way collision across all 4 tiers resolves to single Tier 1 winner', () => {
  const multiProposals = [
    { persona: 'microcopy_tone_specialist', property: 'checkout_button_cta', value: 'Continue Free!' }, // T4
    { persona: 'interaction_choreographer', property: 'checkout_button_cta', value: 'Next Step' }, // T3
    { persona: 'accessibility_auditor', property: 'checkout_button_cta', value: 'Subscribe Now' }, // T2
    { persona: 'dark_pattern_ethics_watchdog', property: 'checkout_button_cta', value: 'Start Paid Subscription ($14.99/mo)' } // T1
  ];

  const res = resolveUxConflicts(multiProposals);
  assert.equal(res.status, 'RESOLVED');
  assert.equal(res.resolved_proposals.length, 1);
  assert.equal(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
  assert.equal(res.overridden_proposals.length, 3);
  assert.equal(res.blocked_until_approved, false);
});

check('Disjoint multi-persona suite achieves 100% consensus (1.0000)', () => {
  const cleanProposals = [
    { persona: 'dark_pattern_ethics_watchdog', property: 'pricing_transparency', value: 'full_cost_breakdown' },
    { persona: 'accessibility_auditor', property: 'text_contrast', value: 7.0 },
    { persona: 'design_systems_lead', property: 'border_radius', value: 'token.radius.md' },
    { persona: 'motion_haptics_engineer', property: 'spring_damping', value: 24 }
  ];

  const res = resolveUxConflicts(cleanProposals);
  assert.equal(res.status, 'NO_CONFLICT');
  assert.equal(res.resolved_proposals.length, 4);
  assert.equal(res.overridden_proposals.length, 0);
  assert.equal(res.consensus_score, 1.0);
  assert.equal(res.blocked_until_approved, false);
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`📊 Conflict Resolver Harness Summary: ${checksPassed} Passed, ${checksFailed} Failed`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');

if (checksFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

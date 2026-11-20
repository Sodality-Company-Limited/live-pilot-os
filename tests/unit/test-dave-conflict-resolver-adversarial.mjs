import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAIN_PRIORITY_TIERS,
  DOMAIN_PRIORITY_SCORES,
  DaveConflictDetector,
  DaveConflictSynthesizer,
  DaveDeadlockEscalator,
  DaveConflictResolver,
  detectDomainConflicts,
  synthesizeConflictMatrix,
  resolveConflicts,
  formatConflictReviewPacket,
  normalizeProposal
} from '../../scripts/lib/dave-conflict-resolver.mjs';

describe('DAVE Multi-Expert Conflict Resolution Adversarial & Empirical Stress Suite (G-DAVE-003)', () => {

  // =========================================================================
  // SECTION 1: EMPIRICAL 4-TIER PRIORITY HIERARCHY VERIFICATION
  // =========================================================================
  describe('1. 4-Tier Priority Hierarchy Pairwise Collisions', () => {

    it('1.1 should enforce Security (Tier 1) overriding Accessibility (Tier 2) on direct collision', () => {
      const p_sec = {
        expert_id: 'exp-sec-01',
        domain: 'security',
        property: 'auth_prompt_biometric',
        proposed_value: 'enforce_hardware_biometric',
        confidence: 0.98,
        risk: 'high',
        rationale: 'Mandatory FIDO2 WebAuthn biometric prompt per SOC2 CC6.1'
      };
      const p_a11y = {
        expert_id: 'exp-a11y-01',
        domain: 'accessibility',
        property: 'auth_prompt_biometric',
        proposed_value: 'allow_single_click_bypass',
        confidence: 0.99,
        risk: 'high',
        rationale: 'Motor impairment accommodation allowing single-click bypass'
      };

      // Test standard order [sec, a11y]
      const res1 = resolveConflicts([p_sec, p_a11y]);
      assert.equal(res1.matrix.conflicts.length, 1);
      assert.equal(res1.matrix.conflicts[0].status, 'resolved');
      assert.equal(res1.matrix.conflicts[0].winning_proposal.domain, 'security');
      assert.equal(res1.matrix.conflicts[0].winning_proposal.proposed_value, 'enforce_hardware_biometric');
      assert.equal(res1.matrix.synthesized_decisions.length, 1);
      assert.equal(res1.matrix.synthesized_decisions[0].value, 'enforce_hardware_biometric');
      assert.equal(res1.matrix.escalation.execution_permission, 'permitted');

      // Test reverse order [a11y, sec] - verify commutativity
      const res2 = resolveConflicts([p_a11y, p_sec]);
      assert.equal(res2.matrix.conflicts.length, 1);
      assert.equal(res2.matrix.conflicts[0].status, 'resolved');
      assert.equal(res2.matrix.conflicts[0].winning_proposal.domain, 'security');
      assert.equal(res2.matrix.conflicts[0].winning_proposal.proposed_value, 'enforce_hardware_biometric');
    });

    it('1.2 should enforce Accessibility (Tier 2) overriding Core Functional Domains (Tier 3) on direct collision', () => {
      const p_a11y = {
        expert_id: 'exp-a11y-02',
        domain: 'accessibility',
        property: 'min_contrast_ratio',
        proposed_value: 4.5,
        confidence: 0.99,
        risk: 'medium',
        rationale: 'WCAG 2.2 AA standard contrast'
      };
      const p_ux = {
        expert_id: 'exp-ux-02',
        domain: 'ux_ui',
        property: 'min_contrast_ratio',
        proposed_value: 2.8,
        confidence: 0.92,
        risk: 'low',
        rationale: 'Subtle atmospheric pastel styling'
      };

      const res = resolveConflicts([p_ux, p_a11y]);
      assert.equal(res.matrix.conflicts.length, 1);
      assert.equal(res.matrix.conflicts[0].status, 'resolved');
      assert.equal(res.matrix.conflicts[0].winning_proposal.domain, 'accessibility');
      assert.equal(res.matrix.conflicts[0].winning_proposal.proposed_value, 4.5);
      assert.equal(res.matrix.synthesized_decisions[0].value, 4.5);
    });

    it('1.3 should enforce Core Functional Domains (Tier 3) overriding Optimization (Tier 4) on direct collision', () => {
      const p_be = {
        expert_id: 'exp-be-03',
        domain: 'backend_api',
        property: 'payload_serialization',
        proposed_value: 'strict_protobuf_v3',
        confidence: 0.95,
        risk: 'low',
        rationale: 'Typed schemas with backwards compatibility verification'
      };
      const p_cost = {
        expert_id: 'exp-cost-03',
        domain: 'cost',
        property: 'payload_serialization',
        proposed_value: 'untyped_raw_binary',
        confidence: 0.91,
        risk: 'low',
        rationale: 'Eliminate schema parsing CPU overhead to save compute dollars'
      };

      const res = resolveConflicts([p_cost, p_be]);
      assert.equal(res.matrix.conflicts.length, 1);
      assert.equal(res.matrix.conflicts[0].status, 'resolved');
      assert.equal(res.matrix.conflicts[0].winning_proposal.domain, 'backend_api');
      assert.equal(res.matrix.conflicts[0].winning_proposal.proposed_value, 'strict_protobuf_v3');
    });

    it('1.4 should enforce Security (Tier 1) overriding Core Functional Domain (Tier 3) directly', () => {
      const p_sec = { domain: 'security', property: 'sql_driver', proposed_value: 'parameterized_prepared_statement' };
      const p_db = { domain: 'database', property: 'sql_driver', proposed_value: 'raw_string_interpolation' };

      const res = resolveConflicts([p_db, p_sec]);
      assert.equal(res.matrix.conflicts[0].winning_proposal.domain, 'security');
      assert.equal(res.matrix.synthesized_decisions[0].value, 'parameterized_prepared_statement');
    });

    it('1.5 should enforce Security (Tier 1) overriding Optimization (Tier 4) directly', () => {
      const p_sec = { domain: 'security', property: 'tls_handshake', proposed_value: 'tls_1_3_strict' };
      const p_perf = { domain: 'performance', property: 'tls_handshake', proposed_value: 'plaintext_http' };

      const res = resolveConflicts([p_perf, p_sec]);
      assert.equal(res.matrix.conflicts[0].winning_proposal.domain, 'security');
      assert.equal(res.matrix.synthesized_decisions[0].value, 'tls_1_3_strict');
    });

    it('1.6 should enforce Accessibility (Tier 2) overriding Optimization (Tier 4) directly', () => {
      const p_a11y = { domain: 'accessibility', property: 'animation_motion', proposed_value: 'reduced_motion' };
      const p_motion = { domain: 'motion', property: 'animation_motion', proposed_value: 'parallax_infinite_spring' };

      const res = resolveConflicts([p_motion, p_a11y]);
      assert.equal(res.matrix.conflicts[0].winning_proposal.domain, 'accessibility');
      assert.equal(res.matrix.synthesized_decisions[0].value, 'reduced_motion');
    });
  });

  // =========================================================================
  // SECTION 2: DEADLOCK DETECTION & CYCLICAL DEPENDENCY GRAPHS
  // =========================================================================
  describe('2. Deadlock Detection & Cyclical Mutual-Rejection Graphs', () => {

    it('2.1 should detect equal-tier collision with identical scores and confidence as deadlocked', () => {
      const p1 = {
        expert_id: 'exp-be-deadlock',
        domain: 'backend_api',
        property: 'api_architecture',
        proposed_value: 'grpc',
        confidence: 0.88,
        risk: 'medium'
      };
      const p2 = {
        expert_id: 'exp-fe-deadlock',
        domain: 'backend_api', // same domain contradiction
        property: 'api_architecture',
        proposed_value: 'rest',
        confidence: 0.88,
        risk: 'medium'
      };

      const res = resolveConflicts([p1, p2]);
      assert.equal(res.matrix.conflicts.length, 1);
      assert.equal(res.matrix.conflicts[0].status, 'deadlocked');
      assert.equal(res.matrix.deadlocks.length, 1);
      assert.equal(res.matrix.escalation.requires_human_review, true);
      assert.equal(res.matrix.escalation.route, 'human_review');
      assert.equal(res.matrix.escalation.execution_permission, 'blocked_until_approved');
    });

    it('2.2 should detect 3-node cyclical mutual-rejection dependency graphs and escalate fail-closed', () => {
      // Node A (backend_api) vs Node B (integration) on endpoint_pattern (scores: 70 vs 70 -> deadlock)
      // Node B (integration) vs Node C (game_architecture) on sync_interval (scores: 70 vs 65, conf equal -> deadlock)
      // Node C (game_architecture) vs Node A (backend_api) on state_authority (scores: 65 vs 70, conf equal -> deadlock)
      const proposals = [
        { expert_id: 'exp-node-a', domain: 'backend_api', property: 'endpoint_pattern', proposed_value: 'rpc_unary', confidence: 0.90 },
        { expert_id: 'exp-node-b', domain: 'integration', property: 'endpoint_pattern', proposed_value: 'event_stream', confidence: 0.90 },

        { expert_id: 'exp-node-b', domain: 'integration', property: 'sync_interval', proposed_value: 100, confidence: 0.90 },
        { expert_id: 'exp-node-c', domain: 'game_architecture', property: 'sync_interval', proposed_value: 16, confidence: 0.90 },

        { expert_id: 'exp-node-c', domain: 'game_architecture', property: 'state_authority', proposed_value: 'client_authoritative', confidence: 0.90 },
        { expert_id: 'exp-node-a', domain: 'backend_api', property: 'state_authority', proposed_value: 'server_authoritative', confidence: 0.90 }
      ];

      const res = resolveConflicts(proposals);
      assert.equal(res.matrix.conflicts.length, 3);
      assert.equal(res.matrix.deadlocks.length, 3, 'All 3 cycle edges must deadlock');
      assert.equal(res.matrix.escalation.requires_human_review, true);
      assert.equal(res.matrix.escalation.route, 'human_review');
      assert.equal(res.matrix.escalation.execution_permission, 'blocked_until_approved');
      assert.equal(res.matrix.synthesized_decisions.length, 0, 'Zero accepted decisions emitted for 100% deadlocked graph');

      // Verify review packet contains all 3 deadlocked properties
      const packet = res.matrix.escalation.review_packet;
      assert.ok(packet.includes('endpoint_pattern'));
      assert.ok(packet.includes('sync_interval'));
      assert.ok(packet.includes('state_authority'));
      assert.ok(packet.includes('EXECUTION PERMISSION: BLOCKED UNTIL APPROVED'));
    });

    it('2.3 should detect 5-node cyclical dependency ring with fail-closed human review packet', () => {
      // 5 domains within Tier 3 forming a circular dispute ring
      const domains = ['database', 'backend_api', 'integration', 'game_architecture', 'product'];
      const proposals = [];

      for (let i = 0; i < domains.length; i++) {
        const d1 = domains[i];
        const d2 = domains[(i + 1) % domains.length];
        const prop = `ring_property_${i}`;
        proposals.push({ expert_id: `exp-${d1}`, domain: d1, property: prop, proposed_value: `val_${d1}`, confidence: 0.85 });
        proposals.push({ expert_id: `exp-${d2}`, domain: d2, property: prop, proposed_value: `val_${d2}`, confidence: 0.85 });
      }

      const res = resolveConflicts(proposals);
      assert.equal(res.matrix.conflicts.length, 5);
      // All have equal confidence 0.85, so confidence difference is 0.00 (< 0.10) -> all 5 must deadlock!
      assert.equal(res.matrix.deadlocks.length, 5);
      assert.equal(res.matrix.escalation.route, 'human_review');
      assert.equal(res.matrix.escalation.execution_permission, 'blocked_until_approved');
      assert.equal(res.matrix.synthesized_decisions.length, 0);
    });
  });

  // =========================================================================
  // SECTION 3: MULTI-WAY COLLISION RESOLUTION & DETERMINISTIC HIERARCHY
  // =========================================================================
  describe('3. Multi-Way Collision Resolution & Deterministic Hierarchy Protection', () => {

    it('3.1 should enforce Security (Tier 1) winning 3-way collision without tier inversion', () => {
      // Setup: 3 proposals targeting the SAME property across 3 tiers:
      // Proposal 1: Security (Tier 1) -> proposed 'aes256'
      // Proposal 2: Frontend (Tier 3) -> proposed 'quick_xor'
      // Proposal 3: Cost (Tier 4) -> proposed 'none'
      const proposals = [
        { expert_id: 'exp-sec', domain: 'security', property: 'encryption', proposed_value: 'aes256', confidence: 0.99 },
        { expert_id: 'exp-fe', domain: 'frontend', property: 'encryption', proposed_value: 'quick_xor', confidence: 0.90 },
        { expert_id: 'exp-cost', domain: 'cost', property: 'encryption', proposed_value: 'none', confidence: 0.85 }
      ];

      const res = resolveConflicts(proposals);

      // Pairwise conflicts detected:
      // (sec vs fe): winner is sec
      // (sec vs cost): winner is sec
      // (fe vs cost): winner is fe
      assert.equal(res.matrix.conflicts.length, 3);
      assert.equal(res.matrix.deadlocks.length, 0);

      const synthesizedDecision = res.matrix.synthesized_decisions.find(d => d.property === 'encryption');
      assert.ok(synthesizedDecision, 'Synthesized decision was produced');

      // HARDENED BEHAVIOR VERIFIED:
      // Security (Tier 1) strictly wins and is undefeated
      assert.equal(synthesizedDecision.domain, 'security', 'Security strictly took precedence over Frontend and Cost');
      assert.equal(synthesizedDecision.value, 'aes256', 'Secure encryption value accepted');
      assert.equal(res.matrix.escalation.route, 'proceed');
      assert.equal(res.matrix.escalation.execution_permission, 'permitted');

      // The decision lists rejected alternatives from frontend and cost, but NOT security:
      assert.ok(synthesizedDecision.alternatives_rejected.some(r => r.includes('Rejected frontend value')));
      assert.ok(synthesizedDecision.alternatives_rejected.some(r => r.includes('Rejected cost value')));
      assert.ok(!synthesizedDecision.alternatives_rejected.some(r => r.includes('Rejected security value')));
    });

    it('3.2 should enforce Security (Tier 1) winning 5-way simultaneous collision across all tiers', () => {
      const proposals = [
        { expert_id: 'exp-sec', domain: 'security', property: 'rate_limit', proposed_value: 100, confidence: 0.99 },
        { expert_id: 'exp-a11y', domain: 'accessibility', property: 'rate_limit', proposed_value: 200, confidence: 0.95 },
        { expert_id: 'exp-be', domain: 'backend_api', property: 'rate_limit', proposed_value: 500, confidence: 0.90 },
        { expert_id: 'exp-fe', domain: 'frontend', property: 'rate_limit', proposed_value: 1000, confidence: 0.75 },
        { expert_id: 'exp-perf', domain: 'performance', property: 'rate_limit', proposed_value: 5000, confidence: 0.80 }
      ];

      const res = resolveConflicts(proposals);
      assert.equal(res.matrix.deadlocks.length, 0, 'Zero deadlocks in decisive 5-way hierarchy');

      const decision = res.matrix.synthesized_decisions.find(d => d.property === 'rate_limit');
      assert.ok(decision, 'Synthesized decision was produced');
      // Security (Tier 1) took precedence over Accessibility (Tier 2), Backend/Frontend (Tier 3) and Performance (Tier 4)
      assert.equal(decision.domain, 'security', 'Security strictly took precedence in 5-way collision');
      assert.equal(decision.value, 100, 'Security rate limit accepted');
      assert.equal(res.matrix.escalation.route, 'proceed');
      assert.equal(res.matrix.escalation.execution_permission, 'permitted');
    });

    it('3.3 should never emit accepted synthesized decision for deadlocked property', () => {
      // 3 proposals on timeout_ms:
      // Pair (database, frontend): db strictly dominates fe (score 75 vs 55, conf 0.95 vs 0.80) -> resolves to database
      // Pair (database, product): score 75 vs 60 (diff 15), conf 0.95 vs 0.95 (diff 0.00 < 0.10) -> deadlocks
      // Pair (frontend, product): score 55 vs 60 (diff 5 < 15) -> deadlocks
      const proposals = [
        { expert_id: 'exp-db', domain: 'database', property: 'timeout_ms', proposed_value: 1000, confidence: 0.95 },
        { expert_id: 'exp-fe', domain: 'frontend', property: 'timeout_ms', proposed_value: 3000, confidence: 0.80 },
        { expert_id: 'exp-prod', domain: 'product', property: 'timeout_ms', proposed_value: 5000, confidence: 0.95 }
      ];

      const res = resolveConflicts(proposals);
      assert.equal(res.matrix.conflicts.length, 3);
      assert.equal(res.matrix.conflicts.filter(c => c.status === 'resolved').length, 1, 'One pair resolved');
      assert.equal(res.matrix.deadlocks.length, 2, 'Two deadlocks on timeout_ms');

      // HARDENED BEHAVIOR VERIFIED:
      // Even though (db vs fe) resolved, property 'timeout_ms' has deadlocks and MUST NOT be emitted in synthesized_decisions
      const acceptedTimeout = res.matrix.synthesized_decisions.find(d => d.property === 'timeout_ms');
      assert.equal(acceptedTimeout, undefined, 'Deadlocked property must NOT be emitted in synthesized_decisions');
      assert.equal(res.matrix.synthesized_decisions.length, 0, 'Zero accepted decisions emitted when all properties are deadlocked');
      assert.equal(res.matrix.escalation.route, 'human_review');
      assert.equal(res.matrix.escalation.execution_permission, 'blocked_until_approved');
    });
  });

  // =========================================================================
  // SECTION 4: INTRA-TIER TIE-BREAKER COMMUTATIVITY & ATTRIBUTION
  // =========================================================================
  describe('4. Intra-Tier Tie-Breaker Commutativity & Accurate Attribution', () => {

    it('4.1 should preserve commutativity and fail-closed deadlock when neither proposal strictly dominates', () => {
      // Domain database: score 75, confidence 0.80
      // Domain frontend: score 55, confidence 0.95
      // |s1 - s2| = 20 >= 15. |c1 - c2| = 0.15 >= 0.10.
      // But database has higher score while frontend has higher confidence! Neither strictly dominates.
      const p_db = { domain: 'database', property: 'cache_store', proposed_value: 'postgres', confidence: 0.80 };
      const p_fe = { domain: 'frontend', property: 'cache_store', proposed_value: 'localstorage', confidence: 0.95 };

      // Case A: [p_db, p_fe]
      const resA = resolveConflicts([p_db, p_fe]);
      assert.equal(resA.matrix.conflicts[0].status, 'deadlocked');
      assert.equal(resA.matrix.deadlocks.length, 1);
      assert.equal(resA.matrix.escalation.execution_permission, 'blocked_until_approved');
      assert.equal(resA.matrix.synthesized_decisions.length, 0);

      // Case B: [p_fe, p_db] (identical proposals, reversed order)
      const resB = resolveConflicts([p_fe, p_db]);
      assert.equal(resB.matrix.conflicts[0].status, 'deadlocked');
      assert.equal(resB.matrix.deadlocks.length, 1);
      assert.equal(resB.matrix.escalation.execution_permission, 'blocked_until_approved');
      assert.equal(resB.matrix.synthesized_decisions.length, 0);

      // HARDENED BEHAVIOR VERIFIED:
      // Commutativity is preserved: both orderings result in deadlock
      assert.equal(resA.matrix.conflicts[0].status, resB.matrix.conflicts[0].status, 'Commutativity preserved: both yield deadlock');
    });

    it('4.2 should accurately format rejection rationale using winner score vs loser score when strictly dominating', () => {
      // Domain database strictly dominates frontend across both score and confidence:
      // database: score 75, confidence 0.95
      // frontend: score 55, confidence 0.80
      const p_db = { domain: 'database', property: 'cache_store', proposed_value: 'postgres', confidence: 0.95 };
      const p_fe = { domain: 'frontend', property: 'cache_store', proposed_value: 'localstorage', confidence: 0.80 };

      // Test standard order [p_db, p_fe]
      const res1 = resolveConflicts([p_db, p_fe]);
      assert.equal(res1.matrix.conflicts[0].status, 'resolved');
      assert.equal(res1.matrix.conflicts[0].winning_proposal.domain, 'database');
      const rejectionReason1 = res1.matrix.conflicts[0].rejected_proposals[0].rejection_reason;
      assert.ok(rejectionReason1.includes('Subordinated to database based on domain score (75 vs 55) and verified confidence (0.95 vs 0.80)'));

      // Test reversed order [p_fe, p_db] to verify commutativity in attribution
      const res2 = resolveConflicts([p_fe, p_db]);
      assert.equal(res2.matrix.conflicts[0].status, 'resolved');
      assert.equal(res2.matrix.conflicts[0].winning_proposal.domain, 'database');
      const rejectionReason2 = res2.matrix.conflicts[0].rejected_proposals[0].rejection_reason;
      assert.ok(rejectionReason2.includes('Subordinated to database based on domain score (75 vs 55) and verified confidence (0.95 vs 0.80)'));
    });
  });

  // =========================================================================
  // SECTION 5: BOUNDARY, EDGE CASE & SECURITY INTEGRITY STRESS TESTING
  // =========================================================================
  describe('5. Boundary Conditions, Edge Cases & Security Gating', () => {

    it('5.1 should handle empty proposals array gracefully without throwing', () => {
      const res = resolveConflicts([]);
      assert.equal(res.matrix.conflicts.length, 0);
      assert.equal(res.matrix.synthesized_decisions.length, 0);
      assert.equal(res.matrix.deadlocks.length, 0);
      assert.equal(res.matrix.escalation.requires_human_review, false);
      assert.equal(res.matrix.escalation.route, 'proceed');
      assert.equal(res.matrix.escalation.execution_permission, 'permitted');
    });

    it('5.2 should handle single proposal without spurious conflict detection', () => {
      const res = resolveConflicts([
        { domain: 'security', property: 'mfa_enabled', proposed_value: true }
      ]);
      assert.equal(res.matrix.conflicts.length, 0);
      assert.equal(res.matrix.synthesized_decisions.length, 1);
      assert.equal(res.matrix.synthesized_decisions[0].value, true);
      assert.equal(res.matrix.escalation.route, 'proceed');
    });

    it('5.3 should default unregistered/unknown domain to Tier 4 and prevent privilege escalation over Tier 4', () => {
      // Unknown domain defaults to Tier 4 (DOMAIN_PRIORITY_TIERS[domain] ?? 4)
      // Therefore, an unauthenticated plugin is assigned Tier 4, equal to performance (Tier 4).
      // With equal confidence, it deadlocks fail-closed rather than usurping.
      const p_untrusted = { domain: 'untrusted_malicious_plugin', property: 'compression', proposed_value: 'disabled' };
      const p_perf = { domain: 'performance', property: 'compression', proposed_value: 'zstd_level_9' };

      const res = resolveConflicts([p_untrusted, p_perf]);
      assert.equal(res.matrix.conflicts[0].status, 'deadlocked');
      assert.equal(res.matrix.deadlocks.length, 1);
      assert.equal(res.matrix.escalation.execution_permission, 'blocked_until_approved');
    });

    it('5.4 should throw fail-closed descriptive errors on null or non-array inputs, and default undefined to empty', () => {
      assert.throws(() => resolveConflicts(null), /must be provided as an array/);
      assert.throws(() => resolveConflicts('not-an-array'), /must be provided as an array/);
      assert.throws(() => resolveConflicts(12345), /must be provided as an array/);
      assert.throws(() => resolveConflicts([null]), /must be a non-null object/);
      assert.throws(() => resolveConflicts(['string-proposal']), /must be a non-null object/);

      // Undefined triggers default parameter proposals = []
      const res = resolveConflicts(undefined);
      assert.equal(res.matrix.conflicts.length, 0);
      assert.equal(res.matrix.synthesized_decisions.length, 0);
    });

    it('5.5 should normalize proposals with missing fields into valid defaults', () => {
      const minimal = { property: 'heartbeat_ms', proposed_value: 1000 };
      const normalized = normalizeProposal(minimal, 0);

      assert.equal(normalized.domain, 'general');
      assert.equal(normalized.property, 'heartbeat_ms');
      assert.equal(normalized.proposed_value, 1000);
      assert.equal(normalized.confidence, 0.90);
      assert.equal(normalized.risk, 'medium');
      assert.deepEqual(normalized.evidence, []);
      assert.deepEqual(normalized.references, []);
      assert.equal(normalized.priority_tier, 4);
      assert.equal(normalized.priority_score, 50);
    });
  });
});

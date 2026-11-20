import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DOMAIN_PRIORITY_TIERS,
  CONFLICT_SEVERITY_LEVELS,
  DaveConflictDetector,
  DaveConflictSynthesizer,
  DaveDeadlockEscalator,
  DaveConflictResolver,
  detectDomainConflicts,
  synthesizeConflictMatrix,
  resolveConflicts,
  formatConflictReviewPacket,
  evaluateConflicts
} from '../../scripts/lib/dave-conflict-resolver.mjs';

describe('DAVE Multi-Expert Conflict Resolution Unit Test Suite', () => {
  const tmpArtifactPath = path.join(process.cwd(), 'artifacts/proofs/test-conflict-matrix.json');

  it('1. should define priority tiers with Security (1) > Accessibility (2) > Core Domain (3) > Optimization (4)', () => {
    assert.equal(DOMAIN_PRIORITY_TIERS.security, 1);
    assert.equal(DOMAIN_PRIORITY_TIERS.accessibility, 2);
    assert.equal(DOMAIN_PRIORITY_TIERS.backend_api, 3);
    assert.equal(DOMAIN_PRIORITY_TIERS.ux_ui, 3);
    assert.equal(DOMAIN_PRIORITY_TIERS.cost, 4);

    assert.ok(DOMAIN_PRIORITY_TIERS.security < DOMAIN_PRIORITY_TIERS.accessibility);
    assert.ok(DOMAIN_PRIORITY_TIERS.accessibility < DOMAIN_PRIORITY_TIERS.ux_ui);
    assert.ok(DOMAIN_PRIORITY_TIERS.ux_ui < DOMAIN_PRIORITY_TIERS.cost);
  });

  it('2. should detect pairwise collision on contrast ratio between UX and Accessibility', () => {
    const proposals = [
      {
        expert_id: 'exp-ux-01',
        domain: 'ux_ui',
        property: 'contrast_ratio',
        proposed_value: 3.2,
        evidence: ['docs/03-architecture/design-tokens.md'],
        confidence: 0.90,
        risk: 'medium',
        rationale: 'Subtle gray on light gray for minimalist visual aesthetic'
      },
      {
        expert_id: 'exp-a11y-01',
        domain: 'accessibility',
        property: 'contrast_ratio',
        proposed_value: 4.5,
        evidence: ['standards/wcag-2.2-aa.md'],
        confidence: 0.99,
        risk: 'high',
        rationale: 'WCAG 2.2 AA mandatory contrast 4.5:1 for standard body text'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].property, 'contrast_ratio');
    assert.equal(conflicts[0].severity, 'critical');
    assert.equal(conflicts[0].domains.includes('ux_ui'), true);
    assert.equal(conflicts[0].domains.includes('accessibility'), true);
  });

  it('3. should detect pairwise collision on layout geometry (touch target size)', () => {
    const proposals = [
      {
        expert_id: 'exp-ux-02',
        domain: 'ux_ui',
        property: 'touch_target_size',
        proposed_value: 32,
        evidence: ['tokens/compact-table.css'],
        confidence: 0.88,
        risk: 'low',
        rationale: 'Dense data grid compact action icon buttons'
      },
      {
        expert_id: 'exp-a11y-02',
        domain: 'accessibility',
        property: 'touch_target_size',
        proposed_value: 44,
        evidence: ['standards/wcag-target-size.md'],
        confidence: 0.98,
        risk: 'medium',
        rationale: 'WCAG 2.5.5 touch target minimum 44x44px'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].property, 'touch_target_size');
    assert.equal(conflicts[0].severity, 'high');
  });

  it('4. should detect security vs optimization collision (plaintext cache vs strict TLS Vault)', () => {
    const proposals = [
      {
        expert_id: 'exp-perf-01',
        domain: 'cost',
        property: 'session_encryption',
        proposed_value: false,
        evidence: ['benchmarks/redis-throughput.md'],
        confidence: 0.91,
        risk: 'medium',
        rationale: 'Disable session token encryption to cut Redis latency by 1.2ms'
      },
      {
        expert_id: 'exp-sec-01',
        domain: 'security',
        property: 'session_encryption',
        proposed_value: true,
        evidence: ['security/soc2-cc6.1.md'],
        confidence: 1.0,
        risk: 'high',
        rationale: 'Mandatory zero-trust AES-256 session token encryption at rest'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].property, 'session_encryption');
    assert.equal(conflicts[0].severity, 'critical');
  });

  it('5. should detect motion duration collision against accessibility reduced motion constraints', () => {
    const proposals = [
      {
        expert_id: 'exp-motion-01',
        domain: 'motion',
        property: 'animation_duration_ms',
        proposed_value: 1200,
        evidence: ['specs/hero-spring.json'],
        confidence: 0.89,
        risk: 'low',
        rationale: 'Elongated physics spring bounce for dramatic entrance'
      },
      {
        expert_id: 'exp-a11y-03',
        domain: 'accessibility',
        property: 'animation_duration_ms',
        proposed_value: 150,
        evidence: ['standards/prefers-reduced-motion.md'],
        confidence: 0.99,
        risk: 'high',
        rationale: 'Strict vestibulo-ocular reflex safety ceiling of <= 200ms'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].property, 'animation_duration_ms');
    assert.equal(conflicts[0].severity, 'high');
  });

  it('6. should detect duplicate contradictory proposals within the same domain', () => {
    const proposals = [
      {
        expert_id: 'exp-fe-01',
        domain: 'frontend',
        property: 'render_engine',
        proposed_value: 'canvas',
        evidence: ['specs/canvas.md'],
        confidence: 0.85,
        risk: 'low'
      },
      {
        expert_id: 'exp-fe-02',
        domain: 'frontend',
        property: 'render_engine',
        proposed_value: 'svg',
        evidence: ['specs/svg.md'],
        confidence: 0.86,
        risk: 'low'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].property, 'render_engine');
    assert.equal(conflicts[0].category, 'intra_domain_contradiction');
  });

  it('7. should pass non-conflicting, complementary domain proposals without false alarms', () => {
    const proposals = [
      {
        expert_id: 'exp-ux-03',
        domain: 'ux_ui',
        property: 'font_family',
        proposed_value: 'Inter, sans-serif',
        evidence: ['tokens/typography.json'],
        confidence: 0.95,
        risk: 'low'
      },
      {
        expert_id: 'exp-a11y-04',
        domain: 'accessibility',
        property: 'aria_landmarks',
        proposed_value: ['main', 'nav', 'complementary'],
        evidence: ['wcag/landmarks.md'],
        confidence: 0.98,
        risk: 'low'
      },
      {
        expert_id: 'exp-sec-02',
        domain: 'security',
        property: 'csrf_protection',
        proposed_value: 'samesite_strict',
        evidence: ['owasp/csrf.md'],
        confidence: 0.99,
        risk: 'low'
      }
    ];

    const conflicts = detectDomainConflicts(proposals);
    assert.equal(conflicts.length, 0);

    const matrix = synthesizeConflictMatrix(proposals);
    assert.equal(matrix.conflicts.length, 0);
    assert.equal(matrix.escalation.requires_human_review, false);
    assert.equal(matrix.escalation.route, 'proceed');
    assert.equal(matrix.synthesized_decisions.length, 3);
  });

  it('8. should resolve conflicts using deterministic hierarchy: Security always wins over any other domain', () => {
    const proposals = [
      {
        expert_id: 'exp-perf-01',
        domain: 'cost',
        property: 'session_encryption',
        proposed_value: false,
        evidence: ['benchmarks/redis.md'],
        confidence: 0.92,
        risk: 'medium',
        rationale: 'Latency optimization'
      },
      {
        expert_id: 'exp-sec-01',
        domain: 'security',
        property: 'session_encryption',
        proposed_value: true,
        evidence: ['security/soc2-cc6.1.md'],
        confidence: 1.0,
        risk: 'high',
        rationale: 'Zero-trust AES-256 session token encryption'
      }
    ];

    const result = resolveConflicts(proposals);
    assert.equal(result.matrix.conflicts.length, 1);
    assert.equal(result.matrix.conflicts[0].status, 'resolved');
    assert.equal(result.matrix.conflicts[0].winning_proposal.domain, 'security');
    assert.equal(result.matrix.conflicts[0].winning_proposal.proposed_value, true);

    // Verify rejected alternatives capture technical rationale
    const rejected = result.matrix.conflicts[0].rejected_proposals;
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].domain, 'cost');
    assert.ok(rejected[0].rejection_reason.includes('Security hierarchy tier'));
  });

  it('9. should resolve conflicts where Accessibility overrides aesthetic UX optimization', () => {
    const proposals = [
      {
        expert_id: 'exp-ux-01',
        domain: 'ux_ui',
        property: 'contrast_ratio',
        proposed_value: 3.2,
        evidence: ['tokens/colors.json'],
        confidence: 0.90,
        risk: 'low',
        rationale: 'Minimalist muted contrast'
      },
      {
        expert_id: 'exp-a11y-01',
        domain: 'accessibility',
        property: 'contrast_ratio',
        proposed_value: 4.5,
        evidence: ['standards/wcag-2.2-aa.md'],
        confidence: 0.99,
        risk: 'high',
        rationale: 'WCAG 2.2 AA 4.5:1 requirement'
      }
    ];

    const result = resolveConflicts(proposals);
    assert.equal(result.matrix.conflicts.length, 1);
    assert.equal(result.matrix.conflicts[0].status, 'resolved');
    assert.equal(result.matrix.conflicts[0].winning_proposal.domain, 'accessibility');
    assert.equal(result.matrix.conflicts[0].winning_proposal.proposed_value, 4.5);

    const synth = result.matrix.synthesized_decisions.find(d => d.property === 'contrast_ratio');
    assert.ok(synth);
    assert.equal(synth.value, 4.5);
    assert.ok(synth.alternatives_rejected.length > 0);
    assert.ok(synth.alternatives_rejected[0].includes('3.2'));
    assert.ok(synth.alternatives_rejected[0].includes('Accessibility hierarchy'));
  });

  it('10. should detect deadlocks and escalate to human review with execution_permission blocked_until_approved', () => {
    // Two proposals with equal priority and contradictory architectural approaches
    const proposals = [
      {
        expert_id: 'exp-be-01',
        domain: 'backend_api',
        property: 'data_protocol',
        proposed_value: 'grpc_protobuf',
        evidence: ['specs/grpc-schema.proto'],
        confidence: 0.88,
        risk: 'medium',
        rationale: 'Binary Protobuf streams for low-latency cluster messaging'
      },
      {
        expert_id: 'exp-fe-01',
        domain: 'frontend',
        property: 'data_protocol',
        proposed_value: 'graphql_apollo',
        evidence: ['specs/client-queries.graphql'],
        confidence: 0.88,
        risk: 'medium',
        rationale: 'Declarative GraphQL query fetching for client view compositions'
      }
    ];

    const result = resolveConflicts(proposals);
    assert.equal(result.matrix.conflicts.length, 1);
    assert.equal(result.matrix.conflicts[0].status, 'deadlocked');
    assert.equal(result.matrix.escalation.requires_human_review, true);
    assert.equal(result.matrix.escalation.route, 'human_review');
    assert.equal(result.matrix.escalation.execution_permission, 'blocked_until_approved');
    assert.ok(result.matrix.deadlocks.length > 0);
    assert.ok(result.matrix.escalation.review_packet);
  });

  it('11. should format Human-in-the-Loop review packet containing deadlocked conflict breakdown', () => {
    const deadlocks = [
      {
        conflict_id: 'CNF-DATA-001',
        property: 'data_protocol',
        domains: ['backend_api', 'frontend'],
        proposals: [
          { expert_id: 'exp-be-01', domain: 'backend_api', proposed_value: 'grpc_protobuf', rationale: 'Binary Protobuf' },
          { expert_id: 'exp-fe-01', domain: 'frontend', proposed_value: 'graphql_apollo', rationale: 'Declarative queries' }
        ],
        deadlock_reason: 'Equal priority tier between backend_api and frontend without dominant evidence'
      }
    ];

    const packet = formatConflictReviewPacket(deadlocks, 'G-DAVE-003');
    assert.ok(packet.includes('DAVE CONFLICT RESOLUTION REVIEW PACKET'));
    assert.ok(packet.includes('G-DAVE-003'));
    assert.ok(packet.includes('CNF-DATA-001'));
    assert.ok(packet.includes('grpc_protobuf'));
    assert.ok(packet.includes('graphql_apollo'));
    assert.ok(packet.includes('[ ] 1. Approve Proposal A'));
    assert.ok(packet.includes('[ ] 2. Approve Proposal B'));
    assert.ok(packet.includes('EXECUTION PERMISSION: BLOCKED UNTIL APPROVED'));
  });

  it('12. should execute CLI evaluate-conflicts command and generate structured proof matrix artifact', async () => {
    const matrix = await evaluateConflicts({
      outputPath: tmpArtifactPath,
      goalId: 'G-DAVE-003'
    });

    assert.ok(matrix);
    assert.ok(matrix.matrix_id.startsWith('CMX-'));
    assert.equal(matrix.goal_id, 'G-DAVE-003');
    assert.ok(matrix.conflicts.length >= 3);
    assert.ok(fs.existsSync(tmpArtifactPath));

    const written = JSON.parse(fs.readFileSync(tmpArtifactPath, 'utf8'));
    assert.equal(written.matrix_id, matrix.matrix_id);
    assert.ok(written.synthesized_decisions.length > 0);
    assert.ok(written.rejected_alternatives.length > 0);
    assert.ok(written.deadlocks.length > 0);
    assert.equal(written.escalation.execution_permission, 'blocked_until_approved');

    // Clean up temporary test file
    fs.unlinkSync(tmpArtifactPath);
  });
});

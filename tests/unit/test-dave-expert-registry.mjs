import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAVE_CANONICAL_DOMAINS,
  DAVE_DOMAIN_ALIASES,
  BoundaryViolationError,
  DomainContractError,
  DaveExpertRegistry,
  getDefaultExpertRegistry,
  resolveCanonicalDomain,
  enforceBoundary,
  dispatchIntent,
  getPreflightHarnesses
} from '../../scripts/lib/dave-expert-registry.mjs';

describe('DAVE Decision Domain and Expert Registry Unit Test Suite', () => {
  let registry;

  beforeEach(() => {
    registry = getDefaultExpertRegistry();
  });

  it('1. should register and expose all 20 canonical decision domains', () => {
    assert.equal(DAVE_CANONICAL_DOMAINS.length, 20);

    const expectedDomains = [
      'product',
      'game_architecture',
      'game_design',
      'ux_ui',
      'frontend',
      'backend_api',
      'database',
      'security',
      'accessibility',
      'motion',
      'audio',
      'asset',
      'infrastructure',
      'deployment',
      'verification',
      'confidence',
      'rlcd',
      'governance',
      'cost',
      'incident'
    ];

    for (const domain of expectedDomains) {
      assert.ok(DAVE_CANONICAL_DOMAINS.includes(domain), `Missing expected canonical domain: ${domain}`);
      assert.ok(registry.hasDomain(domain), `Registry must contain domain: ${domain}`);
    }
  });

  it('2. should verify that every canonical domain has required attributes, evidence, and schemas', () => {
    for (const domainId of DAVE_CANONICAL_DOMAINS) {
      const domain = registry.getDomain(domainId);
      assert.ok(domain, `Domain ${domainId} must return a descriptor`);
      assert.equal(typeof domain.name, 'string');
      assert.ok(domain.name.length > 0, `Domain ${domainId} must have non-empty name`);
      assert.equal(typeof domain.description, 'string');
      assert.ok(domain.description.length > 0, `Domain ${domainId} must have non-empty description`);

      assert.ok(Array.isArray(domain.required_evidence), `Domain ${domainId} must have required_evidence array`);
      assert.ok(domain.required_evidence.length > 0, `Domain ${domainId} must require at least 1 evidence type`);

      assert.ok(Array.isArray(domain.risk_classes), `Domain ${domainId} must have risk_classes array`);
      assert.ok(domain.risk_classes.length > 0, `Domain ${domainId} must have risk classes`);

      assert.ok(Array.isArray(domain.allowed_actions), `Domain ${domainId} must have allowed_actions`);
      assert.ok(domain.allowed_actions.length > 0, `Domain ${domainId} must have non-empty allowed_actions`);

      assert.ok(Array.isArray(domain.forbidden_actions), `Domain ${domainId} must have forbidden_actions array`);
      assert.ok(domain.forbidden_actions.length > 0, `Domain ${domainId} must declare forbidden actions`);

      assert.ok(Array.isArray(domain.verification_harnesses), `Domain ${domainId} must have verification_harnesses`);
      assert.ok(domain.verification_harnesses.length >= 1, `Domain ${domainId} must map to at least 1 harness`);
    }
  });

  it('3. should seamlessly resolve canonical aliases to primary domain IDs', () => {
    const aliasCases = [
      { alias: 'ux_ui_design', expected: 'ux_ui' },
      { alias: 'frontend_implementation', expected: 'frontend' },
      { alias: 'data_schema', expected: 'database' },
      { alias: 'test_verification', expected: 'verification' },
      { alias: 'model_confidence', expected: 'confidence' },
      { alias: 'visual_asset', expected: 'asset' },
      { alias: 'animation_motion', expected: 'motion' },
      { alias: 'sound_audio', expected: 'audio' },
      { alias: 'human_approval', expected: 'governance' },
      { alias: 'performance', expected: 'cost' },
      { alias: 'integration', expected: 'backend_api' }
    ];

    for (const { alias, expected } of aliasCases) {
      assert.equal(resolveCanonicalDomain(alias), expected, `Alias ${alias} must resolve to ${expected}`);
      const domain = registry.getDomain(alias);
      assert.equal(domain.id, expected, `Registry lookup by alias ${alias} must return domain ${expected}`);
    }
  });

  it('4. should fail-closed when registering an expert with an unregistered domain', () => {
    assert.throws(() => {
      registry.registerDomainExpert({
        domain: 'unregistered_fantasy_domain',
        allowed_actions: ['cast_spell'],
        forbidden_actions: ['break_space_time'],
        verification_harnesses: ['scripts/harness/fake-harness.mjs']
      });
    }, DomainContractError);
  });

  it('5. should fail-closed when registering an expert with empty allowed_actions', () => {
    assert.throws(() => {
      registry.registerDomainExpert({
        domain: 'frontend',
        allowed_actions: [],
        forbidden_actions: ['deploy_production'],
        verification_harnesses: ['scripts/harness/visual-regression-harness.mjs']
      });
    }, DomainContractError);
  });

  it('6. should fail-closed when registering an expert with empty verification_harnesses', () => {
    assert.throws(() => {
      registry.registerDomainExpert({
        domain: 'frontend',
        allowed_actions: ['implement_component'],
        forbidden_actions: ['deploy_production'],
        verification_harnesses: []
      });
    }, DomainContractError);
  });

  it('7. should register custom provider overriding or extending an existing domain expert', () => {
    registry.registerDomainExpert({
      domain: 'frontend',
      provider_name: 'CustomReactSpecialist',
      allowed_actions: ['implement_component', 'extract_tokens', 'optimize_bundle'],
      forbidden_actions: ['deploy_production', 'mutate_database_schema'],
      verification_harnesses: ['scripts/harness/component-storybook-cdd-harness.mjs']
    });

    const expert = registry.getDomainExpert('frontend');
    assert.equal(expert.provider_name, 'CustomReactSpecialist');
    assert.ok(expert.allowed_actions.includes('optimize_bundle'));
  });

  it('8. should validate domain decision proposals against schemas and evidence requirements', () => {
    const validProposal = {
      decision_id: 'DAVE-UX-0001',
      decision_type: 'ux_ui',
      action: 'design_layout',
      evidence: ['design_tokens', 'reference_screenshot'],
      payload: {
        summary: 'Workspace layout spec',
        layout: 'two_column',
        tokens_applied: ['space-8', 'color-neutral-900']
      }
    };

    const res = registry.validateDomainProposal('ux_ui', validProposal);
    assert.equal(res.valid, true, `Validation failed: ${res.errors?.join(', ')}`);
  });

  it('9. should fail proposal validation when required evidence is missing', () => {
    const invalidProposal = {
      decision_id: 'DAVE-SEC-0001',
      decision_type: 'security',
      action: 'threat_model_review',
      evidence: [], // Empty evidence!
      payload: {
        summary: 'Security review without threat model'
      }
    };

    const res = registry.validateDomainProposal('security', invalidProposal);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('evidence')));
  });

  it('10. should enforce boundary security: reject forbidden action fail-closed with BoundaryViolationError', () => {
    // Frontend attempting production deployment MUST throw BoundaryViolationError
    assert.throws(() => {
      enforceBoundary('frontend', 'deploy_production', registry);
    }, (err) => {
      assert.ok(err instanceof BoundaryViolationError);
      assert.ok(err.message.includes("is forbidden for domain 'frontend'"));
      return true;
    });

    // Database attempting to bypass authentication MUST throw
    assert.throws(() => {
      enforceBoundary('database', 'bypass_auth', registry);
    }, (err) => {
      assert.ok(err instanceof BoundaryViolationError);
      return true;
    });

    // Audio attempting database migration MUST throw
    assert.throws(() => {
      enforceBoundary('audio', 'mutate_database_schema', registry);
    }, (err) => {
      assert.ok(err instanceof BoundaryViolationError);
      return true;
    });
  });

  it('11. should enforce boundary security: reject action not in allowed_actions', () => {
    assert.throws(() => {
      enforceBoundary('motion', 'arbitrary_unauthorized_action', registry);
    }, (err) => {
      assert.ok(err instanceof BoundaryViolationError);
      assert.ok(err.message.includes('not permitted'));
      return true;
    });
  });

  it('12. should allow legitimate permitted actions through enforceBoundary', () => {
    assert.equal(enforceBoundary('frontend', 'implement_component', registry), true);
    assert.equal(enforceBoundary('ux_ui', 'propose_wireframe', registry), true);
    assert.equal(enforceBoundary('database', 'create_migration', registry), true);
    assert.equal(enforceBoundary('security', 'threat_model', registry), true);
    assert.equal(enforceBoundary('deployment', 'deploy_canary', registry), true);
  });

  it('13. should dispatch intent payload by explicit domain and action', () => {
    const payload = {
      domain: 'database',
      action: 'create_migration',
      intent: 'Add index to users table',
      evidence: ['migration_plan', 'schema_ddl']
    };

    const dispatch = dispatchIntent(payload, registry);
    assert.equal(dispatch.domain, 'database');
    assert.equal(dispatch.action, 'create_migration');
    assert.equal(dispatch.allowed, true);
    assert.ok(dispatch.expert);
    assert.ok(dispatch.preflight_harnesses.length >= 1);
  });

  it('14. should dispatch intent payload by payload attributes (task_type, keywords, tags)', () => {
    const payloads = [
      { task_type: 'accessibility_audit', action: 'audit_contrast', intent: 'Check WCAG contrast', evidence: ['wcag_report'] },
      { tags: ['game_design', 'economy'], action: 'tune_balance', intent: 'Balance gold drop rate', evidence: ['balance_table'] },
      { intent: 'Analyze audio loudness and synth earcon', action: 'generate_earcon', evidence: ['audio_spec'] },
      { task_type: 'motion_animation', action: 'choreograph_spring', intent: 'Choreograph modal exit spring', evidence: ['spring_curve'] }
    ];

    const expectedDomains = ['accessibility', 'game_design', 'audio', 'motion'];

    for (let i = 0; i < payloads.length; i++) {
      const dispatch = dispatchIntent(payloads[i], registry);
      assert.equal(dispatch.domain, expectedDomains[i], `Expected payload ${i} to dispatch to ${expectedDomains[i]}`);
      assert.equal(dispatch.allowed, true);
    }
  });

  it('15. should reject dispatch when intent specifies a forbidden action for the resolved domain', () => {
    const dangerousPayload = {
      domain: 'frontend',
      action: 'deploy_production',
      intent: 'Ship to production immediately'
    };

    assert.throws(() => {
      dispatchIntent(dangerousPayload, registry);
    }, BoundaryViolationError);
  });

  it('16. should retrieve preflight verification harnesses for all 20 canonical domains', () => {
    for (const domain of DAVE_CANONICAL_DOMAINS) {
      const harnesses = getPreflightHarnesses(domain, registry);
      assert.ok(Array.isArray(harnesses), `Harnesses for ${domain} must be an array`);
      assert.ok(harnesses.length >= 1, `Domain ${domain} must have at least 1 preflight harness`);
      for (const h of harnesses) {
        assert.equal(typeof h, 'string');
        assert.ok(h.length > 0);
      }
    }
  });
});

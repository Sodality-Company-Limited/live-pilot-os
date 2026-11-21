import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAVE_CANONICAL_DOMAINS,
  DAVE_DOMAIN_ALIASES,
  CANONICAL_DOMAIN_SPECS,
  BoundaryViolationError,
  DomainContractError,
  DaveExpertRegistry,
  getDefaultExpertRegistry,
  resolveCanonicalDomain,
  enforceBoundary,
  dispatchIntent,
  getPreflightHarnesses
} from '../../scripts/lib/dave-expert-registry.mjs';
import { validateDaveDecision } from '../../scripts/lib/dave-engine.mjs';

describe('Empirical Adversarial Stress Test Suite: Wave 2 G-DAVE-002', () => {
  let registry;

  beforeEach(() => {
    registry = new DaveExpertRegistry();
  });

  // =========================================================================
  // SECTION 1: EMPIRICAL BOUNDARY ENFORCEMENT & FORBIDDEN ACTIONS STRESS TEST
  // =========================================================================

  describe('1. Boundary Enforcement: Comprehensive Forbidden Actions Injection', () => {
    it('1.1 should reject 100% of declared forbidden actions across all 20 canonical domains via enforceBoundary', () => {
      let totalTested = 0;
      let totalBlocked = 0;

      for (const [domainId, spec] of Object.entries(CANONICAL_DOMAIN_SPECS)) {
        for (const forbiddenAction of spec.forbidden_actions) {
          totalTested++;
          assert.throws(
            () => {
              enforceBoundary(domainId, forbiddenAction, registry);
            },
            (err) => {
              assert.ok(err instanceof BoundaryViolationError, `Expected BoundaryViolationError for ${domainId}:${forbiddenAction}, got ${err?.name}`);
              assert.ok(err.message.includes('forbidden'), `Error message must indicate forbidden action, got: ${err.message}`);
              assert.equal(err.domain, domainId);
              assert.equal(err.action, forbiddenAction);
              totalBlocked++;
              return true;
            }
          );
        }
      }

      assert.equal(totalTested, 73, `Expected 73 forbidden actions across 20 domains, tested ${totalTested}`);
      assert.equal(totalBlocked, 73, `All 73 forbidden actions must be blocked fail-closed`);
    });

    it('1.2 should reject forbidden actions accessed through all 16 legacy domain aliases', () => {
      let aliasTested = 0;
      let aliasBlocked = 0;

      for (const [alias, canonicalDomain] of Object.entries(DAVE_DOMAIN_ALIASES)) {
        const spec = CANONICAL_DOMAIN_SPECS[canonicalDomain];
        for (const forbiddenAction of spec.forbidden_actions) {
          aliasTested++;
          assert.throws(
            () => {
              enforceBoundary(alias, forbiddenAction, registry);
            },
            (err) => {
              assert.ok(err instanceof BoundaryViolationError);
              assert.equal(err.domain, canonicalDomain);
              aliasBlocked++;
              return true;
            }
          );
        }
      }

      assert.ok(aliasTested >= 50, `Expected multiple alias tests, tested ${aliasTested}`);
      assert.equal(aliasBlocked, aliasTested, `All alias attempts with forbidden actions must be blocked`);
    });

    it('1.3 should reject cross-domain forbidden actions through dispatchIntent', () => {
      const crossDomainAttacks = [
        { domain: 'audio', action: 'mutate_database_schema', intent: 'Update audio track schema' },
        { domain: 'frontend', action: 'deploy_production', intent: 'Push frontend update live' },
        { domain: 'product', action: 'execute_code', intent: 'Run user research data script' },
        { domain: 'database', action: 'disable_rls', intent: 'Disable row level security for migration' },
        { domain: 'security', action: 'grant_unrestricted_root', intent: 'Elevate agent privileges' },
        { domain: 'infrastructure', action: 'disable_sandbox_isolation', intent: 'Run container unconfined' },
        { domain: 'verification', action: 'fake_test_results', intent: 'Forge green test run' },
        { domain: 'confidence', action: 'override_ece_gate', intent: 'Force promote uncalibrated model' },
        { domain: 'rlcd', action: 'suppress_overconfidence_penalty', intent: 'Ignore overconfidence loss' },
        { domain: 'governance', action: 'bypass_human_review', intent: 'Auto-approve P0 release' },
        { domain: 'cost', action: 'mutate_database_schema', intent: 'Alter budget ledger tables' },
        { domain: 'incident', action: 'close_incident_without_postmortem', intent: 'Resolve outage silently' }
      ];

      for (const attack of crossDomainAttacks) {
        assert.throws(
          () => {
            dispatchIntent(attack, registry);
          },
          (err) => {
            assert.ok(err instanceof BoundaryViolationError, `Expected BoundaryViolationError for ${attack.domain}:${attack.action}`);
            return true;
          }
        );
      }
    });

    it('1.4 should reject unauthorized (unwhitelisted) actions fail-closed across all 20 canonical domains', () => {
      const unauthorizedActions = [
        'arbitrary_eval',
        'exec_shell',
        'drop_database',
        'format_disk',
        'steal_credentials',
        'spawn_daemon',
        'proxy_traffic'
      ];

      for (const domain of DAVE_CANONICAL_DOMAINS) {
        for (const action of unauthorizedActions) {
          assert.throws(
            () => {
              enforceBoundary(domain, action, registry);
            },
            (err) => {
              assert.ok(err instanceof BoundaryViolationError);
              assert.ok(err.message.includes('not permitted'));
              return true;
            }
          );
        }
      }
    });

    it('1.5 should reject adversarial action input types and injection attempts', () => {
      const hostileActions = [
        null,
        undefined,
        '',
        '   ',
        1337,
        true,
        false,
        {},
        [],
        () => {},
        '__proto__',
        'constructor',
        'toString',
        'valueOf',
        'hasOwnProperty',
        '../../etc/passwd',
        '; rm -rf /',
        'deploy_production\x00',
        'deploy_production\n',
        'DEPLOY_PRODUCTION' // uppercase variation of forbidden action
      ];

      for (const hostile of hostileActions) {
        assert.throws(
          () => {
            enforceBoundary('frontend', hostile, registry);
          },
          (err) => {
            assert.ok(err instanceof BoundaryViolationError, `Expected BoundaryViolationError for hostile action: ${String(hostile)}`);
            return true;
          }
        );
      }
    });

    it('1.6 should empirically demonstrate unhandled TypeError on Symbol in enforceBoundary', () => {
      // Demonstrating unhandled TypeError when action is a Symbol
      assert.throws(
        () => {
          enforceBoundary('frontend', Symbol('forbidden_symbol'), registry);
        },
        (err) => {
          assert.ok(err instanceof TypeError, 'Throws TypeError due to unescaped template string interpolation');
          assert.ok(err.message.includes('Cannot convert a Symbol value to a string'));
          return true;
        }
      );
    });

    it('1.7 should empirically demonstrate critical security vulnerability: mutable reference leak allows boundary bypass', () => {
      const freshRegistry = new DaveExpertRegistry();
      const expert = freshRegistry.getDomainExpert('frontend');

      // Invariant: Initially frontend cannot deploy_production
      assert.throws(
        () => {
          enforceBoundary('frontend', 'deploy_production', freshRegistry);
        },
        BoundaryViolationError
      );

      // EXPLOIT: Mutate internal arrays via leaked shallow copy reference
      expert.forbidden_actions.splice(0, expert.forbidden_actions.length);
      expert.allowed_actions.push('deploy_production');

      // VULNERABILITY CONFIRMATION: enforceBoundary now permits deploy_production!
      const permitted = enforceBoundary('frontend', 'deploy_production', freshRegistry);
      assert.equal(permitted, true, 'CRITICAL VULNERABILITY: deploy_production permitted due to shallow copy reference leak');
    });

    it('1.8 should empirically demonstrate shallow-freeze vulnerability on CANONICAL_DOMAIN_SPECS', () => {
      assert.equal(Object.isFrozen(CANONICAL_DOMAIN_SPECS), true, 'Outer dictionary is frozen');
      assert.equal(Object.isFrozen(CANONICAL_DOMAIN_SPECS.frontend), false, 'Inner domain spec is NOT frozen');
      assert.equal(Object.isFrozen(CANONICAL_DOMAIN_SPECS.frontend.forbidden_actions), false, 'Inner array is NOT frozen');
    });
  });

  // =========================================================================
  // SECTION 2: SCHEMA VALIDATION UNDER MALFORMED & HOSTILE INPUTS
  // =========================================================================

  describe('2. Schema Validation: Malformed, Missing, and Hostile Payloads', () => {
    it('2.1 should reject non-object and empty proposals in validateDomainProposal', () => {
      const nonObjectProposals = [
        null,
        undefined,
        'proposal string',
        12345,
        true,
        [],
        () => {}
      ];

      for (const invalid of nonObjectProposals) {
        const res = registry.validateDomainProposal('frontend', invalid);
        assert.equal(res.valid, false);
        assert.ok(res.errors.length > 0);
      }
    });

    it('2.2 should reject proposals with missing or empty evidence across all 20 canonical domains', () => {
      for (const domain of DAVE_CANONICAL_DOMAINS) {
        const testCases = [
          { payload: { data: 'test' } }, // missing evidence
          { evidence: null, payload: { data: 'test' } }, // null evidence
          { evidence: [], payload: { data: 'test' } }, // empty array evidence
          { evidence: 'string_evidence', payload: { data: 'test' } }, // non-array evidence
          { evidence: 123, payload: { data: 'test' } } // numeric evidence
        ];

        for (const tc of testCases) {
          const res = registry.validateDomainProposal(domain, tc);
          assert.equal(res.valid, false, `Domain ${domain} must reject proposal with invalid evidence: ${JSON.stringify(tc)}`);
          assert.ok(res.errors.some(e => e.includes('evidence')));
        }
      }
    });

    it('2.3 should reject proposals with missing or invalid payload objects', () => {
      const invalidPayloadCases = [
        { evidence: ['test_evidence'] }, // missing payload
        { evidence: ['test_evidence'], payload: null }, // null payload
        { evidence: ['test_evidence'], payload: 'not_an_object' }, // string payload
        { evidence: ['test_evidence'], payload: 12345 }, // number payload
        { evidence: ['test_evidence'], payload: true } // boolean payload
      ];

      for (const tc of invalidPayloadCases) {
        const res = registry.validateDomainProposal('frontend', tc);
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('payload object')));
      }
    });

    it('2.4 should flag explicitly forbidden actions when supplied in validateDomainProposal', () => {
      for (const [domainId, spec] of Object.entries(CANONICAL_DOMAIN_SPECS)) {
        for (const forbidden of spec.forbidden_actions) {
          const proposal = {
            action: forbidden,
            evidence: [...spec.required_evidence],
            payload: { notes: 'Hostile proposal injection' }
          };

          const res = registry.validateDomainProposal(domainId, proposal);
          assert.equal(res.valid, false);
          assert.ok(
            res.errors.some(e => e.includes(`explicitly forbidden for domain '${domainId}'`)),
            `Expected forbidden action error for ${domainId}:${forbidden}, got: ${res.errors.join(', ')}`
          );
        }
      }
    });

    it('2.5 should demonstrate that validateDomainProposal does NOT enforce action presence when omitted', () => {
      // If action is omitted, validateDomainProposal passes validation provided evidence and payload exist
      const proposalWithoutAction = {
        evidence: ['component_states'],
        payload: { summary: 'Component state spec' }
      };

      const res = registry.validateDomainProposal('frontend', proposalWithoutAction);
      assert.equal(res.valid, true, 'Proposal without action validates as valid because action check is guarded by if (proposal.action)');
      assert.equal(res.errors.length, 0);
    });

    it('2.6 should handle hostile injection payloads in validateDomainProposal without uncaught crash', () => {
      const hostilePayloads = [
        {
          evidence: ['design_tokens'],
          payload: {
            sql_injection: "'; DROP TABLE users; --",
            xss: "<script>alert('xss')</script>",
            path_traversal: "../../../../../etc/passwd"
          }
        },
        {
          evidence: ['design_tokens'],
          payload: JSON.parse('{"__proto__": {"polluted": true}}')
        },
        {
          evidence: ['design_tokens'],
          payload: {
            huge_data: 'A'.repeat(100_000)
          }
        }
      ];

      for (const hostile of hostilePayloads) {
        assert.doesNotThrow(() => {
          const res = registry.validateDomainProposal('frontend', hostile);
          assert.equal(typeof res.valid, 'boolean');
        });
      }
    });
  });

  // =========================================================================
  // SECTION 3: INTENT DISPATCHER STRESS TEST & BOUNDARY GATING
  // =========================================================================

  describe('3. Intent Dispatcher: Resolution Robustness and Gating', () => {
    it('3.1 should fail-closed with DomainContractError when intent payload is non-object', () => {
      const nonObjects = [null, undefined, 'string', 1234, true];
      for (const nonObj of nonObjects) {
        assert.throws(
          () => {
            dispatchIntent(nonObj, registry);
          },
          (err) => {
            assert.ok(err instanceof DomainContractError);
            assert.ok(err.message.includes('non-null object'));
            return true;
          }
        );
      }
    });

    it('3.2 should fail-closed with DomainContractError when intent cannot be resolved to any domain', () => {
      const unresolvableIntents = [
        {},
        { task_type: 'unknown_alien_system' },
        { tags: ['random_tag_1', 'random_tag_2'] },
        { intent: 'unintelligible gibberish without keywords' }
      ];

      for (const unres of unresolvableIntents) {
        assert.throws(
          () => {
            dispatchIntent(unres, registry);
          },
          (err) => {
            assert.ok(err instanceof DomainContractError);
            assert.ok(err.message.includes('Unable to resolve intent'));
            return true;
          }
        );
      }
    });

    it('3.3 should fail-closed with BoundaryViolationError when intent omits action because default "propose" is unauthorized', () => {
      // Empirical verification of default action behavior
      for (const domain of DAVE_CANONICAL_DOMAINS) {
        assert.throws(
          () => {
            dispatchIntent({ domain }, registry);
          },
          (err) => {
            assert.ok(err instanceof BoundaryViolationError);
            assert.ok(err.message.includes("Action 'propose' is not permitted"));
            return true;
          }
        );
      }
    });

    it('3.4 should successfully dispatch when valid domain and permitted action are provided', () => {
      for (const [domainId, spec] of Object.entries(CANONICAL_DOMAIN_SPECS)) {
        const permittedAction = spec.allowed_actions[0];
        const res = dispatchIntent({ domain: domainId, action: permittedAction }, registry);
        assert.equal(res.domain, domainId);
        assert.equal(res.action, permittedAction);
        assert.equal(res.allowed, true);
        assert.ok(Array.isArray(res.preflight_harnesses));
        assert.ok(res.preflight_harnesses.length >= 1);
      }
    });
  });

  // =========================================================================
  // SECTION 4: INTEGRATION WITH DAVE-ENGINE VALIDATION ACROSS 20 DOMAINS
  // =========================================================================

  describe('4. Interoperability: validateDaveDecision across all 20 canonical domains', () => {
    it('4.1 should validate valid decisions for all 20 canonical domains in validateDaveDecision', () => {
      for (let i = 0; i < DAVE_CANONICAL_DOMAINS.length; i++) {
        const domain = DAVE_CANONICAL_DOMAINS[i];
        const decision = {
          decision_id: `DAVE-${domain.toUpperCase().slice(0, 4)}-${String(i + 1).padStart(4, '0')}`,
          decision_type: domain,
          goal_id: 'G-DAVE-002',
          decision: {
            summary: `Automated test decision for domain ${domain}`,
            primary_action: 'verify'
          },
          confidence: 0.95,
          risk: 'low',
          evidence: ['evidence_manifest.json'],
          references: [],
          assumptions: [],
          alternatives_rejected: [],
          verification: ['test_harness.mjs'],
          human_action: 'none'
        };

        const res = validateDaveDecision(decision);
        assert.equal(res.valid, true, `validateDaveDecision rejected domain ${domain}: ${res.errors?.join(', ')}`);
      }
    });

    it('4.2 should reject malformed decision fields across decision records', () => {
      const malformedCases = [
        {
          desc: 'invalid decision_id format',
          payload: { decision_id: 'INVALID_ID', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: 0.9, risk: 'low', evidence: ['e'] },
          expectedError: 'decision_id'
        },
        {
          desc: 'unregistered decision_type',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'nonexistent_domain', goal_id: 'G-1', decision: {}, confidence: 0.9, risk: 'low', evidence: ['e'] },
          expectedError: 'decision_type'
        },
        {
          desc: 'missing goal_id',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', decision: {}, confidence: 0.9, risk: 'low', evidence: ['e'] },
          expectedError: 'goal_id'
        },
        {
          desc: 'confidence out of range (> 1.0)',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: 1.5, risk: 'low', evidence: ['e'] },
          expectedError: 'confidence'
        },
        {
          desc: 'confidence out of range (< 0.0)',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: -0.1, risk: 'low', evidence: ['e'] },
          expectedError: 'confidence'
        },
        {
          desc: 'invalid risk level',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: 0.9, risk: 'critical', evidence: ['e'] },
          expectedError: 'risk'
        },
        {
          desc: 'empty evidence array',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: 0.9, risk: 'low', evidence: [] },
          expectedError: 'evidence'
        },
        {
          desc: 'high risk decision without human approval action',
          payload: { decision_id: 'DAVE-TEST-0001', decision_type: 'frontend', goal_id: 'G-1', decision: {}, confidence: 0.9, risk: 'high', evidence: ['e'], human_action: 'none' },
          expectedError: 'human_action'
        }
      ];

      for (const tc of malformedCases) {
        const res = validateDaveDecision(tc.payload);
        assert.equal(res.valid, false, `Expected failure for case: ${tc.desc}`);
        assert.ok(
          res.errors.some(e => e.includes(tc.expectedError)),
          `Expected error mentioning '${tc.expectedError}', got: ${res.errors.join(', ')}`
        );
      }
    });
  });
});

# DAVE Canonical Decision Domain and Expert Taxonomy Specification

**Document ID:** `dave-domain-taxonomy.md`  
**Location:** `docs/03-architecture/dave-domain-taxonomy.md`  
**Goal Reference:** [G-DAVE-002](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-DAVE-002.md)  
**Acceptance Contract:** [G-DAVE-002 Acceptance](file:///Users/batrarethsudprasert/projects/soda-os/docs/02-product/acceptance/G-DAVE-002.md)  
**Implementation Source:** [dave-expert-registry.mjs](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/dave-expert-registry.mjs)  
**Test Suite:** [test-dave-expert-registry.mjs](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-dave-expert-registry.mjs)  
**Status:** Approved Architectural Specification  
**Classification:** Core System 1 Decision Architecture  

---

## 🏛️ 1. Architectural Overview & Context

DAVE (*Domain-Adaptive, Evidence-Grounded, Confidence-Calibrated Decision System*) serves as the **SYSTEM 1 decision-maker** across the Soda OS ecosystem. Initially centered on UX/UI and Frontend implementation, DAVE is generalized under Goal G-DAVE-002 into a centralized **Domain and Expert Registry** governing **20 canonical decision domains**.

Every autonomous decision proposal, architectural mutation, or implementation action within Soda OS must be typed against one of these 20 canonical domains, grounded with authoritative evidence citations, validated against strict input/output schemas, guarded by fail-closed boundary enforcement, and mapped to automated preflight test harnesses.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   DAVE SYSTEM 1 DECISION PLATFORM                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴───────────────────┐
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │ Driving Inbound Port: │                │ Driven Outbound Port: │
   │ DomainRegistrationPort│                │  ExpertDispatcherPort │
   └───────────┬───────────┘                └───────────┬───────────┘
               │                                        │
               ▼                                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │               DaveExpertRegistry (20 Domains)              │
   ├────────────────────────────────────────────────────────────┤
   │ 1. product              11. audio                          │
   │ 2. game_architecture    12. asset                          │
   │ 3. game_design          13. infrastructure                 │
   │ 4. ux_ui                14. deployment                     │
   │ 5. frontend             15. verification                   │
   │ 6. backend_api          16. confidence                     │
   │ 7. database             17. rlcd                           │
   │ 8. security             18. governance                     │
   │ 9. accessibility        19. cost                           │
   │ 10. motion              20. incident                       │
   └────────────────────────────┬───────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   ┌────────────────────────┐       ┌────────────────────────┐
   │  Boundary Enforcement  │       │ Preflight Test Harness │
   │ (Fail-Closed Security) │       │ (Automated Verification)│
   └────────────────────────┘       └────────────────────────┘
```

---

## 🏷️ 2. The 20 Canonical Decision Domains

The taxonomy defines 20 discrete, high-cohesion bounded domains. Each domain declares required evidence categories, risk classes, input/output contracts, permissible actions, strictly forbidden actions, and automated verification harness bindings.

### Complete Domain Taxonomy Specification Matrix

| # | Domain ID | Display Title | Default Risk | Required Evidence | Allowed Actions | Strictly Forbidden Actions | Verification Harness Mappings |
|---|---|---|:---:|---|---|---|---|
| 1 | `product` | Product Strategy & Requirements | `medium` | `user_job_story`, `business_metrics`, `scope_manifest`, `acceptance_criteria` | `define_requirements`, `propose_scope`, `set_kpis`, `prioritize_backlog` | `deploy_production`, `execute_code`, `bypass_auth`, `mutate_database_schema` | `goal-template-conformance-harness.mjs`, `goal-scope-drift-harness.mjs` |
| 2 | `game_architecture` | Game Engine & Architecture | `high` | `ecs_topology`, `frame_budget_manifest`, `state_sync_protocol`, `physics_config` | `design_ecs_topology`, `schedule_systems`, `allocate_frame_budget`, `configure_physics` | `deploy_production`, `bypass_auth`, `mutate_financial_ledger` | `realtime-graph-flamegraph-harness.mjs`, `agent-workflow-harness.mjs` |
| 3 | `game_design` | Game Mechanics & Systems Design | `medium` | `mechanics_balance_table`, `economy_sink_source_model`, `progression_curves` | `tune_balance`, `design_mechanics`, `configure_loot_tables`, `model_economy` | `deploy_production`, `bypass_auth`, `mutate_database_schema`, `grant_admin_privileges` | `agent-workflow-harness.mjs`, `mathematical-invariant-proof-harness.mjs` |
| 4 | `ux_ui` | UX/UI Design & Information Architecture | `medium` | `design_tokens`, `reference_screenshot`, `component_inventory`, `viewport_matrix` | `design_layout`, `propose_wireframe`, `extract_tokens`, `define_states`, `audit_heuristics` | `deploy_production`, `mutate_database_schema`, `bypass_auth`, `grant_permissions` | `ui-spec-conformance-harness.mjs`, `token-guardrail-harness.mjs`, `visual-regression-harness.mjs` |
| 5 | `frontend` | Frontend Implementation & Client Engineering | `medium` | `component_states`, `dom_hierarchy`, `design_tokens`, `fixture_data` | `implement_component`, `extract_tokens`, `write_component_test`, `create_storybook_fixture` | `deploy_production`, `mutate_database_schema`, `bypass_auth`, `grant_permissions`, `modify_cloud_infra` | `component-storybook-cdd-harness.mjs`, `ui-harness.mjs`, `visual-regression-harness.mjs` |
| 6 | `backend_api` | Backend Services & API Contracts | `medium` | `api_contract_spec`, `validation_schema`, `idempotency_key_policy`, `error_taxonomy` | `implement_endpoint`, `define_api_contract`, `configure_rate_limit`, `register_route`, `handle_request` | `deploy_production`, `bypass_auth`, `drop_database_table`, `disable_rate_limiting` | `universal-contract-harness.mjs`, `e2e-live-integration-harness.mjs` |
| 7 | `database` | Database Architecture & Persistence | `high` | `schema_ddl`, `migration_plan`, `rls_policy`, `rollback_sql` | `create_migration`, `optimize_index`, `define_rls`, `audit_queries`, `execute_migration` | `bypass_auth`, `drop_table_without_backup`, `disable_rls`, `deploy_production`, `delete_all_records` | `database-rls-geo-sharding-harness.mjs`, `g252-database-rls-geo-sharding-harness.mjs` |
| 8 | `security` | Security Engineering & Zero-Trust Governance | `high` | `threat_model`, `sandboxing_spec`, `auth_tokens`, `pii_scrubbing_manifest` | `threat_model`, `audit_security_boundary`, `configure_sandbox`, `enforce_pii_vault`, `threat_model_review` | `grant_unrestricted_root`, `disable_sandboxing`, `bypass_pii_scrubber`, `hardcode_credentials` | `security-boundary-harness.mjs`, `g247-statutory-pii-vault-harness.mjs` |
| 9 | `accessibility` | Accessibility & Universal Inclusion | `medium` | `wcag_contrast_ratio`, `screen_reader_semantics`, `keyboard_navigation_matrix` | `audit_contrast`, `generate_aria_attributes`, `verify_keyboard_navigation`, `enforce_wcag` | `deploy_production`, `mutate_database_schema`, `bypass_auth` | `ui-spec-conformance-harness.mjs`, `component-storybook-cdd-harness.mjs` |
| 10 | `motion` | Motion Design & Physics Animation | `low` | `spring_physics_curve`, `frame_budget_60fps`, `prefers_reduced_motion_fallback` | `choreograph_spring`, `profile_frame_rate`, `define_reduced_motion`, `create_transition` | `deploy_production`, `mutate_database_schema`, `bypass_auth`, `modify_routes` | `motion-harness.mjs` |
| 11 | `audio` | Audio Design & UI Sonification | `low` | `earcon_audio_spec`, `lufs_loudness_target`, `latency_budget_ms` | `generate_earcon`, `verify_loudness_lufs`, `configure_sound_profile`, `test_latency` | `deploy_production`, `mutate_database_schema`, `modify_routes`, `bypass_auth` | `audio-harness.mjs` |
| 12 | `asset` | Visual Assets & Media Optimization | `low` | `asset_compression_ratio`, `sha256_content_hash`, `aspect_ratio_manifest` | `optimize_asset`, `verify_content_hash`, `generate_srcset`, `compress_image` | `deploy_production`, `mutate_database_schema`, `bypass_auth` | `asset-harness.mjs`, `dave-reference-harness.mjs` |
| 13 | `infrastructure` | Cloud Infrastructure & Compute Governance | `high` | `cgroup_v2_limits`, `wasm_sandbox_config`, `network_topology`, `quota_manifest` | `provision_sandbox`, `enforce_resource_ceilings`, `configure_cgroups`, `audit_network_egress` | `disable_sandbox_isolation`, `grant_root_privilege`, `bypass_quota_limits`, `deploy_production` | `resource-budget-harness.mjs`, `g-infra-014-harness.mjs` |
| 14 | `deployment` | Deployment Orchestration & Release Engineering | `high` | `canary_plan`, `rollback_contract`, `slo_manifest`, `health_check_endpoint` | `deploy_canary`, `shift_traffic`, `trigger_rollback`, `validate_health_probes` | `deploy_without_rollback_plan`, `bypass_ci_gates`, `force_push_production` | `failure-rollback-harness.mjs`, `e2e-live-integration-harness.mjs` |
| 15 | `verification` | Test Verification & Mathematical Proofs | `low` | `test_suite_manifest`, `property_tests`, `proof_receipt`, `coverage_report` | `run_test_suite`, `issue_proof_receipt`, `run_property_test`, `assert_invariants` | `fake_test_results`, `skip_failing_assertions`, `deploy_production`, `mutate_database_schema` | `goal-assurance-suite.mjs`, `mathematical-invariant-proof-harness.mjs` |
| 16 | `confidence` | Model Confidence & Uncertainty Calibration | `medium` | `ece_calibration_score`, `brier_score`, `asymmetric_reward_log`, `reliability_diagram` | `calibrate_confidence`, `compute_ece`, `track_brier_drift`, `score_logarithmic_reward` | `override_ece_gate`, `inflate_confidence_scores`, `deploy_production` | `confidence-calibration-harness.mjs`, `ci-calibration-gate.mjs` |
| 17 | `rlcd` | RLCD & Continuous Doubt Learning | `medium` | `trajectory_log`, `logarithmic_reward`, `overconfidence_penalty`, `loss_gradient_manifest` | `export_rlcd_data`, `compute_doubt_penalty`, `train_calibration_head`, `log_trajectory` | `suppress_overconfidence_penalty`, `corrupt_trajectory_ledger`, `deploy_production` | `model-training-contract-harness.mjs`, `test-dave-engine.mjs` |
| 18 | `governance` | Human Governance & Decision Approvals | `high` | `review_packet`, `human_action_gate`, `audit_hash_chain`, `decision_citations` | `format_review_packet`, `request_human_approval`, `escalate_risk`, `record_approval` | `bypass_human_review`, `auto_approve_high_risk`, `silence_conflict_alert` | `dave-decision-trace-harness.mjs`, `cryptographic-audit-nonce-harness.mjs` |
| 19 | `cost` | FinOps, Resource Latency & Cost Optimization | `low` | `token_budget`, `cloud_compute_cost`, `latency_p99`, `cost_ledger` | `track_latency`, `audit_token_expenditure`, `enforce_compute_budget`, `calculate_monetary_cost` | `deploy_production`, `mutate_database_schema`, `exceed_token_budget_without_alert` | `resource-budget-harness.mjs`, `f37-universal-quota-conformance-harness.mjs` |
| 20 | `incident` | Incident Response & Production Triage | `high` | `severity_triage`, `runbook_steps`, `postmortem_template`, `trip_telemetry` | `triage_incident`, `trip_circuit_breaker`, `execute_runbook`, `compile_postmortem` | `close_incident_without_postmortem`, `silence_p0_alert`, `bypass_incident_lead` | `failure-rollback-harness.mjs`, `dual-transport-chaos-harness.mjs` |

---

## 🛡️ 3. Boundary Enforcement & Fail-Closed Invariants

Autonomous agents operating within Soda OS are strictly bound by the following security and governance rules:

1. **Least-Privilege Domain Isolation:** An expert registered in one domain (e.g., `frontend`) cannot execute actions reserved for another domain (e.g., `deploy_production` or `mutate_database_schema`).
2. **Explicit Forbidden Actions Gate:** Attempting any action declared in a domain's `forbidden_actions` list immediately throws a `BoundaryViolationError` and halts execution fail-closed.
3. **Whitelist Action Enforcement:** Any action not explicitly listed in `allowed_actions` is rejected fail-closed as an unauthorized action.
4. **Evidence Grounding Requirement:** A domain proposal cannot proceed without providing concrete evidence citations corresponding to the domain's `required_evidence`.
5. **Zero Mocks Invariant:** All registry lookups, dispatch decisions, schema validations, and boundary checks execute deterministic production logic without simulation fallbacks.

---

## 🔄 4. Canonical Alias Resolution Matrix

To guarantee backwards compatibility with earlier DAVE versions (`dave-engine.mjs`) and diverse naming conventions, the registry normalizes all incoming identifiers via `resolveCanonicalDomain`:

| Incoming Identifier / Legacy Alias | Canonical Domain ID | Resolved Specification |
|---|---|---|
| `ux_ui_design` | `ux_ui` | UX/UI Design & Information Architecture |
| `frontend_implementation` | `frontend` | Frontend Implementation & Client Engineering |
| `data_schema` | `database` | Database Architecture & Persistence |
| `test_verification` | `verification` | Test Verification & Mathematical Proofs |
| `model_confidence` | `confidence` | Model Confidence & Uncertainty Calibration |
| `visual_asset` | `asset` | Visual Assets & Media Optimization |
| `animation_motion` | `motion` | Motion Design & Physics Animation |
| `sound_audio` | `audio` | Audio Design & UI Sonification |
| `human_approval` | `governance` | Human Governance & Decision Approvals |
| `performance` | `cost` | FinOps, Resource Latency & Cost Optimization |
| `integration` | `backend_api` | Backend Services & API Contracts |
| `product_design` | `ux_ui` | UX/UI Design & Information Architecture |
| `sysadmin` | `infrastructure` | Cloud Infrastructure & Compute Governance |
| `sre` | `incident` | Incident Response & Production Triage |
| `devops` | `deployment` | Deployment Orchestration & Release Engineering |
| `qa` | `verification` | Test Verification & Mathematical Proofs |

---

## 🚀 5. Intent Dispatcher & Preflight Test Harness Mapping

The `dispatchIntent` function inspects input payloads across four prioritized selectors:
1. **Explicit Domain Key:** `payload.domain`
2. **Task Type Selector:** `payload.task_type` matching domain names or aliases
3. **Tags Array:** `payload.tags` containing registered domain keywords
4. **Intent Keyword Heuristic:** Parsing `payload.intent` string against domain keyword dictionaries

Once resolved, the dispatcher verifies boundary permissions and attaches the domain's executable preflight test harnesses via `getPreflightHarnesses`:

```javascript
import { dispatchIntent, enforceBoundary, getPreflightHarnesses } from './scripts/lib/dave-expert-registry.mjs';

// 1. Dispatch intent to domain specialist
const dispatch = dispatchIntent({
  task_type: 'accessibility_audit',
  action: 'audit_contrast',
  intent: 'Verify WCAG AA 4.5:1 contrast on dashboard buttons',
  evidence: ['wcag_report']
});

console.log(dispatch.domain); // 'accessibility'
console.log(dispatch.allowed); // true
console.log(dispatch.preflight_harnesses); 
// ['scripts/harness/ui-spec-conformance-harness.mjs', 'scripts/harness/component-storybook-cdd-harness.mjs']
```

---

## 🔬 6. Verification and Conformance Testing

The DAVE Decision Domain and Expert Registry is verified via two primary automated test suites:
- **Unit Test Suite:** `node --test tests/unit/test-dave-expert-registry.mjs` (16 test scenarios, 100% green pass)
- **Schema Harness:** `node scripts/harness/dave-decision-schema-harness.mjs` (All domain contracts satisfied)

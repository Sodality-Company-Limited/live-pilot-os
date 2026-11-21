/**
 * DAVE Decision Domain and Expert Registry
 * Implements the 20 canonical decision domains, expert contracts,
 * automated verification harness mappings, intent dispatcher,
 * and fail-closed boundary enforcement for Soda OS.
 *
 * @module scripts/lib/dave-expert-registry
 */

/**
 * 20 Canonical Decision Domains governed by DAVE
 */
export const DAVE_CANONICAL_DOMAINS = Object.freeze([
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
]);

/**
 * Canonical Domain Aliases mapping legacy or alternative domain identifiers
 * to the authoritative canonical domain IDs.
 */
export const DAVE_DOMAIN_ALIASES = Object.freeze({
  ux_ui_design: 'ux_ui',
  frontend_implementation: 'frontend',
  data_schema: 'database',
  test_verification: 'verification',
  model_confidence: 'confidence',
  visual_asset: 'asset',
  animation_motion: 'motion',
  sound_audio: 'audio',
  human_approval: 'governance',
  performance: 'cost',
  integration: 'backend_api',
  product_design: 'ux_ui',
  sysadmin: 'infrastructure',
  sre: 'incident',
  devops: 'deployment',
  qa: 'verification'
});

/**
 * Custom Error for Domain Contract violations
 */
export class DomainContractError extends Error {
  constructor(message, domain = null, field = null) {
    super(message);
    this.name = 'DomainContractError';
    this.domain = domain;
    this.field = field;
  }
}

/**
 * Custom Error for Domain Boundary violations
 */
export class BoundaryViolationError extends Error {
  constructor(message, domain = null, action = null) {
    super(message);
    this.name = 'BoundaryViolationError';
    this.domain = domain;
    this.action = action;
  }
}

/**
 * Resolves any domain string or alias to its canonical domain ID
 * @param {string} domainOrAlias 
 * @returns {string} Canonical domain ID
 */
export function resolveCanonicalDomain(domainOrAlias) {
  if (!domainOrAlias || typeof domainOrAlias !== 'string') {
    throw new DomainContractError(`Domain must be a non-empty string (got: ${domainOrAlias})`);
  }
  const normalized = domainOrAlias.toLowerCase().trim();
  if (DAVE_CANONICAL_DOMAINS.includes(normalized)) {
    return normalized;
  }
  if (DAVE_DOMAIN_ALIASES[normalized]) {
    return DAVE_DOMAIN_ALIASES[normalized];
  }
  return normalized;
}

/**
 * Default specifications for all 20 canonical decision domains
 */
export const CANONICAL_DOMAIN_SPECS = Object.freeze({
  product: {
    id: 'product',
    name: 'Product Strategy & Requirements',
    description: 'Defines business intent, user personas, KPI metrics, scope boundaries, and acceptance criteria.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['user_job_story', 'business_metrics', 'scope_manifest', 'acceptance_criteria'],
    required_inputs: ['goal_id', 'user_personas', 'problem_statement', 'success_metrics'],
    required_outputs: ['epic_scope', 'acceptance_contract', 'feature_breakdown'],
    allowed_actions: ['define_requirements', 'propose_scope', 'set_kpis', 'prioritize_backlog', 'review_product_spec'],
    forbidden_actions: ['deploy_production', 'execute_code', 'bypass_auth', 'mutate_database_schema'],
    verification_harnesses: [
      'scripts/harness/goal-template-conformance-harness.mjs',
      'scripts/harness/goal-scope-drift-harness.mjs'
    ]
  },
  game_architecture: {
    id: 'game_architecture',
    name: 'Game Engine & Architecture',
    description: 'Governs game loops, Entity Component System (ECS) topologies, physics subsystems, and deterministic state sync.',
    risk_classes: ['medium', 'high'],
    default_risk: 'high',
    required_evidence: ['ecs_topology', 'frame_budget_manifest', 'state_sync_protocol', 'physics_config'],
    required_inputs: ['tick_rate', 'component_archetypes', 'system_execution_order'],
    required_outputs: ['ecs_manifest', 'frame_budget_sla', 'state_delta_contract'],
    allowed_actions: ['design_ecs_topology', 'schedule_systems', 'allocate_frame_budget', 'configure_physics'],
    forbidden_actions: ['deploy_production', 'bypass_auth', 'mutate_financial_ledger'],
    verification_harnesses: [
      'scripts/harness/realtime-graph-flamegraph-harness.mjs',
      'scripts/harness/agent-workflow-harness.mjs'
    ]
  },
  game_design: {
    id: 'game_design',
    name: 'Game Mechanics & Systems Design',
    description: 'Specifies gameplay loops, progression curves, in-game economy sinks/sources, and balancing tables.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['mechanics_balance_table', 'economy_sink_source_model', 'progression_curves'],
    required_inputs: ['core_loop_description', 'player_progression_tiers', 'economy_tokens'],
    required_outputs: ['balance_sheet', 'loot_table_manifest', 'level_progression_spec'],
    allowed_actions: ['tune_balance', 'design_mechanics', 'configure_loot_tables', 'model_economy'],
    forbidden_actions: ['deploy_production', 'bypass_auth', 'mutate_database_schema', 'grant_admin_privileges'],
    verification_harnesses: [
      'scripts/harness/agent-workflow-harness.mjs',
      'scripts/harness/mathematical-invariant-proof-harness.mjs'
    ]
  },
  ux_ui: {
    id: 'ux_ui',
    name: 'UX/UI Design & Information Architecture',
    description: 'Governs user journeys, wireframes, design token extraction, spatial layout grids, and interactive states.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['design_tokens', 'reference_screenshot', 'component_inventory', 'viewport_matrix'],
    required_inputs: ['user_journey', 'viewport_spec', 'typography_tokens', 'color_palette'],
    required_outputs: ['ui_spec', 'component_states', 'responsive_layout_contract'],
    allowed_actions: ['design_layout', 'propose_wireframe', 'extract_tokens', 'define_states', 'audit_heuristics'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'bypass_auth', 'grant_permissions'],
    verification_harnesses: [
      'scripts/harness/ui-spec-conformance-harness.mjs',
      'scripts/harness/token-guardrail-harness.mjs',
      'scripts/harness/visual-regression-harness.mjs'
    ]
  },
  frontend: {
    id: 'frontend',
    name: 'Frontend Implementation & Client Engineering',
    description: 'Implements React/DOM component trees, CSS layouts, local state management, and deterministic client hydration.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['component_states', 'dom_hierarchy', 'design_tokens', 'fixture_data'],
    required_inputs: ['component_name', 'props_contract', 'css_tokens', 'touch_map'],
    required_outputs: ['component_source', 'storybook_story', 'component_test'],
    allowed_actions: ['implement_component', 'extract_tokens', 'write_component_test', 'create_storybook_fixture'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'bypass_auth', 'grant_permissions', 'modify_cloud_infra'],
    verification_harnesses: [
      'scripts/harness/component-storybook-cdd-harness.mjs',
      'scripts/harness/ui-harness.mjs',
      'scripts/harness/visual-regression-harness.mjs'
    ]
  },
  backend_api: {
    id: 'backend_api',
    name: 'Backend Services & API Contracts',
    description: 'Governs REST/gRPC/GraphQL contracts, request validation, service handlers, idempotency, and IPC messaging.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['api_contract_spec', 'validation_schema', 'idempotency_key_policy', 'error_taxonomy'],
    required_inputs: ['endpoint_path', 'http_method', 'request_schema', 'response_schema'],
    required_outputs: ['api_route_handler', 'openapi_spec', 'integration_test'],
    allowed_actions: ['implement_endpoint', 'define_api_contract', 'configure_rate_limit', 'register_route', 'handle_request'],
    forbidden_actions: ['deploy_production', 'bypass_auth', 'drop_database_table', 'disable_rate_limiting'],
    verification_harnesses: [
      'scripts/harness/universal-contract-harness.mjs',
      'scripts/harness/e2e-live-integration-harness.mjs'
    ]
  },
  database: {
    id: 'database',
    name: 'Database Architecture & Persistence',
    description: 'Manages relational schemas, DDL migrations, Row-Level Security (RLS) policies, query optimization, and minor-unit financial isolation.',
    risk_classes: ['medium', 'high'],
    default_risk: 'high',
    required_evidence: ['schema_ddl', 'migration_plan', 'rls_policy', 'rollback_sql'],
    required_inputs: ['table_name', 'columns_def', 'foreign_keys', 'indexes', 'rls_predicates'],
    required_outputs: ['migration_file', 'up_down_sql', 'query_benchmark'],
    allowed_actions: ['create_migration', 'optimize_index', 'define_rls', 'audit_queries', 'execute_migration'],
    forbidden_actions: ['bypass_auth', 'drop_table_without_backup', 'disable_rls', 'deploy_production', 'delete_all_records'],
    verification_harnesses: [
      'scripts/harness/database-rls-geo-sharding-harness.mjs',
      'scripts/harness/g252-database-rls-geo-sharding-harness.mjs'
    ]
  },
  security: {
    id: 'security',
    name: 'Security Engineering & Zero-Trust Governance',
    description: 'Enforces STRIDE threat modeling, sandbox memory ceilings, PII scrubbing, Ed25519 token authentication, and cryptographic access controls.',
    risk_classes: ['high'],
    default_risk: 'high',
    required_evidence: ['threat_model', 'sandboxing_spec', 'auth_tokens', 'pii_scrubbing_manifest'],
    required_inputs: ['trust_boundary', 'authentication_scheme', 'sandbox_memory_limit_mb'],
    required_outputs: ['security_policy', 'audit_rule', 'threat_matrix'],
    allowed_actions: ['threat_model', 'audit_security_boundary', 'configure_sandbox', 'enforce_pii_vault', 'threat_model_review'],
    forbidden_actions: ['grant_unrestricted_root', 'disable_sandboxing', 'bypass_pii_scrubber', 'hardcode_credentials'],
    verification_harnesses: [
      'scripts/harness/security-boundary-harness.mjs',
      'scripts/harness/g247-statutory-pii-vault-harness.mjs'
    ]
  },
  accessibility: {
    id: 'accessibility',
    name: 'Accessibility & Universal Inclusion',
    description: 'Ensures WCAG 2.2 AA/AAA compliance, minimum 4.5:1 contrast ratios, screen reader semantics, and keyboard focus trapping.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['wcag_contrast_ratio', 'screen_reader_semantics', 'keyboard_navigation_matrix'],
    required_inputs: ['target_element', 'contrast_ratio', 'aria_roles', 'tabindex_flow'],
    required_outputs: ['a11y_scorecard', 'aria_patch', 'keyboard_trap_spec'],
    allowed_actions: ['audit_contrast', 'generate_aria_attributes', 'verify_keyboard_navigation', 'enforce_wcag'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'bypass_auth'],
    verification_harnesses: [
      'scripts/harness/ui-spec-conformance-harness.mjs',
      'scripts/harness/component-storybook-cdd-harness.mjs'
    ]
  },
  motion: {
    id: 'motion',
    name: 'Motion Design & Physics Animation',
    description: 'Choreographs physics-based springs, frame rate budgets (60fps/120fps), skeleton shimmer sweeps, and prefers-reduced-motion fallbacks.',
    risk_classes: ['low', 'medium'],
    default_risk: 'low',
    required_evidence: ['spring_physics_curve', 'frame_budget_60fps', 'prefers_reduced_motion_fallback'],
    required_inputs: ['spring_stiffness', 'spring_damping', 'duration_ms', 'reduced_motion_variant'],
    required_outputs: ['animation_spec', 'css_keyframes', 'motion_token'],
    allowed_actions: ['choreograph_spring', 'profile_frame_rate', 'define_reduced_motion', 'create_transition'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'bypass_auth', 'modify_routes'],
    verification_harnesses: [
      'scripts/harness/motion-harness.mjs'
    ]
  },
  audio: {
    id: 'audio',
    name: 'Audio Design & UI Sonification',
    description: 'Synthesizes Web Audio earcons, loudness targets (-14 to -23 LUFS), sub-100ms latency budgets, and accessible mute controls.',
    risk_classes: ['low', 'medium'],
    default_risk: 'low',
    required_evidence: ['earcon_audio_spec', 'lufs_loudness_target', 'latency_budget_ms'],
    required_inputs: ['sound_trigger', 'waveform_format', 'loudness_lufs', 'playback_sla_ms'],
    required_outputs: ['audio_asset', 'audio_manifest', 'sonification_controller'],
    allowed_actions: ['generate_earcon', 'verify_loudness_lufs', 'configure_sound_profile', 'test_latency'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'modify_routes', 'bypass_auth'],
    verification_harnesses: [
      'scripts/harness/audio-harness.mjs'
    ]
  },
  asset: {
    id: 'asset',
    name: 'Visual Assets & Media Optimization',
    description: 'Manages WebP/AVIF vector and raster asset pipelines, exact pixel density (1x/2x/3x), color profiles, and content-addressed digests.',
    risk_classes: ['low', 'medium'],
    default_risk: 'low',
    required_evidence: ['asset_compression_ratio', 'sha256_content_hash', 'aspect_ratio_manifest'],
    required_inputs: ['source_image_path', 'target_formats', 'compression_quality', 'max_byte_budget'],
    required_outputs: ['optimized_asset_bundle', 'asset_manifest_entry'],
    allowed_actions: ['optimize_asset', 'verify_content_hash', 'generate_srcset', 'compress_image'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'bypass_auth'],
    verification_harnesses: [
      'scripts/harness/asset-harness.mjs',
      'scripts/harness/dave-reference-harness.mjs'
    ]
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Cloud Infrastructure & Compute Governance',
    description: 'Controls POSIX/Wasmtime sandboxing, CGroups v2 memory ceilings (256MB), network isolation topologies, and resource quotas.',
    risk_classes: ['medium', 'high'],
    default_risk: 'high',
    required_evidence: ['cgroup_v2_limits', 'wasm_sandbox_config', 'network_topology', 'quota_manifest'],
    required_inputs: ['memory_ceiling_mb', 'cpu_quota_percent', 'sandbox_runtime', 'network_policy'],
    required_outputs: ['infra_spec', 'container_manifest', 'resource_budget_receipt'],
    allowed_actions: ['provision_sandbox', 'enforce_resource_ceilings', 'configure_cgroups', 'audit_network_egress'],
    forbidden_actions: ['disable_sandbox_isolation', 'grant_root_privilege', 'bypass_quota_limits', 'deploy_production'],
    verification_harnesses: [
      'scripts/harness/resource-budget-harness.mjs',
      'scripts/harness/g-infra-014-harness.mjs'
    ]
  },
  deployment: {
    id: 'deployment',
    name: 'Deployment Orchestration & Release Engineering',
    description: 'Executes canary deployments, blue-green traffic shifting, automated rollback triggers, and SLO-guarded promotion gates.',
    risk_classes: ['high'],
    default_risk: 'high',
    required_evidence: ['canary_plan', 'rollback_contract', 'slo_manifest', 'health_check_endpoint'],
    required_inputs: ['release_version', 'traffic_split_percent', 'rollback_trigger_criteria'],
    required_outputs: ['deployment_manifest', 'release_receipt', 'rollback_runbook'],
    allowed_actions: ['deploy_canary', 'shift_traffic', 'trigger_rollback', 'validate_health_probes'],
    forbidden_actions: ['deploy_without_rollback_plan', 'bypass_ci_gates', 'force_push_production'],
    verification_harnesses: [
      'scripts/harness/failure-rollback-harness.mjs',
      'scripts/harness/e2e-live-integration-harness.mjs'
    ]
  },
  verification: {
    id: 'verification',
    name: 'Test Verification & Mathematical Proofs',
    description: 'Orchestrates unit test suites, property-based combinatorial testing, chaos injection, and epistemic proof receipt issuance.',
    risk_classes: ['low', 'medium', 'high'],
    default_risk: 'low',
    required_evidence: ['test_suite_manifest', 'property_tests', 'proof_receipt', 'coverage_report'],
    required_inputs: ['test_command', 'expected_exit_code', 'assertion_count', 'target_goal_id'],
    required_outputs: ['verification_receipt', 'flaky_test_telemetry', 'proof_certificate'],
    allowed_actions: ['run_test_suite', 'issue_proof_receipt', 'run_property_test', 'assert_invariants'],
    forbidden_actions: ['fake_test_results', 'skip_failing_assertions', 'deploy_production', 'mutate_database_schema'],
    verification_harnesses: [
      'scripts/harness/goal-assurance-suite.mjs',
      'scripts/harness/mathematical-invariant-proof-harness.mjs'
    ]
  },
  confidence: {
    id: 'confidence',
    name: 'Model Confidence & Uncertainty Calibration',
    description: 'Measures Expected Calibration Error (ECE <= 0.0400), Brier scores, High-Confidence Error Rates, and routing thresholds.',
    risk_classes: ['medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['ece_calibration_score', 'brier_score', 'asymmetric_reward_log', 'reliability_diagram'],
    required_inputs: ['confidence_score', 'labeled_outcomes', 'bin_count', 'ece_ceiling'],
    required_outputs: ['calibration_metrics', 'brier_telemetry', 'ece_drift_alert'],
    allowed_actions: ['calibrate_confidence', 'compute_ece', 'track_brier_drift', 'score_logarithmic_reward'],
    forbidden_actions: ['override_ece_gate', 'inflate_confidence_scores', 'deploy_production'],
    verification_harnesses: [
      'scripts/harness/confidence-calibration-harness.mjs',
      'scripts/ci/ci-calibration-gate.mjs'
    ]
  },
  rlcd: {
    id: 'rlcd',
    name: 'RLCD & Reinforcement Learning from Continuous Doubt',
    description: 'Applies CARL entropy preservation, strictly proper logarithmic rewards, and 10x asymmetric false acceptance penalties to decision trajectories.',
    risk_classes: ['medium', 'high'],
    default_risk: 'medium',
    required_evidence: ['trajectory_log', 'logarithmic_reward', 'overconfidence_penalty', 'loss_gradient_manifest'],
    required_inputs: ['decision_trajectory_path', 'penalty_multiplier_cfa', 'output_dataset_path'],
    required_outputs: ['scored_rlcd_dataset', 'loss_telemetry', 'training_manifest'],
    allowed_actions: ['export_rlcd_data', 'compute_doubt_penalty', 'train_calibration_head', 'log_trajectory'],
    forbidden_actions: ['suppress_overconfidence_penalty', 'corrupt_trajectory_ledger', 'deploy_production'],
    verification_harnesses: [
      'scripts/harness/model-training-contract-harness.mjs',
      'tests/unit/test-dave-engine.mjs'
    ]
  },
  governance: {
    id: 'governance',
    name: 'Human Governance & Decision Approvals',
    description: 'Synthesizes compact Human-in-the-Loop review packets, manages risk escalation gates, and verifies cryptographic authorization tokens.',
    risk_classes: ['high'],
    default_risk: 'high',
    required_evidence: ['review_packet', 'human_action_gate', 'audit_hash_chain', 'decision_citations'],
    required_inputs: ['decision_id', 'risk_level', 'confidence_score', 'human_action_selected'],
    required_outputs: ['human_approval_receipt', 'adjudication_log', 'authorization_token'],
    allowed_actions: ['format_review_packet', 'request_human_approval', 'escalate_risk', 'record_approval'],
    forbidden_actions: ['bypass_human_review', 'auto_approve_high_risk', 'silence_conflict_alert'],
    verification_harnesses: [
      'scripts/harness/dave-decision-trace-harness.mjs',
      'scripts/harness/cryptographic-audit-nonce-harness.mjs'
    ]
  },
  cost: {
    id: 'cost',
    name: 'FinOps, Resource Latency & Cost Optimization',
    description: 'Tracks token budgets, inference latencies (p99 < 100ms), cloud compute allocations, and exact ISO 4217 minor-unit integer accounting.',
    risk_classes: ['low', 'medium'],
    default_risk: 'low',
    required_evidence: ['token_budget', 'cloud_compute_cost', 'latency_p99', 'cost_ledger'],
    required_inputs: ['token_count', 'compute_duration_ns', 'budget_ceiling_minor'],
    required_outputs: ['cost_telemetry_receipt', 'budget_audit_entry', 'latency_profile'],
    allowed_actions: ['track_latency', 'audit_token_expenditure', 'enforce_compute_budget', 'calculate_monetary_cost'],
    forbidden_actions: ['deploy_production', 'mutate_database_schema', 'exceed_token_budget_without_alert'],
    verification_harnesses: [
      'scripts/harness/resource-budget-harness.mjs',
      'scripts/harness/f37-universal-quota-conformance-harness.mjs'
    ]
  },
  incident: {
    id: 'incident',
    name: 'Incident Response & Production Triage',
    description: 'Governs high-severity outage triage, runbook execution (PB-CAL-001..004), automated circuit breaker trips, and postmortem audits.',
    risk_classes: ['high'],
    default_risk: 'high',
    required_evidence: ['severity_triage', 'runbook_steps', 'postmortem_template', 'trip_telemetry'],
    required_inputs: ['incident_id', 'severity_level', 'failure_signature', 'impacted_services'],
    required_outputs: ['incident_triage_log', 'circuit_breaker_action', 'postmortem_document'],
    allowed_actions: ['triage_incident', 'trip_circuit_breaker', 'execute_runbook', 'compile_postmortem'],
    forbidden_actions: ['close_incident_without_postmortem', 'silence_p0_alert', 'bypass_incident_lead'],
    verification_harnesses: [
      'scripts/harness/failure-rollback-harness.mjs',
      'scripts/harness/dual-transport-chaos-harness.mjs'
    ]
  }
});

/**
 * Expert Registry coordinating domain specialist capabilities, schemas,
 * verification harnesses, and boundary permissions.
 */
export class DaveExpertRegistry {
  constructor() {
    this.domains = new Map();
    this.experts = new Map();
    this.initializeDefaultDomains();
  }

  /**
   * Initializes all 20 canonical domains with standard contracts
   */
  initializeDefaultDomains() {
    for (const [id, spec] of Object.entries(CANONICAL_DOMAIN_SPECS)) {
      this.domains.set(id, { ...spec });
      // Default expert provider registration
      this.experts.set(id, {
        domain: id,
        provider_name: `Default${spec.name.replace(/[^A-Za-z0-9]/g, '')}Expert`,
        allowed_actions: [...spec.allowed_actions],
        forbidden_actions: [...spec.forbidden_actions],
        verification_harnesses: [...spec.verification_harnesses],
        registered_at: new Date().toISOString()
      });
    }
  }

  /**
   * Check if domain is registered (supports aliases)
   * @param {string} domainOrAlias 
   * @returns {boolean}
   */
  hasDomain(domainOrAlias) {
    try {
      const canonical = resolveCanonicalDomain(domainOrAlias);
      return this.domains.has(canonical);
    } catch {
      return false;
    }
  }

  /**
   * Get domain specification descriptor (supports aliases)
   * @param {string} domainOrAlias 
   * @returns {object} Domain specification
   */
  getDomain(domainOrAlias) {
    const canonical = resolveCanonicalDomain(domainOrAlias);
    const domain = this.domains.get(canonical);
    if (!domain) {
      throw new DomainContractError(`Domain '${domainOrAlias}' (canonical: '${canonical}') is not registered`, domainOrAlias);
    }
    return { ...domain };
  }

  /**
   * List all registered canonical domain specifications
   * @returns {Array<object>}
   */
  listDomains() {
    return Array.from(this.domains.values()).map(d => ({ ...d }));
  }

  /**
   * Register or override an expert provider for a specific domain
   * @param {object} expertConfig 
   */
  registerDomainExpert(expertConfig) {
    if (!expertConfig || typeof expertConfig !== 'object') {
      throw new DomainContractError('Expert configuration must be a non-null object');
    }

    const { domain, provider_name, allowed_actions, forbidden_actions = [], verification_harnesses } = expertConfig;

    if (!domain) {
      throw new DomainContractError('Expert registration requires a valid domain identifier', null, 'domain');
    }

    const canonical = resolveCanonicalDomain(domain);
    if (!this.domains.has(canonical)) {
      throw new DomainContractError(`Cannot register expert for unknown domain '${domain}' (canonical: '${canonical}')`, domain, 'domain');
    }

    if (!Array.isArray(allowed_actions) || allowed_actions.length === 0) {
      throw new DomainContractError(`Expert for domain '${domain}' must define non-empty allowed_actions array`, domain, 'allowed_actions');
    }

    if (!Array.isArray(verification_harnesses) || verification_harnesses.length === 0) {
      throw new DomainContractError(`Expert for domain '${domain}' must define at least 1 verification harness mapping`, domain, 'verification_harnesses');
    }

    const domainSpec = this.domains.get(canonical);
    const mergedForbidden = Array.from(new Set([...domainSpec.forbidden_actions, ...forbidden_actions]));

    const record = {
      domain: canonical,
      provider_name: provider_name || `Expert_${canonical}_${Date.now()}`,
      allowed_actions: [...allowed_actions],
      forbidden_actions: mergedForbidden,
      verification_harnesses: [...verification_harnesses],
      registered_at: new Date().toISOString()
    };

    this.experts.set(canonical, record);
    return record;
  }

  /**
   * Get registered expert for a domain
   * @param {string} domainOrAlias 
   * @returns {object} Registered expert
   */
  getDomainExpert(domainOrAlias) {
    const canonical = resolveCanonicalDomain(domainOrAlias);
    const expert = this.experts.get(canonical);
    if (!expert) {
      throw new DomainContractError(`No expert provider registered for domain '${canonical}'`, canonical);
    }
    return { ...expert };
  }

  /**
   * List all registered domain experts
   * @returns {Array<object>}
   */
  listDomainExperts() {
    return Array.from(this.experts.values()).map(e => ({ ...e }));
  }

  /**
   * Validate a domain proposal payload against the domain contract
   * @param {string} domainOrAlias 
   * @param {object} proposal 
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateDomainProposal(domainOrAlias, proposal) {
    const errors = [];
    const canonical = resolveCanonicalDomain(domainOrAlias);
    const domain = this.getDomain(canonical);
    const expert = this.getDomainExpert(canonical);

    if (!proposal || typeof proposal !== 'object') {
      return { valid: false, errors: ['Proposal must be a non-null object'] };
    }

    // 1. Action permissions check
    if (proposal.action) {
      if (expert.forbidden_actions.includes(proposal.action)) {
        errors.push(`Action '${proposal.action}' is explicitly forbidden for domain '${canonical}'`);
      } else if (!expert.allowed_actions.includes(proposal.action)) {
        errors.push(`Action '${proposal.action}' is not in allowed actions for domain '${canonical}'`);
      }
    }

    // 2. Evidence requirement check
    if (!Array.isArray(proposal.evidence) || proposal.evidence.length === 0) {
      errors.push(`Proposal requires non-empty evidence citations matching domain '${canonical}' requirements: [${domain.required_evidence.join(', ')}]`);
    }

    // 3. Payload object check
    if (!proposal.payload || typeof proposal.payload !== 'object') {
      errors.push('Proposal must contain a structured payload object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Default singleton instance of DaveExpertRegistry
 */
let defaultRegistryInstance = null;

/**
 * Returns the singleton instance of DaveExpertRegistry
 * @returns {DaveExpertRegistry}
 */
export function getDefaultExpertRegistry() {
  if (!defaultRegistryInstance) {
    defaultRegistryInstance = new DaveExpertRegistry();
  }
  return defaultRegistryInstance;
}

/**
 * Enforces boundary checks fail-closed.
 * Throws BoundaryViolationError if action is forbidden or unauthorized.
 * 
 * @param {string} domain 
 * @param {string} action 
 * @param {DaveExpertRegistry} [registry] 
 * @returns {boolean} True if permitted
 */
export function enforceBoundary(domain, action, registry = getDefaultExpertRegistry()) {
  const canonical = resolveCanonicalDomain(domain);
  const expert = registry.getDomainExpert(canonical);

  if (!action || typeof action !== 'string') {
    throw new BoundaryViolationError(`Invalid action '${action}' for domain '${canonical}'`, canonical, action);
  }

  // Strictly check forbidden actions first
  if (expert.forbidden_actions.includes(action)) {
    throw new BoundaryViolationError(
      `SECURITY BOUNDARY BREACH: Action '${action}' is forbidden for domain '${canonical}'`,
      canonical,
      action
    );
  }

  // Check allowed actions
  if (!expert.allowed_actions.includes(action)) {
    throw new BoundaryViolationError(
      `UNAUTHORIZED ACTION: Action '${action}' is not permitted for domain '${canonical}'. Allowed: [${expert.allowed_actions.join(', ')}]`,
      canonical,
      action
    );
  }

  return true;
}

/**
 * Dispatch an intent payload to the target domain specialist.
 * Evaluates attributes (domain, task_type, action, tags, keywords) and validates boundaries.
 * 
 * @param {object} intentPayload 
 * @param {DaveExpertRegistry} [registry] 
 * @returns {object} Dispatch Result
 */
export function dispatchIntent(intentPayload, registry = getDefaultExpertRegistry()) {
  if (!intentPayload || typeof intentPayload !== 'object') {
    throw new DomainContractError('Intent payload must be a non-null object');
  }

  let targetDomain = null;

  // 1. Direct explicit domain
  if (intentPayload.domain) {
    targetDomain = resolveCanonicalDomain(intentPayload.domain);
  }

  // 2. Inspect task_type
  if (!targetDomain && intentPayload.task_type) {
    const rawType = String(intentPayload.task_type).toLowerCase();
    for (const candidate of DAVE_CANONICAL_DOMAINS) {
      if (rawType.includes(candidate)) {
        targetDomain = candidate;
        break;
      }
    }
    if (!targetDomain) {
      for (const [alias, canonical] of Object.entries(DAVE_DOMAIN_ALIASES)) {
        if (rawType.includes(alias)) {
          targetDomain = canonical;
          break;
        }
      }
    }
  }

  // 3. Inspect tags
  if (!targetDomain && Array.isArray(intentPayload.tags)) {
    for (const tag of intentPayload.tags) {
      const lowerTag = String(tag).toLowerCase();
      if (registry.hasDomain(lowerTag)) {
        targetDomain = resolveCanonicalDomain(lowerTag);
        break;
      }
    }
  }

  // 4. Inspect intent text keywords
  if (!targetDomain && typeof intentPayload.intent === 'string') {
    const text = intentPayload.intent.toLowerCase();
    const keywordMap = [
      { kw: ['wcag', 'contrast', 'accessibility', 'screen reader'], domain: 'accessibility' },
      { kw: ['spring', 'motion', 'animation', 'frame rate'], domain: 'motion' },
      { kw: ['earcon', 'audio', 'sound', 'lufs'], domain: 'audio' },
      { kw: ['asset', 'image', 'webp', 'avif', 'crop'], domain: 'asset' },
      { kw: ['ecs', 'physics', 'game loop'], domain: 'game_architecture' },
      { kw: ['mechanics', 'progression', 'loot', 'game design', 'economy'], domain: 'game_design' },
      { kw: ['migration', 'database', 'sql', 'rls', 'postgres'], domain: 'database' },
      { kw: ['threat', 'auth', 'sandbox', 'pii', 'security'], domain: 'security' },
      { kw: ['canary', 'deploy', 'rollback', 'release'], domain: 'deployment' },
      { kw: ['component', 'react', 'dom', 'css', 'frontend'], domain: 'frontend' },
      { kw: ['endpoint', 'api', 'rest', 'grpc', 'backend'], domain: 'backend_api' },
      { kw: ['layout', 'wireframe', 'token', 'ux', 'ui'], domain: 'ux_ui' },
      { kw: ['proof', 'property test', 'harness', 'verification'], domain: 'verification' },
      { kw: ['calibration', 'ece', 'brier', 'confidence'], domain: 'confidence' },
      { kw: ['doubt', 'logarithmic reward', 'penalty', 'rlcd'], domain: 'rlcd' },
      { kw: ['review packet', 'approval', 'human review', 'governance'], domain: 'governance' },
      { kw: ['token budget', 'latency', 'finops', 'cost'], domain: 'cost' },
      { kw: ['incident', 'outage', 'triage', 'circuit breaker'], domain: 'incident' },
      { kw: ['sandbox', 'cgroups', 'infra', 'infrastructure'], domain: 'infrastructure' },
      { kw: ['requirements', 'persona', 'user job', 'product'], domain: 'product' }
    ];

    for (const item of keywordMap) {
      if (item.kw.some(k => text.includes(k))) {
        targetDomain = item.domain;
        break;
      }
    }
  }

  if (!targetDomain) {
    throw new DomainContractError(
      `Unable to resolve intent to a registered DAVE domain: ${JSON.stringify(intentPayload)}`
    );
  }

  const action = intentPayload.action || 'propose';
  // Enforce security boundaries
  enforceBoundary(targetDomain, action, registry);

  const expert = registry.getDomainExpert(targetDomain);
  const domainSpec = registry.getDomain(targetDomain);

  return {
    domain: targetDomain,
    action,
    allowed: true,
    expert,
    domain_spec: domainSpec,
    preflight_harnesses: [...expert.verification_harnesses]
  };
}

/**
 * Returns preflight verification harnesses mapped to a given domain
 * @param {string} domain 
 * @param {DaveExpertRegistry} [registry] 
 * @returns {Array<string>} Array of executable test harness script paths
 */
export function getPreflightHarnesses(domain, registry = getDefaultExpertRegistry()) {
  const canonical = resolveCanonicalDomain(domain);
  const expert = registry.getDomainExpert(canonical);
  return [...expert.verification_harnesses];
}

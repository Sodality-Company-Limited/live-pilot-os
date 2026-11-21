/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS FIXTURES: Deterministic Workspace Component Fixtures
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: WEB (DAVE Exact Web Application Pipeline)
 * Goal Reference: G-WEB-005 (Component-First Implementation)
 * Specification: docs/02-product/design/component-inventory.md
 * Behavior Matrix: docs/02-product/design/component-states.md
 * Invariants: Zero Mocks, Zero Stubs, Zero Raw Hex Codes, Deterministic Fixtures.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { CommandRailProps } from '../CommandRail';
import { DecisionCanvasProps, DaveDecisionPayload } from '../DecisionCanvas';
import { EvidencePanelProps, DaveReferencePayload, AuditLogEntry, CalibrationMetrics } from '../EvidencePanel';

// Long text test payload to verify overflow and layout bounding under extreme strings
export const LONG_PARAGRAPH_PAYLOAD = `The DAVE System 1 Decision Runtime is engineered to execute bounded, calibrated, and deterministic decisions across complex multi-modal operational environments. In contrast to ungrounded autoregressive language generation, every proposition generated under DAVE exact-design governance is constrained by physical design tokens codified in the system design repository, verified against high-resolution reference images using SHA-256 cryptographic digests, evaluated for layout shift invariants to ensure zero Cumulative Layout Shift (CLS = 0.0000), and subjected to strictly proper scoring rules with asymmetric 10x penalties for overconfident errors. When an agent synthesizes an architectural decision, it must not only produce the primary operational recommendation, but also explicitly document and justify all rejected alternatives, establish quantitative confidence intervals calibrated on empirical historical episodes, and submit the proposal to fail-closed gatekeeping before any file mutation is unlocked within the project workspace.`;

// ─── 1. CommandRail Fixtures (5 States + Edge Cases) ──────────────────────────

export const commandRailFixtures: Record<'empty' | 'loading' | 'partial' | 'full' | 'error', CommandRailProps> = {
  empty: {
    workspaceId: 'ws-default-001',
    workspaceName: 'Default Workspace',
    activeGoalId: null,
    activeGoalTitle: null,
    agentStatus: 'idle',
    calibratedConfidence: 0.0,
    state: 'empty',
    onOpenCommandPalette: () => console.log('Action: open_command_palette'),
    onSwitchWorkspace: (id) => console.log(`Action: switch_workspace(${id})`),
    onToggleTheme: () => console.log('Action: toggle_theme')
  },

  loading: {
    workspaceId: 'ws-active-042',
    workspaceName: 'Soda OS Web Pipeline',
    activeGoalId: 'G-WEB-005',
    activeGoalTitle: 'Component-First Implementation',
    agentStatus: 'evaluating',
    calibratedConfidence: 0.94,
    state: 'loading',
    onOpenCommandPalette: () => console.log('Action: open_command_palette'),
    onSwitchWorkspace: (id) => console.log(`Action: switch_workspace(${id})`),
    onToggleTheme: () => console.log('Action: toggle_theme')
  },

  partial: {
    workspaceId: 'ws-active-042',
    workspaceName: 'Soda OS Web Pipeline',
    activeGoalId: 'G-WEB-005',
    activeGoalTitle: 'Component-First Implementation',
    agentStatus: 'routing',
    calibratedConfidence: 0.88,
    state: 'partial',
    onOpenCommandPalette: () => console.log('Action: open_command_palette'),
    onSwitchWorkspace: (id) => console.log(`Action: switch_workspace(${id})`),
    onToggleTheme: () => console.log('Action: toggle_theme')
  },

  full: {
    workspaceId: 'ws-active-042',
    workspaceName: 'Soda OS Web Pipeline',
    activeGoalId: 'G-WEB-005',
    activeGoalTitle: 'Component-First Implementation',
    agentStatus: 'verified',
    calibratedConfidence: 0.96,
    state: 'full',
    onOpenCommandPalette: () => console.log('Action: open_command_palette'),
    onSwitchWorkspace: (id) => console.log(`Action: switch_workspace(${id})`),
    onToggleTheme: () => console.log('Action: toggle_theme')
  },

  error: {
    workspaceId: 'ws-active-042',
    workspaceName: 'Soda OS Web Pipeline',
    activeGoalId: 'G-WEB-005',
    activeGoalTitle: 'Component-First Implementation',
    agentStatus: 'quarantined',
    calibratedConfidence: 0.22,
    state: 'error',
    errorCode: 'ERR_SOCKET_TIMEOUT',
    errorMessage: 'Live updates suspended. Click Retry or check local daemon port 8080.',
    onRetryConnection: () => console.log('Action: retry_connection'),
    onOpenCommandPalette: () => console.log('Action: open_command_palette'),
    onSwitchWorkspace: (id) => console.log(`Action: switch_workspace(${id})`),
    onToggleTheme: () => console.log('Action: toggle_theme')
  }
};

// ─── 2. DecisionCanvas Fixtures (5 States + Edge Cases) ────────────────────────

const sampleDecisions: DaveDecisionPayload[] = [
  {
    decision_id: 'DAVE-FE-0002',
    decision_type: 'frontend_implementation',
    summary: 'Component-First Implementation specification under DAVE governance strictly binding CommandRail, DecisionCanvas, and EvidencePanel to approved tokens with zero raw hex codes and zero CLS layout guarantees.',
    confidence: 0.96,
    risk: 'low',
    primary_action: 'implement_workspace_components',
    alternatives_rejected: [
      'Ad-hoc freeform implementation without reference citations rejected due to visual drift risks',
      'Inline style hex values rejected due to violation of ADR-005 token guardrails',
      'Dynamic variable height layout rejected due to Cumulative Layout Shift breach'
    ],
    evidence: [
      'code/src/components/CommandRail.tsx',
      'code/src/components/DecisionCanvas.tsx',
      'code/src/components/EvidencePanel.tsx'
    ],
    references: ['REF-0001', 'REF-0005']
  },
  {
    decision_id: 'DAVE-UX-0003',
    decision_type: 'ux_ui_design',
    summary: 'Component State Specification establishing a deterministic 5-State Behavior Matrix (Empty, Loading, Partial, Full, Error) with layout reservation skeletons and actionable error remediation.',
    confidence: 0.93,
    risk: 'low',
    primary_action: 'codify_component_states',
    alternatives_rejected: [
      'Generic loading spinners rejected due to layout thrashing during hydration',
      'Vague error microcopy rejected under Constitutional Article III observability standards'
    ],
    evidence: [
      'docs/02-product/design/component-inventory.md',
      'docs/02-product/design/component-states.md'
    ],
    references: ['REF-0001']
  },
  {
    decision_id: 'DAVE-SEC-0001',
    decision_type: 'security_governance',
    summary: 'Multimodal Reference Privacy and Security Controls enforcing byte-level EXIF metadata stripping, visual PII masking, and filesystem sandboxing.',
    confidence: 0.98,
    risk: 'normal',
    primary_action: 'enforce_security_boundary',
    alternatives_rejected: [
      'Client-side sanitization alone rejected due to adversarial bypass potential'
    ],
    evidence: ['scripts/lib/multimodal-reference-guard.mjs'],
    references: ['REF-0001']
  }
];

export const decisionCanvasFixtures: Record<'empty' | 'loading' | 'partial' | 'full' | 'error', DecisionCanvasProps> = {
  empty: {
    goalId: 'G-WEB-005',
    goalTitle: 'Component-First Implementation',
    goalKind: 'feature',
    lifecycleState: 'spec',
    decisions: [],
    activeDecisionId: null,
    state: 'empty',
    onRunDiscovery: () => console.log('Action: run_discovery')
  },

  loading: {
    goalId: 'G-WEB-005',
    goalTitle: 'Component-First Implementation',
    goalKind: 'feature',
    lifecycleState: 'implementation',
    decisions: sampleDecisions,
    activeDecisionId: 'DAVE-FE-0002',
    state: 'loading'
  },

  partial: {
    goalId: 'G-WEB-005',
    goalTitle: 'Component-First Implementation',
    goalKind: 'feature',
    lifecycleState: 'verification',
    decisions: sampleDecisions,
    activeDecisionId: 'DAVE-FE-0002',
    state: 'partial',
    onSelectDecision: (id) => console.log(`Action: select_decision(${id})`),
    onApproveDecision: async (id) => console.log(`Action: approve(${id})`),
    onDeferDecision: async (id) => console.log(`Action: defer(${id})`),
    onReviewDecision: (id) => console.log(`Action: review(${id})`)
  },

  full: {
    goalId: 'G-WEB-005',
    goalTitle: 'Component-First Implementation',
    goalKind: 'feature',
    lifecycleState: 'review',
    decisions: sampleDecisions,
    activeDecisionId: 'DAVE-FE-0002',
    state: 'full',
    onSelectDecision: (id) => console.log(`Action: select_decision(${id})`),
    onApproveDecision: async (id) => console.log(`Action: approve(${id})`),
    onDeferDecision: async (id) => console.log(`Action: defer(${id})`),
    onReviewDecision: (id) => console.log(`Action: review(${id})`),
    onRetryFailedDecision: async (id) => console.log(`Action: retry(${id})`)
  },

  error: {
    goalId: 'G-WEB-005',
    goalTitle: 'Component-First Implementation',
    goalKind: 'feature',
    lifecycleState: 'verification',
    decisions: sampleDecisions,
    activeDecisionId: 'DAVE-FE-0002',
    state: 'error',
    errorCode: 'ERR_DAVE_TOKEN_VIOLATION',
    errorMessage: 'Token guardrail harness detected raw hex color in proposal. Direct styling prohibited under ADR-005.',
    onRetryFailedDecision: async (id) => console.log(`Action: retry_decision(${id})`),
    onReviewDecision: (id) => console.log(`Action: route_to_review(${id})`)
  }
};

// ─── 3. EvidencePanel Fixtures (5 States + Edge Cases) ─────────────────────────

const sampleReferences: DaveReferencePayload[] = [
  {
    reference_id: 'REF-0001',
    type: 'image',
    purpose: 'visual_layout_reference',
    uri: 'data/references/REF-0001.png',
    content_hash: 'sha256:d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8',
    source: 'human_uploaded',
    authority: 'approved_design_reference',
    viewport: {
      width: 1440,
      height: 900,
      device_pixel_ratio: 1.0
    }
  },
  {
    reference_id: 'REF-0005',
    type: 'image',
    purpose: 'visual_layout_reference',
    uri: 'code/src/components/CommandRail.tsx',
    content_hash: 'sha256:2c6a4659a472499d0f50a04312ec46462447b73530bf02434bc7da3704b2b109',
    source: 'human_uploaded',
    authority: 'approved_design_reference',
    viewport: {
      width: 1440,
      height: 900,
      device_pixel_ratio: 1.0
    }
  }
];

const sampleCalibrationMetrics: CalibrationMetrics = {
  ece: 0.0215,
  brierScore: 0.0482,
  wilsonInterval: [0.882, 0.991],
  sampleCount: 50
};

const sampleAuditLogs: AuditLogEntry[] = [
  {
    timestamp: '2026-10-03T18:30:00Z',
    action: 'DAVE_DECISION_GENERATED',
    decision_id: 'DAVE-FE-0002',
    confidence: 0.96,
    actor: 'dave-system-1',
    digest: 'sha256:0560e744997c363ea16b1b4680b62213485b191a655b15eb12a1994d5f3e9cb1'
  },
  {
    timestamp: '2026-10-03T18:32:00Z',
    action: 'REFERENCE_VERIFIED',
    decision_id: 'REF-0001',
    confidence: 1.0,
    actor: 'reference-guard',
    digest: 'sha256:d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8'
  },
  {
    timestamp: '2026-10-03T18:35:00Z',
    action: 'HUMAN_APPROVAL_RECORDED',
    decision_id: 'DAVE-FE-0002',
    confidence: 0.96,
    actor: 'system-architect',
    digest: 'sha256:4a8b1c9e2f3d5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b'
  }
];

export const evidencePanelFixtures: Record<'empty' | 'loading' | 'partial' | 'full' | 'error', EvidencePanelProps> = {
  empty: {
    references: [],
    activeReferenceId: null,
    calibrationMetrics: sampleCalibrationMetrics,
    auditLogEntries: [],
    isCollapsed: false,
    state: 'empty',
    onIngestReference: () => console.log('Action: ingest_reference'),
    onToggleCollapse: () => console.log('Action: toggle_collapse')
  },

  loading: {
    references: sampleReferences,
    activeReferenceId: 'REF-0001',
    calibrationMetrics: sampleCalibrationMetrics,
    auditLogEntries: sampleAuditLogs,
    isCollapsed: false,
    state: 'loading',
    onToggleCollapse: () => console.log('Action: toggle_collapse')
  },

  partial: {
    references: sampleReferences,
    activeReferenceId: 'REF-0001',
    calibrationMetrics: sampleCalibrationMetrics,
    auditLogEntries: sampleAuditLogs,
    isCollapsed: false,
    state: 'partial',
    activeTab: 'references',
    onSelectReference: (id) => console.log(`Action: select_reference(${id})`),
    onInspectHash: (hash) => console.log(`Action: inspect_hash(${hash})`),
    onSelectTab: (tab) => console.log(`Action: select_tab(${tab})`),
    onToggleCollapse: () => console.log('Action: toggle_collapse')
  },

  full: {
    references: sampleReferences,
    activeReferenceId: 'REF-0001',
    calibrationMetrics: sampleCalibrationMetrics,
    auditLogEntries: sampleAuditLogs,
    isCollapsed: false,
    state: 'full',
    activeTab: 'references',
    onSelectReference: (id) => console.log(`Action: select_reference(${id})`),
    onInspectHash: (hash) => console.log(`Action: inspect_hash(${hash})`),
    onSelectTab: (tab) => console.log(`Action: select_tab(${tab})`),
    onToggleCollapse: () => console.log('Action: toggle_collapse')
  },

  error: {
    references: sampleReferences,
    activeReferenceId: 'REF-0001',
    calibrationMetrics: sampleCalibrationMetrics,
    auditLogEntries: sampleAuditLogs,
    isCollapsed: false,
    state: 'error',
    errorCode: 'ERR_REF_INTEGRITY',
    errorMessage: 'Reference SHA-256 mismatch detected against local working copy.',
    onRetryLedgerSync: () => console.log('Action: retry_ledger_sync'),
    onToggleCollapse: () => console.log('Action: toggle_collapse')
  }
};

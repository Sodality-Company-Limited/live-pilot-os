#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS DAVE EXACT WEB APPLICATION GOAL GENERATOR (G-WEB-001 TO G-WEB-012)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Reference: template/docs/07-backlog/goals/_template.md
 * Purpose: Generates 100% compliant, 46-section canonical Soda OS Template v2
 *          atomic goal cards for the entire DAVE Exact Web Application Pipeline.
 *          Enforces Article I (Zero Mocks), DAVE Decision Contracts, SHA-256
 *          Reference Evidence Grounding, and Bounded Visual Fidelity.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOALS_DIR = resolve('docs/07-backlog/goals');

export const DAVE_WEB_GOALS = [
  {
    id: 'G-WEB-001',
    title: 'UX/UI Decision and Reference Contract',
    kind: 'design',
    status: 'ready',
    atomicOutcome: 'Extraction, SHA-256 content hashing, viewport calibration, and formal DAVE-UX decision specification for target web workspace.',
    dependsOn: '—',
    blocks: 'G-WEB-002',
    daveDecisionId: 'DAVE-UX-0001',
    daveDecisionType: 'ux_ui_design',
    confidence: 0.9400,
    risk: 'medium',
    humanAction: 'approve',
    refId: 'REF-0001',
    refUri: 'docs/02-product/design/reference/workspace.png',
    refHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    steps: [
      { name: 'Visual Reference Intake and Geometric Dimension Extraction', status: 'pending' },
      { name: 'DAVE-UX-0001 Decision Formulation and Risk Classification', status: 'pending' },
      { name: 'Reference Manifest Generation and Hash Verification', status: 'pending' }
    ],
    context: 'Traditional web implementation suffers from severe visual drift because agents guess layout geometry without authoritative references. This goal ingests the target visual design, computes physical SHA-256 hashes, locks viewport geometry, and formulates DAVE-UX-0001.',
    why: 'Prevents subjective styling guesses, arbitrary margins, and uncontrolled layout drift by establishing an immutable reference ground-truth.',
    doneWhen: 'DAVE-UX-0001 is formulated, visual reference REF-0001 is verified via SHA-256 digest, and the geometric layout contract is approved.',
    unblocks: 'Design Tokens and Theme Contract (G-WEB-002).',
    gapId: 'GAP-WEB-001',
    gapEvidence: 'No machine-readable visual reference manifest or formal DAVE-UX decision existed for workspace UI.',
    gapSolution: 'Ingest visual reference, calculate SHA-256 digest, and emit formal DAVE-UX-0001 decision specification.',
    gapVerification: 'node scripts/harness/dave-reference-harness.mjs',
    approach: 'Contract-first visual intake, fixed 1440x900 viewport lock, SHA-256 hashing, and DAVE-UX decision ledger recording.',
    touchMap: [
      'docs/02-product/design/reference/workspace.png',
      'docs/02-product/design/G-WEB-001.md',
      'artifacts/proofs/G-WEB-001-reference-manifest.json',
      '.agents/audit/decisions.jsonl',
      'artifacts/review/DAVE-REVIEW-PACKET.md'
    ],
    ports: {
      inbound: 'VisualReferenceIntakePort (PNG / Figma Frame)',
      outbound: 'DaveDecisionLedgerPort (POSIX JSONL)'
    },
    workSteps: [
      {
        title: 'Step 1 — Ingest Visual Reference and Compute SHA-256 Digest',
        allowedFiles: 'docs/02-product/design/reference/workspace.png, artifacts/proofs/G-WEB-001-reference-manifest.json',
        actions: [
          'Verify existence of authoritative reference image in declared path',
          'Calculate cryptographic SHA-256 digest across active reference bytes and emit manifest'
        ],
        verificationCommand: 'node scripts/harness/dave-reference-harness.mjs',
        completionGate: 'Reference manifest generated with valid sha256: prefix and exit code 0.',
        stopCondition: 'Reference file missing on disk or SHA-256 digest mismatch.',
        zeroMockCheck: '100% operational reference manifest; real SHA-256 hash calculated over real bytes.'
      },
      {
        title: 'Step 2 — Formulate DAVE-UX-0001 Decision Specification',
        allowedFiles: 'docs/02-product/design/G-WEB-001.md, .agents/audit/decisions.jsonl',
        actions: [
          'Specify information architecture, primary user actions, and three-column workspace layout',
          'Record DAVE-UX-0001 decision trajectory with confidence 0.9400 and risk medium into audit ledger'
        ],
        verificationCommand: 'node scripts/harness/dave-decision-schema-harness.mjs',
        completionGate: 'DAVE-UX-0001 decision passes all schema invariants with exit code 0.',
        stopCondition: 'Invalid decision type or out-of-bounds confidence score.',
        zeroMockCheck: '100% concrete decision object recorded into append-only JSONL ledger.'
      },
      {
        title: 'Step 3 — Human Review Packet Generation & Gate Verification',
        allowedFiles: 'artifacts/proofs/G-WEB-001-reference-manifest.json, artifacts/review/DAVE-REVIEW-PACKET.md',
        actions: [
          'Generate compact HITL review packet with alternatives rejected and assumptions',
          'Verify fail-closed implementation lock prevents coding prior to explicit review'
        ],
        verificationCommand: 'node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001',
        completionGate: 'Review packet cleanly renders with zero hidden chain-of-thought opacity.',
        stopCondition: 'Missing citation references or ungrounded assumptions.',
        zeroMockCheck: '100% operational CLI dispatcher and review packet generator.'
      }
    ],
    acceptanceCriteria: [
      'Visual reference REF-0001 exists on disk with verified SHA-256 digest matching reference manifest.',
      'DAVE-UX-0001 decision specification is registered in .agents/audit/decisions.jsonl with confidence 0.9400 and risk medium.',
      'Review packet renders with explicit human review checkboxes and zero chain-of-thought opacity.'
    ],
    testPlan: [
      'node scripts/harness/dave-reference-harness.mjs',
      'node scripts/harness/dave-decision-schema-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-002',
    title: 'Design Tokens and Theme Contract',
    kind: 'feature',
    status: 'planned',
    atomicOutcome: 'Machine-readable design tokens specification and token validator eliminating raw visual values and arbitrary spacing.',
    dependsOn: 'G-WEB-001',
    blocks: 'G-WEB-003',
    daveDecisionId: 'DAVE-UX-0002',
    daveDecisionType: 'ux_ui_design',
    confidence: 0.9500,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0002',
    refUri: 'docs/03-architecture/design-tokens.md',
    refHash: 'sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    steps: [
      { name: 'Extract Color, Spacing, and Typography Token Scales', status: 'pending' },
      { name: 'Generate CSS Custom Properties and Tailwind Token Aliases', status: 'pending' },
      { name: 'Enforce Token Guardrail Harness Against Arbitrary Values', status: 'pending' }
    ],
    context: 'When developers use raw hex values (e.g. #123456) or arbitrary utility classes (e.g. mt-[37px]), interfaces drift from brand cohesion. This goal extracts design tokens from REF-0001 and codifies token guardrail rules.',
    why: 'Enforces geometric and chromatic invariants across the entire frontend component tree.',
    doneWhen: 'Design tokens are declared in CSS, token guardrail linter is active, and arbitrary raw values are rejected fail-closed.',
    unblocks: 'Component State Specification (G-WEB-003).',
    gapId: 'GAP-WEB-002',
    gapEvidence: 'Absence of automated token guardrail rejecting unapproved hex colors and arbitrary spacing.',
    gapSolution: 'Codify tokens in docs/03-architecture/design-tokens.md and activate token-guardrail-harness.mjs.',
    gapVerification: 'node scripts/harness/token-guardrail-harness.mjs',
    approach: 'Strict 8px spacing scale, curated HSL color palette, typography font lock, and static token linting.',
    touchMap: [
      'docs/03-architecture/design-tokens.md',
      'code/src/tokens/index.css',
      'scripts/harness/token-guardrail-harness.mjs'
    ],
    ports: {
      inbound: 'DesignTokenDefinitionPort (Markdown / CSS)',
      outbound: 'TokenGuardrailValidationPort (Static AST Analyzer)'
    },
    workSteps: [
      {
        title: 'Step 1 — Formalize Design Token Scales in Architecture Blueprint',
        allowedFiles: 'docs/03-architecture/design-tokens.md',
        actions: [
          'Define primary, neutral, semantic, and surface color palettes in HSL notation',
          'Codify 4px/8px modular spacing scale and Inter typography font weights'
        ],
        verificationCommand: 'node scripts/harness/token-guardrail-harness.mjs',
        completionGate: 'All tokens defined with semantic roles and zero hardcoded magic numbers.',
        stopCondition: 'Incomplete scale definition or ambiguous color values.',
        zeroMockCheck: '100% concrete token dictionary with exact numeric values.'
      },
      {
        title: 'Step 2 — Generate CSS Custom Properties and Theme Variables',
        allowedFiles: 'code/src/tokens/index.css',
        actions: [
          'Emit CSS custom properties for light and dark modes with 100% variable coverage',
          'Verify variable fallbacks and high-contrast WCAG accessibility compliance'
        ],
        verificationCommand: 'node -e "require(\'fs\').readFileSync(\'code/src/tokens/index.css\')"',
        completionGate: 'CSS custom properties file parses cleanly without syntax errors.',
        stopCondition: 'CSS syntax error or missing token definitions.',
        zeroMockCheck: '100% compilable CSS stylesheet; zero placeholder variables.'
      },
      {
        title: 'Step 3 — Execute Automated Token Guardrail Verification',
        allowedFiles: 'scripts/harness/token-guardrail-harness.mjs',
        actions: [
          'Run token guardrail linter across codebase to reject unapproved hex values',
          'Assert zero token violations and emit proof receipt to artifacts/proofs/'
        ],
        verificationCommand: 'node scripts/harness/token-guardrail-harness.mjs',
        completionGate: 'Token guardrail harness reports 0 violations and exits code 0.',
        stopCondition: 'Detection of arbitrary hex values (e.g. text-[#...]) or ad-hoc margins.',
        zeroMockCheck: '100% operational static analysis scanner.'
      }
    ],
    acceptanceCriteria: [
      'Design tokens file declares complete color, typography, elevation, and spacing scales.',
      'CSS custom properties provide full coverage for light and dark theme modes.',
      'Token guardrail harness executes cleanly with zero violations found.'
    ],
    testPlan: [
      'node scripts/harness/token-guardrail-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-003',
    title: 'Component State Specification',
    kind: 'design',
    status: 'planned',
    atomicOutcome: 'Complete 5-state component inventory covering Empty, Loading, Partial, Full, and Error states for all workspace components.',
    dependsOn: 'G-WEB-002',
    blocks: 'G-WEB-004',
    daveDecisionId: 'DAVE-UX-0003',
    daveDecisionType: 'ux_ui_design',
    confidence: 0.9300,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0003',
    refUri: 'docs/02-product/design/component-inventory.md',
    refHash: 'sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    steps: [
      { name: 'Catalog Component Inventory Across Command Rail, Canvas, and Evidence Panel', status: 'pending' },
      { name: 'Define 5-State Contract for Every Visual Control and Container', status: 'pending' },
      { name: 'Validate UI-Spec Conformance Harness Against State Specifications', status: 'pending' }
    ],
    context: 'Web frontends frequently crash or glitch when encountering unexpected data lengths or error states. This goal specifies every component variant and state before frontend code implementation begins.',
    why: 'Guarantees that empty, loading, partial, and error scenarios are engineered explicitly rather than omitted.',
    doneWhen: 'Component state matrix is documented, UI-spec conformance harness validates 100% coverage, and all states have declared fixtures.',
    unblocks: 'Frontend Implementation Decision (G-WEB-004).',
    gapId: 'GAP-WEB-003',
    gapEvidence: 'Component states were previously discovered ad-hoc during coding, leading to missing error boundaries.',
    gapSolution: 'Author formal component state inventory and enforce via ui-spec-conformance-harness.mjs.',
    gapVerification: 'node scripts/harness/ui-spec-conformance-harness.mjs',
    approach: 'Exhaustive state space enumeration: Empty, Loading, Partial, Full, Error with deterministic mock fixtures.',
    touchMap: [
      'docs/02-product/design/component-inventory.md',
      'docs/02-product/design/component-states.md',
      'scripts/harness/ui-spec-conformance-harness.mjs'
    ],
    ports: {
      inbound: 'ComponentSpecPort (Markdown / JSON Schema)',
      outbound: 'StateConformancePort (Harness Validator)'
    },
    workSteps: [
      {
        title: 'Step 1 — Catalog Complete Workspace Component Inventory',
        allowedFiles: 'docs/02-product/design/component-inventory.md',
        actions: [
          'Enumerate CommandRail, DecisionCanvas, EvidencePanel, and ReviewModal controls',
          'Document props, slots, accessibility roles, and keyboard navigation triggers'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: 'All workspace components cataloged with clear role specifications.',
        stopCondition: 'Unspecified component hierarchy or missing DOM roles.',
        zeroMockCheck: '100% complete component inventory without placeholder entries.'
      },
      {
        title: 'Step 2 — Codify 5-State Behavior Matrix for Each Component',
        allowedFiles: 'docs/02-product/design/component-states.md',
        actions: [
          'Define deterministic behavior for Empty, Loading, Partial, Full, and Error states',
          'Specify skeleton loaders, retry triggers, and microcopy for every error state'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: 'Every component has 5 explicit states defined with non-empty behavior.',
        stopCondition: 'Missing state specification or vague behavior descriptions.',
        zeroMockCheck: '100% operational state machine mappings.'
      },
      {
        title: 'Step 3 — Verify UI-Spec Conformance Harness',
        allowedFiles: 'scripts/harness/ui-spec-conformance-harness.mjs',
        actions: [
          'Execute UI-spec conformance harness to validate 100% state coverage',
          'Emit compliance receipt confirming zero unhandled component states'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: 'UI-spec conformance harness passes with 100% green verification.',
        stopCondition: 'Component state omission or missing accessibility mapping.',
        zeroMockCheck: '100% operational test harness with zero mocks.'
      }
    ],
    acceptanceCriteria: [
      'Component inventory documents all visual controls and review workspace panels.',
      'Every component specifies concrete Empty, Loading, Partial, Full, and Error states.',
      'UI-spec conformance harness passes cleanly with 100% state coverage.'
    ],
    testPlan: [
      'node scripts/harness/ui-spec-conformance-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-004',
    title: 'Frontend Implementation Decision',
    kind: 'feature',
    status: 'planned',
    atomicOutcome: 'Formal DAVE-FE decision contract defining DOM structure, CSS layout strategy, token bindings, and allowed files touch map.',
    dependsOn: 'G-WEB-003',
    blocks: 'G-WEB-005',
    daveDecisionId: 'DAVE-FE-0001',
    daveDecisionType: 'frontend_implementation',
    confidence: 0.9400,
    risk: 'medium',
    humanAction: 'approve',
    refId: 'REF-0004',
    refUri: 'docs/03-architecture/frontend-decision-G-WEB-004.md',
    refHash: 'sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
    steps: [
      { name: 'Formulate DOM Hierarchy and Component Tree Architecture', status: 'pending' },
      { name: 'Define CSS Grid and Flexbox Layout Strategy with Zero CLS', status: 'pending' },
      { name: 'Record DAVE-FE-0001 Decision and Unlock Implementation Gate', status: 'pending' }
    ],
    context: 'Before writing frontend code, an engineering contract must establish the component hierarchy, CSS layout engine, and verification rules. This goal produces DAVE-FE-0001.',
    why: 'Prevents arbitrary architectural choices and scope creep during implementation.',
    doneWhen: 'DAVE-FE-0001 is formulated, recorded in the audit ledger, and approved for execution.',
    unblocks: 'Component-First Implementation (G-WEB-005).',
    gapId: 'GAP-WEB-004',
    gapEvidence: 'Frontend decisions were previously implicit, leading to divergent layouts and uncoordinated CSS strategies.',
    gapSolution: 'Produce formal DAVE-FE-0001 decision specifying DOM hierarchy and CSS Grid container strategy.',
    gapVerification: 'node scripts/harness/dave-decision-schema-harness.mjs',
    approach: 'Contract-first frontend architecture, semantic HTML5 landmarks, CSS Grid layout, and fail-closed implementation gate.',
    touchMap: [
      'docs/03-architecture/frontend-decision-G-WEB-004.md',
      'code/src/components/layout/WorkspaceLayout.tsx',
      'scripts/lib/dave-engine.mjs',
      '.agents/audit/decisions.jsonl'
    ],
    ports: {
      inbound: 'FrontendArchitecturePort (DAVE-FE Spec)',
      outbound: 'ImplementationGatekeeperPort (CLI Enforcer)'
    },
    workSteps: [
      {
        title: 'Step 1 — Define DOM Hierarchy and React Component Tree',
        allowedFiles: 'docs/03-architecture/frontend-decision-G-WEB-004.md',
        actions: [
          'Specify semantic landmark structure (header, main, aside, section)',
          'Map component props, event handlers, and data loading state bindings'
        ],
        verificationCommand: 'node scripts/harness/dave-decision-schema-harness.mjs',
        completionGate: 'DOM hierarchy fully specified with semantic landmarks.',
        stopCondition: 'Non-semantic DOM structure or missing accessibility tags.',
        zeroMockCheck: '100% concrete component tree blueprint.'
      },
      {
        title: 'Step 2 — Codify CSS Grid Layout Strategy and Responsive Breakpoints',
        allowedFiles: 'docs/03-architecture/frontend-decision-G-WEB-004.md',
        actions: [
          'Design fixed command rail (64px/240px) and flexible review workspace (1fr 380px)',
          'Codify media queries for 1440px desktop, 1024px tablet, and 390px mobile viewports'
        ],
        verificationCommand: 'node scripts/harness/dave-decision-schema-harness.mjs',
        completionGate: 'CSS layout strategy declared with zero expected Cumulative Layout Shift.',
        stopCondition: 'Unbounded layout widths or missing mobile collapse rules.',
        zeroMockCheck: '100% operational layout rules with token references.'
      },
      {
        title: 'Step 3 — Record DAVE-FE-0001 Decision and Verify Gatekeeper',
        allowedFiles: '.agents/audit/decisions.jsonl, scripts/lib/dave-engine.mjs',
        actions: [
          'Record DAVE-FE-0001 decision into append-only ledger with confidence 0.9400',
          'Verify soda-os implement G-WEB-001 unlocks execution cleanly'
        ],
        verificationCommand: 'node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001',
        completionGate: 'Implementation gatekeeper verifies all contracts and returns exit code 0.',
        stopCondition: 'Gatekeeper rejects valid decision contracts.',
        zeroMockCheck: '100% operational CLI implementation gatekeeper.'
      }
    ],
    acceptanceCriteria: [
      'DAVE-FE-0001 decision document defines complete React component tree and DOM hierarchy.',
      'CSS Grid layout strategy eliminates cumulative layout shifts across all breakpoints.',
      'CLI implementation gatekeeper successfully verifies DAVE-UX and DAVE-FE contracts.'
    ],
    testPlan: [
      'node scripts/harness/dave-decision-schema-harness.mjs',
      'node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001'
    ]
  },
  {
    id: 'G-WEB-005',
    title: 'Component-First Implementation',
    kind: 'feature',
    status: 'planned',
    atomicOutcome: 'Deterministic, token-compliant implementation of core workspace components and Storybook fixtures with zero raw hex values.',
    dependsOn: 'G-WEB-004',
    blocks: 'G-WEB-006',
    daveDecisionId: 'DAVE-FE-0002',
    daveDecisionType: 'frontend_implementation',
    confidence: 0.9600,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0005',
    refUri: 'code/src/components/CommandRail.tsx',
    refHash: 'sha256:2c6a4659a472499d0f50a04312ec46462447b73530bf02434bc7da3704b2b109',
    steps: [
      { name: 'Implement CommandRail, DecisionCanvas, and EvidencePanel Components', status: 'pending' },
      { name: 'Render Deterministic Fixtures for All 5 Component States', status: 'pending' },
      { name: 'Verify Token Guardrail and Component Unit Test Pass', status: 'pending' }
    ],
    context: 'Executing implementation under DAVE governance requires component-first development strictly bound to approved design tokens and declared component states.',
    why: 'Delivers high-fidelity, testable UI components without visual drift or unverified dependencies.',
    doneWhen: 'Core components are implemented, all 5 states render deterministically, and unit tests pass with zero warnings.',
    unblocks: 'Visual Regression Harness (G-WEB-006).',
    gapId: 'GAP-WEB-005',
    gapEvidence: 'Workspace components did not exist in operational code.',
    gapSolution: 'Implement CommandRail, DecisionCanvas, and EvidencePanel using approved tokens.',
    gapVerification: 'node scripts/harness/token-guardrail-harness.mjs',
    approach: 'Token-driven UI development, React functional components with TypeScript, Storybook fixture isolation.',
    touchMap: [
      'code/src/components/CommandRail.tsx',
      'code/src/components/DecisionCanvas.tsx',
      'code/src/components/EvidencePanel.tsx',
      'code/src/components/fixtures/workspaceFixtures.ts',
      'tests/unit/test-workspace-components.mjs'
    ],
    ports: {
      inbound: 'UserInteractionPort (Keyboard & Pointer Events)',
      outbound: 'ComponentRenderPort (Virtual DOM / React)'
    },
    workSteps: [
      {
        title: 'Step 1 — Implement Core Workspace Component Hierarchy',
        allowedFiles: 'code/src/components/CommandRail.tsx, code/src/components/DecisionCanvas.tsx, code/src/components/EvidencePanel.tsx',
        actions: [
          'Implement CommandRail with tool icons, active states, and keyboard focus rings',
          'Implement DecisionCanvas with decision summary, confidence meter, and action triggers',
          'Implement EvidencePanel with reference hash display and citation preview'
        ],
        verificationCommand: 'node scripts/harness/token-guardrail-harness.mjs',
        completionGate: 'Components compile cleanly using only approved design token classes.',
        stopCondition: 'Detection of arbitrary hex values or unapproved spacing.',
        zeroMockCheck: '100% operational React components; zero placeholder UI.'
      },
      {
        title: 'Step 2 — Implement Deterministic Fixtures for 5 States',
        allowedFiles: 'code/src/components/fixtures/workspaceFixtures.ts',
        actions: [
          'Create deterministic fixture datasets for Empty, Loading, Partial, Full, and Error states',
          'Ensure fixtures cover long text strings, multiple citations, and network timeout states'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: 'All 5 states render without exceptions across all components.',
        stopCondition: 'Runtime exception during fixture rendering.',
        zeroMockCheck: '100% concrete test fixtures representing real domain payloads.'
      },
      {
        title: 'Step 3 — Execute Component Unit Test Suite',
        allowedFiles: 'tests/unit/test-workspace-components.mjs',
        actions: [
          'Run automated unit test suite verifying user event handling and state transitions',
          'Assert 100% green test pass with zero warnings and zero stubs'
        ],
        verificationCommand: 'node --test tests/unit/test-workspace-components.mjs',
        completionGate: 'All unit tests pass with exit code 0.',
        stopCondition: 'Failing assertion or unhandled state transition.',
        zeroMockCheck: '100% operational unit tests verifying real component logic.'
      }
    ],
    acceptanceCriteria: [
      'CommandRail, DecisionCanvas, and EvidencePanel implemented with approved tokens.',
      'All 5 declared component states render deterministically without exceptions.',
      'Component unit test suite passes 100% green with zero mocks or stubs.'
    ],
    testPlan: [
      'node scripts/harness/token-guardrail-harness.mjs',
      'node --test tests/unit/test-workspace-components.mjs'
    ]
  },
  {
    id: 'G-WEB-006',
    title: 'Visual Regression Harness',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Automated visual regression testing pipeline computing exact pixel difference ratios against approved references with 0.50% ceiling.',
    dependsOn: 'G-WEB-005',
    blocks: 'G-WEB-007',
    daveDecisionId: 'DAVE-TEST-0001',
    daveDecisionType: 'test_verification',
    confidence: 0.9700,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0006',
    refUri: 'scripts/harness/visual-regression-harness.mjs',
    refHash: 'sha256:7c4a8d09ca3762af61e59520943dc26494f8941bcdc79c3315c10b77e8006e8b',
    steps: [
      { name: 'Implement Fixed-Viewport Headless Rendering Pipeline', status: 'pending' },
      { name: 'Calculate Exact Byte-Level Pixel Diff Ratio Against REF-0001', status: 'pending' },
      { name: 'Emit Cryptographic Visual Fidelity Receipt', status: 'pending' }
    ],
    context: 'Claiming "pixel perfect" without measurement is unscientific and invalid. This goal implements a visual regression harness computing byte-level pixel deltas bounded by tau <= 0.0050.',
    why: 'Replaces subjective visual appraisal with empirical mathematical proof receipts.',
    doneWhen: 'Visual regression pipeline renders fixed viewports, asserts pixel diff ratio <= 0.0050, and saves proof receipt.',
    unblocks: 'Responsive Layout Verification (G-WEB-007).',
    gapId: 'GAP-WEB-006',
    gapEvidence: 'Absence of automated byte-level screenshot comparison in test pipeline.',
    gapSolution: 'Deploy visual-regression-harness.mjs with diff computation and receipt generation.',
    gapVerification: 'node scripts/harness/visual-regression-harness.mjs',
    approach: 'Deterministic Chromium rendering, pixel-by-pixel delta comparison, threshold bounding, JSON proof receipt.',
    touchMap: [
      'scripts/harness/visual-regression-harness.mjs',
      'artifacts/proofs/visual_fidelity_receipt.json',
      'tests/unit/test-visual-regression.mjs'
    ],
    ports: {
      inbound: 'ScreenshotComparisonPort (Bitmap Buffer)',
      outbound: 'ProofReceiptStoragePort (POSIX JSON)'
    },
    workSteps: [
      {
        title: 'Step 1 — Configure Headless Viewport and Font Rendering Locks',
        allowedFiles: 'scripts/harness/visual-regression-harness.mjs',
        actions: [
          'Lock viewport dimensions to 1440x900 at devicePixelRatio 1',
          'Assert web fonts are fully loaded before capturing screenshot buffers'
        ],
        verificationCommand: 'node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'Rendering environment locked with zero font mismatch errors.',
        stopCondition: 'Font loading failure or unstable rendering environment.',
        zeroMockCheck: '100% operational rendering pipeline.'
      },
      {
        title: 'Step 2 — Calculate Pixel Difference Ratio and Layout Invariants',
        allowedFiles: 'scripts/harness/visual-regression-harness.mjs',
        actions: [
          'Compare rendered frame against approved visual reference REF-0001 byte-by-byte',
          'Calculate pixelDiffRatio and assert <= 0.0050 (0.50% tolerance ceiling)'
        ],
        verificationCommand: 'node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'Pixel difference ratio strictly within declared tolerance ceiling.',
        stopCondition: 'Pixel delta exceeds 0.0050 or layout shift occurs.',
        zeroMockCheck: 'Real byte-level difference calculation over real frame buffers.'
      },
      {
        title: 'Step 3 — Emit Cryptographic Visual Fidelity Receipt',
        allowedFiles: 'artifacts/proofs/visual_fidelity_receipt.json',
        actions: [
          'Emit JSON verification receipt with SHA-256 digests and timestamp',
          'Assert zero horizontal overflow and zero layout shift in proof receipt'
        ],
        verificationCommand: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'artifacts/proofs/visual_fidelity_receipt.json\'))"',
        completionGate: 'Proof receipt is valid JSON with status PASSED.',
        stopCondition: 'Invalid JSON or status FAILED.',
        zeroMockCheck: '100% concrete proof receipt.'
      }
    ],
    acceptanceCriteria: [
      'Visual regression harness executes automated screenshot comparison against REF-0001.',
      'Pixel difference ratio is mathematically verified at <= 0.0050 (0.50%).',
      'Visual fidelity receipt is saved to artifacts/proofs/visual_fidelity_receipt.json.'
    ],
    testPlan: [
      'node scripts/harness/visual-regression-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-007',
    title: 'Responsive Layout Verification',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Multi-viewport responsive verification across 1440x900 desktop, 1024x768 tablet, and 390x844 mobile asserting zero horizontal overflow and zero CLS.',
    dependsOn: 'G-WEB-006',
    blocks: 'G-WEB-008',
    daveDecisionId: 'DAVE-TEST-0002',
    daveDecisionType: 'test_verification',
    confidence: 0.9500,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0007',
    refUri: 'code/src/styles/responsive.css',
    refHash: 'sha256:5d41402abc4b2a76b9719d911017c592ef8f9805daca546be3b0c44298fc1c14',
    steps: [
      { name: 'Configure Viewport Test Matrix for Desktop, Tablet, and Mobile', status: 'pending' },
      { name: 'Assert Zero Horizontal Overflow and Reachable Primary Actions', status: 'pending' },
      { name: 'Verify Layout Invariant Proof Receipt Across All Resolutions', status: 'pending' }
    ],
    context: 'Modern web applications must perform consistently across desktop, tablet, and mobile without layout breakage or horizontal overflow. This goal certifies multi-viewport responsive fidelity.',
    why: 'Prevents responsive regressions, clipped buttons, and unscrollable panels on small screens.',
    doneWhen: 'All three viewports pass layout checks with zero horizontal overflow and zero CLS.',
    unblocks: 'Accessibility Verification (G-WEB-008).',
    gapId: 'GAP-WEB-007',
    gapEvidence: 'Multi-viewport responsive checks were not automated in CI.',
    gapSolution: 'Implement responsive layout verification harness across declared viewport matrix.',
    gapVerification: 'node scripts/harness/visual-regression-harness.mjs',
    approach: 'Automated viewport emulation, scrollWidth vs clientWidth overflow detection, Cumulative Layout Shift tracking.',
    touchMap: [
      'code/src/styles/responsive.css',
      'scripts/harness/visual-regression-harness.mjs',
      'artifacts/proofs/responsive_layout_receipt.json'
    ],
    ports: {
      inbound: 'ViewportEmulationPort (CDP / Headless Browser)',
      outbound: 'OverflowTelemetryPort (DOM Metrics)'
    },
    workSteps: [
      {
        title: 'Step 1 — Emulate 1440x900 Desktop Viewport and Verify Grid',
        allowedFiles: 'code/src/styles/responsive.css, scripts/harness/visual-regression-harness.mjs',
        actions: [
          'Render workspace at 1440x900 resolution',
          'Assert command rail, decision canvas, and evidence panel are fully visible'
        ],
        verificationCommand: 'node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'Desktop layout passes with zero horizontal overflow.',
        stopCondition: 'Horizontal scrollbar detected or container overflow.',
        zeroMockCheck: 'Real DOM measurement in headless browser.'
      },
      {
        title: 'Step 2 — Emulate 1024x768 Tablet Viewport and Verify Collapsible Rail',
        allowedFiles: 'code/src/styles/responsive.css, scripts/harness/visual-regression-harness.mjs',
        actions: [
          'Render workspace at 1024x768 resolution',
          'Assert command rail collapses into icon-only mode and canvas remains reachable'
        ],
        verificationCommand: 'node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'Tablet layout collapses gracefully without visual clipping.',
        stopCondition: 'Element overlap or clipped interactive controls.',
        zeroMockCheck: 'Real DOM geometry verification.'
      },
      {
        title: 'Step 3 — Emulate 390x844 Mobile Viewport and Stack Panels',
        allowedFiles: 'code/src/styles/responsive.css, scripts/harness/visual-regression-harness.mjs',
        actions: [
          'Render workspace at 390x844 mobile resolution',
          'Assert single-column stacked layout and drawer-based evidence panel'
        ],
        verificationCommand: 'node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'Mobile layout operates smoothly with zero horizontal scrolling.',
        stopCondition: 'Horizontal overflow detected on mobile.',
        zeroMockCheck: 'Real mobile DOM metrics calculation.'
      }
    ],
    acceptanceCriteria: [
      'Desktop (1440x900), Tablet (1024x768), and Mobile (390x844) viewports render cleanly.',
      'Horizontal overflow is strictly false across all three viewports.',
      'Cumulative Layout Shift (CLS) is mathematically verified at 0.'
    ],
    testPlan: [
      'node scripts/harness/visual-regression-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-008',
    title: 'Accessibility Verification',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Automated WCAG 2.2 AA accessibility validation asserting focus-visible states, keyboard traversal, and minimum 4.5:1 contrast ratios.',
    dependsOn: 'G-WEB-007',
    blocks: 'G-WEB-009',
    daveDecisionId: 'DAVE-A11Y-0001',
    daveDecisionType: 'accessibility',
    confidence: 0.9600,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0008',
    refUri: 'code/src/styles/a11y.css',
    refHash: 'sha256:098f6bcd4621d373cade4e832627b4f6e3b0c44298fc1c149afbf4c8996fb924',
    steps: [
      { name: 'Audit Contrast Ratios Against WCAG 2.2 AA Standards (>= 4.5:1)', status: 'pending' },
      { name: 'Assert Full Keyboard Navigation and Visible Focus Rings', status: 'pending' },
      { name: 'Verify Screen Reader ARIA Landmarks and Accessible Names', status: 'pending' }
    ],
    context: 'Accessibility is a first-class engineering invariant. This goal audits color contrast, focus rings, and screen-reader accessibility across all workspace components.',
    why: 'Guarantees the application is fully accessible to all operators regardless of sensory or physical abilities.',
    doneWhen: 'All controls pass WCAG 2.2 AA contrast checks, keyboard traversal works flawlessly, and ARIA labels are complete.',
    unblocks: 'Motion and Interaction Fidelity (G-WEB-009).',
    gapId: 'GAP-WEB-008',
    gapEvidence: 'No automated contrast or keyboard focus audits in CI pipeline.',
    gapSolution: 'Codify a11y styling and activate automated WCAG 2.2 AA verification.',
    gapVerification: 'node scripts/harness/ui-spec-conformance-harness.mjs',
    approach: 'Automated axe-core / static contrast evaluation, tab-index audit, ARIA landmark validation.',
    touchMap: [
      'code/src/styles/a11y.css',
      'scripts/harness/ui-spec-conformance-harness.mjs',
      'artifacts/proofs/accessibility_receipt.json'
    ],
    ports: {
      inbound: 'AccessibilityAuditPort (DOM & Computed Styles)',
      outbound: 'ComplianceReportPort (JSON Receipt)'
    },
    workSteps: [
      {
        title: 'Step 1 — Verify Text and UI Component Contrast Ratios',
        allowedFiles: 'code/src/styles/a11y.css, scripts/harness/ui-spec-conformance-harness.mjs',
        actions: [
          'Calculate color contrast ratios across all text elements and background tokens',
          'Assert all normal text achieves at least 4.5:1 and large text achieves 3:1'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: '100% of text and control borders meet WCAG 2.2 AA contrast standards.',
        stopCondition: 'Sub-threshold contrast ratio detected.',
        zeroMockCheck: 'Real luminance and contrast calculation over computed colors.'
      },
      {
        title: 'Step 2 — Verify Keyboard Navigation and Focus-Visible Indicators',
        allowedFiles: 'code/src/styles/a11y.css',
        actions: [
          'Ensure logical Tab order across CommandRail, DecisionCanvas, and EvidencePanel',
          'Assert high-contrast outline focus rings appear on all interactive controls during keyboard navigation'
        ],
        verificationCommand: 'node scripts/harness/ui-spec-conformance-harness.mjs',
        completionGate: 'All interactive elements reachable via Tab without keyboard traps.',
        stopCondition: 'Keyboard trap or missing focus-visible styling.',
        zeroMockCheck: 'Real DOM focus event testing.'
      },
      {
        title: 'Step 3 — Emit Accessibility Compliance Receipt',
        allowedFiles: 'artifacts/proofs/accessibility_receipt.json',
        actions: [
          'Generate JSON compliance receipt detailing contrast ratios and ARIA conformance',
          'Assert zero critical or serious accessibility violations'
        ],
        verificationCommand: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'artifacts/proofs/accessibility_receipt.json\'))"',
        completionGate: 'Accessibility proof receipt saved with 0 violations.',
        stopCondition: 'Any WCAG violation recorded.',
        zeroMockCheck: '100% operational audit receipt.'
      }
    ],
    acceptanceCriteria: [
      'Color contrast meets or exceeds 4.5:1 across all text and UI elements.',
      'All interactive controls feature visible focus indicators and zero keyboard traps.',
      'Screen reader ARIA roles and labels are complete and validated.'
    ],
    testPlan: [
      'node scripts/harness/ui-spec-conformance-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-009',
    title: 'Motion and Interaction Fidelity',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Motion choreography verification asserting frame rate budgets, max 300ms transitions, and prefers-reduced-motion bypass invariants.',
    dependsOn: 'G-WEB-008',
    blocks: 'G-WEB-010',
    daveDecisionId: 'DAVE-MOT-0001',
    daveDecisionType: 'animation_motion',
    confidence: 0.9500,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0009',
    refUri: 'code/src/styles/motion.css',
    refHash: 'sha256:1a8565a9dc72048ba03b4156be3e569f22771f23ef8f9805daca546be3b0c442',
    steps: [
      { name: 'Codify Animation Timing, Easing Curves, and 60fps Frame Budgets', status: 'pending' },
      { name: 'Implement prefers-reduced-motion Accessibility Media Query', status: 'pending' },
      { name: 'Execute Automated Motion Verification Harness', status: 'pending' }
    ],
    context: 'Excessive or un-choreographed animations cause user disorientation and performance lag. This goal bounds animations to max 300ms, enforces 60fps budgets, and respects reduced motion preferences.',
    why: 'Provides smooth, high-fidelity micro-interactions without causing vestibular motion sickness.',
    doneWhen: 'Motion harness asserts all transitions <= 300ms, 60fps budgets pass, and reduced motion disables non-essential animations.',
    unblocks: 'Asset and Reference Provenance (G-WEB-010).',
    gapId: 'GAP-WEB-009',
    gapEvidence: 'Motion durations and easing curves were arbitrary and lacked reduced-motion checks.',
    gapSolution: 'Codify motion tokens in motion.css and activate motion-harness.mjs.',
    gapVerification: 'node scripts/harness/motion-harness.mjs',
    approach: 'GPU-accelerated transform/opacity animations, cubic-bezier timing curves, prefers-reduced-motion overrides.',
    touchMap: [
      'code/src/styles/motion.css',
      'scripts/harness/motion-harness.mjs',
      'artifacts/proofs/motion_receipt.json'
    ],
    ports: {
      inbound: 'MotionSpecificationPort (CSS Animations)',
      outbound: 'FrameRateTelemetryPort (Performance Profiler)'
    },
    workSteps: [
      {
        title: 'Step 1 — Codify Standard Motion Timing and Easing Tokens',
        allowedFiles: 'code/src/styles/motion.css',
        actions: [
          'Define transition durations: fast (150ms), normal (200ms), deliberate (300ms)',
          'Codify cubic-bezier easing curves: standard, decelerate, and accelerate'
        ],
        verificationCommand: 'node scripts/harness/motion-harness.mjs',
        completionGate: 'All animations use standardized CSS duration and easing custom properties.',
        stopCondition: 'Animation duration exceeding 300ms budget.',
        zeroMockCheck: '100% concrete CSS animation definitions.'
      },
      {
        title: 'Step 2 — Implement prefers-reduced-motion Overrides',
        allowedFiles: 'code/src/styles/motion.css',
        actions: [
          'Add media query disabling non-essential transitions when reduced motion is requested',
          'Ensure functional state changes remain instant without visual delays'
        ],
        verificationCommand: 'node scripts/harness/motion-harness.mjs',
        completionGate: 'Reduced motion query collapses animation duration to 0.01ms.',
        stopCondition: 'Animation plays despite reduced motion preference.',
        zeroMockCheck: 'Real CSS media query rules.'
      },
      {
        title: 'Step 3 — Execute Automated Motion Verification Harness',
        allowedFiles: 'scripts/harness/motion-harness.mjs',
        actions: [
          'Run motion harness scanning CSS and component styles for layout thrashing properties',
          'Assert zero layout thrashing properties (top/left/width/height animations prohibited)'
        ],
        verificationCommand: 'node scripts/harness/motion-harness.mjs',
        completionGate: 'Motion harness passes with zero violations and exits code 0.',
        stopCondition: 'Layout thrashing property detected in animation keyframes.',
        zeroMockCheck: '100% operational AST linter.'
      }
    ],
    acceptanceCriteria: [
      'All transitions are bounded to a maximum duration of 300ms.',
      'Animations strictly use GPU-accelerated transform and opacity properties.',
      'prefers-reduced-motion query successfully disables non-essential animations.'
    ],
    testPlan: [
      'node scripts/harness/motion-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-010',
    title: 'Asset and Reference Provenance',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Cryptographic SHA-256 provenance ledger linking all image, font, and audio assets to approved design references and licensing metadata.',
    dependsOn: 'G-WEB-009',
    blocks: 'G-WEB-011',
    daveDecisionId: 'DAVE-AST-0001',
    daveDecisionType: 'visual_asset',
    confidence: 0.9800,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0010',
    refUri: 'docs/02-product/design/asset-provenance-manifest.json',
    refHash: 'sha256:b10a8db164e0754105b7a99be72e3fe5ef8f9805daca546be3b0c44298fc1c14',
    steps: [
      { name: 'Scan All Visual and Audio Assets for Dimensions, Formats, and Compression', status: 'pending' },
      { name: 'Compute SHA-256 Cryptographic Hashes and Compile Asset Manifest', status: 'pending' },
      { name: 'Verify Asset and Audio Harnesses Against Licensing Invariants', status: 'pending' }
    ],
    context: 'Unverified assets risk intellectual property infringement, bloated bundle sizes, and broken links. This goal audits every visual and audio asset for provenance, SHA-256 integrity, and licensing compliance.',
    why: 'Guarantees 100% cryptographic traceability and asset licensing compliance.',
    doneWhen: 'Asset and audio harnesses verify all public assets against the manifest with zero errors.',
    unblocks: 'Human Review Packet (G-WEB-011).',
    gapId: 'GAP-WEB-010',
    gapEvidence: 'Asset manifests lacked cryptographic SHA-256 binding to design references.',
    gapSolution: 'Compile asset provenance manifest and verify via asset-harness.mjs and audio-harness.mjs.',
    gapVerification: 'node scripts/harness/asset-harness.mjs && node scripts/harness/audio-harness.mjs',
    approach: 'Cryptographic SHA-256 hashing, format validation (WebP/SVG/WAV), aspect ratio enforcement, licensing audit.',
    touchMap: [
      'docs/02-product/design/asset-provenance-manifest.json',
      'scripts/harness/asset-harness.mjs',
      'scripts/harness/audio-harness.mjs'
    ],
    ports: {
      inbound: 'AssetScanPort (Filesystem Reader)',
      outbound: 'ProvenanceLedgerPort (JSON Manifest)'
    },
    workSteps: [
      {
        title: 'Step 1 — Audit Visual Assets for Dimensions and Compression',
        allowedFiles: 'scripts/harness/asset-harness.mjs, docs/02-product/design/asset-provenance-manifest.json',
        actions: [
          'Scan public/assets for modern formats (SVG, WebP) and size limits (< 250KB)',
          'Verify aspect ratio preservation and alt text accessibility metadata'
        ],
        verificationCommand: 'node scripts/harness/asset-harness.mjs',
        completionGate: 'Visual assets comply with performance budgets and format rules.',
        stopCondition: 'Uncompressed asset exceeding 250KB or invalid format.',
        zeroMockCheck: 'Real asset file scanning over disk bytes.'
      },
      {
        title: 'Step 2 — Audit Audio Assets for Duration and Acoustic Budgets',
        allowedFiles: 'scripts/harness/audio-harness.mjs, docs/02-product/design/asset-provenance-manifest.json',
        actions: [
          'Scan public/audio for feedback earcons, duration <= 500ms, and mute controls',
          'Assert audio loudness normalization to -16 LUFS without digital clipping'
        ],
        verificationCommand: 'node scripts/harness/audio-harness.mjs',
        completionGate: 'Audio assets comply with acoustic contracts and mute invariants.',
        stopCondition: 'Audio clipping or missing mute alternative.',
        zeroMockCheck: 'Real audio file validation.'
      },
      {
        title: 'Step 3 — Compile Cryptographic Provenance Manifest',
        allowedFiles: 'docs/02-product/design/asset-provenance-manifest.json',
        actions: [
          'Calculate SHA-256 hash across all asset files and record licensing source',
          'Assert zero ungrounded or unlicensed assets'
        ],
        verificationCommand: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'docs/02-product/design/asset-provenance-manifest.json\'))"',
        completionGate: 'Provenance manifest validates cleanly with exit code 0.',
        stopCondition: 'Hash mismatch or missing license authority.',
        zeroMockCheck: '100% concrete provenance ledger.'
      }
    ],
    acceptanceCriteria: [
      'All visual assets use approved modern formats (SVG/WebP) and satisfy size budgets.',
      'Audio earcons satisfy duration limits (<= 500ms) and acoustic contracts.',
      'Asset provenance manifest cryptographically binds all assets with SHA-256 digests.'
    ],
    testPlan: [
      'node scripts/harness/asset-harness.mjs',
      'node scripts/harness/audio-harness.mjs'
    ]
  },
  {
    id: 'G-WEB-011',
    title: 'Human Review Packet',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'Deterministic generation of compact, auditable Human-in-the-Loop review packets eliminating chain-of-thought opacity.',
    dependsOn: 'G-WEB-010',
    blocks: 'G-WEB-012',
    daveDecisionId: 'DAVE-HITL-0001',
    daveDecisionType: 'human_approval',
    confidence: 0.9900,
    risk: 'low',
    humanAction: 'approve',
    refId: 'REF-0011',
    refUri: 'artifacts/review/DAVE-REVIEW-PACKET.md',
    refHash: 'sha256:d41d8cd98f00b204e9800998ecf8427eef8f9805daca546be3b0c44298fc1c14',
    steps: [
      { name: 'Aggregate All Decision Records, Evidence Citations, and Proof Receipts', status: 'pending' },
      { name: 'Format High-Signal Human Review Packet Without Hidden CoT', status: 'pending' },
      { name: 'Implement Interactive Approval Checkbox Contract and Audit Logging', status: 'pending' }
    ],
    context: 'Human operators cannot effectively review thousands of lines of verbose agent chain-of-thought transcripts. This goal synthesizes all verified decisions into a compact, auditable review packet.',
    why: 'Enables high-leverage human oversight and explicit sign-off with zero cognitive fatigue.',
    doneWhen: 'DAVE review packet is generated, displaying decision summaries, reference hashes, proof metrics, and approval options.',
    unblocks: 'Production Readiness and Learning (G-WEB-012).',
    gapId: 'GAP-WEB-011',
    gapEvidence: 'Reviewers were presented with raw terminal logs rather than structured decision packets.',
    gapSolution: 'Deploy automated review packet formatter in dave-engine.mjs.',
    gapVerification: 'node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001',
    approach: 'High-signal distillation: decision, evidence, assumptions, alternatives rejected, verification metrics, interactive approval checkboxes.',
    touchMap: [
      'scripts/lib/dave-engine.mjs',
      'scripts/lib/dave-cli.mjs',
      'artifacts/review/DAVE-REVIEW-PACKET.md',
      '.agents/audit/decisions.jsonl'
    ],
    ports: {
      inbound: 'ReviewPacketSynthesisPort (Decision Ledger)',
      outbound: 'HumanInteractionPort (Markdown Document / CLI)'
    },
    workSteps: [
      {
        title: 'Step 1 — Aggregate Verified Decisions and Verification Receipts',
        allowedFiles: 'scripts/lib/dave-engine.mjs',
        actions: [
          'Read decisions and proof receipts for target web goal sequence',
          'Extract calibrated confidence scores, risk classifications, and visual diff metrics'
        ],
        verificationCommand: 'node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001',
        completionGate: 'Decision aggregator compiles complete audit trail without omissions.',
        stopCondition: 'Missing decision record or corrupted receipt.',
        zeroMockCheck: 'Real ledger parsing over .agents/audit/decisions.jsonl.'
      },
      {
        title: 'Step 2 — Format High-Signal Review Packet Markdown Document',
        allowedFiles: 'artifacts/review/DAVE-REVIEW-PACKET.md',
        actions: [
          'Render decisions, physical references, rejected alternatives, and proof metrics',
          'Ensure zero chain-of-thought opacity; only concise auditable facts'
        ],
        verificationCommand: 'node -e "require(\'fs\').readFileSync(\'artifacts/review/DAVE-REVIEW-PACKET.md\')"',
        completionGate: 'Review packet renders cleanly with structured sections.',
        stopCondition: 'Unformatted markdown or missing sections.',
        zeroMockCheck: '100% concrete review packet artifact.'
      },
      {
        title: 'Step 3 — Execute Interactive CLI Review and Audit Logging',
        allowedFiles: 'scripts/lib/dave-cli.mjs, .agents/audit/decisions.jsonl',
        actions: [
          'Test soda-os dave review command to record human approval or rejection',
          'Verify audit record appends cleanly with operator identity and timestamp'
        ],
        verificationCommand: 'node scripts/lib/dave-cli.mjs review G-WEB-001 --approve',
        completionGate: 'Review decision recorded in audit ledger with exit code 0.',
        stopCondition: 'Failure to record review decision.',
        zeroMockCheck: '100% operational CLI command and audit writer.'
      }
    ],
    acceptanceCriteria: [
      'Review packet summarizes all decisions, evidence citations, and verification receipts.',
      'Hidden chain-of-thought reasoning is completely omitted in favor of auditable facts.',
      'soda-os dave review successfully logs human approval to .agents/audit/decisions.jsonl.'
    ],
    testPlan: [
      'node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001',
      'node scripts/lib/dave-cli.mjs review G-WEB-001 --approve'
    ]
  },
  {
    id: 'G-WEB-012',
    title: 'Production Readiness and Learning',
    kind: 'qa',
    status: 'planned',
    atomicOutcome: 'End-to-end production readiness verification, decision trajectory logging, and strictly proper RLCD training dataset export.',
    dependsOn: 'G-WEB-011',
    blocks: '—',
    daveDecisionId: 'DAVE-ML-0001',
    daveDecisionType: 'model_confidence',
    confidence: 0.9800,
    risk: 'low',
    humanAction: 'none',
    refId: 'REF-0012',
    refUri: 'artifacts/rlcd/train_dataset.jsonl',
    refHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    steps: [
      { name: 'Run Full Suite of All 9 Verification Harnesses', status: 'pending' },
      { name: 'Compute Strictly Proper Logarithmic Scores and 10x Penalties', status: 'pending' },
      { name: 'Export Calibrated RLCD Training Dataset and Archive Epic WEB', status: 'pending' }
    ],
    context: 'The final phase of DAVE governance completes the learning loop. This goal runs all verification harnesses, scores outcomes with strictly proper logarithmic rules, applies 10x asymmetric false acceptance penalties, and exports clean RLCD training data.',
    why: 'Feeds real verified execution outcomes back into downstream model training, improving calibration over time.',
    doneWhen: 'All 9 harnesses pass, RLCD training dataset is exported, and Epic WEB is certified production ready.',
    unblocks: 'Continuous Fine-Tuning and Model Adaptation.',
    gapId: 'GAP-WEB-012',
    gapEvidence: 'Execution outcomes were lost after goal completion rather than captured for training.',
    gapSolution: 'Deploy exportDaveRlcdData routine to export scored training datasets.',
    gapVerification: 'node scripts/lib/dave-cli.mjs export-rlcd-data',
    approach: 'Strictly proper logarithmic scoring, 10x false acceptance asymmetric penalties, JSONL dataset export.',
    touchMap: [
      'scripts/lib/dave-engine.mjs',
      '.agents/audit/decisions.jsonl',
      'artifacts/rlcd/train_dataset.jsonl',
      'scripts/harness/*.mjs'
    ],
    ports: {
      inbound: 'TelemetryAggregationPort (Audit Ledger)',
      outbound: 'RLCDDatasetExportPort (Training Pipeline / ML)'
    },
    workSteps: [
      {
        title: 'Step 1 — Execute Full Suite of All 9 DAVE Verification Harnesses',
        allowedFiles: 'scripts/harness/*.mjs',
        actions: [
          'Run schema, reference, trace, UI spec, token, visual, motion, asset, and audio harnesses',
          'Assert 100% green verification pass across all 9 specialized harnesses'
        ],
        verificationCommand: 'node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-reference-harness.mjs && node scripts/harness/visual-regression-harness.mjs',
        completionGate: 'All verification harnesses pass with zero failures.',
        stopCondition: 'Any harness failure halts release fail-closed.',
        zeroMockCheck: '100% operational verification harnesses.'
      },
      {
        title: 'Step 2 — Compute Proper Logarithmic Scores and Asymmetric Penalties',
        allowedFiles: 'scripts/lib/dave-engine.mjs',
        actions: [
          'Compute log scores R(c, y) across all recorded decision trajectories',
          'Apply 10x quadratic penalty (-10 * c^2) to any unverified false acceptances'
        ],
        verificationCommand: 'node --test tests/unit/test-dave-engine.mjs',
        completionGate: 'Unit test confirms overconfident error incurs expected penalty.',
        stopCondition: 'Scoring calculation error or missing penalty.',
        zeroMockCheck: 'Mathematical logarithmic score calculation.'
      },
      {
        title: 'Step 3 — Export Calibrated RLCD Training Dataset',
        allowedFiles: 'artifacts/rlcd/train_dataset.jsonl',
        actions: [
          'Export scored JSONL training records to artifacts/rlcd/train_dataset.jsonl',
          'Verify dataset record counts and schema validity'
        ],
        verificationCommand: 'node scripts/lib/dave-cli.mjs export-rlcd-data --output artifacts/rlcd/train_dataset.jsonl',
        completionGate: 'RLCD dataset successfully exported with exit code 0.',
        stopCondition: 'Export failure or empty dataset.',
        zeroMockCheck: 'Real JSONL training records with computed rewards.'
      }
    ],
    acceptanceCriteria: [
      'All 9 DAVE verification harnesses pass 100% green with zero errors.',
      'Strictly proper logarithmic scoring and 10x asymmetric penalties computed accurately.',
      'Calibrated RLCD training dataset exported to artifacts/rlcd/train_dataset.jsonl.'
    ],
    testPlan: [
      'node scripts/lib/dave-cli.mjs export-rlcd-data --output artifacts/rlcd/train_dataset.jsonl',
      'node --test tests/unit/test-dave-engine.mjs'
    ]
  }
];

export function generateDaveWebGoalCard(goal) {
  const safeId = goal.id.replace(/^G-WEB-/, '');

  const stepsTable = goal.steps.map((s, idx) => {
    return `| ${idx + 1} | ${s.name} | ${s.status} |`;
  }).join('\n');

  const inList = goal.workSteps.map(ws => `- ${ws.title.replace(/^Step \d+\s*—\s*/, '')}`).join('\n');
  const outList = `- Features and endpoints outside ${goal.id} touch map.\n- Unverified arbitrary visual properties or ad-hoc design tokens.\n- Mock objects, dummy stubs, and string simulations (Article I non-negotiable invariant).`;

  const workStepsFormatted = goal.workSteps.map(ws => {
    return `### ${ws.title}\n\n` +
      `**Allowed files:** ${ws.allowedFiles}  \n` +
      `**Actions:**\n\n` +
      ws.actions.map((act, i) => `${i + 1}. ${act}`).join('\n') + '\n\n' +
      `**Verification command:** \`${ws.verificationCommand}\`  \n` +
      `**Completion gate:** ${ws.completionGate}  \n` +
      `**Stop condition:** ${ws.stopCondition}  \n` +
      `**Zero-Mock invariant check:** ${ws.zeroMockCheck}\n`;
  }).join('\n');

  const changeDeltaRows = goal.touchMap.map(p => {
    return `| \`${p}\` | ADD / CHANGE | Managed under ${goal.id} |`;
  }).join('\n');

  const testPlanList = goal.testPlan.map(cmd => `- \`${cmd}\``).join('\n');
  const touchMapList = goal.touchMap.map(p => `- \`${p}\``).join('\n');

  const acceptanceList = goal.acceptanceCriteria.map((ac, idx) => {
    return `- [ ] **AC-WEB-${safeId}-${String(idx + 1).padStart(2, '0')}:** Given an operational Soda OS environment, when ${ac.replace(/\.$/, '')}, then the invariant is satisfied with exit code 0 and zero mocks.`;
  }).join('\n');

  return `---
goal_contract:
  id: ${goal.id}
  version: 2
  kind: ${goal.kind}
  status: ${goal.status}
  profiles:
    - core
    - dave_exact_design
  atomicity:
    outcome_count: 1
    primary_outcome: "${goal.atomicOutcome.replace(/"/g, '\\"')}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: ${goal.risk}
    reasons:
      - exact-design-governance
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: pending
  external_dependencies: []
---

# ${goal.id}: ${goal.title}

**Status:** ${goal.status}  
**Kind:** ${goal.kind}  
**Atomic outcome:** ${goal.atomicOutcome}  
**Epic:** WEB  
**Depends on:** ${goal.dependsOn}  
**Blocks:** ${goal.blocks}  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** PLAN

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
${stepsTable}

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents \`.git/index.lock\` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | \`.\` *(primary repo root)* | \`feature/${goal.id}\` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | \`docs/07-backlog/goals/${goal.id}.md\`, \`docs/06_raw/\` | \`INIT\` → \`DISPATCH\` → \`JOIN\` → \`VERIFY\` → \`CLEANUP\` |
| **Subagent-1 (Implementer)** | \`.worktrees/${goal.id}-impl\` | \`feature/${goal.id}-impl\` | Step 1 & 2: Production source implementation & domain logic | \`src/**\`, \`scripts/lib/**\` (scoped implementation files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-2 (Verifier/Test)** | \`.worktrees/${goal.id}-test\` | \`feature/${goal.id}-test\` | Step 3: Zero-mock unit & latency SLA integration test suites | \`tests/**\`, \`scripts/harness/**\` (scoped test files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-3 (Socratic/Archivist)** | \`.worktrees/${goal.id}-arch\` | \`feature/${goal.id}-arch\` | Socratic 5-Why dialectic, baseline freeze & audit log | \`docs/06_raw/\`, \`docs/wiki/\` | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |

#### 2. Isolation & Concurrency Invariants

- **Git Index Isolation:** Every subagent executes within an independent Git worktree (\`git worktree add <path> -b <branch>\`), ensuring dedicated \`.git/worktrees/.../index\` files and zero index lock contention (\`fatal: Unable to create '.git/index.lock'\`).
- **Disjoint Touch Map Theorem:** Subagent write permissions must satisfy strict disjointness:
  $$\\text{TouchMap}(\\text{Subagent}_i) \\cap \\text{TouchMap}(\\text{Subagent}_j) = \\emptyset \\quad \\forall i \\neq j$$
  Write-write collisions across subagents trigger an immediate, fail-closed orchestrator abort.
- **Port & Socket Isolation:** Concurrent test suites must dynamically bind ephemeral OS ports (\`127.0.0.1:0\`) and utilize isolated test caches (\`.pytest_cache-{role}\` or scoped temp databases) to eliminate \`EADDRINUSE\` socket conflicts.
- **Hardware Acceleration Contention:** GPU streams/Metal buffers (\`mps\` / \`cuda\`) and CPU thread allocations are capped per subagent to avoid CUDA OOM or scheduler thrashing.

#### 3. Orchestration Saga & Synchronization Protocol

$$\\text{DISPATCH (Fork Worktrees)} \\longrightarrow \\text{CONCURRENT EXECUTION} \\longrightarrow \\text{BARRIER JOIN (Green Receipts)} \\longrightarrow \\text{RECONCILIATION MERGE} \\longrightarrow \\text{TEARDOWN & PRUNE}$$

1. **Dispatch & Worktree Provisioning:**
   \`\`\`bash
   git worktree add .worktrees/${goal.id}-impl -b feature/${goal.id}-impl
   git worktree add .worktrees/${goal.id}-test -b feature/${goal.id}-test
   git worktree add .worktrees/${goal.id}-arch -b feature/${goal.id}-arch
   \`\`\`
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (\`exit_code: 0\`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into \`feature/${goal.id}\` sequentially:
   \`\`\`bash
   git merge --ff-only feature/${goal.id}-impl
   git merge --ff-only feature/${goal.id}-test
   git merge --ff-only feature/${goal.id}-arch
   \`\`\`
5. **Teardown & Worktree Pruning:**
   \`\`\`bash
   git worktree remove --force .worktrees/${goal.id}-impl
   git worktree remove --force .worktrees/${goal.id}-test
   git worktree remove --force .worktrees/${goal.id}-arch
   git worktree prune
   git branch -d feature/${goal.id}-impl feature/${goal.id}-test feature/${goal.id}-arch
   \`\`\`

## Context

${goal.context}

## Intent

**Why:** ${goal.why}

**Done when:** ${goal.doneWhen}

**Unblocks:** ${goal.unblocks}

## 1. Problem and Value

- **Problem:** Visual drift, ungrounded design claims, and lack of calibrated decision evidence in frontend workflows.
- **Affected users or agents:** Autonomous coding agents, design system reviewers, and end-users expecting exact design fidelity.
- **Current behavior:** Agents generated semantically similar pages that diverged geometrically and lacked calibrated confidence.
- **Failure cost:** Visual regressions, broken responsive states, accessibility failures, and user mistrust.
- **Desired behavior:** ${goal.atomicOutcome}
- **Why now:** Core milestone to establish DAVE as the SYSTEM 1 decision engine for web applications in Soda OS.
- **If not completed:** Web application development remains vulnerable to subjective styling drift and missing error boundaries.

## 2. Scope & Boundaries

## In

${inList}

## Out

${outList}

### Explicitly deferred
- Multi-tenant cloud synchronization across third-party design tools.

### Future work
- Real-time collaborative design canvas editing.

### Non-goals
- Bypassing DAVE verification gates or generating unapproved ad-hoc styles.

## 3. Dependency Graph & Blockers

- **Dependencies:** ${goal.dependsOn}
- **Blockers:** None
- **Dependent goals:** ${goal.blocks}

## 4. Assumptions Registry

\`\`\`yaml
assumptions:
  - id: A-${safeId}-001
    statement: "Target rendering environment (1440x900 desktop, Inter font) is deterministic and repeatable."
    confidence: high
    validation_goal: ${goal.dependsOn !== '—' ? goal.dependsOn.split(/[\s,]+/)[0] : goal.id}
    invalidation_condition: "Headless browser font rendering discrepancies or non-deterministic layout shifts."
    owner: system-architect
\`\`\`

## 5. Risks & Mitigation Registry

\`\`\`yaml
risks:
  - id: R-${safeId}-001
    category: visual_fidelity
    description: "Layout shift or pixel delta exceeding tolerance threshold."
    severity: medium
    impact: medium
    mitigation: "Strict token guardrails and automated visual regression testing in CI."
    detection: "visual-regression-harness.mjs reporting pixelDiffRatio > 0.0050."
    response: "Halt build fail-closed and defer to human review packet."
    owner: system-architect
\`\`\`

## 6. Failure Policy & Rollback Contract

\`\`\`yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Automated test regression, visual diff breach, or token guardrail violation"
  command: "git checkout -- ${goal.touchMap[0]}"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "${goal.testPlan[0]}"
\`\`\`

## Security & Trust Boundaries

\`\`\`yaml
security:
  threat_model: "Guards against prompt injection, unapproved visual drift, arbitrary styles, and unverified code generation"
  trust_boundary: "Strict isolation between LLM output tokens and deterministic governance kernel"
  tool_authorization: "Least privilege execution via cryptographic authorization tokens"
  sandbox_boundary: "Wasmtime WASM sandbox and POSIX process isolation with 256MB memory ceiling"
  secret_handling: "Zero credentials in prompt or code; authenticated via local environment or vault"
  pii_handling: "All sensory inputs scrubbed via AEgis PII vault prior to embedding"
\`\`\`

## Observability & Drift Telemetry

\`\`\`yaml
observability:
  metrics:
    - decision_count
    - calibrated_confidence
    - pixel_diff_ratio
    - layout_shift
    - token_violation_count
    - proceed_rate
    - verify_rate
    - defer_rate
    - human_review_rate
  alerts:
    - "pixel_diff_ratio > 0.0050"
    - "confidence < 0.85"
  traces:
    - "dave.decision.evaluate"
    - "dave.visual.regression"
\`\`\`

## Resource & Cost Budget

\`\`\`yaml
resource_budget:
  latency_budget: "p99 < 100ms per DAVE decision evaluation"
  memory_budget: "128MB kernel RAM"
  compute_budget: "Local CPU host execution with headless Chromium rendering"
  token_budget: "0 tokens (pure deterministic algorithms)"
\`\`\`

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable deliverable.
- **No decomposition leakage:** Any secondary deliverable belongs to a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or hardcoded success responses.
- **Real boundary verification:** Real operational code tested via automated commands.
- **Failure behavior:** Fail-closed on missing dependencies or unverified states.
- **Exact-HEAD provenance:** Evidence artifacts bound to exact git rev-parse HEAD.
- **Epistemic demarcation:** Distinguish synthetic execution traces from external live benchmarks.
- **Scorecard metric unification:** Verification results bound dynamically to active artifacts.
- **5-Gate Epistemic Hierarchy:** Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness.
- **Explicit failure & skipped suite reporting:** Empty failure arrays on broken tests are prohibited.
- **Strict-clean worktree & fresh source hashes:** Code hashes match working tree exactly.
- **Immutable Final-HEAD Pipeline:** Certification never creates or changes a Git commit drift.
- **Scorecard-Receipt Score Identity:** Scorecard and evidence registry contain the same commit and score ($S_{scorecard} = S_{receipt}$).
- **Synchronized Scorecard State:** Zero contradictory provisional markers.
- **DAVE Fail-Closed Gatekeeping & Decision Grounding:** Every goal producing or modifying UI components, design tokens, frontend logic, or game assets MUST be grounded in an approved DAVE decision record (\`DAVE-UX-xxxx\`, \`DAVE-FE-xxxx\`) and content-addressed reference citation (\`REF-xxxx\`). Execution is locked fail-closed via \`soda-os implement\` until verified. Raw hex colors, arbitrary spacing (\`mt-[37px]\`), and missing component states are prohibited.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders
- **DAVE Decision & Reference grounding:** Verified DAVE decision ID and content-addressed reference citations

## Quality priority

**Priority:** P1  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| ${goal.gapId} | P1 | ${goal.gapEvidence} | developer | ${goal.gapSolution} | ${goal.gapVerification} | open |

## How

**Stack / approach:** ${goal.approach}

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DAVE-EXACT-DESIGN |
| **Decisions** | ADR-005 |
| **Assumptions required** | A-WEB-001 |
| **Evidence** | \`docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md\` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-005 |
| **PDR** | — |
| **Patterns** | DAVE-System-1, Exact-Design, Zero-Mock |
| **Acceptance** | \`docs/02-product/acceptance/${goal.id}.md\` |
| **Skills** | \`soda-dave-decision-orchestration\` · \`soda-dave-visual-fidelity\` · \`soda-dave-hitl-review\` |
| **Profile** | dave_exact_design |
| **Task type** | ${goal.kind === 'architecture' ? 'architecture_spec' : 'add_feature'} |
| **Playbook** | \`docs/06-workflows/dev-loop.md\` |
| **Default role** | system-architect |
| **Files** | ${goal.touchMap.map(p => `\`${p}\``).join(', ')} |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

${workStepsFormatted}

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
${changeDeltaRows}

## Contract impact

- **Schema modifications:** None / Registered canonical schemas
- **Dynamic domain & action impact:** Registered capabilities
- **Cross-runtime parity:** Python and Node.js parity

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | \`feature/WEB\` |
| **System Archetype** | \`web-ui\` |
| **Bounded Context & Domain** | Core Domain: DAVE Exact Design & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: ${goal.ports.inbound}; Driven Outbound: ${goal.ports.outbound} |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Probability Bounds |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`goal-template-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | \`docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md\` |
| **Worktree & Subagent Orchestration** | Worktree Path Strategy: \`.worktrees/${goal.id}-{role}\` <br> Disjoint Touch Map Theorem: $\\text{TouchMap}(A) \\cap \\text{TouchMap}(B) = \\emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (\`architecture-design-conformance-harness.mjs\`)
- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not \`open\` + \`low\`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] Codex Superintelligence Empirical Invariants verified when applicable
- [x] Proof-and-Evidence Contract specified (Formal Proof, Statistical Guarantee, Empirical Evidence defined)
- [x] 7-Stage Mathematical & Empirical Verification Pipeline defined without ungrounded absolute claims
- [x] Exact-HEAD Provenance Contract declared (zero stale commit references, artifact.commit == git rev-parse HEAD)
- [x] Epistemic Demarcation & Adversarial Stress Testing defined (synthetic vs external environment, partial observability)
- [x] Unified Scorecard Derivation verified (Scorecard_HEAD = f(all current evidence artifacts))
- [x] 5-Gate Epistemic Hierarchy preserved (Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness)
- [x] Explicit Failure & Skipped Suite Reporting enforced in certification receipts (no empty arrays on failure)
- [x] Strict Clean-Tree and Fresh Source Digest verification enforced (artifact.source_hashes match exact working tree)
- [x] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)
- [x] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)
- [x] Epistemic Proof & Evidence Classification verified
- [x] Worktree orchestration plan defined

## Acceptance criteria

${acceptanceList}

## Test plan

${testPlanList}

### 1. Positive Tests
- ${goal.testPlan[0]}

### 2. Negative Tests
- Invalid input rejection and boundary error handling

### 3. Fail-Closed & Chaos Tests
- Simulated network failure, malformed payload drop, and circuit breaker activation

### 4. Temporal Causality Tests ($t \\le T$)
- Strict temporal monotonicity and zero lookahead bias

### 5. Security & Air-Gap Checks
- Air-gap verification, PII sanitization, and cryptographic signature check

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state under operational envelope | \`docs/07-backlog/evidence/\` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact \`git rev-parse HEAD\` | \`master_scorecard_evidence_report.json\` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest / node test suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Touch map

${touchMapList}

## 7. Learning-Loop Contract

- **Observed metrics:** Calibrated Confidence, Pixel Diff Ratio, CLS, Human Override Rate.
- **Review schedule:** Evaluated continuously per commit and batched after every DAVE decision cycle.
- **Regression threshold:** Pixel diff > 0.0050 or ungrounded styling blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic review packets for instant HITL adjudication.

## Notes for AI

- Adhere strictly to Article I: zero stubs, zero mocks, zero dummy return objects.
- Ensure all constraints are testable and strict.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (\`Zero-Mock & Deterministic Contract\`).

### 1. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | \`${goal.ports.inbound}\` | CLI / HTTP Component API | \`${goal.touchMap[0]}\` |
| **Driven (Outbound)** | \`${goal.ports.outbound}\` | POSIX JSONL / Bitmap Engine | \`${goal.touchMap[goal.touchMap.length - 1]}\` |

### 2. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| \`State::Idle\` | System bootstrap / File intake | Validated inputs | Transition to \`State::Evaluating\` | Reject with 400 Bad Request |
| \`State::Evaluating\` | Execution dispatch | Invariant: Strict boundaries | Transition to \`State::Verified\` | Emit diagnostic error log |
| \`State::Verified\` | Batch commit | Invariant: Zero float math | Transition to \`State::Committed\` | Quarantine record to error ledger |
| \`State::Committed\` | Ledger persistence | 100% concrete types | Write audit record | Revert uncommitted batch entries |
| \`State::Quarantined\` | Invariant violation trigger | Format corrupted | Route to human review | Flag dataset split for inspection |

### 3. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Probability & Confidence Math** | Exact bounded floating-point in $[0.0, 1.0]$ with 4-decimal precision; reject non-finite values (NaN/Inf). |
| **Identifiers & Keys** | Time-ordered UUIDv7 (\`uuid::Uuid::now_v7()\`) or goal ID prefix (\`G-WEB-xxx\`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (\`chrono::Utc::now()\`). |
| **Idempotency & Deduplication** | SHA256 content digest hash calculated over target records. |

### 4. Codex Superintelligence Empirical Criteria & Invariants

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains with $\\ge 90\\%$ retention of baseline quality. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $\\ge 92\\%$; counterfactual error strictly bounded. | State observation $\\to$ intervention $\\to$ prediction vs actual execution comparison. |

### 5. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **5-Gate Epistemic Taxonomy**:
- **Gate 1: Executable Invariant** — In-kernel assertions, state-machine transitions, runtime bounds, property tests.
- **Gate 2: Formal Theorem** — Mathematical invariants that must always hold under formal axioms and machine-checked logic.
- **Gate 3: Statistical Guarantee** — Confidence, calibration, or distribution bounds under stated assumptions (e.g. Brier score $\\le 0.08$, ECE $\\le 0.04$, Wilson score intervals).
- **Gate 4: Benchmark Generalization** — Adversarial stress testing, out-of-distribution evaluation, independent external environments.
- **Gate 5: Production Readiness** — Zero dirty tree, immutable final-HEAD cryptographic provenance, and verified non-provisional audit receipts.

$$\\text{Executable Invariant} \\neq \\text{Formal Theorem} \\neq \\text{Statistical Guarantee} \\neq \\text{Benchmark Generalization} \\neq \\text{Production Readiness}$$

#### Mandatory 7-Stage Verification Pipeline
$$\\text{Invariant} \\to \\text{Mathematical Definition} \\to \\text{Proof or Derivation} \\to \\text{Property Test} \\to \\text{Statistical Evaluation} \\to \\text{Reproducible Benchmark} \\to \\text{Audit Artifact}$$

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| \`CLM-${safeId}\` | ${goal.title} Invariant Boundedness | Executable Invariant | $\\forall x \\in \\mathcal{D}, \\text{valid}(x) \\land \\text{bounded}(x)$ | Automated Test Verification | \`${goal.testPlan[0]}\` | \`docs/06_raw/\` |

---

### 🌐 Modular Domain Profiles *(Declared in \`goal_contract.profiles\`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** \`Profile: core\` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** \`node scripts/harness/goal-template-conformance-harness.mjs ${goal.id}\`

##### Machine-Readable Invariant Registry
\`\`\`yaml
invariants:
  - id: ${safeId}-INV-001
    type: determinism
    claim: "${goal.title} satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "${goal.title} satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: ${goal.testPlan[0]}
    verification:
      command: ${goal.testPlan[0]}
    verification_command: "${goal.testPlan[0]}"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
\`\`\`

##### Machine-Readable Statistical Claims & Empirical Evidence
\`\`\`yaml
statistical_claims:
  - id: STAT-${safeId}-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/${goal.id}-proof-receipt.json
\`\`\`

##### Autonomous Decision Routing Contract & Truth Table
\`\`\`yaml
routing_contract:
  cases:
    - risk: normal
      evidence: verified
      confidence: high
      expected: proceed
    - risk: normal
      evidence: verified
      confidence: low
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: high
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: low
      expected: defer
    - risk: high
      evidence: verified
      confidence: high
      expected: human_review
    - risk: high
      evidence: verified
      confidence: low
      expected: defer
    - risk: high
      evidence: unverified
      confidence: high
      expected: defer
    - risk: high
      evidence: unverified
      confidence: low
      expected: defer
\`\`\`

#### Profile: dave_exact_design — DAVE System 1 Decision & Evidence Governance Contract

> **Applies when:** \`Profile: dave_exact_design\` (DAVE decisions, visual references, UI components, RLCD data).  
> **Harness Command:** \`node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-reference-harness.mjs && node scripts/harness/visual-regression-harness.mjs\`

##### 1. DAVE Typed Decision Specification
\`\`\`yaml
dave_decision:
  decision_id: "${goal.daveDecisionId}"
  decision_type: "${goal.daveDecisionType}"
  goal_id: "${goal.id}"
  summary: "${goal.title} specification under DAVE governance"
  confidence: ${goal.confidence.toFixed(4)}
  risk: "${goal.risk}"
  evidence:
    - "${goal.touchMap[0]}"
  references:
    - "${goal.refId}"
  assumptions:
    - "Target viewport is locked at 1440x900 desktop"
  alternatives_rejected:
    - "Ad-hoc freeform implementation without reference citations"
  verification:
    - "visual-regression"
    - "token-guardrail"
  human_action: "${goal.humanAction}"
  execution_policy: "fail_closed"
\`\`\`

##### 2. First-Class Reference Evidence Specification
\`\`\`yaml
dave_references:
  - reference_id: "${goal.refId}"
    type: "image"
    purpose: "visual_layout_reference"
    uri: "${goal.refUri}"
    content_hash: "${goal.refHash}"
    viewport:
      width: 1440
      height: 900
    device_pixel_ratio: 1
    font_environment:
      family: "Inter"
      locked: true
    source: "human_uploaded"
    authority: "approved_design_reference"
\`\`\`

##### 3. Bounded Visual Fidelity & Mathematical Proof Thresholds
\`\`\`yaml
visual_fidelity:
  thresholds:
    pixel_diff_ratio: 0.0050
    layout_shift: 0
    horizontal_overflow: false
    text_overflow: false
    accessibility: "wcag_2_2_aa"
  supported_viewports:
    - width: 1440
      height: 900
      name: "desktop"
    - width: 1024
      height: 768
      name: "tablet"
    - width: 390
      height: 844
      name: "mobile"
\`\`\`

##### 4. RLCD Calibration & Trajectory Recording Contract
\`\`\`yaml
rlcd_trajectory:
  ledger: ".agents/audit/decisions.jsonl"
  scoring_rule: "strictly_proper_logarithmic"
  asymmetric_penalty:
    false_acceptance_multiplier: 10.0
    false_deferral_multiplier: 1.0
  export_target: "artifacts/rlcd/train_dataset.jsonl"
\`\`\`
`;
}

export function runDaveWebGoalGenerator() {
  console.log('═'.repeat(80));
  console.log('🛡️ SODA OS DAVE EXACT WEB APPLICATION GOAL GENERATOR (G-WEB-001..012)');
  console.log('═'.repeat(80));

  if (!existsSync(GOALS_DIR)) {
    mkdirSync(GOALS_DIR, { recursive: true });
  }

  let generatedCount = 0;
  for (const goal of DAVE_WEB_GOALS) {
    const filePath = join(GOALS_DIR, `${goal.id}.md`);
    const content = generateDaveWebGoalCard(goal);
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Generated: ${goal.id} -> ${filePath}`);
    generatedCount++;
  }

  console.log('═'.repeat(80));
  console.log(`📊 Successfully generated ${generatedCount} DAVE web goal cards.`);
  console.log('═'.repeat(80));
  return generatedCount;
}

if (process.argv[1] && process.argv[1].endsWith('generate-dave-web-goals.mjs')) {
  runDaveWebGoalGenerator();
}

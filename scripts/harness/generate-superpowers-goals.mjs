#!/usr/bin/env node

/**
 * Generator for Atomic Goals G-CORE-022 through G-CORE-030.
 * Synthesizes Superpowers execution discipline into 100% compliant Soda OS Template v2 goal cards.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOALS = [
  {
    id: 'G-CORE-022',
    title: 'Mandatory Pre-Execution Design Specification Protocol and Automated Alignment Gate',
    kind: 'governance',
    atomicOutcome: 'Establish formal requirement for docs/03-architecture/specs/goals/G-xxx/design.md covering intent, goals/anti-goals, rejected alternatives, and trade-offs before any code modification.',
    dependsOn: 'G-CORE-021',
    blocks: 'G-CORE-023',
    touchMap: [
      '.agents/rules/goal-creation.md',
      '.agents/templates/execute-goal.md',
      'scripts/harness/goal-template-conformance-harness.mjs',
      'template/.agents/rules/goal-creation.md',
      'template/.agents/templates/execute-goal.md'
    ],
    verifyCommand: 'node scripts/harness/goal-template-conformance-harness.mjs --all',
    rationale: 'Prevents premature implementation, hallucinated architecture, and scope creep by mandating structured design evaluation prior to coding.',
  },
  {
    id: 'G-CORE-023',
    title: 'Executable Micro-Task Action Schema and Checkable Step Verification DAG',
    kind: 'feature',
    atomicOutcome: 'Formalize 2-5 minute micro-task granularity in action-step-N.yaml specifying exact touched files, explicit failing and passing verification commands, persona, and commit boundaries.',
    dependsOn: 'G-CORE-022',
    blocks: 'G-CORE-024',
    touchMap: [
      'schemas/action-step.schema.json',
      'scripts/goals/goal-markdown-sync.js',
      'template/schemas/action-step.schema.json',
      'template/scripts/goals/goal-markdown-sync.js'
    ],
    verifyCommand: 'node --test scripts/agents/test/*.test.mjs',
    rationale: 'Eliminates vague monolithic goal steps by breaking work down into single checkable actions with deterministic verification bounds.',
  },
  {
    id: 'G-CORE-024',
    title: 'Two-Stage Subagent Review Gate for Specification Compliance and Code Quality',
    kind: 'governance',
    atomicOutcome: 'Implement automated two-pass review protocol on subagent handoffs validating specification compliance first followed by code quality second.',
    dependsOn: 'G-CORE-023',
    blocks: 'G-CORE-025',
    touchMap: [
      'scripts/agents/lib/subagent-spawner.mjs',
      '.agents/skills/soda-code-review/SKILL.md',
      'scripts/agents/test/subagent-spawner.test.mjs',
      'template/scripts/agents/lib/subagent-spawner.mjs',
      'template/.agents/skills/soda-code-review/SKILL.md'
    ],
    verifyCommand: 'node --test scripts/agents/test/*.test.mjs',
    rationale: 'Catches specification deviations immediately at the task level before they compound across subsequent execution steps.',
  },
  {
    id: 'G-CORE-025',
    title: 'Profile-Conditioned RED-GREEN-REFACTOR Test-Driven Development Protocol',
    kind: 'governance',
    atomicOutcome: 'Enforce mandatory failing test execution proof prior to code creation and passing verification evidence post-implementation for all code-bearing goals.',
    dependsOn: 'G-CORE-024',
    blocks: 'G-CORE-026',
    touchMap: [
      '.agents/rules/tdd-execution.md',
      'scripts/harness/verification-orchestrator-harness.mjs',
      'template/.agents/rules/tdd-execution.md',
      'template/scripts/harness/verification-orchestrator-harness.mjs'
    ],
    verifyCommand: 'node --test tests/ml/*.mjs',
    rationale: 'Guarantees true test-driven development by rejecting tests that pass prior to implementation or implementation code modified without prior failing verification.',
  },
  {
    id: 'G-CORE-026',
    title: 'Systematic Debugging Methodology and Root Cause Isolation Playbook',
    kind: 'governance',
    atomicOutcome: 'Enhance soda-bug-triage skill with structured 5-stage systematic debugging protocol (Reproduction -> Isolation -> Hypothesis -> Minimal Fix -> Regression Verification).',
    dependsOn: 'G-CORE-025',
    blocks: 'G-CORE-027',
    touchMap: [
      '.agents/skills/soda-bug-triage/SKILL.md',
      'template/.agents/skills/soda-bug-triage/SKILL.md'
    ],
    verifyCommand: 'node ./cli.js upgrade --report',
    rationale: 'Replaces speculative guessing with disciplined condition-based waiting, call-chain tracing, and root-cause verification.',
  },
  {
    id: 'G-CORE-027',
    title: 'Verification-Before-Completion Universal Communication Lock Invariant',
    kind: 'governance',
    atomicOutcome: 'Establish strict communication rule across all agent runtime prompts forbidding success claims without preceding diff inspection and verification execution in the immediate turn.',
    dependsOn: 'G-CORE-026',
    blocks: 'G-CORE-028',
    touchMap: [
      '.agents/rules/governance.md',
      'scripts/agents/lib/compact-prompt.mjs',
      'template/.agents/rules/governance.md',
      'template/scripts/agents/lib/compact-prompt.mjs'
    ],
    verifyCommand: 'node --test scripts/agents/test/*.test.mjs',
    rationale: 'Eliminates ungrounded conversational claims of completion and hallucinated success states across multi-agent swarms.',
  },
  {
    id: 'G-CORE-028',
    title: 'Behavioral Skill Pressure-Testing Harness and Adversarial Evaluation Suite',
    kind: 'feature',
    atomicOutcome: 'Build scripts/harness/skill-pressure-test-harness.mjs to pressure-test agent skills against dirty worktrees, time pressure, gate-skipping requests, and budget traps.',
    dependsOn: 'G-CORE-027',
    blocks: 'G-CORE-029',
    touchMap: [
      'scripts/harness/skill-pressure-test-harness.mjs',
      'template/scripts/harness/skill-pressure-test-harness.mjs'
    ],
    verifyCommand: 'node scripts/harness/skill-pressure-test-harness.mjs --help',
    rationale: 'Treats autonomous skills as critical software, ensuring agents adhere strictly to governance rules under adversarial prompts.',
  },
  {
    id: 'G-CORE-029',
    title: 'Unified Cross-Harness Soda Plugin Manifest and Portable Packaging Layer',
    kind: 'feature',
    atomicOutcome: 'Define schemas/soda-plugin-manifest.schema.json and packaging engine to distribute Soda OS skills, rules, and runtime adapters across Claude, Codex, Cursor, Antigravity, and Gemini.',
    dependsOn: 'G-CORE-028',
    blocks: 'G-CORE-030',
    touchMap: [
      'schemas/soda-plugin-manifest.schema.json',
      'scripts/lib/soda-plugin-packager.mjs',
      'template/schemas/soda-plugin-manifest.schema.json',
      'template/scripts/lib/soda-plugin-packager.mjs'
    ],
    verifyCommand: 'node --test scripts/agents/test/*.test.mjs',
    rationale: 'Enables zero-friction distribution and version-locked parity across diverse developer harnesses in the ecosystem.',
  },
  {
    id: 'G-CORE-030',
    title: 'Post-Compaction Session Bootstrap and Lightweight Context Delta Restoration',
    kind: 'feature',
    atomicOutcome: 'Implement session bootstrap engine to reinject active goal ID, step index, allowed files, blockers, and delta context after context window compaction or process restart.',
    dependsOn: 'G-CORE-029',
    blocks: 'G-CORE-031',
    touchMap: [
      'scripts/agents/lib/session-bootstrap.mjs',
      'scripts/agents/test/session-bootstrap.test.mjs',
      'template/scripts/agents/lib/session-bootstrap.mjs',
      'template/scripts/agents/test/session-bootstrap.test.mjs'
    ],
    verifyCommand: 'node --test scripts/agents/test/*.test.mjs',
    rationale: 'Maintains bounded context budgets while ensuring flawless multi-step state continuity across long-running autonomous workflows.',
  },
  {
    id: 'G-CORE-031',
    title: 'Branch-Finishing Protocol and Pre-PR Health Verification Gate',
    kind: 'governance',
    atomicOutcome: 'Implement automated branch-finishing protocol inspecting full git diff, suite cleanliness, commit boundaries, and target branch before PR generation in ship phase.',
    dependsOn: 'G-CORE-030',
    blocks: 'G-CORE-032',
    touchMap: [
      '.agents/skills/soda-deploy-staging/SKILL.md',
      'scripts/goals/goal-execution-preflight.js',
      'template/.agents/skills/soda-deploy-staging/SKILL.md',
      'template/scripts/goals/goal-execution-preflight.js'
    ],
    verifyCommand: 'node ./cli.js upgrade --report',
    rationale: 'Prevents dirty commits, uninspected diffs, and premature branch merges by mandating a structured pre-PR checklist.',
  },
  {
    id: 'G-CORE-032',
    title: 'Agent Behavioral Compliance Benchmark and Empirical Metrics Gate',
    kind: 'qa',
    atomicOutcome: 'Build an empirical evaluation benchmark measuring agent behavioral compliance rates across TDD adherence, gate skipping resistance, premature completion, and context budgets.',
    dependsOn: 'G-CORE-031',
    blocks: 'G-CORE-033',
    touchMap: [
      'scripts/harness/agent-observability-harness.mjs',
      'schemas/agent-cognitive-trajectory.schema.json',
      'template/scripts/harness/agent-observability-harness.mjs',
      'template/schemas/agent-cognitive-trajectory.schema.json'
    ],
    verifyCommand: 'node scripts/harness/agent-observability-harness.mjs --help',
    rationale: 'Provides quantitative telemetry and scorecards certifying how faithfully agents adhere to governance and TDD protocols over time.',
  },
  {
    id: 'G-CORE-033',
    title: 'Profile-Driven Evidence Matrix and Verification Scope Resolver',
    kind: 'architecture',
    atomicOutcome: 'Implement automated profile-driven verification resolver mapping goal profile to required evidence type without imposing universal unit testing on non-coding goals.',
    dependsOn: 'G-CORE-032',
    blocks: 'None (Terminal wave completion)',
    touchMap: [
      'docs/03-architecture/specs/formal-verification.md',
      'scripts/harness/verification-orchestrator-harness.mjs',
      'template/docs/03-architecture/specs/formal-verification.md',
      'template/scripts/harness/verification-orchestrator-harness.mjs'
    ],
    verifyCommand: 'node scripts/harness/verification-orchestrator-harness.mjs --help',
    rationale: 'Eliminates workflow friction and false-positive failures by enforcing appropriate evidence disciplines across governance, research, design, and code.',
  },
];

const TEMPLATE_PATH = resolve('docs/07-backlog/goals/_template.md');
const templateRaw = readFileSync(TEMPLATE_PATH, 'utf8');

for (const g of GOALS) {
  let card = templateRaw;

  // Replace Header & Frontmatter
  card = card.replace(/id: G-PAY-001/g, `id: ${g.id}`);
  card = card.replace(/id: G-xxx/g, `id: ${g.id}`);
  card = card.replace(/title: Generic Capability Title/g, `title: ${g.title}`);
  card = card.replace(/kind: (feature|governance|fix)/g, `kind: ${g.kind}`);
  card = card.replace(/status: draft/g, `status: ready`);
  card = card.replace(/lifecycle:\n  spec: draft\n  implementation: pending\n  verification: pending\n  evidence: pending\n  review: pending\n  release: pending\n  learning: pending/g,
    `lifecycle:\n  spec: ready\n  implementation: pending\n  verification: pending\n  evidence: pending\n  review: pending\n  release: pending\n  learning: pending`);
  card = card.replace(/epic: CORE/g, `epic: CORE`);
  card = card.replace(/atomic_outcome: "One crisp sentence describing the exact operational capability achieved on completion."/g,
    `atomic_outcome: "${g.atomicOutcome}"`);
  card = card.replace(/primary_outcome: "\[One independently verifiable outcome; one goal must not contain multiple deliverables\]"/g,
    `primary_outcome: "${g.atomicOutcome}"`);
  card = card.replace(/depends_on: \[\]/g, `depends_on: ["${g.dependsOn}"]`);

  // Markdown Title & Metadata
  card = card.replace(/# G-PAY-001: \[Title\]/g, `# ${g.id}: ${g.title}`);
  card = card.replace(/# G-xxx — Generic Capability Title/g, `# ${g.id} — ${g.title}`);
  card = card.replace(/\*\*Status:\*\* draft/g, `**Status:** ready`);
  card = card.replace(/\*\*Kind:\*\* feature/g, `**Kind:** ${g.kind}`);
  card = card.replace(/Status: draft · Epic: CORE · Kind: feature/g, `Status: ready · Epic: CORE · Kind: ${g.kind}`);
  card = card.replace(/\*\*Epic:\*\* PAY/g, `**Epic:** CORE`);
  card = card.replace(/\*\*Depends on:\*\* G-PAY-002 or —/g, `**Depends on:** ${g.dependsOn}`);
  card = card.replace(/\|:------:\|:----:\|:-------:\|:------:\|:----:\|\n\| (.*) \|/g,
    `|:------:|:----:|:-------:|:------:|:----:|\n| done | active | pending | pending | pending |`);
  card = card.replace(/\*\*Atomic outcome:\*\* \[One independently verifiable outcome; one goal must not contain multiple deliverables\]/g,
    `**Atomic outcome:** ${g.atomicOutcome}`);

  // Intent
  card = card.replace(/Short narrative describing the concrete problem and the delivered capability\./g,
    `${g.atomicOutcome} ${g.rationale}`);

  // In / Out
  card = card.replace(/- Concrete delivered item 1\n- Concrete delivered item 2/g,
    `- ${g.atomicOutcome}\n- Full implementation with zero mocks, stubs, or dummy fallbacks\n- Automated verification pass green`);

  // Touch Map
  const touchMapStr = g.touchMap.map(t => `- \`${t}\``).join('\n');
  card = card.replace(/- `path\/to\/primary\/file\.ext`\n- `path\/to\/secondary\/file\.ext`/g, touchMapStr);

  // Acceptance Criteria
  card = card.replace(/- \[ \] Testable criterion 1\n- \[ \] Testable criterion 2/g,
    `- [ ] Given Soda OS runtime environment, When ${g.title} is executed, Then ${g.atomicOutcome} passes with 0 deviations.\n- [ ] Given test command \`${g.verifyCommand}\`, When executed, Then process exits with code 0 and all verification checks pass.`);

  card = card.replace(/- Given \[initial state\], When \[action\], Then \[measurable outcome\]/g,
    `- Given Soda OS runtime environment, When ${g.title} is executed, Then ${g.atomicOutcome} passes with 0 deviations.\n- Given test command \`${g.verifyCommand}\`, When executed, Then process exits with code 0 and all verification checks pass.`);

  // Write out to root and template
  const rootPath = resolve(`docs/07-backlog/goals/${g.id}.md`);
  const tmplPath = resolve(`template/docs/07-backlog/goals/${g.id}.md`);
  writeFileSync(rootPath, card, 'utf8');
  writeFileSync(tmplPath, card, 'utf8');
  console.log(`✅ Generated ${g.id}.md -> root & template`);
}

console.log('\n🎉 Successfully generated all 9 atomic goal cards!');

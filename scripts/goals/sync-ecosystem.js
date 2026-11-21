#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CENTRAL ECOSYSTEM SCANNING & SYNCHRONIZATION ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Dynamically discovers all projects in /Users/batrarethsudprasert/projects,
 *          classifies them into 3 governance tiers (Tier A, Tier B, Tier C), and synchronizes:
 *          1. 10 Universal Core Rules (.agents/rules/)
 *          2. Workflow & Code Review Skills (.agents/skills/)
 *          3. Concurrency & Parallel Goal Engine (scripts/goals/)
 *          4. Unified 28-Pillar Senior Engineering Gate Harness (scripts/harness/)
 *          5. Idempotent Markdown Queue & Snapshot Reconciliation (Tier A goal sync)
 * ════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SODA_OS_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_PROJECTS_BASE = process.env.SODA_PROJECTS_BASE || '/Users/batrarethsudprasert/projects';

// Explicit projects outside standard root base or nested deep in directories
const EXPLICIT_PROJECT_PATHS = [
  '/Users/batrarethsudprasert/projects/ai/competitions/kaggle/gemma4-dev-agent'
];

// 10 Universal Core Governance Rules (Strict Zero-Mock / Anti-Hallucination Constitution)
const UNIVERSAL_RULES = [
  'code-review.md',
  'governance.md',
  'bdd-specification.md',
  'tdd-execution.md',
  'goal-orchestration.md',
  'interactive-alignment-grill-me.md',
  'llm-wiki.md',
  'file-based-state-machine-async-qa.md',
  'multimodal-vision-clarification.md',
  'text-requirement-interrogation.md'
];

// Extended Governance Rules in .agents/rules/
const EXTENDED_RULES = [
  'ecosystem-sync.md',
  'agent-runtime-fail-closed.md',
  'agentic-discovery-loops.example.md',
  'artifact-conservation.md',
  'artifact-provenance.md',
  'code-navigator.md',
  'commits.md',
  'constitution.md',
  'core.md',
  'dave-decision-contract.md',
  'dave-fail-closed-decision.md',
  'dave-frontend-scope.md',
  'dave-human-approval.md',
  'dave-motion-and-asset-evidence.md',
  'dave-reference-evidence.md',
  'dave-visual-fidelity.md',
  'goal-creation.md',
  'goal-execution.md',
  'guidelines.md',
  'harness-engineering.example.md',
  'model-training-governance.md',
  'observability-contract.md',
  'platform-consumer.md',
  'proof-and-evidence.md',
  'quality-engineering.md',
  'scope-and-dependency-integrity.md',
  'security.md',
  'stack-flutter.example.md',
  'stack-laravel.example.md',
  'stack-react.example.md',
  'testing.md',
  'third-party-api-resilience.example.md',
  'ui-component-first.example.md'
];

function getAllGovernanceRules() {
  const rulesDir = path.join(SODA_OS_ROOT, '.agents/rules');
  if (!fs.existsSync(rulesDir)) return [...UNIVERSAL_RULES, ...EXTENDED_RULES];
  const entries = fs.readdirSync(rulesDir);
  const found = entries.filter((f) => f.endsWith('.md') && !f.startsWith('.'));
  return Array.from(new Set([...UNIVERSAL_RULES, ...EXTENDED_RULES, ...found]));
}

const ALL_GOVERNANCE_RULES = getAllGovernanceRules();

// Concurrency, File Locking, and Parallel Goal Execution Scripts
const GOAL_SCRIPTS = [
  'goal-markdown-sync.js',
  'parallel-goal-planner.js',
  'goal-id.js',
  'file-lock.js',
  'sync-ecosystem.js'
];

// Core Harness Scripts
const HARNESS_SCRIPTS = [
  'senior-engineering-gate-harness.mjs',
  'goal-template-conformance-harness.mjs',
  'proof-receipt-validator.mjs'
];

// Mathematical Invariant & Proof Harnesses (Wave 1-5)
const PROOF_HARNESS_SCRIPTS = [
  'mathematical-invariant-proof-harness.mjs',
  'touch-map-collision-gate.mjs',
  'property-invariant-harness.mjs',
  'stateful-model-harness.mjs',
  'adversarial-boundary-harness.mjs',
  'concurrency-schedule-harness.mjs',
  'mutation-testing-harness.mjs',
  'epistemic-classification-gate.mjs',
  'counterexample-minimizer.mjs',
  'verification-orchestrator-harness.mjs',
  'verify.mjs',
  'no-mock-production-gate-harness.mjs',
  'goal-scope-drift-harness.mjs'
];

const ALL_HARNESS_SCRIPTS = [...HARNESS_SCRIPTS, ...PROOF_HARNESS_SCRIPTS];

// Verification & Proof Libraries (scripts/lib/)
const LIB_SCRIPTS = [
  'mathematical-proof-engine.mjs',
  'statistical-evidence-engine.mjs',
  'goal-contract-schema.mjs',
  'touch-map-analyzer.mjs',
  'invariant-runner.mjs',
  'shadow-oracle-validator.mjs',
  'adversarial-probe-generator.mjs',
  'schedule-sequentializer.mjs',
  'ast-mutator.mjs',
  'epistemic-classifier.mjs',
  'receipt-freshness-engine.mjs',
  'verification-orchestrator.mjs',
  'confidence-calibration.mjs',
  'dave-engine.mjs',
  'dave-expert-registry.mjs',
  'dave-conflict-resolver.mjs',
  'dave-moe-router.mjs',
  'dave-model-governor.mjs',
  'dave-evidence-graph.mjs',
  'dave-autonomy-router.mjs',
  'decision-ledger.mjs',
  'calibration-monitor.mjs',
  'model-circuit-breaker.mjs',
  'react-ast-generator.mjs',
  'hitl-review-packet.mjs',
  'merkle-decision-ledger.mjs',
  'ux-calibration-drift-monitor.mjs',
  'multi-currency-money.mjs',
  'dark-pattern-safety-gate.mjs',
  'ux-decision-contract.mjs',
  'ux-decision-lifecycle.mjs',
  'ux-persona-registry.mjs',
  'ux-conflict-resolver.mjs',
  'ui-scene-graph.mjs',
  'ocr-bbox-aligner.mjs'
];

// Schema Contracts (schemas/)
const SCHEMAS = [
  'goal-contract.schema.json',
  'model-provenance.schema.json',
  'ui-scene-graph.schema.json',
  'ui-taxonomy.schema.json',
  'ux-decision-contract.schema.json',
  'ux-decision-contract.json'
];

function getAllSchemas() {
  const schemasDir = path.join(SODA_OS_ROOT, 'schemas');
  if (!fs.existsSync(schemasDir)) return SCHEMAS;
  const entries = fs.readdirSync(schemasDir);
  const found = entries.filter((f) => (f.endsWith('.json') || f.endsWith('.yaml')) && !f.startsWith('.'));
  return Array.from(new Set([...SCHEMAS, ...found]));
}

// Verification Architecture & Runbook Documents (for Tier A projects)
const ARCHITECTURE_DOCS = [
  'docs/03-architecture/verification-architecture-guide.md',
  'docs/04-architecture/verification-harness-architecture.md',
  'docs/05-operations/verification-runbook.md',
  'docs/06-workflows/verification-operator-runbook.md'
];

function getAllGoalScripts() {
  const goalsDir = path.join(SODA_OS_ROOT, 'scripts/goals');
  if (!fs.existsSync(goalsDir)) return GOAL_SCRIPTS;
  const entries = fs.readdirSync(goalsDir);
  const found = entries.filter((f) => (f.endsWith('.js') || f.endsWith('.mjs')) && !f.startsWith('.'));
  return Array.from(new Set([...GOAL_SCRIPTS, ...found]));
}

function getAllLibScripts() {
  const libDir = path.join(SODA_OS_ROOT, 'scripts/lib');
  if (!fs.existsSync(libDir)) return LIB_SCRIPTS;
  const entries = fs.readdirSync(libDir);
  const found = entries.filter((f) => f.endsWith('.mjs') || f.endsWith('.js'));
  return Array.from(new Set([...LIB_SCRIPTS, ...found]));
}

function getAllHarnessFiles() {
  const harnessDir = path.join(SODA_OS_ROOT, 'scripts/harness');
  if (!fs.existsSync(harnessDir)) return ALL_HARNESS_SCRIPTS.map((h) => ({ name: h, rel: h, src: path.join(SODA_OS_ROOT, 'scripts/harness', h) }));
  const files = [];
  function scan(dir, relPrefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const rel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        scan(path.join(dir, ent.name), rel);
      } else if (ent.isFile() && (ent.name.endsWith('.mjs') || ent.name.endsWith('.js') || ent.name.endsWith('.py') || ent.name.endsWith('.yaml') || ent.name.endsWith('.json'))) {
        files.push({ name: ent.name, rel, src: path.join(dir, ent.name) });
      }
    }
  }
  scan(harnessDir);
  return files;
}

// Core Skills
const SKILLS = [
  { dir: 'soda-goal-workflow', file: 'SKILL.md' },
  { dir: 'soda-code-review', file: 'SKILL.md' }
];

function getAllSkills() {
  const skillsDir = path.join(SODA_OS_ROOT, '.agents/skills');
  if (!fs.existsSync(skillsDir)) return SKILLS;
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const allSkills = [];
  for (const ent of entries) {
    if (ent.isDirectory() && ent.name.startsWith('soda-')) {
      const skillDirPath = path.join(skillsDir, ent.name);
      const files = fs.readdirSync(skillDirPath);
      for (const f of files) {
        if (!f.startsWith('.')) {
          allSkills.push({ dir: ent.name, file: f });
        }
      }
    }
  }
  return allSkills.length > 0 ? allSkills : SKILLS;
}

function getAllCiScripts() {
  const ciDir = path.join(SODA_OS_ROOT, 'scripts/ci');
  if (!fs.existsSync(ciDir)) return [];
  const entries = fs.readdirSync(ciDir);
  return entries.filter((f) => (f.endsWith('.mjs') || f.endsWith('.sh') || f.endsWith('.js')) && !f.startsWith('.'));
}

function getAllAgentTemplates() {
  const templatesDir = path.join(SODA_OS_ROOT, '.agents/templates');
  if (!fs.existsSync(templatesDir)) return [];
  const entries = fs.readdirSync(templatesDir);
  return entries
    .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
    .map((name) => ({
      name,
      src: path.join(templatesDir, name)
    }));
}

function getSubagentRuntimeFiles() {
  const runtimeRoot = path.join(SODA_OS_ROOT, 'scripts/agents');
  const files = [];
  if (fs.existsSync(path.join(SODA_OS_ROOT, '.agents/runtime-budget.yaml'))) {
    files.push({ rel: '.agents/runtime-budget.yaml', src: path.join(SODA_OS_ROOT, '.agents/runtime-budget.yaml') });
  }
  if (!fs.existsSync(runtimeRoot)) return files;
  function scan(dir, relPrefix = 'scripts/agents') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = `${relPrefix}/${ent.name}`;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) scan(full, rel);
      else if (ent.isFile() && (ent.name.endsWith('.mjs') || ent.name.endsWith('.yaml'))) files.push({ rel, src: full });
    }
  }
  scan(runtimeRoot);
  return files;
}

function getPersonaCatalogFiles() {
  const personaRoot = path.join(SODA_OS_ROOT, 'docs/04-agents/personas');
  const files = [];
  if (!fs.existsSync(personaRoot)) return files;
  function scan(dir, relPrefix = 'docs/04-agents/personas') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = `${relPrefix}/${ent.name}`;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) scan(full, rel);
      else if (ent.isFile() && ent.name.endsWith('.md')) files.push({ rel, src: full });
    }
  }
  scan(personaRoot);
  return files;
}

function getMlFiles() {
  const mlRoot = path.join(SODA_OS_ROOT, 'scripts/ml');
  const files = [];
  if (!fs.existsSync(mlRoot)) return files;
  function scan(dir, relPrefix = 'scripts/ml') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = `${relPrefix}/${ent.name}`;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) scan(full, rel);
      else if (ent.isFile() && (ent.name.endsWith('.py') || ent.name.endsWith('.sh') || ent.name.endsWith('.json') || ent.name.endsWith('.md'))) {
        files.push({ rel, src: full });
      }
    }
  }
  scan(mlRoot);
  return files;
}

// Canonical Source Files Map
const SOURCE_FILES = {
  agentsConstitution: path.join(SODA_OS_ROOT, '.agents/AGENTS.md'),
  claudeEntryPoint: path.join(SODA_OS_ROOT, 'CLAUDE.md'),
  universalRules: UNIVERSAL_RULES.map((r) => ({
    name: r,
    src: path.join(SODA_OS_ROOT, '.agents/rules', r)
  })),
  allRules: ALL_GOVERNANCE_RULES.map((r) => ({
    name: r,
    src: path.join(SODA_OS_ROOT, '.agents/rules', r)
  })).filter((r) => fs.existsSync(r.src)),
  goalScripts: getAllGoalScripts().map((s) => ({
    name: s,
    src: path.join(SODA_OS_ROOT, 'scripts/goals', s)
  })).filter((s) => fs.existsSync(s.src)),
  harnessScripts: getAllHarnessFiles().filter((h) => fs.existsSync(h.src)),
  libScripts: getAllLibScripts().map((l) => ({
    name: l,
    src: path.join(SODA_OS_ROOT, 'scripts/lib', l)
  })).filter((l) => fs.existsSync(l.src)),
  ciScripts: getAllCiScripts().map((c) => ({
    name: c,
    src: path.join(SODA_OS_ROOT, 'scripts/ci', c)
  })).filter((c) => fs.existsSync(c.src)),
  subagentRuntime: getSubagentRuntimeFiles(),
  personaCatalog: getPersonaCatalogFiles(),
  mlFiles: getMlFiles(),
  schemas: getAllSchemas().map((sc) => ({
    name: sc,
    src: path.join(SODA_OS_ROOT, 'schemas', sc)
  })).filter((sc) => fs.existsSync(sc.src)),
  skills: SKILLS.map((sk) => ({
    dir: sk.dir,
    file: sk.file,
    src: path.join(SODA_OS_ROOT, '.agents/skills', sk.dir, sk.file)
  })),
  allSkills: getAllSkills().map((sk) => ({
    dir: sk.dir,
    file: sk.file,
    src: path.join(SODA_OS_ROOT, '.agents/skills', sk.dir, sk.file)
  })).filter((sk) => fs.existsSync(sk.src)),
  architectureDocs: ARCHITECTURE_DOCS.map((docRel) => ({
    rel: docRel,
    src: path.join(SODA_OS_ROOT, docRel)
  })).filter((d) => fs.existsSync(d.src)),
  goalSync: path.join(SODA_OS_ROOT, 'scripts/goals/goal-markdown-sync.js'),
  cli: path.join(SODA_OS_ROOT, 'cli.js'),
  goalTemplate: path.join(SODA_OS_ROOT, 'docs/07-backlog/goals/_template.md'),
  queueTemplate: path.join(SODA_OS_ROOT, 'docs/07-backlog/queues/_template.md'),
  agentTemplates: getAllAgentTemplates()
};

function syncSubagentRuntime(projectRoot, dryRun, actions) {
  for (const file of SOURCE_FILES.subagentRuntime) {
    const dest = path.join(projectRoot, file.rel);
    ensureDir(path.dirname(dest), dryRun);
    const res = copyFileWithStatus(file.src, dest, dryRun);
    actions.push({ file: file.rel, ...res });
  }

  // Sync Persona Catalog Cards
  for (const file of SOURCE_FILES.personaCatalog) {
    const dest = path.join(projectRoot, file.rel);
    ensureDir(path.dirname(dest), dryRun);
    const res = copyFileWithStatus(file.src, dest, dryRun);
    actions.push({ file: file.rel, ...res });
  }

  // Sync ML Modules
  for (const file of SOURCE_FILES.mlFiles) {
    const dest = path.join(projectRoot, file.rel);
    ensureDir(path.dirname(dest), dryRun);
    const res = copyFileWithStatus(file.src, dest, dryRun);
    actions.push({ file: file.rel, ...res });
  }
}

// Legacy static list exports for backwards-compatibility
const GROUP_A_PROJECTS = [
  'agentic-ai-use-cases',
  'ledgends',
  'litter-green-api',
  'omni-quant-system',
  'sodality-aether',
  'sodality-aexis',
  'sodality-creator-hub',
  'sodality-nextjs',
  'sodality-rabbit-app'
];

const GROUP_B_PROJECTS = [
  'NemoClaw',
  'ae-biz-swarm',
  'hermes-agent',
  'iso-29110-automation-poc',
  'ledgends0legacy',
  'mistral.rs',
  'paperclip',
  'sodality-aecho',
  'sodality-aeflux',
  'sodality-aegis',
  'sodality-aeidolon',
  'sodality-aeonix',
  'sodality-aeris',
  'sodality-aethos',
  'sop-poc',
  'todo-app-poc',
  'vora'
];

function ensureDir(dirPath, dryRun = false) {
  if (dryRun) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileWithStatus(src, dest, dryRun = false) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source file missing: ${src}`);
  }
  const destExists = fs.existsSync(dest);
  let changed = true;
  if (destExists) {
    try {
      const srcBuf = fs.readFileSync(src);
      const destBuf = fs.readFileSync(dest);
      if (srcBuf.equals(destBuf)) {
        changed = false;
      }
    } catch (_) {
      changed = true;
    }
  }

  if (!dryRun && changed) {
    ensureDir(path.dirname(dest), false);
    fs.copyFileSync(src, dest);
  }

  return {
    target: dest,
    status: destExists ? (changed ? 'UPDATED' : 'UNCHANGED') : 'CREATED',
    changed
  };
}

/**
 * Dynamically discovers and categorizes all projects under baseDir.
 *
 * @param {string} baseDir - Directory containing projects
 * @returns {Object} Classified projects by tier
 */
function discoverProjects(baseDir = DEFAULT_PROJECTS_BASE) {
  if (!fs.existsSync(baseDir)) {
    return { baseDir, tierA: [], tierB: [], tierC: [], all: [] };
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const tierA = [];
  const tierB = [];
  const tierC = [];

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name === 'soda-os') {
      continue;
    }
    const projectRoot = path.join(baseDir, ent.name);
    const hasBacklog = fs.existsSync(path.join(projectRoot, 'docs/07-backlog'));
    const hasAgents = fs.existsSync(path.join(projectRoot, '.agents')) || fs.existsSync(path.join(projectRoot, 'AGENTS.md'));

    if (hasBacklog) {
      tierA.push(ent.name);
    } else if (hasAgents) {
      tierB.push(ent.name);
    } else {
      tierC.push(ent.name);
    }
  }

  tierA.sort();
  tierB.sort();
  tierC.sort();

  // Incorporate explicit project paths (e.g. deep competition directories)
  if (Array.isArray(EXPLICIT_PROJECT_PATHS)) {
    for (const expPath of EXPLICIT_PROJECT_PATHS) {
      if (fs.existsSync(expPath)) {
        const hasBacklog = fs.existsSync(path.join(expPath, 'docs/07-backlog'));
        const hasAgents = fs.existsSync(path.join(expPath, '.agents')) || fs.existsSync(path.join(expPath, 'AGENTS.md'));
        if (hasBacklog) {
          if (!tierA.includes(expPath)) tierA.push(expPath);
        } else if (hasAgents) {
          if (!tierB.includes(expPath)) tierB.push(expPath);
        } else {
          if (!tierC.includes(expPath)) tierC.push(expPath);
        }
      }
    }
  }

  return {
    baseDir,
    tierA,
    tierB,
    tierC,
    all: [...tierA, ...tierB, ...tierC]
  };
}

/**
 * Classifies a specific project directory into its governance tier.
 */
function classifyProject(projectRoot) {
  if (fs.existsSync(path.join(projectRoot, 'docs/07-backlog'))) {
    return { tierKey: 'A', tierName: 'Tier A (Full Goal-Driven Backlog)' };
  }
  if (fs.existsSync(path.join(projectRoot, '.agents')) || fs.existsSync(path.join(projectRoot, 'AGENTS.md'))) {
    return { tierKey: 'B', tierName: 'Tier B (Agent-OS Governed / Microkernel)' };
  }
  return { tierKey: 'C', tierName: 'Tier C (Extended Projects / Ecosystem Repos)' };
}

/**
 * Synchronizes Tier A Project:
 * - Concurrency scripts (scripts/goals/)
 * - Verification harness (scripts/harness/)
 * - Universal governance rules (.agents/rules/)
 * - Agent skills (.agents/skills/)
 * - Special CLI sync if applicable
 * - Executes goal-markdown-sync queue reconciliation
 * - Executes senior-engineering-gate verification
 */
function syncTierAProject(projectName, baseDir = DEFAULT_PROJECTS_BASE, options = {}) {
  const projectRoot = path.isAbsolute(projectName) ? projectName : path.join(baseDir, projectName);
  const name = path.basename(projectRoot);

  if (!fs.existsSync(projectRoot)) {
    return { name, tier: 'Tier A (Full Goal-Driven Backlog)', tierKey: 'A', status: 'SKIPPED_NOT_FOUND', actions: [] };
  }

  const actions = [];
  const dryRun = Boolean(options.dryRun);

  try {
    syncSubagentRuntime(projectRoot, dryRun, actions);
    // 1. Sync scripts/goals/
    const targetGoalsDir = path.join(projectRoot, 'scripts/goals');
    ensureDir(targetGoalsDir, dryRun);
    for (const g of SOURCE_FILES.goalScripts) {
      const res = copyFileWithStatus(g.src, path.join(targetGoalsDir, g.name), dryRun);
      actions.push({ file: `scripts/goals/${g.name}`, ...res });
    }

    // 2. Sync scripts/harness/
    const targetHarnessDir = path.join(projectRoot, 'scripts/harness');
    ensureDir(targetHarnessDir, dryRun);
    for (const h of SOURCE_FILES.harnessScripts) {
      const destPath = path.join(targetHarnessDir, h.rel || h.name);
      ensureDir(path.dirname(destPath), dryRun);
      const res = copyFileWithStatus(h.src, destPath, dryRun);
      actions.push({ file: `scripts/harness/${h.rel || h.name}`, ...res });
    }

    // 3. Sync scripts/lib/
    const targetLibDir = path.join(projectRoot, 'scripts/lib');
    ensureDir(targetLibDir, dryRun);
    for (const l of SOURCE_FILES.libScripts) {
      const res = copyFileWithStatus(l.src, path.join(targetLibDir, l.name), dryRun);
      actions.push({ file: `scripts/lib/${l.name}`, ...res });
    }

    // 4. Sync schemas/
    const targetSchemasDir = path.join(projectRoot, 'schemas');
    ensureDir(targetSchemasDir, dryRun);
    for (const sc of SOURCE_FILES.schemas) {
      const res = copyFileWithStatus(sc.src, path.join(targetSchemasDir, sc.name), dryRun);
      actions.push({ file: `schemas/${sc.name}`, ...res });
    }

    // 5. Sync Governance Rules (.agents/rules/) — domain rules preserved
    const targetRulesDir = path.join(projectRoot, '.agents/rules');
    ensureDir(targetRulesDir, dryRun);
    for (const r of SOURCE_FILES.allRules) {
      const res = copyFileWithStatus(r.src, path.join(targetRulesDir, r.name), dryRun);
      actions.push({ file: `.agents/rules/${r.name}`, ...res });
    }

    // 6. Sync Skills (.agents/skills/)
    for (const sk of SOURCE_FILES.allSkills) {
      const targetSkillDir = path.join(projectRoot, '.agents/skills', sk.dir);
      ensureDir(targetSkillDir, dryRun);
      const res = copyFileWithStatus(sk.src, path.join(targetSkillDir, sk.file), dryRun);
      actions.push({ file: `.agents/skills/${sk.dir}/${sk.file}`, ...res });
    }

    // 7. Sync Verification Architecture & Runbook Docs
    for (const d of SOURCE_FILES.architectureDocs) {
      const targetDocPath = path.join(projectRoot, d.rel);
      ensureDir(path.dirname(targetDocPath), dryRun);
      const res = copyFileWithStatus(d.src, targetDocPath, dryRun);
      actions.push({ file: d.rel, ...res });
    }

    // 8. Special CLI sync if applicable
    if (name === 'sodality-nextjs' && fs.existsSync(path.join(projectRoot, 'cli.js'))) {
      const res = copyFileWithStatus(SOURCE_FILES.cli, path.join(projectRoot, 'cli.js'), dryRun);
      actions.push({ file: 'cli.js', ...res });
    }

    // 9. Sync Global Agentic Constitution (.agents/AGENTS.md and root AGENTS.md)
    if (fs.existsSync(SOURCE_FILES.agentsConstitution)) {
      const targetDotAgents = path.join(projectRoot, '.agents');
      ensureDir(targetDotAgents, dryRun);
      const resDot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, path.join(targetDotAgents, 'AGENTS.md'), dryRun);
      actions.push({ file: '.agents/AGENTS.md', ...resDot });

      const rootAgentsPath = path.join(projectRoot, 'AGENTS.md');
      if (fs.existsSync(rootAgentsPath)) {
        try {
          const content = fs.readFileSync(rootAgentsPath, 'utf8');
          if (content.includes('# Global Agentic Engineering Constitution')) {
            const resRoot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, rootAgentsPath, dryRun);
            actions.push({ file: 'AGENTS.md', ...resRoot });
          }
        } catch (_) {}
      }
    }

    if (fs.existsSync(SOURCE_FILES.claudeEntryPoint)) {
      const resClaude = copyFileWithStatus(SOURCE_FILES.claudeEntryPoint, path.join(projectRoot, 'CLAUDE.md'), dryRun);
      actions.push({ file: 'CLAUDE.md', ...resClaude });
    }

    // 10. Sync CI Validation Scripts (scripts/ci/)
    const targetCiDir = path.join(projectRoot, 'scripts/ci');
    if (fs.existsSync(targetCiDir) || SOURCE_FILES.ciScripts.length > 0) {
      ensureDir(targetCiDir, dryRun);
      for (const c of SOURCE_FILES.ciScripts) {
        const res = copyFileWithStatus(c.src, path.join(targetCiDir, c.name), dryRun);
        actions.push({ file: `scripts/ci/${c.name}`, ...res });
      }
    }

    // 11. Sync Backlog Goal & Queue Templates
    if (fs.existsSync(SOURCE_FILES.goalTemplate)) {
      const targetGoalsDir = path.join(projectRoot, 'docs/07-backlog/goals');
      if (fs.existsSync(targetGoalsDir)) {
        const res = copyFileWithStatus(SOURCE_FILES.goalTemplate, path.join(targetGoalsDir, '_template.md'), dryRun);
        actions.push({ file: 'docs/07-backlog/goals/_template.md', ...res });
      }
    }
    if (fs.existsSync(SOURCE_FILES.queueTemplate)) {
      const targetQueuesDir = path.join(projectRoot, 'docs/07-backlog/queues');
      if (fs.existsSync(targetQueuesDir)) {
        const res = copyFileWithStatus(SOURCE_FILES.queueTemplate, path.join(targetQueuesDir, '_template.md'), dryRun);
        actions.push({ file: 'docs/07-backlog/queues/_template.md', ...res });
      }
    }

    // 12. Sync Agent Templates (.agents/templates/)
    const targetAgentTemplatesDir = path.join(projectRoot, '.agents/templates');
    ensureDir(targetAgentTemplatesDir, dryRun);
    for (const at of SOURCE_FILES.agentTemplates) {
      if (fs.existsSync(at.src)) {
        const res = copyFileWithStatus(at.src, path.join(targetAgentTemplatesDir, at.name), dryRun);
        actions.push({ file: `.agents/templates/${at.name}`, ...res });
      }
    }

    // 13. Execute goal-markdown-sync queue reconciliation
    let markdownSync = null;
    if (!options.skipSyncGoals && !dryRun) {
      try {
        const output = execSync(
          `node "${SOURCE_FILES.goalSync}" "${projectRoot}"`,
          { encoding: 'utf8', cwd: projectRoot, timeout: 30000 }
        );
        markdownSync = { success: true, log: output.trim() };
      } catch (err) {
        markdownSync = { success: false, error: err.message };
      }
    } else if (dryRun) {
      markdownSync = { success: true, log: '[DryRun] Would execute goal-markdown-sync queue reconciliation' };
    }

    // 7. Run Senior Engineering Gate verification harness
    let verification = null;
    const gatePath = path.join(targetHarnessDir, 'senior-engineering-gate-harness.mjs');
    if (!options.skipGate && !dryRun && fs.existsSync(gatePath)) {
      try {
        const gateOut = execSync(
          `node "${gatePath}" --scan-repo`,
          { encoding: 'utf8', cwd: projectRoot, timeout: 30000 }
        );
        const lastLines = gateOut.trim().split('\n').filter(Boolean);
        const summary = lastLines.slice(-2).join(' | ');
        verification = { harness: 'senior-engineering-gate', success: true, output: summary };
      } catch (err) {
        verification = { harness: 'senior-engineering-gate', success: false, error: err.message };
      }
    } else if (dryRun) {
      verification = { harness: 'senior-engineering-gate', success: true, output: '[DryRun] Would execute senior-engineering-gate scan' };
    }

    return {
      name,
      tier: 'Tier A (Full Goal-Driven Backlog)',
      tierKey: 'A',
      status: 'SYNCED',
      syncedFilesCount: actions.length,
      createdCount: actions.filter((a) => a.status === 'CREATED').length,
      updatedCount: actions.filter((a) => a.status === 'UPDATED').length,
      unchangedCount: actions.filter((a) => a.status === 'UNCHANGED').length,
      actions,
      markdownSync,
      verification,
      error: null
    };
  } catch (err) {
    return {
      name,
      tier: 'Tier A (Full Goal-Driven Backlog)',
      tierKey: 'A',
      status: 'ERROR',
      syncedFilesCount: actions.length,
      actions,
      error: err.message
    };
  }
}

/**
 * Synchronizes Tier B Project (Agent-OS Governed / Microkernel):
 * - Universal governance rules (.agents/rules/)
 * - Agent skills (.agents/skills/)
 * - Verification harness (scripts/harness/)
 * - Goal scripts (scripts/goals/)
 * - Optional gate scan if requested
 */
function syncTierBProject(projectName, baseDir = DEFAULT_PROJECTS_BASE, options = {}) {
  const projectRoot = path.isAbsolute(projectName) ? projectName : path.join(baseDir, projectName);
  const name = path.basename(projectRoot);

  if (!fs.existsSync(projectRoot)) {
    return { name, tier: 'Tier B (Agent-OS Governed / Microkernel)', tierKey: 'B', status: 'SKIPPED_NOT_FOUND', actions: [] };
  }

  const actions = [];
  const dryRun = Boolean(options.dryRun);

  try {
    syncSubagentRuntime(projectRoot, dryRun, actions);
    // 1. Sync Governance Rules (.agents/rules/) — domain rules preserved
    const targetRulesDir = path.join(projectRoot, '.agents/rules');
    ensureDir(targetRulesDir, dryRun);
    for (const r of SOURCE_FILES.allRules) {
      const res = copyFileWithStatus(r.src, path.join(targetRulesDir, r.name), dryRun);
      actions.push({ file: `.agents/rules/${r.name}`, ...res });
    }

    // 2. Sync Skills (.agents/skills/)
    for (const sk of SOURCE_FILES.allSkills) {
      const targetSkillDir = path.join(projectRoot, '.agents/skills', sk.dir);
      ensureDir(targetSkillDir, dryRun);
      const res = copyFileWithStatus(sk.src, path.join(targetSkillDir, sk.file), dryRun);
      actions.push({ file: `.agents/skills/${sk.dir}/${sk.file}`, ...res });
    }

    // 3. Sync Harness (scripts/harness/)
    const targetHarnessDir = path.join(projectRoot, 'scripts/harness');
    ensureDir(targetHarnessDir, dryRun);
    for (const h of SOURCE_FILES.harnessScripts) {
      const destPath = path.join(targetHarnessDir, h.rel || h.name);
      ensureDir(path.dirname(destPath), dryRun);
      const res = copyFileWithStatus(h.src, destPath, dryRun);
      actions.push({ file: `scripts/harness/${h.rel || h.name}`, ...res });
    }

    // 4. Sync Lib (scripts/lib/)
    const targetLibDir = path.join(projectRoot, 'scripts/lib');
    ensureDir(targetLibDir, dryRun);
    for (const l of SOURCE_FILES.libScripts) {
      const res = copyFileWithStatus(l.src, path.join(targetLibDir, l.name), dryRun);
      actions.push({ file: `scripts/lib/${l.name}`, ...res });
    }

    // 5. Sync Goal scripts (scripts/goals/)
    const targetGoalsDir = path.join(projectRoot, 'scripts/goals');
    ensureDir(targetGoalsDir, dryRun);
    for (const g of SOURCE_FILES.goalScripts) {
      const res = copyFileWithStatus(g.src, path.join(targetGoalsDir, g.name), dryRun);
      actions.push({ file: `scripts/goals/${g.name}`, ...res });
    }

    // 6. Sync schemas/
    const targetSchemasDir = path.join(projectRoot, 'schemas');
    ensureDir(targetSchemasDir, dryRun);
    for (const sc of SOURCE_FILES.schemas) {
      const res = copyFileWithStatus(sc.src, path.join(targetSchemasDir, sc.name), dryRun);
      actions.push({ file: `schemas/${sc.name}`, ...res });
    }

    // 7. Sync Global Agentic Constitution (.agents/AGENTS.md)
    if (fs.existsSync(SOURCE_FILES.agentsConstitution)) {
      const targetDotAgents = path.join(projectRoot, '.agents');
      ensureDir(targetDotAgents, dryRun);
      const resDot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, path.join(targetDotAgents, 'AGENTS.md'), dryRun);
      actions.push({ file: '.agents/AGENTS.md', ...resDot });

      const rootAgentsPath = path.join(projectRoot, 'AGENTS.md');
      if (fs.existsSync(rootAgentsPath)) {
        try {
          const content = fs.readFileSync(rootAgentsPath, 'utf8');
          if (content.includes('# Global Agentic Engineering Constitution')) {
            const resRoot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, rootAgentsPath, dryRun);
            actions.push({ file: 'AGENTS.md', ...resRoot });
          }
        } catch (_) {}
      }
    }

    if (fs.existsSync(SOURCE_FILES.claudeEntryPoint)) {
      const resClaude = copyFileWithStatus(SOURCE_FILES.claudeEntryPoint, path.join(projectRoot, 'CLAUDE.md'), dryRun);
      actions.push({ file: 'CLAUDE.md', ...resClaude });
    }

    // 8. Sync scripts/ci/ if project has scripts/ci/
    if (fs.existsSync(path.join(projectRoot, 'scripts/ci'))) {
      const targetCiDir = path.join(projectRoot, 'scripts/ci');
      ensureDir(targetCiDir, dryRun);
      for (const c of SOURCE_FILES.ciScripts) {
        const res = copyFileWithStatus(c.src, path.join(targetCiDir, c.name), dryRun);
        actions.push({ file: `scripts/ci/${c.name}`, ...res });
      }
    }

    // 9. Sync Agent Templates (.agents/templates/) and Backlog Goal Template if present
    const targetAgentTemplatesDir = path.join(projectRoot, '.agents/templates');
    ensureDir(targetAgentTemplatesDir, dryRun);
    for (const at of SOURCE_FILES.agentTemplates) {
      if (fs.existsSync(at.src)) {
        const res = copyFileWithStatus(at.src, path.join(targetAgentTemplatesDir, at.name), dryRun);
        actions.push({ file: `.agents/templates/${at.name}`, ...res });
      }
    }
    if (fs.existsSync(SOURCE_FILES.goalTemplate)) {
      const targetGoalsDir = path.join(projectRoot, 'docs/07-backlog/goals');
      if (fs.existsSync(targetGoalsDir)) {
        const res = copyFileWithStatus(SOURCE_FILES.goalTemplate, path.join(targetGoalsDir, '_template.md'), dryRun);
        actions.push({ file: 'docs/07-backlog/goals/_template.md', ...res });
      }
    }

    // 10. Optional gate scan if requested
    let verification = null;
    const gatePath = path.join(targetHarnessDir, 'senior-engineering-gate-harness.mjs');
    if (options.scanGate && !dryRun && fs.existsSync(gatePath)) {
      try {
        const gateOut = execSync(
          `node "${gatePath}" --scan-repo`,
          { encoding: 'utf8', cwd: projectRoot, timeout: 30000 }
        );
        const lastLines = gateOut.trim().split('\n').filter(Boolean);
        const summary = lastLines.slice(-2).join(' | ');
        verification = { harness: 'senior-engineering-gate', success: true, output: summary };
      } catch (err) {
        verification = { harness: 'senior-engineering-gate', success: false, error: err.message };
      }
    }

    return {
      name,
      tier: 'Tier B (Agent-OS Governed / Microkernel)',
      tierKey: 'B',
      status: 'SYNCED',
      syncedFilesCount: actions.length,
      createdCount: actions.filter((a) => a.status === 'CREATED').length,
      updatedCount: actions.filter((a) => a.status === 'UPDATED').length,
      unchangedCount: actions.filter((a) => a.status === 'UNCHANGED').length,
      actions,
      verification,
      error: null
    };
  } catch (err) {
    return {
      name,
      tier: 'Tier B (Agent-OS Governed / Microkernel)',
      tierKey: 'B',
      status: 'ERROR',
      syncedFilesCount: actions.length,
      actions,
      error: err.message
    };
  }
}

/**
 * Synchronizes Tier C Project (Extended Projects / Ecosystem Repos):
 * - Initializes Universal governance rules (.agents/rules/)
 * - Initializes Agent skills (.agents/skills/)
 * - Initializes Verification harness (scripts/harness/)
 * - Initializes Goal scripts (scripts/goals/)
 * - Initializes Lib scripts (scripts/lib/)
 * - Initializes Schemas (schemas/)
 */
function syncTierCProject(projectName, baseDir = DEFAULT_PROJECTS_BASE, options = {}) {
  const projectRoot = path.isAbsolute(projectName) ? projectName : path.join(baseDir, projectName);
  const name = path.basename(projectRoot);

  if (!fs.existsSync(projectRoot)) {
    return { name, tier: 'Tier C (Extended Projects / Ecosystem Repos)', tierKey: 'C', status: 'SKIPPED_NOT_FOUND', actions: [] };
  }

  const actions = [];
  const dryRun = Boolean(options.dryRun);

  try {
    syncSubagentRuntime(projectRoot, dryRun, actions);
    // 1. Initialize Universal Rules (.agents/rules/)
    const targetRulesDir = path.join(projectRoot, '.agents/rules');
    ensureDir(targetRulesDir, dryRun);
    for (const r of SOURCE_FILES.allRules) {
      const res = copyFileWithStatus(r.src, path.join(targetRulesDir, r.name), dryRun);
      actions.push({ file: `.agents/rules/${r.name}`, ...res });
    }

    // 2. Initialize Skills (.agents/skills/)
    for (const sk of SOURCE_FILES.allSkills) {
      const targetSkillDir = path.join(projectRoot, '.agents/skills', sk.dir);
      ensureDir(targetSkillDir, dryRun);
      const res = copyFileWithStatus(sk.src, path.join(targetSkillDir, sk.file), dryRun);
      actions.push({ file: `.agents/skills/${sk.dir}/${sk.file}`, ...res });
    }

    // 3. Initialize Harness (scripts/harness/)
    const targetHarnessDir = path.join(projectRoot, 'scripts/harness');
    ensureDir(targetHarnessDir, dryRun);
    for (const h of SOURCE_FILES.harnessScripts) {
      const destPath = path.join(targetHarnessDir, h.rel || h.name);
      ensureDir(path.dirname(destPath), dryRun);
      const res = copyFileWithStatus(h.src, destPath, dryRun);
      actions.push({ file: `scripts/harness/${h.rel || h.name}`, ...res });
    }

    // 4. Initialize Lib (scripts/lib/)
    const targetLibDir = path.join(projectRoot, 'scripts/lib');
    ensureDir(targetLibDir, dryRun);
    for (const l of SOURCE_FILES.libScripts) {
      const res = copyFileWithStatus(l.src, path.join(targetLibDir, l.name), dryRun);
      actions.push({ file: `scripts/lib/${l.name}`, ...res });
    }

    // 5. Initialize Goal Scripts (scripts/goals/)
    const targetGoalsDir = path.join(projectRoot, 'scripts/goals');
    ensureDir(targetGoalsDir, dryRun);
    for (const g of SOURCE_FILES.goalScripts) {
      const res = copyFileWithStatus(g.src, path.join(targetGoalsDir, g.name), dryRun);
      actions.push({ file: `scripts/goals/${g.name}`, ...res });
    }

    // 6. Initialize schemas/
    const targetSchemasDir = path.join(projectRoot, 'schemas');
    ensureDir(targetSchemasDir, dryRun);
    for (const sc of SOURCE_FILES.schemas) {
      const res = copyFileWithStatus(sc.src, path.join(targetSchemasDir, sc.name), dryRun);
      actions.push({ file: `schemas/${sc.name}`, ...res });
    }

    // 7. Initialize Global Agentic Constitution (.agents/AGENTS.md)
    if (fs.existsSync(SOURCE_FILES.agentsConstitution)) {
      const targetDotAgents = path.join(projectRoot, '.agents');
      ensureDir(targetDotAgents, dryRun);
      const resDot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, path.join(targetDotAgents, 'AGENTS.md'), dryRun);
      actions.push({ file: '.agents/AGENTS.md', ...resDot });

      const rootAgentsPath = path.join(projectRoot, 'AGENTS.md');
      if (fs.existsSync(rootAgentsPath)) {
        try {
          const content = fs.readFileSync(rootAgentsPath, 'utf8');
          if (content.includes('# Global Agentic Engineering Constitution')) {
            const resRoot = copyFileWithStatus(SOURCE_FILES.agentsConstitution, rootAgentsPath, dryRun);
            actions.push({ file: 'AGENTS.md', ...resRoot });
          }
        } catch (_) {}
      }
    }

    if (fs.existsSync(SOURCE_FILES.claudeEntryPoint)) {
      const resClaude = copyFileWithStatus(SOURCE_FILES.claudeEntryPoint, path.join(projectRoot, 'CLAUDE.md'), dryRun);
      actions.push({ file: 'CLAUDE.md', ...resClaude });
    }

    // 8. Initialize scripts/ci/ if project has scripts/ci/
    if (fs.existsSync(path.join(projectRoot, 'scripts/ci'))) {
      const targetCiDir = path.join(projectRoot, 'scripts/ci');
      ensureDir(targetCiDir, dryRun);
      for (const c of SOURCE_FILES.ciScripts) {
        const res = copyFileWithStatus(c.src, path.join(targetCiDir, c.name), dryRun);
        actions.push({ file: `scripts/ci/${c.name}`, ...res });
      }
    }

    // 9. Optional gate scan if requested
    let verification = null;
    const gatePath = path.join(targetHarnessDir, 'senior-engineering-gate-harness.mjs');
    if (options.scanGate && !dryRun && fs.existsSync(gatePath)) {
      try {
        const gateOut = execSync(
          `node "${gatePath}" --scan-repo`,
          { encoding: 'utf8', cwd: projectRoot, timeout: 30000 }
        );
        const lastLines = gateOut.trim().split('\n').filter(Boolean);
        const summary = lastLines.slice(-2).join(' | ');
        verification = { harness: 'senior-engineering-gate', success: true, output: summary };
      } catch (err) {
        verification = { harness: 'senior-engineering-gate', success: false, error: err.message };
      }
    }

    return {
      name,
      tier: 'Tier C (Extended Projects / Ecosystem Repos)',
      tierKey: 'C',
      status: 'SYNCED',
      syncedFilesCount: actions.length,
      createdCount: actions.filter((a) => a.status === 'CREATED').length,
      updatedCount: actions.filter((a) => a.status === 'UPDATED').length,
      unchangedCount: actions.filter((a) => a.status === 'UNCHANGED').length,
      actions,
      verification,
      error: null
    };
  } catch (err) {
    return {
      name,
      tier: 'Tier C (Extended Projects / Ecosystem Repos)',
      tierKey: 'C',
      status: 'ERROR',
      syncedFilesCount: actions.length,
      actions,
      error: err.message
    };
  }
}

/**
 * Automatically classifies and synchronizes any project by path or name.
 */
function syncProject(projectName, baseDir = DEFAULT_PROJECTS_BASE, options = {}) {
  const projectRoot = path.isAbsolute(projectName) ? projectName : path.join(baseDir, projectName);
  const classification = classifyProject(projectRoot);

  if (classification.tierKey === 'A') {
    return syncTierAProject(projectName, baseDir, options);
  }
  if (classification.tierKey === 'B') {
    return syncTierBProject(projectName, baseDir, options);
  }
  return syncTierCProject(projectName, baseDir, options);
}

/**
 * Main ecosystem synchronization orchestrator.
 */
function runEcosystemSync(options = {}) {
  const baseDir = options.baseDir || DEFAULT_PROJECTS_BASE;
  const isJson = Boolean(options.json);

  const discovery = discoverProjects(baseDir);

  if (!isJson) {
    console.log(`══════════════════════════════════════════════════════════════════════`);
    console.log(`🌐 SODA OS DYNAMIC ECOSYSTEM SCAN & CROSS-PROJECT SYNCHRONIZER`);
    console.log(`   Source Framework Root: ${SODA_OS_ROOT}`);
    console.log(`   Projects Base Dir:     ${baseDir}`);
    console.log(`   Discovered Repos:      ${discovery.all.length} total (${discovery.tierA.length} Tier A, ${discovery.tierB.length} Tier B, ${discovery.tierC.length} Tier C)`);
    if (options.dryRun) {
      console.log(`   Mode:                  DRY-RUN (Simulating changes, no disk writes)`);
    }
    console.log(`══════════════════════════════════════════════════════════════════════\n`);
  }

  // Determine tiers to execute
  let selectedTiers = ['A', 'B', 'C'];
  const tierInput = options.tier || options.tiers;
  if (tierInput) {
    if (Array.isArray(tierInput)) {
      selectedTiers = tierInput.map((t) => t.toUpperCase());
    } else if (typeof tierInput === 'string') {
      if (tierInput.toLowerCase() === 'all') {
        selectedTiers = ['A', 'B', 'C'];
      } else {
        selectedTiers = tierInput.split(',').map((t) => t.trim().toUpperCase());
      }
    }
  }

  const results = [];

  // Single target mode
  if (options.target) {
    const targetName = path.basename(options.target);
    if (!isJson) {
      console.log(`▶ Synchronizing Targeted Project: ${targetName}...`);
    }
    const res = syncProject(options.target, baseDir, options);
    results.push(res);
    if (!isJson) {
      const mark = res.status === 'SYNCED' ? '✅' : '⚠️';
      console.log(`  ${mark} [${res.tier}] ${res.name}: ${res.syncedFilesCount} files synced (${res.createdCount || 0} created, ${res.updatedCount || 0} updated, ${res.unchangedCount || 0} unchanged)`);
      if (res.markdownSync) {
        console.log(`     • Markdown Sync: ${res.markdownSync.success ? 'Reconciled' : 'Failed - ' + res.markdownSync.error}`);
      }
      if (res.verification) {
        console.log(`     • Verification (${res.verification.harness}): ${res.verification.success ? 'PASSED' : 'FAILED'}`);
      }
    }
    return finishSync(results, isJson);
  }

  // Tier A Sync
  if (selectedTiers.includes('A')) {
    if (!isJson) {
      console.log(`▶ Synchronizing Tier A Projects (${discovery.tierA.length} Full Goal-Driven Repositories)...`);
    }
    for (const name of discovery.tierA) {
      const res = syncTierAProject(name, baseDir, options);
      results.push(res);
      if (!isJson) {
        const mark = res.status === 'SYNCED' ? '✅' : '⚠️';
        console.log(`  ${mark} [${res.tierKey}] ${res.name}: ${res.syncedFilesCount} files synced (${res.createdCount} created, ${res.updatedCount} updated, ${res.unchangedCount} unchanged)`);
        if (res.markdownSync && res.markdownSync.success) {
          console.log(`     • Markdown Sync: Reconciled queues, snapshots, and dashboards`);
        } else if (res.markdownSync) {
          console.log(`     • Markdown Sync Error: ${res.markdownSync.error}`);
        }
        if (res.verification) {
          console.log(`     • Verification (${res.verification.harness}): ${res.verification.success ? 'PASSED' : 'FAILED'}`);
        }
      }
    }
  }

  // Tier B Sync
  if (selectedTiers.includes('B')) {
    if (!isJson) {
      console.log(`\n▶ Synchronizing Tier B Projects (${discovery.tierB.length} Agent-OS Governed / Microkernel Repositories)...`);
    }
    for (const name of discovery.tierB) {
      const res = syncTierBProject(name, baseDir, options);
      results.push(res);
      if (!isJson) {
        const mark = res.status === 'SYNCED' ? '✅' : '⚠️';
        console.log(`  ${mark} [${res.tierKey}] ${res.name}: ${res.syncedFilesCount} files synced (${res.createdCount} created, ${res.updatedCount} updated, ${res.unchangedCount} unchanged)`);
      }
    }
  }

  // Tier C Sync
  if (selectedTiers.includes('C')) {
    if (!isJson) {
      console.log(`\n▶ Synchronizing Tier C Projects (${discovery.tierC.length} Extended Projects / Ecosystem Repos)...`);
    }
    for (const name of discovery.tierC) {
      const res = syncTierCProject(name, baseDir, options);
      results.push(res);
      if (!isJson) {
        const mark = res.status === 'SYNCED' ? '✅' : '⚠️';
        console.log(`  ${mark} [${res.tierKey}] ${res.name}: ${res.syncedFilesCount} files synced (${res.createdCount} created, ${res.updatedCount} updated, ${res.unchangedCount} unchanged)`);
      }
    }
  }

  return finishSync(results, isJson);
}

function finishSync(results, isJson) {
  const syncedCount = results.filter((r) => r.status === 'SYNCED').length;
  const errorCount = results.filter((r) => r.status === 'ERROR').length;
  const skippedCount = results.filter((r) => r.status === 'SKIPPED_NOT_FOUND').length;

  if (isJson) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: results.length,
        synced: syncedCount,
        errors: errorCount,
        skipped: skippedCount
      },
      results
    }, null, 2));
  } else {
    console.log(`\n══════════════════════════════════════════════════════════════════════`);
    console.log(`🎉 Ecosystem Sync Complete: ${syncedCount} Synced | ${errorCount} Errors | ${skippedCount} Skipped (Total: ${results.length})`);
    console.log(`══════════════════════════════════════════════════════════════════════`);
  }

  return results;
}

function parseCliArgs(argv) {
  const options = {
    all: false,
    dryRun: false,
    json: false,
    skipGate: false,
    skipSyncGoals: false,
    scanGate: false,
    tier: null,
    target: null,
    baseDir: null,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--skip-gate') {
      options.skipGate = true;
    } else if (arg === '--skip-sync-goals') {
      options.skipSyncGoals = true;
    } else if (arg === '--scan-gate' || arg === '--all-gates') {
      options.scanGate = true;
    } else if (arg === '--tier' && i + 1 < argv.length) {
      options.tier = argv[++i];
    } else if (arg === '--target' && i + 1 < argv.length) {
      options.target = argv[++i];
    } else if (arg === '--base-dir' && i + 1 < argv.length) {
      options.baseDir = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      // If single positional arg given, check if it's a tier or a target
      if (/^[A-Ca-c]$/.test(arg)) {
        options.tier = arg.toUpperCase();
      } else if (arg.toLowerCase() === 'all') {
        options.all = true;
      } else {
        options.target = arg;
      }
    }
  }

  // Normalize tiers
  if (options.tier) {
    if (options.tier.toLowerCase() === 'all') {
      options.tiers = ['A', 'B', 'C'];
    } else {
      options.tiers = options.tier.split(',').map((t) => t.trim().toUpperCase());
    }
  } else {
    options.tiers = ['A', 'B', 'C'];
  }

  return options;
}

function printHelp() {
  console.log(`
Soda OS Central Ecosystem Scanner & Cross-Project Synchronizer

Usage:
  soda-os sync-ecosystem [flags]
  soda-os sync-all [flags]
  node scripts/goals/sync-ecosystem.js [flags]

Flags:
  --all                   Sync all discovered repositories across Tier A, B, and C (default)
  --tier <A,B,C|all>      Select specific tiers to synchronize (e.g. --tier A,B or --tier C)
  --target <project>      Sync only a specific project directory name or absolute path
  --dry-run               Simulate synchronization without modifying any filesystem files
  --json                  Output structured JSON results
  --skip-gate             Skip running the Senior Engineering Gate verification harness
  --skip-sync-goals       Skip running goal-markdown-sync queue reconciliation
  --scan-gate             Run Senior Engineering Gate verification harness on Tier B and C too
  --base-dir <path>       Specify custom projects base directory (default: /Users/batrarethsudprasert/projects)
  --help, -h              Show this help screen
`);
}

if (require.main === module) {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  const results = runEcosystemSync(options);
  const hasErrors = results.some((r) => r.status === 'ERROR');
  process.exit(hasErrors ? 1 : 0);
}

module.exports = {
  runEcosystemSync,
  discoverProjects,
  classifyProject,
  syncProject,
  syncTierAProject,
  syncTierBProject,
  syncTierCProject,
  syncGroupAProject: syncTierAProject,
  syncGroupBProject: syncTierBProject,
  copyFileWithStatus,
  parseCliArgs,
  UNIVERSAL_RULES,
  ALL_GOVERNANCE_RULES,
  GOAL_SCRIPTS,
  HARNESS_SCRIPTS,
  ALL_HARNESS_SCRIPTS,
  LIB_SCRIPTS,
  SCHEMAS,
  getAllSchemas,
  SOURCE_FILES,
  ARCHITECTURE_DOCS,
  SKILLS,
  getAllSkills,
  GROUP_A_PROJECTS,
  GROUP_B_PROJECTS,
  DEFAULT_PROJECTS_BASE,
  SODA_OS_ROOT
};

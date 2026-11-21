/**
 * Persona Markdown Generator & Indexer for Soda OS.
 * Manages modular persona files under docs/04-agents/personas/<persona-id>.md
 * and indexes them in docs/04-agents/personas/README.md.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CANONICAL_PERSONAS } from './persona-registry.mjs';

// Prebuilt UX Personas from .agents/rules/ux-persona-governance.md
export const UX_PREBUILT_PERSONAS = {
  'dark_pattern_ethics_watchdog': {
    role: 'reviewer',
    title: 'Dark Pattern & Ethics Watchdog',
    tier: 'Tier 1 (Highest Precedence)',
    directives: 'Enforces Zero Deception. Prohibits confirmshaming, sneak into basket, hidden recurring subscriptions, disguised ads. Absolute veto.',
    forbiddenActions: 'Never permit deceptive UX patterns, pre-ticked opt-ins, or dark patterns.',
  },
  'accessibility_auditor': {
    role: 'tester',
    title: 'Accessibility Auditor',
    tier: 'Tier 2 (Universal Inclusion)',
    directives: 'Enforces WCAG 2.2 Level AAA compliance. 7.0:1 text contrast, 44x44px touch targets, visible focus rings, ARIA semantics. Absolute veto.',
    forbiddenActions: 'Never permit accessibility regressions, unaliased focus loss, or unlabeled controls.',
  },
  'i18n_multilocale_stylist': {
    role: 'implementer',
    title: 'Internationalization & Multi-Locale Stylist',
    tier: 'Tier 2 (Universal Inclusion)',
    directives: 'Enforces bi-directional RTL/LTR readiness, CSS logical properties, dynamic font metrics, and 100% ICU extraction.',
    forbiddenActions: 'No hardcoded directionality (e.g. margin-left), no untranslated text strings.',
  },
  'ergonomics_cognitive_critic': {
    role: 'reviewer',
    title: 'Ergonomics & Cognitive Critic',
    tier: 'Tier 2 (Cognitive Safety)',
    directives: "Enforces Miller's Law cognitive limits (7 +/- 2), Hick's Law, and dual-action confirmation for irreversible actions.",
    forbiddenActions: 'No unprompted destructive actions; no cognitive friction or infinite confirmation loops.',
  },
  'enterprise_info_architect': {
    role: 'planner',
    title: 'Enterprise Information Architect',
    tier: 'Tier 3 (Architectural Foundations)',
    directives: 'Enforces hierarchical wayfinding (<= 3 clicks depth), breadcrumb integrity, ontology consistency, zero circular redirect loops.',
    forbiddenActions: 'No orphaned screens; no circular navigation loops.',
  },
  'design_systems_lead': {
    role: 'implementer',
    title: 'Design Systems Lead',
    tier: 'Tier 3 (Architectural Foundations)',
    directives: 'Enforces 100% design token fidelity. Prohibits unaliased raw hex/RGB colors, raw pixel values, or bracketed Tailwind arbitrary classes.',
    forbiddenActions: 'Never use arbitrary utility classes (e.g. mt-[37px]) or raw hex colors.',
  },
  'typography_scale_architect': {
    role: 'implementer',
    title: 'Typography Scale Architect',
    tier: 'Tier 3 (Architectural Foundations)',
    directives: 'Enforces mathematical modular typographic scales, optimal line lengths (45 to 85 chars), and line-height ratios >= 1.15.',
    forbiddenActions: 'No unconstrained font sizes; no illegible line height.',
  },
  'visual_balance_density': {
    role: 'implementer',
    title: 'Visual Balance & Layout Density Specialist',
    tier: 'Tier 3 (Architectural Foundations)',
    directives: 'Enforces 0px horizontal layout overflow across all viewports, optical alignment, whitespace rhythm, responsive breakpoints.',
    forbiddenActions: 'Never allow horizontal viewport scrolling or clipped elements.',
  },
  'interaction_choreographer': {
    role: 'implementer',
    title: 'Interaction Choreographer',
    tier: 'Tier 3 (Architectural Foundations)',
    directives: 'Enforces deterministic 5-state component coverage (empty, loading, partial, full, error) and valid navigation DAGs.',
    forbiddenActions: 'No unhandled state machine dead-ends or unstyled error boundaries.',
  },
  'color_contrast_specialist': {
    role: 'tester',
    title: 'Color Contrast & Vision Specialist',
    tier: 'Tier 4 (Sensory Polish)',
    directives: 'Enforces perceptual color spaces (OKLCH, APCA), colorblind-safe palettes (deuteranopia, protanopia, tritanopia), dark/light mode semantic parity.',
    forbiddenActions: 'No low-contrast color pairings or non-accessible color ramps.',
  },
  'motion_haptics_engineer': {
    role: 'implementer',
    title: 'Motion & Haptics Engineer',
    tier: 'Tier 4 (Sensory Polish)',
    directives: 'Enforces physics-based spring curves, 60fps/120fps budgets, prefers-reduced-motion media query compliance, and mobile haptic sync.',
    forbiddenActions: 'No linear animations; no jank or layout reflows during animation.',
  },
  'microcopy_tone_specialist': {
    role: 'reviewer',
    title: 'Microcopy & Tone Specialist',
    tier: 'Tier 4 (Sensory Polish)',
    directives: 'Enforces clear, actionable microcopy, empathetic error messages, consistent terminology, and brand voice.',
    forbiddenActions: 'No obscure error codes shown to end users without actionable remediation advice.',
  },
};

/**
 * Builds the canonical markdown content for a persona.
 */
export function buildPersonaMarkdown(personaData = {}) {
  const {
    persona,
    role = 'implementer',
    title = persona,
    tier = 'Standard Engineering Tier',
    directives = 'Operate strictly within touch map; zero mocks, zero stubs; stop after verification.',
    forbiddenActions = 'No mocks, no stubs, no out-of-scope edits.',
    detectedDomain = 'core',
    originGoalId = null,
    mandate = null,
  } = personaData;

  const lines = [
    `# Persona: ${persona}`,
    '',
    `> **Role:** \`${role}\`  `,
    `> **Title:** ${title}  `,
    `> **Tier/Precedence:** ${tier}  `,
    `> **Domain:** \`${detectedDomain}\`  `,
    originGoalId ? `> **Originating Goal:** [\`${originGoalId}\`](file:///docs/07-backlog/goals/${originGoalId}.md)  ` : '',
    mandate ? `> **Synthesized Mandate:** "${mandate}"  ` : '',
    '',
    '---',
    '',
    '## 🏛️ Invariant Directives',
    '',
    directives,
    '',
    '## 🚫 Forbidden Actions',
    '',
    forbiddenActions,
    '',
    '## 📋 Operational Scope & Touch Map Constraints',
    '',
    `- **Role:** \`${role}\``,
    '- **Single Persona Lock:** Strictly forbidden from switching personas or adopting multiple roles mid-turn.',
    '- **Constitutional Verification Pass:** Must execute automated verification checks with exit code 0 before concluding task.',
    '- **Telemetry:** Automatically recorded in `.agents/telemetry/sessions.jsonl`.',
    '',
  ];

  return lines.filter((line) => line !== undefined && line !== null).join('\n');
}

/**
 * Ensures that an individual persona markdown file exists. If missing, writes it and updates index.
 */
export async function ensurePersonaMarkdown(personaData = {}, repoRoot = process.cwd()) {
  const personaId = personaData.persona;
  if (!personaId) throw new Error('Missing persona ID');

  const dir = path.join(repoRoot, 'docs/04-agents/personas');
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${personaId}.md`);
  let exists = false;
  try {
    await fs.access(filePath);
    exists = true;
  } catch {}

  if (!exists) {
    const content = buildPersonaMarkdown(personaData);
    await fs.writeFile(filePath, content, 'utf-8');

    // Also mirror to template/ if present
    const templateDir = path.join(repoRoot, 'template/docs/04-agents/personas');
    try {
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, `${personaId}.md`), content, 'utf-8');
    } catch {}

    // Index the newly added persona
    await indexPersonaFile(personaData, repoRoot);
  }

  return filePath;
}

/**
 * Appends or updates the central persona index in docs/04-agents/personas/README.md.
 */
export async function indexPersonaFile(personaData = {}, repoRoot = process.cwd()) {
  const dir = path.join(repoRoot, 'docs/04-agents/personas');
  await fs.mkdir(dir, { recursive: true });
  const indexPath = path.join(dir, 'README.md');

  // Read all existing persona markdown files in directory
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'README.md');

  const personaEntries = [];
  for (const file of files) {
    const personaId = file.replace(/\.md$/, '');
    const fullPath = path.join(dir, file);
    const content = await fs.readFile(fullPath, 'utf-8');

    const roleMatch = content.match(/> \*\*Role:\*\* `([^`]+)`/);
    const titleMatch = content.match(/> \*\*Title:\*\* ([^\n]+)/);
    const domainMatch = content.match(/> \*\*Domain:\*\* `([^`]+)`/);

    personaEntries.push({
      id: personaId,
      file,
      role: roleMatch ? roleMatch[1].trim() : 'implementer',
      title: titleMatch ? titleMatch[1].trim() : personaId,
      domain: domainMatch ? domainMatch[1].trim() : 'core',
    });
  }

  personaEntries.sort((a, b) => a.id.localeCompare(b.id));

  const lines = [
    '# 🧑‍💻 Soda OS Canonical Personas Catalog Index',
    '',
    '> **Location:** `docs/04-agents/personas/`  ',
    '> **Description:** Authoritative registry of modular specialist personas for Soda OS subagents, including prebuilt core engineering personas, the 12 UX governance personas, and dynamically synthesized on-the-fly personas.  ',
    '',
    '---',
    '',
    '## 📋 Catalog Index',
    '',
    '| Persona ID | Role | Domain | Specification File |',
    '|---|---|---|---|',
    ...personaEntries.map((p) => `| \`${p.id}\` | \`${p.role}\` | \`${p.domain}\` | [\`${p.file}\`](file:///docs/04-agents/personas/${p.file}) |`),
    '',
    '---',
    '',
    '## ⚙️ Persona Lifecycle & Spawning Rules',
    '',
    '1. **Single-Persona Invariant:** Every subagent session is bound to exactly one persona string for its entire lifecycle.',
    '2. **Dynamic On-The-Fly Synthesis:** If a task mandate does not match an existing persona, `dynamic-persona-synthesizer.mjs` automatically generates a new persona markdown file and updates this index.',
    '3. **Zero Mocks:** Every persona strictly prohibits stubs, mocks, and ungrounded fallbacks.',
    '',
  ];

  const indexContent = lines.join('\n');
  await fs.writeFile(indexPath, indexContent, 'utf-8');

  // Mirror index to template/
  const templateDir = path.join(repoRoot, 'template/docs/04-agents/personas');
  try {
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(path.join(templateDir, 'README.md'), indexContent, 'utf-8');
  } catch {}
}

/**
 * Generates all standard prebuilt personas into modular markdown files.
 */
export async function generateAllPrebuiltPersonas(repoRoot = process.cwd()) {
  let count = 0;

  // 1. Core Personas
  for (const [id, data] of Object.entries(CANONICAL_PERSONAS)) {
    await ensurePersonaMarkdown({
      persona: id,
      role: data.role,
      title: data.title,
      directives: data.directives,
      forbiddenActions: 'Zero mocks, zero stubs, no out-of-scope edits.',
      detectedDomain: 'core',
    }, repoRoot);
    count++;
  }

  // 2. UX 12 Prebuilt Personas
  for (const [id, data] of Object.entries(UX_PREBUILT_PERSONAS)) {
    await ensurePersonaMarkdown({
      persona: id,
      role: data.role,
      title: data.title,
      tier: data.tier,
      directives: data.directives,
      forbiddenActions: data.forbiddenActions,
      detectedDomain: 'ux',
    }, repoRoot);
    count++;
  }

  return { count };
}

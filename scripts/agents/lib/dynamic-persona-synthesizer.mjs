/**
 * On-the-Fly Dynamic Persona Synthesizer for Soda OS Subagents.
 * Autonomously synthesizes a single, deterministic specialist persona string and
 * domain-tailored invariant directives based on task mandate, touch map, and role.
 */

const DOMAIN_KEYWORDS = [
  { match: /(?:payment|stripe|billing|invoice|checkout|money|currency|tax)/i, domain: 'payment' },
  { match: /(?:auth|oauth|jwt|session|login|security|rbac|permission|stride)/i, domain: 'security' },
  { match: /(?:db|database|sql|migration|schema|table|postgres|redis)/i, domain: 'database' },
  { match: /(?:ui|frontend|css|react|tailwind|component|view|dom|accessibility|wcag)/i, domain: 'frontend' },
  { match: /(?:api|rest|grpc|route|controller|endpoint|gateway|http)/i, domain: 'api' },
  { match: /(?:test|qa|verification|property|fuzz|coverage|benchmark)/i, domain: 'qa' },
  { match: /(?:infra|docker|k8s|kubernetes|cloud|sre|terraform|deploy)/i, domain: 'infra' },
  { match: /(?:ml|model|ai|training|inference|dataset|weights)/i, domain: 'ml' },
  { match: /(?:math|proof|smt|formal|invariant|theorem)/i, domain: 'formal_proof' },
  { match: /(?:wiki|doc|docs|documentation|digest|catalog)/i, domain: 'wiki' },
];

const ROLE_SUFFIXES = {
  implementer: 'engineer',
  tester: 'tester',
  reviewer: 'reviewer',
  planner: 'architect',
  shipper: 'release_lead',
  context_retriever: 'curator',
};

const DOMAIN_DIRECTIVES = {
  payment: 'All monetary arithmetic MUST use exact integer minor units with remainder preservation; zero float operations; zero mocks.',
  security: 'Enforce zero-trust boundaries; sanitize all inputs; never expose tokens, secrets, or unhashed passwords; zero mocks.',
  database: 'Never perform destructive schema operations without explicit down migrations; verify connection pooling and index bounds.',
  frontend: 'Enforce design token fidelity; zero horizontal layout overflow; deterministic 5-state coverage (empty, loading, partial, full, error); WCAG AAA compliance.',
  api: 'Enforce strict schema contracts; return typed responses; validate all incoming requests; zero stubs.',
  qa: 'Strictly verify Given-When-Then BDD scenarios; write failing tests first; execute 100% real code paths with zero mocks.',
  infra: 'Maintain idempotent configuration; zero hardcoded hostnames; respect resource limits and graceful SIGTERM teardown.',
  ml: 'Preserve strict dataset split isolation; verify label-oracle contracts; clamp memory and compute ceilings.',
  formal_proof: 'Verify algebraic conservation laws, state space completeness, and fail-closed bounds with mathematical rigor.',
  wiki: 'Enforce exclusive single-owner lease; distill compact, source-cited digests with exact line numbers.',
  default: 'Operate strictly within declared touch map; write 100% production-ready code with zero mocks, zero stubs, and zero fallbacks.',
};

import { ensurePersonaMarkdown } from './persona-markdown-generator.mjs';

/**
 * Synthesizes a deterministic specialist persona and customized directives on-the-fly.
 * Automatically generates a dedicated persona markdown file and updates the catalog index.
 */
export function synthesizeOnTheFlyPersona({ role = 'implementer', mandate = '', goalId = '', touchMap = [], repoRoot = process.cwd() }) {
  const normRole = String(role).toLowerCase().trim() || 'implementer';
  const textCorpus = `${goalId} ${mandate} ${touchMap.join(' ')}`;

  let detectedDomain = 'default';
  for (const entry of DOMAIN_KEYWORDS) {
    if (entry.match.test(textCorpus)) {
      detectedDomain = entry.domain;
      break;
    }
  }

  // Derive single-token persona string (e.g. "payment_engineer", "security_tester", "api_engineer")
  const roleSuffix = ROLE_SUFFIXES[normRole] || 'specialist';
  const prefix = detectedDomain !== 'default' ? detectedDomain : (goalId ? goalId.toLowerCase().replace(/[^a-z0-9]/g, '') : 'core');

  // Enforce single persona invariant (no spaces, commas, or 'and')
  const persona = `${prefix}_${roleSuffix}`.replace(/[^a-z0-9_]/gi, '');

  const domainDirective = DOMAIN_DIRECTIVES[detectedDomain] || DOMAIN_DIRECTIVES.default;
  const directives = `Act strictly as ${persona}. ${domainDirective} Zero mocks, zero stubs. Stop execution after verification.`;

  const result = {
    persona,
    role: normRole,
    detectedDomain,
    directives,
  };

  // Asynchronously ensure the persona markdown file and catalog index are persisted
  try {
    ensurePersonaMarkdown({
      persona,
      role: normRole,
      title: `${persona.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
      directives,
      forbiddenActions: 'Zero mocks, zero stubs, no out-of-scope edits.',
      detectedDomain,
      originGoalId: goalId || null,
      mandate: mandate || null,
    }, repoRoot).catch(() => {});
  } catch {}

  return result;
}

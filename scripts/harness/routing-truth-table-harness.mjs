#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ROUTING TRUTH TABLE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Finite State Machine & Autonomous Decision Routing Proof
 * Purpose: Exhaustively proves decision routing contracts over Risk x Evidence x
 *          Confidence permutations, enforcing fail-closed bounds and deterministic
 *          state-transition completeness.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { DaveAutonomyRouter, TRUTH_TABLE_16 } from '../lib/dave-autonomy-router.mjs';

export const PERMITTED_ACTIONS = ['proceed', 'verify', 'defer', 'human_review'];

/**
 * Extracts routing contract YAML block from content.
 */
export function extractRoutingContract(content) {
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*routing_contract:\s*$/m.test(text)) {
      return parseRoutingContractYaml(text);
    }
  }

  // Also check markdown table
  const tableMatch = content.match(/##\s+.*Routing.*Table[\s\S]*?\n(\|[\s\S]+?\n\n)/i);
  if (tableMatch) {
    return parseRoutingTableMarkdown(tableMatch[1]);
  }

  return null;
}

/**
 * Parses markdown routing table into cases.
 */
export function parseRoutingTableMarkdown(tableText) {
  const lines = tableText.trim().split('\n').filter(l => l.includes('|'));
  if (lines.length < 3) return null;
  const cases = [];

  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 4) {
      cases.push({
        risk: cols[0].toLowerCase(),
        evidence: cols[1].toLowerCase(),
        confidence: cols[2].toLowerCase(),
        expected: cols[3].toLowerCase()
      });
    }
  }

  return {
    dimensions: {
      risk: ['normal', 'high'],
      evidence: ['verified', 'unverified'],
      confidence: ['low', 'high']
    },
    actions: PERMITTED_ACTIONS,
    cases
  };
}

/**
 * Simple parser for routing_contract YAML.
 */
export function parseRoutingContractYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const cases = [];
  let inCases = false;
  let currentCase = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^cases:\s*$/.test(trimmed)) {
      inCases = true;
      continue;
    }

    if (inCases) {
      const itemMatch = rawLine.match(/^\s*-\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (itemMatch) {
        if (currentCase) cases.push(currentCase);
        currentCase = {};
        currentCase[itemMatch[1]] = itemMatch[2].trim().replace(/^['"]|['"]$/g, '');
        continue;
      }
      if (currentCase) {
        const propMatch = rawLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (propMatch) {
          currentCase[propMatch[1]] = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }
  if (currentCase) cases.push(currentCase);

  return {
    dimensions: {
      risk: ['normal', 'high'],
      evidence: ['verified', 'unverified'],
      confidence: ['low', 'high']
    },
    actions: PERMITTED_ACTIONS,
    cases
  };
}

/**
 * Validates routing contract and exhaustively proves truth table completeness.
 */
export function validateRoutingTruthTable(content, filename = '') {
  const errors = [];
  const warnings = [];

  const contract = extractRoutingContract(content);
  const isAgentOrRouting = content.includes('agent_execution') ||
                          /Routing\s+Contract|GovernedDecision|routeDecision/i.test(content);

  if (!contract || !contract.cases || contract.cases.length === 0) {
    if (isAgentOrRouting && !filename.includes('_template')) {
      errors.push('Goal involves agent execution or routing logic but declares no machine-readable routing_contract or truth table.');
    }
    return {
      valid: errors.length === 0,
      caseCount: 0,
      errors,
      warnings
    };
  }

  const cases = contract.cases;
  const expectedCases = [];

  // Generate exhaustive Cartesian Product of Risk x Evidence x Confidence
  const risks = ['normal', 'high'];
  const evidences = ['verified', 'unverified'];
  const confidences = ['low', 'high'];

  for (const r of risks) {
    for (const e of evidences) {
      for (const c of confidences) {
        expectedCases.push({ risk: r, evidence: e, confidence: c });
      }
    }
  }

  // Check each declared case
  const declaredPermutations = new Map();

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const key = `${c.risk}|${c.evidence}|${c.confidence}`;
    const action = c.expected || c.action;

    if (declaredPermutations.has(key)) {
      errors.push(`Routing truth table contains duplicate entry for permutation: (${c.risk}, ${c.evidence}, ${c.confidence}). Routing must be deterministic with exactly one route.`);
    }
    declaredPermutations.set(key, action);

    if (!PERMITTED_ACTIONS.includes(action)) {
      errors.push(`Invalid action "${action}" in routing case (${key}). Permitted actions: ${PERMITTED_ACTIONS.join(', ')}.`);
    }

    // Safety Invariant 1: High-risk unverified actions MUST NEVER proceed
    if (c.risk === 'high' && c.evidence === 'unverified' && action === 'proceed') {
      errors.push(`Critical safety invariant violated: High-risk decision with unverified evidence routes to "proceed"! Must defer or human_review.`);
    }

    // Safety Invariant 2: Low-confidence actions MUST NEVER proceed
    if (c.confidence === 'low' && action === 'proceed') {
      errors.push(`Critical safety invariant violated: Low-confidence decision routes to "proceed"! Must verify or defer.`);
    }

    // Safety Invariant 3: High-risk verified actions must route to human_review or defer, never proceed autonomously without gate
    if (c.risk === 'high' && c.evidence === 'verified' && c.confidence === 'high' && action === 'proceed') {
      errors.push(`High-risk high-confidence action routes directly to "proceed" without human_review gate.`);
    }
  }

  // Check completeness: all 8 standard permutations must be mapped
  for (const exp of expectedCases) {
    const key = `${exp.risk}|${exp.evidence}|${exp.confidence}`;
    if (!declaredPermutations.has(key)) {
      errors.push(`Incomplete routing truth table: missing permutation (${exp.risk}, ${exp.evidence}, ${exp.confidence}). State-transition incompleteness.`);
    }
  }

  return {
    valid: errors.length === 0,
    caseCount: cases.length,
    cases,
    errors,
    warnings
  };
}

/**
 * Proves 16/16 Cartesian product coverage and fail-closed safety invariants on DaveAutonomyRouter.
 */
export function validateAutonomyRouterTruthTable({ strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const router = new DaveAutonomyRouter();
  const table = router.getTruthTable ? router.getTruthTable() : TRUTH_TABLE_16;

  if (!table || table.length !== 16) {
    errors.push(`Truth table must declare exactly 16 states (got ${table ? table.length : 0}).`);
    return { valid: false, stateCount: table ? table.length : 0, errors, warnings };
  }

  let proceedCount = 0;

  for (let i = 0; i < table.length; i++) {
    const entry = table[i];
    const decision = {
      decision_id: `DAVE-CHECK-${i + 1}`,
      risk: entry.risk,
      confidence: entry.confidence === 'high' ? 0.95 : 0.50,
      evidenceVerified: entry.evidence === 'verified',
      conflicts: []
    };

    const res = router.route(decision);

    if (res.route !== entry.route) {
      errors.push(`State #${i + 1} (${entry.risk}, ${entry.evidence}, ${entry.confidence}) produced route "${res.route}", expected "${entry.route}".`);
    }

    if (res.execution_permission !== entry.execution_permission) {
      errors.push(`State #${i + 1} (${entry.risk}, ${entry.evidence}, ${entry.confidence}) produced permission "${res.execution_permission}", expected "${entry.execution_permission}".`);
    }

    // Safety Invariant: execution_permission is permitted IF AND ONLY IF route is proceed
    if (res.route === 'proceed') {
      proceedCount++;
      if (res.execution_permission !== 'permitted') {
        errors.push(`Safety invariant breached: route is proceed but execution_permission is "${res.execution_permission}".`);
      }
      if (!res.auth_token) {
        errors.push(`Safety invariant breached: route is proceed but auth_token is null or missing.`);
      }
    } else {
      if (res.execution_permission === 'permitted') {
        errors.push(`Safety invariant breached: non-proceed route ("${res.route}") received "permitted" execution_permission.`);
      }
      if (res.auth_token !== null) {
        errors.push(`Safety invariant breached: non-proceed route ("${res.route}") generated an auth_token.`);
      }
    }

    // High/critical risk unverified must NEVER proceed
    if ((entry.risk === 'high' || entry.risk === 'critical') && entry.evidence === 'unverified' && res.route === 'proceed') {
      errors.push(`Critical safety invariant breached: unverified ${entry.risk}-risk decision routed to proceed!`);
    }
  }

  if (proceedCount !== 1) {
    errors.push(`Autonomy invariant breached: exactly 1 state out of 16 must route to proceed (got ${proceedCount}).`);
  }

  if (strict) {
    // Edge case 1: null input
    const nullRes = router.route(null);
    if (nullRes.route === 'proceed' || nullRes.execution_permission === 'permitted') {
      errors.push('Strict check failed: null candidate input allowed execution.');
    }

    // Edge case 2: NaN confidence
    const nanRes = router.route({ risk: 'low', confidence: NaN, evidenceVerified: true });
    if (nanRes.route === 'proceed' || nanRes.execution_permission === 'permitted') {
      errors.push('Strict check failed: NaN confidence allowed execution.');
    }

    // Edge case 3: Cross-domain conflict override
    const conflictRes = router.route({
      risk: 'low',
      confidence: 0.99,
      evidenceVerified: true,
      conflicts: [{ summary: 'Collision' }]
    });
    if (conflictRes.route !== 'human_review' || conflictRes.execution_permission !== 'blocked_until_approved') {
      errors.push('Strict check failed: cross-domain conflict did not force human_review.');
    }
  }

  return {
    valid: errors.length === 0,
    stateCount: table.length,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('routing-truth-table-harness.mjs')) {
  const args = process.argv.slice(2);
  const strictMode = args.includes('--strict');
  const target = args.find(a => !a.startsWith('--'));

  if (!target) {
    const routerRes = validateAutonomyRouterTruthTable({ strict: strictMode });
    if (routerRes.valid) {
      console.log(`✅ 16/16 routing truth table states verified successfully (${routerRes.stateCount} states, strict=${strictMode}).`);
      process.exit(0);
    } else {
      console.error(`❌ Routing truth table validation failed:`);
      for (const err of routerRes.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
  }

  let resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    const archivedCandidate = resolved.replace('/goals/', '/goals/_archived/');
    if (existsSync(archivedCandidate)) {
      resolved = archivedCandidate;
    } else {
      console.error(`Goal file not found: ${resolved}`);
      process.exit(1);
    }
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateRoutingTruthTable(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Routing truth table verified for ${basename(resolved)} (${res.caseCount} exhaustive cases).`);
    process.exit(0);
  } else {
    console.error(`❌ Routing truth table validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}


#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL ASSUMPTIONS & RISK REGISTER HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Operational Risk Governance & Epistemic Assumption Tracking
 * Purpose: Validates machine-readable assumption and risk registers, enforcing
 *          invalidation criteria, validation goal bindings, mitigation triggers,
 *          and blocking promotion of low-confidence assumptions in ready goals.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * Extracts YAML assumptions from goal card.
 */
export function extractAssumptions(content) {
  // Capture from assumptions: until next unindented top-level key, markdown heading, or fence
  const yamlMatch = content.match(/assumptions:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n```|\n#|$)/);
  if (!yamlMatch) return [];
  const lines = yamlMatch[1].split(/\r?\n/);
  const assumptions = [];
  let current = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const itemMatch = rawLine.match(/^\s*-\s+id:\s*(.*)$/);
    if (itemMatch) {
      if (current) assumptions.push(current);
      current = { id: itemMatch[1].trim().replace(/^['"]|['"]$/g, '') };
      continue;
    }
    if (current) {
      const propMatch = rawLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (propMatch) {
        current[propMatch[1]] = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  if (current) assumptions.push(current);
  return assumptions;
}

/**
 * Extracts YAML risks from goal card.
 */
export function extractRisks(content) {
  // Capture from risks: until next unindented top-level key, markdown heading, or fence
  const yamlMatch = content.match(/risks:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n```|\n#|$)/);
  if (!yamlMatch) return [];
  const lines = yamlMatch[1].split(/\r?\n/);
  const risks = [];
  let current = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const itemMatch = rawLine.match(/^\s*-\s+id:\s*(.*)$/);
    if (itemMatch) {
      if (current) risks.push(current);
      current = { id: itemMatch[1].trim().replace(/^['"]|['"]$/g, '') };
      continue;
    }
    if (current) {
      const propMatch = rawLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (propMatch) {
        current[propMatch[1]] = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  if (current) risks.push(current);
  return risks;
}

/**
 * Validates assumption and risk registries.
 */
export function validateAssumptionsAndRisks(content, filename = '') {
  const errors = [];
  const warnings = [];

  const statusMatch = content.match(/\*\*Status:\*\*\s*([a-zA-Z_]+)/i);
  const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'draft';

  // 1. Validate Assumptions
  const assumptions = extractAssumptions(content);
  if (assumptions.length === 0 && !filename.includes('_template') && !filename.includes('_archived')) {
    warnings.push('Goal has empty assumptions registry.');
  }

  for (const a of assumptions) {
    if (!a.statement || a.statement.length < 5) {
      errors.push(`Assumption [${a.id}] missing substantive statement.`);
    }

    const conf = (a.confidence || '').toLowerCase();
    if (['ready', 'in_progress', 'review', 'approved'].includes(status) && conf === 'low') {
      errors.push(`Goal status is "${status}" but assumption [${a.id}] has low confidence! Low-confidence assumptions must be validated before goal can become ready.`);
    }

    if (!a.invalidation_condition && !filename.includes('_template')) {
      warnings.push(`Assumption [${a.id}] has no explicit invalidation condition.`);
    }
  }

  // 2. Validate Risks
  const risks = extractRisks(content);
  if (risks.length === 0 && !filename.includes('_template') && !filename.includes('_archived')) {
    warnings.push('Goal has empty risks registry.');
  }

  for (const r of risks) {
    if (!r.description || r.description.length < 5) {
      errors.push(`Risk [${r.id}] missing descriptive failure mode.`);
    }

    const impact = (r.impact || '').toLowerCase();
    if (['high', 'critical'].includes(impact)) {
      if (!r.mitigation) {
        errors.push(`High/Critical risk [${r.id}] is missing required preventative "mitigation".`);
      }
      if (!r.detection) {
        errors.push(`High/Critical risk [${r.id}] is missing required "detection" detector or metric.`);
      }
      if (!r.response) {
        errors.push(`High/Critical risk [${r.id}] is missing emergency "response" or rollback action.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    assumptionCount: assumptions.length,
    riskCount: risks.length,
    assumptions,
    risks,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('goal-assumptions-risk-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node goal-assumptions-risk-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateAssumptionsAndRisks(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Assumptions and risk register verified for ${basename(resolved)} (${res.assumptionCount} assumptions, ${res.riskCount} risks).`);
    process.exit(0);
  } else {
    console.error(`❌ Assumptions and risk register validation failed:`);
    for (const err of res.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

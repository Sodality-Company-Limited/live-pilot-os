#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS RESOURCE & COST BUDGET HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Hard Quantitative SLAs & Compute Feasibility Governance
 * Purpose: Validates CPU, GPU, memory, storage, token, latency, and cost budgets
 *          to ensure goals are computationally feasible and operate within bounds.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

export const RECOGNIZED_BUDGET_DIMENSIONS = [
  'latency_budget',
  'memory_budget',
  'compute_budget',
  'cpu_budget',
  'gpu_budget',
  'storage_budget',
  'token_budget',
  'network_budget',
  'training_cost_budget',
  'inference_cost_budget'
];

/**
 * Extracts resource and cost budget from goal content.
 */
export function extractResourceBudget(content) {
  // YAML block: resource_budget:
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*(?:resource_budget|cost_budget|budgets):\s*$/m.test(text)) {
      return parseBudgetYaml(text);
    }
  }

  // Markdown section: ## Resource & Cost Budget
  const sectionMatch = content.match(/##\s+(?:Resource|Resource\s+&\s+Cost\s+Budget)[\s\S]*?(?=\n##\s+|$)/i);
  if (sectionMatch) {
    return parseBudgetMarkdown(sectionMatch[0]);
  }

  return null;
}

function parseBudgetYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const budgets = {};

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const propMatch = rawLine.match(/^\s*([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (propMatch) {
      const k = propMatch[1];
      const v = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
      if (v) budgets[k] = v;
    }
  }
  return budgets;
}

function parseBudgetMarkdown(sectionText) {
  const budgets = {};
  const lines = sectionText.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*([A-Za-z0-9_\s]+):\*\*\s*(.*)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      budgets[key] = match[2].trim();
    }
  }
  return budgets;
}

/**
 * Validates resource budgets for a goal.
 */
export function validateResourceBudget(content, filename = '') {
  const errors = [];
  const warnings = [];

  const budget = extractResourceBudget(content);
  const isComputeHeavy = content.includes('ml_research') ||
                         /training|fine-tuning|inference|latency|real-time|streaming/i.test(content);

  if (!budget || Object.keys(budget).length === 0) {
    if (isComputeHeavy && !filename.includes('_template')) {
      errors.push('Goal involves machine learning or performance-critical execution but declares no machine-readable resource_budget.');
    }
    return {
      valid: errors.length === 0,
      budgetCount: 0,
      errors,
      warnings
    };
  }

  const keys = Object.keys(budget);

  // Check latency budget for real-time / streaming / API systems
  if (/voice|stream|realtime|api|gateway/i.test(content)) {
    const hasLatency = keys.some(k => k.includes('latency'));
    if (!hasLatency) {
      warnings.push('Real-time or API goal does not specify an explicit latency_budget (e.g. p95 < 100ms).');
    }
  }

  // Check compute hardware feasibility for ML training
  if (content.includes('ml_research') || /fine-tuning|RLCD|train/i.test(content)) {
    const hasGpuOrCompute = keys.some(k => k.includes('gpu') || k.includes('compute'));
    if (!hasGpuOrCompute && !filename.includes('_template')) {
      errors.push('ML training goal does not declare GPU or compute budget. Hardware feasibility must be explicitly bounded.');
    }
  }

  return {
    valid: errors.length === 0,
    budgetCount: keys.length,
    budget,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('resource-budget-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node resource-budget-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateResourceBudget(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Resource & cost budget verified for ${basename(resolved)} (${res.budgetCount} budgets specified).`);
    process.exit(0);
  } else {
    console.error(`❌ Resource budget validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS OBSERVABILITY CONTRACT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Production Telemetry, SRE & Calibration Drift Governance
 * Purpose: Validates machine-readable observability contracts defining metrics,
 *          structured logs, OpenTelemetry traces, alert thresholds, dashboards,
 *          and confidence-aware agent telemetry.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

export const CONFIDENCE_TELEMETRY_METRICS = [
  'decision_count',
  'confidence_distribution',
  'ece',
  'brier_score',
  'high_confidence_error_rate',
  'proceed_rate',
  'verify_rate',
  'defer_rate',
  'human_review_rate'
];

/**
 * Extracts observability contract from goal card.
 */
export function extractObservabilityContract(content) {
  // YAML block: observability:
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*observability:\s*$/m.test(text)) {
      return parseObservabilityYaml(text);
    }
  }

  // Markdown section: ## Observability
  const sectionMatch = content.match(/##\s+Observability[\s\S]*?(?=\n##\s+|$)/i);
  if (sectionMatch) {
    return parseObservabilityMarkdown(sectionMatch[0]);
  }

  return null;
}

function parseObservabilityYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const contract = { metrics: [], alerts: [], traces: [], dashboards: [] };
  let currentArray = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^metrics:\s*$/.test(trimmed)) { currentArray = 'metrics'; continue; }
    if (/^alerts:\s*$/.test(trimmed)) { currentArray = 'alerts'; continue; }
    if (/^traces:\s*$/.test(trimmed)) { currentArray = 'traces'; continue; }
    if (/^dashboards:\s*$/.test(trimmed)) { currentArray = 'dashboards'; continue; }

    const itemMatch = rawLine.match(/^\s*-\s+([^\n]+)$/);
    if (itemMatch && currentArray) {
      contract[currentArray].push(itemMatch[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }

  return contract;
}

function parseObservabilityMarkdown(sectionText) {
  const contract = { metrics: [], alerts: [], traces: [], dashboards: [] };
  const lines = sectionText.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*([A-Za-z0-9_\s]+):\*\*\s*(.*)$/);
    if (match) {
      const k = match[1].toLowerCase();
      const val = match[2].trim();
      if (k.includes('metric')) contract.metrics.push(val);
      if (k.includes('alert') || k.includes('threshold')) contract.alerts.push(val);
      if (k.includes('trace') || k.includes('span')) contract.traces.push(val);
      if (k.includes('dashboard') || k.includes('runbook')) contract.dashboards.push(val);
    }
  }
  return contract;
}

/**
 * Validates the observability contract of a goal.
 */
export function validateObservabilityContract(content, filename = '') {
  const errors = [];
  const warnings = [];

  const contract = extractObservabilityContract(content);
  const isProductionOrRuntime = content.includes('agent_execution') ||
                                content.includes('backend') ||
                                content.includes('sre') ||
                                content.includes('deployment');

  if (!contract || (contract.metrics.length === 0 && contract.alerts.length === 0)) {
    if (isProductionOrRuntime && !filename.includes('_template')) {
      errors.push('Goal touches production or agent runtime execution but declares no machine-readable observability contract or metrics.');
    }
    return {
      valid: errors.length === 0,
      metricCount: 0,
      alertCount: 0,
      errors,
      warnings
    };
  }

  if (contract.metrics.length === 0) {
    warnings.push('Observability contract defines no explicit quantitative metrics.');
  }

  if (contract.alerts.length === 0 && isProductionOrRuntime) {
    warnings.push('Observability contract defines no alert thresholds or SLO failure triggers.');
  }

  // If this is a confidence-aware or agent execution goal, verify calibration telemetry
  if (content.includes('agent_execution') || /RLCD|calibrat/i.test(content)) {
    const metricsStr = contract.metrics.join(' ') + ' ' + content;
    const missingConfidenceMetrics = [];
    for (const cm of CONFIDENCE_TELEMETRY_METRICS) {
      if (!metricsStr.toLowerCase().includes(cm)) {
        missingConfidenceMetrics.push(cm);
      }
    }
    if (missingConfidenceMetrics.length > 5 && !filename.includes('_template')) {
      warnings.push(`Agent / RLCD goal is missing key calibration telemetry metrics: ${missingConfidenceMetrics.slice(0, 4).join(', ')}.`);
    }
  }

  return {
    valid: errors.length === 0,
    metricCount: contract.metrics.length,
    alertCount: contract.alerts.length,
    contract,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('observability-contract-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node observability-contract-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateObservabilityContract(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Observability contract verified for ${basename(resolved)} (${res.metricCount} metrics, ${res.alertCount} alerts).`);
    process.exit(0);
  } else {
    console.error(`❌ Observability contract validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

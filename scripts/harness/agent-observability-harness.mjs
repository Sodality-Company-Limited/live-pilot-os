#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS AGENT OBSERVABILITY & CALIBRATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Real-Time Agent Telemetry, SRE & Calibration Drift Governance
 * Purpose: Validates agent calibration metrics, ECE bounds, Brier score,
 *          high-confidence error rates, deferral telemetry, and alert triggers.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { validateObservabilityContract, extractObservabilityContract } from './observability-contract-harness.mjs';

export const MANDATORY_AGENT_METRICS = [
  'confidence_distribution',
  'ece',
  'brier_score',
  'high_confidence_error_rate',
  'defer_rate',
  'human_review_rate'
];

/**
 * Validates agent observability telemetry and empirical calibration metrics.
 */
export function validateAgentObservability(reportOrPath, options = {}) {
  const errors = [];
  const warnings = [];
  let report = null;

  if (typeof reportOrPath === 'string') {
    const fullPath = resolve(process.cwd(), reportOrPath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [`Observability report not found: ${reportOrPath}`],
        warnings
      };
    }
    try {
      report = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      return {
        valid: false,
        errors: [`Malformed observability report JSON: ${err.message}`],
        warnings
      };
    }
  } else if (typeof reportOrPath === 'object' && reportOrPath !== null) {
    report = reportOrPath;
  } else {
    return {
      valid: false,
      errors: ['Input must be a file path string or an object'],
      warnings
    };
  }

  // 1. Goal identity
  if (!report.goal_id) {
    errors.push('Observability report missing "goal_id"');
  }

  // 2. Metrics Block
  if (!report.metrics || typeof report.metrics !== 'object') {
    errors.push('Observability report missing "metrics" object');
  } else {
    const m = report.metrics;
    for (const reqMetric of MANDATORY_AGENT_METRICS) {
      if (m[reqMetric] === undefined) {
        errors.push(`Missing mandatory agent metric: "${reqMetric}"`);
      }
    }

    // 3. Calibration SLAs
    if (m.ece !== undefined && m.ece > 0.08) {
      errors.push(`Expected Calibration Error (${m.ece}) breaches SLA ceiling of 0.08`);
    }
    if (m.brier_score !== undefined && m.brier_score > 0.15) {
      errors.push(`Brier Score (${m.brier_score}) breaches SLA ceiling of 0.15`);
    }
    if (m.high_confidence_error_rate !== undefined && m.high_confidence_error_rate > 0.01) {
      errors.push(`High-Confidence Error Rate (${m.high_confidence_error_rate}) breaches SLA ceiling of 0.01`);
    }
  }

  // 4. Alert Rules Verification
  if (!Array.isArray(report.alerts) || report.alerts.length === 0) {
    warnings.push('Observability report has no alert rules declared');
  } else {
    const hasHcerAlert = report.alerts.some(a => (a.name || '').includes('hcer') || (a.metric || '').includes('high_confidence_error'));
    if (!hasHcerAlert) {
      warnings.push('Observability report lacks high-confidence error alert rule');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    report
  };
}

// CLI Execution
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node agent-observability-harness.mjs <report-file-or-goal-id>');
    process.exit(1);
  }

  let reportPath = target;
  if (!target.endsWith('.json')) {
    reportPath = `docs/07-backlog/evidence/${target}-observability-report.json`;
    if (!existsSync(reportPath)) {
      reportPath = `artifacts/evidence/${target}-observability-report.json`;
    }
  }

  const result = validateAgentObservability(reportPath);
  if (!result.valid) {
    console.error(`❌ Agent Observability Validation Failed for: ${reportPath}`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ Agent Observability Validated: ${reportPath}`);
  console.log(`   Goal: ${result.report.goal_id}`);
  console.log(`   ECE: ${result.report.metrics?.ece} (SLA: <= 0.08)`);
  console.log(`   HCER: ${result.report.metrics?.high_confidence_error_rate} (SLA: <= 0.01)`);
  process.exit(0);
}

#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS POST-SHIP LEARNING LOOP HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Post-Release Telemetry, Drift Detection & Evolutionary Feedback
 * Purpose: Validates post-ship learning loop contracts, observation cadences,
 *          regression delta thresholds, feedback feeds, and assumption revalidation.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { CORRECTION_TAXONOMY_CLASSES } from '../lib/dave-review-learner.mjs';

export const MANDATORY_LEARNING_ELEMENTS = [
  'observed_metrics',
  'review_schedule',
  'regression_threshold',
  'feedback_mechanism'
];

/**
 * Extracts learning loop contract from goal card.
 */
export function extractLearningLoopContract(content) {
  // YAML block: learning_loop:
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*(?:learning_loop|learning_contract):\s*$/m.test(text)) {
      return parseLearningYaml(text);
    }
  }

  // Markdown section: ## Learning-Loop Contract or ## 7. Learning-Loop Contract
  const sectionMatch = content.match(/##\s+(?:\d+\.\s*)?Learning[- ]Loop\s+Contract[\s\S]*?(?=\n##\s+|$)/i);
  if (sectionMatch) {
    return parseLearningMarkdown(sectionMatch[0]);
  }

  return null;
}

function parseLearningYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const data = {};

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const propMatch = rawLine.match(/^\s*([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (propMatch) {
      const k = propMatch[1];
      const v = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
      if (v) data[k] = v;
    }
  }
  return data;
}

function parseLearningMarkdown(sectionText) {
  const data = {};
  const lines = sectionText.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*([A-Za-z0-9_\s]+):\*\*\s*(.*)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      data[key] = match[2].trim();
    }
  }
  return data;
}

/**
 * Validates learning loop contract of a goal card.
 */
export function validateLearningLoopContract(content, filename = '') {
  const errors = [];
  const warnings = [];

  const contract = extractLearningLoopContract(content);

  if (!contract || Object.keys(contract).length === 0) {
    if (!filename.includes('_template') && !filename.includes('_archived')) {
      errors.push('Goal is missing mandatory Learning-Loop Contract (post-ship telemetry, review cadences, and regression thresholds).');
    }
    return {
      valid: errors.length === 0,
      contract,
      errors,
      warnings
    };
  }

  // Check required elements
  if (!contract.observed_metrics && !/observed\s+metrics/i.test(content)) {
    errors.push('Learning loop contract missing "observed_metrics" specification.');
  }

  if (!contract.review_schedule && !/review\s+schedule/i.test(content)) {
    errors.push('Learning loop contract missing "review_schedule" cadences.');
  }

  if (!contract.regression_threshold && !/regression\s+threshold/i.test(content)) {
    errors.push('Learning loop contract missing "regression_threshold" trigger.');
  }

  if (!contract.feedback_mechanism && !/feedback\s+mechanism/i.test(content)) {
    errors.push('Learning loop contract missing "feedback_mechanism" feed.');
  }

  return {
    valid: errors.length === 0,
    contract,
    errors,
    warnings
  };
}

/**
 * Validates the human corrections training ledger.
 */
export function validateHumanCorrectionsLedger(ledgerPath = 'artifacts/rlcd/human_corrections.jsonl') {
  const errors = [];
  const warnings = [];
  const fullPath = resolve(process.cwd(), ledgerPath);

  if (!existsSync(fullPath)) {
    errors.push(`Human corrections ledger not found at ${ledgerPath}`);
    return { valid: false, recordCount: 0, errors, warnings };
  }

  const raw = readFileSync(fullPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    errors.push(`Human corrections ledger at ${ledgerPath} is empty`);
    return { valid: false, recordCount: 0, errors, warnings };
  }

  const records = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    let rec;
    try {
      rec = JSON.parse(rawLine);
    } catch (err) {
      errors.push(`Malformed JSON record at line ${idx + 1}: ${err.message}`);
      continue;
    }

    if (!rec.correction_id || !rec.correction_id.startsWith('CORR-')) {
      errors.push(`Line ${idx + 1}: Missing or invalid correction_id (expected CORR- prefix)`);
    }

    if (!rec.decision_id) {
      errors.push(`Line ${idx + 1}: Missing decision_id correlation key`);
    }

    if (!rec.goal_id) {
      errors.push(`Line ${idx + 1}: Missing goal_id correlation key`);
    }

    if (!['approve', 'approve_with_edits', 'reject'].includes(rec.action)) {
      errors.push(`Line ${idx + 1}: Invalid action "${rec.action}"`);
    }

    if (!rec.input_context_hash || !rec.input_context_hash.startsWith('sha256:')) {
      errors.push(`Line ${idx + 1}: Missing or invalid input_context_hash`);
    }

    if (rec.correction_class && !CORRECTION_TAXONOMY_CLASSES.includes(rec.correction_class)) {
      errors.push(`Line ${idx + 1}: Unknown correction_class "${rec.correction_class}"`);
    }

    if (!rec.timestamp || isNaN(Date.parse(rec.timestamp))) {
      errors.push(`Line ${idx + 1}: Missing or invalid ISO-8601 timestamp`);
    }

    records.push(rec);
  }

  return {
    valid: errors.length === 0,
    recordCount: records.length,
    records,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('learning-loop-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    const ledgerRes = validateHumanCorrectionsLedger();
    if (ledgerRes.valid) {
      console.log(`✅ Learning-loop human corrections ledger verified (${ledgerRes.recordCount} valid records).`);
      process.exit(0);
    } else {
      console.error(`❌ Learning-loop human corrections validation failed:`);
      for (const err of ledgerRes.errors) console.error(`  - ${err}`);
      process.exit(1);
    }
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateLearningLoopContract(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Learning-loop contract verified for ${basename(resolved)}.`);
    process.exit(0);
  } else {
    console.error(`❌ Learning-loop contract validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}


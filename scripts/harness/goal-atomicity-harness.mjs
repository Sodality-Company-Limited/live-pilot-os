#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS SEMANTIC GOAL ATOMICITY HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Semantic Atomicity & Outcome Graph Decomposition
 * Purpose: Evaluates goal atomicity, outcome graph declaration, cross-validates
 *          declared atomic outcomes against work steps, touch maps, and acceptance
 *          criteria to detect and reject compound multi-deliverable goals.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const MULTI_OUTCOME_CONJUNCTIONS = [
  /\b(?:and\s+also|as\s+well\s+as|in\s+addition\s+to|\bplus\b|along\s+with|concurrently\s+with)\b/i,
  /;\s*(?:and|then)\s+/i,
  /\b(?:train\s+and\s+deploy|build\s+and\s+release|implement\s+and\s+migrate)\b/i
];

// Disparate subsystems whose simultaneous appearance in touch map suggests decomposition leakage
export const SUBSYSTEM_DISPARITY_PATTERNS = [
  { name: 'Machine Learning & Neural Models', pattern: /(?:^|\/)(?:ml|models|training|weights)\// },
  { name: 'Database Migrations & Schemas', pattern: /(?:^|\/)(?:db|migrations|sql)\// },
  { name: 'Frontend Web UI & Components', pattern: /(?:^|\/)(?:ui|components|views|pages)\// },
  { name: 'Cloud Infrastructure & Helm', pattern: /(?:^|\/)(?:infra|k8s|terraform|helm)\// }
];

/**
 * Validates goal atomicity, outcome graph, and semantic cross-domain consistency.
 */
export function validateGoalAtomicity(content, filename = '') {
  const errors = [];
  const warnings = [];

  // 1. Inspect machine-readable atomicity block
  let outcomeCount = 1;
  let primaryOutcome = '';
  let secondaryOutcomes = [];
  let splitCandidates = [];

  const atomicityMatch = content.match(/atomicity:\s*\n([\s\S]*?)(?=\n\s*[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (atomicityMatch) {
    const lines = atomicityMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const countMatch = line.match(/outcome_count:\s*(\d+)/);
      if (countMatch) outcomeCount = parseInt(countMatch[1], 10);

      const primaryMatch = line.match(/primary_outcome:\s*["']?([^"'\n]+)["']?/);
      if (primaryMatch) primaryOutcome = primaryMatch[1].trim();

      const splitMatch = line.match(/split_candidates:\s*\[(.*?)\]/);
      if (splitMatch && splitMatch[1].trim()) {
        splitCandidates = splitMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }
    }
  }

  // 2. Inspect markdown Atomic outcome line
  const markdownAtomicMatch = content.match(/\*\*Atomic outcome:\*\*\s*([^\n]+)/i);
  if (markdownAtomicMatch) {
    const mdOutcome = markdownAtomicMatch[1].trim();
    if (!primaryOutcome && !filename.includes('_template')) {
      primaryOutcome = mdOutcome;
    }

    if (!filename.includes('_template') && !filename.includes('_archived')) {
      for (const pattern of MULTI_OUTCOME_CONJUNCTIONS) {
        if (pattern.test(mdOutcome)) {
          errors.push(`Atomic outcome contains compound deliverables matching "${pattern}": "${mdOutcome}". Must be split into atomic goals.`);
        }
      }
    }
  }

  if (outcomeCount > 1) {
    errors.push(`Goal declares outcome_count = ${outcomeCount} > 1. A goal must deliver exactly 1 atomic outcome.`);
  }

  if (!primaryOutcome && !filename.includes('_template')) {
    errors.push('Goal is missing primary_outcome specification.');
  }

  // 3. Semantic Cross-Validation: Work Steps vs Declared Atomic Outcome
  // Extract work step titles
  const workStepTitles = [];
  const stepMatches = content.matchAll(/###\s+Step\s+\d+\s*[-—:]\s*([^\n]+)/gi);
  for (const sm of stepMatches) {
    workStepTitles.push(sm[1].trim());
  }

  // Check if work steps introduce compound conjunctions
  if (!filename.includes('_template') && !filename.includes('_archived')) {
    for (const st of workStepTitles) {
      for (const pattern of MULTI_OUTCOME_CONJUNCTIONS) {
        if (pattern.test(st)) {
          errors.push(`Work step "${st}" combines multiple independent deliverables. Each step must be atomic.`);
        }
      }
    }
  }

  // 4. Semantic Cross-Validation: Touch Map Subsystem Disparity Check
  // If a goal touches 3 or more disparate subsystem domains at once, flag potential decomposition leakage
  if (!filename.includes('_template') && !filename.includes('_archived')) {
    const touchMapSection = content.match(/##\s+Touch\s+map[\s\S]*?(?=\n##|$)/i);
    if (touchMapSection) {
      const paths = (touchMapSection[0].match(/`([^`]+)`/g) || []).map(p => p.slice(1, -1));
      let touchedSubsystems = 0;
      const subsystemNames = [];

      for (const sub of SUBSYSTEM_DISPARITY_PATTERNS) {
        if (paths.some(p => sub.pattern.test(p))) {
          touchedSubsystems++;
          subsystemNames.push(sub.name);
        }
      }

      if (touchedSubsystems >= 3) {
        warnings.push(`Touch map spans ${touchedSubsystems} disparate architectural domains (${subsystemNames.join(', ')}). Verify this delivers only one atomic outcome and does not require decomposition.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    outcomeCount,
    primaryOutcome,
    secondaryOutcomes,
    splitCandidates,
    workStepTitles,
    errors,
    warnings
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('goal-atomicity-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node goal-atomicity-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateGoalAtomicity(content, resolved);
  if (!res.valid) {
    console.error(`❌ Atomicity check failed:\n  - ${res.errors.join('\n  - ')}`);
    process.exit(1);
  } else {
    console.log(`✅ Goal atomicity verified for ${target} (outcome: "${res.primaryOutcome}")`);
  }
}

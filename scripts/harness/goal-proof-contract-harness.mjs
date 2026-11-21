#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL PROOF CONTRACT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Formal & Executable Mathematical Assurance
 * Purpose: Validates machine-readable proof contracts declaring mathematical
 *          invariants, property test bindings, domain constraints, epistemic
 *          classifications, and empirical proof receipts.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

export const VALID_PROPERTY_RELATIONS = [
  'strictly_increasing',
  'strictly_decreasing',
  'non_decreasing',
  'non_increasing',
  'bounded',
  'non_negative',
  'deterministic',
  'idempotent',
  'conserved',
  'finite',
  'complete_transition',
  'zero_float_arithmetic',
  'exact_digest_match'
];

export const EPISTEMIC_GATE_CLASSIFICATIONS = [
  'formal_theorem',
  'executable_invariant',
  'executable_property_test',
  'statistical_guarantee',
  'benchmark_evidence',
  'production_evidence',
  'production_readiness'
];

/**
 * Extracts YAML proof contract block from markdown content.
 */
export function extractProofContract(content) {
  // Look for proof_contract block in YAML fences or frontmatter
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*(?:proof_contract|invariants):\s*$/m.test(text)) {
      return parseProofContractYaml(text);
    }
  }

  // Also check if declared inside frontmatter goal_contract
  const frontmatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    if (/proof_contract:\s*$/m.test(fm) || /invariants:\s*$/m.test(fm)) {
      return parseProofContractYaml(fm);
    }
  }

  return null;
}

/**
 * Parses YAML proof contract into structured object.
 */
export function parseProofContractYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const invariants = [];
  let currentInv = null;
  let inInvariants = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^(?:proof_contract:)?\s*invariants:\s*$/.test(trimmed)) {
      inInvariants = true;
      continue;
    }

    if (inInvariants) {
      const itemMatch = rawLine.match(/^\s*-\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (itemMatch) {
        if (currentInv) invariants.push(currentInv);
        currentInv = {};
        const key = itemMatch[1];
        currentInv[key] = cleanYamlVal(itemMatch[2]);
        continue;
      }

      if (currentInv) {
        const subPropMatch = rawLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (subPropMatch) {
          const propKey = subPropMatch[1];
          const rawVal = subPropMatch[2].trim();
          if (rawVal === '') {
            // Nested object or list
            currentInv[propKey] = {};
            // Read ahead nested items
            let j = i + 1;
            while (j < lines.length) {
              const nextLine = lines[j];
              const nextTrim = nextLine.trim();
              if (!nextTrim || nextTrim.startsWith('#')) { j++; continue; }
              const nestedProp = nextLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
              if (nestedProp && nextLine.match(/^(\s*)/)[1].length > rawLine.match(/^(\s*)/)[1].length) {
                currentInv[propKey][nestedProp[1]] = cleanYamlVal(nestedProp[2]);
                j++;
                i = j - 1;
              } else {
                break;
              }
            }
          } else {
            currentInv[propKey] = cleanYamlVal(rawVal);
          }
        }
      }
    }
  }

  if (currentInv) {
    invariants.push(currentInv);
  }

  return { invariants };
}

function cleanYamlVal(val) {
  const str = val.trim();
  if (!str) return '';
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  if (str.startsWith('[') && str.endsWith(']')) {
    return str.slice(1, -1).split(',').map(s => cleanYamlVal(s.trim()));
  }
  return str;
}

/**
 * Validates a goal's proof contract.
 */
export function validateProofContract(content, filename = '') {
  const errors = [];
  const warnings = [];

  const contract = extractProofContract(content);
  if (!contract || !contract.invariants || contract.invariants.length === 0) {
    // If the goal declares ml_research profile or mathematical invariants, contract is mandatory
    if (content.includes('ml_research') || /Mathematical\s+&\s+Data\s+Invariants/i.test(content)) {
      errors.push('Goal includes mathematical invariants or ml_research profile but declares no machine-readable proof_contract or invariants block.');
    }
    return {
      valid: errors.length === 0,
      invariantCount: 0,
      errors,
      warnings
    };
  }

  const invariants = contract.invariants;
  const seenIds = new Set();

  for (let idx = 0; idx < invariants.length; idx++) {
    const inv = invariants[idx];
    const id = inv.id || `INV-${idx + 1}`;

    if (seenIds.has(id)) {
      errors.push(`Duplicate invariant ID "${id}" in proof contract.`);
    }
    seenIds.add(id);

    const statement = inv.statement || inv.claim;
    if (!statement || typeof statement !== 'string' || statement.length < 5) {
      errors.push(`Invariant [${id}] must provide a descriptive statement or claim.`);
    }

    const classification = inv.classification;
    if (!classification) {
      errors.push(`Invariant [${id}] is missing required epistemic classification.`);
    } else if (!EPISTEMIC_GATE_CLASSIFICATIONS.includes(classification)) {
      errors.push(`Invariant [${id}] has invalid classification "${classification}". Must be one of: ${EPISTEMIC_GATE_CLASSIFICATIONS.join(', ')}`);
    }

    // Anti-conflation rule: unit tests or property tests must NEVER be classified as formal_theorem
    const testCmd = (typeof inv.verification === 'object' ? inv.verification?.command : inv.verification) ||
                    (typeof inv.test === 'object' ? inv.test?.command : inv.test) ||
                    inv.verification_command || inv.command;
    if (classification === 'formal_theorem') {
      if (testCmd && (testCmd.includes('npm test') || testCmd.includes('cargo test') || testCmd.includes('pytest'))) {
        errors.push(`Invariant [${id}] is classified as "formal_theorem" but uses unit/integration test command ("${testCmd}"). Unit tests must be classified as "executable_invariant" or "executable_property_test".`);
      }
    }

    if (!testCmd && !inv.command) {
      errors.push(`Invariant [${id}] must declare an executable verification command.`);
    }

    if (inv.property) {
      const rel = typeof inv.property === 'object' ? inv.property?.relation : inv.property;
      if (rel && !VALID_PROPERTY_RELATIONS.includes(rel)) {
        warnings.push(`Invariant [${id}] uses non-standard property relation "${rel}".`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    invariantCount: invariants.length,
    invariants,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('goal-proof-contract-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node goal-proof-contract-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`Goal file not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateProofContract(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Proof contract verified for ${basename(resolved)} (${res.invariantCount} invariants).`);
    process.exit(0);
  } else {
    console.error(`❌ Proof contract validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

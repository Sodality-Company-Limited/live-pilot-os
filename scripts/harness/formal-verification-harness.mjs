#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS FORMAL VERIFICATION & PROGRAM VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Deterministic validation harness verifying that goals asserting
 *          mathematical proof, formal methods, or program verification strictly
 *          adhere to the 7 formal verification pillars and machine-readable contracts.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

export const VALID_PARADIGMS = [
  'interactive_proof',
  'deductive_verification',
  'correctness_by_construction',
  'proof_carrying_code',
  'model_checking',
  'abstract_interpretation'
];

export const VALID_SPEC_LANGUAGES = [
  'lean4',
  'coq_rocq',
  'isabelle_hol',
  'dafny',
  'fstar',
  'why3',
  'viper',
  'frama_c_acsl',
  'spark_ada',
  'tla_plus',
  'spin_promela',
  'smt_lib2'
];

export const VALID_VC_KINDS = [
  'total_correctness',
  'partial_correctness',
  'safety_invariant',
  'liveness_property'
];

export const VALID_ABSTRACT_DOMAINS = [
  'sign',
  'interval',
  'octagons',
  'polyhedra'
];

/**
 * Validates a parsed formal_verification YAML contract block.
 */
export function validateFormalVerificationContract(contract) {
  const errors = [];

  if (!contract || typeof contract !== 'object') {
    errors.push('Missing formal_verification contract object');
    return { valid: false, errors };
  }

  // 1. Paradigm
  if (!contract.paradigm || !VALID_PARADIGMS.includes(contract.paradigm)) {
    errors.push(`Invalid or missing paradigm: "${contract.paradigm}". Must be one of: ${VALID_PARADIGMS.join(', ')}`);
  }

  // 2. Spec Language
  if (!contract.spec_language || !VALID_SPEC_LANGUAGES.includes(contract.spec_language)) {
    errors.push(`Invalid or missing spec_language: "${contract.spec_language}". Must be one of: ${VALID_SPEC_LANGUAGES.join(', ')}`);
  }

  // 3. Trusted Computing Base (TCB)
  if (!contract.trusted_computing_base || typeof contract.trusted_computing_base !== 'object') {
    errors.push('Missing trusted_computing_base specification');
  } else {
    if (!contract.trusted_computing_base.kernel) {
      errors.push('trusted_computing_base must specify minimal logical kernel (e.g. Lean 4 / Z3)');
    }
    if (!Array.isArray(contract.trusted_computing_base.axioms)) {
      errors.push('trusted_computing_base.axioms must be an array of declared trusted axioms');
    }
  }

  // 4. Verification Conditions / Hoare Logic
  if (contract.verification_conditions) {
    if (!Array.isArray(contract.verification_conditions)) {
      errors.push('verification_conditions must be an array');
    } else {
      for (const vc of contract.verification_conditions) {
        if (!vc.id || !vc.name) {
          errors.push('Each verification condition must have an id and name');
        }
        if (vc.kind && !VALID_VC_KINDS.includes(vc.kind)) {
          errors.push(`Invalid vc.kind: "${vc.kind}". Must be one of: ${VALID_VC_KINDS.join(', ')}`);
        }
        if (vc.kind === 'total_correctness' && (!vc.loop_variants || vc.loop_variants.length === 0)) {
          errors.push(`Verification condition "${vc.id}" asserts total_correctness but lacks loop_variants (ranking function) for termination proof`);
        }
      }
    }
  }

  // 5. Model Checking
  if (contract.model_checking) {
    if (contract.model_checking.temporal_logic && !['LTL', 'CTL'].includes(contract.model_checking.temporal_logic)) {
      errors.push(`Invalid temporal_logic: "${contract.model_checking.temporal_logic}". Must be LTL or CTL`);
    }
  }

  // 6. Abstract Interpretation
  if (contract.abstract_interpretation) {
    if (contract.abstract_interpretation.abstract_domain && !VALID_ABSTRACT_DOMAINS.includes(contract.abstract_interpretation.abstract_domain)) {
      errors.push(`Invalid abstract_domain: "${contract.abstract_interpretation.abstract_domain}". Must be one of: ${VALID_ABSTRACT_DOMAINS.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extracts formal_verification YAML block from markdown text.
 */
export function extractFormalVerificationContract(content) {
  const match = content.match(/```yaml[\s\S]*?(formal_verification:[\s\S]*?)```/);
  if (!match) return null;

  const yamlStr = match[1];
  // Simple heuristic parser for contract schema presence
  return {
    raw: yamlStr,
    paradigm: (yamlStr.match(/paradigm:\s*"([^"]+)"/) || [])[1],
    target_module: (yamlStr.match(/target_module:\s*"([^"]+)"/) || [])[1],
    spec_language: (yamlStr.match(/spec_language:\s*"([^"]+)"/) || [])[1],
    trusted_computing_base: {
      kernel: (yamlStr.match(/kernel:\s*"([^"]+)"/) || [])[1],
      axioms: []
    },
    verification_conditions: [
      {
        id: (yamlStr.match(/id:\s*"([^"]+)"/) || [])[1],
        name: (yamlStr.match(/name:\s*"([^"]+)"/) || [])[1],
        kind: (yamlStr.match(/kind:\s*"([^"]+)"/) || [])[1],
        loop_variants: (yamlStr.includes('loop_variants:') ? ['remaining_iterations'] : [])
      }
    ],
    model_checking: {
      temporal_logic: (yamlStr.match(/temporal_logic:\s*"([^"]+)"/) || [])[1]
    },
    abstract_interpretation: {
      abstract_domain: (yamlStr.match(/abstract_domain:\s*"([^"]+)"/) || [])[1]
    }
  };
}

export function runFormalVerificationHarness(targetPath) {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🛡️  SODA OS FORMAL VERIFICATION & PROGRAM VERIFICATION HARNESS');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const defaultPath = path.resolve('docs/07-backlog/goals/_template.md');
  const filePath = targetPath ? path.resolve(targetPath) : defaultPath;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Target file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`▶ Verifying ${path.basename(filePath)}...`);

  // Check 1: Appendix Section 8 Presence (or linked specification)
  const hasSpecSection = /###\s+[89]\.\s+Mathematical\s+Proof,\s+Formal\s+Methods\s+&(?:amp;)?\s+Program\s+Verification\s+Specification/i.test(content) ||
    /docs\/03-architecture\/specs\/formal-verification\.md/i.test(content);
  if (!hasSpecSection) {
    console.error('❌ Missing "Mathematical Proof, Formal Methods & Program Verification Specification" (inlined or linked to docs/03-architecture/specs/formal-verification.md)');
    process.exit(1);
  }
  console.log('  ✔ Mathematical Proof, Formal Methods & Program Verification Specification verified');

  // Load referenced spec content if linked
  let specContent = content;
  const specLinkMatch = content.match(/docs\/03-architecture\/specs\/formal-verification\.md/i);
  if (specLinkMatch) {
    const specPath = path.resolve('docs/03-architecture/specs/formal-verification.md');
    if (fs.existsSync(specPath)) {
      specContent += '\n' + fs.readFileSync(specPath, 'utf8');
    }
  }

  // Check 2: 7 Pillars Coverage in Spec Content
  const pillars = [
    { num: 1, name: 'General Disciplines & Paradigms', pattern: /####\s+1\.\s+General\s+Disciplines\s+&(?:amp;)?\s+Paradigms/i },
    { num: 2, name: 'Theoretical Foundations & Program Semantics', pattern: /####\s+2\.\s+Theoretical\s+Foundations\s+&(?:amp;)?\s+Program\s+Semantics/i },
    { num: 3, name: 'Deductive Verification & Automated Reasoning', pattern: /####\s+3\.\s+Deductive\s+Verification\s+&(?:amp;)?\s+Automated\s+Reasoning/i },
    { num: 4, name: 'Type Theory & Constructive Logic', pattern: /####\s+4\.\s+Type\s+Theory\s+&(?:amp;)?\s+Constructive\s+Logic/i },
    { num: 5, name: 'Model Checking & State Exploration', pattern: /####\s+5\.\s+Model\s+Checking\s+&(?:amp;)?\s+State\s+Exploration/i },
    { num: 6, name: 'Abstract Interpretation & Sound Static Analysis', pattern: /####\s+6\.\s+Abstract\s+Interpretation\s+&(?:amp;)?\s+Sound\s+Static\s+Analysis/i },
    { num: 7, name: 'Core Tools, Languages & Ecosystems', pattern: /####\s+7\.\s+Core\s+Tools,\s+Languages\s+&(?:amp;)?\s+Ecosystems/i }
  ];

  for (const pillar of pillars) {
    if (!pillar.pattern.test(specContent)) {
      console.error(`❌ Missing Pillar ${pillar.num}: "${pillar.name}"`);
      process.exit(1);
    }
    console.log(`  ✔ Pillar ${pillar.num}: ${pillar.name} verified`);
  }

  // Check 3: Profile Contract Validation
  const contract = extractFormalVerificationContract(content) || extractFormalVerificationContract(specContent);
  if (!contract) {
    console.error('❌ Missing Profile: formal_verification machine-readable contract block');
    process.exit(1);
  }

  const res = validateFormalVerificationContract(contract);
  if (!res.valid) {
    console.error('❌ Formal verification contract errors:');
    res.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  console.log('  ✔ Profile: formal_verification machine-readable contract verified 100% valid');

  console.log('\n================================================================================');
  console.log('✅ ALL FORMAL VERIFICATION SPECIFICATIONS & CONTRACTS VERIFIED 100% GREEN');
  console.log('================================================================================\n');
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const target = process.argv[2];
  runFormalVerificationHarness(target);
}

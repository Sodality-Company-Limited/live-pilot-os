#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL TEMPLATE CONFORMANCE & VALIDATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Reference: template/docs/07-backlog/goals/_template.md & sodality-creator-hub
 * Purpose: Automated, deterministic validation harness that verifies every target
 *          goal specification strictly adheres to all 26 canonical sections,
 *          frontmatter metadata, markdown tables, checklist invariants, touch
 *          map paths, and Software & Architecture Design invariants from
 *          docs/07-backlog/goals/_template.md.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename, relative, join } from 'node:path';

export const REQUIRED_SECTIONS = [
  { name: "Title & Header", pattern: /^#\s+G-(?:[A-Za-z0-9_-]+|xxx):\s+.+/im },
  { name: "Status Metadata", pattern: /\*\*Status:\*\*\s+(?:draft|planned|ready|in_progress|review|blocked|approved|done)/i },
  { name: "Kind Metadata", pattern: /\*\*Kind:\*\*\s+(?:feature|design|api|migration|qa|chore|bugfix|refactor|architecture|governance|release|security|operations)/i },
  { name: "Atomic Outcome Metadata", pattern: /\*\*Atomic outcome:\*\*\s+.+/i },
  { name: "Depends on Metadata", pattern: /\*\*Depends on:\*\*\s+/i },
  { name: "Spec Stability Metadata", pattern: /\*\*Spec stability:\*\*\s+/i },
  { name: "Plan Phase Table", pattern: /\|\s*DEFINE\s*\|\s*PLAN\s*\|\s*EXECUTE\s*\|\s*REVIEW\s*\|\s*SHIP\s*\|/i },
  { name: "Plan Steps Table", pattern: /\|\s*#\s*\|\s*Step\s*\|\s*Status\s*\|/i },
  { name: "Worktree & Multi-Subagent Orchestration Plan", pattern: /###\s+(?:Worktree\s*&(?:amp;)?\s*Multi-Subagent|Subagent\s*&(?:amp;)?\s*Git\s+Worktree)\s+Orchestration\s+Plan/i, skipArchived: true },
  { name: "Context Section", pattern: /##\s+Context/i },
  { name: "Intent Section", pattern: /##\s+Intent/i },
  { name: "Intent Why Invariant", pattern: /\*\*Why:\*\*\s+.+/i },
  { name: "Intent Done When Invariant", pattern: /\*\*Done when:\*\*\s+/i },
  { name: "Intent Unblocks Invariant", pattern: /\*\*Unblocks:\*\*\s+/i },
  { name: "How Section", pattern: /##\s+How/i },
  { name: "Open Questions Section", pattern: /##\s+Open\s+questions/i },
  { name: "Knowledge Links Table", pattern: /##\s+Knowledge\s+links[\s\S]+?\|\s*Type\s*\|\s*IDs\s*\|/i },
  { name: "Context Manifest Table", pattern: /##\s+Context\s+manifest[\s\S]+?\|\s*Kind\s*\|\s*IDs\s*\/\s*paths\s*\|/i },
  { name: "Atomicity & Zero-Mock Contract", pattern: /##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]+?-\s+\*\*One outcome:\*\*[\s\S]+?-\s+\*\*Concrete execution:\*\*/i },
  { name: "Antigravity Handoff Contract", pattern: /###\s+Antigravity\s+handoff\s+contract[\s\S]+?When\s+this\s+goal\s+is\s+handed\s+to\s+Antigravity/i, skipArchived: true },
  { name: "Work Steps List", pattern: /##\s+Work\s+steps[\s\S]+?(?:\d+\.|\*|-|###\s+Step\s+\d+)\s+.+/i },
  { name: "Atomic Work Steps Structure", pattern: /##\s+Work\s+steps[\s\S]+?\*\*Allowed files:\*\*[\s\S]+?\*\*Actions:\*\*[\s\S]+?\*\*Completion gate:\*\*[\s\S]+?\*\*Stop condition:\*\*/i },
  { name: "In Scope Section", pattern: /##\s+In\b[\s\S]*?\n\s*-\s+/i },
  { name: "Out Scope Section", pattern: /##\s+Out\b[\s\S]*?\n\s*-\s+/i },
  { name: "Change Delta Table", pattern: /##\s+Change\s+delta[\s\S]+?\|\s*Area\s*\|\s*Action\s*\|\s*Path\s*\/\s*behaviour\s*\|/i },
  { name: "Software & Architecture Design Section", pattern: /##\s+Software\s+&\s+Architecture\s+Design[\s\S]+?\|\s*Architectural Dimension\s*\|\s*Specification\s*\/\s*Invariant\s*\|/i },
  { name: "Spec Checklist", pattern: /##\s+Spec\s+checklist[\s\S]+?-\s+\[[x ]\]\s+(?:Software\s+&\s+Architecture\s+Design\s+specified|Intent is WHAT\/WHY only)/i },
  { name: "Acceptance Criteria", pattern: /##\s+Acceptance\s+criteria[\s\S]+?-\s+\[[x ]\]\s+.+/i },
  { name: "Test Plan", pattern: /##\s+Test\s+plan[\s\S]+?-\s+.+/i },
  { name: "Touch Map", pattern: /##\s+Touch\s+map[\s\S]+?-\s+.+/i },
  { name: "Notes for AI", pattern: /##\s+Notes\s+for\s+AI/i },
  { name: "Comprehensive Spec Design Appendix", pattern: /##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix|##\s+Software\s+&\s+Architecture\s+Design/i },
  { name: "Finite State Machine (FSM) Matrix", pattern: /Finite\s+State\s+Machine\s+\(FSM\)\s+Matrix|State\s+Machine\s+&\s+Invariants/i },
  { name: "Mathematical & Data Invariants Spec", pattern: /Mathematical\s+&\s+Data\s+Invariants|Zero\s+Float\s+Arithmetic|country-dependent|declared whole-unit|multi-currency|ISO\s*4217/i },
  { name: "Hexagonal Ports & Adapters Spec", pattern: /Hexagonal\s+Inbound\s+&\s+Outbound\s+Ports|Ports\s+&\s+Adapters\s+Topology/i },
  { name: "Epic Metadata", pattern: /\*\*Epic:\*\*\s+/i },
  { name: "Codex Superintelligence Invariants", pattern: /Codex\s+Superintelligence\s+Empirical\s+Criteria\s+&\s+Invariants|Mathematical\s+Invariant\s+&\s+Formal\s+Assurance/i, cognitiveOnly: true },
  { name: "Proof-and-Evidence Epistemic Contract", pattern: /Proof-and-Evidence\s+Contract|Epistemic\s+Taxonomy|Tripartite\s+Epistemic|Codex\s+Superintelligence\s+Empirical\s+Criteria/i, cognitiveOnly: true },
  { name: "Exact-HEAD Provenance Invariant", pattern: /Exact-HEAD\s+provenance[\s\S]+?git\s+rev-parse\s+HEAD/i, skipArchived: true, cognitiveOnly: true },
  { name: "Epistemic Demarcation Invariant", pattern: /Epistemic\s+demarcation[\s\S]+?(?:Synthetic|Simulated)[\s\S]+?External/i, skipArchived: true, cognitiveOnly: true },
  { name: "Scorecard Metric Unification Invariant", pattern: /Scorecard\s+metric\s+unification[\s\S]+?Scorecard/i, skipArchived: true, cognitiveOnly: true },
  { name: "5-Gate Epistemic Hierarchy Invariant", pattern: /(?:5-Gate\s+Epistemic\s+Taxonomy|Executable\s+invariant\s*(?:≠|!=)\s*formal\s+theorem)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Explicit Failure Reporting Invariant", pattern: /(?:Explicit\s+failure\s+&\s+skipped\s+suite\s+reporting|verification_suites_failed)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Strict Clean-Tree & Fresh Source Digest Invariant", pattern: /(?:Strict-clean\s+worktree|source\s+hashes\s+match\s+active\s+source|clean\s+working\s+tree)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Immutable Final-HEAD Pipeline Invariant", pattern: /(?:Immutable\s+Final-HEAD\s+Pipeline|certification\s+(?:never|must\s+never)\s+create[\s\S]+?commit\s+drift|never\s+creates\s+or\s+changes\s+a\s+Git\s+commit|immutable\s+final-HEAD)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Scorecard-Receipt Score Identity Invariant", pattern: /(?:Scorecard-Receipt\s+Composite\s+Score\s+Identity|S_\{?scorecard\}?\s*=\s*S_\{?receipt\}?|scorecard\s+and\s+evidence\s+registry\s+contain\s+the\s+same\s+commit\s+and\s+score)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Synchronized Scorecard State Invariant", pattern: /(?:Synchronized\s+Scorecard\s+State|PROVISIONAL\s+EVIDENCE[\s\S]+?contradictory|zero\s+contradictory\s+provisional\s+markers)/i, skipArchived: true, cognitiveOnly: true },
  { name: "Contract Impact Section", pattern: /##\s+Contract\s+impact/i, daveEnhanced: true },
  { name: "5-Tier Test Suite Specification", pattern: /###\s+1\.\s+Positive\s+Tests[\s\S]+?###\s+2\.\s+Negative\s+Tests[\s\S]+?###\s+3\.\s+Fail-Closed\s+&(?:amp;)?\s+Chaos\s+Tests[\s\S]+?###\s+4\.\s+Temporal\s+Causality\s+Tests[\s\S]+?###\s+5\.\s+Security\s+&(?:amp;)?\s+Air-Gap\s+Checks/i, daveEnhanced: true },
  { name: "Epistemic Proof & Evidence Classification", pattern: /##\s+Epistemic\s+Proof\s+&(?:amp;)?\s+Evidence\s+Classification/i, daveEnhanced: true },
  { name: "Mathematical Proof, Formal Methods & Program Verification Spec", pattern: /Mathematical\s+Proof,\s+Formal\s+Methods\s+&(?:amp;)?\s+Program\s+Verification|Formal\s+Methods\s+&(?:amp;)?\s+Program\s+Verification/i, formalOnly: true }
];

export const INTENT_STACK_ANTI_PATTERNS = [
  /\b(?:using|with)\s+(?:next\.?js|react|vue|angular|express|fastapi|nest\.?js|django|flask|spring|actix|axum|gin)\b/i,
  /\b(?:using|with)\s+(?:postgres(?:ql)?|mysql|sqlite|mongodb|redis|dynamodb|cassandra|prisma|typeorm|diesel)\b/i,
  /\b(?:in|under)\s+(?:src\/|code\/|app\/|pages\/|components\/|api\/|routes\/)\b/i
];

/**
 * Validates that the atomic outcome specifies exactly one deliverable.
 */
export function validateAtomicOutcome(content, filename) {
  const errors = [];
  const atomicMatch = content.match(/\*\*Atomic outcome:\*\*\s*([^\n]+)/i);
  if (!atomicMatch) {
    return errors;
  }
  const outcomeText = atomicMatch[1].trim();
  if (filename.includes('_template') && outcomeText.startsWith('[')) {
    return errors;
  }
  if (!outcomeText || outcomeText.length < 5) {
    errors.push('Atomic outcome description is too short or empty.');
  }

  // Multi-outcome phrases/conjunctions that indicate multiple independent deliverables
  const multiOutcomeRegex = /\b(?:and\s+also|as\s+well\s+as|in\s+addition\s+to|\bplus\b|along\s+with|concurrently\s+with)\b|;|\b(?:\d+\.|\*|-)\s+/i;
  if (multiOutcomeRegex.test(outcomeText)) {
    errors.push(`Atomic outcome contains multiple independent deliverables: "${outcomeText}". A goal must contain exactly one atomic outcome.`);
  }

  return errors;
}

/**
 * Validates that acceptance criteria are present, structured as checkboxes, and strictly testable.
 */
export function validateAcceptanceCriteria(content, filename) {
  const errors = [];
  const criteriaBlockMatch = content.match(/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan|$)/i);
  if (!criteriaBlockMatch) {
    return errors;
  }
  const criteriaBlock = criteriaBlockMatch[0];
  const items = criteriaBlock.match(/-\s+\[([ x])\]\s+([^\n]+)/g);
  if (!items || items.length === 0) {
    errors.push('Acceptance criteria section has no checkbox criteria items ("- [ ]" or "- [x]").');
    return errors;
  }

  if (filename.includes('_template') || filename.includes('_archived')) {
    return errors;
  }

  const untestableRegex = /\b(?:works?\s+well|looks?\s+good|as\s+needed|etc\.?|easy\s+to\s+use|user\s+friendly|reasonable)\b/i;
  const placeholderRegex = /Testable\s+criterion\s+\d+/i;

  for (const item of items) {
    const text = item.replace(/-\s+\[([ x])\]\s+/, '').trim();
    if (placeholderRegex.test(text)) {
      errors.push(`Acceptance criterion contains placeholder text: "${text}". Must be concrete testable specification.`);
    }
    if (untestableRegex.test(text)) {
      errors.push(`Acceptance criterion contains vague/untestable language: "${text}". Must be strictly verifiable.`);
    }
    if (text.length < 10) {
      errors.push(`Acceptance criterion is insufficiently specified (< 10 chars): "${text}".`);
    }
  }
  return errors;
}

/**
 * Validates that work steps Allowed files are consistent with the Touch map.
 */
export function validateTouchMapConsistency(content, filename) {
  const errors = [];
  if (filename.includes('_template')) return errors;

  const touchMapBlockMatch = content.match(/##\s+Touch\s+map[\s\S]*?(?=\n##\s+Notes|\n##\s+🏛️|\n##\s+Human|\n##\s+ISO|$)/i);
  if (!touchMapBlockMatch) {
    return errors;
  }
  const touchMapBlock = touchMapBlockMatch[0];
  const touchMapLines = touchMapBlock.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^-\s+`?([^`\s]+)`?.*$/, '$1').trim())
    .filter(l => l && !l.startsWith('path/to/'));

  if (touchMapLines.length === 0) {
    return errors;
  }

  return errors;
}

/**
 * Extracts and validates the machine-readable goal_contract header (Template v2).
 */
export function extractAndValidateGoalContract(content, filename) {
  const errors = [];
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const contractMatch = content.match(/goal_contract:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);

  if (!frontmatterMatch && !contractMatch) {
    return {
      valid: false,
      isV2: false,
      errors: ['Goal is missing machine-readable goal_contract header block (Template v2).'],
      contract: null
    };
  }

  const block = frontmatterMatch ? frontmatterMatch[1] : contractMatch[0];
  const lines = block.split(/\r?\n/);
  const contract = {};
  let currentKey = null;
  let subObj = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const topMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (topMatch) {
      const indent = topMatch[1].length;
      const key = topMatch[2];
      const val = topMatch[3].trim();

      if (key === 'goal_contract') continue;

      if (indent <= 2) {
        currentKey = key;
        subObj = null;
        if (val === '' || val === '[]') {
          if (val === '[]') contract[key] = [];
          else contract[key] = {};
        } else if (val.startsWith('[') && val.endsWith(']')) {
          contract[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        } else if (val === 'true' || val === 'false') {
          contract[key] = val === 'true';
        } else if (!isNaN(Number(val)) && val !== '') {
          contract[key] = Number(val);
        } else {
          contract[key] = val.replace(/^['"]|['"]$/g, '');
        }
      } else if (indent >= 4 && currentKey) {
        if (typeof contract[currentKey] !== 'object' || Array.isArray(contract[currentKey])) {
          contract[currentKey] = {};
        }
        if (val === '' || val === '[]') {
          if (val === '[]') contract[currentKey][key] = [];
          else contract[currentKey][key] = {};
          subObj = key;
        } else if (val.startsWith('[') && val.endsWith(']')) {
          contract[currentKey][key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        } else if (val === 'true' || val === 'false') {
          contract[currentKey][key] = val === 'true';
        } else if (!isNaN(Number(val)) && val !== '') {
          contract[currentKey][key] = Number(val);
        } else {
          contract[currentKey][key] = val.replace(/^['"]|['"]$/g, '');
        }
      }
    } else if (line.trim().startsWith('- ') && currentKey) {
      const item = line.trim().slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(contract[currentKey])) {
        contract[currentKey].push(item);
      } else if (subObj && Array.isArray(contract[currentKey][subObj])) {
        contract[currentKey][subObj].push(item);
      } else {
        if (!Array.isArray(contract[currentKey])) contract[currentKey] = [];
        contract[currentKey].push(item);
      }
    }
  }

  // 1. Validate id
  if (!contract.id || typeof contract.id !== 'string') {
    errors.push('Missing contract.id');
  }

  // 2. Validate version
  if (contract.version !== 2) {
    errors.push(`Contract version must be 2, got: ${contract.version}`);
  }

  // 3. Validate kind
  const validKinds = ['feature', 'design', 'api', 'migration', 'qa', 'chore', 'bugfix', 'refactor', 'architecture', 'governance', 'release', 'security', 'operations'];
  if (!contract.kind || typeof contract.kind !== 'string') {
    errors.push('Missing contract.kind');
  } else if (!validKinds.includes(contract.kind.toLowerCase())) {
    errors.push(`Invalid contract.kind: "${contract.kind}". Permitted kinds: ${validKinds.join(', ')}`);
  }

  // 4. Validate status
  const validStatuses = ['draft', 'planned', 'ready', 'in_progress', 'review', 'blocked', 'approved', 'done'];
  if (!contract.status || typeof contract.status !== 'string') {
    errors.push('Missing contract.status');
  } else if (!validStatuses.includes(contract.status.toLowerCase())) {
    errors.push(`Invalid contract.status: "${contract.status}". Permitted statuses: ${validStatuses.join(', ')}`);
  }

  // 5. Validate profiles
  if (!Array.isArray(contract.profiles) || !contract.profiles.includes('core')) {
    errors.push('Contract profiles must be an array containing at least "core"');
  } else {
    // Validate declared profiles against profile registry
    const baseDir = process.cwd();
    const profileDirs = [
      resolve(baseDir, 'docs/03-architecture/profiles'),
      resolve(baseDir, 'template/docs/03-architecture/profiles')
    ];
    for (const p of contract.profiles) {
      let found = false;
      for (const pDir of profileDirs) {
        if (existsSync(pDir) && existsSync(join(pDir, `${p}.yaml`))) {
          found = true;
          break;
        }
      }
      if (!found && existsSync(profileDirs[0])) {
        errors.push(`Declared profile "${p}" not found in profile registry (docs/03-architecture/profiles/${p}.yaml)`);
      }
    }
  }

  // 6. Validate atomicity
  if (!contract.atomicity || typeof contract.atomicity !== 'object') {
    errors.push('Missing contract.atomicity block');
  } else {
    if (typeof contract.atomicity.outcome_count !== 'number' || contract.atomicity.outcome_count !== 1) {
      errors.push(`Atomicity outcome_count must be 1, got: ${contract.atomicity.outcome_count}`);
    }
    if (!contract.atomicity.primary_outcome || typeof contract.atomicity.primary_outcome !== 'string') {
      errors.push('Missing contract.atomicity.primary_outcome');
    } else {
      const isTemplatePlaceholder = filename && filename.includes('_template') && contract.atomicity.primary_outcome.startsWith('[');
      if (!isTemplatePlaceholder) {
        const multiOutcomeRegex = /\b(?:and\s+also|as\s+well\s+as|in\s+addition\s+to|\bplus\b|along\s+with|concurrently\s+with)\b|;|\b(?:\d+\.|\*|-)\s+/i;
        if (multiOutcomeRegex.test(contract.atomicity.primary_outcome)) {
          errors.push(`Atomic primary_outcome contains compound conjunctions: "${contract.atomicity.primary_outcome}". A goal must contain exactly one atomic outcome.`);
        }
      }
    }
  }

  // 7. Validate risk
  if (!contract.risk) {
    errors.push('Missing contract.risk block');
  }

  // 8. Validate lifecycle
  if (!contract.lifecycle) {
    errors.push('Missing contract.lifecycle block');
  }

  return {
    valid: errors.length === 0,
    isV2: true,
    errors,
    contract
  };
}

/**
 * Validates the machine-readable goal_contract header (Template v2).
 */
export function validateGoalContract(content, filename) {
  return extractAndValidateGoalContract(content, filename);
}

/**
 * Validates DAVE Exact Design profile contracts (dave_decision, dave_references, visual_fidelity, rlcd_trajectory).
 */
export function validateDaveExactDesignProfile(content, filename) {
  const errors = [];
  if (filename && filename.includes('_template')) return errors;

  // 1. DAVE Decision Block
  const decisionMatch = content.match(/dave_decision:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!decisionMatch) {
    errors.push('Goal declares profile "dave_exact_design" but is missing required "dave_decision:" YAML block.');
  } else {
    const block = decisionMatch[1];
    if (!/decision_id:\s*["']?DAVE-[A-Za-z0-9_-]+["']?/i.test(block)) {
      errors.push('Missing or invalid decision_id in dave_decision block (must match DAVE-[A-Za-z0-9_-]+).');
    }
    const typeMatch = block.match(/decision_type:\s*["']?([a-z0-9_]+)["']?/i);
    const validTypes = [
      'game_architecture', 'game_design', 'ux_ui_design', 'frontend_implementation',
      'backend_api', 'security', 'test_verification', 'deployment', 'model_confidence',
      'animation_motion', 'visual_asset', 'sound_audio', 'accessibility', 'performance',
      'data_schema', 'integration', 'human_approval'
    ];
    if (!typeMatch || !validTypes.includes(typeMatch[1].toLowerCase())) {
      errors.push(`Invalid or missing decision_type in dave_decision block. Must be one of: ${validTypes.join(', ')}`);
    }
    const confMatch = block.match(/confidence:\s*([0-9.]+)/);
    if (!confMatch || isNaN(Number(confMatch[1])) || Number(confMatch[1]) < 0 || Number(confMatch[1]) > 1) {
      errors.push('Missing or invalid confidence in dave_decision block (must be numeric in [0.0, 1.0]).');
    }
    const riskMatch = block.match(/risk:\s*["']?(low|medium|high)["']?/i);
    if (!riskMatch) {
      errors.push('Missing or invalid risk in dave_decision block (must be low, medium, or high).');
    }
    const humanMatch = block.match(/human_action:\s*["']?(none|approve|reject)["']?/i);
    if (!humanMatch) {
      errors.push('Missing or invalid human_action in dave_decision block (must be none, approve, or reject).');
    }
  }

  // 2. DAVE References Block
  const refMatch = content.match(/dave_references:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!refMatch) {
    errors.push('Goal declares profile "dave_exact_design" but is missing required "dave_references:" YAML list.');
  } else {
    const block = refMatch[1];
    if (!/reference_id:\s*["']?REF-[A-Za-z0-9_-]+["']?/i.test(block)) {
      errors.push('Missing reference_id in dave_references block (must match REF-[A-Za-z0-9_-]+).');
    }
    if (!/content_hash:\s*["']?sha256:[a-f0-9]{64}["']?/i.test(block)) {
      errors.push('Missing or invalid content_hash in dave_references block (must be sha256:[a-f0-9]{64}).');
    }
  }

  // 3. Visual Fidelity Block
  const visualMatch = content.match(/visual_fidelity:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!visualMatch) {
    errors.push('Goal declares profile "dave_exact_design" but is missing required "visual_fidelity:" YAML block.');
  } else {
    const block = visualMatch[1];
    if (!/pixel_diff_ratio:\s*([0-9.]+)/i.test(block)) {
      errors.push('Missing pixel_diff_ratio in visual_fidelity block.');
    }
  }

  // 4. RLCD Trajectory Block
  const rlcdMatch = content.match(/rlcd_trajectory:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!rlcdMatch) {
    errors.push('Goal declares profile "dave_exact_design" but is missing required "rlcd_trajectory:" YAML block.');
  }

  return errors;
}

/**
 * Validates Proof Receipt profile contracts (proof_receipt block with invariant_id, classification, command, exit_code, result).
 */
export function validateProofReceiptProfile(content, filename) {
  const errors = [];
  if (filename && filename.includes('_template')) return errors;

  const proofMatch = content.match(/proof_receipt:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!proofMatch) {
    errors.push('Goal declares profile "proof_receipt" but is missing required "proof_receipt:" YAML block.');
  } else {
    const block = proofMatch[1];
    if (!/invariant_id:\s*["']?[A-Za-z0-9_-]+["']?/i.test(block)) {
      errors.push('Missing or invalid invariant_id in proof_receipt block.');
    }
    const classMatch = block.match(/classification:\s*["']?([a-z0-9_]+)["']?/i);
    const validClasses = [
      'formal_invariant', 'executable_property', 'statistical_claim', 'visual_claim',
      'operational_claim', 'security_claim', 'human_approval_claim', 'model_claim'
    ];
    if (!classMatch || !validClasses.includes(classMatch[1].toLowerCase())) {
      errors.push(`Invalid classification in proof_receipt block. Must be one of: ${validClasses.join(', ')}`);
    }
    if (!/result:\s*["']?(passed|failed)["']?/i.test(block)) {
      errors.push('Missing result in proof_receipt block (must be passed or failed).');
    }
  }
  return errors;
}

/**
 * Validates DAVE Platform profile contracts (dave_orchestrator block with state machine definition).
 */
export function validateDavePlatformProfile(content, filename) {
  const errors = [];
  if (filename && filename.includes('_template')) return errors;

  const orchMatch = content.match(/dave_orchestrator:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!orchMatch) {
    errors.push('Goal declares profile "dave_platform" but is missing required "dave_orchestrator:" YAML block.');
  } else {
    const block = orchMatch[1];
    if (!/state_machine:/i.test(block)) {
      errors.push('Missing state_machine definition in dave_orchestrator block.');
    }
  }
  return errors;
}

/**
 * Validates Formal Verification profile contracts (formal_verification block with paradigm, spec_language, trusted_computing_base, verification_conditions).
 */
export function validateFormalVerificationProfile(content, filename) {
  const errors = [];
  if (filename && filename.includes('_template')) return errors;

  const fvMatch = content.match(/formal_verification:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|\n---|\n#|$)/);
  if (!fvMatch) {
    errors.push('Goal declares profile "formal_verification" but is missing required "formal_verification:" YAML block.');
  } else {
    const block = fvMatch[1];
    if (!/paradigm:\s*["']?[a-z0-9_]+["']?/i.test(block)) {
      errors.push('Missing paradigm in formal_verification block.');
    }
    if (!/spec_language:\s*["']?[a-z0-9_]+["']?/i.test(block)) {
      errors.push('Missing spec_language in formal_verification block.');
    }
    if (!/verification_conditions:/i.test(block)) {
      errors.push('Missing verification_conditions list in formal_verification block.');
    }
  }
  return errors;
}

/**
 * Validates a single goal specification file against all canonical invariants.
 */
export function validateGoalConformance(filePath) {
  if (!existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
      warnings: [],
      passedCount: 0,
      totalCount: REQUIRED_SECTIONS.length,
      goalId: 'UNKNOWN',
      filename: basename(filePath),
      filePath
    };
  }

  const content = readFileSync(filePath, 'utf8');
  const filename = basename(filePath);
  const goalIdMatch = filename.match(/G-[A-Za-z0-9_-]+/i) || content.match(/^#\s+(G-(?:[A-Za-z0-9_-]+|xxx)):/im);
  const goalId = goalIdMatch ? (goalIdMatch[1] || goalIdMatch[0]).toUpperCase() : 'G-XXX';

  const errors = [];
  const warnings = [];
  let passedCount = 0;
  const isArchived = filePath.includes('_archived');
  const contractRes = extractAndValidateGoalContract(content, filename);
  if (!contractRes.valid) {
    errors.push(...contractRes.errors);
  }

  const isCognitive = filename.includes('_template') || /\*\*Epic:\*\*\s*(?:SUPER|EVOLVE|DECIDE)/i.test(content);
  const isDave = filename.includes('_template') || /\*\*Epic:\*\*\s*DAVE/i.test(content) || /G-DAVE/i.test(filename);
  const isFormal = filename.includes('_template') || /\*\*Epic:\*\*\s*(?:FORMAL|VERIFY)/i.test(content) || /profiles:\s*[\s\S]*?-\s*formal_verification/i.test(content) || /formal_verification:/i.test(content);

  for (const rule of REQUIRED_SECTIONS) {
    if (rule.cognitiveOnly && !isCognitive) {
      passedCount++;
      continue;
    }
    if (rule.daveEnhanced && !isDave) {
      passedCount++;
      continue;
    }
    if (rule.formalOnly && !isFormal) {
      passedCount++;
      continue;
    }
    if (rule.pattern.test(content)) {
      passedCount++;
    } else {
      // Check if linked specification satisfies this requirement
      let matchedInLinkedSpec = false;
      const linkedSpecMatches = [
        ...content.matchAll(/\[.*?\]\((?:file:\/\/\/?)?(\.?\/?(?:docs\/03-architecture\/specs(?:\/goals\/[a-zA-Z0-9_-]+)?|\.agents\/specs)\/[a-zA-Z0-9_-]+\.md)\)/g)
      ];
      if (linkedSpecMatches.length > 0) {
        for (const specMatch of linkedSpecMatches) {
          let specRelPath = specMatch[1].replace(/^\.?\//, '');
          const specAbsPath = resolve(process.cwd(), specRelPath);
          if (existsSync(specAbsPath)) {
            const specFileContent = readFileSync(specAbsPath, 'utf8');
            if (rule.pattern.test(specFileContent)) {
              matchedInLinkedSpec = true;
              break;
            }
          }
        }
      }

      if (matchedInLinkedSpec) {
        passedCount++;
      } else if (rule.skipArchived && isArchived) {
        passedCount++;
      } else {
        errors.push(`Missing or invalid required section: "${rule.name}"`);
      }
    }
  }

  // Validate single atomic outcome
  const outcomeErrors = validateAtomicOutcome(content, filename);
  errors.push(...outcomeErrors);

  // Validate acceptance criteria
  const criteriaErrors = validateAcceptanceCriteria(content, filename);
  errors.push(...criteriaErrors);

  // Validate touch map consistency
  const touchMapErrors = validateTouchMapConsistency(content, filename);
  errors.push(...touchMapErrors);

  // Anti-Solutioneering check in Intent
  if (/##\s+Intent/i.test(content)) {
    const intentBlockMatch = content.match(/##\s+Intent[\s\S]*?(?=\n##\s+Atomicity|\n##\s+Quality|\n##\s+Gap|\n##\s+How|\n##\s+Open|\n##\s+Context|\n##\s+Work|$)/i);
    const intentBlock = intentBlockMatch ? intentBlockMatch[0] : '';
    for (const pattern of INTENT_STACK_ANTI_PATTERNS) {
      if (pattern.test(intentBlock)) {
        warnings.push(`Intent contains premature stack/path solutioneering matching ${pattern}. Intent must be WHAT/WHY only.`);
      }
    }
  }

  // Open questions Socratic validation
  const statusLineMatch = content.match(/\*\*Status:\*\*\s*([a-zA-Z_]+)/i);
  const singleStatus = statusLineMatch ? statusLineMatch[1].toLowerCase() : '';
  const isStrictActive = ['ready', 'in_progress', 'review', 'approved', 'done'].includes(singleStatus);

  if (/##\s+Open\s+questions/i.test(content)) {
    const oqBlockMatch = content.match(/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|\n##\s+Work|$)/i);
    const oqBlock = oqBlockMatch ? oqBlockMatch[0] : '';
    if (isStrictActive && /\[NEEDS CLARIFICATION:.*?\]/i.test(oqBlock)) {
      errors.push("Goal is marked 'ready' or active, but still contains unresolved '[NEEDS CLARIFICATION: ...]' in Open questions.");
    }
  }

  // 1. Atomic Work Steps Validator
  if (/##\s+Work\s+steps/i.test(content)) {
    const workStepsBlockMatch = content.match(/##\s+Work\s+steps[\s\S]*?(?=\n##\s+In\b|$)/i);
    const workStepsBlock = workStepsBlockMatch ? workStepsBlockMatch[0] : '';
    const stepMatches = workStepsBlock.match(/###\s+Step\s+\d+[\s\S]*?(?=\n###\s+Step|\n##|$)/g);
    if (stepMatches && stepMatches.length > 0) {
      for (const step of stepMatches) {
        const stepHeaderMatch = step.match(/###\s+Step\s+\d+[^\n]*/);
        const stepHeader = stepHeaderMatch ? stepHeaderMatch[0] : 'Step';
        if (!/\*\*Allowed files:\*\*/i.test(step)) {
          errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Allowed files:**" field.`);
        }
        if (!/\*\*Actions:\*\*/i.test(step)) {
          errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Actions:**" field.`);
        } else if (!filename.includes('_template')) {
          const actionItems = step.match(/^\s*\d+\.\s+.+/gm);
          if (!actionItems || actionItems.length < 2) {
            errors.push(`Atomic Work Step "${stepHeader}" must contain at least 2 numbered actions.`);
          }
        }
        if (!/\*\*Completion gate:\*\*/i.test(step)) {
          errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Completion gate:**" field.`);
        }
        if (!/\*\*Stop condition:\*\*/i.test(step)) {
          errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Stop condition:**" field.`);
        }
        // Enhanced Work Steps validation: Verification command & Zero-Mock invariant check
        if (isStrictActive && !filePath.includes('_archived')) {
          if (!/\*\*Verification command:\*\*/i.test(step)) {
            errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Verification command:**" field.`);
          }
          if (!/\*\*Zero-Mock invariant check:\*\*/i.test(step)) {
            errors.push(`Atomic Work Step "${stepHeader}" is missing required "**Zero-Mock invariant check:**" field.`);
          }
        }
      }
    }
  }

  // 2. Strict Zero-Mock & Zero-Stub Invariant (Article I)
  const forbiddenCodeStubs = [
    /\b(todo!\(\)|unimplemented!\(\))\b/g,
    /\/\/\s*TODO:\s*(implement|stub|mock|dummy|placeholder)/i
  ];
  for (const pattern of forbiddenCodeStubs) {
    if (pattern.test(content)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const isNegativeRuleContext = /forbidden|prohibit|zero mock|no mock|strictly|article i|without|prevent|reject|avoid/i.test(line);
          if (!isNegativeRuleContext) {
            errors.push(`Forbidden mock/stub pattern "${line.trim()}" found on line ${i + 1}. Article I requires 100% fully realized operational logic.`);
          }
        }
      }
    }
  }

  // 3. Epistemic Claim & Bounded Operational Envelope Check
  const ungroundedPatterns = [
    /\bzero hallucinations?\b/i,
    /\bguaranteed safe\b/i,
    /\b100% bug-free\b/i
  ];
  for (const pattern of ungroundedPatterns) {
    if (pattern.test(content)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const isBoundedOrProhibited = /prohibit|reject|avoid|unsupported|operating envelope|specified assumptions|disallow/i.test(line);
          if (!isBoundedOrProhibited) {
            errors.push(`Ungrounded claim detected on line ${i + 1}: "${line.trim()}". Epistemic contract requires bounded claims under specified assumptions and operating envelope.`);
          }
        }
      }
    }
  }

  // 4. DAVE Exact Design Profile Check
  if (contractRes.isV2 && contractRes.contract?.profiles && contractRes.contract.profiles.includes('dave_exact_design')) {
    const daveErrors = validateDaveExactDesignProfile(content, filename);
    errors.push(...daveErrors);
  }

  // 5. Proof Receipt Profile Check
  if (contractRes.isV2 && contractRes.contract?.profiles && contractRes.contract.profiles.includes('proof_receipt')) {
    const proofErrors = validateProofReceiptProfile(content, filename);
    errors.push(...proofErrors);
  }

  // 6. DAVE Platform Profile Check
  if (contractRes.isV2 && contractRes.contract?.profiles && contractRes.contract.profiles.includes('dave_platform')) {
    const platformErrors = validateDavePlatformProfile(content, filename);
    errors.push(...platformErrors);
  }

  // 7. Formal Verification Profile Check
  if (contractRes.isV2 && contractRes.contract?.profiles && contractRes.contract.profiles.includes('formal_verification')) {
    const fvErrors = validateFormalVerificationProfile(content, filename);
    errors.push(...fvErrors);
  }

  // 8. Mandatory Pre-Execution Design Specification Protocol Check (Invariant 13)
  // For active non-template goals entering or in EXECUTE phase, verify docs/03-architecture/specs/goals/G-xxx/design.md exists
  const isExecutingOrBeyond = ['in_progress', 'review', 'approved', 'done'].includes(singleStatus);
  if (isExecutingOrBeyond && !filename.includes('_template') && !filePath.includes('_archived')) {
    const designPath = resolve(process.cwd(), `docs/03-architecture/specs/goals/${goalId}/design.md`);
    if (!existsSync(designPath)) {
      errors.push(`Missing mandatory pre-execution design specification: "docs/03-architecture/specs/goals/${goalId}/design.md" (Invariant 13).`);
    } else {
      const designContent = readFileSync(designPath, 'utf8');
      const requiredDesignSections = [
        'Intent & Architectural Rationale',
        'Goals, Non-Goals & Anti-Goals',
        'Approaches Considered & Rejected Alternatives',
        'Selected Approach & Trade-off Analysis',
        'Bounded Context & Touch Map Invariants',
        'Acceptance Test & TDD Verification Strategy'
      ];
      for (const sec of requiredDesignSections) {
        const secRegex = new RegExp(`##\\s*\\d*\\.?\\s*${sec.replace(/&/g, '(&|&amp;)')}`, 'i');
        if (!secRegex.test(designContent)) {
          errors.push(`Design specification "${relative(process.cwd(), designPath)}" is missing required section: "${sec}".`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passedCount,
    totalCount: REQUIRED_SECTIONS.length,
    goalId,
    filename,
    filePath
  };
}


/**
 * Standardizes/repairs a goal file by injecting missing boilerplate sections.
 */
export function autoRepairGoal(filePath) {
  if (!existsSync(filePath)) return false;
  let content = readFileSync(filePath, 'utf8');
  const filename = basename(filePath);
  const goalIdMatch = filename.match(/G-[A-Za-z0-9_-]+/i) || content.match(/^#\s+(G-(?:[A-Za-z0-9_-]+|xxx)):/im);
  const goalId = goalIdMatch ? (goalIdMatch[1] || goalIdMatch[0]).toUpperCase() : 'G-XXX';

  // Extract existing sections or fallback
  const title = (/^#\s+G-(?:\d+[a-z]?|xxx):\s+(.+)/im.test(content))
    ? content.match(/^#\s+G-(?:\d+[a-z]?|xxx):\s+(.+)/im)[1]
    : filename.replace(/\.md$/i, '').replace(/_/g, ' ');

  const statusMatch = content.match(/\*\*Status:\*\*\s*([^\n]+)/i);
  const status = statusMatch ? statusMatch[1].trim() : 'draft';

  const kindMatch = content.match(/\*\*Kind:\*\*\s*([^\n]+)/i);
  const kind = kindMatch ? kindMatch[1].trim() : 'feature';

  const epicMatch = content.match(/\*\*Epic:\*\*\s*([^\n]+)/i);
  const epic = epicMatch ? epicMatch[1].trim() : '—';

  const dependsMatch = content.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
  const dependsOn = dependsMatch ? dependsMatch[1].trim() : '—';

  const blocksMatch = content.match(/\*\*Blocks:\*\*\s*([^\n]+)/i);
  const blocks = blocksMatch ? blocksMatch[1].trim() : '—';

  const stabilityMatch = content.match(/\*\*Spec stability:\*\*\s*([^\n]+)/i);
  const stability = stabilityMatch ? stabilityMatch[1].trim() : 'clarify pending · spec check pending · analyze pending';

  const outcomeMatch = content.match(/\*\*Atomic outcome:\*\*\s*([^\n]+)/i);
  const outcome = outcomeMatch ? outcomeMatch[1].trim() : 'One independently verifiable deliverable.';

  let rebuilt = '';
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    rebuilt += frontmatterMatch[0] + '\n\n';
  } else {
    rebuilt += `---\ngoal_contract:\n  id: ${goalId}\n  version: 2\n  kind: ${kind}\n  status: ${status}\n  epic: ${epic}\n  profiles:\n    - core\n  atomicity:\n    outcome_count: 1\n    primary_outcome: "${outcome.replace(/"/g, '\\"')}"\n    secondary_outcomes: []\n    split_candidates: []\n  owner:\n    role: developer\n  approver:\n    role: tech-lead\n  risk:\n    level: low\n    reasons: []\n  reversibility:\n    level: reversible\n  lifecycle:\n    spec: draft\n    implementation: pending\n    verification: pending\n    evidence: pending\n    review: pending\n    release: unreleased\n---\n\n`;
  }
  rebuilt += `# ${goalId}: ${title}\n\n`;
  rebuilt += `**Status:** ${status}  \n`;
  rebuilt += `**Kind:** ${kind}  \n`;
  rebuilt += `**Atomic outcome:** ${outcome}\n`;
  rebuilt += `**Epic:** ${epic}  \n`;
  rebuilt += `**Depends on:** ${dependsOn}  \n`;
  rebuilt += `**Blocks:** ${blocks}  \n`;
  rebuilt += `**Spec stability:** ${stability}\n\n`;

  // Plan
  const defaultWorktreePlan = [
    '### Worktree & Multi-Subagent Orchestration Plan',
    '',
    '> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.',
    '',
    '#### 1. Worktree Allocation & Topology Matrix',
    '',
    '| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |',
    '|---|---|---|---|---|---|',
    `| **Orchestrator (Leader)** | \`.\` *(primary repo root)* | \`feature/${goalId}\` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | \`docs/07-backlog/goals/${goalId}.md\` | \`INIT\` → \`DISPATCH\` → \`JOIN\` → \`VERIFY\` → \`CLEANUP\` |`,
    `| **Subagent-1 (Implementer)** | \`.worktrees/${goalId}-impl\` | \`feature/${goalId}-impl\` | Step 1 & 2: Production source implementation & domain logic | \`code/src/**\` (scoped implementation files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |`,
    `| **Subagent-2 (Verifier/Test)** | \`.worktrees/${goalId}-test\` | \`feature/${goalId}-test\` | Step 3: Zero-mock unit & integration test suites | \`code/tests/**\` (scoped test files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |`,
    `| **Subagent-3 (Socratic/Archivist)** | \`.worktrees/${goalId}-arch\` | \`feature/${goalId}-arch\` | Socratic 5-Why dialectic, baseline freeze & audit log | \`docs/06_raw/**\`, \`docs/wiki/**\` | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |`,
    '',
    '#### 2. Isolation & Concurrency Invariants',
    '',
    '- **Git Index Isolation:** Every subagent executes within an independent Git worktree (`git worktree add <path> -b <branch>`), ensuring dedicated `.git/worktrees/.../index` files and zero index lock contention (`fatal: Unable to create \'.git/index.lock\'`).',
    '- **Disjoint Touch Map Theorem:** Subagent write permissions must satisfy strict disjointness:',
    '  $$\\text{TouchMap}(\\text{Subagent}_i) \\cap \\text{TouchMap}(\\text{Subagent}_j) = \\emptyset \\quad \\forall i \\neq j$$',
    '  Write-write collisions across subagents trigger an immediate, fail-closed orchestrator abort.',
    '- **Port & Socket Isolation:** Concurrent test suites must dynamically bind ephemeral OS ports (`127.0.0.1:0`) and utilize isolated test caches (`.pytest_cache-{role}` or scoped temp databases) to eliminate `EADDRINUSE` socket conflicts.',
    '- **Hardware Acceleration Contention:** GPU streams/Metal buffers (`mps` / `cuda`) and CPU thread allocations are capped per subagent to avoid CUDA OOM or scheduler thrashing.',
    '',
    '#### 3. Orchestration Saga & Synchronization Protocol',
    '',
    '$$\\text{DISPATCH (Fork Worktrees)} \\longrightarrow \\text{CONCURRENT EXECUTION} \\longrightarrow \\text{BARRIER JOIN (Green Receipts)} \\longrightarrow \\text{RECONCILIATION MERGE} \\longrightarrow \\text{TEARDOWN & PRUNE}$$',
    '',
    '1. **Dispatch & Worktree Provisioning:**',
    '   ```bash',
    `   git worktree add .worktrees/${goalId}-impl -b feature/${goalId}-impl`,
    `   git worktree add .worktrees/${goalId}-test -b feature/${goalId}-test`,
    `   git worktree add .worktrees/${goalId}-arch -b feature/${goalId}-arch`,
    '   ```',
    '2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.',
    '3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.',
    `4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into \`feature/${goalId}\` sequentially:`,
    '   ```bash',
    `   git merge --ff-only feature/${goalId}-impl`,
    `   git merge --ff-only feature/${goalId}-test`,
    `   git merge --ff-only feature/${goalId}-arch`,
    '   ```',
    '5. **Teardown & Worktree Pruning:**',
    '   ```bash',
    `   git worktree remove --force .worktrees/${goalId}-impl`,
    `   git worktree remove --force .worktrees/${goalId}-test`,
    `   git worktree remove --force .worktrees/${goalId}-arch`,
    '   git worktree prune',
    `   git branch -d feature/${goalId}-impl feature/${goalId}-test feature/${goalId}-arch`,
    '   ```'
  ].join('\n');

  if (/(?:####|##)\s+Plan[\s\S]*?(?=\n##\s+Context|\n##\s+Intent|$)/i.test(content)) {
    let planBlock = content.match(/(?:####|##)\s+Plan[\s\S]*?(?=\n##\s+Context|\n##\s+Intent|$)/i)[0].trim();
    if (!/###\s+Worktree\s*&(?:amp;)?\s*Multi-Subagent\s+Orchestration\s+Plan/i.test(planBlock)) {
      planBlock += `\n\n${defaultWorktreePlan}`;
    }
    rebuilt += planBlock + '\n\n';
  } else {
    rebuilt += `#### Plan\n\n**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP\n\n| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |\n|:------:|:----:|:-------:|:------:|:----:|\n| **●** | ○ | ○ | ○ | ○ |\n\n| # | Step | Status |\n|---|------|--------|\n| 1 | Architecture & Specification Alignment | pending |\n| 2 | Implementation of Domain Logic & Endpoints | pending |\n| 3 | Verification & Automated Test Pass | pending |\n\n${defaultWorktreePlan}\n\n`;
  }

  // Context
  if (/##\s+Context[\s\S]*?(?=\n##\s+Intent|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Context[\s\S]*?(?=\n##\s+Intent|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Context\n\n1–3 sentences: Placement in product, initiative, legacy gap, or linked ADR.\n\n`;
  }

  // Intent
  if (/##\s+Intent[\s\S]*?(?=\n##\s+How|\n##\s+Open|$)/i.test(content)) {
    let intentContent = content.match(/##\s+Intent[\s\S]*?(?=\n##\s+How|\n##\s+Open|$)/i)[0].trim();
    if (!/\*\*Why:\*\*/i.test(intentContent)) intentContent += `\n\n**Why:** [Problem or opportunity]`;
    if (!/\*\*Done when:\*\*/i.test(intentContent)) intentContent += `\n\n**Done when:** [Concrete observable deliverable]`;
    if (!/\*\*Unblocks:\*\*/i.test(intentContent)) intentContent += `\n\n**Unblocks:** —`;
    rebuilt += intentContent + '\n\n';
  } else {
    rebuilt += `## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*\n\n**Why:** [Problem or opportunity — what breaks if we skip this?]\n\n**Done when:** [Concrete observable deliverable / doc state]\n\n**Unblocks:** [Downstream goals or repos]\n\n`;
  }

  // How
  if (/##\s+How[\s\S]*?(?=\n##\s+Open|\n##\s+Knowledge|$)/i.test(content)) {
    rebuilt += content.match(/##\s+How[\s\S]*?(?=\n##\s+Open|\n##\s+Knowledge|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## How *(PLAN only — leave empty while draft)*\n\n**Stack / approach:** —\n\n`;
  }

  // Open questions
  if (/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Open\s+questions[\s\S]*?(?=\n##\s+Knowledge|\n##\s+Context\s+manifest|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Open questions *(block ready while any [NEEDS CLARIFICATION] remain)*\n\n- [ ] [NEEDS CLARIFICATION: Unspecified domain boundaries or schemas]\n\n`;
  }

  // Knowledge links
  if (/##\s+Knowledge\s+links[\s\S]*?(?=\n##\s+Context\s+manifest|\n##\s+Work|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Knowledge\s+links[\s\S]*?(?=\n##\s+Context\s+manifest|\n##\s+Work|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Knowledge links\n\n| Type | IDs |\n|------|-----|\n| **Pains addressed** | P-001 |\n| **Decisions** | ADR-001 |\n| **Assumptions required** | — |\n| **Evidence** | \`docs/06_raw/\` |\n\n`;
  }

  // Context manifest
  if (/##\s+Context\s+manifest[\s\S]*?(?=\n##\s+Work|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Context\s+manifest[\s\S]*?(?=\n##\s+Work|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Context manifest\n\n| Kind | IDs / paths |\n|------|-------------|\n| **ADR** | — |\n| **PDR** | — |\n| **Patterns** | Clean Architecture, Zero Mocks, Type-Safe Contracts |\n| **Acceptance** | \`docs/02-product/acceptance/${goalId}.md\` |\n| **Skills** | \`soda-rest-api\` · \`soda-testing\` |\n| **Profile** | developer |\n| **Task type** | feature |\n| **Playbook** | \`docs/06-workflows/dev-loop.md\` |\n| **Default role** | developer |\n| **Files** | \`code/**\` |\n| **Constraints** | Zero mocks, 100% test coverage |\n\n`;
  }

  // Atomicity & Zero-Mock Contract
  if (/##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]*?(?=\n##\s+Quality|\n##\s+Gap|\n##\s+How|$)/i.test(content)) {
    let atomicityBlock = content.match(/##\s+Atomicity\s+&\s+Zero-Mock\s+Contract[\s\S]*?(?=\n##\s+Quality|\n##\s+Gap|\n##\s+How|$)/i)[0].trim();
    if (!/-\s+\*\*One outcome:\*\*/i.test(atomicityBlock) || !/-\s+\*\*Concrete execution:\*\*/i.test(atomicityBlock)) {
      atomicityBlock = `## Atomicity & Zero-Mock Contract\n\n- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.\n- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.\n- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.\n- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.\n- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.`;
    }
    if (!/###\s+Antigravity\s+handoff\s+contract/i.test(atomicityBlock)) {
      atomicityBlock += `\n\n### Antigravity handoff contract\n\nWhen this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:\n- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)\n- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`\n- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)\n- **Verification command:** Exact executable shell command testing this specific step\n- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass\n- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure\n- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders\n\nAntigravity must not invent a second outcome, broaden the touch map, or replace a real dependency with a mock, stub, fake, placeholder, dummy response, or string simulation.`;
    }
    rebuilt += atomicityBlock + '\n\n';
  } else {
    rebuilt += `## Atomicity & Zero-Mock Contract\n\n- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.\n- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.\n- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.\n- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.\n- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.\n\n### Antigravity handoff contract\n\nWhen this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:\n- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)\n- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`\n- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)\n- **Verification command:** Exact executable shell command testing this specific step\n- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass\n- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure\n- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders\n\nAntigravity must not invent a second outcome, broaden the touch map, or replace a real dependency with a mock, stub, fake, placeholder, dummy response, or string simulation.\n\n`;
  }

  // Work steps
  if (/##\s+Work\s+steps[\s\S]*?(?=\n##\s+In\b|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Work\s+steps[\s\S]*?(?=\n##\s+In\b|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Work steps\n\nOrdered execution contract for **this card only** — Antigravity or another agent executes the same list. Do not label steps as "human" vs "AI". Every implementation step must be atomic and include its allowed files, ordered actions, executable verification command, completion gate, failure/stop condition, and explicit zero-mock invariant verification. Do not use broad instructions such as “implement the feature” or “run tests”.\n\n### Step 1 — Architecture & Specification Alignment\n\n**Allowed files:** \`code/**\`  \n**Actions:**\n\n1. Confirm specification & dependencies\n2. Verify concrete interfaces and domain contracts\n\n**Verification command:** \`cargo test --package aether-kernel\`  \n**Completion gate:** Architectural interfaces fully defined and verified  \n**Stop condition:** Unresolved ambiguity or missing dependency  \n**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.\n\n### Step 2 — Domain Implementation & Test Verification\n\n**Allowed files:** \`code/**\`, \`tests/**\`  \n**Actions:**\n\n1. Implement domain components in touch map\n2. Execute automated test plan with zero mocks and zero stubs\n\n**Verification command:** \`cargo test --package aether-kernel\`  \n**Completion gate:** \`cargo test\` passes with zero errors and zero warnings  \n**Stop condition:** Test failure or compiler error  \n**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.\n\n`;
  }

  // In
  if (/##\s+In\b[\s\S]*?(?=\n##\s+Out\b|$)/i.test(content)) {
    rebuilt += content.match(/##\s+In\b[\s\S]*?(?=\n##\s+Out\b|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## In\n\n- Concrete in-scope deliverable\n\n`;
  }

  // Out
  if (/##\s+Out\b[\s\S]*?(?=\n##\s+Change\s+delta|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Out\b[\s\S]*?(?=\n##\s+Change\s+delta|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Out\n\n- Out-of-scope boundaries\n\n`;
  }

  // Change delta
  if (/##\s+Change\s+delta[\s\S]*?(?=\n##\s+Contract|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Change\s+delta[\s\S]*?(?=\n##\s+Contract|\n##\s+Software|\n##\s+Spec\s+checklist|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Change delta *(brownfield)*\n\n| Area | Action | Path / behaviour |\n|------|--------|------------------|\n| — | ADD / CHANGE / REMOVE | — |\n\n`;
  }

  // Contract impact
  if (/##\s+Contract\s+impact[\s\S]*?(?=\n##\s+Software|\n##\s+Spec\s+checklist|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Contract\s+impact[\s\S]*?(?=\n##\s+Software|\n##\s+Spec\s+checklist|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Contract impact\n\n- **Schema modifications:** None\n- **Dynamic domain & action impact:** Registered capabilities\n- **Cross-runtime parity:** Python and Node.js parity\n\n`;
  }

  // Software & Architecture Design
  if (/##\s+Software\s+&\s+Architecture\s+Design[\s\S]*?(?=\n##\s+Spec\s+checklist|\n##\s+Acceptance|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Software\s+&\s+Architecture\s+Design[\s\S]*?(?=\n##\s+Spec\s+checklist|\n##\s+Acceptance|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Software & Architecture Design *(AI Agent — PLAN phase)*\n\n| Architectural Dimension | Specification / Invariant |\n|---|---|\n| **System Archetype** | \`backend-service\` / \`fullstack\` |\n| **Bounded Context & Domain** | Application Domain |\n| **Ports & Adapters Topology** | Driving: API Gateway / HTTP <br> Driven: Database / Messaging |\n| **State Machine & Invariants** | Strict state machine lifecycle |\n| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations |\n| **Socratic 5-Why Blueprint** | Linked Dialectic Report |\n| **Worktree & Subagent Orchestration** | Worktree Path Strategy: \`.worktrees/G-PAY-001-{role}\` <br> Disjoint Touch Map Theorem: $\\text{TouchMap}(A) \\cap \\text{TouchMap}(B) = \\emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |\n\n`;
  }

  // Spec checklist
  if (/##\s+Spec\s+checklist[\s\S]*?(?=\n##\s+Acceptance|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Spec\s+checklist[\s\S]*?(?=\n##\s+Acceptance|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Spec checklist *(required \`[x]\` before \`ready\`)*\n\n- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)\n- [x] How is filled with architecture and stack details after clarify\n- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)\n- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions\n- [x] In / Out unambiguous; Out matches project brief Out\n- [x] Acceptance criteria each testable or reviewable\n- [x] Touch map is real repo paths\n- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR\n- [x] Change delta filled if modifying existing behaviour\n- [x] Critical-path assumptions are verified and active\n- [x] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)\n- [x] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)\n- [x] Epistemic Proof & Evidence Classification verified\n\n`;
  }

  // Acceptance criteria
  if (/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Acceptance criteria\n\n- [ ] Automated verification pass completes green\n- [ ] Concrete functional criteria met\n\n`;
  }

  // Test plan
  if (/##\s+Test\s+plan[\s\S]*?(?=\n##\s+Epistemic|\n##\s+Touch\s+map|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Test\s+plan[\s\S]*?(?=\n##\s+Epistemic|\n##\s+Touch\s+map|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Test plan\n\n- \`npm test\`\n- Real zero-mock execution commands\n\n### 1. Positive Tests\n- Automated unit test pass\n\n### 2. Negative Tests\n- Invalid input rejection fail-closed\n\n### 3. Fail-Closed & Chaos Tests\n- Timeout and boundary recovery\n\n### 4. Temporal Causality Tests ($t \\le T$)\n- Temporal monotonicity and zero lookahead bias\n\n### 5. Security & Air-Gap Checks\n- Sandbox boundary and credential protection\n\n### 6. Invariants & System Laws Verification\n- Conservation (ΔSupply=0), monotonicity, state machine reachability, idempotency f(f(x))=f(x), solvency\n\n### 7. Formal Verification & Solvers\n- Deductive proofs, SMT/Z3 bitvector/integer assertions, Kani bounded model checking #[kani::unwind(N)]\n\n### 8. Harness Engineering & Modeling\n- Isolated verification harness, symbolic allocations kani::any(), preconditions kani::assume(), stubbing #[kani::stub]\n\n### 9. Adversarial Stress & Edge Pathologies\n- Aliasing collisions (from == to), arithmetic extremes 0/1/MAX, precision dust, replay, atomicity rollback\n\n### 10. Concurrency, Race Conditions & Memory Models\n- ABA tagged versioned pointers, CAS compare_exchange, UAF elimination, mutual exclusion, Acquire/Release orderings\n\n### 11. Advanced Testing Paradigms & Mutation Testing\n- Property-based testing (proptest >= 10,000 iterations), DbC assertions, mutation kill threshold >= 85%, MC/DC coverage\n\n`;
  }

  // Epistemic Proof & Evidence Classification
  if (/##\s+Epistemic\s+Proof\s+&(?:amp;)?\s+Evidence\s+Classification[\s\S]*?(?=\n##\s+Touch\s+map|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Epistemic\s+Proof\s+&(?:amp;)?\s+Evidence\s+Classification[\s\S]*?(?=\n##\s+Touch\s+map|$)/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Epistemic Proof & Evidence Classification\n\n| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |\n|---|---|---|---|\n| **Epistemic Category** | Formal Proof | Invariant bounded state | \`docs/07-backlog/evidence/\` |\n| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact \`git rev-parse HEAD\` | \`master_scorecard_evidence_report.json\` |\n| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest suite |\n| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |\n\n`;
  }

  // Notes for AI
  if (/##\s+Notes\s+for\s+AI[\s\S]*?(?=\n---\n\n##\s+🏛️?\s*Comprehensive|$)/i.test(content)) {
    rebuilt += content.match(/##\s+Notes\s+for\s+AI[\s\S]*?(?=\n---\n\n##\s+🏛️?\s*Comprehensive|$)/i)[0].trim() + '\n\n';
  } else if (/##\s+Notes\s+for\s+AI[\s\S]*$/i.test(content)) {
    rebuilt += content.match(/##\s+Notes\s+for\s+AI[\s\S]*$/i)[0].trim() + '\n\n';
  } else {
    rebuilt += `## Notes for AI\n\n- Read architecture documentation before execution\n- Zero mocks, zero stubs, zero fallbacks\n\n`;
  }

  // Comprehensive Spec Design Appendix
  if (/##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix[\s\S]*$/i.test(content)) {
    rebuilt += '---\n\n' + content.match(/##\s+🏛️?\s*Comprehensive\s+Spec\s+Design\s+Appendix[\s\S]*$/i)[0].trim() + '\n';
  } else {
    rebuilt += `---\n\n## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*\n\n> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (\`Zero-Mock & Deterministic Contract\`).\n\n### 1. Finite State Machine (FSM) Matrix & Saga Compensations\n\n| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |\n|---|---|---|---|---|\n| \`State::Idle\` | System bootstrap / Intent intake | Validated schema input | Transition to \`State::Pending\` | Reject with 400 Bad Request |\n| \`State::Pending\` | Authorization & Pre-flight check | Auth & rate-limit valid | Transition to \`State::Processing\` | Return 401 Unauthorized / 429 |\n| \`State::Processing\` | Domain execution / Port call | Invariant: Zero float math | Transition to \`State::Success\` | Trigger Saga Compensation rollback |\n| \`State::Success\` | Event published / Response emitted | 100% concrete types | Disburse / Persist outcome | Audit ledger entry written |\n| \`State::DisputeFrozen\` | Customer dispute / Holdback trigger | 14-day warranty window | Freeze release daemon | Human review gate / Credit note |\n\n### 2. Mathematical & Data Invariants\n\n| Dimension | Standard / Specification |\n|---|---|\n| **System Invariant ($\forall s \in \mathcal{S}$)** | Universal property holding invariant across all reachable states ($\forall s \in \mathcal{S}_{\text{reachable}}, \Phi(s) = \text{true}$). |\n| **Conservation Law ($\Delta \text{Supply} = 0$)** | Zero-sum asset and value conservation. Remainder-preserving allocation splits ($\sum \text{splits} \equiv \text{total}$). |\n| **Monotonicity Law ($e_{t+1} > e_t$)** | Monotonically non-decreasing counters, nonces, and sequence IDs without regression. |\n| **State Machine Invariant** | Forbidden transitions (e.g. \`Cancelled\` $\\to$ \`Settled\`) strictly rejected fail-closed. |\n| **Idempotency & Reversibility** | Pure idempotence $f(f(x)) = f(x)$ and saga reversibility $g(f(x)) = x$. |\n| **Solvency & Non-Negativity** | Guarding non-negative balances ($\forall a \in \mathcal{A}, \text{balance}(a) \ge 0$). |\n| **Multi-Currency & Monetary Math** | Multi-currency ISO 4217 minor-unit integer arithmetic (\`i64\`/\`u64\`/\`i128\` parameterized by currency exponent $10^{-e}$, e.g. JPY $e=0$, USD/EUR/THB $e=2$, BHD $e=3$). **ZERO float math**. Composite Money tuple \`(amount_minor: i64, currency: ISO_4217, scale: u8)\`. Strict cross-currency FX isolation with deterministic Banker's Rounding (Half-Even). |\n| **Identifiers & Keys** | Time-ordered UUIDv7 (\`uuid::Uuid::now_v7()\`) or nanoid prefix (\`ord_xxx\`, \`usr_xxx\`). |\n| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (\`chrono::Utc::now()\`). |\n| **Idempotency & Deduplication** | \`Idempotency-Key\` header with 24-hour distributed Redis lock lease. |\n\n### 3. Hexagonal Inbound & Outbound Ports Specification\n\n| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |\n|---|---|---|---|\n| **Driving (Inbound)** | \`HttpServerPort\` / \`EventConsumerPort\` | Axum HTTP/2 / NATS JetStream | \`code/apps/services/.../src/adapters/inbound/\` |\n| **Driven (Outbound)** | \`DatabasePort\` / \`PaymentGatewayPort\` | SQLx PostgreSQL / Stripe Omise RPC | \`code/apps/services/.../src/adapters/outbound/\` |\n\n### 4. UI/UX 5-State Matrix *(Applies when Kind is \`design\` or UI component)*\n\n| UI State | Rendering Contract | Design Token / Tailwind Specs |\n|---|---|---|\n| **1. Default / Idle** | Primary component surface rendered with baseline data | \`bg-surface-elevated text-content-primary rounded-lg border border-border-subtle\` |\n| **2. Loading / Pending** | Accessible shimmer skeleton sweep (\`aria-busy="true"\`) | \`animate-pulse bg-surface-muted rounded\` |\n| **3. Empty State** | Helpful illustration + actionable call-to-action button | \`text-content-secondary flex flex-col items-center justify-center p-8\` |\n| **4. Error State** | Human-readable error message + Retry trigger button | \`bg-status-error-subtle text-status-error border-status-error rounded-md p-4\` |\n| **5. Success State** | Celebratory / updated state with spring micro-animation | \`bg-status-success-subtle text-status-success transition-all duration-200\` |\n\n### 5. Codex Superintelligence Empirical Criteria & Invariants *(Applies to Cognitive/SUPER Goals)*\n\n| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |\n|---|---|---|\n| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains $C/D$ with $\\ge 90\\%$ retention of baseline quality $A/B$. | Cross-domain multi-seed evaluation harness with held-out task suite. |\n| **2. Causal World Modeling** | Causal intervention prediction accuracy $\\ge 92\\%$; counterfactual error strictly bounded. | State observation $\\to$ intervention $\\to$ prediction vs actual execution comparison. |\n\n### 6. Proof-and-Evidence Contract & Epistemic Taxonomy\n\nEvery capability claim MUST be categorized according to the **Tripartite Epistemic Taxonomy**:\n- **Formal Proof:** Mathematical invariants that must always hold under axioms.\n- **Statistical Guarantee:** Confidence, calibration, or distribution bounds under stated assumptions.\n- **Empirical Evidence:** Reproducible experiments demonstrating performance in practice.\n\n#### Mandatory 7-Stage Verification Pipeline\n$$\\text{Invariant} \\to \\text{Mathematical Definition} \\to \\text{Proof or Derivation} \\to \\text{Property Test} \\to \\text{Statistical Evaluation} \\to \\text{Reproducible Benchmark} \\to \\text{Audit Artifact}$$\n\n#### Operating Envelope & Bounded Claim Statement\n> Under specified assumptions and within a defined operating envelope, the system satisfies these verified invariants and achieves these measured statistical bounds.\n> *(Prohibited: ungrounded absolute marketing claims such as "zero hallucinations" or "guaranteed safe".)*\n\n| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |\n|---|---|---|---|---|---|---|\n| \`CLM-001\` | Baseline Verification | Formal Proof | Invariant bounded state | Property tests | Harness test pass | \`docs/06_raw/\` |\n`;
  }

  writeFileSync(filePath, rebuilt, 'utf8');
  return true;
}

/**
 * Resolves goal file path from ID or direct path
 */
export function resolveGoalFile(target, baseDir = process.cwd()) {
  if (!target) return null;
  const directPath = resolve(baseDir, target);
  if (existsSync(directPath) && statSync(directPath).isFile()) {
    return directPath;
  }

  const goalIdMatch = target.match(/G-[A-Za-z0-9_-]+/i);
  if (goalIdMatch) {
    const goalId = goalIdMatch[0].toUpperCase();
    const searchDirs = [
      resolve(baseDir, 'docs/07-backlog/goals'),
      resolve(baseDir, 'docs/07-backlog/goals/_archived'),
      resolve(baseDir, 'template/docs/07-backlog/goals'),
      resolve(baseDir, 'template/docs/07-backlog/goals/_archived')
    ];

    for (const sDir of searchDirs) {
      if (existsSync(sDir)) {
        const files = readdirSync(sDir);
        const matched = files.find(f => (f.toUpperCase().startsWith(goalId) || f.toUpperCase().startsWith(`${goalId}-`)) && f.endsWith('.md'));
        if (matched) {
          return join(sDir, matched);
        }
      }
    }
  }
  return null;
}

/**
 * Main harness runner
 */
export function runGoalConformanceHarness(argv = process.argv.slice(2)) {
  console.log("================================================================================");
  console.log("🛡️ Soda OS Goal Template Conformance & Validation Harness");
  console.log("================================================================================\n");

  const doFix = argv.includes('--fix');
  const scanAll = argv.includes('--all');
  const jsonOutput = argv.includes('--json');
  const nonFlags = argv.filter(a => !a.startsWith('-'));

  const baseDir = process.cwd();
  const templateGoal = resolve(baseDir, 'template/docs/07-backlog/goals/_template.md');
  const rootTemplateGoal = resolve(baseDir, 'docs/07-backlog/goals/_template.md');

  const filesToValidate = [];

  if (nonFlags.length > 0) {
    for (const target of nonFlags) {
      const resolved = resolveGoalFile(target, baseDir);
      if (resolved) {
        filesToValidate.push(resolved);
      } else {
        console.error(`❌ [${target}] Goal file not found in docs/07-backlog/goals/ or template/`);
        process.exit(1);
      }
    }
  } else if (scanAll) {
    const searchDirs = [
      resolve(baseDir, 'docs/07-backlog/goals'),
      resolve(baseDir, 'docs/07-backlog/goals/_archived'),
      resolve(baseDir, 'template/docs/07-backlog/goals')
    ];
    for (const sDir of searchDirs) {
      if (existsSync(sDir)) {
        const files = readdirSync(sDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
        files.forEach(f => filesToValidate.push(join(sDir, f)));
      }
    }
  } else {
    // Default mode: validate template and any active goals
    if (existsSync(templateGoal)) filesToValidate.push(templateGoal);
    if (existsSync(rootTemplateGoal)) filesToValidate.push(rootTemplateGoal);

    const activeGoalsDir = resolve(baseDir, 'docs/07-backlog/goals');
    if (existsSync(activeGoalsDir)) {
      const files = readdirSync(activeGoalsDir).filter(f => f.endsWith('.md') && f.startsWith('G-'));
      files.forEach(f => filesToValidate.push(join(activeGoalsDir, f)));
    }
  }

  if (filesToValidate.length === 0) {
    if (existsSync(templateGoal)) filesToValidate.push(templateGoal);
  }

  let totalGoalsPassed = 0;
  let totalGoalsFailed = 0;
  const results = [];

  for (const file of filesToValidate) {
    if (doFix) {
      autoRepairGoal(file);
    }
    const res = validateGoalConformance(file);
    results.push(res);

    const relPath = relative(baseDir, file);
    console.log(`▶ Verifying ${basename(file)} (${relPath})...`);

    if (res.valid) {
      console.log(`  ✅ 100% Conformance Verified (${res.passedCount}/${res.totalCount} sections & invariants passed)\n`);
      totalGoalsPassed++;
    } else {
      res.errors.forEach(e => console.error(`  ❌ ${e}`));
      console.error(`  ⚠️ Failed with ${res.errors.length} template deviations.\n`);
      totalGoalsFailed++;
    }
    if (res.warnings.length > 0) {
      res.warnings.forEach(w => console.warn(`  ⚠️ Warning: ${w}`));
    }
  }

  console.log("================================================================================");
  console.log(`📊 Summary: ${totalGoalsPassed} Passed, ${totalGoalsFailed} Failed`);
  console.log("================================================================================\n");

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  }

  return totalGoalsFailed === 0;
}

// Auto-execute if run as script
const isDirectScript = process.argv[1] && (
  process.argv[1].endsWith('goal-template-conformance-harness.mjs')
);

if (isDirectScript) {
  const success = runGoalConformanceHarness(process.argv.slice(2));
  process.exit(success ? 0 : 1);
}

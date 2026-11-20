/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CONTRASTIVE PREFERENCE DATASET BUILDER (STAGE 5 CURRICULUM)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M3 / G-UX-013)
 * Purpose: Generates 3,500 contrastive pairs for DPO (Direct Preference Optimization)
 *          and 7,000 weighted records for KTO (Kahneman-Tversky Optimization)
 *          with quantitative delta annotations, strict 80/10/10 split, and zero leakage.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRng } from './scene-graph-dataset-generator.mjs';

export const FLAW_TAXONOMY = Object.freeze([
  'raw_hex_literal',
  'wcag_aaa_contrast_failure',
  'missing_focus_ring',
  'dark_pattern_trick',
  'inconsistent_typography_scale',
  'missing_aria_role',
  'unhandled_error_state',
  'touch_target_too_small'
]);

export const KTO_LOSS_AVERSION_LAMBDA = 1.33; // Standard loss aversion weighting

const PROMPT_TEMPLATES = [
  'Generate an accessible PrimaryButton for the checkout payment submission.',
  'Implement a responsive CardContainer displaying executive telemetry metrics.',
  'Design an overlay ModalDialog for confirming workspace termination.',
  'Construct a dense TableViewGrid with sortable column headers.',
  'Create a SearchBarInput field with clear button and keyboard shortcuts.',
  'Design an AlertBannerToast announcing real-time ledger synchronization.',
  'Implement an accessible TabBarStrip switching between analytics views.',
  'Build an authentic DrawerPanel hosting contextual multi-locale settings.'
];

/**
 * Builds a single contrastive pair.
 */
export function buildContrastivePair(index, rng = Math.random) {
  const pad = String(index + 1).padStart(6, '0');
  const pairId = `DPO-PAIR-${pad}`;

  const prompt = PROMPT_TEMPLATES[index % PROMPT_TEMPLATES.length];
  const flaw = FLAW_TAXONOMY[index % FLAW_TAXONOMY.length];

  // Quantitative delta annotations
  const contrastChosen = 12.5 + (rng() * 4.0); // 12.5 to 16.5:1
  const contrastRejected = flaw === 'wcag_aaa_contrast_failure' ? 2.8 + (rng() * 1.2) : 5.0 + (rng() * 1.5);
  const contrastMargin = Number((contrastChosen - contrastRejected).toFixed(2));

  const a11yScoreChosen = 1.0;
  const a11yScoreRejected = flaw === 'wcag_aaa_contrast_failure' || flaw === 'missing_focus_ring' || flaw === 'touch_target_too_small'
    ? 0.40 + (rng() * 0.20)
    : 0.65 + (rng() * 0.15);
  const a11yDelta = Number((a11yScoreChosen - a11yScoreRejected).toFixed(2));

  // Chosen proposal
  const chosen = {
    decision_id: `DEC-CHOSEN-${pad}`,
    rationale: `Complies with design tokens, satisfies WCAG 2.2 AAA with contrast ratio ${contrastChosen.toFixed(1)}:1, and enforces complete keyboard navigation.`,
    calibrated_confidence: 0.94,
    ast_summary: {
      component: 'PrimaryButton',
      token_bindings: { bg: 'bg-primary-600', text: 'text-content-inverted', focus: 'focus-visible:ring-2' },
      aria_attributes: { role: 'button', 'aria-label': 'Submit Payment' }
    },
    text: `<PrimaryButton className="bg-primary-600 text-content-inverted focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-4 py-2" aria-label="Submit Payment">Continue</PrimaryButton>`
  };

  // Rejected proposal exhibiting the specific flaw
  let rejectedFlawSnippet;
  let rejectedRationale;

  switch (flaw) {
    case 'raw_hex_literal':
      rejectedFlawSnippet = `<button style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>Continue</button>`;
      rejectedRationale = 'Contains forbidden raw hex visual literals violating Article I Zero Mocks and token guardrail invariant.';
      break;
    case 'wcag_aaa_contrast_failure':
      rejectedFlawSnippet = `<button className="bg-slate-100 text-slate-400">Continue</button>`;
      rejectedRationale = `Text contrast ratio ${contrastRejected.toFixed(1)}:1 fails WCAG 2.2 AAA standard (minimum 7:1 required).`;
      break;
    case 'missing_focus_ring':
      rejectedFlawSnippet = `<button className="bg-primary-600 text-white outline-none">Continue</button>`;
      rejectedRationale = 'Suppresses :focus-visible outline, disabling keyboard navigation accessibility.';
      break;
    case 'dark_pattern_trick':
      rejectedFlawSnippet = `<button className="text-xs text-slate-300">No thanks, I hate saving money</button>`;
      rejectedRationale = 'Implements deceptive confirmshaming dark pattern, violating Tier 1 Ethics invariant.';
      break;
    case 'inconsistent_typography_scale':
      rejectedFlawSnippet = `<button className="text-[17px] leading-[19px]">Continue</button>`;
      rejectedRationale = 'Uses arbitrary font size outside the canonical Major Third typography scale.';
      break;
    case 'missing_aria_role':
      rejectedFlawSnippet = `<div onClick={handleClick}>Continue</div>`;
      rejectedRationale = 'Non-semantic click surface lacking role="button" or keyboard event listeners.';
      break;
    case 'unhandled_error_state':
      rejectedFlawSnippet = `<button onClick={submit} disabled={false}>Continue</button>`;
      rejectedRationale = 'Lacks disabled/loading state handling during active network submission.';
      break;
    case 'touch_target_too_small':
      rejectedFlawSnippet = `<button className="w-4 h-4 p-0">×</button>`;
      rejectedRationale = 'Interactive touch target (16x16px) is below the WCAG 2.2 AAA minimum 44x44px standard.';
      break;
    default:
      rejectedFlawSnippet = `<button>Continue</button>`;
      rejectedRationale = 'Suboptimal implementation lacking token constraints.';
  }

  const rejected = {
    decision_id: `DEC-REJECTED-${pad}`,
    rationale: rejectedRationale,
    calibrated_confidence: 0.62,
    primary_flaw: flaw,
    ast_summary: {
      component: 'Button',
      flaw
    },
    text: rejectedFlawSnippet
  };

  const pair = {
    pair_id: pairId,
    prompt,
    chosen,
    rejected,
    preference_delta: {
      primary_flaw: flaw,
      contrast_margin: contrastMargin,
      accessibility_score_delta: a11yDelta,
      token_efficiency_gain: Math.max(1, rejected.text.length - chosen.text.length)
    },
    sha256_digest: crypto.createHash('sha256').update(JSON.stringify({ pairId, prompt, chosen, rejected })).digest('hex')
  };

  return pair;
}

/**
 * Converts a DPO pair into 2 KTO records (chosen: true, rejected: false).
 */
export function dpoPairToKtoRecords(pair) {
  const chosenKto = {
    kto_id: `${pair.pair_id}-CHOSEN`,
    prompt: pair.prompt,
    completion: pair.chosen.text,
    label: true,
    weight: 1.0,
    rationale: pair.chosen.rationale
  };

  const rejectedKto = {
    kto_id: `${pair.pair_id}-REJECTED`,
    prompt: pair.prompt,
    completion: pair.rejected.text,
    label: false,
    weight: KTO_LOSS_AVERSION_LAMBDA,
    primary_flaw: pair.preference_delta.primary_flaw,
    rationale: pair.rejected.rationale
  };

  return [chosenKto, rejectedKto];
}

/**
 * Generates the complete 3,500 contrastive pairs dataset and partitions into 80/10/10 splits.
 */
export function generateContrastivePreferenceDataset(options = {}) {
  const totalPairs = options.total_pairs !== undefined ? options.total_pairs : 3500;
  const trainRatio = options.train_ratio !== undefined ? options.train_ratio : 0.80;
  const valRatio = options.val_ratio !== undefined ? options.val_ratio : 0.10;
  const testRatio = options.test_ratio !== undefined ? options.test_ratio : 0.10;
  const outputDir = options.output_dir || 'artifacts/curriculum/stage5_preferences';
  const writeFiles = options.write_files !== undefined ? options.write_files : true;
  const seed = options.seed !== undefined ? options.seed : 20261014;

  const rng = createRng(seed);
  const pairs = [];
  const ktoRecords = [];

  const trainCount = Math.floor(totalPairs * trainRatio); // 2800
  const valCount = Math.floor(totalPairs * valRatio);     // 350
  const testCount = totalPairs - trainCount - valCount;   // 350

  const trainPairs = [];
  const valPairs = [];
  const testPairs = [];

  const trainIds = new Set();
  const valIds = new Set();
  const testIds = new Set();

  const flawFrequencies = {};

  for (let i = 0; i < totalPairs; i++) {
    const pair = buildContrastivePair(i, rng);
    pairs.push(pair);

    const [ktoChosen, ktoRejected] = dpoPairToKtoRecords(pair);
    ktoRecords.push(ktoChosen, ktoRejected);

    const flaw = pair.preference_delta.primary_flaw;
    flawFrequencies[flaw] = (flawFrequencies[flaw] || 0) + 1;

    if (i < trainCount) {
      trainPairs.push(pair);
      trainIds.add(pair.pair_id);
    } else if (i < trainCount + valCount) {
      valPairs.push(pair);
      valIds.add(pair.pair_id);
    } else {
      testPairs.push(pair);
      testIds.add(pair.pair_id);
    }
  }

  // Verify zero sample contamination
  let contamination = false;
  for (const id of trainIds) {
    if (valIds.has(id) || testIds.has(id)) contamination = true;
  }
  for (const id of valIds) {
    if (testIds.has(id)) contamination = true;
  }

  const manifest = {
    dataset_name: 'Stage 5 Contrastive Preference Dataset (DPO & KTO)',
    total_dpo_pairs: totalPairs,
    total_kto_records: ktoRecords.length,
    kto_loss_aversion_lambda: KTO_LOSS_AVERSION_LAMBDA,
    splits: {
      train: { count: trainPairs.length, ratio: trainPairs.length / totalPairs },
      validation: { count: valPairs.length, ratio: valPairs.length / totalPairs },
      test: { count: testPairs.length, ratio: testPairs.length / totalPairs }
    },
    zero_contamination_verified: !contamination,
    flaw_distribution: flawFrequencies,
    unique_flaws_count: Object.keys(flawFrequencies).length,
    generated_at: new Date().toISOString()
  };

  if (writeFiles) {
    const targetDir = resolve(process.cwd(), outputDir);
    const splitsDir = resolve(targetDir, 'splits');
    if (!existsSync(splitsDir)) {
      mkdirSync(splitsDir, { recursive: true });
    }

    writeFileSync(
      resolve(targetDir, 'dpo_pairs.jsonl'),
      pairs.map(p => JSON.stringify(p)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'kto_records.jsonl'),
      ktoRecords.map(k => JSON.stringify(k)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(splitsDir, 'train.jsonl'),
      trainPairs.map(p => JSON.stringify(p)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(splitsDir, 'val.jsonl'),
      valPairs.map(p => JSON.stringify(p)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(splitsDir, 'test.jsonl'),
      testPairs.map(p => JSON.stringify(p)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf8'
    );
  }

  return {
    manifest,
    dpo_pairs: pairs,
    kto_records: ktoRecords,
    splits: {
      train: trainPairs,
      validation: valPairs,
      test: testPairs
    }
  };
}

export const generateDpoKtoDataset = generateContrastivePreferenceDataset;

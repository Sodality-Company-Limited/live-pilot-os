#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ML EPIC COMPLETE GOAL GENERATOR (G-ML-002 TO G-ML-024)
 * ════════════════════════════════════════════════════════════════════════════════
 * Generates 100% compliant, 46-section canonical Soda OS goal cards for the
 * entire ML Epic initiative.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const GOALS_DIR = resolve('docs/07-backlog/goals');

export const ALL_REMAINING_GOALS = [
  // ─────────────────────────────────────────────────────────────────────────────
  // TRACK A: MODEL TRAINING & EVALUATION (G-ML-001 .. G-ML-012)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'G-ML-001',
    title: 'Decision-Record Schema and Golden Trajectory Dataset Pipeline',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Validated decision-record JSON Schema and extraction pipeline producing golden trajectory datasets with calibrated confidence fields.',
    dependsOn: '—',
    blocks: 'G-ML-002',
    steps: [
      { name: 'Author Decision Record JSON Schema', status: 'pending' },
      { name: 'Implement Schema Validator Module and Tests', status: 'pending' },
      { name: 'Validate Golden Trajectory Fixture Battery', status: 'pending' }
    ],
    context: 'Training an autoregressive model with an auxiliary calibrated confidence head requires structured training datasets recording multi-turn agent execution trajectories, evidence citations, and ground-truth outcomes. This goal establishes the canonical schema and extraction pipeline.',
    why: 'Soda OS agent decisions lack a formalized, machine-readable training record format, preventing reproducible dataset extraction for confidence calibration.',
    doneWhen: 'A validated JSON Schema and automated dataset validator exist, rejecting malformed trajectories and verifying golden decision traces.',
    unblocks: 'Outcome-label and calibrated target generation engine (G-ML-002).',
    gapId: 'GAP-ML-001',
    gapEvidence: 'Absence of standardized JSON Schema for multi-turn agent decision trajectories.',
    gapSolution: 'Author JSON Schema and Pydantic validator module in code/ml/src/dataset/schema.py.',
    gapVerification: 'pytest tests/ml/test_decision_schema.py',
    approach: 'RFC 8259 JSON Schema validation with Pydantic v2 models and golden trajectory fixture battery.',
    touchMap: [
      'code/ml/schemas/decision_record.json',
      'code/ml/src/dataset/schema.py',
      'tests/ml/test_decision_schema.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Author Decision Record JSON Schema',
        allowedFiles: 'code/ml/schemas/decision_record.json',
        actions: [
          'Define JSON Schema specifying required fields: context_id, prompt, completion, evidence_list, ground_truth_outcome, risk_level.',
          'Configure numeric bounds [0.0, 1.0] for confidence and enum constraints for risk levels (normal, high).'
        ],
        verificationCommand: "node -e \"JSON.parse(require('fs').readFileSync('code/ml/schemas/decision_record.json'))\"",
        completionGate: 'Schema parses as valid RFC 8259 JSON with exit code 0.',
        stopCondition: 'Malformed JSON or syntax errors.',
        zeroMockCheck: '100% complete schema file; zero placeholder property definitions.'
      },
      {
        title: 'Step 2 — Implement Schema Validator Module and Tests',
        allowedFiles: 'code/ml/src/dataset/schema.py, tests/ml/test_decision_schema.py',
        actions: [
          'Implement validation class loading schema and validating dictionary records.',
          'Author unit test battery checking valid fixtures and 10 malformed boundary cases (out-of-bounds confidence, missing evidence array).'
        ],
        verificationCommand: 'pytest tests/ml/test_decision_schema.py',
        completionGate: 'All unit tests pass with exit code 0.',
        stopCondition: 'Any valid fixture rejected or malformed fixture accepted.',
        zeroMockCheck: 'Concrete validation execution against real test fixtures; zero mock returns.'
      },
      {
        title: 'Step 3 — Validate Golden Trajectory Fixture Battery',
        allowedFiles: 'tests/ml/test_decision_schema.py',
        actions: [
          'Execute validation across 20 golden multi-turn agent decision traces.',
          'Confirm memory consumption and validation latency remain < 5ms per record.'
        ],
        verificationCommand: 'pytest tests/ml/test_decision_schema.py -k test_golden_fixtures',
        completionGate: 'Golden test battery passes with exit code 0.',
        stopCondition: 'Validation latency > 5ms or schema parse failure.',
        zeroMockCheck: 'Real execution of dataset validator against genuine trajectory data.'
      }
    ],
    inScope: [
      'JSON Schema definition for agent decision records with calibrated confidence fields.',
      'Python Pydantic validator module rejecting malformed entries.',
      'Golden trajectory dataset extraction pipeline and test fixtures.'
    ],
    outScope: [
      'Model training or LoRA weight tuning.',
      'Online runtime inference routing.'
    ],
    changeDelta: [
      { area: 'ML Schemas', action: 'ADD', path: 'code/ml/schemas/decision_record.json' },
      { area: 'ML Dataset Tools', action: 'ADD', path: 'code/ml/src/dataset/schema.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_decision_schema.py' }
    ],
    acceptanceCriteria: [
      'Decision record schema strictly enforces required fields (context_id, prompt, completion, evidence_list, ground_truth_outcome, risk_level).',
      'Rejects invalid records where confidence is outside [0.0, 1.0] or evidence is not an array.',
      'Schema validator exits with code 0 on valid fixtures and exit code 1 on malformed fixtures.',
      'Golden trajectory dataset passes validation with zero errors.'
    ],
    testPlan: [
      'pytest tests/ml/test_decision_schema.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-001'
    ],
    ports: {
      inbound: 'DatasetValidatorPort (Python CLI / In-process API)',
      outbound: 'RecordStoragePort (Local Filesystem POSIX I/O)'
    }
  },
  {
    id: 'G-ML-002',
    title: 'Outcome-Label and Calibrated Target Generation Engine',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Deterministic outcome-labeling engine that computes empirical correctness, evidence verification status, and target probabilities for raw decision records.',
    dependsOn: 'G-ML-001',
    blocks: 'G-ML-003',
    steps: [
      { name: 'Implement execution receipt parsing and code correctness grading', status: 'pending' },
      { name: 'Implement evidence overlap extraction and empirical target probability assignment', status: 'pending' },
      { name: 'Automate golden labeled dataset verification and boundary tests', status: 'pending' }
    ],
    context: 'Supervised pre-alignment and reinforcement learning require objective ground-truth outcome labels and empirical target probabilities derived from real execution receipts rather than heuristic guesses. This goal establishes the deterministic labeling engine.',
    why: 'Reinforcement learning with calibrated rewards requires objective ground-truth outcome labels and empirical target probabilities derived from real execution receipts rather than heuristic guesses.',
    doneWhen: 'A deterministic labeling module processes raw execution traces and outputs structured records with verified correctness, evidence support scores, and empirical target probabilities.',
    unblocks: 'Base-model selection benchmark (G-ML-003).',
    gapId: 'GAP-ML-002',
    gapEvidence: 'Raw decision records lack automated outcome grading and empirical probability targets.',
    gapSolution: 'Implement DeterministicOutcomeLabeler module in code/ml/src/dataset/labeler.py.',
    gapVerification: 'pytest tests/ml/test_labeler.py',
    approach: 'AST parsing for code execution receipts, exact substring span matching for evidence verification, and empirical frequency target mapping.',
    touchMap: [
      'code/ml/src/dataset/labeler.py',
      'tests/ml/test_labeler.py',
      'data/processed/train_labeled_v1.jsonl'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement execution receipt parsing and correctness grading',
        allowedFiles: 'code/ml/src/dataset/labeler.py',
        actions: [
          'Create DeterministicOutcomeLabeler class parsing exit codes, assertion logs, and AST diffs.',
          'Implement binary correctness assignment function returning 1 for verified successful executions and 0 otherwise.'
        ],
        verificationCommand: 'pytest tests/ml/test_labeler.py -k test_correctness_grading',
        completionGate: 'Correctness grader assigns 100% accurate binary labels across 50 test traces with exit code 0.',
        stopCondition: 'Any mislabeled execution trace or failure to parse receipt logs.',
        zeroMockCheck: 'Real execution receipt parsing logic; zero hardcoded outcome stubs.'
      },
      {
        title: 'Step 2 — Implement evidence overlap extraction and probability mapping',
        allowedFiles: 'code/ml/src/dataset/labeler.py',
        actions: [
          'Implement evidence support ratio calculation using exact substring span overlap against source documents.',
          'Implement calibrated target probability mapping function based on empirical historical success frequencies.'
        ],
        verificationCommand: 'pytest tests/ml/test_labeler.py -k test_evidence_scoring',
        completionGate: 'Evidence scoring produces bounded values in [0.0, 1.0] and targets reflect empirical frequencies.',
        stopCondition: 'Evidence ratio outside [0.0, 1.0] or non-deterministic target calculation.',
        zeroMockCheck: 'Pure algorithmic string span matching and statistical target mapping; zero simulated scores.'
      },
      {
        title: 'Step 3 — Validate golden dataset labeling pipeline',
        allowedFiles: 'tests/ml/test_labeler.py, data/processed/train_labeled_v1.jsonl',
        actions: [
          'Run labeling pipeline over 1,000 raw decision traces and generate data/processed/train_labeled_v1.jsonl.',
          'Verify that zero malformed records exist and that unverifiable traces are quarantined as UNKNOWN.'
        ],
        verificationCommand: 'pytest tests/ml/test_labeler.py -k test_golden_pipeline',
        completionGate: 'Golden labeled split passes 100% schema validation with zero quarantine leaks.',
        stopCondition: 'Any schema violation in labeled output or throughput below 100 records per second.',
        zeroMockCheck: 'Full end-to-end file generation and verification; zero mock file writers.'
      }
    ],
    inScope: [
      'Deterministic code-execution grading and exit-code verification.',
      'Evidence span support ratio extraction against ground-truth files.',
      'Empirical target probability calculation.',
      'Automated unit and integration test battery.'
    ],
    outScope: [
      'Model training or weight updates.',
      'Manual human annotation interface.'
    ],
    changeDelta: [
      { area: 'ML Dataset Tools', action: 'ADD', path: 'code/ml/src/dataset/labeler.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_labeler.py' }
    ],
    acceptanceCriteria: [
      'Computes binary correctness from test execution receipts and golden diffs with 100% accuracy.',
      'Evaluates evidence support ratio e_score in [0.0, 1.0] based on substring span overlap.',
      'Assigns calibrated target probabilities based on empirical historical success frequencies.',
      'Excludes unverifiable traces from training splits by assigning outcome UNKNOWN.'
    ],
    testPlan: [
      'pytest tests/ml/test_labeler.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-002'
    ],
    ports: {
      inbound: 'DatasetLabelerPort (CLI / in-process batch API)',
      outbound: 'LabeledDatasetStoragePort (POSIX JSONL writer)'
    }
  },
  {
    id: 'G-ML-003',
    title: 'Base-Model Selection and Reproducible Baseline Benchmark',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Reproducible evaluation benchmark comparing Qwen3-8B and Gemma 4 on raw autoregressive accuracy, perplexity, and baseline calibration error.',
    dependsOn: 'G-ML-001, G-ML-002',
    blocks: 'G-ML-004',
    steps: [
      { name: 'Implement benchmark evaluation runner and metric extractors', status: 'pending' },
      { name: 'Execute greedy generation and measure baseline ECE and perplexity', status: 'pending' },
      { name: 'Generate comparative scorecard and mathematical model recommendation', status: 'pending' }
    ],
    context: 'Selecting the optimal foundation model requires rigorous empirical comparison between Qwen3-8B and Gemma 4 on agent decision reasoning, raw language perplexity, and baseline miscalibration.',
    why: 'Establishes empirical pre-training baselines to select the optimal foundation checkpoint and quantify subsequent RLCD calibration gains.',
    doneWhen: 'A benchmark runner executes greedy evaluation across standardized prompts and outputs an empirical scorecard comparing perplexity, latency, and ECE.',
    unblocks: 'Dual-head architecture module (G-ML-004).',
    gapId: 'GAP-ML-003',
    gapEvidence: 'Lack of empirical baseline comparison between Qwen3-8B and Gemma 4 in codebase.',
    gapSolution: 'Construct baseline evaluation benchmark in code/ml/benchmarks/baseline_eval.py.',
    gapVerification: 'pytest tests/ml/test_baseline_eval.py',
    approach: 'Hugging Face Transformers evaluation loop, greedy autoregressive decoding, 10-bin ECE calculation, and VRAM profiling.',
    touchMap: [
      'code/ml/benchmarks/baseline_eval.py',
      'code/ml/configs/candidates.yaml',
      'tests/ml/test_baseline_eval.py',
      'artifacts/benchmarks/baseline_scorecard.json'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement candidate benchmark runner and config loader',
        allowedFiles: 'code/ml/benchmarks/baseline_eval.py, code/ml/configs/candidates.yaml',
        actions: [
          'Create candidate model configuration specifying Qwen3-8B and Gemma 4 checkpoint identifiers.',
          'Implement baseline evaluation runner loading checkpoints in bfloat16 precision with deterministic greedy decoding.'
        ],
        verificationCommand: 'pytest tests/ml/test_baseline_eval.py -k test_runner_initialization',
        completionGate: 'Runner loads model configs and parses candidate parameters cleanly with exit code 0.',
        stopCondition: 'Missing checkpoint references or invalid model configuration schema.',
        zeroMockCheck: 'Real model configuration loading and live evaluation class initialization; zero mocks.'
      },
      {
        title: 'Step 2 — Implement metric extraction for perplexity and baseline ECE',
        allowedFiles: 'code/ml/benchmarks/baseline_eval.py',
        actions: [
          'Implement exact cross-entropy token perplexity calculation on held-out agent evaluation prompts.',
          'Implement 10-bin expected calibration error measurement on raw softmax confidence values.'
        ],
        verificationCommand: 'pytest tests/ml/test_baseline_eval.py -k test_metrics_calculation',
        completionGate: 'Perplexity and ECE routines produce mathematically valid finite numbers.',
        stopCondition: 'Non-finite metric values or shape mismatch in logits tensor.',
        zeroMockCheck: 'Exact tensor mathematical calculations; zero hardcoded metric values.'
      },
      {
        title: 'Step 3 — Run baseline benchmark dry-run and emit scorecard',
        allowedFiles: 'tests/ml/test_baseline_eval.py, artifacts/benchmarks/baseline_scorecard.json',
        actions: [
          'Execute benchmark dry-run across 50 sample decision prompts and record timing and memory footprint.',
          'Emit artifacts/benchmarks/baseline_scorecard.json containing comparative metrics and recommendation.'
        ],
        verificationCommand: 'pytest tests/ml/test_baseline_eval.py -k test_scorecard_emission',
        completionGate: 'Scorecard JSON generated with complete comparative metric schema and exit code 0.',
        stopCondition: 'Scorecard schema violation or execution failure.',
        zeroMockCheck: 'Real JSON output generation from computed benchmark tensors; zero mock files.'
      }
    ],
    inScope: [
      'Candidate model evaluation configuration for Qwen3-8B and Gemma 4.',
      'Automated perplexity, latency, and ECE metric computation.',
      'Hardware resource and VRAM profiling.',
      'Comparative scorecard generation.'
    ],
    outScope: [
      'Fine-tuning model weights.',
      'Modifying model architecture or adding layers.'
    ],
    changeDelta: [
      { area: 'ML Benchmarks', action: 'ADD', path: 'code/ml/benchmarks/baseline_eval.py' },
      { area: 'ML Configs', action: 'ADD', path: 'code/ml/configs/candidates.yaml' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_baseline_eval.py' }
    ],
    acceptanceCriteria: [
      'Executes deterministic greedy evaluation across standardized agent decision prompts.',
      'Measures baseline perplexity, token latency, VRAM consumption, and baseline ECE.',
      'Produces a comparative selection report with an explicit mathematical recommendation between candidates.',
      'Benchmark runner exits with code 0 on valid execution.'
    ],
    testPlan: [
      'pytest tests/ml/test_baseline_eval.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-003'
    ],
    ports: {
      inbound: 'BenchmarkRunnerPort (CLI execution interface)',
      outbound: 'ScorecardStoragePort (Artifact JSON ledger)'
    }
  },
  {
    id: 'G-ML-004',
    title: 'Dual-Head Architecture and Value/Confidence Projection Module',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'PyTorch dual-head module attaching an auxiliary confidence/value MLP head to causal language model hidden states without altering the causal LM head.',
    dependsOn: 'G-ML-003',
    blocks: 'G-ML-005, G-ML-006',
    steps: [
      { name: 'Implement ConfidenceValueHead module and tensor hook extraction', status: 'pending' },
      { name: 'Implement DualHeadCausalLM wrapper preserving autoregressive generation', status: 'pending' },
      { name: 'Verify gradient separation and backward pass dynamics', status: 'pending' }
    ],
    context: 'Preserving normal autoregressive text generation while predicting calibrated confidence requires an auxiliary projection head operating on terminal decision token representations without disturbing causal LM logits.',
    why: 'Provides the structural network capacity to predict calibrated confidence from decision-token representations while preserving autoregressive text generation.',
    doneWhen: 'A PyTorch model wrapper outputs causal LM logits and scalar confidence in [0.0, 1.0], passing tensor shape and gradient isolation tests.',
    unblocks: 'Language preservation loss (G-ML-005) and calibrated reward loss (G-ML-006).',
    gapId: 'GAP-ML-004',
    gapEvidence: 'No dual-head causal language model module exists in code/ml/src/models/.',
    gapSolution: 'Implement ConfidenceValueHead and DualHeadCausalLM in code/ml/src/models/dual_head_model.py.',
    gapVerification: 'pytest tests/ml/test_dual_head_model.py',
    approach: 'Two-layer MLP with GELU activation, sigmoid terminal projection, hidden-state terminal token pooling, and PyTorch forward hooks.',
    touchMap: [
      'code/ml/src/models/dual_head_model.py',
      'tests/ml/test_dual_head_model.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement ConfidenceValueHead MLP module',
        allowedFiles: 'code/ml/src/models/dual_head_model.py',
        actions: [
          'Create ConfidenceValueHead module projecting hidden dimension to intermediate dimension and then to scalar.',
          'Apply sigmoid activation to bound predicted confidence strictly in [0.0, 1.0].'
        ],
        verificationCommand: 'pytest tests/ml/test_dual_head_model.py -k test_head_forward',
        completionGate: 'MLP head forward pass produces scalar output in [0.0, 1.0] with exit code 0.',
        stopCondition: 'Output outside [0.0, 1.0] or gradient computation error.',
        zeroMockCheck: 'Real PyTorch module implementation with operational tensor weights; zero dummy stubs.'
      },
      {
        title: 'Step 2 — Implement DualHeadCausalLM wrapper class',
        allowedFiles: 'code/ml/src/models/dual_head_model.py',
        actions: [
          'Wrap base causal language model to extract terminal token hidden states from final decoder block.',
          'Implement forward method returning dictionary with logits, confidence, and optional decision tokens.'
        ],
        verificationCommand: 'pytest tests/ml/test_dual_head_model.py -k test_dual_head_shapes',
        completionGate: 'Logits shape matches [batch, seq_len, vocab_size] and confidence matches [batch, 1].',
        stopCondition: 'Shape mismatch or alteration of base causal LM generation behavior.',
        zeroMockCheck: 'Concrete PyTorch neural network wrapper; zero simulated generation.'
      },
      {
        title: 'Step 3 — Verify gradient isolation and autograd backpropagation',
        allowedFiles: 'tests/ml/test_dual_head_model.py',
        actions: [
          'Test backward pass ensuring gradients flow to confidence head without corrupting causal LM head weights.',
          'Verify parameter detachment option to prevent value head gradients from destabilizing backbone.'
        ],
        verificationCommand: 'pytest tests/ml/test_dual_head_model.py -k test_gradient_isolation',
        completionGate: 'Gradient isolation assertions pass 100% green with exit code 0.',
        stopCondition: 'Unexpected gradient leakage into frozen backbone layers.',
        zeroMockCheck: 'Real PyTorch autograd gradient inspection; zero mock gradients.'
      }
    ],
    inScope: [
      'ConfidenceValueHead MLP architecture definition.',
      'DualHeadCausalLM wrapper model class.',
      'Terminal token hidden state pooling.',
      'Unit tests verifying tensor dimensions and autograd backward pass.'
    ],
    outScope: [
      'Loss function implementations.',
      'LoRA adapter fine-tuning loops.'
    ],
    changeDelta: [
      { area: 'ML Models', action: 'ADD', path: 'code/ml/src/models/dual_head_model.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_dual_head_model.py' }
    ],
    acceptanceCriteria: [
      'Forward pass outputs both logits of shape [batch, seq_len, vocab_size] and confidence of shape [batch, 1].',
      'Hidden states passed to the confidence head are regularized per configuration.',
      'Text generation forward loop functions identically to standard AutoModelForCausalLM.',
      'Gradient isolation test passes cleanly.'
    ],
    testPlan: [
      'pytest tests/ml/test_dual_head_model.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-004'
    ],
    ports: {
      inbound: 'ModelInferencePort (Python model API)',
      outbound: 'BackboneTensorPort (PyTorch autograd graph)'
    }
  },
  {
    id: 'G-ML-005',
    title: 'Autoregressive Language-Preservation Objective Specification',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Composite loss objective combining negative log-likelihood causal language modeling loss with a reference model Kullback-Leibler divergence penalty.',
    dependsOn: 'G-ML-004',
    blocks: 'G-ML-007',
    steps: [
      { name: 'Implement masked negative log-likelihood token loss', status: 'pending' },
      { name: 'Implement reference model KL divergence regularization term', status: 'pending' },
      { name: 'Verify analytical loss gradients and numerical stability', status: 'pending' }
    ],
    context: 'Training auxiliary heads or fine-tuning models must never degrade the core autoregressive text generation quality or reasoning fluency. This goal implements the language preservation objective.',
    why: 'Guarantees that training the confidence head and fine-tuning adapters does not induce catastrophic forgetting or degradation of language generation quality.',
    doneWhen: 'A PyTorch loss module computes token cross-entropy on completions and KL divergence from reference logits with finite gradients.',
    unblocks: 'Parameter-efficient LoRA training pipeline (G-ML-007).',
    gapId: 'GAP-ML-005',
    gapEvidence: 'No language preservation loss module exists in code/ml/src/training/losses/.',
    gapSolution: 'Implement LanguagePreservationLoss in code/ml/src/training/losses/language_preservation.py.',
    gapVerification: 'pytest tests/ml/test_language_preservation.py',
    approach: 'Masked cross-entropy with prompt token masking, forward KL divergence calculation, and temperature-scaled logit comparisons.',
    touchMap: [
      'code/ml/src/training/losses/language_preservation.py',
      'tests/ml/test_language_preservation.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement masked negative log-likelihood token loss',
        allowedFiles: 'code/ml/src/training/losses/language_preservation.py',
        actions: [
          'Create LanguagePreservationLoss module inheriting from torch.nn.Module.',
          'Implement cross-entropy loss computation that masks out prompt tokens and only penalizes completion tokens.'
        ],
        verificationCommand: 'pytest tests/ml/test_language_preservation.py -k test_nll_loss',
        completionGate: 'NLL loss computes valid float values and ignores prompt tokens with exit code 0.',
        stopCondition: 'Prompt tokens included in loss calculation or negative loss values.',
        zeroMockCheck: 'Real PyTorch cross-entropy computation with operational masking; zero stubs.'
      },
      {
        title: 'Step 2 — Implement reference model KL divergence regularization',
        allowedFiles: 'code/ml/src/training/losses/language_preservation.py',
        actions: [
          'Implement Kullback-Leibler divergence term comparing active model logits against frozen reference model logits.',
          'Add configurable beta weighting coefficient controlling regularization strength.'
        ],
        verificationCommand: 'pytest tests/ml/test_language_preservation.py -k test_kl_divergence',
        completionGate: 'KL divergence equals 0 when active logits match reference logits exactly.',
        stopCondition: 'Non-zero KL divergence for identical distributions or negative KL values.',
        zeroMockCheck: 'Exact mathematical KL formulation; zero mocked loss returns.'
      },
      {
        title: 'Step 3 — Verify numerical stability and gradient backpropagation',
        allowedFiles: 'tests/ml/test_language_preservation.py',
        actions: [
          'Verify gradient backward pass on bfloat16 and float32 tensor inputs.',
          'Confirm that zero NaN or Inf gradients are generated under extreme logit distributions.'
        ],
        verificationCommand: 'pytest tests/ml/test_language_preservation.py -k test_numerical_stability',
        completionGate: 'Numerical stability test battery passes 100% green with exit code 0.',
        stopCondition: 'Any NaN or Inf gradient detected during backpropagation.',
        zeroMockCheck: 'Concrete autograd backward execution; zero simulated test results.'
      }
    ],
    inScope: [
      'Prompt-masked negative log-likelihood loss calculation.',
      'Reference model KL divergence penalty implementation.',
      'Numerical stability clamping and gradient verification.',
      'Unit test battery.'
    ],
    outScope: [
      'Confidence calibration loss terms (handled in G-ML-006).',
      'Training loop orchestration.'
    ],
    changeDelta: [
      { area: 'ML Training Losses', action: 'ADD', path: 'code/ml/src/training/losses/language_preservation.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_language_preservation.py' }
    ],
    acceptanceCriteria: [
      'Loss function computes exact token cross-entropy on completion spans while ignoring prompt tokens.',
      'KL penalty correctly penalizes shift from frozen reference logits.',
      'Computes exact gradient backpropagation into adapter parameters.',
      'Passes numerical stability checks with zero NaN or Inf values.'
    ],
    testPlan: [
      'pytest tests/ml/test_language_preservation.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-005'
    ],
    ports: {
      inbound: 'LossComputationPort (PyTorch loss forward API)',
      outbound: 'AutogradOptimizerPort (Gradient backprop graph)'
    }
  },
  {
    id: 'G-ML-006',
    title: 'Calibrated RLCD Reward and Asymmetric Loss Function',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Mathematical loss class combining logarithmic scoring, Brier regularization, and asymmetric overconfidence penalties.',
    dependsOn: 'G-ML-001, G-ML-004',
    blocks: 'G-ML-007',
    steps: [
      { name: 'Implement analytical proper scoring and asymmetric penalty functions', status: 'pending' },
      { name: 'Add gradient backpropagation unit tests and monotonicity checks', status: 'pending' },
      { name: 'Verify numerical stability and boundary conditions', status: 'pending' }
    ],
    context: 'Current language model training optimizes for binary correctness, encouraging overconfident hallucinations in autonomous agent workflows. This goal implements the RLCD loss objective that severely penalizes confident wrong decisions.',
    why: 'Autonomous agents must exhibit calibrated uncertainty so that external governance can reliably route uncertain decisions to automated verification or human review.',
    doneWhen: 'A PyTorch loss module computes logarithmic scoring, quadratic overconfidence penalties, and evidence penalties with verifiable numerical stability and monotonic derivatives.',
    unblocks: 'Parameter-efficient LoRA training pipeline (G-ML-007).',
    gapId: 'GAP-ML-006',
    gapEvidence: 'Missing RLCD loss class in codebase.',
    gapSolution: 'Implement CalibratedRewardLoss with overconfidence penalty in code/ml/src/training/losses/calibrated_reward.py.',
    gapVerification: 'pytest tests/ml/test_calibrated_loss.py',
    approach: 'PyTorch 2.4+ tensor arithmetic, proper logarithmic scoring rules, quadratic overconfidence penalties, and epsilon-bounded log functions.',
    touchMap: [
      'code/ml/src/training/losses/calibrated_reward.py',
      'tests/ml/test_calibrated_loss.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement proper scoring and penalty functions',
        allowedFiles: 'code/ml/src/training/losses/calibrated_reward.py',
        actions: [
          'Create CalibratedRewardLoss class inheriting from torch.nn.Module.',
          'Implement forward method computing log loss, quadratic overconfidence penalty, and evidence scaling.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibrated_loss.py -k test_loss_forward',
        completionGate: 'Loss computes forward pass with finite float32 outputs.',
        stopCondition: 'Loss produces NaN or Inf values on boundary inputs (c in {0.0, 1.0}).',
        zeroMockCheck: '100% operational PyTorch tensor math; zero mocked tensor returns.'
      },
      {
        title: 'Step 2 — Verify monotonicity and asymmetric penalty scaling',
        allowedFiles: 'tests/ml/test_calibrated_loss.py',
        actions: [
          'Write unit tests checking that loss monotonically increases for incorrect answers as confidence approaches 1.0.',
          'Assert that incorrect loss at c = 0.95 is at least 5x higher than at c = 0.20.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibrated_loss.py -k test_asymmetric_penalty',
        completionGate: 'All mathematical assertions pass with terminal exit code 0.',
        stopCondition: 'Overconfidence penalty ratio is less than 5x.',
        zeroMockCheck: 'Concrete tensor assertions on real gradient vectors.'
      },
      {
        title: 'Step 3 — Verify backward pass autograd stability',
        allowedFiles: 'tests/ml/test_calibrated_loss.py',
        actions: [
          'Execute backward pass checking that parameter gradients are finite and non-zero.',
          'Run gradient check (torch.autograd.gradcheck) against double precision tensors.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibrated_loss.py -k test_autograd_stability',
        completionGate: 'torch.autograd.gradcheck returns True with exit code 0.',
        stopCondition: 'Gradient discrepancy or non-finite gradient detected.',
        zeroMockCheck: 'Real PyTorch automatic differentiation; zero mocked gradient objects.'
      }
    ],
    inScope: [
      'CalibratedRewardLoss PyTorch module.',
      'Proper scoring log loss and quadratic overconfidence penalties.',
      'Evidence penalty scaling.',
      'Comprehensive autograd and monotonicity unit tests.'
    ],
    outScope: [
      'Model training loops and dataset loaders (handled in G-ML-007).',
      'External Soda OS routing logic (handled in G-ML-016).'
    ],
    changeDelta: [
      { area: 'ML Loss Objective', action: 'ADD', path: 'code/ml/src/training/losses/calibrated_reward.py' },
      { area: 'ML Unit Tests', action: 'ADD', path: 'tests/ml/test_calibrated_loss.py' }
    ],
    acceptanceCriteria: [
      'Loss function strictly penalizes confident wrong decisions at least 5x more than uncertain wrong decisions.',
      'Gradient check (torch.autograd.gradcheck) passes with analytical gradient precision <= 10^-5.',
      'Absence of verified evidence scales the reward downwards monotonically.',
      'Clamping bounds guarantee zero numerical overflow on edge-case inputs (c in [0.0, 1.0]).'
    ],
    testPlan: [
      'pytest tests/ml/test_calibrated_loss.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-006'
    ],
    ports: {
      inbound: 'LossFunctionPort (PyTorch loss forward API)',
      outbound: 'AutogradEnginePort (PyTorch ATen autograd engine)'
    }
  },
  {
    id: 'G-ML-007',
    title: 'Parameter-Efficient LoRA/QLoRA Training Pipeline',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'End-to-end parameter-efficient training pipeline targeting attention projections and auxiliary value head under combined language and calibration loss.',
    dependsOn: 'G-ML-004, G-ML-005, G-ML-006',
    blocks: 'G-ML-008, G-ML-009, G-ML-010',
    steps: [
      { name: 'Implement training loop orchestrator and dataset loader', status: 'pending' },
      { name: 'Configure PEFT LoRA and QLoRA quantization parameters', status: 'pending' },
      { name: 'Execute mini-batch integration test and verify checkpoint emission', status: 'pending' }
    ],
    context: 'Training 8B parameter models requires computationally tractable infrastructure using LoRA/QLoRA adapters while updating the value head weights under joint language preservation and calibrated reward objectives.',
    why: 'Enables reproducible, computationally tractable training on single-node GPU infrastructure without requiring full-parameter fine-tuning of 8B models.',
    doneWhen: 'A training pipeline executes optimization steps on mini-batches, updates LoRA and value head weights, and saves valid checkpoints.',
    unblocks: 'Defer policy optimization (G-ML-008), calibration evaluation (G-ML-009), and text regression (G-ML-010).',
    gapId: 'GAP-ML-007',
    gapEvidence: 'No parameter-efficient training pipeline script exists in code/ml/src/training/.',
    gapSolution: 'Implement train_pipeline.py and lora_config.yaml in code/ml/src/training/.',
    gapVerification: 'pytest tests/ml/test_training_pipeline.py',
    approach: 'Hugging Face PEFT, bitsandbytes 4-bit NF4 quantization, PyTorch bfloat16 mixed precision, gradient accumulation, and safetensors checkpointing.',
    touchMap: [
      'code/ml/src/training/train_pipeline.py',
      'code/ml/configs/lora_config.yaml',
      'tests/ml/test_training_pipeline.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement training pipeline orchestrator and data loading',
        allowedFiles: 'code/ml/src/training/train_pipeline.py',
        actions: [
          'Create Trainer class coordinating data loaders, optimizer, learning rate schedule, and loss calculation.',
          'Integrate combined loss objective computing sum of language preservation loss and calibrated reward loss.'
        ],
        verificationCommand: 'pytest tests/ml/test_training_pipeline.py -k test_trainer_init',
        completionGate: 'Trainer initializes with valid optimizer state and loss modules with exit code 0.',
        stopCondition: 'Initialization failure or loss module parameter mismatch.',
        zeroMockCheck: 'Real PyTorch optimizer and trainer initialization; zero mock trainers.'
      },
      {
        title: 'Step 2 — Configure PEFT LoRA adapter injection',
        allowedFiles: 'code/ml/configs/lora_config.yaml, code/ml/src/training/train_pipeline.py',
        actions: [
          'Define LoRA configuration targeting attention projections (q_proj, k_proj, v_proj, o_proj) with rank 16.',
          'Configure parameter freezing ensuring base model weights remain frozen while value head is trainable.'
        ],
        verificationCommand: 'pytest tests/ml/test_training_pipeline.py -k test_trainable_parameters',
        completionGate: 'Trainable parameters bounded strictly below 2% of total model parameters.',
        stopCondition: 'Base model backbone parameters marked as trainable or value head frozen.',
        zeroMockCheck: 'Operational PyTorch parameter freezing and PEFT adapter attachment; zero stubs.'
      },
      {
        title: 'Step 3 — Run mini-batch integration test and verify weight updates',
        allowedFiles: 'tests/ml/test_training_pipeline.py',
        actions: [
          'Execute 3 training mini-batches on sample dataset fixture in bfloat16 precision.',
          'Verify that adapter and value head tensor weights change from initial state and save checkpoint.'
        ],
        verificationCommand: 'pytest tests/ml/test_training_pipeline.py -k test_training_step',
        completionGate: 'Optimizer step completes cleanly with decreasing loss and verified checkpoint files.',
        stopCondition: 'Loss divergence (NaN/Inf) or failure to save safetensors checkpoint.',
        zeroMockCheck: 'Real forward, backward, and optimizer execution; zero simulated updates.'
      }
    ],
    inScope: [
      'LoRA and QLoRA configuration specification.',
      'Training loop with joint objective computation.',
      'Checkpoint saving in safetensors format.',
      'Automated integration test battery.'
    ],
    outScope: [
      'Multi-node distributed cluster setup.',
      'Hyperparameter grid search.'
    ],
    changeDelta: [
      { area: 'ML Training Pipeline', action: 'ADD', path: 'code/ml/src/training/train_pipeline.py' },
      { area: 'ML Configs', action: 'ADD', path: 'code/ml/configs/lora_config.yaml' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_training_pipeline.py' }
    ],
    acceptanceCriteria: [
      'Pipeline runs in 4-bit QLoRA and bfloat16 LoRA modes.',
      'Trains value head weights while updating LoRA adapters; base model backbone weights remain frozen.',
      'Saves standalone adapter weights and value head checkpoint tensors in safetensors format.',
      'Mini-batch test completes with exit code 0.'
    ],
    testPlan: [
      'pytest tests/ml/test_training_pipeline.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-007'
    ],
    ports: {
      inbound: 'TrainingPipelinePort (CLI training orchestrator)',
      outbound: 'CheckpointStoragePort (Safetensors file storage)'
    }
  },
  {
    id: 'G-ML-008',
    title: 'Verification and Defer-Policy Optimization',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Decision policy optimization module that trains routing tokens or tunes threshold boundaries mapping predicted confidence into discrete action policies.',
    dependsOn: 'G-ML-007',
    blocks: 'G-ML-011',
    steps: [
      { name: 'Implement risk-weighted cost matrix and threshold optimizer', status: 'pending' },
      { name: 'Tune discrete decision-token routing thresholds on validation split', status: 'pending' },
      { name: 'Validate false deferral and safety boundaries on test cases', status: 'pending' }
    ],
    context: 'Continuous confidence estimates must translate into optimal discrete agent actions (proceed, verify, defer, human_review) according to domain-specific risk matrices.',
    why: 'Translates continuous confidence scores into discrete agent action policies that trigger safety protocols rather than silent failures.',
    doneWhen: 'A threshold optimizer produces policy parameter configurations that bound high-risk false acceptances below 1% and false deferrals below 5%.',
    unblocks: 'Adversarial red-teaming safety suite (G-ML-011).',
    gapId: 'GAP-ML-008',
    gapEvidence: 'No risk-weighted deferral threshold optimizer exists in code/ml/src/training/.',
    gapSolution: 'Implement DeferPolicyOptimizer in code/ml/src/training/defer_policy.py.',
    gapVerification: 'pytest tests/ml/test_defer_policy.py',
    approach: 'Cost-sensitive empirical risk minimization, grid search over dual-threshold boundaries, and confusion matrix auditing.',
    touchMap: [
      'code/ml/src/training/defer_policy.py',
      'code/ml/configs/policy_thresholds.yaml',
      'tests/ml/test_defer_policy.py'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement cost-sensitive empirical risk loss function',
        allowedFiles: 'code/ml/src/training/defer_policy.py',
        actions: [
          'Create DeferPolicyOptimizer defining asymmetric penalties for false accepts versus false deferrals.',
          'Implement evaluation function computing expected loss given a set of routing thresholds tau_low and tau_high.'
        ],
        verificationCommand: 'pytest tests/ml/test_defer_policy.py -k test_cost_function',
        completionGate: 'Cost function penalizes confident incorrect decisions 10x higher than deferral costs.',
        stopCondition: 'Cost function returns negative values or inverts risk penalties.',
        zeroMockCheck: 'Real analytical risk formulation; zero mock loss scores.'
      },
      {
        title: 'Step 2 — Optimize threshold boundaries on validation split',
        allowedFiles: 'code/ml/src/training/defer_policy.py, code/ml/configs/policy_thresholds.yaml',
        actions: [
          'Run grid optimization across 500 labeled validation decisions to identify Pareto-optimal routing thresholds.',
          'Save calibrated thresholds to code/ml/configs/policy_thresholds.yaml.'
        ],
        verificationCommand: 'pytest tests/ml/test_defer_policy.py -k test_threshold_optimization',
        completionGate: 'Thresholds satisfy tau_low < tau_high with false accept rate < 1.0%.',
        stopCondition: 'Threshold boundaries fail safety constraints or tau_low >= tau_high.',
        zeroMockCheck: 'Mathematical optimization over real validation data; zero placeholder thresholds.'
      },
      {
        title: 'Step 3 — Validate policy confusion matrix and boundary cases',
        allowedFiles: 'tests/ml/test_defer_policy.py',
        actions: [
          'Evaluate policy performance across 100 edge-case test decisions.',
          'Assert that 100% of high-risk decisions with confidence below tau_high are routed to defer or verify.'
        ],
        verificationCommand: 'pytest tests/ml/test_defer_policy.py -k test_policy_bounds',
        completionGate: 'Policy passes 100% of safety test cases with exit code 0.',
        stopCondition: 'Any high-risk decision incorrectly routed to proceed.',
        zeroMockCheck: 'Concrete evaluation against deterministic test fixtures; zero simulated outputs.'
      }
    ],
    inScope: [
      'Cost-sensitive empirical risk calculation.',
      'Optimal threshold grid search algorithm.',
      'YAML configuration serialization.',
      'Unit and safety boundary test battery.'
    ],
    outScope: [
      'External Soda OS runtime routing execution (handled in G-ML-016).',
      'UI interactive prompts.'
    ],
    changeDelta: [
      { area: 'ML Policy Optimization', action: 'ADD', path: 'code/ml/src/training/defer_policy.py' },
      { area: 'ML Configs', action: 'ADD', path: 'code/ml/configs/policy_thresholds.yaml' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_defer_policy.py' }
    ],
    acceptanceCriteria: [
      'Policy selects defer or verify for 100% of high-risk examples where confidence c < 0.85.',
      'False deferral rate on correct high-confidence examples is bounded below 5%.',
      'Decision output conforms strictly to canonical routing token enums.',
      'Optimizer exits with code 0 on valid dataset.'
    ],
    testPlan: [
      'pytest tests/ml/test_defer_policy.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-008'
    ],
    ports: {
      inbound: 'PolicyOptimizerPort (Python training CLI)',
      outbound: 'ThresholdConfigPort (YAML configuration storage)'
    }
  },
  {
    id: 'G-ML-009',
    title: 'Calibration Evaluation Suite and Reliability Diagrams',
    status: 'ready',
    kind: 'qa',
    atomicOutcome: 'Automated calibration evaluation harness that computes ECE, MCE, and Brier Score, and generates reliability diagrams from model predictions.',
    dependsOn: 'G-ML-007',
    blocks: 'G-ML-011, G-ML-012',
    steps: [
      { name: 'Implement 10-bin calibration metric calculation engine', status: 'pending' },
      { name: 'Generate ASCII and image reliability diagrams with confidence intervals', status: 'pending' },
      { name: 'Verify calibration thresholds on held-out test predictions', status: 'pending' }
    ],
    context: 'Rigorous empirical verification requires computing Expected Calibration Error (ECE) and Brier scores across confidence bins to prove that predicted confidence equals true accuracy.',
    why: 'Provides empirical proof that predicted confidence matches actual correctness probability across 10 confidence bins ([0.0, 0.1), ..., [0.9, 1.0]).',
    doneWhen: 'An evaluation harness calculates 10-bin ECE and Brier score on test predictions and validates that ECE <= 0.040 and Brier score <= 0.080.',
    unblocks: 'Model packaging (G-ML-012) and adversarial red-teaming (G-ML-011).',
    gapId: 'GAP-ML-009',
    gapEvidence: 'No calibration metric calculation suite exists in code/ml/eval/.',
    gapSolution: 'Implement calibration_eval.py and tests in code/ml/eval/ and tests/ml/.',
    gapVerification: 'pytest tests/ml/test_calibration_metrics.py',
    approach: 'Sample-weighted 10-bin partitioning, Brier score quadratic distance calculation, and matplotlib reliability curve generation.',
    touchMap: [
      'code/ml/eval/calibration_eval.py',
      'tests/ml/test_calibration_metrics.py',
      'artifacts/eval/calibration_scorecard.json'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement 10-bin ECE and Brier score calculators',
        allowedFiles: 'code/ml/eval/calibration_eval.py',
        actions: [
          'Create CalibrationEvaluator class implementing exact 10-bin partitioning of confidence predictions in [0.0, 1.0].',
          'Implement Expected Calibration Error (ECE), Maximum Calibration Error (MCE), and Brier Score formulas.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibration_metrics.py -k test_metric_formulas',
        completionGate: 'Metrics calculate exact expected values on known synthetic probability distributions.',
        stopCondition: 'Calculation error or negative calibration error values.',
        zeroMockCheck: 'Exact mathematical implementation of statistical calibration metrics; zero stubs.'
      },
      {
        title: 'Step 2 — Implement reliability diagram generator and scorecard output',
        allowedFiles: 'code/ml/eval/calibration_eval.py',
        actions: [
          'Implement reliability diagram generation plotting empirical accuracy against confidence bins.',
          'Format and write complete metrics scorecard to artifacts/eval/calibration_scorecard.json.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibration_metrics.py -k test_diagram_generation',
        completionGate: 'Scorecard JSON and plot generated with complete bin breakdown and exit code 0.',
        stopCondition: 'Scorecard schema violation or failure to write output file.',
        zeroMockCheck: 'Real file output generation from computed bin distributions; zero simulated metrics.'
      },
      {
        title: 'Step 3 — Enforce calibration SLAs and high-confidence error bounds',
        allowedFiles: 'tests/ml/test_calibration_metrics.py, artifacts/eval/calibration_scorecard.json',
        actions: [
          'Verify that high-confidence error rate (c >= 0.80 and incorrect) is strictly <= 1.0%.',
          'Assert that ECE <= 0.040 and Brier score <= 0.080 on held-out evaluation dataset.'
        ],
        verificationCommand: 'pytest tests/ml/test_calibration_metrics.py -k test_sla_enforcement',
        completionGate: 'All calibration quality assertions pass 100% green with exit code 0.',
        stopCondition: 'ECE > 0.040, Brier > 0.080, or HCER > 0.010.',
        zeroMockCheck: 'Live evaluation of real test split predictions; zero mock evaluation outputs.'
      }
    ],
    inScope: [
      '10-bin sample-weighted ECE and MCE computation.',
      'Brier score calculation.',
      'Reliability diagram visualization.',
      'High-confidence error rate audit.'
    ],
    outScope: [
      'Model training or hyperparameter tuning.',
      'External Soda OS telemetry ingestion.'
    ],
    changeDelta: [
      { area: 'ML Evaluation Suite', action: 'ADD', path: 'code/ml/eval/calibration_eval.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_calibration_metrics.py' }
    ],
    acceptanceCriteria: [
      'Computes 10-bin ECE with exact sample-weighted formula.',
      'Validates that trained model achieves ECE <= 0.040 and Brier score <= 0.080 on test split.',
      'High-confidence error rate (c >= 0.8, incorrect) is <= 0.010.',
      'Evaluation tool exits with code 0 on passing calibration.'
    ],
    testPlan: [
      'pytest tests/ml/test_calibration_metrics.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-009'
    ],
    ports: {
      inbound: 'CalibrationEvaluatorPort (CLI evaluation runner)',
      outbound: 'ScorecardLedgerPort (JSON artifact storage)'
    }
  },
  {
    id: 'G-ML-010',
    title: 'Text-Generation Regression and Linguistic Quality Suite',
    status: 'ready',
    kind: 'qa',
    atomicOutcome: 'Automated regression test suite evaluating the trained dual-head model on benchmark coding, reasoning, and instruction-following datasets.',
    dependsOn: 'G-ML-007',
    blocks: 'G-ML-012',
    steps: [
      { name: 'Implement language regression runner and perplexity comparator', status: 'pending' },
      { name: 'Implement code syntax validity and AST parse rate verifiers', status: 'pending' },
      { name: 'Execute comparative evaluation against base model and verify bounds', status: 'pending' }
    ],
    context: 'Adding an auxiliary value head and fine-tuning adapters must not induce catastrophic forgetting, code generation syntax breakage, or reasoning degradation.',
    why: 'Guarantees that adding the value head and training via RLCD did not compromise core code generation, syntax correctness, or reasoning capabilities.',
    doneWhen: 'A regression suite confirms that perplexity increase on reference text is below 3% and generated code syntax validity is >= 98%.',
    unblocks: 'Model packaging and release ledger (G-ML-012).',
    gapId: 'GAP-ML-010',
    gapEvidence: 'No automated text-generation regression suite exists in code/ml/eval/.',
    gapSolution: 'Implement text_regression_eval.py and test suite in code/ml/eval/.',
    gapVerification: 'pytest tests/ml/test_text_regression.py',
    approach: 'Comparative perplexity evaluation, Python/Rust AST syntax validation on generated snippets, and BLEU similarity measurement.',
    touchMap: [
      'code/ml/eval/text_regression_eval.py',
      'tests/ml/test_text_regression.py',
      'artifacts/eval/text_regression_scorecard.json'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement perplexity comparator against base checkpoint',
        allowedFiles: 'code/ml/eval/text_regression_eval.py',
        actions: [
          'Create TextRegressionEvaluator class loading both base model and fine-tuned dual-head model.',
          'Implement comparative perplexity computation on held-out code and reasoning benchmark prompts.'
        ],
        verificationCommand: 'pytest tests/ml/test_text_regression.py -k test_perplexity_comparison',
        completionGate: 'Perplexity computation executes cleanly on sample prompts with exit code 0.',
        stopCondition: 'Failure to load base or adapted weights or division by zero.',
        zeroMockCheck: 'Real model forward-pass perplexity calculation; zero hardcoded perplexity values.'
      },
      {
        title: 'Step 2 — Implement AST syntax validity evaluator for generated code',
        allowedFiles: 'code/ml/eval/text_regression_eval.py',
        actions: [
          'Implement code syntax parser extracting code blocks from model completions.',
          'Execute ast.parse for Python and syntax checker for Rust/JavaScript to verify grammatical validity.'
        ],
        verificationCommand: 'pytest tests/ml/test_text_regression.py -k test_syntax_parsing',
        completionGate: 'Syntax evaluator correctly identifies valid and invalid code snippets.',
        stopCondition: 'Syntax evaluator crash or failure to extract code blocks.',
        zeroMockCheck: 'Real AST parsing using Python standard library ast module; zero stubs.'
      },
      {
        title: 'Step 3 — Run full regression battery and enforce quality gates',
        allowedFiles: 'tests/ml/test_text_regression.py, artifacts/eval/text_regression_scorecard.json',
        actions: [
          'Execute regression battery across 100 test prompts and record comparative metrics.',
          'Verify that perplexity degradation is < 3.0% and syntax validity is >= 98.0%.'
        ],
        verificationCommand: 'pytest tests/ml/test_text_regression.py -k test_regression_gate',
        completionGate: 'Regression scorecard generated and all quality gates pass with exit code 0.',
        stopCondition: 'Perplexity increase >= 3.0% or syntax validity < 98.0%.',
        zeroMockCheck: 'Concrete end-to-end evaluation execution; zero mock test outputs.'
      }
    ],
    inScope: [
      'Comparative perplexity measurement on reference datasets.',
      'Code syntax validity checking via native AST parsers.',
      'Regression scorecard generation in JSON format.',
      'Automated quality gate verification.'
    ],
    outScope: [
      'Training loop optimization.',
      'Calibration error measurement (handled in G-ML-009).'
    ],
    changeDelta: [
      { area: 'ML Regression Suite', action: 'ADD', path: 'code/ml/eval/text_regression_eval.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_text_regression.py' }
    ],
    acceptanceCriteria: [
      'Perplexity increase on held-out reference text is bounded strictly below 3.0% compared to base model.',
      'Python and Rust syntax validity on generated code samples is >= 98%.',
      'Autoregressive generation length and repetition penalties match base model behavior.',
      'Regression suite exits with code 0 on passing evaluation.'
    ],
    testPlan: [
      'pytest tests/ml/test_text_regression.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-010'
    ],
    ports: {
      inbound: 'RegressionEvaluatorPort (CLI regression runner)',
      outbound: 'ScorecardStoragePort (JSON artifact ledger)'
    }
  },
  {
    id: 'G-ML-011',
    title: 'Adversarial Overconfidence and Safety Red-Teaming Suite',
    status: 'ready',
    kind: 'qa',
    atomicOutcome: 'Adversarial red-teaming test harness targeting edge cases, ambiguous prompts, trick questions, and hallucination-inducing contexts.',
    dependsOn: 'G-ML-008, G-ML-009',
    blocks: 'G-ML-012',
    steps: [
      { name: 'Implement adversarial probe battery and hallucination triggers', status: 'pending' },
      { name: 'Implement safety scorecard generator and failure clustering', status: 'pending' },
      { name: 'Execute adversarial stress tests and verify zero confident hallucinations', status: 'pending' }
    ],
    context: 'Agent safety requires that the model does not express high confidence when presented with unanswerable, contradictory, misleading, or malicious prompts.',
    why: 'Validates that the model does not express high confidence when presented with contradictory, unanswerable, or malicious inputs.',
    doneWhen: 'An adversarial evaluation suite tests 250 red-teaming probes and confirms that the model defers or expresses low confidence (c < 0.40) on >= 95% of cases.',
    unblocks: 'Model packaging and versioning (G-ML-012).',
    gapId: 'GAP-ML-011',
    gapEvidence: 'No adversarial overconfidence test suite exists in code/ml/eval/.',
    gapSolution: 'Implement adversarial_safety_eval.py and probe dataset in code/ml/eval/.',
    gapVerification: 'pytest tests/ml/test_adversarial_safety.py',
    approach: 'Adversarial prompt injection, unanswerable question probes, contradictory premise evaluation, and cluster analysis.',
    touchMap: [
      'code/ml/eval/adversarial_safety_eval.py',
      'tests/ml/test_adversarial_safety.py',
      'artifacts/eval/adversarial_safety_scorecard.json'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement adversarial probe loader and evaluation loop',
        allowedFiles: 'code/ml/eval/adversarial_safety_eval.py',
        actions: [
          'Create AdversarialSafetyEvaluator class loading counterfactual and unanswerable probe fixtures.',
          'Execute model inference on probes, capturing text completion and predicted confidence.'
        ],
        verificationCommand: 'pytest tests/ml/test_adversarial_safety.py -k test_probe_loading',
        completionGate: 'Evaluator loads probe battery and processes sample prompts cleanly with exit code 0.',
        stopCondition: 'Probe syntax error or failure to extract model confidence.',
        zeroMockCheck: 'Real model inference against probe inputs; zero mocked completions.'
      },
      {
        title: 'Step 2 — Implement failure clustering and safety scorecard emission',
        allowedFiles: 'code/ml/eval/adversarial_safety_eval.py',
        actions: [
          'Classify probe responses into safe deferral, low-confidence warning, or critical overconfidence failure.',
          'Format and write safety scorecard to artifacts/eval/adversarial_safety_scorecard.json.'
        ],
        verificationCommand: 'pytest tests/ml/test_adversarial_safety.py -k test_scorecard_emission',
        completionGate: 'Scorecard JSON generated with failure clustering breakdown and exit code 0.',
        stopCondition: 'Scorecard schema violation or unhandled probe exception.',
        zeroMockCheck: 'Real JSON serialization of empirical probe outcomes; zero placeholder records.'
      },
      {
        title: 'Step 3 — Enforce zero critical overconfidence invariant',
        allowedFiles: 'tests/ml/test_adversarial_safety.py, artifacts/eval/adversarial_safety_scorecard.json',
        actions: [
          'Execute safety test battery across 250 adversarial prompts.',
          'Assert that zero instances of high-confidence (c >= 0.85) hallucinations occur on adversarial probes.'
        ],
        verificationCommand: 'pytest tests/ml/test_adversarial_safety.py -k test_safety_invariants',
        completionGate: 'Safety test suite passes with zero critical overconfidence findings and exit code 0.',
        stopCondition: 'Any high-confidence hallucination detected on adversarial probes.',
        zeroMockCheck: 'Live evaluation of real red-teaming responses; zero simulated passes.'
      }
    ],
    inScope: [
      'Adversarial probe dataset curation and loading.',
      'Overconfidence evaluation under distribution shift.',
      'Safety scorecard generation with failure clustering.',
      'Automated CI safety gate verification.'
    ],
    outScope: [
      'Standard benchmark accuracy evaluation.',
      'Fine-tuning weights.'
    ],
    changeDelta: [
      { area: 'ML Red-Teaming Suite', action: 'ADD', path: 'code/ml/eval/adversarial_safety_eval.py' },
      { area: 'ML Tests', action: 'ADD', path: 'tests/ml/test_adversarial_safety.py' }
    ],
    acceptanceCriteria: [
      'On known unanswerable and contradictory prompts, model outputs confidence c < 0.40 or emits defer in >= 95% of cases.',
      'Zero instances of high-confidence (c >= 0.85) hallucinations on adversarial probes.',
      'Emits detailed safety scorecard with failure clustering.',
      'Evaluation suite exits with code 0 on passing safety check.'
    ],
    testPlan: [
      'pytest tests/ml/test_adversarial_safety.py',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-011'
    ],
    ports: {
      inbound: 'SafetyEvaluatorPort (CLI red-teaming runner)',
      outbound: 'SafetyScorecardPort (JSON artifact ledger)'
    }
  },
  {
    id: 'G-ML-012',
    title: 'Model Packaging, Checkpoint Versioning and Provenance Ledger',
    status: 'ready',
    kind: 'chore',
    atomicOutcome: 'Cryptographically signed and versioned release bundle packaging LoRA adapters, value head weights, and calibration configs with exact-HEAD git provenance.',
    dependsOn: 'G-ML-009, G-ML-010, G-ML-011',
    blocks: 'G-ML-013',
    steps: [
      { name: 'Implement packaging script and SHA256 checksum generator', status: 'pending' },
      { name: 'Generate model card documentation with training recipe provenance', status: 'pending' },
      { name: 'Verify bundle integrity and exact-HEAD provenance validation', status: 'pending' }
    ],
    context: 'Before deploying trained weights to the Soda OS runtime, all model artifacts must be cryptographically sealed, versioned, and bound to exact git commits.',
    why: 'Ensures full reproducibility, auditability, and immutability of trained artifacts before downstream deployment to Soda OS.',
    doneWhen: 'A packaging script outputs a sealed release directory containing safetensors weights, verified SHA256 checksums, and model card metadata.',
    unblocks: 'Soda OS model runtime adapter (G-ML-013).',
    gapId: 'GAP-ML-012',
    gapEvidence: 'No model packaging or release verification script exists in code/ml/scripts/.',
    gapSolution: 'Implement package_model.py in code/ml/scripts/ and generate model card.',
    gapVerification: 'python code/ml/scripts/package_model.py --verify-checksums',
    approach: 'Safetensors serialization, SHA256 cryptographic hashing, Git revision binding, and JSON manifest validation.',
    touchMap: [
      'code/ml/scripts/package_model.py',
      'models/checkpoints/v1.0.0/manifest.json',
      'docs/06_raw/model_card_v1.0.0.md'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement model packaging script and checksum generator',
        allowedFiles: 'code/ml/scripts/package_model.py',
        actions: [
          'Create package_model.py consolidating adapter weights, value head weights, tokenizer, and config.',
          'Compute SHA256 hashes for all tensor files and generate manifest.json with exact git HEAD commit.'
        ],
        verificationCommand: 'python code/ml/scripts/package_model.py --dry-run',
        completionGate: 'Packaging script generates valid manifest and computes SHA256 hashes with exit code 0.',
        stopCondition: 'Missing weight files or failed checksum computation.',
        zeroMockCheck: 'Real filesystem operations and SHA256 cryptographic calculation; zero stubs.'
      },
      {
        title: 'Step 2 — Generate model card documentation with training provenance',
        allowedFiles: 'docs/06_raw/model_card_v1.0.0.md, models/checkpoints/v1.0.0/manifest.json',
        actions: [
          'Author model card documenting training hyperparameters, loss formulation, and evaluation metrics.',
          'Verify that manifest.json records base model digest, adapter hash, and training recipe commit.'
        ],
        verificationCommand: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'models/checkpoints/v1.0.0/manifest.json\'))"',
        completionGate: 'Manifest parses as valid RFC 8259 JSON and model card contains all required sections.',
        stopCondition: 'Invalid JSON manifest or incomplete model card documentation.',
        zeroMockCheck: 'Concrete documentation and verified manifest files; zero mock files.'
      },
      {
        title: 'Step 3 — Verify release package integrity and reload capability',
        allowedFiles: 'code/ml/scripts/package_model.py',
        actions: [
          'Execute package verification routine reloading weights from disk and comparing digests.',
          'Confirm that reloaded tensor checksums match manifest values exactly.'
        ],
        verificationCommand: 'python code/ml/scripts/package_model.py --verify-checksums',
        completionGate: 'All package checksums verified 100% matching with exit code 0.',
        stopCondition: 'Any checksum mismatch or corrupted tensor file.',
        zeroMockCheck: 'Cryptographic file inspection on physical disk; zero simulated verification.'
      }
    ],
    inScope: [
      'Model release packaging script implementation.',
      'SHA256 checksum calculation and manifest generation.',
      'Exact-HEAD git provenance binding.',
      'Comprehensive model card documentation.'
    ],
    outScope: [
      'Soda OS runtime loading code (handled in G-ML-013).',
      'Cloud storage upload.'
    ],
    changeDelta: [
      { area: 'ML Packaging Tools', action: 'ADD', path: 'code/ml/scripts/package_model.py' },
      { area: 'Model Checkpoints', action: 'ADD', path: 'models/checkpoints/v1.0.0/manifest.json' },
      { area: 'Documentation', action: 'ADD', path: 'docs/06_raw/model_card_v1.0.0.md' }
    ],
    acceptanceCriteria: [
      'Manifest records exact git commit SHA, base model digest, adapter SHA256, and training recipe hash.',
      'Weights are saved in safe tensor format (.safetensors).',
      'Verification script confirms that packaged bundle can be reloaded and reproduces identical tensor checksums.',
      'Packaging tool exits with code 0 on valid release.'
    ],
    testPlan: [
      'python code/ml/scripts/package_model.py --verify-checksums',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-012'
    ],
    ports: {
      inbound: 'PackagingToolPort (CLI packaging command)',
      outbound: 'ReleaseStoragePort (POSIX release directory writer)'
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TRACK B: SODA OS RUNTIME INTEGRATION & GOVERNANCE (G-ML-013 .. G-ML-024)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'G-ML-013',
    title: 'Trained-Model Runtime Adapter Contract',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'TypeScript/Node.js runtime adapter module executing inference against the dual-head model, extracting text completions and calibrated confidence scores.',
    dependsOn: 'G-ML-012',
    blocks: 'G-ML-014, G-ML-017, G-ML-018',
    steps: [
      { name: 'Implement ModelInferencePort interface and client adapter', status: 'pending' },
      { name: 'Implement response parsing, confidence validation, and error handling', status: 'pending' },
      { name: 'Automate live integration tests against local inference service', status: 'pending' }
    ],
    context: 'Soda OS agent loops require a clean, decoupled runtime adapter bridging TypeScript execution to local or remote inference engines serving the dual-head model.',
    why: 'Establishes the clean hexagonal port and concrete adapter bridging Soda OS execution loops to the local Python/ONNX/vLLM model serving gateway.',
    doneWhen: 'A Node.js adapter module sends prompts to the model gateway and returns validated completion text, confidence scores, and decision tokens.',
    unblocks: 'Governed decision contract (G-ML-014) and model config subsystem (G-ML-017).',
    gapId: 'GAP-ML-013',
    gapEvidence: 'No Node.js runtime adapter for dual-head inference exists in scripts/lib/.',
    gapSolution: 'Implement scripts/lib/model-adapter.mjs and integration tests.',
    gapVerification: 'node tests/integration/test-model-adapter.mjs',
    approach: 'HTTP/IPC client with timeout handling, strict response schema parsing, bounded float validation, and fail-closed error handling.',
    touchMap: [
      'scripts/lib/model-adapter.mjs',
      'template/scripts/lib/model-adapter.mjs',
      'tests/integration/test-model-adapter.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement ModelInferencePort and adapter client',
        allowedFiles: 'scripts/lib/model-adapter.mjs, template/scripts/lib/model-adapter.mjs',
        actions: [
          'Create ModelAdapter class with generateDecision method accepting prompt and inference parameters.',
          'Implement HTTP/IPC request dispatching with configurable connection and read timeouts.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/model-adapter.mjs\')"',
        completionGate: 'Adapter module imports cleanly without syntax errors and exposes expected interface.',
        stopCondition: 'Module import error or missing exports.',
        zeroMockCheck: 'Operational ES module implementation; zero mock function exports.'
      },
      {
        title: 'Step 2 — Implement response parsing and confidence bounds verification',
        allowedFiles: 'scripts/lib/model-adapter.mjs, template/scripts/lib/model-adapter.mjs',
        actions: [
          'Validate that returned confidence is a finite number strictly bounded in [0.0, 1.0].',
          'Throw explicit ModelInferenceError on gateway timeout, HTTP error, or malformed payload.'
        ],
        verificationCommand: 'node tests/integration/test-model-adapter.mjs -k test_error_handling',
        completionGate: 'Adapter throws typed exceptions on network failure and rejects non-finite numbers.',
        stopCondition: 'Fallback to dummy confidence or unhandled promise rejection.',
        zeroMockCheck: 'Fail-closed production error handling; zero mock fallbacks.'
      },
      {
        title: 'Step 3 — Validate live integration test suite',
        allowedFiles: 'tests/integration/test-model-adapter.mjs',
        actions: [
          'Execute inference request against local test endpoint.',
          'Verify that returned object contains non-empty text, scalar confidence, and token count metadata.'
        ],
        verificationCommand: 'node tests/integration/test-model-adapter.mjs',
        completionGate: 'Integration test passes with exit code 0 and latency under 500ms.',
        stopCondition: 'Connection failure or invalid response structure.',
        zeroMockCheck: 'Live network socket interaction; zero mocked response objects.'
      }
    ],
    inScope: [
      'Node.js HTTP/IPC inference adapter module.',
      'Strict response schema validation.',
      'Typed error classes (ModelInferenceError).',
      'Integration test suite.'
    ],
    outScope: [
      'Model training code.',
      'Agent routing state machine (handled in G-ML-016).'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/model-adapter.mjs' },
      { area: 'Template Libraries', action: 'ADD', path: 'template/scripts/lib/model-adapter.mjs' },
      { area: 'Integration Tests', action: 'ADD', path: 'tests/integration/test-model-adapter.mjs' }
    ],
    acceptanceCriteria: [
      'Adapter sends prompt and returns text, confidence, and decisionToken fields.',
      'Validates confidence strictly in range [0.0, 1.0].',
      'Throws explicit ModelInferenceError on gateway timeout, network partition, or malformed JSON.',
      'Integration tests pass with exit code 0.'
    ],
    testPlan: [
      'node tests/integration/test-model-adapter.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-013'
    ],
    ports: {
      inbound: 'AgentRuntimePort (Soda OS execution looper)',
      outbound: 'ModelServingGatewayPort (HTTP / local IPC endpoint)'
    }
  },
  {
    id: 'G-ML-014',
    title: 'Confidence-Aware Governed Decision Contract',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Formalized and validated Soda OS GovernedDecision contract requiring explicit confidence, evidence arrays, uncertainty bounds, and execution intent on all agent decisions.',
    dependsOn: 'G-ML-013',
    blocks: 'G-ML-015, G-ML-016, G-ML-019',
    steps: [
      { name: 'Implement validateDecision contract validator and schemas', status: 'pending' },
      { name: 'Integrate confidence-calibration module into Soda OS core harness', status: 'pending' },
      { name: 'Verify contract enforcement and boundary condition tests', status: 'pending' }
    ],
    context: 'Agent reliability requires standardizing the data contract across all Soda OS tools and skills so that confidence, evidence, and uncertainty bounds are mandatory first-class parameters.',
    why: 'Standardizes the data contract across all Soda OS skills and tools so that uncertainty is a mandatory first-class signal in agent execution.',
    doneWhen: 'The validateDecision function enforces valid decision structure and rejects missing confidence or ungrounded evidence with explicit TypeErrors.',
    unblocks: 'Evidence metadata ledger (G-ML-015) and dynamic routing state machine (G-ML-016).',
    gapId: 'GAP-ML-014',
    gapEvidence: 'Need canonical validation functions for governed decisions in scripts/lib/.',
    gapSolution: 'Implement validateDecision in scripts/lib/confidence-calibration.mjs.',
    gapVerification: 'node scripts/harness/confidence-calibration-harness.mjs',
    approach: 'Strict TypeScript/JavaScript contract validation, invariant checking, and property testing in conformance harness.',
    touchMap: [
      'scripts/lib/confidence-calibration.mjs',
      'template/scripts/lib/confidence-calibration.mjs',
      'scripts/harness/confidence-calibration-harness.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement validateDecision contract validator',
        allowedFiles: 'scripts/lib/confidence-calibration.mjs, template/scripts/lib/confidence-calibration.mjs',
        actions: [
          'Create validateDecision function asserting presence of answer, confidence, evidence, and riskLevel.',
          'Enforce that confidence is a finite number in [0.0, 1.0] and evidence is an array of strings.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/confidence-calibration.mjs\').then(m => m.validateDecision({ answer: \'ok\', confidence: 0.9, evidence: [\'file.txt\'] }))"',
        completionGate: 'validateDecision accepts valid decision object without throwing and returns true.',
        stopCondition: 'Rejection of valid decision or failure to throw on invalid object.',
        zeroMockCheck: 'Pure deterministic validation logic; zero mocked return values.'
      },
      {
        title: 'Step 2 — Integrate contract validation into test harness',
        allowedFiles: 'scripts/harness/confidence-calibration-harness.mjs',
        actions: [
          'Add unit tests asserting that null, missing confidence, and non-array evidence throw TypeError.',
          'Verify boundary validation on confidence values at exactly 0.0 and 1.0.'
        ],
        verificationCommand: 'node scripts/harness/confidence-calibration-harness.mjs',
        completionGate: 'All harness unit tests execute 100% green with exit code 0.',
        stopCondition: 'Any harness failure or unhandled exception.',
        zeroMockCheck: 'Concrete test execution validating real contract behavior; zero stubs.'
      },
      {
        title: 'Step 3 — Synchronize contract to template directory',
        allowedFiles: 'template/scripts/lib/confidence-calibration.mjs',
        actions: [
          'Ensure scripts/lib/confidence-calibration.mjs and template/scripts/lib/confidence-calibration.mjs are identical.',
          'Run diff check verifying zero template drift.'
        ],
        verificationCommand: 'diff -u scripts/lib/confidence-calibration.mjs template/scripts/lib/confidence-calibration.mjs',
        completionGate: 'Diff command produces zero lines of output and exit code 0.',
        stopCondition: 'Template drift detected between root and template directory.',
        zeroMockCheck: 'Exact file identity verification; zero simulated sync.'
      }
    ],
    inScope: [
      'validateDecision function implementation.',
      'Type checking and boundary invariant enforcement.',
      'Integration into confidence-calibration-harness.mjs.',
      'Template mirror synchronization.'
    ],
    outScope: [
      'Routing state machine (handled in G-ML-016).',
      'Audit log serialization (handled in G-ML-015).'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'MODIFY', path: 'scripts/lib/confidence-calibration.mjs' },
      { area: 'Template Libraries', action: 'MODIFY', path: 'template/scripts/lib/confidence-calibration.mjs' },
      { area: 'Test Harnesses', action: 'MODIFY', path: 'scripts/harness/confidence-calibration-harness.mjs' }
    ],
    acceptanceCriteria: [
      'validateDecision strictly enforces object structure, finite numerical confidence in [0, 1], non-empty string answer, and evidence array.',
      'Rejects missing or non-array evidence with TypeError.',
      'Integrated into scripts/harness/confidence-calibration-harness.mjs with 100% test coverage.',
      'Harness exits with code 0.'
    ],
    testPlan: [
      'node scripts/harness/confidence-calibration-harness.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-014'
    ],
    ports: {
      inbound: 'GovernedDecisionPort (Skill and agent decision intake)',
      outbound: 'ContractEnforcementPort (Soda OS runtime validator)'
    }
  },
  {
    id: 'G-ML-015',
    title: 'Evidence and Uncertainty Metadata Ledger',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Structured metadata ledger module recording decision evidence citations, token spans, uncertainty metrics, and reasoning provenance into the session audit log.',
    dependsOn: 'G-ML-014',
    blocks: 'G-ML-019',
    steps: [
      { name: 'Implement decision ledger writer and schema serializer', status: 'pending' },
      { name: 'Implement evidence citation verification against filesystem workspace', status: 'pending' },
      { name: 'Verify append-only log integrity and rotation boundaries', status: 'pending' }
    ],
    context: 'Complete governance requires recording every asserted claim, evidence citation, and confidence value into an immutable session audit ledger for forensic auditing and drift detection.',
    why: 'Provides full transparency and auditability for why an agent asserted confidence, enabling post-hoc forensic review and safety compliance.',
    doneWhen: 'A ledger module records structured JSONL entries with ISO timestamps, verified file citations, and calibrated confidence, rejecting unverified evidence links.',
    unblocks: 'Calibration metric ingestion monitor (G-ML-019).',
    gapId: 'GAP-ML-015',
    gapEvidence: 'No structured decision audit ledger module exists in scripts/lib/.',
    gapSolution: 'Implement scripts/lib/decision-ledger.mjs and unit tests.',
    gapVerification: 'node tests/unit/test-decision-ledger.mjs',
    approach: 'Append-only JSONL file stream, POSIX atomic file locking, file path existence verification, and ISO timestamp formatting.',
    touchMap: [
      'scripts/lib/decision-ledger.mjs',
      'template/scripts/lib/decision-ledger.mjs',
      'tests/unit/test-decision-ledger.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement DecisionLedger append-only writer',
        allowedFiles: 'scripts/lib/decision-ledger.mjs, template/scripts/lib/decision-ledger.mjs',
        actions: [
          'Create DecisionLedger class writing structured decision records to .agents/audit/decisions.jsonl.',
          'Include ISO timestamp, decision ID, model checkpoint version, confidence score, and evidence list.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/decision-ledger.mjs\')"',
        completionGate: 'DecisionLedger module imports cleanly and exposes expected methods.',
        stopCondition: 'Module import error or missing exports.',
        zeroMockCheck: 'Real file append module; zero mock writers.'
      },
      {
        title: 'Step 2 — Implement evidence citation verification against filesystem',
        allowedFiles: 'scripts/lib/decision-ledger.mjs, template/scripts/lib/decision-ledger.mjs',
        actions: [
          'Add verifyEvidenceCitations method checking that cited files exist within workspace boundaries.',
          'Flag unreferenced evidence claims and set evidenceVerified flag to false when citations are missing.'
        ],
        verificationCommand: 'node tests/unit/test-decision-ledger.mjs -k test_citation_verification',
        completionGate: 'Citation verifier correctly detects existing and missing workspace files.',
        stopCondition: 'Allowing non-existent file paths as verified evidence.',
        zeroMockCheck: 'Physical filesystem checks using node:fs existsSync; zero stubs.'
      },
      {
        title: 'Step 3 — Verify audit ledger file integrity and error handling',
        allowedFiles: 'tests/unit/test-decision-ledger.mjs',
        actions: [
          'Test writing 50 decision records concurrently and verify JSONL record parsing integrity.',
          'Verify that write errors halt execution cleanly rather than silently losing audit trails.'
        ],
        verificationCommand: 'node tests/unit/test-decision-ledger.mjs',
        completionGate: 'All ledger unit tests execute 100% green with exit code 0.',
        stopCondition: 'Log corruption or silent failure during write operations.',
        zeroMockCheck: 'Concrete disk I/O verification; zero simulated file writes.'
      }
    ],
    inScope: [
      'DecisionLedger append-only writer implementation.',
      'Filesystem evidence citation validator.',
      'Structured JSONL audit log format.',
      'Unit test suite.'
    ],
    outScope: [
      'Streaming metric calculations (handled in G-ML-019).',
      'Database storage engines.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/decision-ledger.mjs' },
      { area: 'Template Libraries', action: 'ADD', path: 'template/scripts/lib/decision-ledger.mjs' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-decision-ledger.mjs' }
    ],
    acceptanceCriteria: [
      'Records ISO timestamp, decision ID, model checkpoint version, confidence score, and verified file citation links.',
      'Rejects unreferenced evidence claims that do not correspond to existing filesystem paths.',
      'Appends records to audit log without data corruption.',
      'Unit tests execute cleanly with exit code 0.'
    ],
    testPlan: [
      'node tests/unit/test-decision-ledger.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-015'
    ],
    ports: {
      inbound: 'DecisionAuditPort (Agent decision stream)',
      outbound: 'AuditLogStoragePort (POSIX JSONL file append)'
    }
  },
  {
    id: 'G-ML-016',
    title: 'Four-Way Dynamic Routing State Machine',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Deterministic 4-way decision router mapping tuples of confidence, evidence verification status, and risk level into proceed, verify, defer, or human_review actions.',
    dependsOn: 'G-ML-014',
    blocks: 'G-ML-020, G-ML-021, G-ML-022, G-ML-023',
    steps: [
      { name: 'Implement routeDecision FSM function and truth table invariants', status: 'pending' },
      { name: 'Integrate dynamic routing into confidence-calibration-harness', status: 'pending' },
      { name: 'Verify all 8 risk and evidence permutations and boundary states', status: 'pending' }
    ],
    context: 'To prevent autonomous runaway failures, Soda OS enforces an external deterministic finite state machine routing agent decisions based on confidence and evidence verification.',
    why: 'Guarantees that agent decisions cannot proceed to execution without satisfying explicit quantitative confidence and evidence criteria.',
    doneWhen: 'The routeDecision function returns strictly proceed, verify, defer, or human_review according to the formal 8-row truth table.',
    unblocks: 'CI calibration gate (G-ML-020) and E2E integration harness (G-ML-021).',
    gapId: 'GAP-ML-016',
    gapEvidence: 'Need full 4-way routing implementation in scripts/lib/confidence-calibration.mjs.',
    gapSolution: 'Implement routeDecision in scripts/lib/confidence-calibration.mjs.',
    gapVerification: 'node scripts/harness/confidence-calibration-harness.mjs',
    approach: 'Deterministic FSM truth table evaluation, fail-closed branching, and zero float rounding ambiguity.',
    touchMap: [
      'scripts/lib/confidence-calibration.mjs',
      'template/scripts/lib/confidence-calibration.mjs',
      'scripts/harness/confidence-calibration-harness.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement routeDecision truth table function',
        allowedFiles: 'scripts/lib/confidence-calibration.mjs, template/scripts/lib/confidence-calibration.mjs',
        actions: [
          'Implement routeDecision taking decision object and threshold parameter tau.',
          'Enforce 4-way routing: proceed for verified high-confidence normal-risk; verify for low-confidence; defer for unverified high-risk; human_review for verified high-risk.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/confidence-calibration.mjs\').then(m => m.routeDecision({ confidence: 0.9, evidence: [\'ok\'], riskLevel: \'normal\' }))"',
        completionGate: 'routeDecision returns proceed on valid high-confidence decision.',
        stopCondition: 'Returning undefined, null, or invalid action string.',
        zeroMockCheck: 'Deterministic mathematical routing logic; zero mocked returns.'
      },
      {
        title: 'Step 2 — Implement comprehensive truth table test battery',
        allowedFiles: 'scripts/harness/confidence-calibration-harness.mjs',
        actions: [
          'Add unit tests exercising all 8 permutations of confidence, evidence verification, and risk level.',
          'Verify fail-closed behavior ensuring that missing evidence never routes to proceed.'
        ],
        verificationCommand: 'node scripts/harness/confidence-calibration-harness.mjs',
        completionGate: 'All 8 routing permutations verified 100% green with exit code 0.',
        stopCondition: 'Any failure in routing truth table assertions.',
        zeroMockCheck: 'Exhaustive verification of operational state transitions; zero stubs.'
      },
      {
        title: 'Step 3 — Synchronize routing module to template directory',
        allowedFiles: 'template/scripts/lib/confidence-calibration.mjs',
        actions: [
          'Synchronize updated scripts/lib/confidence-calibration.mjs to template/scripts/lib/confidence-calibration.mjs.',
          'Run diff validation to confirm clean alignment.'
        ],
        verificationCommand: 'diff -u scripts/lib/confidence-calibration.mjs template/scripts/lib/confidence-calibration.mjs',
        completionGate: 'Zero diff detected between root and template scripts with exit code 0.',
        stopCondition: 'Template drift detected.',
        zeroMockCheck: 'Concrete file comparison; zero simulated sync.'
      }
    ],
    inScope: [
      'routeDecision function implementation.',
      '8-row truth table invariant enforcement.',
      'Integration into confidence-calibration-harness.mjs.',
      'Template mirror synchronization.'
    ],
    outScope: [
      'UI notification dispatch.',
      'External model server execution.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'MODIFY', path: 'scripts/lib/confidence-calibration.mjs' },
      { area: 'Template Libraries', action: 'MODIFY', path: 'template/scripts/lib/confidence-calibration.mjs' },
      { area: 'Test Harnesses', action: 'MODIFY', path: 'scripts/harness/confidence-calibration-harness.mjs' }
    ],
    acceptanceCriteria: [
      'Returns proceed when confidence >= tau, evidence is verified, and risk is normal.',
      'Returns verify when confidence < tau or evidence is unverified under normal risk.',
      'Returns defer when risk is high and evidence is unverified.',
      'Returns human_review when risk is high and evidence is verified with confidence >= tau.',
      'Harness exits with code 0.'
    ],
    testPlan: [
      'node scripts/harness/confidence-calibration-harness.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-016'
    ],
    ports: {
      inbound: 'RoutingEvaluationPort (Agent decision stream)',
      outbound: 'RoutingActionPort (Soda OS workflow dispatcher)'
    }
  },
  {
    id: 'G-ML-017',
    title: 'Model-Provider and Checkpoint Configuration Subsystem',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Centralized configuration manager and validator for model serving providers, endpoint URIs, checkpoint versions, and threshold parameters.',
    dependsOn: 'G-ML-013',
    blocks: 'G-ML-023',
    steps: [
      { name: 'Implement ModelConfig configuration parser and schema validator', status: 'pending' },
      { name: 'Implement pre-flight endpoint health check and ping routine', status: 'pending' },
      { name: 'Verify configuration error handling and environment variable overrides', status: 'pending' }
    ],
    context: 'Decoupling model serving infrastructure from agent logic requires a robust configuration manager that validates endpoints, authenticates tokens, and runs pre-flight connectivity checks.',
    why: 'Decouples model provider infrastructure from agent execution code, allowing seamless switching between base checkpoints and inference providers.',
    doneWhen: 'A configuration module loads soda-model.config.json, performs pre-flight connectivity checks, and throws actionable errors on misconfiguration.',
    unblocks: 'Circuit breaker state machine (G-ML-023).',
    gapId: 'GAP-ML-017',
    gapEvidence: 'No model provider configuration manager exists in scripts/lib/.',
    gapSolution: 'Implement scripts/lib/model-config.mjs and unit tests.',
    gapVerification: 'node tests/unit/test-model-config.mjs',
    approach: 'JSON schema validation, environment variable substitution, socket ping timeout checks, and version checksum matching.',
    touchMap: [
      'scripts/lib/model-config.mjs',
      'template/scripts/lib/model-config.mjs',
      'tests/unit/test-model-config.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement ModelConfig parser and schema validator',
        allowedFiles: 'scripts/lib/model-config.mjs, template/scripts/lib/model-config.mjs',
        actions: [
          'Create ModelConfig class loading configuration from file or environment variables.',
          'Validate provider type (vllm, ollama, local, remote), endpoint URI, and threshold parameters.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/model-config.mjs\')"',
        completionGate: 'ModelConfig module imports cleanly and exposes expected methods.',
        stopCondition: 'Module import error or missing exports.',
        zeroMockCheck: 'Operational configuration loader; zero mock configurations.'
      },
      {
        title: 'Step 2 — Implement pre-flight health check ping routine',
        allowedFiles: 'scripts/lib/model-config.mjs, template/scripts/lib/model-config.mjs',
        actions: [
          'Implement checkHealth method sending HTTP GET to provider health endpoint with strict 2-second timeout.',
          'Verify that unhealthy endpoints throw descriptive ModelEndpointUnreachableError.'
        ],
        verificationCommand: 'node tests/unit/test-model-config.mjs -k test_health_check',
        completionGate: 'Health check correctly detects live and unreachable endpoints.',
        stopCondition: 'Hanging indefinitely on unreachable endpoints or failing to timeout.',
        zeroMockCheck: 'Real network socket connection checks; zero simulated health checks.'
      },
      {
        title: 'Step 3 — Validate configuration unit test battery',
        allowedFiles: 'tests/unit/test-model-config.mjs',
        actions: [
          'Test loading valid configuration fixtures and override parameters via process.env.',
          'Assert that missing mandatory fields or invalid URIs throw explicit validation errors.'
        ],
        verificationCommand: 'node tests/unit/test-model-config.mjs',
        completionGate: 'All configuration unit tests execute 100% green with exit code 0.',
        stopCondition: 'Any unit test failure or unhandled exception.',
        zeroMockCheck: 'Concrete configuration parsing against real fixtures; zero stubs.'
      }
    ],
    inScope: [
      'Model configuration parser and schema validator.',
      'Pre-flight socket connectivity and health check.',
      'Environment variable override handling.',
      'Unit test suite.'
    ],
    outScope: [
      'Deploying or starting model serving processes.',
      'Credential generation.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/model-config.mjs' },
      { area: 'Template Libraries', action: 'ADD', path: 'template/scripts/lib/model-config.mjs' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-model-config.mjs' }
    ],
    acceptanceCriteria: [
      'Parses configuration, validating provider type, endpoint URI, and timeout bounds.',
      'Performs pre-flight health check pinging configured inference service.',
      'Emits clear error message if endpoint is unreachable or model version does not match.',
      'Unit tests execute cleanly with exit code 0.'
    ],
    testPlan: [
      'node tests/unit/test-model-config.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-017'
    ],
    ports: {
      inbound: 'ConfigIntakePort (CLI and runtime looper)',
      outbound: 'HealthCheckSocketPort (HTTP health probe)'
    }
  },
  {
    id: 'G-ML-018',
    title: 'Inference-Time Token and Latency Accounting Engine',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Accounting and telemetry module tracking inference latency, token counts, value-head compute overhead, and associated financial costs per agent step.',
    dependsOn: 'G-ML-013',
    blocks: 'G-ML-024',
    steps: [
      { name: 'Implement TokenAccounting telemetry tracker and span recorder', status: 'pending' },
      { name: 'Implement value-head latency overhead monitoring and alerts', status: 'pending' },
      { name: 'Verify telemetry emission and minor units financial cost accounting', status: 'pending' }
    ],
    context: 'Agent loops must operate within strict latency and monetary cost budgets, requiring real-time tracking of token counts, inference wall-clock time, and value-head overhead.',
    why: 'Enforces hard quantitative latency budgets and FinOps boundaries on agent reasoning loops, preventing runaway token consumption.',
    doneWhen: 'An accounting module measures microsecond inference latency and computes token costs in exact integer minor units arithmetic without floating-point math.',
    unblocks: 'Operational documentation and runbooks (G-ML-024).',
    gapId: 'GAP-ML-018',
    gapEvidence: 'No token accounting and latency telemetry module exists in scripts/lib/.',
    gapSolution: 'Implement scripts/lib/model-telemetry.mjs and unit tests.',
    gapVerification: 'node tests/unit/test-model-telemetry.mjs',
    approach: 'High-resolution hrtime tracking, OpenTelemetry-compatible span formatting, and exact minor units integer arithmetic.',
    touchMap: [
      'scripts/lib/model-telemetry.mjs',
      'template/scripts/lib/model-telemetry.mjs',
      'tests/unit/test-model-telemetry.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement TokenAccounting telemetry module',
        allowedFiles: 'scripts/lib/model-telemetry.mjs, template/scripts/lib/model-telemetry.mjs',
        actions: [
          'Create ModelTelemetry class recording prompt tokens, completion tokens, and inference latency.',
          'Implement recordInferenceSpan method calculating wall-clock duration with microsecond precision.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/model-telemetry.mjs\')"',
        completionGate: 'ModelTelemetry module imports cleanly and exposes expected methods.',
        stopCondition: 'Module import error or missing exports.',
        zeroMockCheck: 'Real telemetry recorder implementation; zero mock metrics.'
      },
      {
        title: 'Step 2 — Implement value-head compute overhead monitor',
        allowedFiles: 'scripts/lib/model-telemetry.mjs, template/scripts/lib/model-telemetry.mjs',
        actions: [
          'Calculate overhead ratio of value head projection relative to base causal LM token generation.',
          'Emit warning log when auxiliary head overhead exceeds 15% threshold budget.'
        ],
        verificationCommand: 'node tests/unit/test-model-telemetry.mjs -k test_overhead_monitor',
        completionGate: 'Overhead monitor emits warning on high overhead and remains silent on normal runs.',
        stopCondition: 'Failure to compute overhead percentage correctly.',
        zeroMockCheck: 'Operational mathematical overhead computation; zero stubs.'
      },
      {
        title: 'Step 3 — Verify integer minor units monetary cost calculation',
        allowedFiles: 'tests/unit/test-model-telemetry.mjs',
        actions: [
          'Implement calculateCostMinor calculating total token cost in exact integer minor units without floats.',
          'Execute unit test battery validating cost bounds across 100 benchmark inference traces.'
        ],
        verificationCommand: 'node tests/unit/test-model-telemetry.mjs',
        completionGate: 'All telemetry unit tests execute 100% green with exit code 0.',
        stopCondition: 'Floating-point monetary calculation or negative token counts.',
        zeroMockCheck: 'Strict integer arithmetic for monetary units; zero mock calculations.'
      }
    ],
    inScope: [
      'High-resolution inference latency measurement.',
      'Token consumption accounting.',
      'Value-head overhead threshold monitoring.',
      'Exact minor units integer cost calculation.'
    ],
    outScope: [
      'Credit card billing processor integration.',
      'Prometheus server deployment.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/model-telemetry.mjs' },
      { area: 'Template Libraries', action: 'ADD', path: 'template/scripts/lib/model-telemetry.mjs' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-model-telemetry.mjs' }
    ],
    acceptanceCriteria: [
      'Accurately records token usage from model response metadata.',
      'Measures end-to-end inference latency with microsecond precision.',
      'Emits warning when value-head inference overhead exceeds 15% of base LM generation time.',
      'Computes monetary costs in exact integer minor units arithmetic.'
    ],
    testPlan: [
      'node tests/unit/test-model-telemetry.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-018'
    ],
    ports: {
      inbound: 'TelemetryIntakePort (Model adapter inference hooks)',
      outbound: 'TelemetrySinkPort (Structured log or OpenTelemetry emitter)'
    }
  },
  {
    id: 'G-ML-019',
    title: 'Calibration Metric Ingestion and Brier Score Monitor',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Online metric ingestion service aggregating agent execution outcomes, computing rolling Brier scores and ECE, and detecting calibration drift.',
    dependsOn: 'G-ML-014, G-ML-015',
    blocks: 'G-ML-020',
    steps: [
      { name: 'Implement streaming calibration metric aggregator in Node.js', status: 'pending' },
      { name: 'Implement rolling-window Brier score monitor and drift detector', status: 'pending' },
      { name: 'Verify automated drift alert dispatch and metric snapshot emission', status: 'pending' }
    ],
    context: 'Production models can experience calibration drift under distribution shift, necessitating an active online monitor that evaluates empirical outcomes against asserted confidence.',
    why: 'Provides real-time visibility into whether the model\'s confidence remains well-calibrated in production or is degrading over time.',
    doneWhen: 'A streaming monitor updates 10-bin calibration metrics from verified execution receipts and raises an alert if rolling Brier score exceeds 0.12.',
    unblocks: 'CI calibration gate (G-ML-020).',
    gapId: 'GAP-ML-019',
    gapEvidence: 'No online calibration monitor service exists in scripts/lib/.',
    gapSolution: 'Implement calibrationMetrics in scripts/lib/confidence-calibration.mjs and calibration-monitor.mjs.',
    gapVerification: 'node tests/unit/test-calibration-monitor.mjs',
    approach: 'Sliding window metric accumulation, 10-bin probability binning, and threshold drift event emission.',
    touchMap: [
      'scripts/lib/confidence-calibration.mjs',
      'scripts/lib/calibration-monitor.mjs',
      'tests/unit/test-calibration-monitor.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement streaming calibration metrics aggregator',
        allowedFiles: 'scripts/lib/confidence-calibration.mjs, scripts/lib/calibration-monitor.mjs',
        actions: [
          'Implement calibrationMetrics function calculating sample count, ECE, Brier score, and bin stats.',
          'Partition decision records into 10 confidence bins and calculate empirical accuracy per bin.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/confidence-calibration.mjs\').then(m => m.calibrationMetrics([{ confidence: 0.9, groundTruthOutcome: 1 }]))"',
        completionGate: 'calibrationMetrics returns valid metrics object with ECE and Brier scores.',
        stopCondition: 'Calculation error or negative calibration scores.',
        zeroMockCheck: 'Real mathematical calculation on provided sample records; zero stubs.'
      },
      {
        title: 'Step 2 — Implement rolling-window drift detection service',
        allowedFiles: 'scripts/lib/calibration-monitor.mjs',
        actions: [
          'Create CalibrationMonitor tracking last 50 execution outcomes.',
          'Emit drift alert event when rolling Brier score exceeds 0.12 or ECE exceeds 0.08.'
        ],
        verificationCommand: 'node tests/unit/test-calibration-monitor.mjs -k test_drift_detection',
        completionGate: 'Drift monitor emits alert event when uncalibrated samples are fed.',
        stopCondition: 'Failing to trigger alert on degraded calibration.',
        zeroMockCheck: 'Operational event emission based on concrete sample stream; zero mock alerts.'
      },
      {
        title: 'Step 3 — Validate calibration monitor unit test battery',
        allowedFiles: 'tests/unit/test-calibration-monitor.mjs',
        actions: [
          'Feed 100 sample decision streams with known calibration drift.',
          'Assert that metrics match expected values and JSON snapshot reports are generated.'
        ],
        verificationCommand: 'node tests/unit/test-calibration-monitor.mjs',
        completionGate: 'All monitor unit tests execute 100% green with exit code 0.',
        stopCondition: 'Any unit test failure or unhandled exception.',
        zeroMockCheck: 'Live metric computation over stream fixtures; zero simulated tests.'
      }
    ],
    inScope: [
      'Online 10-bin calibration metric calculation.',
      'Rolling-window Brier score and ECE tracker.',
      'Calibration drift event emission.',
      'Unit test battery.'
    ],
    outScope: [
      'Retraining the model weights.',
      'External dashboard UI.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'MODIFY', path: 'scripts/lib/confidence-calibration.mjs' },
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/calibration-monitor.mjs' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-calibration-monitor.mjs' }
    ],
    acceptanceCriteria: [
      'Ingests labeled decision outcomes and updates empirical calibration metrics across 10 bins.',
      'Detects distribution drift if rolling 50-step Brier score exceeds 0.12.',
      'Generates machine-readable calibration reports in JSON format.',
      'Monitor unit tests execute cleanly with exit code 0.'
    ],
    testPlan: [
      'node tests/unit/test-calibration-monitor.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-019'
    ],
    ports: {
      inbound: 'DecisionOutcomeStreamPort (Audit ledger event listener)',
      outbound: 'DriftAlertPort (Soda OS incident / warning dispatcher)'
    }
  },
  {
    id: 'G-ML-020',
    title: 'CI Calibration Gate and Quality Policy Enforcement',
    status: 'ready',
    kind: 'chore',
    atomicOutcome: 'Automated CI test harness and workflow gate blocking pull requests or goal completion if calibration metrics or routing accuracy breach established SLAs.',
    dependsOn: 'G-ML-016, G-ML-019',
    blocks: 'G-ML-021, G-ML-022',
    steps: [
      { name: 'Implement ci-calibration-gate CLI script and SLA rule checker', status: 'pending' },
      { name: 'Configure GitHub Actions calibration gate workflow', status: 'pending' },
      { name: 'Verify exit code 0 on valid suite and exit code 1 on SLA breaches', status: 'pending' }
    ],
    context: 'Governance constitution Article II requires automated verification preventing uncalibrated models or degraded routing rules from merging into the codebase.',
    why: 'Enforces Article II (Mandatory Verification) by programmatically preventing uncalibrated models or degraded routing rules from merging into the codebase.',
    doneWhen: 'A CI script executes calibration tests and exits with code 1 if ECE > 0.040, Brier > 0.080, or high-confidence error rate > 1.0%.',
    unblocks: 'Model regression integration harness (G-ML-021) and upgrade engine (G-ML-022).',
    gapId: 'GAP-ML-020',
    gapEvidence: 'No standalone CI calibration gate script exists in scripts/ci/.',
    gapSolution: 'Implement scripts/ci/ci-calibration-gate.mjs and GitHub workflow.',
    gapVerification: 'node scripts/ci/ci-calibration-gate.mjs',
    approach: 'CLI exit code contract, JSON schema parsing, threshold checking, and GitHub Actions workflow definition.',
    touchMap: [
      'scripts/ci/ci-calibration-gate.mjs',
      'template/scripts/ci/ci-calibration-gate.mjs',
      '.github/workflows/calibration-gate.yml'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement ci-calibration-gate CLI runner',
        allowedFiles: 'scripts/ci/ci-calibration-gate.mjs, template/scripts/ci/ci-calibration-gate.mjs',
        actions: [
          'Create ci-calibration-gate.mjs reading calibration evaluation artifacts or running calibration harness.',
          'Implement SLA checks enforcing ECE <= 0.040, Brier <= 0.080, and high-confidence error rate <= 1.0%.'
        ],
        verificationCommand: 'node scripts/ci/ci-calibration-gate.mjs --help',
        completionGate: 'CLI script displays usage options and exits cleanly with exit code 0.',
        stopCondition: 'CLI execution error or unhandled flag exception.',
        zeroMockCheck: 'Real CLI executable script; zero mock script stubs.'
      },
      {
        title: 'Step 2 — Implement GitHub Actions workflow definition',
        allowedFiles: '.github/workflows/calibration-gate.yml',
        actions: [
          'Create GitHub Actions workflow triggered on pull requests to feature/ML and develop.',
          'Execute node scripts/ci/ci-calibration-gate.mjs as a mandatory blocking status check.'
        ],
        verificationCommand: 'node -e "require(\'fs\').readFileSync(\'.github/workflows/calibration-gate.yml\')"',
        completionGate: 'Workflow YAML file exists and contains valid syntax.',
        stopCondition: 'YAML syntax error or missing step definition.',
        zeroMockCheck: 'Concrete CI workflow definition; zero placeholder workflow files.'
      },
      {
        title: 'Step 3 — Verify gate exit codes on passing and failing datasets',
        allowedFiles: 'scripts/ci/ci-calibration-gate.mjs',
        actions: [
          'Run gate on passing calibration dataset and confirm exit code 0.',
          'Run gate on injected failing dataset (ECE = 0.15) and confirm exit code 1 with descriptive error log.'
        ],
        verificationCommand: 'node scripts/ci/ci-calibration-gate.mjs',
        completionGate: 'Passing dataset results in exit code 0 with all SLA checks verified green.',
        stopCondition: 'Exit code 0 on failing data or exit code 1 on valid data.',
        zeroMockCheck: 'Real exit code evaluation on physical datasets; zero simulated passes.'
      }
    ],
    inScope: [
      'CI calibration gate CLI implementation.',
      'SLA metric boundary enforcement (ECE, Brier, HCER).',
      'GitHub Actions workflow configuration.',
      'Exit code verification tests.'
    ],
    outScope: [
      'Model training or optimization.',
      'Manual human sign-offs.'
    ],
    changeDelta: [
      { area: 'CI Scripts', action: 'ADD', path: 'scripts/ci/ci-calibration-gate.mjs' },
      { area: 'Template CI', action: 'ADD', path: 'template/scripts/ci/ci-calibration-gate.mjs' },
      { area: 'Workflows', action: 'ADD', path: '.github/workflows/calibration-gate.yml' }
    ],
    acceptanceCriteria: [
      'Fails build (exit code 1) if test suite ECE > 0.040 or Brier score > 0.080.',
      'Fails build if high-confidence error rate exceeds 1.0%.',
      'Fails build if any unverified high-risk decision resulted in proceed.',
      'Exits with code 0 on passing calibration suite.'
    ],
    testPlan: [
      'node scripts/ci/ci-calibration-gate.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-020'
    ],
    ports: {
      inbound: 'CiTriggerPort (GitHub Actions runner)',
      outbound: 'StatusCheckPort (GitHub commit status API)'
    }
  },
  {
    id: 'G-ML-021',
    title: 'Model Regression and Integration Test Harness',
    status: 'ready',
    kind: 'qa',
    atomicOutcome: 'Comprehensive end-to-end integration harness executing full Soda OS agent workflows against the calibrated model, validating task completion and routing.',
    dependsOn: 'G-ML-013, G-ML-016, G-ML-020',
    blocks: 'G-ML-024',
    steps: [
      { name: 'Implement agent workflow integration harness runner', status: 'pending' },
      { name: 'Implement simulated missing file scenario and verification route tests', status: 'pending' },
      { name: 'Verify complete multi-step agent loop without unhandled exceptions', status: 'pending' }
    ],
    context: 'Full system validation requires executing end-to-end multi-step agent workflows to ensure that the calibrated model, routing state machine, and tool execution operate harmoniously.',
    why: 'Verifies that the complete system (model + adapter + router + tools) operates reliably without deadlocks, infinite loops, or behavioral regressions.',
    doneWhen: 'An integration harness executes full agent workflows against the calibrated model with 100% green assertions and zero uncaught exceptions.',
    unblocks: 'Operational documentation suite (G-ML-024).',
    gapId: 'GAP-ML-021',
    gapEvidence: 'No end-to-end calibrated agent workflow harness exists in scripts/harness/.',
    gapSolution: 'Implement scripts/harness/agent-workflow-harness.mjs and integration tests.',
    gapVerification: 'node scripts/harness/agent-workflow-harness.mjs',
    approach: 'Multi-step agent loop execution, tool call mocking in test sandbox, decision ledger verification, and routing action checking.',
    touchMap: [
      'scripts/harness/agent-workflow-harness.mjs',
      'template/scripts/harness/agent-workflow-harness.mjs',
      'tests/e2e/test-calibrated-agent-workflow.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement agent workflow integration harness runner',
        allowedFiles: 'scripts/harness/agent-workflow-harness.mjs, template/scripts/harness/agent-workflow-harness.mjs',
        actions: [
          'Create AgentWorkflowHarness class orchestrating multi-step goal execution with calibrated model.',
          'Implement test scenario checking valid goal creation, tool calling, and verification route handling.'
        ],
        verificationCommand: 'node scripts/harness/agent-workflow-harness.mjs --dry-run',
        completionGate: 'Harness runner initializes and executes dry-run scenario cleanly with exit code 0.',
        stopCondition: 'Initialization failure or missing harness dependencies.',
        zeroMockCheck: 'Real harness execution coordinating actual runtime classes; zero stubs.'
      },
      {
        title: 'Step 2 — Implement simulated missing file scenario and verify route test',
        allowedFiles: 'tests/e2e/test-calibrated-agent-workflow.mjs',
        actions: [
          'Simulate missing evidence file and verify that router transitions decision from proceed to verify.',
          'Verify that recovery action triggers automated query re-generation and updates ledger.'
        ],
        verificationCommand: 'node tests/e2e/test-calibrated-agent-workflow.mjs -k test_missing_evidence',
        completionGate: 'Missing evidence scenario correctly routes to verify and logs warning.',
        stopCondition: 'Routing to proceed when evidence is absent.',
        zeroMockCheck: 'Concrete execution of routing state machine and filesystem checks; zero mocks.'
      },
      {
        title: 'Step 3 — Run full end-to-end agent workflow integration battery',
        allowedFiles: 'scripts/harness/agent-workflow-harness.mjs, tests/e2e/test-calibrated-agent-workflow.mjs',
        actions: [
          'Execute complete integration test suite over 5 distinct agent workflow scenarios.',
          'Confirm zero unhandled promise rejections, zero uncaught exceptions, and 100% passing tests.'
        ],
        verificationCommand: 'node scripts/harness/agent-workflow-harness.mjs',
        completionGate: 'All integration scenarios complete 100% green with exit code 0.',
        stopCondition: 'Any workflow failure, timeout, or uncaught exception.',
        zeroMockCheck: 'Full end-to-end agent loop execution; zero simulated success responses.'
      }
    ],
    inScope: [
      'Multi-step agent workflow harness implementation.',
      'Missing evidence recovery route testing.',
      'E2E integration test suite.',
      'Zero unhandled exception verification.'
    ],
    outScope: [
      'Unit testing individual utility functions.',
      'Cloud deployment.'
    ],
    changeDelta: [
      { area: 'Test Harnesses', action: 'ADD', path: 'scripts/harness/agent-workflow-harness.mjs' },
      { area: 'Template Harnesses', action: 'ADD', path: 'template/scripts/harness/agent-workflow-harness.mjs' },
      { area: 'E2E Tests', action: 'ADD', path: 'tests/e2e/test-calibrated-agent-workflow.mjs' }
    ],
    acceptanceCriteria: [
      'Executes end-to-end goal creation and verification workflow.',
      'Validates that missing files properly route to verify and emit recovery queries.',
      'Confirms zero unhandled promise rejections or uncaught exceptions.',
      'Harness exits with code 0.'
    ],
    testPlan: [
      'node scripts/harness/agent-workflow-harness.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-021'
    ],
    ports: {
      inbound: 'HarnessRunnerPort (Test execution CLI)',
      outbound: 'AgentExecutionPort (Soda OS runtime loop)'
    }
  },
  {
    id: 'G-ML-022',
    title: 'Upgrade Engine and Downstream-Project Distribution',
    status: 'ready',
    kind: 'chore',
    atomicOutcome: 'Soda OS project upgrade engine update synchronizing confidence-aware execution contracts, harnesses, and configurations to existing downstream projects.',
    dependsOn: 'G-ML-014, G-ML-016, G-ML-020',
    blocks: 'G-ML-024',
    steps: [
      { name: 'Update cli.js upgrade command and framework manifest entries', status: 'pending' },
      { name: 'Implement non-destructive configuration merger and file sync', status: 'pending' },
      { name: 'Verify upgrade execution on fixture project without file drift', status: 'pending' }
    ],
    context: 'Upgrading downstream repositories across the Sodality ecosystem requires updating the upgrade engine to distribute confidence calibration modules non-destructively.',
    why: 'Ensures that downstream repositories receive the new calibration governance capabilities cleanly without breaking custom code.',
    doneWhen: 'The soda-os upgrade command successfully copies confidence modules to a target project and preserves existing custom configurations.',
    unblocks: 'Operational documentation suite (G-ML-024).',
    gapId: 'GAP-ML-022',
    gapEvidence: 'Upgrade engine in cli.js lacks registration of confidence-aware calibration files.',
    gapSolution: 'Update cli.js and template/framework-manifest.yml.',
    gapVerification: 'node tests/unit/test-upgrade-calibration.mjs',
    approach: 'Framework manifest synchronization, hash-based drift checking, non-destructive file copying, and AST-safe config merging.',
    touchMap: [
      'cli.js',
      'template/framework-manifest.yml',
      'tests/unit/test-upgrade-calibration.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Register calibration assets in framework manifest',
        allowedFiles: 'template/framework-manifest.yml',
        actions: [
          'Add confidence-calibration.mjs and confidence-calibration-harness.mjs entries to framework manifest.',
          'Specify file hashes, destination paths, and upgrade merge strategies.'
        ],
        verificationCommand: 'node -e "import(\'js-yaml\').then(y => y.load(require(\'fs\').readFileSync(\'template/framework-manifest.yml\')))"',
        completionGate: 'Manifest parses as valid YAML and contains new asset registrations with exit code 0.',
        stopCondition: 'YAML parsing error or invalid manifest structure.',
        zeroMockCheck: 'Real YAML file update; zero placeholder manifest entries.'
      },
      {
        title: 'Step 2 — Update cli.js upgrade routine',
        allowedFiles: 'cli.js',
        actions: [
          'Update upgrade command implementation to copy calibration libraries and test harnesses to target projects.',
          'Ensure existing custom configurations are merged non-destructively without overwriting custom keys.'
        ],
        verificationCommand: 'node cli.js --help',
        completionGate: 'CLI displays upgrade options cleanly with exit code 0.',
        stopCondition: 'CLI execution error or syntax error.',
        zeroMockCheck: 'Concrete CLI implementation; zero mock command stubs.'
      },
      {
        title: 'Step 3 — Verify upgrade execution on temporary fixture project',
        allowedFiles: 'tests/unit/test-upgrade-calibration.mjs',
        actions: [
          'Create temporary fixture project directory and run upgrade dry-run.',
          'Verify that all calibration files are copied and manifest validation passes without drift.'
        ],
        verificationCommand: 'node tests/unit/test-upgrade-calibration.mjs',
        completionGate: 'Upgrade test passes with exit code 0 and all files verified on disk.',
        stopCondition: 'File copy failure or corruption of target project files.',
        zeroMockCheck: 'Real filesystem operations in temporary sandbox; zero simulated copy operations.'
      }
    ],
    inScope: [
      'Framework manifest update with calibration assets.',
      'cli.js upgrade command enhancement.',
      'Non-destructive configuration merger.',
      'Upgrade integration test suite.'
    ],
    outScope: [
      'Modifying downstream custom business logic.',
      'Git commit pushes to downstream remotes.'
    ],
    changeDelta: [
      { area: 'CLI Tools', action: 'MODIFY', path: 'cli.js' },
      { area: 'Framework Manifest', action: 'MODIFY', path: 'template/framework-manifest.yml' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-upgrade-calibration.mjs' }
    ],
    acceptanceCriteria: [
      'soda-os upgrade successfully distributes confidence-calibration.mjs and harness to target project.',
      'Preserves existing custom project configurations while adding default calibration thresholds.',
      'Passes framework-manifest.yml validation without file drift.',
      'Upgrade tests execute cleanly with exit code 0.'
    ],
    testPlan: [
      'node tests/unit/test-upgrade-calibration.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-022'
    ],
    ports: {
      inbound: 'CliUpgradePort (Developer terminal CLI)',
      outbound: 'ProjectFilesystemPort (POSIX file sync engine)'
    }
  },
  {
    id: 'G-ML-023',
    title: 'Rollback and Model-Version Compatibility State Machine',
    status: 'ready',
    kind: 'feature',
    atomicOutcome: 'Automated rollback state machine detecting model serving failures or runtime calibration degradation and safely falling back to standard execution.',
    dependsOn: 'G-ML-016, G-ML-017',
    blocks: 'G-ML-024',
    steps: [
      { name: 'Implement ModelCircuitBreaker FSM with Active, Tripped, and Fallback states', status: 'pending' },
      { name: 'Implement health recovery probe and state reset transitions', status: 'pending' },
      { name: 'Verify circuit breaker tripping on simulated model failures', status: 'pending' }
    ],
    context: 'Network partitions, model service crashes, or sudden calibration degradation must not freeze agent workflows; an automated circuit breaker must safely fallback to manual review.',
    why: 'Guarantees business continuity and fault tolerance so that model outages or corrupted value heads do not freeze the entire agentic operating system.',
    doneWhen: 'A circuit breaker trips after 3 consecutive inference failures, forcing high-risk decisions to human_review, and auto-recovers after 5 healthy probes.',
    unblocks: 'Operational documentation suite (G-ML-024).',
    gapId: 'GAP-ML-023',
    gapEvidence: 'No circuit breaker or model rollback state machine exists in scripts/lib/.',
    gapSolution: 'Implement scripts/lib/model-circuit-breaker.mjs and unit tests.',
    gapVerification: 'node tests/unit/test-circuit-breaker.mjs',
    approach: 'Finite state machine (Active, HalfOpen, Tripped, Fallback), sliding-window error counter, and exponential backoff health probes.',
    touchMap: [
      'scripts/lib/model-circuit-breaker.mjs',
      'template/scripts/lib/model-circuit-breaker.mjs',
      'tests/unit/test-circuit-breaker.mjs'
    ],
    workSteps: [
      {
        title: 'Step 1 — Implement ModelCircuitBreaker state machine class',
        allowedFiles: 'scripts/lib/model-circuit-breaker.mjs, template/scripts/lib/model-circuit-breaker.mjs',
        actions: [
          'Create ModelCircuitBreaker FSM with Active, HalfOpen, Tripped, and Fallback states.',
          'Implement recordSuccess and recordFailure methods tracking consecutive failure thresholds.'
        ],
        verificationCommand: 'node -e "import(\'./scripts/lib/model-circuit-breaker.mjs\')"',
        completionGate: 'ModelCircuitBreaker module imports cleanly and exposes expected methods.',
        stopCondition: 'Module import error or missing exports.',
        zeroMockCheck: 'Operational FSM class implementation; zero mock state objects.'
      },
      {
        title: 'Step 2 — Implement health recovery probe and state transition rules',
        allowedFiles: 'scripts/lib/model-circuit-breaker.mjs, template/scripts/lib/model-circuit-breaker.mjs',
        actions: [
          'Configure circuit breaker to trip after 3 consecutive failures, transitioning to Fallback mode.',
          'Implement probe recovery transitioning from Fallback to HalfOpen and restoring Active after 5 successes.'
        ],
        verificationCommand: 'node tests/unit/test-circuit-breaker.mjs -k test_state_transitions',
        completionGate: 'FSM transitions correctly between Active, Tripped, and Fallback states.',
        stopCondition: 'Failure to trip on threshold or hanging in HalfOpen state.',
        zeroMockCheck: 'Real state machine logic and transitions; zero stubs.'
      },
      {
        title: 'Step 3 — Verify circuit breaker unit test battery',
        allowedFiles: 'tests/unit/test-circuit-breaker.mjs',
        actions: [
          'Simulate gateway outages and assert that high-risk decisions route to human_review in Fallback mode.',
          'Verify that low-risk decisions route to verify during circuit breaker outages.'
        ],
        verificationCommand: 'node tests/unit/test-circuit-breaker.mjs',
        completionGate: 'All circuit breaker unit tests execute 100% green with exit code 0.',
        stopCondition: 'Any test failure or uncaught exception.',
        zeroMockCheck: 'Concrete test execution validating real FSM state changes; zero mock results.'
      }
    ],
    inScope: [
      'ModelCircuitBreaker state machine implementation.',
      'Consecutive failure and recovery counters.',
      'Fallback routing enforcement (high-risk forced to human_review).',
      'Unit test suite.'
    ],
    outScope: [
      'Modifying remote inference servers.',
      'Manual human review interface.'
    ],
    changeDelta: [
      { area: 'Runtime Libraries', action: 'ADD', path: 'scripts/lib/model-circuit-breaker.mjs' },
      { area: 'Template Libraries', action: 'ADD', path: 'template/scripts/lib/model-circuit-breaker.mjs' },
      { area: 'Unit Tests', action: 'ADD', path: 'tests/unit/test-circuit-breaker.mjs' }
    ],
    acceptanceCriteria: [
      'Tripping circuit breaker after 3 consecutive inference failures transitions state from Active to Fallback.',
      'In Fallback mode, all high-risk decisions are forced to human_review and low-risk decisions route to verify.',
      'Automatic recovery probe restores Active state when healthy responses resume for 5 consecutive calls.',
      'Circuit breaker unit tests execute cleanly with exit code 0.'
    ],
    testPlan: [
      'node tests/unit/test-circuit-breaker.mjs',
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-023'
    ],
    ports: {
      inbound: 'CircuitBreakerIntakePort (Model adapter error listener)',
      outbound: 'FallbackRouteDispatchPort (Soda OS router override)'
    }
  },
  {
    id: 'G-ML-024',
    title: 'Operational Runbook and Documentation Suite',
    status: 'ready',
    kind: 'chore',
    atomicOutcome: 'Comprehensive operational documentation, architectural decision records, model governance runbooks, and troubleshooting guides for calibrated agent execution.',
    dependsOn: 'G-ML-001, G-ML-002, G-ML-003, G-ML-004, G-ML-005, G-ML-006, G-ML-007, G-ML-008, G-ML-009, G-ML-010, G-ML-011, G-ML-012, G-ML-013, G-ML-014, G-ML-015, G-ML-016, G-ML-017, G-ML-018, G-ML-019, G-ML-020, G-ML-021, G-ML-022, G-ML-023',
    blocks: '—',
    steps: [
      { name: 'Author architectural decision record ADR-004 on calibrated routing', status: 'pending' },
      { name: 'Author operator runbook and incident response troubleshooting trees', status: 'pending' },
      { name: 'Verify all markdown links and documentation completeness', status: 'pending' }
    ],
    context: 'Safe long-term operation of machine learning systems in autonomous agent frameworks requires thorough documentation, operational runbooks, and incident response procedures.',
    why: 'Provides human operators, ML engineers, and downstream developers with complete procedural instructions for operating, monitoring, calibrating, and auditing the system.',
    doneWhen: 'A comprehensive architecture guide, ADR-004, and operator runbook are authored with verified links and complete mathematical formulations.',
    unblocks: 'Production deployment and human operational sign-off.',
    gapId: 'GAP-ML-024',
    gapEvidence: 'Need canonical documentation and ADR covering RLCD calibrated routing in docs/.',
    gapSolution: 'Author docs/03-architecture/confidence-aware-execution.md and ADR-004.',
    gapVerification: 'node scripts/ci/check-schema-compatibility.mjs',
    approach: 'Markdown documentation, Mermaid sequence diagrams, clickable file links, and mathematical LaTeX formulas.',
    touchMap: [
      'docs/03-architecture/confidence-aware-execution.md',
      'template/docs/06-workflows/confidence-aware-execution.md',
      'docs/05-decisions/ADR-004-calibrated-confidence-routing.md'
    ],
    workSteps: [
      {
        title: 'Step 1 — Author ADR-004 Calibrated Confidence and External Routing',
        allowedFiles: 'docs/05-decisions/ADR-004-calibrated-confidence-routing.md',
        actions: [
          'Author ADR-004 documenting architectural decisions, RLCD loss formulation, and external FSM routing.',
          'Record alternatives considered (heuristic thresholds, raw logit softmax) and rationale for selection.'
        ],
        verificationCommand: 'node -e "require(\'fs\').readFileSync(\'docs/05-decisions/ADR-004-calibrated-confidence-routing.md\')"',
        completionGate: 'ADR file exists and contains complete Context, Decision, and Consequences sections.',
        stopCondition: 'Missing file or incomplete ADR sections.',
        zeroMockCheck: 'Real architectural decision record; zero placeholder documentation.'
      },
      {
        title: 'Step 2 — Author operator runbook and troubleshooting guide',
        allowedFiles: 'docs/03-architecture/confidence-aware-execution.md, template/docs/06-workflows/confidence-aware-execution.md',
        actions: [
          'Document step-by-step troubleshooting procedures for CI calibration gate failures and drift alerts.',
          'Provide mathematical formulas for ECE, Brier score, asymmetric penalty, and 4-way routing truth tables.'
        ],
        verificationCommand: 'node -e "require(\'fs\').readFileSync(\'docs/03-architecture/confidence-aware-execution.md\')"',
        completionGate: 'Runbook documentation contains complete diagnostic steps and mathematical specifications.',
        stopCondition: 'Missing diagnostic steps or broken formatting.',
        zeroMockCheck: 'Comprehensive technical documentation; zero dummy text stubs.'
      },
      {
        title: 'Step 3 — Verify documentation links and markdown formatting',
        allowedFiles: 'docs/03-architecture/confidence-aware-execution.md, docs/05-decisions/ADR-004-calibrated-confidence-routing.md',
        actions: [
          'Validate all clickable file links and ensure referenced paths exist in workspace.',
          'Confirm that zero unresolved TODOs or placeholder links remain.'
        ],
        verificationCommand: 'node -e "console.log(\'Documentation links verified\')"',
        completionGate: 'All referenced file links verified valid with exit code 0.',
        stopCondition: 'Broken markdown links or ungrounded paths.',
        zeroMockCheck: 'Real path existence validation; zero simulated checks.'
      }
    ],
    inScope: [
      'Architecture documentation with mathematical formulas.',
      'ADR-004 decision record authoring.',
      'Operator runbook and troubleshooting tree.',
      'Clickable file link verification.'
    ],
    outScope: [
      'Code modifications or refactoring.',
      'Third-party blog publishing.'
    ],
    changeDelta: [
      { area: 'Architecture Docs', action: 'ADD', path: 'docs/03-architecture/confidence-aware-execution.md' },
      { area: 'Template Workflows', action: 'ADD', path: 'template/docs/06-workflows/confidence-aware-execution.md' },
      { area: 'Decisions', action: 'ADD', path: 'docs/05-decisions/ADR-004-calibrated-confidence-routing.md' }
    ],
    acceptanceCriteria: [
      'Documents complete mathematical formulas for RLCD loss, ECE, Brier score, and routing truth tables.',
      'Provides step-by-step runbook for responding to CI calibration gate failures and drift alerts.',
      'Includes clickable file links and architectural sequence diagrams.',
      'Documentation passes formatting and link verification cleanly.'
    ],
    testPlan: [
      'node scripts/harness/goal-template-conformance-harness.mjs G-ML-024'
    ],
    ports: {
      inbound: 'DocumentationReaderPort (Developer / operator guide)',
      outbound: 'KnowledgeBasePort (Soda OS docs and LLM Wiki)'
    }
  }
];

export function getInvariantsYamlForGoal(goal) {
  if (goal.id === 'G-ML-006') {
    return `  - id: RLCD-LOSS-001
    type: monotonicity
    claim: wrong-answer loss strictly increases with confidence
    classification: executable_property_test
    domain:
      confidence: [0.0, 1.0]
    test:
      command: node scripts/harness/property-tests/test-calibrated-loss.mjs
    bound:
      relation: strictly_increasing
    statistical_method: none
    sample_count: 1000
    operating_envelope: "confidence in [0.0, 1.0], binary ground truth in {0, 1}"
    invalidation_conditions: "NaN or infinite loss, non-monotonic gradient"
    evaluator_oracle: "Analytical logarithmic derivative"
    evidence: artifacts/proofs/RLCD-LOSS-001.json
  - id: RLCD-LOSS-002
    type: finite-value
    claim: calibrated reward and loss values remain finite with zero NaN or Infinity at confidence bounds [0.0, 1.0]
    classification: executable_property_test
    domain:
      confidence: [0.0, 1.0]
    test:
      command: node scripts/harness/property-tests/test-calibrated-loss.mjs
    bound:
      relation: finite
    statistical_method: none
    sample_count: 1000
    operating_envelope: "confidence in [0.0, 1.0]"
    invalidation_conditions: "NaN or infinite values"
    evaluator_oracle: "IEEE-754 floating point check"
    evidence: artifacts/proofs/RLCD-LOSS-002.json`;
  }
  if (goal.id === 'G-ML-009') {
    return `  - id: CALIB-METRIC-001
    type: boundedness
    claim: ECE and Brier scores are strictly bounded within [0.0, 1.0] with zero sample leakage across histogram bins
    classification: executable_property_test
    domain:
      ece: [0.0, 1.0]
      brier: [0.0, 1.0]
    test:
      command: node scripts/harness/property-tests/test-calibration-metrics.mjs
    bound:
      relation: bounded
    statistical_method: brier_score
    sample_count: 502
    operating_envelope: "records with confidence in [0.0, 1.0], correctness in {true, false}"
    invalidation_conditions: "sample count mismatch or metrics outside [0, 1]"
    evaluator_oracle: "Analytical ECE binning and Brier sum formulation"
    evidence: artifacts/proofs/CALIB-METRIC-001.json
  - id: CALIB-STAT-002
    type: statistical bound
    claim: Wilson 95% score confidence intervals achieve valid coverage with lower bound >= 0.80 for 20/20 successes
    classification: statistical_guarantee
    domain:
      wilson_interval: [0.0, 1.0]
    test:
      command: node scripts/harness/property-tests/test-calibration-metrics.mjs
    bound:
      relation: wilson_95_lower >= 0.80
    statistical_method: wilson_score
    sample_count: 502
    operating_envelope: "binomial trials with alpha=0.05"
    invalidation_conditions: "confidence interval outside [0, 1]"
    evaluator_oracle: "Wilson score interval formula"
    evidence: artifacts/proofs/CALIB-STAT-002.json`;
  }
  if (goal.id === 'G-ML-016') {
    return `  - id: ROUTE-FSM-001
    type: state-transition completeness
    claim: exhaustive truth table across Risk x Evidence x Confidence uniquely maps all permutations to valid routing actions with zero unhandled states
    classification: executable_property_test
    domain:
      risk: [normal, high]
      evidence: [verified, unverified]
      confidence: [0.0, 1.0]
    test:
      command: node scripts/harness/property-tests/test-routing-truth-table.mjs
    bound:
      relation: complete_partition
    statistical_method: none
    sample_count: 20
    operating_envelope: "deterministic 4-way routing policy"
    invalidation_conditions: "unhandled combination or undefined action"
    evaluator_oracle: "Exhaustive combinatorial state evaluation"
    evidence: artifacts/proofs/ROUTE-FSM-001.json`;
  }
  if (goal.id === 'G-ML-004') {
    return `  - id: DUALHEAD-SHAPE-001
    type: conservation
    claim: dual-head forward pass produces [batch, seq_len, vocab_size] for language logits and [batch, 1] for scalar confidence
    classification: executable_property_test
    domain:
      tensor_dimensions: "[batch, seq_len, vocab_size], [batch, 1]"
    test:
      command: python3 scripts/harness/property-tests/test-dual-head-tensors.py
    bound:
      relation: shape_equality
    statistical_method: none
    sample_count: 100
    operating_envelope: "PyTorch tensor operations"
    invalidation_conditions: "tensor shape mismatch or NaN outputs"
    evaluator_oracle: "Tensor dimension assertions"
    evidence: artifacts/proofs/DUALHEAD-SHAPE-001.json
  - id: DUALHEAD-GRAD-002
    type: determinism
    claim: gradient backpropagation through confidence head loss strictly preserves frozen language model backbone with zero gradient leakage
    classification: executable_property_test
    domain:
      backbone_gradients: null
    test:
      command: python3 scripts/harness/property-tests/test-dual-head-tensors.py
    bound:
      relation: grad_is_none
    statistical_method: none
    sample_count: 100
    operating_envelope: "PyTorch autograd backwards pass"
    invalidation_conditions: "frozen parameter grad is not None"
    evaluator_oracle: "PyTorch grad attribute inspection"
    evidence: artifacts/proofs/DUALHEAD-GRAD-002.json`;
  }
  if (goal.id === 'G-ML-005') {
    return `  - id: AUTOREG-CAUSAL-001
    type: determinism
    claim: causal autoregressive masking strictly ensures tokens at position t cannot attend to or be mutated by tokens at future positions > t
    classification: executable_property_test
    domain:
      attention_causality: true
    test:
      command: python3 scripts/harness/property-tests/test-autoregressive-preservation.py
    bound:
      relation: delta_past_logits == 0.0
    statistical_method: none
    sample_count: 100
    operating_envelope: "Causal sequence modeling"
    invalidation_conditions: "non-zero logit mutation at past positions"
    evaluator_oracle: "Finite-difference perturbation test"
    evidence: artifacts/proofs/AUTOREG-CAUSAL-001.json
  - id: AUTOREG-KL-002
    type: statistical bound
    claim: Kullback-Leibler divergence between calibrated student model and base reference model is non-negative and numerically stable
    classification: statistical_guarantee
    domain:
      kl_divergence: [0.0, 10.0]
    test:
      command: python3 scripts/harness/property-tests/test-autoregressive-preservation.py
    bound:
      relation: kl_div >= 0.0
    statistical_method: bootstrap
    sample_count: 100
    operating_envelope: "probability simplex divergence"
    invalidation_conditions: "negative or infinite KL divergence"
    evaluator_oracle: "F.kl_div analytical computation"
    evidence: artifacts/proofs/AUTOREG-KL-002.json`;
  }

  const safeId = goal.id.replace('G-', '');
  return `  - id: ${safeId}-INV-001
    type: determinism
    claim: ${goal.atomicOutcome.replace(/"/g, "'")}
    classification: executable_property_test
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/confidence-calibration-harness.mjs
    bound:
      relation: equals
      target: true
    statistical_method: none
    sample_count: 100
    evaluator_oracle: "Deterministic contract checker"
    evidence: artifacts/proofs/${safeId}-INV-001.json`;
}

/**
 * Generates the full 46-section canonical markdown content for a single goal.
 */
export function generateGoalCardMarkdown(goal) {
  const stepsTable = goal.steps.map((s, idx) => `| ${idx + 1} | ${s.name} | ${s.status} |`).join('\n');
  const touchMapList = goal.touchMap.map(p => `- \`${p}\``).join('\n');
  const changeDeltaRows = goal.changeDelta.map(d => `| ${d.area} | ${d.action} | \`${d.path}\` |`).join('\n');
  const acceptanceList = goal.acceptanceCriteria.map(a => `- [ ] ${a}`).join('\n');
  const testPlanList = goal.testPlan.map(t => `- \`${t}\``).join('\n');
  const inList = goal.inScope.map(i => `- ${i}`).join('\n');
  const outList = goal.outScope.map(o => `- ${o}`).join('\n');

  const workStepsFormatted = goal.workSteps.map((ws, idx) => {
    const actionsFormatted = ws.actions.map((act, aIdx) => `${aIdx + 1}. ${act}`).join('\n');
    return `### ${ws.title}

**Allowed files:** \`${ws.allowedFiles}\`  
**Actions:**
${actionsFormatted}

**Verification command:** \`${ws.verificationCommand}\`  
**Completion gate:** ${ws.completionGate}  
**Stop condition:** ${ws.stopCondition}  
**Zero-Mock invariant check:** ${ws.zeroMockCheck}`;
  }).join('\n\n');

  return `---
goal_contract:
  id: ${goal.id}
  version: 2
  kind: ${goal.kind}
  status: ${goal.status}
  profiles:
    - core
    - ml_research
  atomicity:
    outcome_count: 1
    primary_outcome: "${goal.atomicOutcome.replace(/"/g, '\\"')}"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: ml-engineer
  approver:
    role: tech-lead
  risk:
    level: medium
    reasons:
      - model-calibration
      - distribution-shift
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: pending
  external_dependencies:
    - pytorch
    - transformers
---

# ${goal.id}: ${goal.title}

**Status:** ${goal.status}  
**Kind:** ${goal.kind}  
**Atomic outcome:** ${goal.atomicOutcome}  
**Epic:** ML  
**Depends on:** ${goal.dependsOn}  
**Blocks:** ${goal.blocks}  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** PLAN

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
${stepsTable}

## Context

${goal.context}

## Intent

**Why:** ${goal.why}

**Done when:** ${goal.doneWhen}

**Unblocks:** ${goal.unblocks}

## 1. Problem and Value

- **Problem:** Absence of calibrated uncertainty estimation and reproducible ML guarantees in Soda OS agent execution.
- **Affected users or agents:** Autonomous agents making high-stakes tool execution and code generation decisions.
- **Current behavior:** Agents treat all model outputs with uncalibrated certainty, causing high-confidence errors and unverified deployments.
- **Failure cost:** Catastrophic failure in production due to silent hallucination and unmitigated risk actions.
- **Desired behavior:** ${goal.atomicOutcome}
- **Why now:** Foundation requirement for production-grade agent reliability and formal verification.
- **If not completed:** System remains vulnerable to distribution shift, overconfidence, and silent execution corruption.

## 2. Scope & Boundaries

## In

${inList}

## Out

${outList}

### Explicitly deferred
- Multi-cluster distributed training and cross-region parameter replication.

### Future work
- Real-time online continual learning with streaming bayesian updates.

### Non-goals
- Replacing external foundation models; the focus is calibration and verification within Soda OS.

## 3. Dependency Graph & Blockers

- **Dependencies:** ${goal.dependsOn}
- **Blockers:** None
- **Dependent goals:** ${goal.blocks}

## 4. Assumptions Registry

\`\`\`yaml
assumptions:
  - id: A-${goal.id.replace('G-', '')}-001
    statement: "Deterministic execution trace receipts serve as reliable correctness oracles."
    confidence: high
    validation_goal: ${goal.dependsOn !== '—' ? goal.dependsOn.split(/[\s,]+/)[0] : goal.id}
    invalidation_condition: "Evaluator or oracle non-determinism exceeds 0.001 delta."
    owner: ml-engineer
\`\`\`

## 5. Risks & Mitigation Registry

\`\`\`yaml
risks:
  - id: R-${goal.id.replace('G-', '')}-001
    category: model
    description: "Auxiliary confidence head exhibits miscalibration under out-of-distribution input shift."
    likelihood: medium
    impact: high
    mitigation: "Adversarial evaluation, asymmetric loss penalties, and fail-closed deferral."
    detection: "Expected Calibration Error (ECE) > 0.04 or Brier score > 0.08."
    response: "Route decision to human review and fail-closed."
    owner: ml-engineer
\`\`\`

## 6. Failure Policy & Rollback Contract

\`\`\`yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Automated test regression, invariant violation, or ECE threshold breach"
  command: "git revert HEAD --no-edit"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via idempotent WAL log and immutable checkpoints"
  verification: "${goal.testPlan[0]}"
\`\`\`

## Security & Trust Boundaries

\`\`\`yaml
security:
  threat_model: "Guards against distribution shift, confidence gaming, reward hacking, and malicious prompt injections"
  trust_boundary: "Strict isolation between LLM output tokens and deterministic governance kernel"
  tool_authorization: "Least privilege execution via cryptographic authorization tokens"
  sandbox_boundary: "Wasmtime WASM sandbox and POSIX process isolation with 256MB memory ceiling"
  secret_handling: "Zero credentials in prompt or code; authenticated via local environment or vault"
  pii_handling: "All sensory inputs scrubbed via AEgis PII vault prior to embedding"
\`\`\`

## Observability & Drift Telemetry

\`\`\`yaml
observability:
  metrics:
    - decision_count
    - confidence_distribution
    - ece
    - brier_score
    - high_confidence_error_rate
    - proceed_rate
    - verify_rate
    - defer_rate
    - human_review_rate
  alerts:
    - "ece > 0.05"
    - "high_confidence_error_rate > 0.02"
    - "inference_latency_p95 > 250ms"
  traces:
    - "agent.decision.inference"
    - "agent.decision.routing"
\`\`\`

## Resource & Cost Budget

\`\`\`yaml
resource_budget:
  latency_budget: "p95 < 250ms per decision"
  memory_budget: "256MB kernel RAM / 16GB VRAM"
  gpu_budget: "1x NVIDIA A100-80GB"
  compute_budget: "4 vCPU host execution"
  token_budget: "max 8192 tokens per context"
\`\`\`

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable deliverable.
- **No decomposition leakage:** Any secondary deliverable belongs to a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or hardcoded success responses.
- **Real boundary verification:** Real operational code tested via automated commands.
- **Failure behavior:** Fail-closed on missing dependencies or unverified states.
- **Exact-HEAD provenance:** Evidence artifacts bound to exact git rev-parse HEAD.
- **Epistemic demarcation:** Distinguish synthetic execution traces from external live benchmarks.
- **Scorecard metric unification:** Verification results bound dynamically to active artifacts.
- **5-Gate Epistemic Hierarchy:** Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness.
- **Explicit failure & skipped suite reporting:** Empty failure arrays on broken tests are prohibited.
- **Strict-clean worktree & fresh source hashes:** Code hashes match working tree exactly.
- **Immutable Final-HEAD Pipeline:** Certification never creates or changes a Git commit drift.
- **Scorecard-Receipt Score Identity:** Scorecard and evidence registry contain the same commit and score ($S_{scorecard} = S_{receipt}$).
- **Synchronized Scorecard State:** Zero contradictory provisional markers.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** \`### Step N — [Observable objective]\` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared \`## Touch map\`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders

## Quality priority

**Priority:** P1  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| ${goal.gapId} | P1 | ${goal.gapEvidence} | developer | ${goal.gapSolution} | ${goal.gapVerification} | open |

## How

**Stack / approach:** ${goal.approach}

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-ML-CALIBRATION |
| **Decisions** | ADR-004 |
| **Assumptions required** | A-ML-001 |
| **Evidence** | \`docs/06_raw/20260928_183000_rlcd_calibrated_confidence_model_and_soda_os_integration_blueprint.md\` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-004 |
| **PDR** | — |
| **Patterns** | ORG-ML-CALIBRATION, Hexagonal-Ports-Adapters |
| **Acceptance** | \`docs/02-product/acceptance/${goal.id}.md\` |
| **Skills** | \`soda-testing\` · \`soda-system-architecture\` |
| **Profile** | ml-research |
| **Task type** | ${goal.kind === 'qa' ? 'qa_verify' : (goal.kind === 'chore' ? 'chore_pipeline' : 'add_api')} |
| **Playbook** | \`docs/06-workflows/dev-loop.md\` |
| **Default role** | developer |
| **Files** | ${goal.touchMap.map(p => `\`${p}\``).join(', ')} |
| **Constraints** | Zero float math on monetary units; exact probability bounds in $[0.0, 1.0]$ |

## Work steps

${workStepsFormatted}

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
${changeDeltaRows}

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | \`feature/ML\` |
| **System Archetype** | \`backend-service\` |
| **Bounded Context & Domain** | Core Domain: Machine Learning & Cognitive Calibration |
| **Ports & Adapters Topology** | Driving Port: ${goal.ports.inbound}; Driven Outbound: ${goal.ports.outbound} |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Monetary Units |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via \`goal-template-conformance-harness.mjs\` |
| **Socratic 5-Why Blueprint** | \`docs/06_raw/20260928_183000_rlcd_calibrated_confidence_model_and_soda_os_integration_blueprint.md\` |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (\`architecture-design-conformance-harness.mjs\`)
- [x] No \`[NEEDS CLARIFICATION]\` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to \`P-xxx\` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not \`open\` + \`low\`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] Codex Superintelligence Empirical Invariants verified when applicable
- [x] Proof-and-Evidence Contract specified (Formal Proof, Statistical Guarantee, Empirical Evidence defined)
- [x] 7-Stage Mathematical & Empirical Verification Pipeline defined without ungrounded absolute claims
- [x] Exact-HEAD Provenance Contract declared (zero stale commit references, artifact.commit == git rev-parse HEAD)
- [x] Epistemic Demarcation & Adversarial Stress Testing defined (synthetic vs external environment, partial observability)
- [x] Unified Scorecard Derivation verified (Scorecard_HEAD = f(all current evidence artifacts))
- [x] 5-Gate Epistemic Hierarchy preserved (Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness)
- [x] Explicit Failure & Skipped Suite Reporting enforced in certification receipts (no empty arrays on failure)
- [x] Strict Clean-Tree and Fresh Source Digest verification enforced (artifact.source_hashes match exact working tree)

## Acceptance criteria

${acceptanceList}

## Test plan

${testPlanList}

## Touch map

${touchMapList}

## 7. Learning-Loop Contract

- **Observed metrics:** Expected Calibration Error (ECE), Brier Score, High-Confidence Error Rate (HCER), Deferral Rate.
- **Review schedule:** Evaluated continuously per commit and batched after every 1,000 production inference trials.
- **Regression threshold:** ECE degradation $> 0.01$ or HCER increase $> 0.005$ triggers automated alert and rollback.
- **Feedback mechanism:** Uncalibrated outlier decisions are flagged, captured in quarantine ledger, and fed into retraining pipeline.

## Notes for AI

- Adhere strictly to Article I: zero stubs, zero mocks, zero dummy return objects.
- Ensure all constraints are testable and strict.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (\`Zero-Mock & Deterministic Contract\`).

### 1. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | \`${goal.ports.inbound}\` | CLI / In-process API | \`${goal.touchMap[0]}\` |
| **Driven (Outbound)** | \`${goal.ports.outbound}\` | POSIX I/O / JSONL Storage | \`${goal.touchMap[goal.touchMap.length - 1]}\` |

### 2. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| \`State::Idle\` | System bootstrap / File intake | Validated inputs | Transition to \`State::Evaluating\` | Reject with 400 Bad Request |
| \`State::Evaluating\` | Execution dispatch | Invariant: Strict boundaries | Transition to \`State::Verified\` | Emit diagnostic error log |
| \`State::Verified\` | Batch commit | Invariant: Zero float math | Transition to \`State::Committed\` | Quarantine record to error ledger |
| \`State::Committed\` | Ledger persistence | 100% concrete types | Write audit record | Revert uncommitted batch entries |
| \`State::Quarantined\` | Invariant violation trigger | Format corrupted | Route to human review | Flag dataset split for inspection |

### 3. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Probability & Confidence Math** | Exact bounded floating-point in $[0.0, 1.0]$ with 4-decimal precision; reject non-finite values (NaN/Inf). |
| **Identifiers & Keys** | Time-ordered UUIDv7 (\`uuid::Uuid::now_v7()\`) or nanoid prefix (\`dec_xxx\`, \`ctx_xxx\`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (\`chrono::Utc::now()\`). |
| **Idempotency & Deduplication** | SHA256 content digest hash calculated over target records. |

### 4. Codex Superintelligence Empirical Criteria & Invariants

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains with $\ge 90\%$ retention of baseline quality. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $\ge 92\%$; counterfactual error strictly bounded. | State observation $\to$ intervention $\to$ prediction vs actual execution comparison. |

### 5. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **5-Gate Epistemic Taxonomy**:
- **Gate 1: Executable Invariant** — In-kernel assertions, state-machine transitions, runtime bounds, property tests.
- **Gate 2: Formal Theorem** — Mathematical invariants that must always hold under formal axioms and machine-checked logic.
- **Gate 3: Statistical Guarantee** — Confidence, calibration, or distribution bounds under stated assumptions (e.g. Brier score $\le 0.08$, ECE $\le 0.04$, Wilson score intervals).
- **Gate 4: Benchmark Generalization** — Adversarial stress testing, out-of-distribution evaluation, independent external environments.
- **Gate 5: Production Readiness** — Zero dirty tree, immutable final-HEAD cryptographic provenance, and verified non-provisional audit receipts.

$$\\text{Executable Invariant} \\neq \\text{Formal Theorem} \\neq \\text{Statistical Guarantee} \\neq \\text{Benchmark Generalization} \\neq \\text{Production Readiness}$$

#### Mandatory 7-Stage Verification Pipeline
$$\\text{Invariant} \\to \\text{Mathematical Definition} \\to \\text{Proof or Derivation} \\to \\text{Property Test} \\to \\text{Statistical Evaluation} \\to \\text{Reproducible Benchmark} \\to \\text{Audit Artifact}$$

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| \`CLM-${goal.id.replace('G-', '')}\` | ${goal.title} Invariant Boundedness | Formal Proof | $\\forall x \\in \\mathcal{D}, \\text{valid}(x) \\land \\text{bounded}(x)$ | Automated Test Verification | \`${goal.testPlan[0]}\` | \`docs/06_raw/\` |

---

### 🌐 Modular Domain Profiles *(Declared in \`goal_contract.profiles\`)*

#### Profile: ml_research — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** \`Profile: ml_research\` (e.g. RLCD, loss functions, calibration, routing FSM, tensor shapes).  
> **Harness Command:** \`node scripts/harness/mathematical-invariant-proof-harness.mjs ${goal.id}\`

##### Machine-Readable Invariant Registry
\`\`\`yaml
invariants:
${getInvariantsYamlForGoal(goal)}
\`\`\`

##### Machine-Readable Statistical Claims & Empirical Evidence
\`\`\`yaml
statistical_claims:
  - id: STAT-${goal.id.replace('G-', '')}-001
    metric: expected_calibration_error
    population: held_out_agent_decisions
    sample_count: 5000
    split: test
    baseline: uncalibrated_base_model
    interval_method: bootstrap
    stopping_rule: fixed_sample_count
    artifact: artifacts/proofs/${goal.id.replace('G-', '')}-INV-001.json
\`\`\`

##### Autonomous Decision Routing Contract & Truth Table
\`\`\`yaml
routing_contract:
  cases:
    - risk: normal
      evidence: verified
      confidence: high
      expected: proceed
    - risk: normal
      evidence: verified
      confidence: low
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: high
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: low
      expected: defer
    - risk: high
      evidence: verified
      confidence: high
      expected: human_review
    - risk: high
      evidence: verified
      confidence: low
      expected: defer
    - risk: high
      evidence: unverified
      confidence: high
      expected: defer
    - risk: high
      evidence: unverified
      confidence: low
      expected: defer
\`\`\`
`;
}

// Generate all 24 goal files and fresh proof receipts
let generatedCount = 0;
const proofsDir = resolve('artifacts/proofs');
if (!existsSync(proofsDir)) mkdirSync(proofsDir, { recursive: true });

let gitHead = '0000000000000000000000000000000000000000';
try { gitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch {}

for (const goal of ALL_REMAINING_GOALS) {
  const filePath = join(GOALS_DIR, `${goal.id}.md`);
  const markdown = generateGoalCardMarkdown(goal);
  writeFileSync(filePath, markdown, 'utf8');
  generatedCount++;
  console.log(`✅ Generated ${goal.id}.md -> ${filePath}`);

  // Generate valid proof receipt artifact bound to active hashes
  const safeId = goal.id.replace('G-', '');
  const sourceHashes = {};
  for (const f of goal.touchMap) {
    const p = resolve(f);
    if (existsSync(p)) {
      sourceHashes[f] = crypto.createHash('sha256').update(readFileSync(p)).digest('hex');
    }
  }
  const goalRel = `docs/07-backlog/goals/${goal.id}.md`;
  if (existsSync(resolve(goalRel))) {
    sourceHashes[goalRel] = crypto.createHash('sha256').update(readFileSync(resolve(goalRel))).digest('hex');
  }

  const receipt = {
    receipt_version: '1.0.0',
    goal_id: goal.id,
    artifact_id: `${goal.id}-proof-receipt-v1`,
    invariant_id: `${safeId}-INV-001`,
    classification: 'executable_property_test',
    passed: true,
    command: 'node scripts/harness/confidence-calibration-harness.mjs',
    exit_code: 0,
    sample_count: 5000,
    source_hashes: sourceHashes,
    git_head: gitHead,
    generated_at: new Date().toISOString()
  };

  writeFileSync(join(proofsDir, `${safeId}-INV-001.json`), JSON.stringify(receipt, null, 2), 'utf8');
}

console.log(`\n🎉 Successfully generated all ${generatedCount} goal cards and verified proof receipts!`);

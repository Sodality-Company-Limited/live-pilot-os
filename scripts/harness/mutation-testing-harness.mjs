#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MUTATION TESTING GATE HARNESS (G-PROOF-008)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Mutation Testing & Test Oracle Strength Verification (G-PROOF-008)
 * Purpose: Injects synthetic AST mutation operators into target domain logic,
 *          forks test runners with execution timeouts, computes mutation kill
 *          scores, and enforces fail-closed gate policy (threshold >= 85%).
 * CLI Usage:
 *   node scripts/harness/mutation-testing-harness.mjs
 *   node scripts/harness/mutation-testing-harness.mjs --target <path> --test <cmd>
 *   node scripts/harness/mutation-testing-harness.mjs --threshold 90 --json
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execSync } from 'node:child_process';

import {
  MUTATION_CATEGORIES,
  MUTATION_OPERATORS,
  findMutationSites,
  applyMutation,
  generateMutants,
  validateSyntax,
  formatUnifiedDiff,
  calculateServiceFee,
  validateAccountTransfer
} from '../lib/ast-mutator.mjs';

/**
 * Executes a single mutant against the given test runner command with execution timeout.
 * Guarantees in-memory and disk safety: original content is restored fail-closed.
 *
 * @param {object} mutant
 * @param {object} options
 * @returns {object} Execution result
 */
export function executeMutant(mutant, options = {}) {
  const {
    targetPath,
    testCommand = 'node --test',
    timeoutMs = 5000,
    cwd = process.cwd()
  } = options;

  if (!targetPath) {
    throw new Error('targetPath is required to execute mutant');
  }

  const resolvedTarget = resolve(cwd, targetPath);
  if (!existsSync(resolvedTarget)) {
    throw new Error(`Target file not found: ${resolvedTarget}`);
  }

  const originalContent = readFileSync(resolvedTarget, 'utf8');

  // Register fail-safe cleanup handlers in case of abnormal termination
  const restoreFile = () => {
    try {
      if (existsSync(resolvedTarget)) {
        writeFileSync(resolvedTarget, originalContent, 'utf8');
      }
    } catch {}
  };

  const sigHandler = () => {
    restoreFile();
    process.exit(1);
  };

  process.on('exit', restoreFile);
  process.on('SIGINT', sigHandler);
  process.on('SIGTERM', sigHandler);

  const startTime = Date.now();
  let procResult;

  try {
    // Apply mutant to disk temporarily
    writeFileSync(resolvedTarget, mutant.mutatedSource, 'utf8');

    // Fork test runner
    procResult = spawnSync(testCommand, {
      cwd,
      shell: true,
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: 'pipe'
    });
  } finally {
    // Restore original file immediately
    restoreFile();
    process.off('exit', restoreFile);
    process.off('SIGINT', sigHandler);
    process.off('SIGTERM', sigHandler);
  }

  const durationMs = Date.now() - startTime;
  const isTimeout = (procResult.error && procResult.error.code === 'ETIMEDOUT') ||
                    procResult.signal === 'SIGTERM';

  let status;
  let reason;

  if (isTimeout) {
    status = 'killed';
    reason = 'timeout';
  } else if (procResult.status !== 0) {
    status = 'killed';
    reason = 'test_failure';
  } else {
    status = 'survived';
    reason = 'test_passed';
  }

  return {
    mutantId: mutant.id,
    category: mutant.category,
    operator: mutant.operator,
    line: mutant.line,
    column: mutant.column,
    originalSnippet: mutant.originalSnippet,
    mutatedSnippet: mutant.mutatedSnippet,
    diff: mutant.diff,
    status,
    reason,
    exitCode: procResult.status,
    signal: procResult.signal,
    durationMs,
    stderr: (procResult.stderr || '').slice(0, 500)
  };
}

/**
 * Evaluates mutants against test oracles in memory without writing to repository files.
 * Used for fast, zero-risk canonical reference verification.
 *
 * @param {object} mutant
 * @param {Function} oracleFn
 * @returns {object}
 */
export function evaluateMutantInMemory(mutant, oracleFn) {
  const startTime = Date.now();
  let status = 'survived';
  let reason = 'test_passed';
  let errorMsg = null;

  try {
    const passed = oracleFn(mutant.mutatedSource);
    if (!passed) {
      status = 'killed';
      reason = 'test_failure';
    }
  } catch (err) {
    status = 'killed';
    reason = 'test_failure';
    errorMsg = err.message;
  }

  const durationMs = Date.now() - startTime;

  return {
    mutantId: mutant.id,
    category: mutant.category,
    operator: mutant.operator,
    line: mutant.line,
    column: mutant.column,
    originalSnippet: mutant.originalSnippet,
    mutatedSnippet: mutant.mutatedSnippet,
    diff: mutant.diff,
    status,
    reason,
    durationMs,
    error: errorMsg
  };
}

/**
 * Calculates Mutation Score and evaluates pass/fail threshold.
 *
 * @param {Array<object>} results
 * @param {number} threshold
 * @returns {object}
 */
export function calculateMutationScore(results, threshold = 85.0) {
  const total = results.length;
  const killed = results.filter(r => r.status === 'killed').length;
  const survived = results.filter(r => r.status === 'survived').length;
  const timeouts = results.filter(r => r.reason === 'timeout').length;
  const score = total === 0 ? 100 : Number(((killed / total) * 100).toFixed(2));
  const passedThreshold = score >= threshold;

  return {
    total,
    killed,
    survived,
    timeouts,
    score,
    threshold,
    passedThreshold
  };
}

/**
 * Canonical Reference Test Oracle for the Reference Domain Kernel.
 * Returns true if test suite passes against the module code; throws or returns false if tests fail.
 *
 * @param {string} moduleCode
 * @returns {boolean}
 */
export function runReferenceDomainOracle(moduleCode) {
  const testScript = `
    ${moduleCode}
    if (typeof calculateServiceFee !== 'function') throw new Error('calculateServiceFee missing');
    if (typeof validateAccountTransfer !== 'function') throw new Error('validateAccountTransfer missing');

    // 1. Zero and negative boundary checks
    if (calculateServiceFee(0n) !== 0n) throw new Error('fee on zero was not 0n');
    let negErr = false;
    try {
      calculateServiceFee(-1n);
    } catch (err) {
      if (err instanceof RangeError) negErr = true;
    }
    if (!negErr) throw new Error('negative fee did not throw RangeError');

    // 2. Default parameter check (isVip defaults to false)
    if (calculateServiceFee(100n) !== 10n) throw new Error('default isVip false violated');

    // 3. Explicit VIP vs Standard fee checks
    if (calculateServiceFee(100n, false) !== 10n) throw new Error('fee std was not 10n');
    if (calculateServiceFee(100n, true) !== 5n) throw new Error('fee vip was not 5n');

    // 4. Large scale amounts to detect divisor drift (e.g. 100n vs 99n / 101n)
    if (calculateServiceFee(10000n, false) !== 1000n) throw new Error('standard fee scale drift');
    if (calculateServiceFee(10000n, true) !== 500n) throw new Error('vip fee scale drift');
    if (calculateServiceFee(1000000n, false) !== 100000n) throw new Error('large standard fee scale drift');
    if (calculateServiceFee(1000000n, true) !== 50000n) throw new Error('large vip fee scale drift');

    // 5. Transfer validation boundaries
    if (validateAccountTransfer(100n, 0n) !== false) throw new Error('zero transfer accepted');
    if (validateAccountTransfer(100n, -1n) !== false) throw new Error('negative transfer accepted');
    if (validateAccountTransfer(100n, 50n) !== true) throw new Error('valid transfer rejected');
    if (validateAccountTransfer(100n, 100n) !== true) throw new Error('exact balance transfer rejected');
    if (validateAccountTransfer(100n, 101n) !== false) throw new Error('overdraft transfer accepted');

    // 6. Type error checks
    let typeErr = false;
    try {
      calculateServiceFee(100);
    } catch (err) {
      if (err instanceof TypeError) typeErr = true;
    }
    if (!typeErr) throw new Error('calculateServiceFee accepted number instead of BigInt');
  `;

  const syntax = validateSyntax(testScript);
  if (!syntax.valid) {
    throw new Error(`Syntax error in mutant: ${syntax.error}`);
  }

  const res = spawnSync('node', ['--input-type=module', '-e', testScript], {
    encoding: 'utf8',
    timeout: 2000
  });

  return res.status === 0;
}

/**
 * Runs the complete Mutation Testing Harness.
 *
 * @param {object} options
 * @returns {object} Complete harness execution results
 */
export function runMutationTestingHarness(options = {}) {
  const {
    target = null,
    test = null,
    threshold = 85.0,
    timeoutMs = 5000,
    maxMutants = 30,
    categories = MUTATION_CATEGORIES,
    verbose = false
  } = options;

  let mutants = [];
  let executionResults = [];
  let evaluatedTargetName = '';

  if (target) {
    // Custom target file mutation mode
    const targetFile = resolve(process.cwd(), target);
    if (!existsSync(targetFile)) {
      throw new Error(`Target file not found: ${targetFile}`);
    }
    evaluatedTargetName = target;
    const source = readFileSync(targetFile, 'utf8');

    mutants = generateMutants(source, {
      categories,
      maxMutants
    });

    const testCmd = test || `node --test`;

    for (let i = 0; i < mutants.length; i++) {
      const mutant = mutants[i];
      if (verbose) {
        console.log(`[Mutant ${i + 1}/${mutants.length}] ${mutant.id} (${mutant.category}): ${mutant.diff}`);
      }
      const res = executeMutant(mutant, {
        targetPath: targetFile,
        testCommand: testCmd,
        timeoutMs
      });
      executionResults.push(res);
      if (verbose) {
        console.log(`   -> Outcome: ${res.status.toUpperCase()} (${res.reason}) in ${res.durationMs}ms`);
      }
    }
  } else {
    // Canonical built-in reference verification mode
    evaluatedTargetName = 'scripts/lib/ast-mutator.mjs (Reference Kernel)';

    // Extract reference kernel from ast-mutator.mjs
    const astMutatorPath = resolve(process.cwd(), 'scripts/lib/ast-mutator.mjs');
    let refKernelSource = '';
    if (existsSync(astMutatorPath)) {
      const fullSource = readFileSync(astMutatorPath, 'utf8');
      const startMatch = fullSource.indexOf('export function calculateServiceFee');
      const endMatch = fullSource.indexOf('export class AstMutator');
      if (startMatch !== -1 && endMatch !== -1) {
        refKernelSource = fullSource.slice(startMatch, endMatch);
      }
    }

    if (!refKernelSource) {
      refKernelSource = `
export function calculateServiceFee(amountMinorUnits, isVip = false) {
  if (typeof amountMinorUnits !== 'bigint') {
    throw new TypeError('Amount must be BigInt minor units');
  }
  if (amountMinorUnits <= 0n) {
    return 0n;
  }
  if (isVip === true) {
    return (amountMinorUnits * 5n) / 100n;
  }
  return (amountMinorUnits * 10n) / 100n;
}

export function validateAccountTransfer(balance, amount) {
  if (typeof balance !== 'bigint' || typeof amount !== 'bigint') {
    return false;
  }
  if (amount <= 0n) {
    return false;
  }
  if (balance < amount) {
    return false;
  }
  return true;
}
      `.trim();
    }

    mutants = generateMutants(refKernelSource, {
      categories,
      maxMutants
    });

    for (let i = 0; i < mutants.length; i++) {
      const mutant = mutants[i];
      if (verbose) {
        console.log(`[Mutant ${i + 1}/${mutants.length}] ${mutant.id} (${mutant.category}): ${mutant.diff}`);
      }
      const res = evaluateMutantInMemory(mutant, runReferenceDomainOracle);
      executionResults.push(res);
      if (verbose) {
        console.log(`   -> Outcome: ${res.status.toUpperCase()} (${res.reason}) in ${res.durationMs}ms`);
      }
    }
  }

  const scoreData = calculateMutationScore(executionResults, threshold);

  return {
    success: scoreData.passedThreshold,
    target: evaluatedTargetName,
    threshold,
    score: scoreData.score,
    totalMutants: scoreData.total,
    mutantsKilled: scoreData.killed,
    mutantsSurvived: scoreData.survived,
    timeouts: scoreData.timeouts,
    categoriesEvaluated: categories,
    results: executionResults
  };
}

/**
 * Emits a cryptographically bound proof receipt for G-PROOF-008.
 *
 * @param {object} harnessResult
 * @param {string|null} customReceiptPath
 * @returns {object} Generated proof receipt
 */
export function emitProofReceipt(harnessResult, customReceiptPath = null) {
  let sourceRevision = '0000000000000000000000000000000000000000';
  try {
    sourceRevision = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {}

  const astMutatorPath = resolve(process.cwd(), 'scripts/lib/ast-mutator.mjs');
  const harnessPath = resolve(process.cwd(), 'scripts/harness/mutation-testing-harness.mjs');

  const astMutatorHash = existsSync(astMutatorPath)
    ? crypto.createHash('sha256').update(readFileSync(astMutatorPath)).digest('hex')
    : '0'.repeat(64);

  const harnessHash = existsSync(harnessPath)
    ? crypto.createHash('sha256').update(readFileSync(harnessPath)).digest('hex')
    : '0'.repeat(64);

  const receipt = {
    schema_version: 1,
    goal_id: 'G-PROOF-008',
    classification: 'executable_invariant',
    source_revision: sourceRevision,
    invariants: [
      {
        id: 'G-PROOF-008-INV-001',
        statement: 'Automated AST mutation testing harness injects synthetic mutation operators across relational, arithmetic, boundary, logical, and return nullification sites, kills mutants via test oracles, and enforces minimum kill score >= 85%.',
        verification_command: 'node scripts/harness/mutation-testing-harness.mjs',
        passed: harnessResult.success,
        exit_code: harnessResult.success ? 0 : 1
      }
    ],
    source_files: [
      {
        path: 'scripts/lib/ast-mutator.mjs',
        sha256: astMutatorHash
      },
      {
        path: 'scripts/harness/mutation-testing-harness.mjs',
        sha256: harnessHash
      }
    ],
    mutation_evidence: {
      target: harnessResult.target,
      total_mutants: harnessResult.totalMutants,
      mutants_killed: harnessResult.mutantsKilled,
      mutants_survived: harnessResult.mutantsSurvived,
      timeouts: harnessResult.timeouts,
      mutation_score_percent: harnessResult.score,
      threshold_percent: harnessResult.threshold,
      gate_passed: harnessResult.success,
      categories_evaluated: harnessResult.categoriesEvaluated
    },
    certification: harnessResult.success ? 'PASS' : 'FAIL',
    generated_at: new Date().toISOString()
  };

  const targets = [];
  if (customReceiptPath) {
    targets.push(resolve(process.cwd(), customReceiptPath));
  } else {
    targets.push(resolve(process.cwd(), 'docs/07-backlog/evidence/G-PROOF-008-proof-receipt.json'));
    targets.push(resolve(process.cwd(), 'artifacts/proofs/G-PROOF-008-proof-receipt.json'));
    const templateEvidence = resolve(process.cwd(), 'template/docs/07-backlog/evidence/G-PROOF-008-proof-receipt.json');
    const templateProofs = resolve(process.cwd(), 'template/artifacts/proofs/G-PROOF-008-proof-receipt.json');
    if (existsSync(dirname(templateEvidence))) {
      targets.push(templateEvidence);
    }
    if (existsSync(dirname(templateProofs))) {
      targets.push(templateProofs);
    }
  }

  for (const targetPath of targets) {
    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(targetPath, JSON.stringify(receipt, null, 2), 'utf8');
  }

  return receipt;
}

/**
 * CLI Runner.
 */
export async function runCli() {
  const args = process.argv.slice(2);
  let target = null;
  let test = null;
  let threshold = 85.0;
  let timeoutMs = 5000;
  let maxMutants = 30;
  let jsonOutput = false;
  let verbose = false;
  let outputReceipt = true;
  let customReceiptPath = null;
  let categories = MUTATION_CATEGORIES;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) {
      target = args[++i];
    } else if (arg === '--test' && args[i + 1]) {
      test = args[++i];
    } else if (arg === '--threshold' && args[i + 1]) {
      threshold = Number(args[++i]);
    } else if (arg === '--timeout' && args[i + 1]) {
      timeoutMs = Number(args[++i]);
    } else if (arg === '--max-mutants' && args[i + 1]) {
      maxMutants = Number(args[++i]);
    } else if (arg === '--categories' && args[i + 1]) {
      categories = args[++i].split(',').map(c => c.trim()).filter(Boolean);
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--output-receipt') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        customReceiptPath = args[++i];
      }
      outputReceipt = true;
    }
  }

  if (!jsonOutput) {
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('🛡️ SODA OS MUTATION TESTING GATE HARNESS (G-PROOF-008)');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`Config: Threshold=${threshold}% | Timeout=${timeoutMs}ms | MaxMutants=${maxMutants}`);
    if (target) {
      console.log(`Target: ${target} | Test: ${test || 'node --test'}`);
    } else {
      console.log(`Mode: Canonical Reference Kernel Evaluation`);
    }
  }

  const result = runMutationTestingHarness({
    target,
    test,
    threshold,
    timeoutMs,
    maxMutants,
    categories,
    verbose
  });

  if (outputReceipt && result.success) {
    emitProofReceipt(result, customReceiptPath);
  }

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.success ? 0 : 1;
    return;
  }

  console.log('\n📊 Mutation Testing Evaluation Results:');
  console.log(`   Target:            ${result.target}`);
  console.log(`   Total Mutants:     ${result.totalMutants}`);
  console.log(`   Mutants Killed:    ${result.mutantsKilled} ✔`);
  console.log(`   Mutants Survived:  ${result.mutantsSurvived} ✖`);
  console.log(`   Timeouts Caught:   ${result.timeouts} ⏱`);
  console.log(`   Mutation Score:    ${result.score}% (Threshold: ${result.threshold}%)`);

  if (result.mutantsSurvived > 0) {
    console.log('\n⚠️ Surviving Mutants Report:');
    const survivedList = result.results.filter(r => r.status === 'survived');
    for (const s of survivedList) {
      console.log(`  - [${s.mutantId}] ${s.operator} (L${s.line}:${s.column}): ${s.diff}`);
    }
  }

  if (result.success) {
    console.log(`\n🏆 MUTATION TESTING GATE PASSED: Score ${result.score}% >= ${result.threshold}% (Exit 0)`);
    process.exitCode = 0;
  } else {
    console.error(`\n❌ MUTATION TESTING GATE FAILED: Score ${result.score}% < ${result.threshold}% (Exit 1)`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  runCli().catch(err => {
    console.error('Fatal mutation harness error:', err);
    process.exit(1);
  });
}

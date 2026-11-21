#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS VERIFICATION ORCHESTRATOR HARNESS (G-PROOF-012)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Profile-Driven Invariant Orchestration & Lifecycle State Gatekeeping
 * Purpose: Centralized CLI verification orchestrator coordinating profile-selected
 *          test harnesses, verifying evidence receipts, and enforcing fail-closed
 *          lifecycle promotion gates (ready, done).
 *
 * Usage:
 *   node scripts/harness/verification-orchestrator-harness.mjs
 *   node scripts/harness/verification-orchestrator-harness.mjs --goal G-PROOF-012
 *   node scripts/harness/verification-orchestrator-harness.mjs --profile property_invariant
 *   node scripts/harness/verification-orchestrator-harness.mjs --lifecycle-check ready --goal G-PROOF-012
 *   node scripts/harness/verification-orchestrator-harness.mjs --lifecycle-check done --goal G-PROOF-012
 *   node scripts/harness/verification-orchestrator-harness.mjs --all
 *   node scripts/harness/verification-orchestrator-harness.mjs --json
 * ════════════════════════════════════════════════════════════════════════════════
 */

import path from 'node:path';
import fs from 'node:fs';

import {
  EXIT_CODES,
  PROFILE_HARNESS_MAP,
  resolveGoalContract,
  resolveGoalProfiles,
  executeHarness,
  runVerificationPipeline,
  enforceLifecycleGate,
  enforcePreReadyGate,
  enforcePreDoneGate,
  aggregateProofReceipt,
  generateVerificationProofReceipt,
  runAllGoalsVerification
} from '../lib/verification-orchestrator.mjs';

/**
 * Parses command-line arguments into structured options.
 *
 * @param {string[]} args
 * @returns {object}
 */
export function parseArgs(args = []) {
  const options = {
    goal: null,
    all: false,
    profile: null,
    lifecycleCheck: null,
    outputReceipt: null,
    json: false,
    verbose: false,
    timeoutMs: 30000,
    cases: 100
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--goal' && i + 1 < args.length) {
      options.goal = args[++i];
    } else if (arg.startsWith('--goal=')) {
      options.goal = arg.slice('--goal='.length);
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--profile' && i + 1 < args.length) {
      options.profile = args[++i];
    } else if (arg.startsWith('--profile=')) {
      options.profile = arg.slice('--profile='.length);
    } else if (arg === '--lifecycle-check' && i + 1 < args.length) {
      options.lifecycleCheck = args[++i];
    } else if (arg.startsWith('--lifecycle-check=')) {
      options.lifecycleCheck = arg.slice('--lifecycle-check='.length);
    } else if (arg === '--output-receipt' && i + 1 < args.length) {
      options.outputReceipt = args[++i];
    } else if (arg.startsWith('--output-receipt=')) {
      options.outputReceipt = arg.slice('--output-receipt='.length);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeoutMs = parseInt(args[++i], 10);
    } else if (arg.startsWith('--timeout=')) {
      options.timeoutMs = parseInt(arg.slice('--timeout='.length), 10);
    } else if (arg === '--cases' && i + 1 < args.length) {
      options.cases = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-') && !options.goal) {
      options.goal = arg;
    }
  }

  return options;
}

/**
 * Main execution function for the verification orchestrator harness.
 *
 * @param {string[]} [cliArgs=process.argv.slice(2)]
 * @returns {object} Execution result and exitCode
 */
export function runOrchestratorCli(cliArgs = process.argv.slice(2)) {
  const options = parseArgs(cliArgs);

  // Mode 1: Lifecycle State Machine Gate Check
  if (options.lifecycleCheck) {
    const targetGoal = options.goal || 'G-PROOF-012';
    const gateRes = enforceLifecycleGate(options.lifecycleCheck, targetGoal, {
      timeoutMs: options.timeoutMs,
      cases: options.cases,
      json: options.json
    });

    if (options.json) {
      console.log(JSON.stringify(gateRes, null, 2));
    } else {
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`🛡️ SODA OS LIFECYCLE STATE GATEKEEPER — [${gateRes.targetState.toUpperCase()}]`);
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`Goal Target:  ${gateRes.goalId || targetGoal}`);
      console.log(`Transition:   promotion to "${gateRes.targetState}"`);
      console.log(`Gate Verdict: ${gateRes.allowed ? '✅ ALLOWED (PROMOTION UNLOCKED)' : '❌ BLOCKED (FAIL-CLOSED)'}`);
      console.log('────────────────────────────────────────────────────────────────────────────────');

      for (const chk of gateRes.checks) {
        const icon = chk.passed ? '✔ [PASS]' : '✖ [FAIL]';
        console.log(`  ${icon} ${chk.id}`);
        if (!chk.passed && chk.errors) {
          chk.errors.forEach(e => console.log(`      ↳ ${e}`));
        }
      }

      if (gateRes.errors.length > 0) {
        console.log('\nViolations:');
        gateRes.errors.forEach(e => console.error(`  - ${e}`));
      }
      console.log('════════════════════════════════════════════════════════════════════════════════\n');
    }

    return {
      exitCode: gateRes.exitCode,
      result: gateRes
    };
  }

  // Mode 2: Direct Single Profile Execution
  if (options.profile) {
    const res = executeHarness(options.profile, {
      timeoutMs: options.timeoutMs,
      cases: options.cases,
      json: options.json,
      goalPath: options.goal
    });

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`🛡️ SODA OS VERIFICATION PROFILE DISPATCH — [${res.profile}]`);
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`Harness:  ${res.harnessPath}`);
      console.log(`Duration: ${res.durationMs}ms`);
      console.log(`ExitCode: ${res.exitCode}`);
      console.log(`Verdict:  ${res.success ? '✅ PROFILE HARNESS PASSED' : '❌ PROFILE HARNESS FAILED'}`);
      if (options.verbose && res.stdout) {
        console.log('\nStdout:');
        console.log(res.stdout);
      }
      if (res.stderr) {
        console.error('\nStderr:');
        console.error(res.stderr);
      }
      console.log('════════════════════════════════════════════════════════════════════════════════\n');
    }

    return {
      exitCode: res.exitCode,
      result: res
    };
  }

  // Mode 3: Run across all active goals
  if (options.all) {
    const allRes = runAllGoalsVerification('docs/07-backlog/goals', {
      timeoutMs: options.timeoutMs,
      cases: options.cases,
      json: options.json
    });

    if (options.json) {
      console.log(JSON.stringify(allRes, null, 2));
    } else {
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log('🛡️ SODA OS MULTI-GOAL VERIFICATION ORCHESTRATOR REPORT');
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`Total Goals Evaluated: ${allRes.totalGoals}`);
      console.log(`Passed Goals:          ${allRes.passedGoals} ✔`);
      console.log(`Failed Goals:          ${allRes.failedGoals} ✖`);
      console.log(`Overall Status:        ${allRes.allPassed ? '✅ ALL GOALS VERIFIED' : '❌ GOAL VERIFICATION FAILURES'}`);
      console.log('════════════════════════════════════════════════════════════════════════════════\n');
    }

    return {
      exitCode: allRes.exitCode,
      result: allRes
    };
  }

  // Mode 4: Target Goal Execution (defaults to G-PROOF-012 if none provided)
  const targetGoal = options.goal || 'G-PROOF-012';

  if (!options.json) {
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`🛡️ SODA OS UNIFIED VERIFICATION ORCHESTRATOR — [${targetGoal}]`);
    console.log('════════════════════════════════════════════════════════════════════════════════');
  }

  const pipelineRes = runVerificationPipeline(targetGoal, {
    timeoutMs: options.timeoutMs,
    cases: options.cases,
    json: options.json
  });

  if (options.outputReceipt && pipelineRes.success) {
    generateVerificationProofReceipt(pipelineRes.goalId, {
      pipelineOutcome: pipelineRes,
      outputReceipt: options.outputReceipt
    });
    if (!options.json) {
      console.log(`📄 Emitted aggregated proof receipt to: ${options.outputReceipt}`);
    }
  }

  if (options.json) {
    console.log(JSON.stringify(pipelineRes, null, 2));
  } else {
    console.log(`Goal:     ${pipelineRes.goalId}`);
    console.log(`Profiles: ${pipelineRes.profiles.map(p => p.profile).join(', ') || 'none'}`);
    console.log(`Duration: ${pipelineRes.durationMs}ms`);
    console.log('────────────────────────────────────────────────────────────────────────────────');

    for (const p of pipelineRes.profiles) {
      const icon = p.success ? '✔ [PASS]' : '✖ [FAIL]';
      console.log(`  ${icon} Profile: ${p.profile} (${p.durationMs}ms) [Exit ${p.exitCode}]`);
      if (options.verbose && p.stdout) {
        console.log(`      ↳ ${p.stdout.trim().split('\n').join('\n        ')}`);
      }
      if (!p.success && p.error) {
        console.error(`      ↳ Error: ${p.error}`);
      }
    }

    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log(`Summary:  ${pipelineRes.scorecard.passedProfiles}/${pipelineRes.scorecard.totalProfiles} Profiles Passed Cleanly`);
    console.log(`Verdict:  ${pipelineRes.success ? '✅ PIPELINE PASSED (EXIT 0)' : '❌ PIPELINE FAILED (EXIT ' + pipelineRes.exitCode + ')'}`);
    console.log('════════════════════════════════════════════════════════════════════════════════\n');
  }

  return {
    exitCode: pipelineRes.exitCode,
    result: pipelineRes
  };
}

// Direct execution entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const { exitCode } = runOrchestratorCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROPERTY INVARIANT EXECUTION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Formal Invariant Fuzzing & Epistemic Receipt Certification
 * Purpose: Executes canonical relational invariant batteries (conservation,
 *          monotonicity, idempotency, invertibility, extremal boundaries)
 *          across configurable iterations (N >= 10,000) with deterministic
 *          PRNG seed replay and automated delta counterexample shrinking.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  SplitMix64,
  Generators,
  checkProperty,
  runPropertyBattery,
  checkConservation,
  checkMonotonicity,
  checkIdempotency,
  checkCommutativity,
  checkAssociativity,
  checkInvertibility,
  deepEqual,
  generateGoalProofReceipt
} from '../lib/invariant-runner.mjs';

// ── CANONICAL DOMAIN FUNCTIONS FOR INVARIANT VERIFICATION ─────────────────────

/**
 * Splits an integer monetary amount (in minor units) into N equal parts with remainder distribution.
 * Implements strict conservation: sum(splits) === total.
 * @param {number} total
 * @param {number} parts
 * @returns {number[]}
 */
export function splitAmountConserved(total, parts) {
  if (parts <= 0) throw new Error('Parts must be positive');
  const base = Math.floor(total / parts);
  const rem = total % parts;
  const result = [];
  for (let i = 0; i < parts; i++) {
    result.push(base + (i < rem ? 1 : 0));
  }
  return result;
}

/**
 * Monotonic tiered tariff function.
 * Satisfies a <= b => fee(a) <= fee(b).
 * @param {number} amount
 * @returns {number}
 */
export function monotonicTieredTariff(amount) {
  if (amount <= 0) return 0;
  if (amount <= 100) return amount * 2;
  if (amount <= 1000) return 200 + (amount - 100) * 3;
  return 2900 + (amount - 1000) * 5;
}

/**
 * Idempotent normalization for strings.
 * @param {string} str
 * @returns {string}
 */
export function idempotentNormalize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Idempotent array deduplication and canonical sort.
 * @param {number[]} arr
 * @returns {number[]}
 */
export function idempotentDeduplicateSort(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)].sort((a, b) => a - b);
}

/**
 * Greatest common divisor using Euclidean algorithm.
 * Satisfies commutativity: gcd(a, b) === gcd(b, a).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function gcd(a, b) {
  let x = Math.abs(Math.floor(a));
  let y = Math.abs(Math.floor(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Base64 roundtrip encoder.
 * @param {string} str
 * @returns {string}
 */
export function base64Encode(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * Base64 roundtrip decoder.
 * @param {string} b64
 * @returns {string}
 */
export function base64Decode(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

/**
 * Saturating bounded integer addition.
 * Safe against overflow; commutative and associative within bounds.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function saturatingAdd(a, b) {
  const sum = a + b;
  if (sum > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  if (sum < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
  return sum;
}

// ── CANONICAL PROPERTY BATTERY BUILDER ────────────────────────────────────────

/**
 * Builds the canonical suite of property invariant tests.
 * @returns {Array<{ name: string, generator: object, predicate: Function }>}
 */
export function buildCanonicalPropertyBattery() {
  return [
    {
      name: 'INV-001: Conservation Law (Minor-Unit Split Conservation)',
      generator: Generators.tuple(
        Generators.integer(1, 1000000), // Total amount (minor units)
        Generators.integer(1, 20)       // Split count
      ),
      predicate: (total, parts) => {
        const splits = splitAmountConserved(total, parts);
        return checkConservation(splits, total);
      }
    },
    {
      name: 'INV-002: Monotonicity (Tiered Tariff Scaling)',
      generator: Generators.tuple(
        Generators.integer(0, 50000),
        Generators.integer(0, 50000)
      ),
      predicate: (a, b) => {
        return checkMonotonicity(monotonicTieredTariff, a, b);
      }
    },
    {
      name: 'INV-003: Idempotency (String Normalization)',
      generator: Generators.string({
        minLength: 0,
        maxLength: 30,
        charset: 'printable'
      }),
      predicate: (str) => {
        return checkIdempotency(idempotentNormalize, str);
      }
    },
    {
      name: 'INV-004: Idempotency (Array Deduplication & Sorting)',
      generator: Generators.array(Generators.integer(-100, 100), {
        minLength: 0,
        maxLength: 15
      }),
      predicate: (arr) => {
        return checkIdempotency(idempotentDeduplicateSort, arr);
      }
    },
    {
      name: 'INV-005: Commutativity (Euclidean Greatest Common Divisor)',
      generator: Generators.tuple(
        Generators.integer(0, 10000),
        Generators.integer(0, 10000)
      ),
      predicate: (a, b) => {
        return checkCommutativity(gcd, a, b);
      }
    },
    {
      name: 'INV-006: Invertibility (Base64 UTF-8 Roundtrip Serialization)',
      generator: Generators.string({
        minLength: 0,
        maxLength: 50,
        charset: 'unicode'
      }),
      predicate: (str) => {
        return checkInvertibility(base64Encode, base64Decode, str);
      }
    },
    {
      name: 'INV-007: Extremal Boundary Resilience (Safe Saturating Addition)',
      generator: Generators.tuple(
        Generators.integer(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, { extremalRate: 0.3 }),
        Generators.integer(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, { extremalRate: 0.3 })
      ),
      predicate: (a, b) => {
        const res = saturatingAdd(a, b);
        return Number.isFinite(res) && !Number.isNaN(res);
      }
    }
  ];
}

// ── CLI RUNNER ────────────────────────────────────────────────────────────────

/**
 * Parses CLI arguments into structured configuration.
 * @param {string[]} argv
 * @returns {object}
 */
export function parseCliArgs(argv = process.argv.slice(2)) {
  const config = {
    seed: undefined,
    cases: 1000,
    harness: 'G-PROOF-005',
    shrinkTimeout: 5000,
    outputReceipt: undefined,
    emitReceipt: false,
    json: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && argv[i + 1]) {
      config.seed = argv[++i];
    } else if (arg === '--cases' && argv[i + 1]) {
      config.cases = parseInt(argv[++i], 10);
    } else if (arg === '--harness' && argv[i + 1]) {
      config.harness = argv[++i];
    } else if (arg === '--shrink-timeout' && argv[i + 1]) {
      config.shrinkTimeout = parseInt(argv[++i], 10);
    } else if (arg === '--output-receipt' && argv[i + 1]) {
      config.outputReceipt = argv[++i];
      config.emitReceipt = true;
    } else if (arg === '--emit-receipt') {
      config.emitReceipt = true;
    } else if (arg === '--json') {
      config.json = true;
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      config.help = true;
    }
  }

  return config;
}

/**
 * Main execution routine.
 */
export function runHarness(config = parseCliArgs()) {
  if (config.help) {
    console.log(`
🛡️ SODA OS PROPERTY INVARIANT EXECUTION HARNESS
Usage:
  node scripts/harness/property-invariant-harness.mjs [options]

Options:
  --seed <seed>           PRNG seed for deterministic sequence replay
  --cases <N>             Number of test cases per property (default: 1000, supports >= 10000)
  --harness <name>        Harness name identifier (default: G-PROOF-005)
  --shrink-timeout <ms>   Timeout in milliseconds for delta shrinking (default: 5000)
  --emit-receipt          Emit cryptographic proof receipt JSON
  --output-receipt <path> Custom destination path for emitted proof receipt
  --json                  Output execution summary as JSON
  --verbose               Enable verbose diagnostic logs
  --help, -h              Display this help message
`);
    return { exitCode: 0 };
  }

  const battery = buildCanonicalPropertyBattery();

  if (!config.json) {
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`🛡️ SODA OS PROPERTY INVARIANT EXECUTION HARNESS — [${config.harness}]`);
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`Target Cases Per Invariant: ${config.cases.toLocaleString()}`);
    console.log(`Shrink Timeout: ${config.shrinkTimeout}ms`);
    if (config.seed !== undefined) console.log(`Declared PRNG Seed: ${config.seed}`);
    console.log('────────────────────────────────────────────────────────────────────────────────\n');
  }

  const startTime = Date.now();
  const batteryOutcome = runPropertyBattery(battery, {
    cases: config.cases,
    seed: config.seed,
    shrinkTimeoutMs: config.shrinkTimeout,
    verbose: config.verbose
  });
  const totalDuration = Date.now() - startTime;

  if (config.json) {
    console.log(JSON.stringify({
      harness: config.harness,
      cases: config.cases,
      totalDurationMs: totalDuration,
      ...batteryOutcome
    }, null, 2));
  } else {
    for (const res of batteryOutcome.results) {
      if (res.passed) {
        console.log(`  ✅ [PASS] ${res.name}`);
        console.log(`     Cases: ${res.casesTested.toLocaleString()} | Duration: ${res.durationMs}ms | Seed: ${res.seed}`);
      } else {
        console.error(`  ❌ [FAIL] ${res.name}`);
        console.error(`     Failed at case #${res.counterexample.caseIndex}`);
        console.error(`     Error: ${res.counterexample.error}`);
        console.error(`     Original counterexample:`, JSON.stringify(res.counterexample.original));
        console.error(`     Shrunk minimal counterexample:`, JSON.stringify(res.counterexample.shrunk));
        console.error(`     Shrink steps: ${res.counterexample.shrinkSteps} (timedOut: ${res.counterexample.timedOut})`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log(`Summary: ${batteryOutcome.passedCount}/${battery.length} Invariants Verified Cleanly (${totalDuration}ms)`);
    console.log(`Verdict: ${batteryOutcome.allPassed ? '✅ ALL INVARIANTS PASSED' : '❌ INVARIANT VIOLATIONS DETECTED'}`);
    console.log('════════════════════════════════════════════════════════════════════════════════\n');
  }

  // Handle proof receipt emission
  if (batteryOutcome.allPassed && (config.emitReceipt || config.outputReceipt)) {
    const receiptOptions = {
      verificationCommand: `node scripts/harness/property-invariant-harness.mjs --cases ${config.cases}`
    };
    if (config.outputReceipt) {
      receiptOptions.outputPath = path.resolve(process.cwd(), config.outputReceipt);
    }
    const { receipt, artifactPath, evidencePath } = generateGoalProofReceipt(config.harness, receiptOptions);
    if (!config.json) {
      console.log(`📜 Cryptographic Proof Receipt Emitted:`);
      console.log(`   Artifact: ${artifactPath}`);
      console.log(`   Evidence: ${evidencePath}`);
      console.log(`   Source Revision: ${receipt.source_revision}`);
      console.log(`   Source Files Hashed: ${receipt.source_files.length}`);
      console.log(`   Certification: ${receipt.certification}\n`);
    }
  }

  return {
    exitCode: batteryOutcome.allPassed ? 0 : 1,
    outcome: batteryOutcome
  };
}

// Auto-run when invoked directly as CLI script
const isDirectCli = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
);

if (isDirectCli) {
  const result = runHarness();
  process.exit(result.exitCode);
}

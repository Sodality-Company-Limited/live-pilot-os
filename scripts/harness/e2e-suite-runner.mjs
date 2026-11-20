#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS E2E TEST SUITE RUNNER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: Multimodal UX/UI Design Decision Making Layer (F01–F28)
 * Standard: Global Engineering Constitution (Article I Zero Mocks, Article IV Math Proofs)
 *
 * Usage:
 *   node scripts/harness/e2e-suite-runner.mjs
 *   node scripts/harness/e2e-suite-runner.mjs --tier=1
 *   node scripts/harness/e2e-suite-runner.mjs --tier=2
 *   node scripts/harness/e2e-suite-runner.mjs --tier=3
 *   node scripts/harness/e2e-suite-runner.mjs --tier=4
 *   node scripts/harness/e2e-suite-runner.mjs --feature=F01
 *   node scripts/harness/e2e-suite-runner.mjs --milestone=M1
 *   node scripts/harness/e2e-suite-runner.mjs --grep="dark_pattern"
 *   node scripts/harness/e2e-suite-runner.mjs --json
 *   node scripts/harness/e2e-suite-runner.mjs --bail
 * ════════════════════════════════════════════════════════════════════════════════
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import Tier 1 Suites
import { runTier1M1Suite } from '../../tests/e2e/tier1/test-tier1-m1-contracts-state-machine.mjs';
import { runTier1M2Suite } from '../../tests/e2e/tier1/test-tier1-m2-multimodal-perception.mjs';
import { runTier1M3Suite } from '../../tests/e2e/tier1/test-tier1-m3-data-curriculum.mjs';
import { runTier1M4Suite } from '../../tests/e2e/tier1/test-tier1-m4-model-training-rlcd.mjs';
import { runTier1M5Suite } from '../../tests/e2e/tier1/test-tier1-m5-evaluation-safety-gates.mjs';
import { runTier1M6Suite } from '../../tests/e2e/tier1/test-tier1-m6-integration-observability.mjs';

// Import Tier 2 Suites
import { runTier2M1Suite } from '../../tests/e2e/tier2/test-tier2-m1-boundary-state-machine.mjs';
import { runTier2M2Suite } from '../../tests/e2e/tier2/test-tier2-m2-boundary-perception.mjs';
import { runTier2M3Suite } from '../../tests/e2e/tier2/test-tier2-m3-boundary-curriculum.mjs';
import { runTier2M4Suite } from '../../tests/e2e/tier2/test-tier2-m4-boundary-training-rlcd.mjs';
import { runTier2M5Suite } from '../../tests/e2e/tier2/test-tier2-m5-boundary-safety-gates.mjs';
import { runTier2M6Suite } from '../../tests/e2e/tier2/test-tier2-m6-boundary-integration.mjs';

// Import Tier 3 Suite
import { runTier3Suite } from '../../tests/e2e/tier3/test-tier3-cross-feature-combinations.mjs';

// Import Tier 4 Suite
import { runTier4Suite } from '../../tests/e2e/tier4/test-tier4-enterprise-scenarios.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    tier: null,
    feature: null,
    milestone: null,
    grep: null,
    json: false,
    bail: false,
    verbose: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tier' && i + 1 < argv.length) {
      options.tier = parseInt(argv[++i], 10);
    } else if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.slice('--tier='.length), 10);
    } else if (arg === '--feature' && i + 1 < argv.length) {
      options.feature = argv[++i].toUpperCase();
    } else if (arg.startsWith('--feature=')) {
      options.feature = arg.slice('--feature='.length).toUpperCase();
    } else if (arg === '--milestone' && i + 1 < argv.length) {
      options.milestone = argv[++i].toUpperCase();
    } else if (arg.startsWith('--milestone=')) {
      options.milestone = arg.slice('--milestone='.length).toUpperCase();
    } else if (arg === '--grep' && i + 1 < argv.length) {
      options.grep = argv[++i];
    } else if (arg.startsWith('--grep=')) {
      options.grep = arg.slice('--grep='.length);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--bail') {
      options.bail = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

export class MasterSuiteRunner {
  constructor(options = {}) {
    this.options = options;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.results = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  shouldRunTest(name, meta = {}) {
    const { feature, milestone, grep } = this.options;

    if (feature && meta.feature && !meta.feature.toUpperCase().includes(feature)) {
      return false;
    }
    if (milestone && meta.milestone && meta.milestone.toUpperCase() !== milestone) {
      return false;
    }
    if (grep && !name.toLowerCase().includes(grep.toLowerCase())) {
      return false;
    }

    return true;
  }

  async test(name, fn, meta = {}) {
    if (!this.shouldRunTest(name, meta)) {
      this.skippedTests++;
      return;
    }

    this.totalTests++;
    const testRecord = {
      name,
      meta,
      status: 'pending',
      durationMs: 0,
      error: null
    };

    const start = performance.now();
    try {
      await fn();
      testRecord.durationMs = Math.round((performance.now() - start) * 100) / 100;
      testRecord.status = 'passed';
      this.passedTests++;
      if (!this.options.json) {
        console.log(`  ✔ [PASS] ${name} (${testRecord.durationMs}ms)`);
      }
    } catch (err) {
      testRecord.durationMs = Math.round((performance.now() - start) * 100) / 100;
      testRecord.status = 'failed';
      testRecord.error = err.message || String(err);
      this.failedTests++;
      if (!this.options.json) {
        console.error(`  ✖ [FAIL] ${name}`);
        console.error(`     Reason: ${err.message}`);
      }
      if (this.options.bail) {
        this.results.push(testRecord);
        throw new Error(`Bail triggered on failure: ${name}`);
      }
    }

    this.results.push(testRecord);
  }

  async executeAll() {
    this.startTime = performance.now();

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    if (this.options.json) {
      console.log = () => {};
      console.error = () => {};
    }

    if (!this.options.json) {
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log('🛡️ SODA OS MULTIMODAL UX/UI DESIGN DECISION LAYER — E2E TEST SUITE RUNNER');
      console.log('   Strict Invariants: Zero Mocks, Zero Stubs, Zero Fallbacks (Article I & IV)');
      console.log('════════════════════════════════════════════════════════════════════════════════');
    }

    const { tier } = this.options;

    try {
      // Tier 1 Suites
      if (tier === null || tier === 1) {
        await runTier1M1Suite(this);
        await runTier1M2Suite(this);
        await runTier1M3Suite(this);
        await runTier1M4Suite(this);
        await runTier1M5Suite(this);
        await runTier1M6Suite(this);
      }

      // Tier 2 Suites
      if (tier === null || tier === 2) {
        await runTier2M1Suite(this);
        await runTier2M2Suite(this);
        await runTier2M3Suite(this);
        await runTier2M4Suite(this);
        await runTier2M5Suite(this);
        await runTier2M6Suite(this);
      }

      // Tier 3 Suite
      if (tier === null || tier === 3) {
        await runTier3Suite(this);
      }

      // Tier 4 Suite
      if (tier === null || tier === 4) {
        await runTier4Suite(this);
      }
    } catch (bailErr) {
      if (!this.options.json) {
        console.error(`\n⚠️  Execution stopped early: ${bailErr.message}`);
      }
    }

    this.endTime = performance.now();
    const totalDurationMs = Math.round((this.endTime - this.startTime) * 100) / 100;
    const passRate = this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(2) : '0.00';

    if (this.options.json) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      const jsonReport = {
        totalTests: this.totalTests,
        passedTests: this.passedTests,
        failedTests: this.failedTests,
        skippedTests: this.skippedTests,
        passRate: parseFloat(passRate),
        durationMs: totalDurationMs,
        results: this.results
      };
      console.log(JSON.stringify(jsonReport, null, 2));
    } else {
      console.log('\n════════════════════════════════════════════════════════════════════════════════');
      console.log('📊 E2E SUITE EXECUTION SUMMARY');
      console.log('════════════════════════════════════════════════════════════════════════════════');
      console.log(`  Total Executed Tests : ${this.totalTests}`);
      console.log(`  Passed Tests         : ${this.passedTests}`);
      console.log(`  Failed Tests         : ${this.failedTests}`);
      console.log(`  Skipped Tests        : ${this.skippedTests}`);
      console.log(`  Pass Rate            : ${passRate}%`);
      console.log(`  Total Duration       : ${totalDurationMs}ms`);
      console.log('════════════════════════════════════════════════════════════════════════════════');

      // Milestone Breakdown
      const milestones = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
      console.log('\n📋 PROGRESSIVE TESTABILITY BREAKDOWN BY MILESTONE:');
      for (const m of milestones) {
        const mTests = this.results.filter((r) => r.meta && r.meta.milestone === m);
        const mPassed = mTests.filter((r) => r.status === 'passed').length;
        if (mTests.length > 0) {
          console.log(`  • Milestone ${m}: ${mPassed} / ${mTests.length} Passed (${((mPassed / mTests.length) * 100).toFixed(1)}%)`);
        }
      }
      const t3Tests = this.results.filter((r) => r.meta && r.meta.tier === 'tier3');
      if (t3Tests.length > 0) {
        const t3Passed = t3Tests.filter((r) => r.status === 'passed').length;
        console.log(`  • Tier 3 (Cross-Feature Combinations): ${t3Passed} / ${t3Tests.length} Passed (${((t3Passed / t3Tests.length) * 100).toFixed(1)}%)`);
      }
      const t4Tests = this.results.filter((r) => r.meta && r.meta.tier === 'tier4');
      if (t4Tests.length > 0) {
        const t4Passed = t4Tests.filter((r) => r.status === 'passed').length;
        console.log(`  • Tier 4 (Enterprise & Golden Masters): ${t4Passed} / ${t4Tests.length} Passed (${((t4Passed / t4Tests.length) * 100).toFixed(1)}%)`);
      }
      console.log('════════════════════════════════════════════════════════════════════════════════\n');
    }

    return this.failedTests === 0 ? 0 : 1;
  }
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const runner = new MasterSuiteRunner(options);
  runner.executeAll().then((exitCode) => {
    process.exit(exitCode);
  }).catch((err) => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}

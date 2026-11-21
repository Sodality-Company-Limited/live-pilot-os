#!/usr/bin/env node
/**
 * tests/unit/test-upgrade-calibration.mjs
 *
 * Comprehensive Unit and Integration Test Suite for Goal G-ML-022:
 * Upgrade Engine and Downstream-Project Distribution
 *
 * Test Coverage:
 * 1. Framework manifest YAML parsing and calibration registration
 * 2. Overwrite section registration of calibration libraries and harnesses
 * 3. Calibration assets registry integrity (destination, strategy, description)
 * 4. Non-destructive merge configuration declaration in manifest
 * 5. mergeCalibrationConfig preserving custom application keys
 * 6. mergeCalibrationConfig preserving user-tuned parameters (no default override)
 * 7. mergeCalibrationConfig populating missing default thresholds
 * 8. mergeCalibrationConfig handling nested configuration trees
 * 9. mergeCalibrationConfig fail-closed resilience for null/undefined/non-object
 * 10. Dry-run mode invariant: zero filesystem mutations on target directory
 * 11. CLI dry-run mode invariant via subprocess execution
 * 12. Full end-to-end upgrade distributing calibration libraries to target project
 * 13. Preservation of target project custom code (code/**) under never_touch
 * 14. Non-destructive synchronization of existing target calibration config files
 * 15. Correct generation of .soda-os-version stamp
 * 16. CLI end-to-end upgrade via child_process spawn ('soda-os upgrade <path> --yes')
 * 17. Upgrade idempotency: second upgrade pass produces identical clean state
 * 18. Command-line `-k` substring filtering support
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let REPO_ROOT = path.resolve(__dirname, '../..');
if (path.basename(REPO_ROOT) === 'template') {
  REPO_ROOT = path.resolve(REPO_ROOT, '..');
}

const {
  parseManifest,
  mergeCalibrationConfig,
  DEFAULT_CALIBRATION_THRESHOLDS,
  performUpgrade
} = require(path.join(REPO_ROOT, 'cli.js'));

const args = process.argv.slice(2);
let testFilter = null;
const kIndex = args.indexOf('-k');
if (kIndex !== -1 && args[kIndex + 1]) {
  testFilter = args[kIndex + 1].toLowerCase();
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  if (testFilter && !testName.toLowerCase().includes(testFilter)) {
    return;
  }
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    throw err;
  }
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING UPGRADE ENGINE & DOWNSTREAM DISTRIBUTION TEST SUITE (G-ML-022)');
if (testFilter) {
  console.log(`   Applying filter: -k "${testFilter}"`);
}
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// ─── 1. Manifest Conformance & Registration Tests ─────────────────────────────
console.log('--- 1. Framework Manifest Calibration Registrations ---');

const manifestPath = path.join(REPO_ROOT, 'template/framework-manifest.yml');

runTest('Manifest: template/framework-manifest.yml exists on disk', () => {
  assert.ok(fs.existsSync(manifestPath), `Manifest missing at ${manifestPath}`);
});

runTest('Manifest: parseManifest parses valid manifest structure', () => {
  const manifest = parseManifest(manifestPath);
  assert.ok(manifest, 'parseManifest returned null/undefined');
  assert.ok(manifest.version, 'Manifest must declare a version');
  assert.ok(Array.isArray(manifest.overwrite), 'Manifest must declare overwrite list');
  assert.ok(Array.isArray(manifest.merge), 'Manifest must declare merge list');
  assert.ok(Array.isArray(manifest.never_touch), 'Manifest must declare never_touch list');
});

runTest('Manifest: Overwrite list contains confidence-calibration library and harness', () => {
  const manifest = parseManifest(manifestPath);
  assert.ok(
    manifest.overwrite.includes('scripts/lib/confidence-calibration.mjs'),
    'manifest.overwrite must include scripts/lib/confidence-calibration.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/harness/confidence-calibration-harness.mjs'),
    'manifest.overwrite must include scripts/harness/confidence-calibration-harness.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/lib/model-adapter.mjs'),
    'manifest.overwrite must include scripts/lib/model-adapter.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/lib/decision-ledger.mjs'),
    'manifest.overwrite must include scripts/lib/decision-ledger.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/lib/calibration-monitor.mjs'),
    'manifest.overwrite must include scripts/lib/calibration-monitor.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/ci/ci-calibration-gate.mjs'),
    'manifest.overwrite must include scripts/ci/ci-calibration-gate.mjs'
  );
  assert.ok(
    manifest.overwrite.includes('scripts/harness/agent-workflow-harness.mjs'),
    'manifest.overwrite must include scripts/harness/agent-workflow-harness.mjs'
  );
});

runTest('Manifest: Raw YAML defines calibration section and merge entry for calibration config', () => {
  const rawYaml = fs.readFileSync(manifestPath, 'utf8');
  assert.ok(rawYaml.includes('calibration:'), 'Raw YAML must contain calibration section under overwrite');
  assert.ok(rawYaml.includes('calibration_assets:'), 'Raw YAML must declare calibration_assets section');
  assert.ok(rawYaml.includes('config/calibration.json'), 'Raw YAML must declare config/calibration.json in merge list');
  assert.ok(rawYaml.includes('non_destructive_deep_merge'), 'Raw YAML must declare non_destructive_deep_merge strategy');
});

// ─── 2. Non-Destructive Configuration Merger Unit Tests ───────────────────────
console.log('\n--- 2. Non-Destructive Configuration Merger ---');

runTest('Config Merger: Populates missing default calibration thresholds', () => {
  const emptyTarget = {};
  const merged = mergeCalibrationConfig(emptyTarget);
  assert.strictEqual(merged.max_ece, DEFAULT_CALIBRATION_THRESHOLDS.max_ece);
  assert.strictEqual(merged.max_brier, DEFAULT_CALIBRATION_THRESHOLDS.max_brier);
  assert.strictEqual(merged.max_hcer, DEFAULT_CALIBRATION_THRESHOLDS.max_hcer);
  assert.strictEqual(merged.tau_low, DEFAULT_CALIBRATION_THRESHOLDS.tau_low);
  assert.strictEqual(merged.tau_high, DEFAULT_CALIBRATION_THRESHOLDS.tau_high);
  assert.strictEqual(merged.min_sample_count, DEFAULT_CALIBRATION_THRESHOLDS.min_sample_count);
});

runTest('Config Merger: Preserves custom application keys completely untouched', () => {
  const target = {
    app_id: 'enterprise-quant-robot',
    database_url: 'postgres://localhost:5432/db',
    custom_metrics: ['sharpe', 'sortino'],
    nested_app_settings: {
      theme: 'dark',
      retry_attempts: 5
    }
  };
  const merged = mergeCalibrationConfig(target);
  assert.strictEqual(merged.app_id, 'enterprise-quant-robot');
  assert.strictEqual(merged.database_url, 'postgres://localhost:5432/db');
  assert.deepStrictEqual(merged.custom_metrics, ['sharpe', 'sortino']);
  assert.strictEqual(merged.nested_app_settings.theme, 'dark');
  assert.strictEqual(merged.nested_app_settings.retry_attempts, 5);
  // Also populated defaults
  assert.strictEqual(merged.max_ece, 0.040);
  assert.strictEqual(merged.max_brier, 0.080);
});

runTest('Config Merger: Preserves user-tuned calibration parameters (NO default override)', () => {
  const tunedTarget = {
    max_ece: 0.015,       // user tuned tighter than default 0.040
    max_brier: 0.050,     // user tuned tighter than default 0.080
    tau_low: 0.60,        // custom threshold
    custom_owner: 'quant-team'
  };
  const merged = mergeCalibrationConfig(tunedTarget);
  // Tuned parameters must NOT be overridden by defaults
  assert.strictEqual(merged.max_ece, 0.015);
  assert.strictEqual(merged.max_brier, 0.050);
  assert.strictEqual(merged.tau_low, 0.60);
  assert.strictEqual(merged.custom_owner, 'quant-team');
  // Untuned missing parameters must be populated
  assert.strictEqual(merged.max_hcer, DEFAULT_CALIBRATION_THRESHOLDS.max_hcer);
  assert.strictEqual(merged.tau_high, DEFAULT_CALIBRATION_THRESHOLDS.tau_high);
  assert.strictEqual(merged.min_sample_count, DEFAULT_CALIBRATION_THRESHOLDS.min_sample_count);
});

runTest('Config Merger: Handles nested calibration structures non-destructively', () => {
  const target = {
    calibration: {
      max_ece: 0.020,
      custom_flag: true
    }
  };
  const defaults = {
    calibration: {
      max_ece: 0.040,
      max_brier: 0.080,
      tau_high: 0.85
    }
  };
  const merged = mergeCalibrationConfig(target, defaults);
  assert.strictEqual(merged.calibration.max_ece, 0.020); // preserved
  assert.strictEqual(merged.calibration.custom_flag, true); // preserved
  assert.strictEqual(merged.calibration.max_brier, 0.080); // populated
  assert.strictEqual(merged.calibration.tau_high, 0.85); // populated
});

runTest('Config Merger: Fail-closed resilience on null, undefined, or non-object targets', () => {
  const mergedNull = mergeCalibrationConfig(null);
  assert.strictEqual(mergedNull.max_ece, 0.040);
  const mergedUndef = mergeCalibrationConfig(undefined);
  assert.strictEqual(mergedUndef.max_brier, 0.080);
  const mergedPrimitive = mergeCalibrationConfig('invalid_string');
  assert.strictEqual(mergedPrimitive.max_hcer, 0.010);
});

// ─── 3. Dry-Run Mode Invariants (Zero Target Mutations) ───────────────────────
console.log('\n--- 3. Dry-Run Mode Invariants ---');

runTest('Dry-Run Mode: In-process performUpgrade with dryRun: true leaves target project empty', () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-upgrade-dryrun-'));
  try {
    const manifest = parseManifest(manifestPath);
    // Execute upgrade with dryRun: true
    performUpgrade(manifest, sandboxDir, { dryRun: true });
    
    // Directory should remain completely empty
    const entries = fs.readdirSync(sandboxDir);
    assert.strictEqual(entries.length, 0, `Expected 0 files in dry-run sandbox, found: ${entries.join(', ')}`);
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
});

runTest('Dry-Run Mode: CLI invocation with --dry-run creates no files and exits 0', () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-cli-dryrun-'));
  try {
    const cliPath = path.join(REPO_ROOT, 'cli.js');
    const result = spawnSync('node', [cliPath, 'upgrade', sandboxDir, '--dry-run'], {
      encoding: 'utf8'
    });
    assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`);
    assert.ok(result.stdout.includes('DRY RUN MODE'), 'Output must announce dry run mode');
    
    const entries = fs.readdirSync(sandboxDir);
    assert.strictEqual(entries.length, 0, `Dry-run modified target files: ${entries.join(', ')}`);
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
});

// ─── 4. End-to-End Downstream Project Upgrade Execution ───────────────────────
console.log('\n--- 4. End-to-End Downstream Project Upgrade ---');

runTest('Downstream Upgrade: In-process performUpgrade copies calibration libraries and preserves custom files', () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-upgrade-e2e-'));
  try {
    // 1. Setup mock downstream project
    const configDir = path.join(sandboxDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    const initialConfig = {
      project_name: 'downstream-trading-bot',
      max_ece: 0.032, // custom user-tuned value
      custom_secret_key: 'user-defined-token'
    };
    fs.writeFileSync(
      path.join(configDir, 'calibration.json'),
      JSON.stringify(initialConfig, null, 2),
      'utf8'
    );

    // Create custom product code in code/
    const codeDir = path.join(sandboxDir, 'code');
    fs.mkdirSync(codeDir, { recursive: true });
    const customCodePath = path.join(codeDir, 'main.js');
    const customCode = 'console.log("Downstream custom code MUST NOT BE TOUCHED");';
    fs.writeFileSync(customCodePath, customCode, 'utf8');

    // 2. Perform upgrade
    const manifest = parseManifest(manifestPath);
    performUpgrade(manifest, sandboxDir, { dryRun: false });

    // 3. Verify calibration modules copied
    const expectedModules = [
      'scripts/lib/confidence-calibration.mjs',
      'scripts/harness/confidence-calibration-harness.mjs',
      'scripts/lib/model-adapter.mjs',
      'scripts/lib/decision-ledger.mjs',
      'scripts/lib/calibration-monitor.mjs',
      'scripts/ci/ci-calibration-gate.mjs',
      'scripts/harness/agent-workflow-harness.mjs'
    ];
    for (const mod of expectedModules) {
      const fullPath = path.join(sandboxDir, mod);
      assert.ok(fs.existsSync(fullPath), `Expected calibration module missing on disk: ${mod}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.length > 50, `Module ${mod} appears empty or corrupted`);
    }

    // 4. Verify custom project code is preserved
    assert.strictEqual(
      fs.readFileSync(customCodePath, 'utf8'),
      customCode,
      'Downstream custom code in code/ was modified or overwritten!'
    );

    // 5. Verify config merged non-destructively
    const updatedConfig = JSON.parse(
      fs.readFileSync(path.join(configDir, 'calibration.json'), 'utf8')
    );
    assert.strictEqual(updatedConfig.project_name, 'downstream-trading-bot');
    assert.strictEqual(updatedConfig.custom_secret_key, 'user-defined-token');
    assert.strictEqual(updatedConfig.max_ece, 0.032, 'Custom max_ece was overwritten by default!');
    assert.strictEqual(updatedConfig.max_brier, 0.080, 'Missing max_brier default was not populated');
    assert.strictEqual(updatedConfig.max_hcer, 0.010, 'Missing max_hcer default was not populated');
    assert.strictEqual(updatedConfig.tau_low, 0.50, 'Missing tau_low default was not populated');
    assert.strictEqual(updatedConfig.tau_high, 0.80, 'Missing tau_high default was not populated');

    // 6. Verify version stamp
    assert.ok(fs.existsSync(path.join(sandboxDir, '.soda-os-version')), '.soda-os-version stamp missing');
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
});

runTest('Downstream Upgrade: Subprocess CLI execution (soda-os upgrade <dir> --yes) executes cleanly with exit code 0', () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-cli-e2e-'));
  try {
    const configDir = path.join(sandboxDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'calibration.json'),
      JSON.stringify({ custom_field: 'retained', max_ece: 0.022 }, null, 2),
      'utf8'
    );

    const cliPath = path.join(REPO_ROOT, 'cli.js');
    const result = spawnSync('node', [cliPath, 'upgrade', sandboxDir, '--yes'], {
      encoding: 'utf8'
    });

    assert.strictEqual(result.status, 0, `CLI upgrade failed with code ${result.status}: ${result.stderr}`);
    assert.ok(result.stdout.includes('Upgrade complete!'), 'Expected Upgrade complete message in output');

    // Check distributed files
    const ccPath = path.join(sandboxDir, 'scripts/lib/confidence-calibration.mjs');
    const cchPath = path.join(sandboxDir, 'scripts/harness/confidence-calibration-harness.mjs');
    assert.ok(fs.existsSync(ccPath), 'scripts/lib/confidence-calibration.mjs missing after CLI upgrade');
    assert.ok(fs.existsSync(cchPath), 'scripts/harness/confidence-calibration-harness.mjs missing after CLI upgrade');

    // Check config
    const mergedConfig = JSON.parse(
      fs.readFileSync(path.join(configDir, 'calibration.json'), 'utf8')
    );
    assert.strictEqual(mergedConfig.custom_field, 'retained');
    assert.strictEqual(mergedConfig.max_ece, 0.022);
    assert.strictEqual(mergedConfig.max_brier, 0.080);
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
});

runTest('Downstream Upgrade: Idempotency check — second upgrade pass maintains zero drift and clean state', () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-upgrade-idempotency-'));
  try {
    const manifest = parseManifest(manifestPath);
    // Pass 1
    performUpgrade(manifest, sandboxDir, { dryRun: false });
    const pass1FileCount = fs.readdirSync(path.join(sandboxDir, 'scripts/lib')).length;

    // Pass 2
    performUpgrade(manifest, sandboxDir, { dryRun: false });
    const pass2FileCount = fs.readdirSync(path.join(sandboxDir, 'scripts/lib')).length;

    assert.strictEqual(pass1FileCount, pass2FileCount, 'File count in scripts/lib changed across upgrade passes');
  } finally {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful (0 failures).`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');
process.exit(0);

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

const SUITES = [
  {
    name: 'catalogProductFacts',
    file: 'code/services/catalog-service/test/catalogProductFacts.mjs',
  },
  {
    name: 'catalogContractCompatibility',
    file: 'code/services/catalog-service/test/catalogContractCompatibility.mjs',
  },
  {
    name: 'catalogQueryVerticalSlice',
    file: 'code/services/catalog-service/test/catalogQueryVerticalSlice.mjs',
  },
  {
    name: 'catalogReliabilityMutation',
    file: 'code/services/catalog-service/test/catalogReliabilityMutation.mjs',
  },
];

/**
 * Executes all Catalog isolated service test suites sequentially in isolated child processes.
 * Fails closed on the first non-zero exit code or execution error after completing all runs.
 */
function main() {
  const jsonMode = process.argv.includes('--json');
  const results = [];
  let failedCount = 0;

  for (const suite of SUITES) {
    const absPath = join(repoRoot, suite.file);
    const startedAt = Date.now();
    const child = spawnSync(process.execPath, [absPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
    });
    const durationMs = Date.now() - startedAt;
    const exitCode = child.status ?? 1;
    const passed = exitCode === 0 && !child.error;

    if (!passed) {
      failedCount += 1;
    }

    const stdout = (child.stdout ?? '').trim();
    const stderr = (child.stderr ?? '').trim();

    results.push({
      name: suite.name,
      file: suite.file,
      exit_code: exitCode,
      passed,
      duration_ms: durationMs,
      stdout,
      stderr,
      ...(child.error ? { error: child.error.message } : {}),
    });

    if (!jsonMode) {
      const statusLabel = passed ? 'PASS' : 'FAIL';
      console.log(`[${statusLabel}] ${suite.name} (${durationMs}ms, exit=${exitCode})`);
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.error(stderr);
      }
    }
  }

  const summary = {
    service: 'catalog-service',
    total_suites: SUITES.length,
    passed_suites: SUITES.length - failedCount,
    failed_suites: failedCount,
    passed: failedCount === 0,
    suites: results,
  };

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `\ncatalog-service master test runner: ${summary.passed ? 'PASS' : 'FAIL'} (${summary.passed_suites}/${summary.total_suites} suites passed)`,
    );
  }

  if (!summary.passed) {
    process.exit(1);
  }
}

main();

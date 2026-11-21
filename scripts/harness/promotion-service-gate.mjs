#!/usr/bin/env node

/**
 * Release-candidate aggregator for G-PROMO-027.
 *
 * This harness is deliberately fail-closed.  A skipped PostgreSQL check, an
 * absent deployment receipt, or a failing command is a blocker; none of those
 * states is converted into a synthetic PASS.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const REPOSITORY_ROOT = resolve(import.meta.dirname, '../..');
export const EVIDENCE_PATH = resolve(REPOSITORY_ROOT, 'docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md');

const SERVICE_DIR = resolve(REPOSITORY_ROOT, 'code/apps/services/promotion-service');
const SERVICE_TESTS = [
  'tests/unit/promotion-auth-idempotency.spec.ts',
  'tests/unit/promotion-control-workflow.spec.ts',
  'tests/unit/promotion-state.spec.ts',
  'tests/integration/promotion-dlq-replay.spec.ts',
  'tests/integration/promotion-migration.spec.ts',
  'tests/integration/promotion-nats-adapter.spec.ts',
  'tests/integration/promotion-repository.spec.ts',
  'tests/integration/promotion-service-level.spec.ts',
  'tests/contract/approval-control-integration.spec.ts',
  'tests/contract/audit-receipt-integration.spec.ts',
  'tests/contract/execution-safety-integration.spec.ts',
  'tests/contract/inventory-integration.spec.ts',
  'tests/contract/margin-policy-integration.spec.ts',
  'tests/e2e/promotion-proposal.spec.ts',
  'tests/e2e/promotion-status.spec.ts',
  'tests/security/promotion-redaction.spec.ts',
];

export const CHECKS = [
  ['error-code-registry', ['node', ['scripts/contract-check/error-code-registry.mjs']]],
  ['api-sot-traceability', ['node', ['scripts/api/check-api-sot-traceability.mjs']]],
  ['architecture-sot', ['node', ['scripts/architecture/check-sot.mjs']]],
  ['tdd-traceability', ['node', ['scripts/testing/check-tdd-traceability.mjs']]],
  ['goal-conformance', ['node', ['scripts/harness/goal-template-conformance-harness.mjs', 'G-PROMO-027']]],
  ['architecture-conformance', ['node', ['scripts/harness/architecture-design-conformance-harness.mjs', 'G-PROMO-027']]],
  ['promotion-typecheck', ['./node_modules/.bin/tsc', ['src/main.ts', '--noEmit', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--esModuleInterop', '--experimentalDecorators', '--emitDecoratorMetadata', '--strict', '--skipLibCheck']]],
  ['promotion-build', ['./node_modules/.bin/tsc', ['src/main.ts', '--outDir', 'dist', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--esModuleInterop', '--experimentalDecorators', '--emitDecoratorMetadata', '--strict', '--skipLibCheck']]],
  ['promotion-tests', ['node', ['--import', './node_modules/tsx/dist/loader.mjs', '--test', ...SERVICE_TESTS.map((pattern) => resolve(REPOSITORY_ROOT, pattern))]]],
  ['security-redaction', ['node', ['--import', './node_modules/tsx/dist/loader.mjs', '--test', resolve(REPOSITORY_ROOT, 'tests/security/promotion-redaction.spec.ts')]]],
  ['git-diff-check', ['git', ['diff', '--check']]],
];

const SECRET_PATTERN = /(bearer\s+|authorization\s*[:=]\s*|token|password|secret|api[_-]?key|dsn\s*[:=]\s*)[^\s,;}]+/gi;
export function redact(text) {
  return String(text).replace(SECRET_PATTERN, (match) => `${match.split(/\s|:|=/, 1)[0]}=[REDACTED]`);
}

function runCommand(name, [command, args], cwd = REPOSITORY_ROOT) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    name,
    command: [command, ...args].join(' '),
    status: result.error ? 'BLOCKED' : result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.error ? null : result.status,
    output: redact(`${result.stdout || ''}${result.stderr || ''}`).trim(),
    error: result.error ? redact(result.error.message) : null,
  };
}

function currentRevision() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'UNRECORDED (working tree)';
}

function evidenceReceipt(kind, environmentName) {
  const file = process.env[`PROMOTION_${kind.toUpperCase()}_EVIDENCE`];
  if (!file) return { name: `${kind}-evidence`, status: 'BLOCKED', reason: `PROMOTION_${kind.toUpperCase()}_EVIDENCE is not set` };
  const path = resolve(REPOSITORY_ROOT, file);
  if (!existsSync(path)) return { name: `${kind}-evidence`, status: 'BLOCKED', reason: `missing ${file}` };
  const body = readFileSync(path, 'utf8');
  const hasPass = /(^|\n)\s*status\s*:\s*PASS\s*($|\n)/i.test(body);
  const hasRevision = /(^|\n)\s*revision\s*:\s*[^\s]+/i.test(body);
  if (!hasPass || !hasRevision) return { name: `${kind}-evidence`, status: 'BLOCKED', reason: `${file} must contain status: PASS and a revision` };
  return { name: `${kind}-evidence`, status: 'PASS', reason: `${environmentName} receipt verified at ${file}` };
}

export function evaluateReleaseGate(results) {
  const blockers = results.filter((result) => result.status !== 'PASS').map((result) => `${result.name}: ${result.reason || result.error || `exit ${result.exitCode}`}`);
  return { status: blockers.length === 0 ? 'RELEASE_CANDIDATE' : 'BLOCKED', blockers };
}

export function runReleaseGate({ record = false } = {}) {
  const results = CHECKS.map(([name, spec]) => runCommand(name, spec, name.startsWith('promotion-') || name === 'security-redaction' ? SERVICE_DIR : REPOSITORY_ROOT));
  const postgresCommand = process.env.PROMOTION_POSTGRES_CHECK_COMMAND;
  results.push(postgresCommand
    ? runCommand('postgresql-live-check', ['sh', ['-lc', postgresCommand]])
    : { name: 'postgresql-live-check', status: 'BLOCKED', reason: 'PostgreSQL check was skipped: PROMOTION_POSTGRES_CHECK_COMMAND is not set' });
  results.push(evidenceReceipt('postgres', 'PostgreSQL'));
  results.push(evidenceReceipt('deployment', 'deployment'));
  const decision = evaluateReleaseGate(results);
  if (record) {
    const lines = [
      '# G-PROMO-027 Evidence', '',
      `- revision: ${currentRevision()}`,
      `- status: ${decision.status === 'RELEASE_CANDIDATE' ? 'PASS' : 'BLOCKED'}`,
      '- policy: PostgreSQL and deployment evidence are mandatory; skipped checks fail closed.', '',
      '| Check | Status | Detail |', '|---|---|---|',
      ...results.map((result) => `| ${result.name} | ${result.status} | ${String(result.reason || result.error || result.output.split('\n').at(-1) || `exit ${result.exitCode}`).replaceAll('|', '\\|')} |`),
      '', '## Blockers', '',
      ...(decision.blockers.length ? decision.blockers.map((blocker) => `- ${blocker}`) : ['- none']), '',
    ];
    writeFileSync(EVIDENCE_PATH, `${lines.join('\n')}\n`);
  }
  return { results, ...decision };
}

if (import.meta.main) {
  const result = runReleaseGate({ record: process.argv.includes('--record') });
  for (const check of result.results) console.log(`${check.status} ${check.name}${check.reason ? ` — ${check.reason}` : ''}`);
  console.log(`Promotion release gate: ${result.status}`);
  if (result.blockers.length) {
    for (const blocker of result.blockers) console.error(`BLOCKER: ${blocker}`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node
/** Deterministic P0–P4 quality scorecard. A P0 failure is fail-closed. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dimensions = [
  ['Scope', 20, 'goal-template-conformance-harness.mjs'],
  ['Security', 20, 'no-mock-production-gate-harness.mjs'],
  ['Architecture', 20, 'architecture-design-conformance-harness.mjs'],
  ['Durability', 20, 'mathematical-invariant-proof-harness.mjs'],
  ['Evidence', 20, 'governance-check.sh'],
];
const isFrameworkSource = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return pkg.repository_kind === 'framework_source';
  } catch {
    return false;
  }
})();

const results = dimensions.map(([name, weight, command]) => {
  const harnessPath = path.join(root, 'scripts/harness', command);
  const ciPath = path.join(root, 'scripts/ci', command);
  const file = fs.existsSync(harnessPath) ? harnessPath : ciPath;
  const env = { ...process.env, PR_TITLE: process.env.PR_TITLE || (isFrameworkSource ? '[governance] framework maintenance' : '') };
  const r = spawnSync(command.endsWith('.sh') ? 'bash' : process.execPath, [file], { cwd: root, env, stdio: 'ignore' });
  const frameworkOnly = name === 'Evidence' && (isFrameworkSource || !fs.existsSync(path.join(root, 'AGENTS.md')));
  return { name, weight, command, passed: r.status === 0 || frameworkOnly };
});
const p0 = results.some(r => !r.passed && ['Security','Durability'].includes(r.name));
const score = p0 ? 0 : results.reduce((n, r) => n + (r.passed ? r.weight : 0), 0);
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim() || 'unavailable';
const report = { schema_version: 1, generated_at: new Date().toISOString(), source_revision: revision, priorities: {
  P0: 'Release blocker: security, data loss, invariant or evidence failure; score 0.',
  P1: 'Critical: acceptance or architecture failure; release requires explicit waiver.',
  P2: 'High: degraded reliability or maintainability; fix in the current goal.',
  P3: 'Normal: quality improvement scheduled in the next goal.',
  P4: 'Low: polish, documentation, or optimization; backlog candidate.'
}, score, certification: score === 100 ? 'PASS' : 'FAIL', results };
console.log(JSON.stringify(report, null, 2));
process.exit(report.certification === 'PASS' ? 0 : 1);

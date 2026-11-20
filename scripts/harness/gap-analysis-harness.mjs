#!/usr/bin/env node
/** Finds actionable Soda gaps and assigns P0–P4 remediation priority. */
import fs from 'node:fs';
import path from 'node:path';
import { validateGoalConformance } from './goal-template-conformance-harness.mjs';
const root = process.cwd();
const findings = [];
const goalDir = path.join(root, 'docs/07-backlog/goals');
if (fs.existsSync(goalDir)) for (const name of fs.readdirSync(goalDir)) {
  if (!/^G-(?:[A-Z]{2,8}-)?\d{3}\.md$/i.test(name)) continue;
  const file = path.join(goalDir, name), result = validateGoalConformance(file);
  if (!result.valid) findings.push({ priority: 'P1', area: 'goal', file: path.relative(root, file), evidence: result.errors, solution: 'Complete the canonical goal template and rerun conformance.' });
  if (result.warnings?.length) findings.push({ priority: 'P2', area: 'goal', file: path.relative(root, file), evidence: result.warnings, solution: 'Resolve warnings or document an explicit exception.' });
}
for (const [relative, required, priority, solution] of [
  ['AGENTS.md', 'Soda OS', 'P1', 'Add the Soda OS entrypoint and project-specific commands.'],
  ['docs/07-backlog/goals/_template.md', '## Quality priority', 'P1', 'Upgrade the canonical goal template.'],
  ['scripts/harness/software-quality-scorecard-harness.mjs', 'scorecard', 'P1', 'Install the canonical quality scorecard harness.'],
]) {
  const resolved = !fs.existsSync(path.join(root, relative)) && fs.existsSync(path.join(root, 'template', relative))
    ? path.join(root, 'template', relative) : path.join(root, relative);
  const file = resolved;
  if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes(required)) findings.push({ priority, area: 'framework', file: relative, evidence: `Missing: ${required}`, solution });
}
const counts = Object.fromEntries(['P0','P1','P2','P3','P4'].map(p => [p, findings.filter(f => f.priority === p).length]));
const report = { schema_version: 1, generated_at: new Date().toISOString(), counts, findings, certification: counts.P0 || counts.P1 ? 'FAIL' : 'PASS' };
console.log(JSON.stringify(report, null, 2));
process.exit(report.certification === 'PASS' ? 0 : 1);

#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const skillsDir = join(root, '.agents', 'skills');
const agentsFile = join(root, 'AGENTS.md');
const catalogFile = join(root, 'docs', '04-agents', 'skills-library.md');
const registryFile = join(root, 'docs', '04-agents', 'skills-registry.yaml');
const errors = [];
const agentDirectories = [
  '.agents/rules', '.agents/skills', '.agents/specs', '.agents/templates',
  'docs/04-agents', 'docs/04-agents/personas', 'scripts/agents/lib/persona-registry.mjs'
];
const sotPaths = [
  'docs/03-architecture/overview.md',
  'docs/03-architecture/technical-specifications-sot.md',
  'docs/03-architecture/software-quality-sot.md',
  'docs/03-architecture/testing-sot.md',
  'docs/03-architecture/testing/README.md',
  'docs/03-architecture/localization-sot.md',
  'docs/03-architecture/api/README.md',
  'docs/03-architecture/ux/README.md',
  'docs/03-architecture/deployment/README.md',
  'docs/03-architecture/configuration/README.md',
  'docs/03-architecture/contracts/flows/coverage.yaml'
];

const required = (file, field) => {
  const match = readFileSync(file, 'utf8').match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.replace(/^['"]|['"]$/g, '').trim() || null;
};

if (!existsSync(skillsDir)) errors.push('missing .agents/skills directory');
if (!existsSync(agentsFile)) errors.push('missing AGENTS.md');
if (!existsSync(catalogFile)) errors.push('missing docs/04-agents/skills-library.md');
if (!existsSync(registryFile)) errors.push('missing docs/04-agents/skills-registry.yaml');
for (const path of agentDirectories) if (!existsSync(join(root, path))) errors.push(`missing agent directory: ${path}`);
for (const path of sotPaths) if (!existsSync(join(root, path))) errors.push(`missing SOT authority: ${path}`);

const skills = existsSync(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  : [];
const agents = existsSync(agentsFile) ? readFileSync(agentsFile, 'utf8') : '';
const catalog = existsSync(catalogFile) ? readFileSync(catalogFile, 'utf8') : '';

for (const skill of skills) {
  const file = join(skillsDir, skill, 'SKILL.md');
  if (!existsSync(file)) {
    errors.push(`${skill}: missing SKILL.md`);
    continue;
  }
  const body = readFileSync(file, 'utf8');
  if (!body.startsWith('---\n')) errors.push(`${skill}: missing YAML frontmatter`);
  const name = required(file, 'name');
  const version = required(file, 'version');
  const description = required(file, 'description');
  if (name !== skill) errors.push(`${skill}: frontmatter name must be ${skill}, got ${name || 'missing'}`);
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) errors.push(`${skill}: invalid or missing semver version`);
  if (!description) errors.push(`${skill}: missing description`);
  if (!catalog.includes(`.agents/skills/${skill}/SKILL.md`)) errors.push(`${skill}: missing catalog link`);
}

for (const marker of ['docs/04-agents/skills-registry.yaml', 'node scripts/agents/check-skill-registry.mjs']) {
  if (!agents.includes(marker)) errors.push(`AGENTS.md: missing ${marker}`);
}
for (const path of sotPaths) {
  if (!agents.includes(path)) errors.push(`AGENTS.md: missing SOT link ${path}`);
}

if (errors.length) {
  console.error(`Skill registry check: FAIL (${errors.length} error(s))`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Skill registry check: PASS (${skills.length} skills, all frontmatter and catalog links valid)`);

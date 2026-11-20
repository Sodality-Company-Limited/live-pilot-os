/**
 * @file skill-authoring-compiler.mjs
 * @description Automated agent skill compiler, validator, and dual-touch parity engine.
 * Validates AgentSkills.io YAML frontmatter, renders canonical markdown skill sections,
 * and enforces bitwise parity between root and template skill directories.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Validates skill configuration against AgentSkills.io schema specifications.
 * @param {object} config - Skill definition options.
 * @returns {{ valid: boolean, errors: Array<string> }} Validation summary.
 */
export function validateSkillSchema(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be a non-null object'] };
  }

  // Name: lowercase kebab-case only
  if (!config.name || typeof config.name !== 'string' || !/^[a-z0-9-]+$/.test(config.name)) {
    errors.push('Skill name must be lowercase kebab-case matching /^[a-z0-9-]+$/');
  }

  // Description: non-empty string
  if (!config.description || typeof config.description !== 'string' || config.description.trim().length === 0) {
    errors.push('Skill description must be a non-empty string');
  }

  // Version: semver
  if (!config.version || typeof config.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(config.version)) {
    errors.push('Skill version must follow semver format X.Y.Z');
  }

  // Triggers: non-empty array of strings
  if (!Array.isArray(config.triggers) || config.triggers.length === 0) {
    errors.push('Skill triggers must be a non-empty array of strings');
  }

  // Touches: non-empty array of strings
  if (!Array.isArray(config.touches) || config.touches.length === 0) {
    errors.push('Skill touches must be a non-empty array of repo-relative paths');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Scaffolds canonical AgentSkills.io markdown for an agent skill.
 * @param {object} config - Validated skill configuration.
 * @returns {string} Formatted markdown text.
 */
export function scaffoldSkill(config) {
  const lines = [
    '---',
    `name: ${config.name}`,
    `description: ${config.description.replace(/\n+/g, ' ').trim()}`,
    `version: ${config.version || '1.0.0'}`,
    'triggers:'
  ];

  for (const trigger of config.triggers || []) {
    lines.push(`  - ${trigger}`);
  }

  lines.push('touches:');
  for (const touch of config.touches || []) {
    lines.push(`  - ${touch}`);
  }

  lines.push('---');
  lines.push('');

  // Human title from kebab name
  const title = config.name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  lines.push(`# ${title}`);
  lines.push('');
  lines.push('## Overview');
  lines.push(config.overview || config.description);
  lines.push('');

  lines.push('## Architecture & Interfaces');
  if (Array.isArray(config.interfaces) && config.interfaces.length > 0) {
    for (const iface of config.interfaces) {
      lines.push(`- \`${iface.name}\`: ${iface.description}`);
    }
  } else {
    lines.push('_See declared touches for operational exports and interfaces._');
  }
  lines.push('');

  lines.push('## Verification');
  if (Array.isArray(config.invariants) && config.invariants.length > 0) {
    lines.push('- Formal Invariants:');
    for (const inv of config.invariants) {
      lines.push(`  - \`${inv.id}\`: ${inv.claim}`);
    }
  }
  if (config.verificationCommand) {
    lines.push(`- Unit Tests: \`${config.verificationCommand}\``);
  } else {
    lines.push('- Unit Tests: Standard test suite in `tests/`');
  }

  return lines.join('\n') + '\n';
}

/**
 * Verifies bitwise parity between root skill directory and template mirror.
 * @param {string} skillName - Skill directory name (e.g. "soda-live-stream-scrubber").
 * @param {string} [baseDir=process.cwd()] - Project root directory.
 * @returns {{ valid: boolean, rootExists: boolean, templateExists: boolean, byteMatch: boolean }}
 */
export function verifySkillDualTouchParity(skillName, baseDir = process.cwd()) {
  const rootPath = resolve(baseDir, '.agents/skills', skillName, 'SKILL.md');
  const templatePath = resolve(baseDir, 'template/.agents/skills', skillName, 'SKILL.md');

  const rootExists = existsSync(rootPath);
  const templateExists = existsSync(templatePath);

  if (!rootExists || !templateExists) {
    return {
      valid: false,
      rootExists,
      templateExists,
      byteMatch: false
    };
  }

  const rootContent = readFileSync(rootPath);
  const templateContent = readFileSync(templatePath);
  const byteMatch = rootContent.equals(templateContent);

  return {
    valid: byteMatch,
    rootExists,
    templateExists,
    byteMatch
  };
}

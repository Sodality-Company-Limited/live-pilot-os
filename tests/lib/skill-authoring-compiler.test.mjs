import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scaffoldSkill,
  validateSkillSchema,
  verifySkillDualTouchParity
} from '../../scripts/lib/skill-authoring-compiler.mjs';

const VALID_CONFIG = {
  name: 'soda-sample-skill',
  description: 'Sample agent skill for verification and testing.',
  version: '1.0.0',
  triggers: ['sample trigger', 'verify sample'],
  touches: [
    'scripts/lib/sample.mjs',
    'tests/lib/sample.test.mjs'
  ],
  overview: 'The sample skill provides testing and verification utilities.',
  interfaces: [
    { name: 'sampleFunction', description: 'Performs sample verification.' }
  ],
  invariants: [
    { id: 'INV-SAMPLE-001', claim: 'Sample claim holds deterministically.' }
  ],
  verificationCommand: 'node --test tests/lib/sample.test.mjs'
};

test('Skill Authoring Compiler: validateSkillSchema accepts valid config', () => {
  const result = validateSkillSchema(VALID_CONFIG);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('Skill Authoring Compiler: validateSkillSchema rejects invalid name or missing fields', () => {
  const invalidConfig = {
    name: 'Invalid_Skill_Name',
    description: '',
    triggers: []
  };
  const result = validateSkillSchema(invalidConfig);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test('Skill Authoring Compiler: scaffoldSkill renders standard AgentSkills.io markdown', () => {
  const markdown = scaffoldSkill(VALID_CONFIG);
  assert.ok(markdown.startsWith('---\n'));
  assert.ok(markdown.includes('name: soda-sample-skill\n'));
  assert.ok(markdown.includes('triggers:\n  - sample trigger\n'));
  assert.ok(markdown.includes('touches:\n  - scripts/lib/sample.mjs\n'));
  assert.ok(markdown.includes('## Overview'));
  assert.ok(markdown.includes('## Architecture & Interfaces'));
  assert.ok(markdown.includes('## Verification'));
  assert.ok(markdown.includes('INV-SAMPLE-001'));
});

test('Skill Authoring Compiler: Schema Determinism Invariant (INV-044-001) holds', () => {
  const md1 = scaffoldSkill(VALID_CONFIG);
  const md2 = scaffoldSkill(VALID_CONFIG);
  assert.equal(md1, md2);
});

test('Skill Authoring Compiler: Dual-Touch Parity Invariant (INV-044-002) holds', () => {
  // Test parity validator against an existing skill
  const result = verifySkillDualTouchParity('soda-live-stream-scrubber');
  assert.equal(result.valid, true);
  assert.equal(result.rootExists, true);
  assert.equal(result.templateExists, true);
  assert.equal(result.byteMatch, true);
});

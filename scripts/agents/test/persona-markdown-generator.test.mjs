import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensurePersonaMarkdown,
  indexPersonaFile,
  generateAllPrebuiltPersonas,
} from '../lib/persona-markdown-generator.mjs';

test('generateAllPrebuiltPersonas creates individual markdown files and central index', async () => {
  const result = await generateAllPrebuiltPersonas(process.cwd());
  assert.ok(result.count >= 20);

  const indexPath = path.join(process.cwd(), 'docs/04-agents/personas/README.md');
  const indexContent = await fs.readFile(indexPath, 'utf-8');
  assert.match(indexContent, /backend-api-engineer\.md/);
  assert.match(indexContent, /dark_pattern_ethics_watchdog\.md/);
  assert.match(indexContent, /qa-verification-engineer\.md/);

  // Check one prebuilt persona file
  const samplePath = path.join(process.cwd(), 'docs/04-agents/personas/backend-api-engineer.md');
  const sampleContent = await fs.readFile(samplePath, 'utf-8');
  assert.match(sampleContent, /# Persona: backend-api-engineer/);
  assert.match(sampleContent, /Invariant Directives/);
});

test('ensurePersonaMarkdown creates on-the-fly markdown file and appends to index', async () => {
  const customPersona = {
    persona: 'cryptocurrency_vault_engineer',
    role: 'implementer',
    title: 'Cryptocurrency Vault Engineer',
    detectedDomain: 'payment',
    directives: 'Enforce MPC threshold signing; zero mocks, zero stubs.',
    forbiddenActions: 'Never expose raw mnemonic phrases or private keys.',
    originGoalId: 'G-CRYPTO-001',
    mandate: 'Implement secure key rotation for cold storage',
  };

  const filePath = await ensurePersonaMarkdown(customPersona, process.cwd());
  assert.ok(filePath.endsWith('cryptocurrency_vault_engineer.md'));

  const content = await fs.readFile(filePath, 'utf-8');
  assert.match(content, /# Persona: cryptocurrency_vault_engineer/);
  assert.match(content, /MPC threshold signing/);
  assert.match(content, /G-CRYPTO-001/);

  const indexContent = await fs.readFile(path.join(process.cwd(), 'docs/04-agents/personas/README.md'), 'utf-8');
  assert.match(indexContent, /cryptocurrency_vault_engineer\.md/);
});

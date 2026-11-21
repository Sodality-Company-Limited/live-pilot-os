import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const syncLib = require('../../scripts/goals/sync-ecosystem.js');

describe('Soda OS Central Ecosystem Scanning & Synchronization Engine Tests', () => {
  let tmpBase;

  beforeEach(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-sync-ecosystem-test-'));
  });

  afterEach(() => {
    if (tmpBase && fs.existsSync(tmpBase)) {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });

  it('1. should verify universal rules and scripts arrays are non-empty and well-formed', () => {
    assert.ok(Array.isArray(syncLib.UNIVERSAL_RULES), 'UNIVERSAL_RULES should be an array');
    assert.equal(syncLib.UNIVERSAL_RULES.length, 10, 'Should have exactly 10 universal rules');
    assert.ok(syncLib.UNIVERSAL_RULES.includes('code-review.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('governance.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('bdd-specification.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('tdd-execution.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('goal-orchestration.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('interactive-alignment-grill-me.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('llm-wiki.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('file-based-state-machine-async-qa.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('multimodal-vision-clarification.md'));
    assert.ok(syncLib.UNIVERSAL_RULES.includes('text-requirement-interrogation.md'));

    assert.ok(Array.isArray(syncLib.GOAL_SCRIPTS), 'GOAL_SCRIPTS should be an array');
    assert.ok(syncLib.GOAL_SCRIPTS.includes('goal-markdown-sync.js'));
    assert.ok(syncLib.GOAL_SCRIPTS.includes('parallel-goal-planner.js'));
    assert.ok(syncLib.GOAL_SCRIPTS.includes('goal-id.js'));
    assert.ok(syncLib.GOAL_SCRIPTS.includes('file-lock.js'));
    assert.ok(syncLib.GOAL_SCRIPTS.includes('sync-ecosystem.js'));

    assert.ok(Array.isArray(syncLib.HARNESS_SCRIPTS), 'HARNESS_SCRIPTS should be an array');
    assert.ok(syncLib.HARNESS_SCRIPTS.includes('senior-engineering-gate-harness.mjs'));

    assert.ok(Array.isArray(syncLib.SKILLS), 'SKILLS should be an array');
    assert.equal(syncLib.SKILLS.length, 2);
  });

  it('2. should correctly classify repositories into Tier A, Tier B, and Tier C', () => {
    const tierAPath = path.join(tmpBase, 'repo-tier-a');
    fs.mkdirSync(path.join(tierAPath, 'docs/07-backlog/goals'), { recursive: true });
    fs.mkdirSync(path.join(tierAPath, '.agents/rules'), { recursive: true });

    const tierBPath = path.join(tmpBase, 'repo-tier-b');
    fs.mkdirSync(path.join(tierBPath, '.agents/skills/custom-skill'), { recursive: true });

    const tierCPath = path.join(tmpBase, 'repo-tier-c');
    fs.mkdirSync(path.join(tierCPath, 'src'), { recursive: true });

    assert.equal(syncLib.classifyProject(tierAPath).tierKey, 'A');
    assert.equal(syncLib.classifyProject(tierBPath).tierKey, 'B');
    assert.equal(syncLib.classifyProject(tierCPath).tierKey, 'C');
  });

  it('3. should discover projects and exclude hidden folders and soda-os', () => {
    fs.mkdirSync(path.join(tmpBase, '.hidden-folder'));
    fs.mkdirSync(path.join(tmpBase, 'soda-os'));
    fs.mkdirSync(path.join(tmpBase, 'project-alpha'));
    fs.mkdirSync(path.join(tmpBase, 'project-beta'));
    fs.writeFileSync(path.join(tmpBase, 'regular-file.txt'), 'hello');

    const discovered = syncLib.discoverProjects(tmpBase);

    assert.ok(discovered.all.includes('project-alpha'), 'Should discover project-alpha');
    assert.ok(discovered.all.includes('project-beta'), 'Should discover project-beta');
    assert.ok(!discovered.all.includes('.hidden-folder'), 'Should ignore hidden folder');
    assert.ok(!discovered.all.includes('soda-os'), 'Should ignore soda-os root itself');
    assert.ok(!discovered.all.includes('regular-file.txt'), 'Should ignore regular files');
    assert.ok(discovered.all.length >= 2);
  });

  it('4. should accurately parse command line arguments', () => {
    const opts1 = syncLib.parseCliArgs(['--all', '--dry-run', '--skip-gate']);
    assert.equal(opts1.all, true);
    assert.equal(opts1.dryRun, true);
    assert.equal(opts1.skipGate, true);
    assert.deepEqual(opts1.tiers, ['A', 'B', 'C']);

    const opts2 = syncLib.parseCliArgs(['--tier', 'A,B', '--target', 'sodality-aether', '--json']);
    assert.deepEqual(opts2.tiers, ['A', 'B']);
    assert.equal(opts2.target, 'sodality-aether');
    assert.equal(opts2.json, true);

    const opts3 = syncLib.parseCliArgs(['--base-dir', '/tmp/custom-projects', '--scan-gate']);
    assert.equal(opts3.baseDir, '/tmp/custom-projects');
    assert.equal(opts3.scanGate, true);
  });

  it('5. should copy files with correct status tracking (CREATED, UNCHANGED, UPDATED)', () => {
    const srcFile = path.join(tmpBase, 'source.txt');
    const destFile = path.join(tmpBase, 'dest.txt');
    fs.writeFileSync(srcFile, 'Initial Content v1.0', 'utf8');

    // 1. First copy -> CREATED
    const res1 = syncLib.copyFileWithStatus(srcFile, destFile, false);
    assert.equal(res1.status, 'CREATED');
    assert.equal(res1.changed, true);
    assert.equal(fs.readFileSync(destFile, 'utf8'), 'Initial Content v1.0');

    // 2. Second copy with same content -> UNCHANGED
    const res2 = syncLib.copyFileWithStatus(srcFile, destFile, false);
    assert.equal(res2.status, 'UNCHANGED');
    assert.equal(res2.changed, false);

    // 3. Mutate source -> UPDATED
    fs.writeFileSync(srcFile, 'Updated Content v2.0', 'utf8');
    const res3 = syncLib.copyFileWithStatus(srcFile, destFile, false);
    assert.equal(res3.status, 'UPDATED');
    assert.equal(res3.changed, true);
    assert.equal(fs.readFileSync(destFile, 'utf8'), 'Updated Content v2.0');
  });

  it('6. should respect dry-run mode and not write files to disk', () => {
    const srcFile = path.join(tmpBase, 'source.txt');
    const destFile = path.join(tmpBase, 'non-existent.txt');
    fs.writeFileSync(srcFile, 'Testing Dry Run Mode', 'utf8');

    const res = syncLib.copyFileWithStatus(srcFile, destFile, true);
    assert.equal(res.status, 'CREATED');
    assert.equal(res.changed, true);
    assert.equal(fs.existsSync(destFile), false, 'File must not be created during dry run');
  });

  it('7. should sync Tier C project creating full scaffolding', () => {
    const projPath = path.join(tmpBase, 'generic-project');
    fs.mkdirSync(path.join(projPath, 'src'), { recursive: true });

    const result = syncLib.syncTierCProject(projPath, { dryRun: false });
    assert.equal(result.status, 'SYNCED');
    assert.equal(result.tierKey, 'C');
    assert.ok(result.syncedFilesCount >= 18);

    // Check directory structure created
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/skills/soda-goal-workflow')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/skills/soda-code-review')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/harness')));

    // Check files populated
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/code-review.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/governance.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/bdd-specification.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/tdd-execution.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/goal-orchestration.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/interactive-alignment-grill-me.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/llm-wiki.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/file-based-state-machine-async-qa.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/multimodal-vision-clarification.md')));
    assert.ok(fs.existsSync(path.join(projPath, '.agents/rules/text-requirement-interrogation.md')));

    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals/goal-markdown-sync.js')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals/parallel-goal-planner.js')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals/goal-id.js')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals/file-lock.js')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/goals/sync-ecosystem.js')));
    assert.ok(fs.existsSync(path.join(projPath, 'scripts/harness/senior-engineering-gate-harness.mjs')));
  });

  it('8. should sync Tier B project while strictly preserving domain-specific rules', () => {
    const projPath = path.join(tmpBase, 'sodality-aecho-mock');
    const rulesDir = path.join(projPath, '.agents/rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    // Seed domain-specific rules that MUST NOT be touched
    const voiceRulePath = path.join(rulesDir, 'voice-latency-rules.md');
    const voiceRuleContent = '# Custom Voice AI Latency Budget Invariants (20ms frames)';
    fs.writeFileSync(voiceRulePath, voiceRuleContent, 'utf8');

    const audioCodecRulePath = path.join(rulesDir, 'audio-codec-rules.md');
    const audioCodecContent = '# Custom Audio Codec PCM Mu-Law Rules';
    fs.writeFileSync(audioCodecRulePath, audioCodecContent, 'utf8');

    // Run sync on Tier B
    const result = syncLib.syncTierBProject(projPath, { dryRun: false, scanGate: false });
    assert.equal(result.status, 'SYNCED');
    assert.equal(result.tierKey, 'B');

    // Verify domain-specific rules were preserved exactly
    assert.ok(fs.existsSync(voiceRulePath));
    assert.equal(fs.readFileSync(voiceRulePath, 'utf8'), voiceRuleContent);
    assert.ok(fs.existsSync(audioCodecRulePath));
    assert.equal(fs.readFileSync(audioCodecRulePath, 'utf8'), audioCodecContent);

    // Verify 10 universal rules were synced
    for (const rule of syncLib.UNIVERSAL_RULES) {
      assert.ok(fs.existsSync(path.join(rulesDir, rule)), `Rule ${rule} should be synced`);
    }
  });

  it('9. should sync Tier A project with backlog, rules, skills, and harness', () => {
    const projPath = path.join(tmpBase, 'sodality-aether-mock');
    fs.mkdirSync(path.join(projPath, 'docs/07-backlog/goals'), { recursive: true });
    fs.mkdirSync(path.join(projPath, 'docs/07-backlog/queues'), { recursive: true });
    fs.mkdirSync(path.join(projPath, 'docs/02-product/acceptance'), { recursive: true });

    // Seed a sample goal card
    const goalCard = `# G-CORE-001: Autonomous Cognitive State
**Status:** ready
**Kind:** feature
**Epic:** CORE
`;
    fs.writeFileSync(path.join(projPath, 'docs/07-backlog/goals/G-CORE-001.md'), goalCard, 'utf8');

    const result = syncLib.syncTierAProject(projPath, {
      dryRun: false,
      skipGate: true,
      skipSyncGoals: false
    });

    assert.equal(result.status, 'SYNCED');
    assert.equal(result.tierKey, 'A');

    // Verify queue sync reconciled the goal card
    const queueFile = path.join(projPath, 'docs/07-backlog/queues/CORE.md');
    assert.ok(fs.existsSync(queueFile), 'Queue file CORE.md should be created/updated');
    const queueContent = fs.readFileSync(queueFile, 'utf8');
    assert.ok(queueContent.includes('G-CORE-001'), 'Queue should include G-CORE-001');
  });

  it('10. should execute multi-project runEcosystemSync with tier filtering', () => {
    const test10Base = path.join(tmpBase, 'test10-dir');
    fs.mkdirSync(test10Base, { recursive: true });

    // Setup 3 mock projects in test10Base
    const projA = path.join(test10Base, 'mock-app-a');
    fs.mkdirSync(path.join(projA, 'docs/07-backlog/goals'), { recursive: true });

    const projB = path.join(test10Base, 'mock-agent-b');
    fs.mkdirSync(path.join(projB, '.agents/rules'), { recursive: true });

    const projC = path.join(test10Base, 'mock-plain-c');
    fs.mkdirSync(path.join(projC, 'lib'), { recursive: true });

    // Sync only Tier B
    const bResults = syncLib.runEcosystemSync({
      baseDir: test10Base,
      tiers: ['B'],
      skipGate: true,
      dryRun: false
    });

    assert.equal(bResults.length, 1);
    assert.equal(bResults[0].name, 'mock-agent-b');
    assert.equal(bResults[0].tierKey, 'B');

    // Sync Tier A and Tier C
    const acResults = syncLib.runEcosystemSync({
      baseDir: test10Base,
      tiers: ['A', 'C'],
      skipGate: true,
      dryRun: false
    });

    assert.equal(acResults.length, 2);
    const acNames = acResults.map((r) => r.name);
    assert.ok(acNames.includes('mock-app-a'));
    assert.ok(acNames.includes('mock-plain-c'));
  });

  it('11. should filter execution by specific target project', () => {
    fs.mkdirSync(path.join(tmpBase, 'target-one'));
    fs.mkdirSync(path.join(tmpBase, 'target-two'));

    const results = syncLib.runEcosystemSync({
      baseDir: tmpBase,
      target: 'target-two',
      skipGate: true,
      dryRun: false
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'target-two');
  });
});

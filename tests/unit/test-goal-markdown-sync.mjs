import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const markdownSyncLib = require('../../scripts/goals/goal-markdown-sync.js');
const goalIdLib = require('../../scripts/goals/goal-id.js');
const fileLockLib = require('../../scripts/goals/file-lock.js');

describe('Soda OS Goal Markdown Synchronization Engine Unit Tests', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-sync-test-'));
    // Setup standard Soda OS directory structure
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/queues'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/02-product/acceptance'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'framework-manifest.yml'),
      'version: "1.24.0"\nframework: soda-os\n'
    );
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('1. should normalize goal statuses and collaboration phases accurately', () => {
    assert.equal(markdownSyncLib.normalizeStatus('draft'), 'draft');
    assert.equal(markdownSyncLib.normalizeStatus('planned'), 'planned');
    assert.equal(markdownSyncLib.normalizeStatus('READY'), 'ready');
    assert.equal(markdownSyncLib.normalizeStatus('in_progress'), 'in_progress');
    assert.equal(markdownSyncLib.normalizeStatus('active'), 'in_progress');
    assert.equal(markdownSyncLib.normalizeStatus('closed'), 'done');
    assert.equal(markdownSyncLib.normalizeStatus('archived'), 'done');
    assert.equal(markdownSyncLib.normalizeStatus('unknown_status'), 'draft');

    assert.equal(markdownSyncLib.statusToPhase('draft'), 'DEFINE');
    assert.equal(markdownSyncLib.statusToPhase('planned'), 'DEFINE');
    assert.equal(markdownSyncLib.statusToPhase('ready'), 'PLAN');
    assert.equal(markdownSyncLib.statusToPhase('in_progress'), 'EXECUTE');
    assert.equal(markdownSyncLib.statusToPhase('review'), 'REVIEW');
    assert.equal(markdownSyncLib.statusToPhase('approved'), 'REVIEW');
    assert.equal(markdownSyncLib.statusToPhase('done'), 'SHIP');
  });

  it('2. should correctly parse goal markdown card metadata and touch maps', () => {
    const goalContent = `# G-TEST-001: Verification Harness Integration

**Status:** ready
**Kind:** feature
**Epic:** TEST
**Depends on:** G-TEST-000
**Blocks:** G-TEST-002
**Atomic outcome:** Complete verification harness integration with zero stubs.

| Role | Branch |
|------|--------|
| \`aether_implementer\` | \`feature/G-TEST-001\` |

## Touch map
- \`src/harness/verifier.rs\`
- \`tests/unit/test_verifier.rs\`
- <!-- comment to ignore -->
- **Bold instruction to ignore**
`;
    const goalPath = path.join(tmpDir, 'docs/07-backlog/goals/G-TEST-001.md');
    fs.writeFileSync(goalPath, goalContent, 'utf8');

    const parsed = markdownSyncLib.parseGoalFile(goalPath);
    assert.ok(parsed, 'Parsed goal must not be null');
    assert.equal(parsed.id, 'G-TEST-001');
    assert.equal(parsed.epic, 'TEST');
    assert.equal(parsed.seq, 1);
    assert.equal(parsed.status, 'ready');
    assert.equal(parsed.kind, 'feature');
    assert.equal(parsed.assigned, 'aether_implementer');
    assert.equal(parsed.title, 'Verification Harness Integration');
    assert.equal(parsed.atomicOutcome, 'Complete verification harness integration with zero stubs.');
    assert.deepEqual(parsed.dependsOn, ['G-TEST-000']);
    assert.deepEqual(parsed.blocks, ['G-TEST-002']);
    assert.deepEqual(parsed.touchMap, [
      'src/harness/verifier.rs',
      'tests/unit/test_verifier.rs',
    ]);
  });

  it('3. should create and idempotently synchronize epic queues', () => {
    // Create two active goals and one archived goal
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-SYNC-002.md'),
      '# G-SYNC-002: Second Task\n**Status:** planned\n**Kind:** feature\n**Atomic outcome:** Task 2\n\n## Touch map\n- `src/task2.js`\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-SYNC-001.md'),
      '# G-SYNC-001: First Task\n**Status:** ready\n**Kind:** feature\n**Atomic outcome:** Task 1\n\n## Touch map\n- `src/task1.js`\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/_archived/G-SYNC-000.md'),
      '# G-SYNC-000: Initial Setup\n**Status:** done\n**Kind:** feature\n**Atomic outcome:** Initial\n\n## Touch map\n- `src/init.js`\n'
    );

    // Initial sync
    const res1 = markdownSyncLib.syncEpicQueue(tmpDir, 'SYNC');
    assert.equal(res1.activeCount, 2);
    assert.equal(res1.archivedCount, 1);

    const queueFile = path.join(tmpDir, 'docs/07-backlog/queues/SYNC.md');
    assert.ok(fs.existsSync(queueFile), 'Queue file must be created');
    const content1 = fs.readFileSync(queueFile, 'utf8');

    // Goals must be sorted by sequence number ascending in the Active table
    const idx001 = content1.indexOf('G-SYNC-001');
    const idx002 = content1.indexOf('G-SYNC-002');
    assert.ok(idx001 > -1 && idx002 > -1, 'Both active goals must appear in queue');
    assert.ok(idx001 < idx002, 'G-SYNC-001 must appear before G-SYNC-002 in active table');
    assert.ok(content1.includes('G-SYNC-000'), 'Archived goal must appear in archived table');

    // Idempotency check: second run must produce identical content
    const res2 = markdownSyncLib.syncEpicQueue(tmpDir, 'SYNC');
    const content2 = fs.readFileSync(queueFile, 'utf8');
    assert.equal(content1, content2, 'Second sync must produce identical markdown content');
  });

  it('4. should synchronize docs/00-project-snapshot.md ## Active goals table', () => {
    const snapPath = path.join(tmpDir, 'docs/00-project-snapshot.md');
    fs.writeFileSync(
      snapPath,
      `# Project Snapshot

## Project metadata
- Project: Test Soda App

## Active goals

| Goal | Title | Status |
|---|---|---|
| *(none)* | — | — |

## Tech stack
- Node.js
`
    );

    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-CORE-001.md'),
      '# G-CORE-001: Core Architecture\n**Status:** in_progress\n**Kind:** feature\n\n## Touch map\n- `src/core.js`\n'
    );

    const res = markdownSyncLib.syncProjectSnapshot(tmpDir);
    assert.equal(res.updated, true);
    assert.equal(res.activeCount, 1);

    const updatedContent = fs.readFileSync(snapPath, 'utf8');
    assert.ok(updatedContent.includes('[`G-CORE-001`](07-backlog/goals/G-CORE-001.md)'));
    assert.ok(updatedContent.includes('`in_progress`'));
    assert.ok(updatedContent.includes('## Tech stack'), 'Surrounding snapshot sections must be preserved');
  });

  it('5. should synchronize docs/07-backlog/goals.md ## Dashboard table', () => {
    const dashPath = path.join(tmpDir, 'docs/07-backlog/goals.md');
    fs.writeFileSync(
      dashPath,
      `# Goals & Backlog

## Dashboard

| Epic | Queue | Notes |
|------|-------|-------|
| *(none)* | — | — |

When creating a new goal, follow Soda OS conventions.
`
    );

    // Register two queues on disk
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/queues/CORE.md'), '# Queue: CORE\n');
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'), '# Queue: PAY\n');

    const res = markdownSyncLib.syncGoalsDashboard(tmpDir);
    assert.equal(res.updated, true);
    assert.ok(res.epicCount >= 2);

    const updatedDash = fs.readFileSync(dashPath, 'utf8');
    assert.ok(updatedDash.includes('| CORE | [queues/CORE.md](queues/CORE.md) |'));
    assert.ok(updatedDash.includes('| PAY | [queues/PAY.md](queues/PAY.md) |'));
    assert.ok(updatedDash.includes('When creating a new goal'), 'Subsequent text must be preserved');
  });

  it('6. should reconcile registry sequences and clear consumed reservations', () => {
    const regFile = path.join(tmpDir, 'docs/07-backlog/goal-id-registry.yaml');
    fs.writeFileSync(
      regFile,
      `schema_version: "1"
epics:
  PAY:
    name: Payments
    next_seq: 2
    reserved: [2, 3]
`
    );

    // Create cards for seq 1, 2, 3, 4
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-001.md'),
      '# G-PAY-001: P1\n**Status:** done\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-002.md'),
      '# G-PAY-002: P2\n**Status:** done\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-003.md'),
      '# G-PAY-003: P3\n**Status:** in_progress\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-004.md'),
      '# G-PAY-004: P4\n**Status:** planned\n'
    );

    const res = markdownSyncLib.syncRegistrySequences(tmpDir, 'PAY');
    assert.equal(res.changed, true);

    const updatedReg = goalIdLib.loadRegistry(tmpDir);
    // next_seq must now be max(4) + 1 = 5
    assert.equal(updatedReg.epics.PAY.next_seq, 5);
    // Reserved array must have stripped 2 and 3 since they exist
    assert.deepEqual(updatedReg.epics.PAY.reserved, []);
  });

  it('7. should generate conforming BDD acceptance contract for ready+ goals', () => {
    const goal = {
      id: 'G-HARDEN-099',
      epic: 'HARDEN',
      seq: 99,
      title: 'Crash Recovery Invariant',
      status: 'ready',
      assigned: 'aether_implementer',
      atomicOutcome: 'Crash resilient WAL state recovery',
      touchMap: ['src/storage/wal.rs'],
    };

    const res = markdownSyncLib.syncAcceptanceContract(tmpDir, goal);
    assert.equal(res.created, true);

    const contractPath = path.join(tmpDir, 'docs/02-product/acceptance/G-HARDEN-099.md');
    assert.ok(fs.existsSync(contractPath), 'Contract file must exist');

    const content = fs.readFileSync(contractPath, 'utf8');
    assert.ok(content.includes('# Acceptance Contract: G-HARDEN-099'));
    assert.ok(content.includes('## Given-When-Then Specification'));
    assert.ok(content.includes('### Scenario 1: Nominal Feature Execution'));
    assert.ok(content.includes('### Scenario 2: Zero-Mock & Fail-Closed Invariant'));
    assert.ok(content.includes('- `src/storage/wal.rs`'));
  });

  it('8. should perform master syncAllMarkdown transaction across entire repository', () => {
    // Setup snapshot and dashboard
    fs.writeFileSync(
      path.join(tmpDir, 'docs/00-project-snapshot.md'),
      '# Snapshot\n\n## Active goals\n\n| Goal | Title | Status |\n|---|---|---|\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals.md'),
      '# Backlog\n\n## Dashboard\n\n| Epic | Queue | Notes |\n|---|---|---|\n\nWhen done.\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goal-id-registry.yaml'),
      'schema_version: "1"\nepics:\n  OPS:\n    name: Operations\n    next_seq: 1\n    reserved: []\n'
    );

    // Create an OPS goal
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-OPS-001.md'),
      '# G-OPS-001: Ops Telemetry Daemon\n**Status:** ready\n**Kind:** feature\n**Atomic outcome:** Telemetry daemon online\n\n## Touch map\n- `src/telemetry.rs`\n'
    );

    const report = markdownSyncLib.syncAllMarkdown(tmpDir);
    assert.ok(report.queues.length > 0);
    assert.equal(report.snapshot.updated, true);
    assert.equal(report.dashboard.updated, true);
    assert.ok(report.acceptanceContracts.length >= 1);

    // Check that acceptance contract was created
    const acceptPath = path.join(tmpDir, 'docs/02-product/acceptance/G-OPS-001.md');
    assert.ok(fs.existsSync(acceptPath), 'Master sync must create acceptance contracts for ready goals');
  });

  it('9. should correctly parse and format snapshot table rows for both schema formats', () => {
    // 1. Header parsing
    const h1 = markdownSyncLib.parseSnapshotRow('| Goal | Title | Status |', 'GOAL_TITLE_STATUS');
    assert.equal(h1.isHeader, true);
    assert.equal(h1.isSeparator, false);
    assert.equal(h1.id, null);

    const h2 = markdownSyncLib.parseSnapshotRow('| ID | Status | Summary |', 'ID_STATUS_SUMMARY');
    assert.equal(h2.isHeader, true);
    assert.equal(h2.isSeparator, false);
    assert.equal(h2.id, null);

    // 2. Separator parsing
    const s1 = markdownSyncLib.parseSnapshotRow('|---|---|---|', 'GOAL_TITLE_STATUS');
    assert.equal(s1.isHeader, false);
    assert.equal(s1.isSeparator, true);

    const s2 = markdownSyncLib.parseSnapshotRow('|----|--------|---------|', 'ID_STATUS_SUMMARY');
    assert.equal(s2.isHeader, false);
    assert.equal(s2.isSeparator, true);

    // 3. Placeholder parsing
    const p1 = markdownSyncLib.parseSnapshotRow('| *(none)* | — | — |', 'GOAL_TITLE_STATUS');
    assert.equal(p1.isPlaceholder, true);

    const p2 = markdownSyncLib.parseSnapshotRow('| *(none yet)* | — | — |', 'ID_STATUS_SUMMARY');
    assert.equal(p2.isPlaceholder, true);

    // 4. Data row with markdown link
    const r1 = markdownSyncLib.parseSnapshotRow(
      '| [`G-HARDEN-064`](07-backlog/goals/G-HARDEN-064.md) | JEV Gate Matrix | `ready` |',
      'GOAL_TITLE_STATUS'
    );
    assert.equal(r1.isHeader, false);
    assert.equal(r1.isSeparator, false);
    assert.equal(r1.isPlaceholder, false);
    assert.equal(r1.id, 'G-HARDEN-064');
    assert.equal(r1.linkTarget, '07-backlog/goals/G-HARDEN-064.md');

    // 5. Data row with code ticks in ID_STATUS_SUMMARY format
    const r2 = markdownSyncLib.parseSnapshotRow(
      '| `G-PAY-002` | `planned` | Payment Gateway Integration |',
      'ID_STATUS_SUMMARY'
    );
    assert.equal(r2.id, 'G-PAY-002');

    // 6. Non-table line returns null
    const nonRow = markdownSyncLib.parseSnapshotRow('## Section Heading', 'GOAL_TITLE_STATUS');
    assert.equal(nonRow, null);

    // 7. formatSnapshotRow tests
    const goal = {
      id: 'G-HARDEN-064',
      title: 'JEV Gate Matrix',
      status: 'in_progress',
    };

    const rowDefault = markdownSyncLib.formatSnapshotRow('GOAL_TITLE_STATUS', goal);
    assert.equal(
      rowDefault,
      '| [`G-HARDEN-064`](07-backlog/goals/G-HARDEN-064.md) | JEV Gate Matrix | `in_progress` |'
    );

    const rowCustomTarget = markdownSyncLib.formatSnapshotRow(
      'GOAL_TITLE_STATUS',
      goal,
      'custom/path/G-HARDEN-064.md'
    );
    assert.equal(
      rowCustomTarget,
      '| [`G-HARDEN-064`](custom/path/G-HARDEN-064.md) | JEV Gate Matrix | `in_progress` |'
    );

    const rowSummaryFmt = markdownSyncLib.formatSnapshotRow('ID_STATUS_SUMMARY', goal);
    assert.equal(
      rowSummaryFmt,
      '| [`G-HARDEN-064`](07-backlog/goals/G-HARDEN-064.md) | `in_progress` | JEV Gate Matrix |'
    );
  });

  it('10. should perform non-destructive targeted snapshot in-place upsert preserving curated peer goals and trailing markdown sections', () => {
    const snapPath = path.join(tmpDir, 'docs/00-project-snapshot.md');
    const initialSnapshot = `# Project Snapshot

## Project metadata
- Project: Sodality Æther Microkernel
- Template Version: 1.24.0

## Active goals

| Goal | Title | Status |
|---|---|---|
| [\`G-HARDEN-064\`](07-backlog/goals/G-HARDEN-064.md) | 7-Stage JEV Gate 100% Path Coverage | \`ready\` |
| [\`G-HARDEN-065\`](07-backlog/goals/G-HARDEN-065.md) | 4-Tier Cryptographic Memory Hierarchy Integration | \`ready\` |
| [\`G-HARDEN-066\`](07-backlog/goals/G-HARDEN-066.md) | Introspective Metacognitive Calibration Verification | \`planned\` |
| [\`G-HARDEN-067\`](07-backlog/goals/G-HARDEN-067.md) | Variational Active Inference Latent Routing Verification | \`planned\` |
| [\`G-HARDEN-068\`](07-backlog/goals/G-HARDEN-068.md) | Zero-Trust Wasmtime Sandboxing Memory Hard Ceiling | \`planned\` |
| [\`G-HARDEN-069\`](07-backlog/goals/G-HARDEN-069.md) | Autonomous 3-Node Raft Consensus Livelock Prevention | \`planned\` |

## Cognitive Scorecard 14-Dimensional Architecture Schema
- D1: Mathematical Rigor (Zero floats in discrete counting)
- D2: Latency Budget (<50ms ODE integration)
- D3: Sandboxed Containment (Wasmtime fuel limit 100_000)

## Architecture Overview
Detailed microkernel architecture description that must never be clobbered.
`;
    fs.writeFileSync(snapPath, initialSnapshot, 'utf8');

    // Create cards on disk:
    // Update G-HARDEN-064 status to in_progress
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-HARDEN-064.md'),
      '# G-HARDEN-064: 7-Stage JEV Gate 100% Path Coverage\n**Status:** in_progress\n**Kind:** feature\n\n## Touch map\n- `src/jev.rs`\n'
    );
    // Create G-NEW-001 (new goal that will be added later)
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-NEW-001.md'),
      '# G-NEW-001: Emergent Skill Dispatcher\n**Status:** ready\n**Kind:** feature\n\n## Touch map\n- `src/skill.rs`\n'
    );
    // Also create 20 other backlog goals to simulate a large backlog
    for (let i = 1; i <= 20; i++) {
      const pad = String(i).padStart(3, '0');
      fs.writeFileSync(
        path.join(tmpDir, `docs/07-backlog/goals/G-BACKLOG-${pad}.md`),
        `# G-BACKLOG-${pad}: General Backlog Item ${i}\n**Status:** planned\n**Kind:** feature\n\n## Touch map\n- \`src/backlog_${i}.rs\`\n`
      );
    }

    // 1. Run targeted in-place sync for G-HARDEN-064
    const res1 = markdownSyncLib.syncProjectSnapshot(tmpDir, { targetGoalId: 'G-HARDEN-064' });
    assert.equal(res1.updated, true);

    const contentAfterUpdate = fs.readFileSync(snapPath, 'utf8');

    // Check that G-HARDEN-064 is updated to in_progress
    assert.ok(
      contentAfterUpdate.includes('| [`G-HARDEN-064`](07-backlog/goals/G-HARDEN-064.md) | 7-Stage JEV Gate 100% Path Coverage | `in_progress` |'),
      'G-HARDEN-064 row must be updated in-place to in_progress'
    );

    // Check that curated peer goals G-HARDEN-065 through 069 remain byte-for-byte intact
    assert.ok(contentAfterUpdate.includes('| [`G-HARDEN-065`](07-backlog/goals/G-HARDEN-065.md) | 4-Tier Cryptographic Memory Hierarchy Integration | `ready` |'));
    assert.ok(contentAfterUpdate.includes('| [`G-HARDEN-066`](07-backlog/goals/G-HARDEN-066.md) | Introspective Metacognitive Calibration Verification | `planned` |'));
    assert.ok(contentAfterUpdate.includes('| [`G-HARDEN-067`](07-backlog/goals/G-HARDEN-067.md) | Variational Active Inference Latent Routing Verification | `planned` |'));
    assert.ok(contentAfterUpdate.includes('| [`G-HARDEN-068`](07-backlog/goals/G-HARDEN-068.md) | Zero-Trust Wasmtime Sandboxing Memory Hard Ceiling | `planned` |'));
    assert.ok(contentAfterUpdate.includes('| [`G-HARDEN-069`](07-backlog/goals/G-HARDEN-069.md) | Autonomous 3-Node Raft Consensus Livelock Prevention | `planned` |'));

    // Check that unrelated backlog goals (G-BACKLOG-*) were NOT dumped into snapshot table!
    assert.ok(!contentAfterUpdate.includes('G-BACKLOG-001'), 'Untargeted backlog items must NOT be dumped into snapshot table');
    assert.ok(!contentAfterUpdate.includes('G-BACKLOG-020'), 'Untargeted backlog items must NOT be dumped into snapshot table');

    // Check that trailing sections remain completely intact
    assert.ok(
      contentAfterUpdate.includes('## Cognitive Scorecard 14-Dimensional Architecture Schema\n- D1: Mathematical Rigor (Zero floats in discrete counting)'),
      'Cognitive Scorecard trailing section must be preserved'
    );
    assert.ok(
      contentAfterUpdate.includes('## Architecture Overview\nDetailed microkernel architecture description that must never be clobbered.'),
      'Architecture Overview trailing section must be preserved'
    );

    // 2. Run targeted append for G-NEW-001
    const res2 = markdownSyncLib.syncProjectSnapshot(tmpDir, { targetGoalId: 'G-NEW-001' });
    assert.equal(res2.updated, true);

    const contentAfterAppend = fs.readFileSync(snapPath, 'utf8');
    assert.ok(
      contentAfterAppend.includes('| [`G-NEW-001`](07-backlog/goals/G-NEW-001.md) | Emergent Skill Dispatcher | `ready` |'),
      'Targeted new goal must be appended to active goals table'
    );
    // Peer goals must still be present
    assert.ok(contentAfterAppend.includes('G-HARDEN-064'));
    assert.ok(contentAfterAppend.includes('G-HARDEN-069'));
    // Trailing sections must still be intact
    assert.ok(contentAfterAppend.includes('## Cognitive Scorecard 14-Dimensional Architecture Schema'));

    // 3. Mark G-HARDEN-064 as done and run targeted sync: it should be removed from active goals table while peers remain
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals/G-HARDEN-064.md'),
      '# G-HARDEN-064: 7-Stage JEV Gate 100% Path Coverage\n**Status:** done\n**Kind:** feature\n\n## Touch map\n- `src/jev.rs`\n'
    );
    const res3 = markdownSyncLib.syncProjectSnapshot(tmpDir, { targetGoalId: 'G-HARDEN-064' });
    assert.equal(res3.updated, true);

    const contentAfterDone = fs.readFileSync(snapPath, 'utf8');
    assert.ok(
      !contentAfterDone.includes('G-HARDEN-064'),
      'Done goal targeted for sync must be removed from Active goals table'
    );
    // Peer goals and new goal still intact
    assert.ok(contentAfterDone.includes('G-HARDEN-065'));
    assert.ok(contentAfterDone.includes('G-HARDEN-069'));
    assert.ok(contentAfterDone.includes('G-NEW-001'));
    assert.ok(contentAfterDone.includes('## Cognitive Scorecard 14-Dimensional Architecture Schema'));
  });

  it('11. should perform atomic file writes with POSIX rename and fsync durability', () => {
    const targetFile = path.join(tmpDir, 'nested/dir/test-atomic.md');
    const initialContent = '# Initial Content\nLine 1\n';

    fileLockLib.atomicWriteFileSync(targetFile, initialContent, 'utf8');
    assert.ok(fs.existsSync(targetFile), 'File must be written even when parent dir does not exist');
    assert.equal(fs.readFileSync(targetFile, 'utf8'), initialContent);

    // Overwrite atomically
    const updatedContent = '# Updated Content\nLine 1\nLine 2\n';
    fileLockLib.atomicWriteFileSync(targetFile, updatedContent, 'utf8');
    assert.equal(fs.readFileSync(targetFile, 'utf8'), updatedContent);

    // Verify no temporary files remain in the target directory
    const dirFiles = fs.readdirSync(path.dirname(targetFile));
    const tmpFiles = dirFiles.filter((f) => f.includes('.tmp.'));
    assert.equal(tmpFiles.length, 0, 'No temporary files should linger after atomic write');
  });

  it('12. should enforce advisory lock mutual exclusion and recover from stale/dead locks', () => {
    const targetFile = path.join(tmpDir, 'shared-resource.md');
    fs.writeFileSync(targetFile, 'initial');
    const lockPath = fileLockLib.resolveLockPath(targetFile);

    // 1. Acquire lock and test mutual exclusion
    const lock1 = fileLockLib.acquireFileLock(targetFile);
    assert.ok(fs.existsSync(lockPath), 'Lockfile must be created');

    // Attempting to acquire again with 0 timeout should fail immediately
    assert.throws(
      () => fileLockLib.acquireFileLock(targetFile, { timeoutMs: 50, retryDelayMs: 10 }),
      /Failed to acquire lock/
    );

    // Release lock1
    fileLockLib.releaseFileLock(targetFile, lock1);
    assert.ok(!fs.existsSync(lockPath), 'Lockfile must be removed upon release');

    // 2. Stale lock recovery via dead PID (ESRCH)
    const deadLockPayload = {
      pid: 999999,
      createdAt: Date.now() - 5000,
      host: os.hostname(),
    };
    fs.writeFileSync(lockPath, JSON.stringify(deadLockPayload), 'utf8');

    // acquireFileLock must detect dead process and recover lock
    const lock2 = fileLockLib.acquireFileLock(targetFile, { timeoutMs: 500 });
    assert.ok(lock2, 'Lock must be acquired after clearing dead PID lockfile');
    fileLockLib.releaseFileLock(targetFile, lock2);

    // 3. Stale lock recovery via timeout TTL
    const expiredLockPayload = {
      pid: process.pid,
      createdAt: Date.now() - 100000,
      host: os.hostname(),
    };
    fs.writeFileSync(lockPath, JSON.stringify(expiredLockPayload), 'utf8');

    const lock3 = fileLockLib.acquireFileLock(targetFile, { staleTimeoutMs: 1000, timeoutMs: 500 });
    assert.ok(lock3, 'Lock must be acquired after clearing timed-out lockfile');
    fileLockLib.releaseFileLock(targetFile, lock3);
  });

  it('13. should handle 20 parallel concurrent tasks updating docs/00-project-snapshot.md with zero lost updates', async () => {
    const snapPath = path.join(tmpDir, 'docs/00-project-snapshot.md');
    fs.writeFileSync(
      snapPath,
      `# Project Snapshot

## Project metadata
- Project: Concurrency Test App

## Active goals

| Goal | Title | Status |
|---|---|---|
| *(none)* | — | — |

## Critical Invariants
- Zero Mocks
- POSIX ACID Safety
`,
      'utf8'
    );

    // Create 20 goal files on disk
    const goalCount = 20;
    const goalIds = [];
    for (let i = 1; i <= goalCount; i++) {
      const pad = String(i).padStart(3, '0');
      const id = `G-PAR-${pad}`;
      goalIds.push(id);
      fs.writeFileSync(
        path.join(tmpDir, `docs/07-backlog/goals/${id}.md`),
        `# ${id}: Parallel Task ${i}
**Status:** in_progress
**Kind:** feature

## Touch map
- \`src/worker_${i}.js\`
`,
        'utf8'
      );
    }

    // Run 20 concurrent snapshot updates simultaneously (simulating 20 parallel swarm/cli processes)
    await Promise.all(
      goalIds.map(async (targetGoalId) => {
        // Introduce small micro-jitter to maximize race probability
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
        markdownSyncLib.syncProjectSnapshot(tmpDir, { targetGoalId });
      })
    );

    // Read the final snapshot file
    const finalContent = fs.readFileSync(snapPath, 'utf8');

    // Verify that ALL 20 goals are present in the table!
    for (const id of goalIds) {
      assert.ok(
        finalContent.includes(id),
        `Snapshot MUST contain ${id} after concurrent execution (no lost updates!)`
      );
    }

    // Verify no duplicates occurred (each goal has exactly 1 row in the table)
    for (const id of goalIds) {
      const rowMatches = finalContent
        .split('\n')
        .filter((line) => line.includes(`[${id}]`) || line.includes(`[\`${id}\`]`));
      assert.equal(rowMatches.length, 1, `Goal ${id} row should appear exactly once in snapshot table`);
    }

    // Verify trailing sections remain intact
    assert.ok(
      finalContent.includes('## Critical Invariants\n- Zero Mocks\n- POSIX ACID Safety'),
      'Trailing sections must be preserved perfectly under concurrency'
    );
  });

  it('14. should handle 20 parallel concurrent tasks allocating goal IDs without duplicates or sequence gaps', async () => {
    const regFile = path.join(tmpDir, 'docs/07-backlog/goal-id-registry.yaml');
    fs.writeFileSync(
      regFile,
      `schema_version: "1"
epics:
  CONCUR:
    name: Concurrency Testing
    next_seq: 1
    reserved: []
`,
      'utf8'
    );

    const taskCount = 20;
    const allocationResults = await Promise.all(
      Array.from({ length: taskCount }).map(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 25));
        return goalIdLib.allocateIds(tmpDir, 'CONCUR', 1);
      })
    );

    // Extract all allocated IDs
    const allAllocatedIds = allocationResults.flatMap((r) => r.allocated.map((g) => g.id));
    assert.equal(allAllocatedIds.length, taskCount, 'All 20 requests must return an ID');

    // Verify all IDs are completely unique
    const uniqueIds = new Set(allAllocatedIds);
    assert.equal(uniqueIds.size, taskCount, 'Zero duplicate IDs allowed under parallel allocation');

    // Verify sequences span exactly G-CONCUR-001 through G-CONCUR-020
    const sequences = allAllocatedIds
      .map((id) => parseInt(id.replace('G-CONCUR-', ''), 10))
      .sort((a, b) => a - b);

    for (let i = 1; i <= taskCount; i++) {
      assert.equal(sequences[i - 1], i, `Sequence number ${i} must be present sequentially`);
    }

    // Verify registry file on disk has next_seq = 21
    const registryOnDisk = goalIdLib.loadRegistry(tmpDir);
    assert.equal(registryOnDisk.epics.CONCUR.next_seq, taskCount + 1);
  });

  it('15. should handle concurrent syncEpicQueue executions with clean output and zero corruption', async () => {
    const epic = 'BURST';
    const goalCount = 10;
    for (let i = 1; i <= goalCount; i++) {
      const pad = String(i).padStart(3, '0');
      const id = `G-${epic}-${pad}`;
      const status = i <= 5 ? 'done' : 'ready';
      const folder = status === 'done' ? 'docs/07-backlog/goals/_archived' : 'docs/07-backlog/goals';
      fs.writeFileSync(
        path.join(tmpDir, folder, `${id}.md`),
        `# ${id}: Burst Item ${i}\n**Status:** ${status}\n**Kind:** feature\n**Atomic outcome:** Task ${i}\n\n## Touch map\n- \`src/burst_${i}.js\`\n`
      );
    }

    // Run 10 parallel syncEpicQueue calls
    await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));
        markdownSyncLib.syncEpicQueue(tmpDir, epic);
      })
    );

    const queuePath = path.join(tmpDir, `docs/07-backlog/queues/${epic}.md`);
    assert.ok(fs.existsSync(queuePath), 'Queue file must exist');

    const content = fs.readFileSync(queuePath, 'utf8');
    for (let i = 1; i <= goalCount; i++) {
      const pad = String(i).padStart(3, '0');
      assert.ok(content.includes(`G-${epic}-${pad}`), `Queue must contain G-${epic}-${pad}`);
    }

    // Verify lock was released
    const lockPath = fileLockLib.resolveLockPath(queuePath);
    assert.ok(!fs.existsSync(lockPath), 'Lockfile must not linger after parallel execution');
  });

  it('16. should handle parallel concurrent syncEpicsIndex executions with zero row duplication and preserved metadata', async () => {
    const epicsPath = path.join(tmpDir, 'docs/07-backlog/epics.md');
    fs.writeFileSync(
      epicsPath,
      `# Epics

## Registered epics

| Epic | Name | Notes |
|------|------|-------|
| CORE | Framework Core | Critical engine baseline |
| ML | Decision Models | Offline calibration |

## Create an epic
`,
      'utf8'
    );

    // Register a new epic in registry
    const reg = goalIdLib.loadRegistry(tmpDir);
    reg.epics.STREAM = { name: 'Stream Processing', next_seq: 1, reserved: [] };
    goalIdLib.saveRegistry(tmpDir, reg);

    // Run 10 parallel syncEpicsIndex calls concurrently
    await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
        return markdownSyncLib.syncEpicsIndex(tmpDir);
      })
    );

    assert.ok(fs.existsSync(epicsPath), 'Epics index must exist');
    const content = fs.readFileSync(epicsPath, 'utf8');

    // Check CORE is first
    const lines = content.split('\n');
    const tableRows = lines.filter((l) => l.trim().startsWith('|') && !l.includes('---') && !l.includes('Notes'));
    assert.ok(tableRows.length >= 3, 'Must have at least CORE, ML, and STREAM');
    assert.ok(tableRows[0].includes('CORE'), 'CORE must be the first epic row');

    // Verify notes were preserved
    assert.ok(content.includes('Critical engine baseline'), 'Preserves CORE notes');
    assert.ok(content.includes('Offline calibration'), 'Preserves ML notes');

    // Verify STREAM was added
    assert.ok(content.includes('STREAM'), 'STREAM epic must be present');

    // Verify zero row duplicates
    for (const epicKey of ['CORE', 'ML', 'STREAM']) {
      const matchRows = tableRows.filter((r) => r.includes(`| ${epicKey} `));
      assert.equal(matchRows.length, 1, `Epic ${epicKey} must appear exactly once`);
    }

    const lockPath = fileLockLib.resolveLockPath(epicsPath);
    assert.ok(!fs.existsSync(lockPath), 'Lockfile must not linger');
  });

  it('17. should handle concurrent syncAllMarkdown executions updating epics, queues, snapshot, and dashboard simultaneously', async () => {
    // Setup initial project snapshot
    const snapPath = path.join(tmpDir, 'docs/00-project-snapshot.md');
    fs.writeFileSync(
      snapPath,
      `# Project Snapshot\n\n## Goals (dashboard)\n\n| Goal | Title | Kind | Status |\n|------|-------|------|--------|\n| *(none)* | — | — | — |\n`,
      'utf8'
    );

    // Setup initial goals dashboard
    const dashPath = path.join(tmpDir, 'docs/07-backlog/goals.md');
    fs.writeFileSync(
      dashPath,
      `# Goals & Backlog\n\n## Dashboard\n\n| Epic | Queue | Notes |\n|------|-------|------|\n| *(none)* | — | — |\n`,
      'utf8'
    );

    // Setup multiple epics and goals
    const epics = ['ALPHA', 'BETA'];
    for (const ep of epics) {
      for (let i = 1; i <= 3; i++) {
        const id = `G-${ep}-00${i}`;
        fs.writeFileSync(
          path.join(tmpDir, `docs/07-backlog/goals/${id}.md`),
          `# ${id}: Goal ${ep} ${i}\n**Status:** planned\n**Kind:** feature\n**Atomic outcome:** Outcome ${i}\n\n## Touch map\n- \`src/${ep.toLowerCase()}_${i}.js\`\n`
        );
      }
    }

    // Run 6 concurrent syncAllMarkdown calls
    const reports = await Promise.all(
      Array.from({ length: 6 }).map(async (_, idx) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 25));
        const targetEpic = epics[idx % epics.length];
        return markdownSyncLib.syncAllMarkdown(tmpDir, { epic: targetEpic });
      })
    );

    assert.equal(reports.length, 6, 'All sync reports must complete');

    // Verify epics index
    const epicsPath = path.join(tmpDir, 'docs/07-backlog/epics.md');
    assert.ok(fs.existsSync(epicsPath));
    const epicsContent = fs.readFileSync(epicsPath, 'utf8');
    assert.ok(epicsContent.includes('ALPHA'));
    assert.ok(epicsContent.includes('BETA'));

    // Verify queues
    for (const ep of epics) {
      const qPath = path.join(tmpDir, `docs/07-backlog/queues/${ep}.md`);
      assert.ok(fs.existsSync(qPath), `Queue for ${ep} must exist`);
      const qContent = fs.readFileSync(qPath, 'utf8');
      assert.ok(qContent.includes(`G-${ep}-001`));
      assert.ok(qContent.includes(`G-${ep}-002`));
      assert.ok(qContent.includes(`G-${ep}-003`));
    }

    // Verify snapshot
    assert.ok(fs.existsSync(snapPath));
    const snapContent = fs.readFileSync(snapPath, 'utf8');
    assert.ok(snapContent.includes('G-ALPHA-001'));
    assert.ok(snapContent.includes('G-BETA-001'));

    // Verify dashboard
    assert.ok(fs.existsSync(dashPath));
  });
});


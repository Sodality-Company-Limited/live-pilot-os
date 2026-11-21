import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const markdownSyncLib = require('../../scripts/goals/goal-markdown-sync.js');
const cliLib = require('../../cli.js');

describe('Soda OS Concurrent Goal Archival & Markdown Synchronization Engine', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-concurrent-archival-test-'));

    // Create standard Soda OS repository directory hierarchy
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/queues'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/02-product/acceptance'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'scripts/goals'), { recursive: true });

    // Seed scripts for CLI detection
    fs.copyFileSync(
      path.resolve('scripts/goals/goal-markdown-sync.js'),
      path.join(tmpDir, 'scripts/goals/goal-markdown-sync.js')
    );
    fs.copyFileSync(
      path.resolve('scripts/goals/goal-id.js'),
      path.join(tmpDir, 'scripts/goals/goal-id.js')
    );
    fs.copyFileSync(
      path.resolve('scripts/goals/file-lock.js'),
      path.join(tmpDir, 'scripts/goals/file-lock.js')
    );

    // Seed Registry
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/.goal-registry.json'),
      JSON.stringify(
        {
          version: 1,
          next_sequential_id: 100,
          epics: {
            PAY: { prefix: 'PAY', next_id: 30, active_goals: [] },
            CORE: { prefix: 'CORE', next_id: 20, active_goals: [] }
          }
        },
        null,
        2
      ),
      'utf8'
    );

    // Seed Project Snapshot
    fs.writeFileSync(
      path.join(tmpDir, 'docs/00-project-snapshot.md'),
      `# Project Snapshot\n\n## Active goals\n\n| Goal | Title | Status |\n|---|---|---|\n| [\`G-PAY-001\`](07-backlog/goals/G-PAY-001.md) | Payment Engine | \`ready\` |\n| [\`G-PAY-002\`](07-backlog/goals/G-PAY-002.md) | Refund Router | \`in_progress\` |\n| [\`G-CORE-001\`](07-backlog/goals/G-CORE-001.md) | Hexagonal Core | \`ready\` |\n\n## Next Milestones\n- Milestone Alpha\n`,
      'utf8'
    );

    // Seed Epic Queue
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'),
      `# PAY Epic Queue\n\n## Active\n\n| Goal | Title | Assigned | Status | File |\n|---|---|---|---|---|\n| G-PAY-001 | Payment Engine | \`aether_implementer\` | READY | [\`goals/G-PAY-001.md\`](../goals/G-PAY-001.md) |\n| G-PAY-002 | Refund Router | \`aether_implementer\` | IN_PROGRESS | [\`goals/G-PAY-002.md\`](../goals/G-PAY-002.md) |\n\n## Archived\n\n*(none yet)*\n`,
      'utf8'
    );

    // Seed Dashboard
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals.md'),
      `# Goals Dashboard\n\n## Epic overview\n\n| Epic | Scope | Total | Active | Archived | Target / Next |\n|---|---|---|---|---|---|\n| PAY | Payment Engine | 2 | 2 | 0 | In Flight |\n\n## Completed Goals\n\n*(none yet)*\n`,
      'utf8'
    );

    // Seed Goal Cards
    const g001Card = `---
id: G-PAY-001
title: Payment Engine
status: ready
kind: feature
owner: core-agent
touch_map:
  - src/payment.rs
---

# G-PAY-001: Payment Engine

**Status:** ready  
**Kind:** feature  
**Atomic outcome:** High-throughput minor-unit payment gateway  
**Epic:** PAY  

#### Plan

**Collaboration phase:** PLAN

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|:-:|:---|:---:|
| 1 | Write failing property test | pending |
| 2 | Implement integer minor-units | pending |

## Spec checklist
- [ ] Invariant A verified
- [ ] Invariant B verified

## Acceptance criteria
- [ ] 100% test coverage
- [ ] Zero floating point arithmetic
`;

    const g002Card = `---
id: G-PAY-002
title: Refund Router
status: in_progress
kind: feature
owner: refund-agent
touch_map:
  - src/refund.rs
---

# G-PAY-002: Refund Router

**Status:** in_progress  
**Kind:** feature  
**Atomic outcome:** Atomic idempotent refund processor  
**Epic:** PAY  

#### Plan

**Collaboration phase:** EXECUTE

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | **●** | ○ | ○ |

| # | Step | Status |
|:-:|:---|:---:|
| 1 | Idempotency lease setup | done |
| 2 | Ledger compensation saga | in_progress |
`;

    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-001.md'), g001Card, 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-002.md'), g002Card, 'utf8');
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  it('1. should close and archive goal card with complete lifecycle transitions', () => {
    const res = markdownSyncLib.closeGoal(tmpDir, 'G-PAY-001', {
      reason: '100% passed all 28-pillar invariants',
      closedDate: '2026-10-11',
    });

    assert.equal(res.goalId, 'G-PAY-001');
    assert.equal(res.status, 'done');
    assert.equal(res.closedDate, '2026-10-11');

    // Verify file moved to _archived
    const activePath = path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-001.md');
    const archivedPath = path.join(tmpDir, 'docs/07-backlog/goals/_archived/G-PAY-001.md');

    assert.equal(fs.existsSync(activePath), false, 'Active card should be unlinked');
    assert.equal(fs.existsSync(archivedPath), true, 'Archived card should exist');

    const archivedContent = fs.readFileSync(archivedPath, 'utf8');
    assert.match(archivedContent, /status:\s*done/i);
    assert.match(archivedContent, /\*\*Status:\*\*\s*done/i);
    assert.match(archivedContent, /\*\*Closed:\*\*\s*2026-10-11/i);
    assert.match(archivedContent, /\| ○ \| ○ \| ○ \| ○ \| \*\*●\*\* \|/); // SHIP phase
    assert.match(archivedContent, /\|\s*1\s*\|[^|]+\|\s*done\s*\|/); // Steps done
    assert.match(archivedContent, /- \[x\] Invariant A verified/); // Spec checked
    assert.match(archivedContent, /- \[x\] 100% test coverage/); // Acceptance checked
    assert.match(archivedContent, /100% passed all 28-pillar invariants/); // Outcome note

    // Verify Snapshot was updated: G-PAY-001 removed, peer G-PAY-002 and G-CORE-001 preserved!
    const snapContent = fs.readFileSync(path.join(tmpDir, 'docs/00-project-snapshot.md'), 'utf8');
    assert.equal(snapContent.includes('G-PAY-001'), false, 'Closed goal should not be in snapshot active goals');
    assert.equal(snapContent.includes('G-PAY-002'), true, 'Peer active goal G-PAY-002 must be preserved in snapshot');
    assert.equal(snapContent.includes('G-CORE-001'), true, 'Peer active goal G-CORE-001 must be preserved in snapshot');
    assert.match(snapContent, /## Next Milestones/, 'Trailing markdown sections must be preserved');

    // Verify Epic Queue: G-PAY-001 moved from Active to Archived
    const queueContent = fs.readFileSync(path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'), 'utf8');
    const activeSection = queueContent.split('## Archived')[0];
    const archivedSection = queueContent.split('## Archived')[1];

    assert.equal(activeSection.includes('G-PAY-001'), false, 'G-PAY-001 must not be in active queue table');
    assert.equal(activeSection.includes('G-PAY-002'), true, 'Peer active G-PAY-002 must remain in active queue table');
    assert.equal(archivedSection.includes('G-PAY-001'), true, 'G-PAY-001 must be present in archived queue table');
  });

  it('2. should handle 20 parallel concurrent goal closes without race conditions or torn writes', async () => {
    // Generate 20 distinct active goals in epic PAY
    const numGoals = 20;
    const goalIds = [];

    let initialSnapRows = '';
    let initialQueueRows = '';

    for (let i = 1; i <= numGoals; i++) {
      const id = `G-PAY-${String(100 + i).padStart(3, '0')}`;
      goalIds.push(id);

      const card = `---
id: ${id}
title: Concurrent Feature ${i}
status: ready
kind: feature
owner: agent-${i}
---

# ${id}: Concurrent Feature ${i}

**Status:** ready  
**Kind:** feature  
**Atomic outcome:** Atomic concurrent worker ${i}  
**Epic:** PAY  

#### Plan

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|:-:|:---|:---:|
| 1 | Step 1 | pending |
`;
      fs.writeFileSync(path.join(tmpDir, `docs/07-backlog/goals/${id}.md`), card, 'utf8');
      initialSnapRows += `| [\`${id}\`](07-backlog/goals/${id}.md) | Concurrent Feature ${i} | \`ready\` |\n`;
      initialQueueRows += `| ${id} | Concurrent Feature ${i} | \`agent-${i}\` | READY | [\`goals/${id}.md\`](../goals/${id}.md) |\n`;
    }

    // Append all 20 to snapshot and queue
    fs.writeFileSync(
      path.join(tmpDir, 'docs/00-project-snapshot.md'),
      `# Project Snapshot\n\n## Active goals\n\n| Goal | Title | Status |\n|---|---|---|\n${initialSnapRows}\n## Trailing Section\n`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'),
      `# PAY Epic Queue\n\n## Active\n\n| Goal | Title | Assigned | Status | File |\n|---|---|---|---|---|\n${initialQueueRows}\n## Archived\n\n*(none yet)*\n`,
      'utf8'
    );

    // Launch all 20 closures simultaneously in parallel promises
    const closePromises = goalIds.map((id, idx) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const res = markdownSyncLib.closeGoal(tmpDir, id, {
              reason: `Parallel verification pass ${idx}`,
              closedDate: '2026-10-11',
            });
            resolve(res);
          } catch (err) {
            reject(err);
          }
        }, Math.floor(Math.random() * 20));
      });
    });

    const results = await Promise.all(closePromises);
    assert.equal(results.length, 20);

    // Check all 20 card files moved cleanly
    for (const id of goalIds) {
      assert.equal(fs.existsSync(path.join(tmpDir, `docs/07-backlog/goals/${id}.md`)), false);
      assert.equal(fs.existsSync(path.join(tmpDir, `docs/07-backlog/goals/_archived/${id}.md`)), true);
    }

    // Verify Project Snapshot: all 20 active goals removed, placeholder *(none)* inserted, trailing preserved
    const finalSnap = fs.readFileSync(path.join(tmpDir, 'docs/00-project-snapshot.md'), 'utf8');
    assert.match(finalSnap, /\|\s*\*\(none\)\*\s*\|/);
    assert.match(finalSnap, /## Trailing Section/);

    for (const id of goalIds) {
      assert.equal(finalSnap.includes(id), false, `Snapshot should not contain ${id}`);
    }

    // Verify Epic Queue: PAY active table empty *(none)*, archived table contains ALL 20 goals exactly once
    const finalQueue = fs.readFileSync(path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'), 'utf8');
    const [finalActive, finalArchived] = finalQueue.split('## Archived');

    assert.match(finalActive, /\|\s*\*\(none\)\*\s*\|/);
    for (const id of goalIds) {
      assert.equal(finalActive.includes(id), false, `Active queue should not contain ${id}`);
      assert.equal(finalArchived.includes(id), true, `Archived queue must contain ${id}`);
      // Assert exactly one row in archived table
      const matchingRows = finalArchived.split('\n').filter((line) => line.includes(id));
      assert.equal(matchingRows.length, 1, `Goal ${id} should appear in exactly one row in archived table, found ${matchingRows.length}`);
    }
  });

  it('3. should preserve unexecuted peer active goals when an agent closes a target goal', () => {
    // Close G-PAY-001 while G-PAY-002 remains active
    const res = markdownSyncLib.closeGoal(tmpDir, 'G-PAY-001', {
      closedDate: '2026-10-11',
    });
    assert.equal(res.goalId, 'G-PAY-001');

    // Verify G-PAY-002 active card is untouched
    assert.equal(fs.existsSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-002.md')), true);

    const queueContent = fs.readFileSync(path.join(tmpDir, 'docs/07-backlog/queues/PAY.md'), 'utf8');
    const activeSection = queueContent.split('## Archived')[0];
    assert.equal(activeSection.includes('G-PAY-002'), true, 'Peer goal G-PAY-002 must remain in active queue');
    assert.equal(activeSection.includes('IN_PROGRESS'), true, 'Peer goal status IN_PROGRESS must be preserved');
  });

  it('4. should execute soda-os goal close and close-goal CLI commands cleanly', () => {
    // CLI close G-PAY-001
    const cliRes = cliLib.runGoalClose(['G-PAY-001', tmpDir, '--note', 'Closed via CLI', '--json'], { noExit: true });
    assert.equal(cliRes.code, 0);
    assert.equal(cliRes.payload.goalId, 'G-PAY-001');
    assert.equal(cliRes.payload.status, 'done');

    // Verify card is now in _archived
    assert.equal(fs.existsSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived/G-PAY-001.md')), true);
    assert.equal(fs.existsSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-001.md')), false);

    // CLI close-goal alias on G-PAY-002
    const cliAliasRes = cliLib.runGoalClose(['G-PAY-002', tmpDir, '--date', '2026-10-11'], { noExit: true });
    assert.equal(cliAliasRes.code, 0);
    assert.equal(cliAliasRes.payload.goalId, 'G-PAY-002');
    assert.equal(cliAliasRes.payload.status, 'done');

    assert.equal(fs.existsSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived/G-PAY-002.md')), true);
    assert.equal(fs.existsSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-002.md')), false);
  });
});

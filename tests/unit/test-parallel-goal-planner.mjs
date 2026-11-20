import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as parallelPlannerLib from '../../scripts/goals/parallel-goal-planner.js';
import * as markdownSyncLib from '../../scripts/goals/goal-markdown-sync.js';

describe('Soda OS Parallel Goal Planning & Batch Generation Unit Tests', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-parallel-test-'));
    // Setup standard directory structure
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/queues'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/02-product/acceptance'), { recursive: true });

    // Seed registry
    const initialRegistry = `# Soda Goal ID Registry SSOT
version: 1
epics:
  HARDEN:
    next_seq: 1
    description: Verification and hardening
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goal-id-registry.yaml'), initialRegistry, 'utf8');

    // Seed snapshot
    const initialSnapshot = `# Project Snapshot
## Active goals
| Goal | Title | Status | Owner |
|---|---|---|---|
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/00-project-snapshot.md'), initialSnapshot, 'utf8');

    // Seed goals.md
    const initialGoals = `# Goals Dashboard
## Dashboard
| Epic | Active | Ready | In progress | Review | Blocked | Next up |
|------|--------|-------|-------------|--------|---------|---------|
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals.md'), initialGoals, 'utf8');
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('1. should detect path collisions accurately (exact, directory prefix, wildcard)', () => {
    // Exact matches
    assert.equal(parallelPlannerLib.pathsCollide('src/kernel.rs', 'src/kernel.rs'), true);
    assert.equal(parallelPlannerLib.pathsCollide('src/kernel.rs', 'src/other.rs'), false);

    // Parent vs child directory collision
    assert.equal(parallelPlannerLib.pathsCollide('src/crates/kernel', 'src/crates/kernel/lib.rs'), true);
    assert.equal(parallelPlannerLib.pathsCollide('src/crates/kernel/lib.rs', 'src/crates/kernel'), true);
    assert.equal(parallelPlannerLib.pathsCollide('src/crates/kernel', 'src/crates/gate'), false);

    // Wildcard glob collision
    assert.equal(parallelPlannerLib.pathsCollide('src/crates/*', 'src/crates/aether-kernel/lib.rs'), true);
    assert.equal(parallelPlannerLib.pathsCollide('src/crates/aether-kernel/lib.rs', 'src/crates/*'), true);
    assert.equal(parallelPlannerLib.pathsCollide('docs/**', 'docs/02-product/brief.md'), true);
  });

  it('2. should check touch collisions between multiple goals', () => {
    const goalA = {
      id: 'G-HARDEN-001',
      touchMap: ['src/crates/aether-kernel/src/lib.rs', 'tests/unit/test_kernel.rs'],
    };
    const goalB = {
      id: 'G-HARDEN-002',
      touchMap: ['src/crates/aether-gate/src/lib.rs', 'tests/unit/test_gate.rs'],
    };
    const goalC = {
      id: 'G-HARDEN-003',
      touchMap: ['src/crates/aether-kernel/src/lib.rs', 'tests/unit/test_verifier.rs'],
    };

    const collisionAB = parallelPlannerLib.checkGoalsTouchCollision(goalA, goalB);
    assert.equal(collisionAB.colliding, false);
    assert.deepEqual(collisionAB.collisions, []);

    const collisionAC = parallelPlannerLib.checkGoalsTouchCollision(goalA, goalC);
    assert.equal(collisionAC.colliding, true);
    assert.equal(collisionAC.collisions.length, 1);
    assert.equal(collisionAC.collisions[0].pathA, 'src/crates/aether-kernel/src/lib.rs');
  });

  it('3. should validate DAG dependencies and detect cycles fail-closed', () => {
    // Valid DAG
    const validGoals = [
      { id: 'G-HARDEN-001', dependsOn: [] },
      { id: 'G-HARDEN-002', dependsOn: ['G-HARDEN-001'] },
      { id: 'G-HARDEN-003', dependsOn: ['G-HARDEN-001'] },
      { id: 'G-HARDEN-004', dependsOn: ['G-HARDEN-002', 'G-HARDEN-003'] },
    ];
    const validRes = parallelPlannerLib.validateDAG(validGoals);
    assert.equal(validRes.valid, true);
    assert.deepEqual(validRes.cycles, []);

    // Cyclic DAG
    const cyclicGoals = [
      { id: 'G-HARDEN-001', dependsOn: ['G-HARDEN-003'] },
      { id: 'G-HARDEN-002', dependsOn: ['G-HARDEN-001'] },
      { id: 'G-HARDEN-003', dependsOn: ['G-HARDEN-002'] },
    ];
    const cyclicRes = parallelPlannerLib.validateDAG(cyclicGoals);
    assert.equal(cyclicRes.valid, false);
    assert.ok(cyclicRes.cycles.length > 0);

    // computeExecutionWaves must throw on cycle
    assert.throws(() => {
      parallelPlannerLib.computeExecutionWaves(cyclicGoals);
    }, /Cannot compute parallel execution waves due to dependency cycles/);
  });

  it('4. should compute topological waves based on dependencies and blocks', () => {
    const goals = [
      { id: 'G-HARDEN-001', dependsOn: [], blocks: ['G-HARDEN-003'] },
      { id: 'G-HARDEN-002', dependsOn: [], blocks: [] },
      { id: 'G-HARDEN-003', dependsOn: ['G-HARDEN-001'], blocks: ['G-HARDEN-004'] },
      { id: 'G-HARDEN-004', dependsOn: ['G-HARDEN-003'], blocks: [] },
    ];

    const waves = parallelPlannerLib.computeExecutionWaves(goals);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0].goals.map(g => g.id).sort(), ['G-HARDEN-001', 'G-HARDEN-002']);
    assert.deepEqual(waves[1].goals.map(g => g.id), ['G-HARDEN-003']);
    assert.deepEqual(waves[2].goals.map(g => g.id), ['G-HARDEN-004']);
  });

  it('5. should partition colliding goals in the same wave into pairwise disjoint sub-waves', () => {
    // 3 goals in wave 1, but goal 1 and goal 2 collide on touch map
    const waveGoals = [
      { id: 'G-HARDEN-001', touchMap: ['src/shared.rs'] },
      { id: 'G-HARDEN-002', touchMap: ['src/shared.rs'] },
      { id: 'G-HARDEN-003', touchMap: ['src/independent.rs'] },
    ];

    const subWaves = parallelPlannerLib.partitionWaveIntoDisjointSubWaves(waveGoals);
    assert.equal(subWaves.length, 2, 'Colliding goals must be separated into 2 conflict-free sub-waves');

    // Sub-wave 1 should contain G-HARDEN-001 and G-HARDEN-003
    assert.equal(subWaves[0].goals.some(g => g.id === 'G-HARDEN-001'), true);
    assert.equal(subWaves[0].goals.some(g => g.id === 'G-HARDEN-003'), true);

    // Sub-wave 2 should contain G-HARDEN-002
    assert.equal(subWaves[1].goals.length, 1);
    assert.equal(subWaves[1].goals[0].id, 'G-HARDEN-002');
  });

  it('6. should plan parallel execution and allocate worktrees, branches, and cache parameters', () => {
    const goals = [
      { id: 'G-HARDEN-001', assigned: 'aether_implementer', touchMap: ['src/kernel.rs'], dependsOn: [] },
      { id: 'G-HARDEN-002', assigned: 'aether_tester', touchMap: ['tests/gate.rs'], dependsOn: [] },
      { id: 'G-HARDEN-003', assigned: 'aether_implementer', touchMap: ['src/kernel.rs'], dependsOn: ['G-HARDEN-001'] },
    ];

    const plan = parallelPlannerLib.planParallelExecution(tmpDir, goals);
    assert.equal(plan.totalGoals, 3);
    assert.ok(plan.waves.length >= 2);

    const firstWave = plan.waves[0];
    assert.equal(firstWave.wave, 1);
    const wave1Goals = firstWave.subWaves[0].goals;
    assert.equal(wave1Goals.length, 2);

    // Check worktree allocation
    assert.equal(wave1Goals[0].orchestration.branch, 'feature/G-HARDEN-001');
    assert.ok(wave1Goals[0].orchestration.worktreePath.includes('G-HARDEN-001'));
    assert.ok(wave1Goals[0].orchestration.buildCache.includes('G-HARDEN-001'));
  });

  it('7. should render conforming goal card markdown with all mandatory sections', () => {
    const rendered = parallelPlannerLib.renderGoalCardMarkdown({
      id: 'G-HARDEN-001',
      title: 'Formal LTC ODE SIMD Verification',
      epic: 'HARDEN',
      seq: 1,
      status: 'ready',
      kind: 'feature',
      assigned: 'aether_implementer',
      dependsOn: [],
      blocks: ['G-HARDEN-002'],
      atomicOutcome: 'Fully verified RK4 SIMD solver with sub-50ms integration SLA.',
      touchMap: ['src/crates/aether-kernel/src/simd_ode.rs', 'tests/unit/test_simd_ode.rs'],
    });

    assert.ok(rendered.includes('# G-HARDEN-001: Formal LTC ODE SIMD Verification'));
    assert.ok(rendered.includes('**Status:** ready'));
    assert.ok(rendered.includes('## Intent'));
    assert.ok(rendered.includes('## Acceptance criteria'));
    assert.ok(rendered.includes('## Touch map'));
    assert.ok(rendered.includes('- `src/crates/aether-kernel/src/simd_ode.rs`'));
    assert.ok(rendered.includes('## Test plan'));
    assert.ok(rendered.includes('## Change delta'));
    assert.ok(rendered.includes('## Software & Architecture Design'));
    assert.ok(rendered.includes('## Atomicity & Zero-Mock Contract'));
  });

  it('8. should atomically create goals, update registry, and synchronize all markdown files', () => {
    // Create first goal via parallelPlannerLib.createGoal
    const createdGoal1 = parallelPlannerLib.createGoal(tmpDir, {
      epic: 'HARDEN',
      title: 'Memory Hierarchy Verification',
      status: 'ready',
      kind: 'feature',
      assigned: 'aether_implementer',
      touchMap: ['src/memory.rs'],
      dependsOn: [],
      atomicOutcome: 'Memory trie verification completed.',
    });

    assert.equal(createdGoal1.id, 'G-HARDEN-001');
    assert.equal(createdGoal1.seq, 1);
    assert.ok(fs.existsSync(createdGoal1.filePath));

    // Verify queue was updated
    const queuePath = path.join(tmpDir, 'docs/07-backlog/queues/HARDEN.md');
    assert.ok(fs.existsSync(queuePath), 'Queue file must exist');
    const queueContent = fs.readFileSync(queuePath, 'utf8');
    assert.ok(queueContent.includes('G-HARDEN-001'), 'Queue must contain G-HARDEN-001');

    // Verify snapshot was updated
    const snapshotContent = fs.readFileSync(path.join(tmpDir, 'docs/00-project-snapshot.md'), 'utf8');
    assert.ok(snapshotContent.includes('G-HARDEN-001'), 'Snapshot must contain G-HARDEN-001');

    // Verify acceptance contract was created
    const acceptancePath = path.join(tmpDir, 'docs/02-product/acceptance/G-HARDEN-001.md');
    assert.ok(fs.existsSync(acceptancePath), 'Acceptance contract must exist');

    // Create batch of parallel goals
    const batch = parallelPlannerLib.generateParallelGoalBatch(tmpDir, {
      epic: 'HARDEN',
      goals: [
        {
          title: 'WASM Sandboxing Verification',
          status: 'ready',
          assigned: 'aether_sandboxed_executor',
          touchMap: ['src/wasm.rs'],
          dependsOn: ['G-HARDEN-001'],
          atomicOutcome: 'Wasmtime gas metering verified.',
        },
        {
          title: 'NATS Triple-ID Verification',
          status: 'ready',
          assigned: 'aether_swarm_consensus_eng',
          touchMap: ['src/nats.rs'],
          dependsOn: ['G-HARDEN-001'],
          atomicOutcome: 'NATS subject routing verified.',
        },
      ],
    });

    assert.equal(batch.createdGoals.length, 2);
    assert.equal(batch.createdGoals[0].id, 'G-HARDEN-002');
    assert.equal(batch.createdGoals[1].id, 'G-HARDEN-003');

    // Verify parallel plan
    assert.ok(batch.plan.waves.length >= 1);

    // Verify all 3 goals are present in queue
    const updatedQueue = fs.readFileSync(queuePath, 'utf8');
    assert.ok(updatedQueue.includes('G-HARDEN-001'));
    assert.ok(updatedQueue.includes('G-HARDEN-002'));
    assert.ok(updatedQueue.includes('G-HARDEN-003'));

    // Verify registry next_seq is 4
    const registryContent = fs.readFileSync(path.join(tmpDir, 'docs/07-backlog/goal-id-registry.yaml'), 'utf8');
    assert.ok(registryContent.includes('next_seq: 4'));
  });

  it('9. should identify shared tracking files accurately via isSharedTrackingFile', () => {
    // Shared tracking files must return true
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/00-project-snapshot.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('./docs/00-project-snapshot.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/07-backlog/goals.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/07-backlog/goal-id-registry.yaml'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/07-backlog/goal-id-registry.yml'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/07-backlog/queues/HARDEN.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('CLARIFICATION.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('CLARIFICATION-G-HARDEN-001.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/06_raw/index.md'), true);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/06_raw/log.md'), true);

    // Code and independent files must return false
    assert.equal(parallelPlannerLib.isSharedTrackingFile('src/kernel.rs'), false);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/02-product/project-brief.md'), false);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('docs/03-architecture/overview.md'), false);
    assert.equal(parallelPlannerLib.isSharedTrackingFile('tests/unit/test_kernel.rs'), false);
    assert.equal(parallelPlannerLib.isSharedTrackingFile(null), false);
    assert.equal(parallelPlannerLib.isSharedTrackingFile(''), false);
  });

  it('10. should sanitize touch maps by stripping shared tracking files via sanitizeTouchMap', () => {
    const rawTouchMap = [
      'src/crates/aether-kernel/src/lib.rs',
      'docs/00-project-snapshot.md',
      'docs/07-backlog/goals.md',
      'tests/unit/test_kernel.rs',
      'CLARIFICATION.md',
      'docs/06_raw/log.md',
      'CLARIFICATION-G-001.md',
    ];

    const sanitized = parallelPlannerLib.sanitizeTouchMap(rawTouchMap);
    assert.deepEqual(sanitized, [
      'src/crates/aether-kernel/src/lib.rs',
      'tests/unit/test_kernel.rs',
    ]);
  });

  it('11. should prevent false collision alarms when multiple goals reference shared tracking files', () => {
    const goalA = {
      id: 'G-HARDEN-010',
      touchMap: [
        'src/feature_a.rs',
        'docs/00-project-snapshot.md',
        'docs/07-backlog/goals.md',
      ],
    };
    const goalB = {
      id: 'G-HARDEN-011',
      touchMap: [
        'src/feature_b.rs',
        'docs/00-project-snapshot.md',
        'docs/07-backlog/goals.md',
      ],
    };

    // checkGoalsTouchCollision must sanitize touch maps before testing collision
    const collision = parallelPlannerLib.checkGoalsTouchCollision(goalA, goalB);
    assert.equal(collision.colliding, false, 'Goals with distinct code files must not collide due to tracking files');
    assert.deepEqual(collision.collisions, []);
  });

  it('12. should sanitize touch map in renderGoalCardMarkdown and default to src/** if empty', () => {
    // Goal with only shared tracking files in touch map
    const cardOnlyTracking = parallelPlannerLib.renderGoalCardMarkdown({
      id: 'G-HARDEN-020',
      title: 'Tracking Shield Test',
      epic: 'HARDEN',
      seq: 20,
      status: 'ready',
      touchMap: ['docs/00-project-snapshot.md', 'CLARIFICATION.md'],
    });

    // Touch map section must not include the shared tracking files, and should fallback to src/**
    assert.ok(!cardOnlyTracking.includes('- `docs/00-project-snapshot.md`'), 'Card must not list snapshot');
    assert.ok(!cardOnlyTracking.includes('- `CLARIFICATION.md`'), 'Card must not list CLARIFICATION.md');
    assert.ok(cardOnlyTracking.includes('- `src/**`'), 'Card must fallback to src/** when sanitized touch map is empty');

    // Goal with real code and tracking files
    const cardMixed = parallelPlannerLib.renderGoalCardMarkdown({
      id: 'G-HARDEN-021',
      title: 'Mixed Shield Test',
      epic: 'HARDEN',
      seq: 21,
      status: 'ready',
      touchMap: ['src/services/auth.rs', 'docs/07-backlog/goals.md'],
    });

    assert.ok(cardMixed.includes('- `src/services/auth.rs`'), 'Card must list real code files');
    assert.ok(!cardMixed.includes('- `docs/07-backlog/goals.md`'), 'Card must strip tracking files');
  });
});

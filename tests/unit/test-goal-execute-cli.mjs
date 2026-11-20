import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootCli = fs.existsSync(new URL('../../../cli.js', import.meta.url).pathname)
  ? require('../../../cli.js')
  : require('../../cli.js');
const templateCli = fs.existsSync(new URL('../../template/cli.js', import.meta.url).pathname)
  ? require('../../template/cli.js')
  : require('../../cli.js');

describe('Soda OS Dual Execution Modes (Normal Single-Goal vs Parallel Swarm) Test Suite', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-goal-execute-test-'));

    // Create standard Soda OS repository structure
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/02-product/acceptance'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.bundle/G-PAY-001'), { recursive: true });

    // Seed project-snapshot
    fs.writeFileSync(
      path.join(tmpDir, 'docs/00-project-snapshot.md'),
      '# Project Snapshot\n## Active goals\n| Goal | Title | Status |\n|---|---|---|\n',
      'utf8'
    );

    // Seed goals.md
    fs.writeFileSync(
      path.join(tmpDir, 'docs/07-backlog/goals.md'),
      '# Goals Dashboard\n| Goal | Title | Status |\n|---|---|---|\n| G-PAY-001 | Payment Gateway | ready |\n| G-PAY-002 | Token Vault | planned |\n',
      'utf8'
    );

    // Seed goal cards
    const g001Content = `---
id: G-PAY-001
title: Payment Gateway Integration
status: ready
owner: core-agent
dependencies: []
touch_map:
  - src/payment/gateway.rs
  - src/payment/router.rs
---

# G-PAY-001: Payment Gateway Integration

## Acceptance Criteria
- [ ] Implement minor-unit integer arithmetic
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-001.md'), g001Content, 'utf8');

    // Seed acceptance contract
    fs.writeFileSync(
      path.join(tmpDir, 'docs/02-product/acceptance/G-PAY-001.md'),
      '# Acceptance Contract G-PAY-001\n',
      'utf8'
    );

    // Seed goal G-PAY-002 with dependency on G-PAY-001
    const g002Content = `---
id: G-PAY-002
title: Token Vault Service
status: planned
owner: sec-agent
dependencies:
  - G-PAY-001
touch_map:
  - src/vault/token.rs
  - CLARIFICATION.md
---

# G-PAY-002: Token Vault Service
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals/G-PAY-002.md'), g002Content, 'utf8');

    // Seed archived goal G-ARCH-001
    const gArchContent = `---
id: G-ARCH-001
title: System Bootstrap
status: done
owner: init-agent
dependencies: []
touch_map:
  - Cargo.toml
---

# G-ARCH-001: System Bootstrap
`;
    fs.writeFileSync(path.join(tmpDir, 'docs/07-backlog/goals/_archived/G-ARCH-001.md'), gArchContent, 'utf8');
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('1. Module Exports & 100% Byte Parity Invariants', () => {
    it('1.1 should export runGoal and runGoalExecute from cli.js', () => {
      assert.equal(typeof rootCli.runGoal, 'function', 'cli.js must export runGoal function');
      assert.equal(typeof rootCli.runGoalExecute, 'function', 'cli.js must export runGoalExecute function');
      assert.equal(typeof templateCli.runGoal, 'function', 'template/cli.js must export runGoal function');
      assert.equal(typeof templateCli.runGoalExecute, 'function', 'template/cli.js must export runGoalExecute function');
    });

    it('1.2 should have exact 100% byte parity between cli.js and template/cli.js', () => {
      const rootCliContent = fs.readFileSync(path.join(process.cwd(), 'cli.js'), 'utf8');
      const tmplCliContent = fs.readFileSync(path.join(process.cwd(), 'template/cli.js'), 'utf8');
      assert.equal(rootCliContent, tmplCliContent, 'cli.js and template/cli.js must be byte-for-byte identical');
    });

    it('1.3 should have exact 100% byte parity for execute-goal.md template', () => {
      const rootTmpl = fs.readFileSync(path.join(process.cwd(), '.agents/templates/execute-goal.md'), 'utf8');
      const frameworkTmpl = fs.readFileSync(path.join(process.cwd(), 'template/.agents/templates/execute-goal.md'), 'utf8');
      assert.equal(rootTmpl, frameworkTmpl, 'execute-goal.md templates must be byte-for-byte identical');
    });

    it('1.4 should have exact 100% byte parity for soda-goal-workflow skill', () => {
      const rootSkill = fs.readFileSync(path.join(process.cwd(), '.agents/skills/soda-goal-workflow/SKILL.md'), 'utf8');
      const tmplSkill = fs.readFileSync(path.join(process.cwd(), 'template/.agents/skills/soda-goal-workflow/SKILL.md'), 'utf8');
      assert.equal(rootSkill, tmplSkill, 'soda-goal-workflow SKILL.md files must be byte-for-byte identical');
    });
  });

  describe('2. CLI Argument Parsing & Error Handling', () => {
    it('2.1 should display help and exit cleanly with code 0 on --help', () => {
      let logged = '';
      const origLog = console.log;
      console.log = (...args) => { logged += args.join(' ') + '\n'; };
      try {
        const res = rootCli.runGoalExecute(['--help'], { noExit: true });
        assert.equal(res.code, 0, 'Exit code must be 0 for --help');
        assert.ok(logged.includes('soda-os goal execute'), 'Help text must describe soda-os goal execute');
        assert.ok(logged.includes('--mode <normal|swarm>'), 'Help text must describe mode options');
        assert.ok(logged.includes('Normal single-goal execution (default)'), 'Help text must highlight normal mode default');
      } finally {
        console.log = origLog;
      }
    });

    it('2.2 should return non-zero error when goal ID is omitted', () => {
      let errorMsg = '';
      const origError = console.error;
      console.error = (...args) => { errorMsg += args.join(' ') + '\n'; };
      try {
        const res = rootCli.runGoalExecute([], { noExit: true });
        assert.equal(res.code, 1, 'Exit code must be 1 when goal ID is missing');
        assert.ok(errorMsg.includes('Goal ID is required'), 'Error message must specify goal ID is required');
      } finally {
        console.error = origError;
      }
    });

    it('2.3 should return non-zero error when invalid mode is supplied', () => {
      let errorMsg = '';
      const origError = console.error;
      console.error = (...args) => { errorMsg += args.join(' ') + '\n'; };
      try {
        const res = rootCli.runGoalExecute(['G-PAY-001', '--mode', 'invalid_mode'], { noExit: true });
        assert.equal(res.code, 1, 'Exit code must be 1 for invalid mode');
        assert.ok(errorMsg.includes("Invalid mode: invalid_mode. Must be 'normal' or 'swarm'."), 'Error message must reject invalid mode');
      } finally {
        console.error = origError;
      }
    });

    it('2.4 should return non-zero error when goal card is not found', () => {
      let errorMsg = '';
      const origError = console.error;
      console.error = (...args) => { errorMsg += args.join(' ') + '\n'; };
      try {
        const res = rootCli.runGoalExecute(['G-NONEXISTENT', tmpDir], { noExit: true });
        assert.equal(res.code, 1, 'Exit code must be 1 for nonexistent goal');
        assert.ok(errorMsg.includes('Could not find goal card for G-NONEXISTENT'), 'Error message must note missing goal card');
      } finally {
        console.error = origError;
      }
    });
  });

  describe('3. Mode A: Normal Single-Goal Execution (Standard / Default)', () => {
    it('3.1 should default to normal mode with PrimaryWorkspace and zero worktree overhead', () => {
      const res = rootCli.runGoalExecute(['G-PAY-001', tmpDir, '--json', '--dry-run'], { noExit: true });
      assert.equal(res.code, 0, 'Execution must succeed with exit code 0');
      assert.ok(res.output, 'Must provide structured output payload');

      const { mode, config, preflight } = res.output;
      assert.equal(mode, 'normal', 'Default mode must be normal');
      assert.equal(config.executionMode, 'normal');
      assert.equal(config.workspaceType, 'PrimaryWorkspace', 'Must execute directly in PrimaryWorkspace');
      assert.equal(config.targetWorkspace, tmpDir, 'Target workspace must be repository root');
      assert.equal(config.worktreeOverhead, false, 'Must have zero worktree overhead');
      assert.equal(config.branch, 'feature/G-PAY-001', 'Branch must be feature/G-PAY-001');
      assert.ok(config.branchCommand.includes('checkout -b feature/G-PAY-001'), 'Must include branch creation command');
      assert.equal(config.sharedWorktreeProtection, 'Direct feature branch on primary workspace. No worktree collision risk.');

      // Preflight checks
      assert.equal(preflight.status, 'ready');
      assert.equal(preflight.hasAcceptanceContract, true);
      assert.equal(preflight.hasContextBundle, true);
      assert.equal(preflight.sharedTrackingFileCollisions.length, 0);
      assert.equal(preflight.dependenciesAudit.allSatisfied, true);
    });

    it('3.2 should accept explicit --mode normal flag', () => {
      const res = rootCli.runGoalExecute(['G-PAY-001', tmpDir, '--mode', 'normal', '--json'], { noExit: true });
      assert.equal(res.code, 0);
      assert.equal(res.output.mode, 'normal');
      assert.equal(res.output.config.workspaceType, 'PrimaryWorkspace');
      assert.equal(res.output.config.worktreeOverhead, false);
    });

    it('3.3 should parse --step <N> flag in normal execution', () => {
      const res = rootCli.runGoalExecute(['G-PAY-001', tmpDir, '--step', '4', '--json'], { noExit: true });
      assert.equal(res.code, 0);
      assert.equal(res.output.config.activeStep, 4);
    });
  });

  describe('4. Mode B: Parallel Swarm Wave Execution (Advanced / Worktree)', () => {
    it('4.1 should configure IsolatedWorktree when --mode swarm is specified', () => {
      const res = rootCli.runGoalExecute(['G-PAY-001', tmpDir, '--mode', 'swarm', '--json', '--dry-run'], { noExit: true });
      assert.equal(res.code, 0);
      assert.ok(res.output);

      const { mode, config } = res.output;
      assert.equal(mode, 'swarm');
      assert.equal(config.executionMode, 'swarm');
      assert.equal(config.workspaceType, 'IsolatedWorktree');
      assert.equal(config.worktreeOverhead, true, 'Swarm mode incurs worktree overhead');
      assert.ok(config.targetWorkspace.includes('worktrees'), 'Swarm mode target workspace must be in worktrees directory');
      assert.ok(config.targetWorkspace.endsWith('g-pay-001-core-agent'), 'Worktree path must incorporate goal id and owner');
      assert.ok(config.worktreeCommand.includes('git worktree add'), 'Must provide worktree creation command');
    });
  });

  describe('5. Preflight Audits & Touch-Map Shield Verification', () => {
    it('5.1 should detect and flag shared tracking file collisions in touch map', () => {
      const res = rootCli.runGoalExecute(['G-PAY-002', tmpDir, '--json'], { noExit: true });
      assert.equal(res.code, 0);
      const { preflight } = res.output;

      assert.ok(
        preflight.sharedTrackingFileCollisions.includes('CLARIFICATION.md'),
        'Must detect CLARIFICATION.md in touch_map'
      );
      assert.ok(
        preflight.sharedTrackingFileCollisions.length > 0,
        'Should report touch map shared tracking file collisions'
      );
    });

    it('5.2 should audit dependencies status accurately', () => {
      const res = rootCli.runGoalExecute(['G-PAY-002', tmpDir, '--json'], { noExit: true });
      assert.equal(res.code, 0);
      const { dependenciesAudit } = res.output.preflight;

      assert.equal(dependenciesAudit.declared.length, 1);
      assert.equal(dependenciesAudit.declared[0], 'G-PAY-001');
      assert.equal(dependenciesAudit.allSatisfied, false, 'G-PAY-001 is ready, not done, so G-PAY-002 dependencies are not satisfied');
      assert.equal(dependenciesAudit.unsatisfied.length, 1);
      assert.equal(dependenciesAudit.unsatisfied[0].id, 'G-PAY-001');
      assert.equal(dependenciesAudit.unsatisfied[0].status, 'ready');
    });

    it('5.3 should resolve archived goals when referenced', () => {
      const res = rootCli.runGoalExecute(['G-ARCH-001', tmpDir, '--json'], { noExit: true });
      assert.equal(res.code, 0);
      assert.equal(res.output.preflight.status, 'done');
      assert.ok(res.output.preflight.goalFile.includes('_archived'), 'Must find goal in _archived directory');
    });
  });

  describe('6. Top-Level Command Dispatch & CLI Aliases', () => {
    it('6.1 should execute via runGoal with execute subcommand', () => {
      const res = rootCli.runGoal(['execute', 'G-PAY-001', tmpDir, '--json'], { noExit: true });
      assert.equal(res.code, 0);
      assert.equal(res.output.goalId, 'G-PAY-001');
      assert.equal(res.output.mode, 'normal');
    });

    it('6.2 should support template/cli.js identical execution', () => {
      const res = templateCli.runGoalExecute(['G-PAY-001', tmpDir, '--json'], { noExit: true });
      assert.equal(res.code, 0);
      assert.equal(res.output.goalId, 'G-PAY-001');
      assert.equal(res.output.mode, 'normal');
      assert.equal(res.output.config.workspaceType, 'PrimaryWorkspace');
    });
  });
});

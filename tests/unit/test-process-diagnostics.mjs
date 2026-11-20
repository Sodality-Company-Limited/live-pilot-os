/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROCESS DIAGNOSTICS & ZERO-PSTACK UNIT TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Tests for scripts/lib/process-diagnostics.mjs and harness.
 * Invariant: 100% Zero Mocks, Bitwise Template Parity, and Complete Coverage.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  SUPPORTED_RUNTIMES,
  DIAGNOSTIC_ANTI_PATTERNS,
  isProcessAlive,
  collectNodeDiagnosticReport,
  inspectSystemProcess,
  scanActiveFileLocks,
  getRuntimeRecommendations,
  auditCodebaseForAntiPatterns,
  compileDiagnosticReport,
  formatDiagnosticText,
} from '../../scripts/lib/process-diagnostics.mjs';

const REPO_ROOT = process.cwd();

describe('Soda OS Process & Runtime Diagnostics (Zero-Pstack Protocol)', () => {
  it('Test 01: Exports runtime metadata and anti-pattern definitions', () => {
    assert.ok(Array.isArray(SUPPORTED_RUNTIMES));
    assert.ok(SUPPORTED_RUNTIMES.includes('node'));
    assert.ok(SUPPORTED_RUNTIMES.includes('rust_async'));
    assert.ok(SUPPORTED_RUNTIMES.includes('python'));
    assert.ok(SUPPORTED_RUNTIMES.includes('postgres'));

    assert.ok(DIAGNOSTIC_ANTI_PATTERNS.pstack);
    assert.strictEqual(DIAGNOSTIC_ANTI_PATTERNS.pstack.id, 'ANTI_PATTERN_PSTACK');
    assert.ok(DIAGNOSTIC_ANTI_PATTERNS.pstack.whyProhibited.includes('pstack'));
    assert.ok(DIAGNOSTIC_ANTI_PATTERNS.ptrace_attach);
  });

  it('Test 02: isProcessAlive detects current process and rejects invalid PIDs', () => {
    assert.strictEqual(isProcessAlive(process.pid), true);
    assert.strictEqual(isProcessAlive(null), false);
    assert.strictEqual(isProcessAlive(-1), false);
    assert.strictEqual(isProcessAlive(0), false);
    assert.strictEqual(isProcessAlive(99999999), false);
  });

  it('Test 03: collectNodeDiagnosticReport gathers authentic in-process Node.js telemetry', () => {
    const report = collectNodeDiagnosticReport();
    assert.ok(report);
    assert.strictEqual(report.pid, process.pid);
    assert.strictEqual(report.nodeVersion, process.version);
    assert.ok(report.memory.rssBytes > 0);
    assert.ok(report.memory.heapTotalBytes > 0);
    assert.ok(report.uptimeSeconds >= 0);
    assert.ok(typeof report.environmentVariablesCount === 'number');
  });

  it('Test 04: inspectSystemProcess inspects current process non-invasively', () => {
    const proc = inspectSystemProcess(process.pid);
    assert.strictEqual(proc.alive, true);
    assert.strictEqual(proc.pid, process.pid);
    assert.ok(proc.commandLine.length > 0);

    const nonExistent = inspectSystemProcess(99999999);
    assert.strictEqual(nonExistent.alive, false);
  });

  it('Test 05: scanActiveFileLocks detects active and stale file locks', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-lock-test-'));
    try {
      // 1. Create an active lock with current PID
      const activeLockPath = path.join(tempDir, 'active_job.lock');
      fs.writeFileSync(
        activeLockPath,
        JSON.stringify({
          pid: process.pid,
          createdAt: Date.now(),
          host: os.hostname(),
          token: 'token-active-123',
        }),
        'utf8'
      );

      // 2. Create a stale lock with dead PID and old timestamp
      const staleLockPath = path.join(tempDir, 'stale_job.lock');
      fs.writeFileSync(
        staleLockPath,
        JSON.stringify({
          pid: 99999999,
          createdAt: Date.now() - 100000,
          host: os.hostname(),
          token: 'token-stale-456',
        }),
        'utf8'
      );

      const locks = scanActiveFileLocks(tempDir, { staleThresholdMs: 30000 });
      assert.strictEqual(locks.length, 2);

      const activeFound = locks.find((l) => l.lockPath === activeLockPath);
      assert.ok(activeFound);
      assert.strictEqual(activeFound.alive, true);
      assert.strictEqual(activeFound.isStale, false);

      const staleFound = locks.find((l) => l.lockPath === staleLockPath);
      assert.ok(staleFound);
      assert.strictEqual(staleFound.alive, false);
      assert.strictEqual(staleFound.isStale, true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('Test 06: getRuntimeRecommendations provides tailored, non-invasive guidance across all runtimes', () => {
    const nodeRec = getRuntimeRecommendations('node');
    assert.strictEqual(nodeRec.runtime, 'node');
    assert.ok(nodeRec.diagnosticCommands.some((c) => c.includes('kill -USR2')));
    assert.ok(nodeRec.preferredTool.includes('Diagnostic Report'));

    const rustRec = getRuntimeRecommendations('rust_async');
    assert.strictEqual(rustRec.runtime, 'rust_async');
    assert.ok(rustRec.preferredTool.includes('tokio-console'));
    assert.ok(rustRec.antiPatternRejected.includes('pstack'));

    const pyRec = getRuntimeRecommendations('python');
    assert.strictEqual(pyRec.runtime, 'python');
    assert.ok(pyRec.preferredTool.includes('py-spy'));

    const pgRec = getRuntimeRecommendations('postgres');
    assert.strictEqual(pgRec.runtime, 'postgres');
    assert.ok(pgRec.preferredTool.includes('pg_stat_activity'));
  });

  it('Test 07: auditCodebaseForAntiPatterns asserts zero pstack or raw ptrace references exist', () => {
    const audit = auditCodebaseForAntiPatterns(REPO_ROOT);
    assert.ok(audit.passed, `Found ${audit.totalViolations} anti-pattern violations: ${JSON.stringify(audit.violations)}`);
    assert.strictEqual(audit.totalViolations, 0);
  });

  it('Test 08: compileDiagnosticReport and formatDiagnosticText output complete reports', () => {
    const report = compileDiagnosticReport({
      runtime: 'rust_async',
      projectRoot: REPO_ROOT,
      auditAntiPatterns: true,
    });
    assert.strictEqual(report.protocol, 'SODA_OS_ZERO_PSTACK_DIAGNOSTICS');
    assert.ok(report.node);
    assert.strictEqual(report.recommendations.runtime, 'rust_async');
    assert.ok(report.antiPatternAudit.passed);

    const text = formatDiagnosticText(report);
    assert.ok(text.includes('SODA OS RUNTIME & PROCESS DIAGNOSTIC REPORT (ZERO-PSTACK)'));
    assert.ok(text.includes('Node.js Runtime State:'));
    assert.ok(text.includes('Active File Locks'));
    assert.ok(text.includes('Runtime Guidance for [rust_async]'));
  });

  it('Test 09: Template mirror files maintain 100% bitwise parity', () => {
    const filePairs = [
      ['scripts/lib/process-diagnostics.mjs', 'template/scripts/lib/process-diagnostics.mjs'],
      ['scripts/harness/process-diagnostics-harness.mjs', 'template/scripts/harness/process-diagnostics-harness.mjs'],
      ['cli.js', 'template/cli.js'],
      ['docs/06-workflows/verification-operator-runbook.md', 'template/docs/06-workflows/verification-operator-runbook.md'],
    ];

    for (const [rootRel, templateRel] of filePairs) {
      const rootPath = path.join(REPO_ROOT, rootRel);
      const templatePath = path.join(REPO_ROOT, templateRel);

      assert.strictEqual(fs.existsSync(rootPath), true, `Root file missing: ${rootRel}`);
      assert.strictEqual(fs.existsSync(templatePath), true, `Template file missing: ${templateRel}`);

      const rootContent = fs.readFileSync(rootPath, 'utf8');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      assert.strictEqual(rootContent, templateContent, `Bitwise disparity detected between ${rootRel} and ${templateRel}`);
    }
  });
});

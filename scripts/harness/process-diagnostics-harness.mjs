#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROCESS & RUNTIME DIAGNOSTICS HARNESS (ZERO-PSTACK PROTOCOL)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Automated CLI harness for inspecting processes, active file locks,
 *          runtime diagnostic guidance, and verifying zero pstack usage.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import path from 'node:path';
import {
  compileDiagnosticReport,
  formatDiagnosticText,
  DIAGNOSTIC_ANTI_PATTERNS,
  SUPPORTED_RUNTIMES,
} from '../lib/process-diagnostics.mjs';

function printHelp() {
  console.log(`
Usage:
  node scripts/harness/process-diagnostics-harness.mjs [flags]
  soda-os diagnose [flags]

Flags:
  --pid <PID>              Inspect a specific running OS process ID
  --runtime <name>         Runtime ecosystem: node | rust_async | python | postgres
  --locks                  Scan repository for active or stale file locks
  --audit-anti-patterns    Audit codebase to assert ZERO pstack or raw ptrace usage
  --json                   Output structured JSON payload
  -h, --help               Display this help message

Exit Codes:
  0: PASS (Diagnostics clean, no anti-patterns found)
  1: FAIL (Anti-pattern detected or target process dead/stale lock anomaly)
  3: SCHEMA_ERROR (Invalid CLI arguments)
`);
}

async function main() {
  const args = process.argv.slice(2);
  let pid = null;
  let runtime = 'node';
  let jsonOutput = false;
  let auditLocks = false;
  let auditAntiPatterns = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--pid' && i + 1 < args.length) {
      pid = parseInt(args[++i], 10);
      if (isNaN(pid) || pid <= 0) {
        console.error(`Error: Invalid PID "${args[i]}". Must be a positive integer.`);
        process.exit(3);
      }
    } else if (arg.startsWith('--pid=')) {
      pid = parseInt(arg.slice('--pid='.length), 10);
      if (isNaN(pid) || pid <= 0) {
        console.error(`Error: Invalid PID. Must be a positive integer.`);
        process.exit(3);
      }
    } else if (arg === '--runtime' && i + 1 < args.length) {
      runtime = args[++i];
    } else if (arg.startsWith('--runtime=')) {
      runtime = arg.slice('--runtime='.length);
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--locks') {
      auditLocks = true;
    } else if (arg === '--audit-anti-patterns') {
      auditAntiPatterns = true;
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(3);
    }
  }

  const projectRoot = process.cwd();
  const report = compileDiagnosticReport({
    pid,
    runtime,
    projectRoot,
    auditAntiPatterns,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDiagnosticText(report));
    if (auditAntiPatterns && report.antiPatternAudit) {
      console.log('▶ Anti-Pattern Audit (Zero-pstack / Zero-ptrace Invariant):');
      if (report.antiPatternAudit.passed) {
        console.log('  ✅ Clean: 0 banned pstack or raw ptrace references found.');
      } else {
        console.log(`  ❌ FAILED: ${report.antiPatternAudit.totalViolations} anti-pattern violations found!`);
        for (const v of report.antiPatternAudit.violations) {
          console.log(`     • ${v.file}:${v.line} -> ${v.matchedText}`);
          console.log(`       Reason: ${v.reason}`);
        }
      }
      console.log('══════════════════════════════════════════════════════════════════════');
    }
  }

  // Determine exit code
  if (auditAntiPatterns && report.antiPatternAudit && !report.antiPatternAudit.passed) {
    process.exit(1);
  }

  if (pid && report.targetProcess && !report.targetProcess.alive) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`Diagnostic execution error: ${err.message}`);
  process.exit(1);
});

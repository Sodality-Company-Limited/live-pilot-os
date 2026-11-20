/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROCESS & RUNTIME DIAGNOSTICS ENGINE (ZERO-PSTACK PROTOCOL)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Non-invasive, multi-runtime process diagnostics, event-loop inspection,
 *          active lock deadlock detection, and anti-pattern auditing.
 * Invariant: Rejects unportable, container-unsafe pstack/ptrace in favor of
 *            native language runtime introspection and mathematical scheduling.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

export const SUPPORTED_RUNTIMES = Object.freeze([
  'node',
  'rust_async',
  'python',
  'postgres',
  'generic_posix',
]);

export const DIAGNOSTIC_ANTI_PATTERNS = Object.freeze({
  pstack: {
    id: 'ANTI_PATTERN_PSTACK',
    name: 'pstack Process Stack Dumper',
    severity: 'CRITICAL',
    whyProhibited:
      'pstack is a legacy Solaris/Linux utility that requires CAP_SYS_PTRACE, fails on macOS, and is semantically blind to async coroutines (Tokio), V8 event loops, and CPython bytecode.',
    replacement: 'Native runtime diagnostics: Node.js process.report, tokio-console/tracing, py-spy, and pg_stat_activity.',
  },
  ptrace_attach: {
    id: 'ANTI_PATTERN_PTRACE_ATTACH',
    name: 'Raw ptrace Syscall Attach',
    severity: 'HIGH',
    whyProhibited:
      'Violates Zero-Trust container security boundaries; blocked by default seccomp profiles and Kubernetes Restricted Pod Security Standards.',
    replacement: 'Out-of-process sampling (eBPF/py-spy) or in-process diagnostic channels.',
  },
  gdb_freeze: {
    id: 'ANTI_PATTERN_GDB_FREEZE',
    name: 'GDB Process Freeze in Production',
    severity: 'HIGH',
    whyProhibited:
      'Freezing a process via SIGSTOP risks cascading connection pool timeouts and microservice SLA breaches.',
    replacement: 'Non-blocking state inspection, OpenTelemetry distributed tracing, and structured JSON logs.',
  },
});

/**
 * Checks whether an OS PID is currently active.
 * @param {number} pid
 * @returns {boolean}
 */
export function isProcessAlive(pid) {
  if (!pid || typeof pid !== 'number' || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // Process exists but is owned by another user
  }
}

/**
 * Collects native in-process Node.js diagnostics using process.report.
 * @returns {object} Structured Node.js diagnostic report
 */
export function collectNodeDiagnosticReport() {
  let rawReport = null;
  if (typeof process.report === 'object' && typeof process.report.getReport === 'function') {
    try {
      rawReport = process.report.getReport();
    } catch (_) {
      rawReport = null;
    }
  }

  const memory = process.memoryUsage();
  const uptime = process.uptime();
  const cpu = process.cpuUsage();

  return {
    collectedAt: new Date().toISOString(),
    pid: process.pid,
    ppid: process.ppid,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(uptime),
    memory: {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers || 0,
    },
    cpuUsage: {
      userMicros: cpu.user,
      systemMicros: cpu.system,
    },
    hasNativeReport: Boolean(rawReport),
    eventLoop: rawReport?.libuv
      ? {
          handlesCount: Array.isArray(rawReport.libuv) ? rawReport.libuv.length : 0,
        }
      : { handlesCount: 'n/a' },
    environmentVariablesCount: Object.keys(process.env).length,
    activeHandlesCount: typeof process._getActiveHandles === 'function' ? process._getActiveHandles().length : 'hidden',
    activeRequestsCount: typeof process._getActiveRequests === 'function' ? process._getActiveRequests().length : 'hidden',
  };
}

/**
 * Inspects an OS process non-invasively via standard POSIX utilities.
 * @param {number} pid
 * @returns {object}
 */
export function inspectSystemProcess(pid) {
  const numericPid = Number(pid);
  if (!numericPid || isNaN(numericPid) || numericPid <= 0) {
    return {
      pid: numericPid,
      alive: false,
      error: 'Invalid PID provided',
    };
  }

  const alive = isProcessAlive(numericPid);
  if (!alive) {
    return {
      pid: numericPid,
      alive: false,
      details: null,
    };
  }

  let commandLine = 'unknown';
  let state = 'unknown';
  let cpuPercent = '0.0';
  let memPercent = '0.0';

  try {
    if (process.platform === 'linux' && fs.existsSync(`/proc/${numericPid}/stat`)) {
      const statContent = fs.readFileSync(`/proc/${numericPid}/stat`, 'utf8');
      const parts = statContent.split(' ');
      state = parts[2] || 'unknown';
      if (fs.existsSync(`/proc/${numericPid}/cmdline`)) {
        commandLine = fs.readFileSync(`/proc/${numericPid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
      }
    } else {
      // macOS / standard POSIX
      const output = execSync(`ps -p ${numericPid} -o pid,state,%cpu,%mem,command 2>/dev/null`, {
        encoding: 'utf8',
        timeout: 2000,
      }).trim();
      const lines = output.split('\n');
      if (lines.length > 1) {
        const fields = lines[1].trim().split(/\s+/);
        state = fields[1] || 'unknown';
        cpuPercent = fields[2] || '0.0';
        memPercent = fields[3] || '0.0';
        commandLine = fields.slice(4).join(' ') || 'unknown';
      }
    }
  } catch (err) {
    // Process might have terminated between alive check and inspection
  }

  return {
    pid: numericPid,
    alive: true,
    state,
    cpuPercent,
    memPercent,
    commandLine,
  };
}

/**
 * Recursively scans directory for active or stale .lock files created by file-lock.js.
 * @param {string} rootDir
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function scanActiveFileLocks(rootDir, options = {}) {
  const maxDepth = options.maxDepth || 6;
  const staleThresholdMs = options.staleThresholdMs || 30000;
  const locks = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'target') {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.lock')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          let parsed = null;
          try {
            parsed = JSON.parse(content);
          } catch (_) {}

          if (parsed && typeof parsed === 'object') {
            const ageMs = Date.now() - (parsed.createdAt || 0);
            const alive = parsed.pid ? isProcessAlive(parsed.pid) : false;
            const isStale = ageMs > staleThresholdMs || !alive;

            locks.push({
              lockPath: fullPath,
              targetFile: fullPath.replace(/\.lock$/, ''),
              pid: parsed.pid || null,
              host: parsed.host || null,
              createdAt: parsed.createdAt ? new Date(parsed.createdAt).toISOString() : null,
              ageMs,
              alive,
              isStale,
              token: parsed.token || null,
            });
          }
        } catch (_) {}
      }
    }
  }

  walk(path.resolve(rootDir), 0);
  return locks;
}

/**
 * Returns canonical non-invasive runtime diagnostic recommendations.
 * @param {string} runtime
 * @returns {object}
 */
export function getRuntimeRecommendations(runtime) {
  const norm = String(runtime || 'generic_posix').toLowerCase().trim();

  switch (norm) {
    case 'node':
    case 'nodejs':
      return {
        runtime: 'node',
        preferredTool: 'Node.js Native Diagnostic Report & Diagnostics Channel',
        antiPatternRejected: 'pstack / gdb',
        diagnosticCommands: [
          'kill -USR2 <PID>  # Generates diagnostic report JSON in working directory',
          'node --diagnostic-report-on-signal --diagnostic-report-uncaught-exception app.js',
          'node --inspect=<port> app.js  # Attach Chrome DevTools / VS Code debugger non-invasively',
        ],
        codeSnippet: `// In-process diagnostic snapshot
import process from 'node:process';
if (process.report) {
  const report = process.report.getReport();
  console.log('Event loop handles:', report.libuv?.length);
}`,
        whyOptimal:
          'Provides exact JavaScript call stacks, unhandled Promises, libuv event loop handles, and GC metrics without freezing the process.',
      };

    case 'rust':
    case 'rust_async':
    case 'tokio':
      return {
        runtime: 'rust_async',
        preferredTool: 'tokio-console & tracing-subscriber',
        antiPatternRejected: 'pstack (all threads idle in epoll_wait; 100% blind to async tasks)',
        diagnosticCommands: [
          'tokio-console  # Real-time task reactor dashboard (listening on 127.0.0.1:6669)',
          'RUST_LOG=trace cargo run  # Detailed async spans and instrumented states',
          'lldb -p <PID> -o "thread backtrace all"  # macOS native fallback if hard hang',
        ],
        codeSnippet: `// Instrument Tokio runtime
#[tokio::main]
async fn main() {
    console_subscriber::init();
    tracing::info!("Tokio console telemetry initialized");
}`,
        whyOptimal:
          'Tokio tasks are cooperative coroutines multiplexed on worker threads. tokio-console tracks task poll durations, await points, and channel backpressure directly at the reactor layer.',
      };

    case 'python':
    case 'py':
      return {
        runtime: 'python',
        preferredTool: 'py-spy & faulthandler',
        antiPatternRejected: 'pstack (outputs repetitive _PyEval_EvalFrameDefault C symbols)',
        diagnosticCommands: [
          'py-spy dump --pid <PID>  # Prints exact Python stack trace without acquiring GIL',
          'py-spy top --pid <PID>   # Live top-like view of active Python functions',
          'kill -USR1 <PID>         # Triggers faulthandler traceback dump if configured',
        ],
        codeSnippet: `import faulthandler, signal
faulthandler.enable()
faulthandler.register(signal.SIGUSR1)`,
        whyOptimal:
          'py-spy samples CPython process memory structures out-of-process without acquiring the GIL or interrupting critical quant trading / ML execution loops.',
      };

    case 'postgres':
    case 'postgresql':
    case 'sql':
      return {
        runtime: 'postgres',
        preferredTool: 'pg_stat_activity & pg_blocking_pids() catalog queries',
        antiPatternRejected: 'pstack (attaching freezes postgres backend, causing connection pool collapse)',
        diagnosticCommands: [
          `SELECT pid, now() - query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;`,
          `SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid, blocked.query AS blocked_query FROM pg_stat_activity blocked JOIN pg_locks bl ON bl.pid = blocked.pid JOIN pg_locks kl ON kl.locktype = bl.locktype AND kl.database IS NOT DISTINCT FROM bl.database AND kl.relation IS NOT DISTINCT FROM bl.relation AND kl.page IS NOT DISTINCT FROM bl.page AND kl.tuple IS NOT DISTINCT FROM bl.tuple AND kl.virtualxid IS NOT DISTINCT FROM bl.virtualxid AND kl.transactionid IS NOT DISTINCT FROM bl.transactionid AND kl.classid IS NOT DISTINCT FROM bl.classid AND kl.objid IS NOT DISTINCT FROM bl.objid AND kl.objsubid IS NOT DISTINCT FROM bl.objsubid AND kl.pid != bl.pid JOIN pg_stat_activity blocking ON blocking.pid = kl.pid WHERE NOT bl.granted;`,
        ],
        codeSnippet: `// Cancel stuck query safely
SELECT pg_cancel_backend(<STUCK_PID>);`,
        whyOptimal:
          'Queries relational catalog without interrupting database server operations, pinpointing exact lock holders and queries.',
      };

    default:
      return {
        runtime: 'generic_posix',
        preferredTool: 'eBPF Profiling (Pyroscope/Parca) & POSIX ps/lsof',
        antiPatternRejected: 'pstack / raw ptrace',
        diagnosticCommands: [
          'ps -p <PID> -o pid,ppid,state,%cpu,%mem,command',
          'lsof -p <PID>  # Inspect open file descriptors, sockets, and connections',
        ],
        codeSnippet: null,
        whyOptimal: 'Non-invasive OS-level metadata gathering with zero overhead.',
      };
  }
}

/**
 * Audits a repository codebase ensuring no banned pstack or raw ptrace anti-patterns exist.
 * @param {string} projectRoot
 * @returns {object} Audit report with violations
 */
export function auditCodebaseForAntiPatterns(projectRoot) {
  const root = path.resolve(projectRoot);
  const violations = [];
  const bannedKeywords = [
    {
      pattern: /(?<!(?:zero|anti|no)[-_])\bpstack\b/i,
      reason: DIAGNOSTIC_ANTI_PATTERNS.pstack.whyProhibited,
    },
    {
      pattern: /\bptrace\s*\(\s*PTRACE_ATTACH\b/,
      reason: DIAGNOSTIC_ANTI_PATTERNS.ptrace_attach.whyProhibited,
    },
  ];

  function scanDir(dir, depth) {
    if (depth > 6) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'target' ||
        entry.name === 'dist' ||
        entry.name === '.bundle' ||
        entry.name === 'docs' // Documentation may discuss pstack
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
      } else if (entry.isFile() && /\.(js|mjs|sh|bash|py|rs|ya?ml)$/i.test(entry.name)) {
        // Exclude our own diagnostics engine from self-reporting
        if (entry.name === 'process-diagnostics.mjs' || entry.name === 'test-process-diagnostics.mjs' || entry.name === 'process-diagnostics-harness.mjs') {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip comments
            if (/^\s*(#|\/\/|\/\*|\*)/.test(line)) continue;

            for (const { pattern, reason } of bannedKeywords) {
              if (pattern.test(line)) {
                violations.push({
                  file: path.relative(root, fullPath),
                  line: i + 1,
                  matchedText: line.trim(),
                  reason,
                });
              }
            }
          }
        } catch (_) {}
      }
    }
  }

  scanDir(root, 0);

  return {
    scannedRoot: root,
    totalViolations: violations.length,
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Compiles a comprehensive diagnostic report.
 * @param {object} [options]
 * @returns {object}
 */
export function compileDiagnosticReport(options = {}) {
  const targetPid = options.pid ? Number(options.pid) : null;
  const projectRoot = options.projectRoot || process.cwd();

  const nodeDiagnostics = collectNodeDiagnosticReport();
  const targetProcess = targetPid ? inspectSystemProcess(targetPid) : null;
  const activeLocks = scanActiveFileLocks(projectRoot, options);
  const runtimeRecs = getRuntimeRecommendations(options.runtime || 'node');
  const antiPatternAudit = options.auditAntiPatterns ? auditCodebaseForAntiPatterns(projectRoot) : null;

  return {
    version: '1.0.0',
    protocol: 'SODA_OS_ZERO_PSTACK_DIAGNOSTICS',
    timestamp: new Date().toISOString(),
    host: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    node: nodeDiagnostics,
    targetProcess,
    fileLocks: {
      totalFound: activeLocks.length,
      staleCount: activeLocks.filter((l) => l.isStale).length,
      activeCount: activeLocks.filter((l) => !l.isStale).length,
      locks: activeLocks,
    },
    recommendations: runtimeRecs,
    antiPatternAudit,
  };
}

/**
 * Formats a diagnostic report as human-readable text.
 * @param {object} report
 * @returns {string}
 */
export function formatDiagnosticText(report) {
  const lines = [];
  lines.push('══════════════════════════════════════════════════════════════════════');
  lines.push('🛡️ SODA OS RUNTIME & PROCESS DIAGNOSTIC REPORT (ZERO-PSTACK)');
  lines.push('══════════════════════════════════════════════════════════════════════');
  lines.push(`Timestamp: ${report.timestamp} | Host: ${report.host} | Platform: ${report.platform}-${report.arch}`);
  lines.push('');
  lines.push('▶ Node.js Runtime State:');
  lines.push(`  • PID: ${report.node.pid} (PPID: ${report.node.ppid}) | Node: ${report.node.nodeVersion}`);
  lines.push(`  • Memory RSS: ${(report.node.memory.rssBytes / (1024 * 1024)).toFixed(2)} MB | Heap: ${(report.node.memory.heapUsedBytes / (1024 * 1024)).toFixed(2)} / ${(report.node.memory.heapTotalBytes / (1024 * 1024)).toFixed(2)} MB`);
  lines.push(`  • Active Handles: ${report.node.activeHandlesCount} | Active Requests: ${report.node.activeRequestsCount}`);
  lines.push('');

  if (report.targetProcess) {
    lines.push(`▶ Target Process (PID ${report.targetProcess.pid}):`);
    lines.push(`  • Alive: ${report.targetProcess.alive ? 'YES ✅' : 'NO ❌'}`);
    if (report.targetProcess.alive) {
      lines.push(`  • State: ${report.targetProcess.state} | CPU: ${report.targetProcess.cpuPercent}% | Memory: ${report.targetProcess.memPercent}%`);
      lines.push(`  • Command: ${report.targetProcess.commandLine}`);
    }
    lines.push('');
  }

  lines.push(`▶ Active File Locks (${report.fileLocks.totalFound} found, ${report.fileLocks.staleCount} stale):`);
  if (report.fileLocks.locks.length === 0) {
    lines.push('  • No active file locks detected (clean state).');
  } else {
    for (const lock of report.fileLocks.locks) {
      const status = lock.isStale ? 'STALE ⚠️' : 'ACTIVE 🔒';
      lines.push(`  • [${status}] ${path.basename(lock.lockPath)} (PID ${lock.pid}, age: ${Math.round(lock.ageMs / 1000)}s)`);
    }
  }
  lines.push('');

  lines.push(`▶ Runtime Guidance for [${report.recommendations.runtime}]:`);
  lines.push(`  • Preferred Tool: ${report.recommendations.preferredTool}`);
  lines.push(`  • Anti-Pattern Prohibited: ${report.recommendations.antiPatternRejected}`);
  lines.push('  • Actionable Commands:');
  for (const cmd of report.recommendations.diagnosticCommands) {
    lines.push(`    $ ${cmd}`);
  }
  lines.push('');
  lines.push('══════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

# Technical Report: Soda OS Process Diagnostics Engine & The Zero-Pstack Protocol

**Document ID:** `docs/06_raw/20261011_133000_zero_pstack_process_diagnostics_and_runtime_observability.md`  
**Date:** 2026-10-11T13:30:00+07:00  
**Status:** Certified Architecture & Operational Implementation  
**Classification:** Enterprise Observability, Systems Diagnostics, Concurrency Safety  
**Ecosystem Scope:** Soda OS and all 54 downstream repositories in `/Users/batrarethsudprasert/projects`  

---

## 1. Executive Summary

This report formalizes and details the implementation of the **Soda OS Process & Runtime Diagnostics Engine** and the **Zero-Pstack Protocol**. Following an in-depth architectural evaluation of process diagnostics in modern distributed agent ecosystems, Soda OS firmly rejects `pstack` and raw `ptrace`-based attaching in favor of non-invasive, domain-native language introspection and a-priori mathematical concurrency guarantees.

We have engineered and deployed:
1. **Core Diagnostic Engine:** [`scripts/lib/process-diagnostics.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/process-diagnostics.mjs)
2. **CLI Harness & Verification Tool:** [`scripts/harness/process-diagnostics-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/process-diagnostics-harness.mjs)
3. **CLI Integration:** `soda-os diagnose [flags]` integrated into [`cli.js`](file:///Users/batrarethsudprasert/projects/soda-os/cli.js)
4. **Verification Operator Runbook Playbook 9:** [`docs/06-workflows/verification-operator-runbook.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/06-workflows/verification-operator-runbook.md)
5. **Zero-Mock Unit Test Suite:** [`tests/unit/test-process-diagnostics.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/tests/unit/test-process-diagnostics.mjs) (9/9 tests pass 100% green in both root and `template/` mirror).

---

## 2. Why `pstack` Is Prohibited (The 4 Incompatibilities)

`pstack` is an obsolete C/C++ process stack unwinder that fails across four critical architectural invariants:

### A. Local Development Portability
* **Mechanics:** `pstack` is a legacy Solaris/Linux utility that reads `/proc/<pid>/stack` or wraps `gdb`.
* **The Reality:** Developers and autonomous coding agents operate on macOS (Darwin) and Linux CI/CD environments. On macOS, `pstack` does not exist (`command not found`). Relying on `pstack` breaks developer workstations.

### B. Zero-Trust Container Sandboxing (`CAP_SYS_PTRACE`)
* **Mechanics:** `pstack` relies on `ptrace(PTRACE_ATTACH, ...)`.
* **The Reality:** In Kubernetes and Docker production environments, `CAP_SYS_PTRACE` is explicitly dropped to satisfy CIS Security Benchmarks and Kubernetes Restricted Pod Security Standards. Executing `pstack` in an unprivileged pod fails fail-closed with `ptrace: Operation not permitted`.

### C. Coroutine & Async Semantic Blindness
Modern high-concurrency runtimes multiplex tasks onto worker thread pools:
* **Async Rust (Tokio):** When an async future deadlocks or starves, the OS worker thread does not block on that function; it returns to the reactor loop. `pstack` outputs all 8 worker threads idle in `epoll_wait` or `futex_wait`, completely hiding the stuck task.
* **Node.js (V8):** `pstack` outputs internal V8 C++ evaluation frames (`v8::internal::...`) and cannot decode JavaScript call stacks, unhandled Promises, or libuv event loop handles.
* **Python (CPython):** `pstack` outputs dozens of identical `_PyEval_EvalFrameDefault` C symbols without Python filenames or lines.
* **PostgreSQL:** Attaching `ptrace` freezes backend processes with `SIGSTOP`, triggering connection pool collapse and cascading 504 Gateway Timeouts.

### D. A-Priori Mathematical Proof vs. Post-Mortem Guessing
Under Global Constitution Article IV, Soda OS enforces mathematical guarantees *before* deployment:
* **Dijkstra Lexicographical Ordering:** [`scripts/goals/file-lock.js`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/goals/file-lock.js) guarantees deadlock freedom across multiple file acquisitions.
* **Concurrency Schedule Sequentializer:** [`scripts/harness/concurrency-schedule-harness.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/harness/concurrency-schedule-harness.mjs) verifies 50 schedule interleavings with monotonic fencing tokens.

---

## 3. What Soda OS Implements Instead

The newly deployed diagnostics engine provides native introspection across all runtimes:

| Layer / Runtime | Native Soda OS Tool | Underlying Mechanics |
| :--- | :--- | :--- |
| **Node.js (Core & BFF)** | `process.report.getReport()` | Non-crashing JSON snapshot of JavaScript stack, active libuv handles, event loop latency, and memory. |
| **Async Rust (Tokio)** | `tokio-console` & `tracing` | Real-time task reactor telemetry tracking task IDs, poll times, and await points. |
| **Python (Quant Models)** | `py-spy dump` & `faulthandler` | Out-of-process memory sampling without acquiring the GIL or slowing execution. |
| **PostgreSQL** | Relational catalog queries | Non-blocking queries on `pg_stat_activity` and `pg_blocking_pids()`. |
| **Soda OS File Locks** | `scanActiveFileLocks()` | Scans `*.lock` files, tests PID liveness via `kill(pid, 0)`, and detects stale locks. |

---

## 4. Empirical Verification & Parity

* **Unit Tests:** `node tests/unit/test-process-diagnostics.mjs` passed 9/9 green.
* **Template Parity:** `node template/tests/unit/test-process-diagnostics.mjs` passed 9/9 green with 0 diff lines across all modified files.
* **Regression Tests:** All standard regression test suites (`test-mathematical-proven-goal-template.mjs`, `test-verification-documentation-conformance.mjs`, `test-execute-goal-template.mjs`, `test-senior-engineering-gate.mjs`, `test-sync-ecosystem.mjs`) passed 100% green.

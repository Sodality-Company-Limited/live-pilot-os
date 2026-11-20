# Subagent & Git Worktree Orchestration Protocol Specification

**Location:** `.agents/specs/worktree-orchestration.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Standard  

---

## 🏛️ Context & Framework Invariant

When the system orchestrator coordinates multiple subagents to execute a goal, concurrent tasks **MUST** be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

---

### Worktree & Multi-Subagent Orchestration Plan

### Subagent & Git Worktree Orchestration Plan

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `aether_implementer` | `feature/G-PAY-001-kernel` | `../worktrees/aether-G-PAY-001-implementer` | `src/crates/aether-kernel/src/**` | `target/worktrees/implementer` |
| `aether_tester` | `feature/G-PAY-001-qa` | `../worktrees/aether-G-PAY-001-tester` | `src/crates/aether-kernel/tests/**`, `scripts/harness/**` | `target/worktrees/tester` |
| `security_auditor` | `feature/G-PAY-001-audit` | `../worktrees/aether-G-PAY-001-audit` | `docs/06_raw/**` | `target/worktrees/audit` |

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-PAY-001` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-PAY-001.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-PAY-001-impl` | `feature/G-PAY-001-impl` | Step 1 & 2: Production source implementation & domain logic | `code/src/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-PAY-001-test` | `feature/G-PAY-001-test` | Step 3: Zero-mock unit & integration test suites | `code/tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-PAY-001-arch` | `feature/G-PAY-001-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

#### 2. Isolation & Concurrency Invariants

- **Git Index Isolation:** Every subagent executes within an independent Git worktree (`git worktree add <path> -b <branch>`), ensuring dedicated `.git/worktrees/.../index` files and zero index lock contention (`fatal: Unable to create '.git/index.lock'`).
- **Disjoint Touch Map Theorem:** Subagent write permissions must satisfy strict disjointness:
  $$\text{TouchMap}(\text{Subagent}_i) \cap \text{TouchMap}(\text{Subagent}_j) = \emptyset \quad \forall i \neq j$$
  Write-write collisions across subagents trigger an immediate, fail-closed orchestrator abort.
- **Port & Socket Isolation:** Concurrent test suites must dynamically bind ephemeral OS ports (`127.0.0.1:0`) and utilize isolated test caches (`.pytest_cache-{role}` or scoped temp databases) to eliminate `EADDRINUSE` socket conflicts.
- **Hardware Acceleration Contention:** GPU streams/Metal buffers (`mps` / `cuda`) and CPU thread allocations are capped per subagent to avoid CUDA OOM or scheduler thrashing.

#### 3. Orchestration Saga & Synchronization Protocol

$$\text{DISPATCH (Fork Worktrees)} \longrightarrow \text{CONCURRENT EXECUTION} \longrightarrow \text{BARRIER JOIN (Green Receipts)} \longrightarrow \text{RECONCILIATION MERGE} \longrightarrow \text{TEARDOWN & PRUNE}$$

1. **Dispatch & Worktree Provisioning:**
   ```bash
   git worktree add .worktrees/G-PAY-001-impl -b feature/G-PAY-001-impl
   git worktree add .worktrees/G-PAY-001-test -b feature/G-PAY-001-test
   git worktree add .worktrees/G-PAY-001-arch -b feature/G-PAY-001-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-PAY-001` sequentially:
   ```bash
   git merge --ff-only feature/G-PAY-001-impl
   git merge --ff-only feature/G-PAY-001-test
   git merge --ff-only feature/G-PAY-001-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-PAY-001-impl
   git worktree remove --force .worktrees/G-PAY-001-test
   git worktree remove --force .worktrees/G-PAY-001-arch
   git worktree prune
   git branch -d feature/G-PAY-001-impl feature/G-PAY-001-test feature/G-PAY-001-arch
   ```

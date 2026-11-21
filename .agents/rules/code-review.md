---
trigger: always_on
---

# Senior Software Engineering Code Review Protocol

This document defines the strict, non-negotiable **Unified 28-Pillar Senior Software Engineering Code Review Protocol**, dependency tracking, impact analysis, business logic verification, architectural boundaries, and operational quality invariants governing all development across the Sodality ecosystem.

---

## 1. Mandatory Code Review Checkpoints (The 28 Pillars)

Before approving any code proposal, refactoring, feature addition, or goal card, Antigravity MUST verify compliance across all 28 operational pillars organized across 7 enterprise domains:

---

### Domain I: Algorithmic Correctness, Data Integrity & Formal Verification

#### Pillar 1: Domain Integrity & Pure Hexagonal Architecture
- **Multi-Currency Minor-Unit Integer Arithmetic:** All monetary amounts MUST be represented strictly as 64-bit signed integers (`i64`, `BigInt`) in the atomic minor unit of the declared currency (e.g. 100 minor units = 1.00 USD, 100 minor units = 1.00 EUR, 100 minor units = 1.00 THB, 1 minor unit = 1 JPY) paired with an explicit ISO 4217 currency code (e.g. `currency_code = "USD"`) using the Money Value Object pattern `(amount_minor, currency, scale)`. Hardcoding country-specific subunits such as Satang is strictly prohibited.
- **Zero-Float Invariant:** Floating-point types (`f32`, `f64`, `Float`, `Double`, `number` with decimal fractions) are strictly banned from financial, billing, balance, quota, and tax logic.
- **Pure Core Isolation:** The domain core MUST remain pure (hexagonal architecture: zero I/O, zero database queries, zero HTTP framework imports, zero direct clock access). Time and random numbers must be injected via deterministic ports.

#### Pillar 2: Persistence, Transactions & Concurrency Pooling
- **Atomic ACID Transactions:** Multi-table mutations MUST execute inside atomic database transactions (`sqlx::Transaction`, `BEGIN...COMMIT`). Non-atomic `DELETE`-then-`INSERT` sequences are strictly forbidden.
- **Bounded Resource Pooling:** Database connections MUST be managed via bounded connection pools (e.g. `deadpool-postgres`, `pg_pool`). Global mutexes wrapping client connections (`Arc<Mutex<Client>>`) or unbounded connections are strictly banned.
- **Lean Projections:** Queries MUST project only needed columns. Eager loading of multi-megabyte binary byte arrays (`bytea`, PDF blobs, raw assets) on list endpoints is strictly prohibited.

#### Pillar 3: IAM, Role-Scoped Identity & Multi-Tenancy
- **PostgreSQL Row-Level Security:** Every multi-tenant database table MUST enforce PostgreSQL Row-Level Security (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`) with fail-closed tenant isolation policies.
- **Composite Role-Scoped Identity:** External provider identities MUST be scoped as `(role, subject)` composite keys rather than global unique constraints, allowing multi-role portal access without collision.
- **Verified Tenant Context:** Tenant context MUST be propagated via verified JWT claims and W3C Traceparent headers; querying multi-tenant tables without tenant session parameters (`app.current_tenant_id`) is strictly forbidden.

#### Pillar 4: Formal Verification, Mathematical Proofs & Program Correctness
- **Algebraic Conservation Laws & Zero Directional Drift:** Financial revenue splits, commission allocations, and tax calculations MUST satisfy exact integer conservation: $\sum \text{splits} \equiv \text{total}$. Rounding MUST utilize Banker's Rounding Half-Even (`div_half_even`), eliminating directional statistical drift.
- **Combinatorial Check-Digit Proofs:** Identification check-digits (e.g. 13-digit Thai Tax ID Modulo-11, Luhn algorithm) must be verified against 100% of single-digit mutation vectors and transposition vectors ($9,000+$ vectors, $0$ bypasses).
- **Typestate Compile-Time State Machine (FSM):** Lifecycle state transitions (Campaign, Payment, Settlement, Document, Contract) must be encoded as distinct typestates (`Entity<State>`), preventing illegal transitions at compile time with 0 runtime check overhead.
- **Axiomatic Hoare Triples & Pre/Postconditions:** Core domain methods must explicitly document and enforce Hoare Triples ($\{P\}\ C\ \{Q\}$), with weakest precondition ($\text{wp}$) back-propagation, loop invariants ($I$), and loop variant ranking functions ($V: \text{State} \to \mathbb{N}$) proving total correctness and non-divergence.
- **Model Checking & Temporal Logic (LTL/CTL):** Asynchronous state machines and distributed protocol handshakes must satisfy Linear Temporal Logic (LTL) safety properties ($\square \text{Safe}$: bad states never happen) and liveness properties ($\Diamond \text{Terminal}$: good states eventually reached), verified for deadlock/livelock freedom via state exploration.
- **Deductive Verification & SMT Automated Reasoning:** Numerical calculation routines must be verified via SMT solvers (Z3 / CVC5) over Quantifier-Free Linear Integer Arithmetic ($\text{QF\_LIA}$) to mathematically prove absence of integer overflow, underflow, and divide-by-zero.
- **Curry-Howard Constructive Types & Refinements:** Domain models must leverage constructive type theory ($\text{Types} \cong \text{Propositions}$), refinement newtypes, and substructural linear/affine ownership lifetimes to make illegal memory or domain states unrepresentable.
- **Abstract Interpretation & Sound Static Analysis:** Abstract domains (Intervals, Octagons) via Galois connections $(\alpha, \gamma)$ must guarantee zero unhandled panics, null dereferences, or out-of-bounds indexing.
- **Cryptographic Inclusion Proofs (Merkle DAGs):** Historical ledgers and transaction journals must be chained in continuous SHA-256 Merkle DAGs ($H_n = \text{SHA256}(H_{n-1} \parallel \dots)$), providing logarithmic $O(\log N)$ tamper-evident inclusion proofs.
- **Property-Based Invariant Fuzzing:** Critical domain invariants must be fuzz-tested via Proptest / QuickCheck across $\ge 10,000$ randomized boundary runs without failure.
- **Language-Adaptive Formal Toolchain Matrix:** Verification tools MUST match the target codebase language: **Rust** uses **Kani** (`cargo-kani`) for bounded model checking and **Prusti/Creusot/Miri/Proptest**; **Python** uses **CrossHair** (Z3 SMT symbolic contract execution), **Deal**, and **Hypothesis**; **TypeScript** uses **fast-check** and **z3-solver**; **Go** uses **Gopter**, `go test -fuzz`, and **nilaway**; **Solidity** uses **Certora Prover** / **Halmos**; **Distributed Protocols** use **TLA+/TLC** / **Alloy**.

---

### Domain II: Concurrency, Deadlock Prevention & Distributed State

#### Pillar 5: Async Reliability, Durable Queues & Sagas
- **Durable Queue Ingestion:** Asynchronous jobs must be queued in durable brokers (Apalis Redis, NATS JetStream, or Postgres transactional outbox) with automatic Dead Letter Queue (DLQ) quarantine.
- **Distributed Idempotency Leases:** Webhook consumers and event subscribers must enforce 24-hour distributed Redis idempotency leases on deduplication keys.
- **Saga Compensation Rollbacks:** Distributed multi-service mutations must provide explicit saga compensation logic to restore consistency on partial failures.

#### Pillar 6: Deadlock Prevention, Lock Hierarchy & Distributed Mutex Fencing
- **Lexicographical Lock Acquisition Order:** Multi-row database locks (`SELECT ... FOR UPDATE`) must sort entity IDs in strictly ascending order before acquisition.
- **Fail-Closed Lock Timeouts:** Transaction blocks must enforce `SET LOCAL lock_timeout = '2000ms'` and `statement_timeout = '5000ms'`.
- **Monotonic Fencing Tokens:** Distributed locks must return monotonically increasing fencing tokens ($t_{\text{fence}}$). Downstream storage engines must reject writes with stale tokens ($t \le t_{\text{last}}$).

#### Pillar 7: Anti-Entropy Reconciliation & Read-Your-Own-Writes Consistency
- **Read-Your-Own-Writes Session Pinning:** Mutating commands must return the primary database commit LSN/timestamp; subsequent client reads route to the primary if replica lag exceeds $50\text{ms}$.
- **Background Merkle Anti-Entropy:** Background reconciliation daemons must execute periodic Merkle tree diff checks between outbox event streams and CQRS projection tables, auto-replaying missing event windows.

#### Pillar 8: Chaos Resilience, Circuit Breakers & Graceful Shutdown
- **Fail-Closed Circuit Breakers:** Outbound HTTP integrations (Payment gateways, external APIs, third-party messaging) must wrap requests in circuit breakers (`failsafe-rs`, `tower`, or equivalent) with exponential backoff and jitter.
- **Graceful Signal Draining:** HTTP listeners and event consumers must handle `SIGTERM`/`SIGINT` by stopping new traffic and allowing in-flight requests 30 seconds to drain cleanly.
- **Empirical Chaos Verification:** Mission-critical paths must pass automated chaos fault injection suites verifying graceful degradation under network partitions and latency spikes.

---

### Domain III: Consensus, Flow Control & Partition Tolerance

#### Pillar 9: Distributed Consensus, Quorum Safety & Split-Brain Mitigation
- **Strict Quorum Invariant:** In multi-node distributed clusters (Raft, Paxos, Redis Sentinel, etcd), cluster writes require confirmation from a majority quorum ($Q = \lfloor N/2 \rfloor + 1$).
- **Monotonic Term Progression:** Cluster nodes must reject stale term leaders; any RPC request with $term < current\_term$ is rejected immediately.
- **Linearizable Read Verification:** Read requests across distributed nodes must execute through ReadIndex or leader lease verification, preventing dirty reads from partitioned former leaders.
- **Split-Brain Step-Down:** When a leader loses contact with a majority of nodes for longer than the election timeout ($t > \text{election\_timeout}$), it must voluntarily abdicate leadership and transition to follower state.

#### Pillar 10: Backpressure, Flow Control & Adaptive Concurrency Limits
- **Little's Law Equilibrium ($L = \lambda W$):** Concurrency limits must be governed by Little's Law, bounding in-flight requests ($L$) dynamically as observed latency ($W$) inflates.
- **Adaptive Concurrency Limiting:** Systems must enforce adaptive concurrency limiters (e.g. TCP Vegas or Gradient algorithms) that throttle incoming throughput *before* thread pools or database connections saturate.
- **CoDel (Controlled Delay) Queue Management:** In-memory job buffers and request queues must enforce bounded delay policies, shedding or rejecting packets when queue sojourn times exceed latency budgets (preventing bufferbloat).
- **Explicit Cooperative Backpressure:** Overloaded services must emit HTTP 503 (`Service Unavailable`) or gRPC `UNAVAILABLE` with standard RFC `Retry-After` headers rather than buffering indefinitely.

#### Pillar 11: API Contract Governance & Schema Evolution
- **Contract-First Protocol:** OpenAPI 3.1 YAML specifications must be authored, validated (`swagger-cli`), and frozen BEFORE implementing backend or frontend code.
- **Schema Validation:** Request and response payloads must validate strictly against JSON Schema Draft 2020-12 at compile and runtime.
- **Mutating Idempotency Keys:** Mutating endpoints (`POST`, `PATCH`) must mandate a client-supplied `Idempotency-Key` header with 24-hour distributed caching.
- **RFC 8594 Deprecation Cycles:** Breaking changes require standard `Deprecation: true` and `Sunset: <date>` HTTP headers across two minor releases before decommission.

#### Pillar 12: Observability, Distributed Tracing & SRE Golden Signals
- **W3C Traceparent Propagation:** Unbroken W3C `traceparent: 00-...-01` headers must propagate from browser contexts through API gateways, microservices, and database query comments.
- **Structured JSON with PII Scrubbing:** Logs must emit structured JSON with automatic redaction of National IDs, bank accounts, credit cards, and auth tokens.
- **Prometheus SLI/SLO Alerts:** Services must export metrics with Prometheus alert rules (API P95 < 200ms, queue depth < 50, error rate < 0.1%).
- **Liveness & Readiness Probing:** Services must expose authenticated `/healthz` (liveness) and `/readyz` (readiness verifying database and queue connectivity) endpoints.

---

### Domain IV: Migration Safety, Release Engineering & DevSecOps

#### Pillar 13: Zero-Downtime Migration Safety (Expand-and-Contract)
- **Two-Phase Expand-and-Contract:** Schema alterations must follow two-phase migrations (Phase 1: expand nullable column with dual writes; Phase 2: backfill; Phase 3: read new; Phase 4: contract). Dropping or renaming columns in one step is prohibited.
- **Reversible Rollbacks:** Every `.up.sql` migration MUST provide a tested, empirical `.down.sql` rollback script.
- **Concurrent Index Creation:** Indexes on existing tables must use `CREATE INDEX CONCURRENTLY` to avoid blocking production writes.

#### Pillar 14: Feature Flag Lifecycle, Canary Rollouts & Kill Switches
- **Phased 4-Ring Canary Rollout:** High-risk features must roll out via explicit rings (Ring 0: Dogfood 0% -> Ring 1: Canary 1% -> Ring 2: Targeted 10% -> Ring 3: GA 100%).
- **Sub-3-Second Automated Kill Switch:** Feature flag evaluators must automatically trip flags to `false` if canary error rates exceed 1% or P99 latency spikes above 500ms.
- **Mandatory 30-Day Flag TTL:** Feature flags must define an expiration date ($\le 30 \text{ days}$); lingering flags beyond this date fail CI builds.

#### Pillar 15: DevSecOps, SSRF Sandboxing & KMS Envelope Encryption
- **SSRF Network Sandboxing:** HTML, PDF, and document rendering engines must execute in unprivileged Linux sandboxes blocking private IP blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
- **KMS Envelope Encryption:** Sensitive third-party tokens and statutory keys must be encrypted at rest using KMS envelope encryption (Data Encryption Key encrypted by Key Encryption Key).
- **Automated Secret Scanning:** Pre-commit hooks (`gitleaks`, `trufflehog`) must guarantee zero plaintext secrets, tokens, or `.env` files in the repository.

#### Pillar 16: Supply Chain Integrity, Hermetic Builds & SLSA Attestation
- **Frozen Dependency Lockfiles:** CI builds must run with frozen lockfiles (`cargo build --locked`, `npm ci`). Floating version specifiers (`*`, `^`) in production dependencies are banned.
- **Software Bill of Materials (SBOM):** CI must export CycloneDX or SPDX SBOM manifests for every release candidate.
- **Cosign Artifact Attestation:** Container images must be cryptographically signed via Sigstore Cosign with ephemeral OIDC attestation (SLSA Level 3 compliance).
- **Zero Critical Vulnerabilities:** Dependencies must pass automated auditing (`cargo audit`, `npm audit`) with zero high or critical CVEs.

---

### Domain V: Cryptography, Memory Hygiene & Zero-Trust Defense

#### Pillar 17: Zero-Trust Service Mesh & Cryptographic Workload Identity
- **Mutual TLS (mTLS) Everywhere:** All inter-service communications MUST enforce strict mTLS using short-lived X.509 SVID credentials issued by SPIFFE/SPIRE or a verified service mesh CA.
- **Default-Deny Authorization Policies:** Ingress and egress network policies must default to deny; services cannot communicate without an explicitly declared graph dependency contract.
- **SNI & Host Header Pinning:** Reverse proxies and API gateways must enforce strict SNI and Host header validation, preventing HTTP request smuggling (TE.CL / CL.TE desync) and routing confusion.

#### Pillar 18: Sensitive Memory Hygiene, Buffer Zeroization & Anti-Scraping
- **Deterministic Memory Zeroization:** Memory buffers holding cryptographic keys, passwords, bearer tokens, or decrypted PII must implement explicit zeroization upon drop (`zeroize::ZeroizeOnDrop`, `crypto.secureZeroMemory`).
- **Physical Memory Pinning (`mlock`):** Master private keys must be pinned to physical RAM using `mlock` to prevent secret pages from being paged to unencrypted swap disks.
- **Core Dump Disabling:** Production runtimes must configure `setrlimit(RLIMIT_CORE, 0)` to prevent credential extraction from memory crash dumps.

#### Pillar 19: Statutory Data Governance, Sovereignty & Presentation Fidelity
- **PII Data Vault:** Personal Identifiable Information (national IDs, phone numbers, bank accounts) must be isolated in dedicated tables with column-level AES-256-GCM encryption.
- **Right to Erasure Cryptographic Tombstoning:** User deletion requests must shred PII while preserving financial ledgers using pseudonymous tokens (`DELETED_USER_<UUID>`), maintaining Merkle balance integrity.
- **Data Sovereignty Geo-Fencing:** Tenant data must be bound to sovereign cloud regions matching statutory jurisdictions (PDPA, GDPR, PDPC), with automated policy gates blocking cross-border replication.
- **Presentation Design System & Accessibility:** Frontends must enforce Design System tokens, 5-state lifecycle coverage, WCAG 2.2 AA accessibility ($\ge 44 \times 44\text{px}$ touch targets), and +30% i18n text expansion buffers.

#### Pillar 20: Immutable Audit Trails, Non-Repudiation & Merkle DAG Logging
- **Append-Only WORM Audit Ledger:** Administrative mutations, payouts, and financial writes must append records to an immutable audit ledger chained via continuous SHA-256 Merkle hashes ($H_n = \text{SHA256}(H_{n-1} \parallel \dots)$).
- **Trigger-Level Mutation Locks:** Audit tables must enforce database triggers that raise immediate fatal exceptions on `UPDATE` or `DELETE`.
- **Actor Non-Repudiation:** Mutation records must capture authenticated actor UUID, role context, client IP, before/after JSON state diff, and W3C Traceparent.

---

### Domain VI: AI Agent Governance, LLM Firewalls & Autonomous Safety

#### Pillar 21: AI Agent Safety Boundaries & Prompt Injection Firewalls
- **Dual-LLM Intent Firewall:** Untrusted user inputs and sensory tokens must pass through an isolated intent-classifier firewall before ingestion into system prompts, detecting prompt injection, recursive instructions, and jailbreak payloads.
- **Deterministic JSON Schema Output Enforcement:** LLM agent responses driving tool calls or state mutations must validate strictly against formal JSON Schemas; raw markdown code blocks or unparsed strings are rejected.
- **Tool Capability Least-Privilege Scoping:** AI agents must receive fine-grained, short-lived capability tokens limiting tool execution strictly to authorized domains (e.g. read-only, table-scoped, sandbox-confined).
- **Bounded Agentic Loop Execution:** Agent execution loops must enforce a hard upper bound on step iterations ($N \le 25$) and fuel/token ceilings, terminating with graceful error reporting rather than infinite recursion.

#### Pillar 22: Autonomous Tool Sandboxing & Execution Containment
- **Zero-Trust WASM Sandboxing:** Untrusted tools, plugins, and third-party scripts must execute inside isolated Wasmtime or MicroVM sandboxes with hard memory ceilings (64MB/256MB) and fuel/gas metering.
- **Linux CGroups v2 Quotas:** Containerized subagents must be constrained by Linux CGroups v2 cpu.max and memory.max ceilings to prevent noisy-neighbor host starvation.
- **POSIX Signal Containment:** Tool executors must maintain PID tracking and respond cleanly to POSIX lifecycle signals (`SIGSTOP` pause, `SIGCONT` resume, `SIGKILL` termination).

#### Pillar 23: Multi-Party Authorization Quorum (4-Eyes Principle) & RFC 3161 Timestamping
- **Dual-Authorization Quorum (4-Eyes Principle):** Critical administrative operations (changing payout bank accounts, key rotations, table drops, global policy mutations) MUST require $M$-of-$N$ (at least 2 independent) cryptographic signatures from authorized actors before execution.
- **External RFC 3161 TSA Attestation:** Statutory ledgers, tax certificates, and audit digests must be stamped by an independent external RFC 3161 Time-Stamp Authority (TSA), proving unalterable temporal existence without relying on local system clocks.
- **Time-Locked Administrative Enactment:** Destructive mutations must enforce a 24-hour timelock escrow window during which authorized security officers can trigger an emergency veto.

#### Pillar 24: Testing Ground Truth (Zero Mocks Constitution)
- **Live Backing Services:** All integration and contract tests must execute against real live Docker backing services (`PostgreSQL 16`, `Redis 7`, `NATS`, `Auth Gateway`).
- **Zero Mocks, Zero Stubs Invariant:** The codebase must be 100% free of `todo!()`, `unimplemented!()`, dummy fallback objects, or mocked API returns.
- **Zero Error-Suppression Masks:** Tests must be free of `try/catch` error suppression masks, connection-refused masks (`ECONNREFUSED` no-ops), or conditional pass skips.

---

### Domain VII: SRE Sustainability, Multi-Region DR & Operational Longevity

#### Pillar 25: Resource Bounds, OOM Protection & Async Runtime Hygiene
- **Strictly Bounded In-Memory Caches:** Unbounded in-memory collections (`HashMap<Key, Value>`) are prohibited; all caches must enforce LRU/LFU eviction with explicit byte capacity caps.
- **Structured Async Task Concurrency:** Unsupervised `tokio::spawn` or background promises are prohibited; background tasks must be managed via `JoinSet` or pass a `CancellationToken` for deterministic teardown.
- **Non-Positive Memory RSS Soak Slope:** 24-hour soak tests must demonstrate a non-positive resident memory slope ($\frac{\Delta \text{RSS}}{\Delta t} \le 0$) after cache warm-up.

#### Pillar 26: Dynamic Rate Limiting, FinOps Cost Ceilings & Denial-of-Wallet
- **Hierarchical Token Bucket Rate Limiting:** Gateways must enforce rate limiting across Global IP, Tenant Workspace, and Sensitive Endpoints with standard RFC 6585 HTTP 429 headers.
- **Hard FinOps Spend Ceilings:** External billable API consumers (LLM token generation, telephony, SMS) must track expenditure in rolling Redis windows and automatically trip circuit breakers upon budget breach.

#### Pillar 27: Multi-Region Disaster Recovery, Active-Active Topologies & Chaos Blackout Drills
- **Multi-Region Replication Architecture:** Mission-critical storage must implement cross-region replication (Active-Active or hot-standby) with mathematically proven conflict resolution (vector clocks / CRDTs).
- **Sub-30s Automated Anycast DNS Failover:** Health check probes must automatically reroute ingress traffic to secondary regions within 30 seconds of primary failure.
- **Quarterly Regional Chaos Blackout Drills:** Automated game days must simulate catastrophic regional failure, proving that RTO $\le 30\text{s}$ and RPO $\le 5\text{s}$ are preserved under full production load.

#### Pillar 28: Data Loss Prevention, Tested PITR & Recovery Drills
- **Continuous WAL Archiving:** Databases must stream continuous WAL archives to immutable cloud object storage with defined RPO $\le 60\text{s}$ and RTO $\le 15\text{m}$.
- **Automated Non-Disruptive Weekly Restore Drills:** Automated CI/CD or cron pipelines must execute weekly database restore drills into sandbox containers and verify cryptographic table checksums.
- **LLM Wiki Knowledge Sync:** Every completed architectural change, review, and incident analysis must be exported as an ISO-timestamped raw report to `docs/06_raw/` with catalog updates in `docs/06_raw/index.md` and `docs/06_raw/log.md`.

---

## 2. Senior Engineering Code Review Checklist Matrix

| # | Pillar Dimension | Mandatory Verification Criteria | Pass/Fail Gate |
| :-: | :--- | :--- | :--- |
| **1** | **Domain Integrity** | Minor-unit integers (`i64`), ISO 4217 currency, pure core, zero floats. | **PASS** only if balances use integer minor units with explicit currency. |
| **2** | **Persistence & Pools** | Atomic ACID transactions (`sqlx::Transaction`), bounded pooling (`deadpool`). | **PASS** only if all mutations are atomic and pools are bounded. |
| **3** | **Identity & Multi-Tenancy** | PostgreSQL `FORCE ROW LEVEL SECURITY`, `(role, subject)` composite uniqueness. | **PASS** only if tenant queries enforce verified session context. |
| **4** | **Formal Verification** | Algebraic conservation ($\sum \text{splits} \equiv \text{total}$), Banker's Rounding (`div_half_even`), Modulo-11 ($100\%$ rejection), Typestates, Hoare Triples ($\{P\}\ C\ \{Q\}$), LTL Model Checking ($\square \text{Safe} \wedge \Diamond \text{Terminal}$), SMT QF_LIA overflow proofs, Merkle DAG inclusion, Proptest ($\ge 10k$ runs). | **PASS** only if mathematical invariants, formal contracts, and combinatorial proofs are certified. |
| **5** | **Async Sagas & Queues** | Durable queues (Apalis/NATS), DLQ quarantine, 24h Redis leases, saga rollback. | **PASS** only if background jobs are durable, idempotent, and recoverable. |
| **6** | **Deadlock & Lock Hierarchy**| Lexicographical lock ordering, fail-closed `lock_timeout = 2s`, monotonic fencing. | **PASS** only if lock acquisitions are sorted and timeouts enforced. |
| **7** | **Anti-Entropy & Consistency**| Read-your-own-writes LSN tracking, replica lag fallback, Merkle background sync. | **PASS** only if clients read their own writes and projections reconcile. |
| **8** | **Chaos & Circuit Breakers** | External calls wrapped in circuit breakers (`failsafe`), 30s graceful drain. | **PASS** only if external outages fail closed without hanging threads. |
| **9** | **Consensus & Quorum Safety**| Majority quorum ($Q = \lfloor N/2 \rfloor + 1$), monotonic terms, linearizable reads, split-brain stepdown. | **PASS** only if distributed state machines maintain majority quorum safety. |
| **10**| **Backpressure & Concurrency**| Little's Law ($L = \lambda W$), gradient limiters, CoDel queue bounds, HTTP 503 Retry-After. | **PASS** only if services shed load adaptively before queue exhaustion. |
| **11**| **API Contract Governance** | OpenAPI 3.1 YAML frozen before code, JSON Schema Draft 2020-12, Idempotency-Key. | **PASS** only if schemas are frozen and POST/PATCH use idempotency keys. |
| **12**| **Observability & Tracing** | W3C Traceparent propagated end-to-end, structured JSON logs with PII scrubbing. | **PASS** only if distributed traces are unbroken and PII is scrubbed. |
| **13**| **Zero-Downtime Migration** | Two-phase Expand-and-Contract, reversible `.down.sql`, `CREATE INDEX CONCURRENTLY`. | **PASS** only if migrations are non-breaking and reversible. |
| **14**| **Feature Flags & Canaries** | 4-ring rollout (0%->1%->10%->100%), sub-3s automated killswitch, 30-day flag TTL. | **PASS** only if releases are phased and flags have expiration dates. |
| **15**| **DevSecOps & SSRF** | SSRF sandboxing blocking private IPs, KMS envelope encryption, zero secrets. | **PASS** only if renderers are sandboxed and tokens encrypted at rest. |
| **16**| **Supply Chain & SLSA** | Frozen lockfiles (`--locked`), CycloneDX SBOM, Cosign signing, zero high/crit CVEs. | **PASS** only if dependencies are pinned and artifacts signed. |
| **17**| **Zero-Trust Service Mesh** | Strict mTLS with SPIFFE/SPIRE X.509 SVIDs, default-deny network authorization, SNI pinning. | **PASS** only if internal RPCs authenticate via short-lived mTLS identities. |
| **18**| **Sensitive Memory Hygiene** | `ZeroizeOnDrop` memory zeroization, `Secret<T>` wrappers, `mlock` RAM pinning, `RLIMIT_CORE = 0`. | **PASS** only if cryptographic keys and secrets are zeroized on drop. |
| **19**| **Statutory Data & Fidelity** | Isolated PII Vault, Right to Erasure cryptographic tombstoning, Storybook 5-state WCAG 2.2 AA. | **PASS** only if PII is protected and UI meets WCAG 2.2 AA. |
| **20**| **Immutable Audit Trails** | WORM audit ledger, SHA-256 Merkle chaining, trigger mutation locks, actor non-repudiation. | **PASS** only if administrative mutations produce signed Merkle records. |
| **21**| **AI Agent Safety & Firewalls**| Dual-LLM intent firewall, tool least-privilege scoping, loop step ceilings ($N \le 25$), schema validation. | **PASS** only if agent inputs are filtered and tool execution is bounded. |
| **22**| **Autonomous Tool Sandboxes** | Wasmtime/MicroVM sandboxing (64MB cap), cgroups v2 quotas, POSIX signal containment. | **PASS** only if untrusted tools execute in metered, signal-controlled sandboxes. |
| **23**| **Quorum (4-Eyes) & TSA** | 4-Eyes dual authorization for high-impact mutations, external RFC 3161 TSA timestamping. | **PASS** only if critical mutations require multi-party quorum and TSA tokens. |
| **24**| **Testing Ground Truth** | 100% operational code against live Docker backing services; zero mocks, zero stubs. | **PASS** only if tests run against real services without dummy stubs. |
| **25**| **Resource Bounds & Hygiene**| Strictly bounded LRU/LFU caches, supervised `JoinSet` task cancellation, soak $\le 0$. | **PASS** only if collections are bounded and task lifecycles supervised. |
| **26**| **FinOps & Rate Limiting** | Multi-tier token bucket rate limiting (429 headers), hard daily LLM spend ceilings. | **PASS** only if rate limits are enforced and budget ceilings hard-trip. |
| **27**| **Disaster Recovery & Drills**| Multi-region active-active topology, sub-30s DNS failover, quarterly chaos blackout drills. | **PASS** only if cross-region failover is tested and verified. |
| **28**| **PITR & Wiki Knowledge Sync**| Continuous WAL archiving, tested weekly restore drills, ISO export in `docs/06_raw/`. | **PASS** only if backups are empirically tested and docs indexed. |

---

### 2.1 Dedicated Formal Verification & Mathematical Proof Review Checklist

Whenever reviewing code touching financial balances, statutory tax compliance, lifecycle state machines, cryptographic ledgers, or core algorithms, the reviewer MUST verify all 10 formal verification criteria:

- [ ] **1. Algebraic Conservation Laws:** Does the integer split sum strictly equal the input amount ($\sum_{i=1}^n \text{split}_i \equiv \text{total}$)? Zero minor unit (ISO 4217 atomic integer) creation or destruction.
- [ ] **2. Banker's Rounding Half-Even:** Is midpoint rounding unbiased (`div_half_even`), eliminating upward/downward drift across repeated billing and settlement cycles?
- [ ] **3. Combinatorial Exhaustive Check:** Are check-digit algorithms (e.g. Modulo-11) tested against 100% of single-digit mutations and transpositions with zero false acceptances across $9,000+$ adversarial vectors?
- [ ] **4. Typestate Pattern (Compile-Time FSM):** Are invalid state transitions (e.g. `Terminated -> Active`, `Paid -> Unpaid`) rejected at compile time via phantom type parameters or typestates?
- [ ] **5. Axiomatic Hoare Triples:** Are preconditions ($\text{Requires}$), postconditions ($\text{Ensures}$), and loop invariants explicitly defined for critical algorithmic functions ($\{P\}\ C\ \{Q\}$)?
- [ ] **6. Termination Proof (Loop Variant):** Do loops define a strictly decreasing ranking function ($V_{k+1} < V_k$) bounded below by zero, mathematically guaranteeing termination?
- [ ] **7. Temporal Logic Model Checking:** Do asynchronous protocols satisfy safety ($\square \text{Safe}$: bad states never happen) and liveness ($\Diamond \text{Done}$: terminal states reachable) properties without deadlock or starvation?
- [ ] **8. SMT Linear Integer Arithmetic (QF_LIA):** Are arithmetic operations bounded and proven free of signed/unsigned 64-bit integer overflow/underflow via Z3/CVC5 theories?
- [ ] **9. Cryptographic Merkle Inclusion:** Does the ledger generate verifiable SHA-256 Merkle proofs verifying auditability ($H_n = \text{SHA256}(H_{n-1} \parallel \dots)$) without exposing full database contents?
- [ ] **10. Property-Based Invariant Fuzzing:** Does the test suite execute $\ge 10,000$ property runs (Proptest / QuickCheck) covering extreme boundary values ($0$, $1$, $\text{MAX} - 1$, $\text{MAX}$)?

---

### 2.2 Dedicated AI Agent & Autonomous Safety Review Checklist

Whenever reviewing code touching AI agent runtimes, tool execution, LLM prompts, or autonomous workflows, the reviewer MUST verify all 6 autonomous safety criteria:

- [ ] **1. Prompt Injection & Jailbreak Defense:** Are all untrusted user and sensory inputs filtered through an isolated classification model before ingestion into system prompts?
- [ ] **2. Tool Capability Least-Privilege:** Are agent tool tokens constrained to the minimal scope required for the task, preventing unauthorized tool calls?
- [ ] **3. Hard Loop Iteration Ceilings:** Is the agent execution loop bounded by a strict maximum iteration counter ($N \le 25$) and timeout?
- [ ] **4. WASM & CGroups Containment:** Are untrusted tools executed in sandboxes with hard memory limits ($\le 64\text{MB}$) and fuel metering?
- [ ] **5. POSIX Signal Control:** Does the deployer process support immediate pause (`SIGSTOP`), resume (`SIGCONT`), and emergency termination (`SIGKILL`)?
- [ ] **6. Schema Output Gate:** Are LLM tool calls and outputs validated against strict JSON Schemas with zero raw eval or injection?

---

## 3. Governance Integration & Review Decision Rules

Reviewers (both AI agents and human technical leads) MUST evaluate pull requests and goal artifacts against all 28 pillars:

| Review Outcome | Required Action |
| :--- | :--- |
| **APPROVE** | All 28 pillars confirmed compliant with verifiable evidence. Goal status may advance to `approved` via automated evidence verification or human sign-off. |
| **REQUEST CHANGES** | One or more pillars fail verification (e.g. floating-point math, missing RLS, unbounded cache, missing `.down.sql`). Goal remains in `in_progress` or `review`. |
| **SECURITY VETO** | Critical security violation detected (Pillar 15 SSRF leak, Pillar 16 supply chain vulnerability, Pillar 24 mock in production code, Pillar 21 unmitigated prompt injection). Immediate execution halt. |

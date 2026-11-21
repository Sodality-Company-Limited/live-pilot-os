# G-CORE-034: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-034 (Implement soda-worktree-prune skill and fleet garbage collection driver)
- System Archetype: backend-service / fleet-governance
- Bounded Context: Worktree Orchestration & Subagent Lifecycle Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Prune Command Trigger, GC Lifecycle Scheduler
- **Driven Outbound Ports:** Git Worktree Subprocess Engine, File System Unlink Adapter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/worktree-prune-driver.mjs`).

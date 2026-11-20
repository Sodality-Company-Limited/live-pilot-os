# G-CORE-036: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-036 (Implement soda-multiphase-planner skill and DAG plan compiler)
- System Archetype: backend-service / planner-compiler
- Bounded Context: Multi-Phase Planning & DAG Orchestration Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Plan Compiler Inbound Port, CLI Plan Trigger
- **Driven Outbound Ports:** Topological Sorter, Diagnostic Error Reporter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/multiphase-plan-compiler.mjs`).

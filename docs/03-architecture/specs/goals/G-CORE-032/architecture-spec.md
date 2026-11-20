# G-CORE-032: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-032 (Implement soda-architectural-arena skill and multi-solution bake-off engine)
- System Archetype: backend-service / decision-support
- Bounded Context: Architecture Evaluation & Decision Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Architectural Candidate Evaluator, Multi-Criteria Assessment Gate
- **Driven Outbound Ports:** Pareto Frontier Filter, Cryptographic Decision Receipt Logger
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/architectural-arena-engine.mjs`).

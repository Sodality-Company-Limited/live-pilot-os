# G-CORE-033: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-033 (Implement soda-blast-radius-analyzer skill and semantic impact tracing engine)
- System Archetype: backend-service / static-analysis
- Bounded Context: Dependency Analysis & Change Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Blast Radius Query Interceptor, Pre-Execution Touch Map Gate
- **Driven Outbound Ports:** AST Dependency Graph Traversal Engine, Impact Set Reporter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/blast-radius-analyzer.mjs`).

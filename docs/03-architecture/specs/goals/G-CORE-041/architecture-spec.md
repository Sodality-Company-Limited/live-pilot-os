# G-CORE-041: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-041 (Implement soda-autonomous-diagnostician skill and failure isolation engine)
- System Archetype: backend-service / diagnostic-engine
- Bounded Context: Autonomous Error Isolation & Hypothesis Diagnostics Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Diagnostic Command, Test Runner Error Hook
- **Driven Outbound Ports:** Stack Trace Parser, Hypothesis Evaluator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/autonomous-diagnostician.mjs`).

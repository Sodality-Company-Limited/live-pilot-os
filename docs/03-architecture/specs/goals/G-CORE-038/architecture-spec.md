# G-CORE-038: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-038 (Implement soda-epistemic-trace-auditor skill and reasoning transparency trace validator)
- System Archetype: reasoning-transparency / epistemic-governance
- Bounded Context: Epistemic Traceability & Reasoning Transparency Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Reasoning Audit Command, Pre-Commit Reasoning Gate
- **Driven Outbound Ports:** Epistemic Log Storage, Proof Receipt Generator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/epistemic-trace-auditor.mjs`).

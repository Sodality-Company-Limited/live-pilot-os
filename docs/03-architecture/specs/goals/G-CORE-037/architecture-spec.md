# G-CORE-037: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-037 (Implement soda-reflection-engine skill and blindspot scanner)
- System Archetype: backend-service / static-analyzer
- Bounded Context: Socratic Reflection & Cognitive Assurance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Diff Scanner Inbound Port, Reflection CLI Trigger
- **Driven Outbound Ports:** Rule Catalog Repository, Audit Report Formatter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/reflection-engine.mjs`).

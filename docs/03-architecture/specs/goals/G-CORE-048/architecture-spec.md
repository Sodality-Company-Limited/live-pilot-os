# G-CORE-048: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-048 (Implement soda-ast-type-invariants skill and type contract linter)
- System Archetype: backend-service / type-contract-linter
- Bounded Context: Type System Engineering & Semantic Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Type Lint Command, CI Pipeline Type Invariant Hook
- **Driven Outbound Ports:** TypeScript AST Parser Adapter, Diagnostic Reporter, Union Discriminating Analyzer
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/ast-type-invariants.mjs`).

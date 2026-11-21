# G-CORE-047: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-047 (Implement soda-semantic-refactor-engine skill and refactor analyzer)
- System Archetype: backend-service / refactoring-analyzer
- Bounded Context: Code Quality Engineering & Semantic Refactoring Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Refactor Analyze Command, Code Review Refactor Hook
- **Driven Outbound Ports:** File System AST Reader, Test Runner Adapter, Equivalence Verifier
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/semantic-refactor-engine.mjs`).

# G-CORE-043: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-043 (Implement soda-concept-doc-extractor skill and mental model documentation engine)
- System Archetype: backend-service / documentation-generator
- Bounded Context: Conceptual Knowledge Extraction & Mental Model Documentation Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Concept Extraction Trigger, Post-Goal Documentation Hook
- **Driven Outbound Ports:** Source AST Inspector, Markdown Specification Generator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/concept-doc-extractor.mjs`).

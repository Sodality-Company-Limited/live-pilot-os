# G-CORE-044: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-044 (Implement soda-skill-authoring-compiler skill and skill validation engine)
- System Archetype: backend-service / skill-compiler
- Bounded Context: Skill Lifecycle Engineering & Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Skill Scaffold Command, Ecosystem Parity Linter Hook
- **Driven Outbound Ports:** File System Writer, Template Parity Validator, AgentSkills.io Schema Validator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/skill-authoring-compiler.mjs`).

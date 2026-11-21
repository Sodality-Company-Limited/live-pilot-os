# G-AG-006: Hexagonal Architecture & Ports Specification

- Goal: G-AG-006 (Record compact session telemetry and failure fingerprints)
- System Archetype: backend-service / runtime-governance
- Bounded Context: Agent Runtime & Subagent Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Session Orchestrator
- **Driven Outbound Ports:** Provider Adapter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js.

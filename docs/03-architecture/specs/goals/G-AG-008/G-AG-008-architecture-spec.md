# G-AG-008: Hexagonal Architecture & Ports Specification

- Goal: G-AG-008 (Prepare provider-neutral bounded session contracts)
- System Archetype: backend-service / runtime-governance
- Bounded Context: Agent Runtime & Subagent Governance Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Session Orchestrator
- **Driven Outbound Ports:** Provider Adapter
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js.

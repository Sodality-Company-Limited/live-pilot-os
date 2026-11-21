# G-CORE-046: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-046 (Implement soda-intent-playbook-router skill and task intent classifier)
- System Archetype: backend-service / intent-router
- Bounded Context: Semantic Intent Classification & Autonomous Playbook Routing Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Prompt Router Command, Autonomous Swarm Coordinator Intent Classifier
- **Driven Outbound Ports:** Registered Skills Catalog Scanner, BDD Scenario Skeleton Generator, Confidence Ranking Engine
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/intent-playbook-router.mjs`).

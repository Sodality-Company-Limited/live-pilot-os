# G-CORE-035: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-035 (Implement soda-autopilot-runner skill and autonomous fleet supervisor)
- System Archetype: sre-control-plane / fleet-governance
- Bounded Context: Autonomous Orchestration & Fleet Supervisor Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Autopilot CLI Trigger, Cron Trigger
- **Driven Outbound Ports:** Goal CLI Subprocess Engine, Process Exit Controller
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/autopilot-runner.mjs`).

# G-CORE-045: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-045 (Implement soda-empirical-eval-runner skill and multi-trial benchmark evaluator)
- System Archetype: backend-service / eval-runner
- Bounded Context: Empirical Agent Evaluation & Benchmark Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** CLI Eval Run Trigger, CI Benchmark Evaluation Gate
- **Driven Outbound Ports:** Trial Execution Engine, Cryptographic Proof Receipt Generator, Zero-Float Metric Evaluator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/empirical-eval-runner.mjs`).

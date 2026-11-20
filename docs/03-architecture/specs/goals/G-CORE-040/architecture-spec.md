# G-CORE-040: Hexagonal Architecture & Ports Specification

- Goal: G-CORE-040 (Implement soda-visual-parity-guard skill and perceptual diff verification engine)
- System Archetype: visual-testing / perceptual-diff-engine
- Bounded Context: Visual Parity & Perceptual Regression Guard Domain

## Ports & Adapters Topology
- **Driving Inbound Ports:** Visual Parity CLI, Visual Diff Verification Gate
- **Driven Outbound Ports:** Headless Chromium Capture Engine, Perceptual Diff Calculator
- **Zero-Mock Conformance:** 100% concrete ESM implementation in Node.js (`scripts/lib/visual-parity-guard.mjs`).

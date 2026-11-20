# G-CORE-040: Threat Modeling & Defensive Boundaries Specification

- Goal: G-CORE-040 (Implement soda-visual-parity-guard skill and perceptual diff verification engine)

## STRIDE Threat Analysis
- **Tampering / Corrupted Baselines:** Baseline images are verified against cryptographic SHA-256 hashes recorded in goal evidence receipts.
- **Denial of Service / Massive Image Payloads:** Pixel buffers are bounded by maximum width/height constraints (e.g. 4096x4096px).
- **Repudiation:** Every visual diff verification emits a machine-readable JSON scorecard with exact pixel mismatch count and percentage.

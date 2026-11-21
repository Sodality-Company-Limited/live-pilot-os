# G-AG-001: Mathematical & System Invariants Formal Specification

- Goal: G-AG-001 (Enforce single-persona and touch-map contracts)
- Mathematical Provenance: Zero float math, exact integer arithmetic.

## Invariant Laws
1. **Single Persona Law:** Every subagent session MUST identify exactly one persona.
2. **Touch Map Confinement Law:** All file writes MUST be strictly confined within declared touch map paths.
3. **Token Ceiling Invariant:** Input and output token ceilings are enforced independently.

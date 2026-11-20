# G-CORE-046: Threat Modeling & Defensive Boundaries Specification

- Goal: G-CORE-046 (Implement soda-intent-playbook-router skill and task intent classifier)

## STRIDE Threat Analysis
- **Prompt Injection & Hijacking:** Prompt tokenization strips delimiter escape attempts and validates prompt length ($L \le 4096$ chars).
- **Repudiation / Nondeterminism:** Intent routing decisions emit deterministic confidence scores and transparent matching rule audit traces.

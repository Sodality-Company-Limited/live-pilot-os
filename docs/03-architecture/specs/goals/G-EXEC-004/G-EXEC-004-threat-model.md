# Threat Model: G-EXEC-004: Schema Integrity

1. **Schema Injection & Field Smuggling:**
   - *Mitigation:* `additionalProperties: false` rejects unmapped fields.
2. **Missing Causation/Correlation Lineage:**
   - *Mitigation:* Required transport headers enforced on every published event.
3. **Ambiguous Execution Mode:**
   - *Mitigation:* Mandatory `mode` property matching `X-Mode` header, preventing simulated responses from masquerading as confirmed transactions.

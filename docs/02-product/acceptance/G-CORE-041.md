# Acceptance Contract: G-CORE-041

- Title: Implement soda-autonomous-diagnostician skill and failure isolation engine
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/autonomous-diagnostician.test.mjs`

## Criteria
- Given an error stack trace with file and line references, when parsed by the diagnostician, then it extracts the exact file path, line number, and error category.
- Given a parsed failure context, when generating hypotheses, then the diagnostician outputs actionable, falsifiable probe definitions.

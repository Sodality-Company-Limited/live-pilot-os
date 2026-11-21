# Acceptance Contract: G-CORE-033

- Title: Implement soda-blast-radius-analyzer skill and semantic impact tracing engine
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/blast-radius-analyzer.test.mjs`

## Criteria
- Given a set of modified source files, when analyzed, then the complete transitive closure of importing files is calculated without cyclic infinite loops.
- Given a declared goal touch map, when calculated blast radius files fall outside the touch map, then the analyzer emits a fail-closed boundary escape violation.

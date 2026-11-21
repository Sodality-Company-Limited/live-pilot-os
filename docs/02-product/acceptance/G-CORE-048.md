# Acceptance Contract: G-CORE-048

- Title: Implement soda-ast-type-invariants skill and type contract linter
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/ast-type-invariants.test.mjs`

## Criteria
- Given TypeScript source code files, when analyzed by the AST type invariants engine, then it detects and flags any usage of `any`, untyped public exports, and non-discriminated union variants.
- Given complex domain states, when structured with discriminating unions, then the linter verifies compile-time exhaustive switch checks without fallback holes.

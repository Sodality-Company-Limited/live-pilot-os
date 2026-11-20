# Acceptance Contract: G-CORE-049

- Title: Implement soda-release-readiness-verifier skill and pre-PR certifier
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/release-readiness-verifier.test.mjs`

## Criteria
- Given an active branch prior to PR creation or goal release, when audited by the release readiness verifier, then it deterministically executes all required verification gates (clean working tree, 100% green tests, formal proof receipts, zero unhandled errors).
- Given framework core files touched by a goal, when certified, then it verifies dual-touch parity between root and template before release certification passes.

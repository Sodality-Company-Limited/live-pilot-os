# G-CORE-049: Threat Modeling & Defensive Boundaries Specification

- Goal: G-CORE-049 (Implement soda-release-readiness-verifier skill and pre-PR certifier)

## STRIDE Threat Analysis
- **Repudiation / Unverified PRs:** Shipping PRs without passing automated gates risks regressions and governance drift; prevented by mandatory pre-PR certification.
- **Tampering / Untracked Drift:** Undetected modifications outside touch map break repository invariants; verifier requires clean git working trees.

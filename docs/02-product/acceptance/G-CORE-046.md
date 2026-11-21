# Acceptance Contract: G-CORE-046

- Title: Implement soda-intent-playbook-router skill and task intent classifier
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/intent-playbook-router.test.mjs`

## Criteria
- Given an unstructured user prompt, when analyzed by the router, then it maps the prompt to matching registered `soda-*` skills with monotonic confidence scoring.
- Given a classified intent match, when generating an execution roadmap, then it produces a structured Given-When-Then BDD scenario skeleton and recommended next actions without stochastic variation.

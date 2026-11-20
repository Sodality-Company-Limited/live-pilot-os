# Acceptance Contract: G-CORE-043

- Title: Implement soda-concept-doc-extractor skill and mental model documentation engine
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/concept-doc-extractor.test.mjs`

## Criteria
- Given a source code file with exported functions and classes, when processed by the extractor, then it produces a structured mental model specification with entity definitions.
- Given a generated concept document, when validated, then every referenced code link points to an existing file and valid line number.

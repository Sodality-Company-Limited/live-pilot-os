---
name: soda-concept-doc-extractor
description: Automated conceptual mental model, invariant, and design rationale documentation engine. Generates standardized concept specs with verified file:line citations from source code AST exports.
version: 1.0.0
triggers:
  - concept doc extractor
  - mental model documentation
  - invariant extractor
  - architectural rationale
  - concept spec
touches:
  - scripts/lib/concept-doc-extractor.mjs
  - tests/lib/concept-doc-extractor.test.mjs
---

# Concept Doc Extractor Skill

## Overview
The `soda-concept-doc-extractor` skill inspects source files and AST export structures to extract:
1. **Domain Mental Models:** Exported class models, value objects, and entity lifecycles.
2. **Operational Capabilities:** Exported functions, method contracts, and caller expectations.
3. **Formal Invariants & Causal Rationales:** Embedded invariant docstrings ("why this way and not the obvious way"), precondition rules, and bounds.
4. **Citation Verification:** Enforces that every markdown citation link points to an existing file and accurate line number.

## Architecture & Interfaces
Exported from `scripts/lib/concept-doc-extractor.mjs`:
- `extractConceptsFromSource(source, filePath)`: Extracts entities, functions, and invariants from source code.
- `generateConceptSpec(manifest)`: Generates formatted GitHub-flavored markdown concept specifications.
- `validateConceptCitations(specMarkdown, sourceFileMap)`: Validates that all clickable `file:///` line links resolve correctly against source files.

## Verification
- Formal Invariants:
  - `INV-043-001`: Extraction Determinism ($\text{Extract}(S) \equiv \text{Extract}(S)$).
  - `INV-043-002`: Concept Completeness (Generated specifications contain non-empty entities, functions, and invariants).
  - Citation Integrity Invariant: 100% verified links with zero broken references.
- Unit Tests: `tests/lib/concept-doc-extractor.test.mjs`

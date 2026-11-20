# G-CORE-043: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-043 (Implement soda-concept-doc-extractor skill and mental model documentation engine)

## FSM State Matrix
```text
[SourceDiscovered] ---> (inspect_ast_exports) ---> [ExportsExtracted]
[ExportsExtracted] ---> (derive_mental_model) ---> [MentalModelConstructed]
[MentalModelConstructed] ---> (correlate_invariants) ---> [InvariantsCorrelated]
[InvariantsCorrelated] ---> (generate_concept_spec) ---> [SpecGenerated]
[SpecGenerated] ---> (validate_citations) ---> [CitationsVerified]
```

## Rollback & Compensation Policies
- Failed or invalid extractions do not overwrite existing architectural documents; errors are reported cleanly to the caller.

# G-CORE-048: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-048 (Implement soda-ast-type-invariants skill and type contract linter)

## FSM State Matrix
```text
[SourcesDiscovered] ---> (parse_ts_ast) ---> [AstConstructed]
[AstConstructed] ---> (scan_for_any_types) ---> [AnyAudited]
[AnyAudited] ---> (verify_union_discriminants) ---> [UnionsAudited]
[UnionsAudited] ---> (verify_return_signatures) ---> [SignaturesAudited]
[SignaturesAudited] ---> (emit_type_compliance_receipt) ---> [AuditPassed]
```

## Rollback & Compensation Policies
- Detection of prohibited `any` or malformed unions emits exit code 1 fail-closed, blocking CI pipeline progression.

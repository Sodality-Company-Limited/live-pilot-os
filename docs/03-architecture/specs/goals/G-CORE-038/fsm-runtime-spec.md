# G-CORE-038: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-038 (Implement soda-epistemic-trace-auditor skill and reasoning transparency trace validator)

## FSM State Matrix
```text
[TraceReceived] ---> (parse_steps) ---> [TraceParsed]
[TraceParsed] ---> (verify_epistemic_links) ---> [LinksVerified]
[LinksVerified] ---> (audit_citations) ---> [CitationsAudited]
[CitationsAudited] ---> (on_valid) ---> [TraceApproved]
[CitationsAudited] ---> (on_invalid) ---> [AuditRejectedFailClosed]
```

## Rollback & Compensation Policies
- Rejected traces halt agent advancement without modifying backlog or goal state.

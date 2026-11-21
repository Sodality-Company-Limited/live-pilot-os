# G-CORE-073: FSM Runtime Specification

| State | Trigger | Guard | Failure handling |
|---|---|---|---|
| accepted | valid input | scope/schema/idempotency valid | reject invalid input |
| processing | bounded call | capability and deadline valid | timeout becomes unknown |
| completed | durable receipt | lineage valid | append audit evidence |
| deferred | stale/unavailable | fail-closed policy | reconcile or request review |

# G-CORE-056: FSM Runtime Specification

| State | Trigger | Guard | Failure handling |
|---|---|---|---|
| accepted | valid contract input | scope/schema/idempotency valid | reject invalid input |
| processing | bounded service/adapter call | deadline and capability valid | timeout becomes unknown |
| completed | durable receipt/event | lineage and schema valid | append audit evidence |
| deferred | stale/unavailable/low confidence | fail-closed policy | reconcile or request review |

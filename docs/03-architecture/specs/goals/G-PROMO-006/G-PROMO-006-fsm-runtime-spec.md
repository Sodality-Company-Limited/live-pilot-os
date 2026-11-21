# G-PROMO-006: FSM Runtime Specification

| State | Trigger | Guards | Failure/compensation |
|---|---|---|---|
| proposed | proposal accepted | session/catalog/schema/idempotency valid | reject without mutation |
| pending | policy or approval started | current revision and durable receipt | remain pending or expire |
| approved | approval recorded | margin/inventory/pause checks current | reject stale approval |
| issued | observed adapter success | matching action and observed state | unknown if confirmation absent |
| unknown | timeout or divergence | reconcile before retry | DLQ or reconciled result |
| expired/cancelled | lifecycle timer/control | authorized transition | preserve prior evidence |


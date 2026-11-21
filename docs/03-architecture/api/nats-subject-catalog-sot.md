# NATS Subject Catalog SOT

> **Status:** Required async inventory; use the [NATS template](nats-subject-message-template.md).

> **Current state:** No subject is approved yet. AsyncAPI generation is blocked
> until producers, consumers, schemas, delivery, retry/DLQ, retention, replay
> ownership, and compatibility verification are registered for each subject.

Each subject requires a catalog row before implementation:

| Field | Example |
|---|---|
| Subject | `livepilot.v1.inventory.reservation.request` |
| Kind | command/query/reply/event/job/control |
| Producer | `inventory-service` |
| Consumers | `execution-service`, `audit-service` |
| Schema | file path + version + SHA-256 |
| Ordering key | `reservation_id` |
| Delivery | request/reply or JetStream at-least-once |
| Retry/DLQ | classification, max attempts, DLQ subject |
| Retention | duration and storage limit |
| Replay | owner and authorization |
| Verification | producer/consumer compatibility command |

Subject names must not contain tenant or user values. Commands are not facts. Events
are published after the owning transaction commits. Consumers acknowledge only after
durable state/effect and must tolerate duplicates and additive fields.

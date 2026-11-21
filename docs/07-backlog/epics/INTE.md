# INTE epic — Intent/Risk service

This epic delivers one independently deployable `intent-risk-service` before any
cross-service integration. The service owns intent classification, question
clustering, moderation-risk facts, durable evidence lineage, and versioned signal
events. It does not own approval, margin, inventory, promotion, platform mutation,
or the audit ledger.

## Sequence

`G-CORE-065` contract → `G-CORE-066` domain engine → `G-CORE-067` persistence/outbox
→ `G-CORE-068` authenticated handler → `G-CORE-069` runtime package →
`G-CORE-070` DigitalOcean release verification.

## Scope boundary

The canonical goal cards remain `G-CORE-065` through `G-CORE-070` because those IDs
are already allocated and have active implementation evidence in this repository.
`INTE` is the product epic/routing label for the Intent/Risk service wave; no new
duplicate goal IDs are created. Any future goals for this service must allocate
from the INTE registry sequence and must not add behavior to the CORE cards.

## Release rule

The service is eligible for cross-service integration only after G-CORE-070 has a
revision-bound `PASS` or `PASS-SIMULATED` receipt, with DigitalOcean production
apply remaining subject to explicit human approval.

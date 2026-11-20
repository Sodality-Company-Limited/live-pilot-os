# LivePilot OS Deep Context

> Canonical deep-context entry point for LivePilot OS architecture, product intent,
> capability boundaries, and source documents.

## Architecture entry point

- [Architecture Overview](./overview.md)

## Canonical source documents

- [LivePilot OS Feature Map — Detailed Canonical Specification](./live-pilot-os-feature-map.md)
- [LivePilot OS Features — Core Summary](./live-pilot-os-core-features.md)
- [LivePilot OS Sub-features — Quick Reference](./live-pilot-os-sub-features.md)
- [LivePilot OS — Business Model Canvas](./live-pilot-os-business-model-canvas.md)

## Deep-context operating model

LivePilot OS coordinates live-commerce operations across four bounded capabilities:

1. **Live Chat & Telemetry Understanding** analyzes live signals and produces structured intent,
   engagement, question, and risk events.
2. **Streamer Co-pilot HUD** turns verified signals into short, evidence-based host guidance.
3. **StreamPilot Agent** proposes or executes bounded store actions such as product pinning,
   vouchers, and inventory reservations.
4. **Compliance & Operator Control** governs approval, audit, moderation escalation, and
   emergency pause across all consequential actions.

The governing flow is:

```text
observe → classify → recommend → verify policy → approve/execute → reconcile → audit
```

## Non-negotiable invariants

| Invariant | Required behavior |
|-----------|-------------------|
| Catalog grounding | Product Q&A uses brand-approved catalog facts only; unknown or medical claims are escalated. |
| Margin protection | Discounts and vouchers pass the server-side contribution-margin floor before issuance. |
| Inventory safety | Cross-channel reservations are atomic and returned when a promotion expires without payment. |
| Idempotent execution | Delayed or repeated platform responses must not create duplicate coupons or actions. |
| Operator sovereignty | Approval modes and Emergency Pause can stop automated actions immediately. |
| Traceability | AI proposals, deterministic verdicts, platform state, and operator decisions are audit-visible. |
| Script respect | Co-pilot guidance is glanceable and complements the host's existing selling rhythm. |

## Source precedence

When documents conflict, resolve them in this order:

1. Approved architecture decisions and explicit acceptance contracts.
2. This deep-context entry point for the canonical LivePilot OS model.
3. The detailed feature map and core-feature specification.
4. The sub-feature quick reference and business-model canvas.

Unresolved product or architecture intent must be recorded as an assumption or decision;
agents must not silently invent a new platform contract, financial rule, or workflow state.

## Context loading contract

For LivePilot OS work, load this document first, then only the linked source document required
by the goal's touch map. A goal that changes a flow must identify the affected capability,
events, policy gate, operator control, and verification evidence.

## Related architecture

- [Architecture Overview](./overview.md)
- [API contract source](./api/README.md)
- [Data policy source](./data/README.md)
- [Soda OS design specification](./design-spec.md)

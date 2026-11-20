
# LivePilot OS Source of Truth

- [Architecture Overview](../overview.md)

## Canonical Source Documents

- [Project Brief — LivePilot OS](../../02-product/project-brief.md)
- [Business Case — LivePilot OS](./live-pilot-os-business-case.md)
- [Requirements Baseline — LivePilot OS](./live-pilot-os-requirements.md)
- [Domain and Event Model](./live-pilot-os-domain-model.md)
- [Integration Boundaries](./live-pilot-os-integration-boundaries.md)
- [Technology Stack](./live-pilot-os-tech-stack.md)
- [Goal Generation Completeness Contract](./goal-generation-completeness.md)
- [LivePilot OS Feature Map — Detailed Canonical Specification](./live-pilot-os-feature-map.md)
- [LivePilot OS Features — Core Summary](./live-pilot-os-core-features.md)
- [LivePilot OS Sub-features — Quick Reference](./live-pilot-os-sub-features.md)
- [LivePilot OS — Business Model Canvas](./live-pilot-os-business-model-canvas.md)
- [Information Architecture and UX Flow — G-UX-041](../ux/G-UX-041.md)
- [UI Specification — G-UX-041](../../02-product/design/G-UX-041.md)
- [Live OS Design Token Proposal](../ux/live-os-design-tokens.md)
- [Runtime Design Tokens](../../../src/tokens.css)

### UX and visual-design authority

The G-UX-041 UX flow is the reference for Host/Live Ops roles, information hierarchy, shared-session behavior, screen states, and responsive behavior. Its UI specification defines screen and component behavior. The token proposal defines semantic intent; `src/tokens.css` is the canonical value source used by the UI.

**Approval status:** The UX flow, UI specification, and token proposal are drafts pending Product/Design approval. Keep them as proposals until approval is recorded; do not treat a draft as a frozen implementation contract.

## Authority and status

The requirements baseline is the canonical list of requirement IDs. The feature map and core/sub-feature documents provide source detail; they do not create additional IDs. Product, business, domain, and integration documents state whether content is confirmed, derived, proposed, or still undecided. If sources conflict, do not silently choose one: record the conflict and keep affected goals in `draft`/`planned` until resolved.

For a generated Goal, cite requirement IDs and source headings from this index. Use the [Goal Generation Completeness Contract](./goal-generation-completeness.md) before promoting a Goal to `ready`.

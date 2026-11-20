# LivePilot OS — UX/UI SOT Index

> **Status:** Canonical UX/UI SOT index for component-first and IA-first specification.
> **Parent:** [Architecture overview](../overview.md)
> **API bridge:** [UI/API binding SOT](ui-api-binding-sot.md)
> **Test bridge:** [UI test specification SOT](ui-test-specification-sot.md)

Read the relevant UX/UI SOT before generating screens, components, or frontend tests.
No implementation may silently override a higher-level SOT.

| Authority | Purpose |
|---|---|
| [Information architecture](information-architecture-sot.md) | Screens, routes, navigation, roles |
| [Component contracts](component-contract-sot.md) | Props, events, states, dependencies |
| [UI state machine](ui-state-machine-sot.md) | Loading, pending, unknown, failure, recovery |
| [UI/API binding](ui-api-binding-sot.md) | UI actions to API/events and state rendering |
| [Design-system registry](design-system-component-registry.yaml) | Approved components and token rules |
| [Responsive layout](responsive-layout-sot.md) | Breakpoints, collapse, overflow, touch |
| [Accessibility interaction](accessibility-interaction-sot.md) | Keyboard, screen reader, WCAG, focus |
| [Content and microcopy](content-microcopy-sot.md) | User copy, safety, message keys |
| [Realtime UI behavior](realtime-ui-behavior-sot.md) | SSE/WebSocket event rendering and replay |
| [UI test specification](ui-test-specification-sot.md) | Component, visual, accessibility, locale tests |
| [UX observability](ux-observability-sot.md) | Privacy-safe UX telemetry and Web Vitals |
| [Visual evidence](visual-evidence-provenance-sot.md) | Baselines, assets, screenshots, provenance |

Generation order:

```text
BRD/BDD → IA → screen → component → state machine → API/realtime binding
  → accessibility/content/responsive rules → UI test specification → evidence
```

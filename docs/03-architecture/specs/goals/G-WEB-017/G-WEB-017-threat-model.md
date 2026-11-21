# G-WEB-017 — Threat Model

## Scope and trust boundaries

- **Authoritative inputs:** the requester direction and checked-in UX, UI, localization, and token documents.
- **Build boundary:** local app and Storybook tooling.
- **Browser boundary:** static app and story rendering; no authenticated or personal data is introduced.
- **External services:** none.

## Relevant threats and controls

| Threat | Control | Residual limit |
|---|---|---|
| Orange foreground/background pairing is hard to read | Require WCAG 2.2 AA normal-text contrast (4.5:1) and verify focus contrast | Evidence applies to inspected color pairings only |
| Color alone conveys status | Preserve semantic status colors, text labels, and accessible names | Full product accessibility review remains separate |
| App and Storybook diverge | Keep one imported token source and compare both renderers | Build success alone does not prove visual parity |
| Theme work expands into behavior or external claims | Restrict changes to tokens, global app styling, and visual documentation | Later session work needs its own goal |

## Security conclusion

No authorization or consequential action is in scope. The theme update adds no credentials, personal data, external calls, or state mutation.

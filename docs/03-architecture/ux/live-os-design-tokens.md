# Live OS design tokens

**Status:** Dark theme with orange accent requested on 2026-11-21.<br>
**Source of truth:** [`src/tokens.css`](../../../src/tokens.css)<br>
**Design references:** [Live OS UX flow](live-os-ux-flow.md) · [UI specification](../../02-product/design/live-os-ui-specification.md)

This is a Live OS product layer. It preserves the existing Soda OS token contract and its global reference; it does not replace `docs/03-architecture/design-tokens.md`. Live OS uses a warm dark theme with Shopee orange (`#EE4D2D`) for primary accents and headings, as requested on 2026-11-21. A lighter orange is used for focus. Semantic success, warning, danger, and info colors keep their existing meanings.

## Token contract

| Group | Semantic tokens / scale |
|---|---|
| Color | `bg`, `surface`, `surface-raised`, `surface-inset`, `text`, `muted`, `text-subtle`, `border`, `border-strong`, `primary`, `primary-fg`, `success`, `warning`, `danger`, `info`, `focus` |
| Type | Inter; Noto Sans Thai fallback; Fira Code for mono. 12, 14, 16, 18, 20, 24, 30, 36px; line heights 1.25/1.5; weights 400/500/600/700. |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64px. |
| Radius | 4, 8, 12, 9999px. |
| Elevation | none, sm, md, lg; tile/dialog aliases use md/lg. |
| Breakpoints | sm 640px, md 768px, lg 1024px, xl 1280px. |
| Motion | 150ms / 200ms, ease-out; reduced-motion disables nonessential transitions. |

## Contrast check

Ratios below are calculated from the CSS colors using the WCAG relative-luminance formula. Shopee orange text on the surface meets AA; the requested exact brand color does not meet AAA for normal text on this surface. Primary fills use near-black foreground and meet AA.

| Pair | Contrast |
|---|---:|
| Text / canvas | 17.10:1 |
| Muted / canvas | 8.95:1 |
| Subtle / canvas | 7.10:1 |
| Text / raised surface | 14.16:1 |
| Muted / raised surface | 7.41:1 |
| Orange primary / canvas | 5.31:1 |
| Orange primary / surface | 4.90:1 |
| Lighter orange / surface | 7.26:1 |
| Primary foreground / primary fill | 5.31:1 |
| Primary foreground / hover fill | 7.88:1 |
| Primary foreground / pressed fill | 4.74:1 |
| Text / surface | 15.77:1 |
| Border / surface | 3.37:1 |

Recheck any new foreground/background pairing when adding components. Use the near-black primary foreground on orange fills; do not place normal-sized white text on the orange primary, hover, or pressed fills.

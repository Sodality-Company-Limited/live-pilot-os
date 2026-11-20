# Live OS design tokens — G-UX-041 proposal

**Status:** Draft · single dark theme.<br>
**Source of truth:** [`src/tokens.css`](../../../src/tokens.css)<br>
**Parent design:** [G-UX-041 UX flow](G-UX-041.md) · [UI spec](../../02-product/design/G-UX-041.md)

This is a Live OS product layer. It preserves the existing Soda OS token contract and its global reference; it does not replace `docs/03-architecture/design-tokens.md`. Live OS intentionally uses one warm dark theme, with Shopee orange as its accent.

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

Ratios below are calculated from the CSS colors using the WCAG relative-luminance formula. Core foreground pairs meet AA for normal text; the Shopee-orange button uses near-black foreground.

| Pair | Contrast |
|---|---:|
| Text / canvas | 17.10:1 |
| Muted / canvas | 8.95:1 |
| Subtle / canvas | 7.10:1 |
| Shopee accent / canvas | 5.26:1 |
| Primary foreground / primary fill | 5.26:1 |
| Text / surface | 15.77:1 |
| Border / surface | 3.37:1 |

Recheck any new foreground/background pairing when adding components. Shopee orange is not used with white text on the bright dark-theme orange; the dark-theme button foreground is near-black.

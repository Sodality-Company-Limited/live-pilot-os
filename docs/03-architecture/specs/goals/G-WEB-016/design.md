# G-WEB-016 — Frontend Foundation Design

## Intent & Architectural Rationale

Build one small Live OS web app and an isolated Storybook surface so the approved Host and Live Ops shells can be reviewed before session behavior is added. Keep the app under the requester-confirmed `apps/web/` boundary, reuse the existing token source, and make no backend or platform claims.

## Goals, Non-Goals & Anti-Goals

- Build with the Hackathon-selected Next.js App Router and TypeScript direction.
- Render the approved Host and Live Ops shell compositions as separate Storybook stories.
- Import `src/tokens.css` as the single token source and expose semantic aliases to Tailwind utilities.
- Keep the shell truthful when no session data is supplied; represent values as unavailable.
- Keep Thai UI copy behind typed message keys and meet the UX/localization SOT accessibility and responsive constraints.

- No API client, API response fixture, realtime transport, identity, authorization, domain state, promotion action, or live platform integration.
- No new route hierarchy beyond the one app entry surface needed for the foundation; role screens remain isolated Storybook stories in this goal.
- No token value changes, production deployment, or support for additional locales in this Hackathon shell.
- Never present fabricated metrics or controls as working behavior.

## Approaches Considered & Rejected Alternatives

| Approach | Benefits | Costs / reason not selected |
|---|---|---|
| Next.js App Router + Storybook in `apps/web/` | Matches Hackathon stack direction; isolates product UI; stories render each role independently | Adds app/build dependencies and requires shared-token import across the workspace boundary |
| Extend `public/live-os-demo.html` | Smallest immediate static page | Does not provide the approved Next.js app direction or component Storybook workflow |
| Put the Live OS app in repository-root `src/` | Simple relative token access | Mixes the product app with existing Soda/DAVE source and does not provide an app boundary |

## Selected Approach & Trade-off Analysis

Use a dedicated npm app in `apps/web/` with Next.js App Router, TypeScript, Tailwind CSS, and Storybook's Next.js Vite framework with its accessibility addon. The current [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation) supports the selected app setup; Storybook recommends [`@storybook/nextjs-vite`](https://storybook.js.org/docs/get-started/frameworks/nextjs) for new Next.js projects. The CLI will select compatible stable versions at setup time. Import the existing root token file directly from the Next app and Storybook preview; do not copy its declarations. Tailwind `@theme inline` aliases reference those CSS custom properties without introducing replacement values.

The Next app entry renders the Host shell as a preview. Storybook supplies the independent Host and Live Ops stories; no new product route or role-switching behavior is introduced until IA defines it.

Trade-off: one extra web package and Storybook configuration are accepted to give the approved roles a repeatable component review surface. API and behavior remain deferred to later goals.

## Bounded Context & Touch Map Invariants

- Bounded context: Live OS presentation foundation.
- Allowed write area: `apps/web/`, goal-specific documentation/specs, and the approved UX/UI source files already in this Goal touch map.
- `src/tokens.css` is read/import only.
- Do not modify shared tracking files directly during execution; use Soda goal synchronization commands for status/index updates.
- No HTTP, event, authorization, or external service port is added.

## UI structure and state

- Host shell regions: session header, simulated 9:16 stage/chat, audience topic log, product signals, Host cue.
- Live Ops shell regions: session controls, the shared stage/chat and signals, offer guardrails, decision trace.
- Stories contain no API data. Absent metrics are rendered as unavailable/blank; shell controls are disabled and explain that preview actions are not wired.
- Session status is one combined indicator that explicitly identifies simulated mode and playback state. Pause affects simulated playback only.
- Host cue exposes one Ignore action; this foundation does not mutate session state.

## Responsive, accessibility, and content constraints

- Use canonical viewport classes from `docs/03-architecture/ux/responsive-layout-sot.md`: compact `<768px`, tablet `768–1279px`, desktop `≥1280px`, wide `≥1440px`; minimum width `390px`, no horizontal scroll.
- Use semantic landmarks, accessible names, visible focus, logical CSS properties, reduced-motion behavior, and 44×44px minimum interactive targets.
- Meet WCAG 2.2 AA normal-text contrast (4.5:1) under the approved Live OS Hackathon exception in the localization SOT; this exception does not change the default AAA target for other surfaces.
- Put all visible Thai labels in typed `th-TH` message keys. Do not add localized currency or date data because no session values are present.

## Acceptance Test & TDD Verification Strategy

1. `npm --prefix apps/web run build` passes TypeScript/Next production compilation.
2. `npm --prefix apps/web run storybook:build` passes and includes both role stories.
3. Review stories at 390px, tablet, desktop, and wide viewports; check no horizontal overflow, semantic order, disabled preview controls, and unavailable values.
4. Run Storybook accessibility checks and inspect every text/background pair against the approved AA target.
5. Run the goal and architecture conformance harnesses; record exact revision and outputs before review.

No unit-test suite is added for static layout-only components; automated builds, Storybook accessibility checks, and the acceptance review are the finite evidence for this Goal.

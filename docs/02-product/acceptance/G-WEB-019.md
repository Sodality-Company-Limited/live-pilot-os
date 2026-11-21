# G-WEB-019 — Acceptance contract

- **Goal:** G-WEB-019 — Render Host Product Signals from a Validated Snapshot
- **Status:** planned; verification has not been run.
- **Requirement:** REQ-LP-003, REQ-LP-016
- **Preconditions:** Do not execute until G-WEB-016 foundation is available and G-WEB-018 has an approved versioned field mapping, freshness semantics, numeric units and privacy boundary. The full runtime binding is not included.

## Scenarios
1. Given an agreed complete typed snapshot, the Host panel presents the five matching values with approved labels and units; values are not recalculated as domain policy.
2. Given an actual numeric zero, the panel renders zero; given absent or unavailable input, it renders an accessible unavailable label rather than zero.
3. Given stale or partial input, affected values are identified using the approved freshness semantics without presenting them as current.
4. Existing Host and Live Ops shell callers continue to render without fabricated data; the panel remains keyboard and screen-reader accessible at the approved 390px minimum width.

## Verification
- [ ] `node --test apps/web/tests/product-signals.test.mjs` after the new test exists: complete values; real zero; missing and partial values; stale values; locale-aware money; existing Host and Live Ops callers; keyboard/screen reader and 390px overflow.
- [ ] `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` after implementation.
- [ ] Record revision-bound evidence and any unavailable upstream separately; no release is certified by this draft.

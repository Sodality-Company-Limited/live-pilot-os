# LivePilot frontend and Portal BFF — goal context

**Baseline:** HEAD `18fcddf085346e392c027a85e50258926ed23473`; working-tree documents and frontend also contain uncommitted changes. This context records the working-tree state inspected on 2026-11-21, not a claim that it is committed.

## Request and slice

The requester asked for goals focused on the frontend and Portal BFF after locating the repository API specifications. The first planned slice is a session-overview read at the browser boundary and a separately testable product-signals presentation component. These goals do not claim to cover the complete Host/Live Ops journey.

## Evidence

- `docs/02-product/project-brief.md` and `docs/03-architecture/live-pilot-os-requirements.md` (`REQ-LP-003`, `REQ-LP-016`) specify product signals and separate views over the same simulated session.
- `docs/03-architecture/api/portal-bff/README.md` and `portal-bff/openapi.yaml` identify the browser-facing `getLiveSessionOverview` read and its security boundary.
- `docs/03-architecture/api/api-operation-catalog-sot.md`, `sot-reconciliation.md`, and `openapi.yaml` show that the operation is draft and the current `LiveSessionOverview` does not define clicks, cart count, price, numeric stock, per-field freshness, or all the stated catalog guarantees. No missing field is invented here.
- `docs/03-architecture/api/contract-validation-report.md` records structural checks but blocks producer/consumer compatibility. `docs/03-architecture/api/services/README.md` assigns domain state to services and requires independent compatibility evidence.
- `apps/web/src/components/live-shell.tsx` renders unavailable placeholders for five signals; `apps/web/src/components/live-shell.stories.tsx` contains role-shell stories. `apps/web/package.json` has build, lint and Storybook commands but no application test script.
- `docs/03-architecture/ux/live-os-ux-flow.md`, `docs/02-product/design/live-os-ui-specification.md`, `docs/03-architecture/ux/ui-api-binding-sot.md`, `ui-state-machine-sot.md`, and `docs/03-architecture/localization-sot.md` establish empty/partial/error states, accessible semantics, the Hackathon's en-US and WCAG AA exception, and server-authoritative state.
- Existing `G-WEB-016` and `G-WEB-017` are blocked; they cover static shell and color work, not a real API read or data-bound signals.

## Outcome and dependency map

| Requirement | Scope in this slice | Goal | Coverage |
|---|---|---|---|
| REQ-LP-003 | Safe browser-bound session snapshot for product signals | G-WEB-018 | Partial; upstream projections, approved DTO and compatibility remain prerequisites |
| REQ-LP-003 | Present the five Host product signals | G-WEB-019 | Partial; product selection and data binding are separate work |
| REQ-LP-016 | Reuse the existing role shell for Host product signals | G-WEB-019 | Partial; Live Ops binding, mock stage/chat and shared session are deferred |
| REQ-LP-004, 008, 009, 010, 013, 015, 017 | Cue, promotion, stock lifecycle, decisions and authentication | Deferred | Not covered by this slice |

The goal dependency is `G-WEB-018 → G-WEB-019`; connecting the completed panel to the route requires a separate future binding goal. Both remain planned until their explicit gates are met. Auth/session prerequisites and Core BFF/service gates are external dependencies, not silently assigned to these two goals. No implementation or platform behavior is certified by these drafts.

## Draft validation

Both goal cards passed `goal-template-conformance-harness.mjs` (51/51 checks each) and `architecture-design-conformance-harness.mjs` (9/9 checks each). These are structural checks only; the incomplete DTO, upstream evidence and unimplemented tests leave semantic readiness blocked.

## Full frontend and Portal BFF integration roadmap

The following planned cards extend the initial slice. Contract and upstream evidence remain prerequisites; this mapping does not certify readiness. Existing G-WEB-018 and G-WEB-019 remain part of the roadmap.

| Goal | Outcome | Requirement |
|---|---|---|
| G-WEB-020 | Server-derived Portal Session Context | REQ-LP-017 |
| G-WEB-021 | Trusted Portal-to-Gateway Transport | REQ-LP-016 |
| G-WEB-022 | Portal Login Route | REQ-LP-017 |
| G-WEB-023 | Portal Session Read Route | REQ-LP-017 |
| G-WEB-024 | Portal Logout Route | REQ-LP-017 |
| G-WEB-025 | Portal Session Event Stream | REQ-LP-016 |
| G-WEB-026 | Portal Promotion Proposal Route | REQ-LP-009 |
| G-WEB-027 | Portal Promotion Decision Route | REQ-LP-013 |
| G-WEB-028 | Portal Promotion Read Route | REQ-LP-008 |
| G-WEB-029 | Portal Action Log Read Route | REQ-LP-012 |
| G-WEB-030 | Host and Live Ops Login Screen | REQ-LP-017 |
| G-WEB-031 | Role-Scoped UI Access Gate | REQ-LP-017 |
| G-WEB-032 | Session Logout Control | REQ-LP-017 |
| G-WEB-033 | Bind Role Views to Session Overview | REQ-LP-003 |
| G-WEB-034 | Reconnect Session Events in the Browser | REQ-LP-016 |
| G-WEB-035 | Audience Topic Log Binding | REQ-LP-001 |
| G-WEB-036 | Host Cue Binding | REQ-LP-004 |
| G-WEB-037 | Selected Product Detail Binding | REQ-LP-004 |
| G-WEB-038 | Live Ops Offer Review | REQ-LP-009 |
| G-WEB-039 | Live Ops Proposal Submission | REQ-LP-009 |
| G-WEB-040 | Live Ops Decision Submission | REQ-LP-013 |
| G-WEB-041 | Promotion Status for Both Roles | REQ-LP-013 |
| G-WEB-042 | Live Ops Decision Trace | REQ-LP-012 |
| G-WEB-043 | Simulated Live Stage and Chat | REQ-LP-016 |
| G-WEB-044 | Simulated Session Controls | REQ-LP-016 |
| G-WEB-045 | Simulated Viewer Coupon Banner | REQ-LP-008 |
| G-WEB-046 | Validate Host and Live Ops Integration Journey | REQ-LP-013 |

The operation inventory covers login, session, logout, overview, event stream, proposal, decision, promotion and action log. Simulation-control operations are not in the current Portal BFF inventory; their goal remains planned pending contract reconciliation. Product/domain services and real marketplace integration are out of scope.

## Coverage and remaining decisions

| Selected requirement | Frontend/BFF goals | Remaining authority or boundary |
|---|---|---|
| REQ-LP-001 | G-WEB-025, G-WEB-034, G-WEB-035 | Topic/ratio DTO and event contract; calculation remains upstream |
| REQ-LP-003 | G-WEB-018, G-WEB-019, G-WEB-033 | Complete overview fields and freshness contract |
| REQ-LP-004 | G-WEB-036, G-WEB-037 | Approved cue and catalog mapping |
| REQ-LP-008, 010, 015 | G-WEB-028, G-WEB-041, G-WEB-045 | Service owns simulated issuance, reservation, expiry and reconciliation; UI only displays observed state |
| REQ-LP-009 | G-WEB-026, G-WEB-038, G-WEB-039 | Margin calculation and policy remain in the domain service |
| REQ-LP-013 | G-WEB-027, G-WEB-040, G-WEB-041, G-WEB-046 | Confirmed approval/rejection and unknown outcomes require upstream evidence |
| REQ-LP-016 | G-WEB-018, G-WEB-025, G-WEB-033, G-WEB-034, G-WEB-043, G-WEB-044 | Shared session and simulation control contract must be approved |
| REQ-LP-017 | G-WEB-020, G-WEB-022, G-WEB-023, G-WEB-024, G-WEB-030, G-WEB-031, G-WEB-032 | Identity and session security boundaries require upstream evidence |

REQ-LP-012 is not selected for the demo but its documented Portal BFF action-log operation is covered by G-WEB-029 and G-WEB-042. Other non-selected requirements remain outside this roadmap. All generated cards are planned; passing structural checks does not establish semantic readiness.

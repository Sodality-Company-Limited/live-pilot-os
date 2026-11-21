# G-WEB-018 — Architecture Specification

## Outcome and sources
An authorized browser can retrieve a session overview through the Portal BFF. Trace: `REQ-LP-003, REQ-LP-016` in `docs/03-architecture/live-pilot-os-requirements.md`; project brief; `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/ux/live-os-ux-flow.md`.

## Boundary
Use the existing Next.js app route convention and the approved shared server session/gateway interfaces when those prerequisites exist. Validate the path and approved DTO at the boundary, enforce server-derived tenant/session visibility, retain correlation, redact sensitive data, and map documented errors. Do not create a new ad-hoc auth or transport protocol.

## Prerequisites
Do not execute until overview schema, error mapping, session/transport interfaces, and independently green upstream service and Core BFF evidence are available. Review the route prefix boundary and current Next.js documentation first.

## Evidence
node --test apps/web/tests/session-overview-route.test.mjs after implementation; app lint and build. These validate only the declared boundary and do not certify unavailable upstream services.

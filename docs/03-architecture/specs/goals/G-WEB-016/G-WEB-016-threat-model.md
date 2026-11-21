# G-WEB-016 — Threat Model

## Scope and trust boundaries

- **Authoritative inputs:** checked-in requirement, architecture, UX/UI, token, and localization documents.
- **Build boundary:** package-manager dependencies and app/Storybook build tools execute locally/CI.
- **Browser boundary:** static stories display approved presentation structure and contain no secrets or authenticated session data.
- **External services:** none. No API, identity provider, or marketplace platform is called.

## Relevant threats and controls

| Threat | Control in this goal | Residual limit |
|---|---|---|
| Story implies fabricated or live commerce data | Keep absent metrics unavailable; no API fixtures or live labels | Data-backed states require a later contract-bound goal |
| UI diverges from product intent | Implement only the IA/UI specification approved on 2026-11-21; changes outside it require review | Approval does not certify the separate token specification |
| Token drift between app and stories | Import the one repository token source; prohibit copied values | Token source quality is not changed here |
| Dependency/build supply-chain issue | Use project-approved dependency and lockfile practices when workspace is confirmed | Dependency audit/production hardening are not certified by a successful build |
| Inaccessible shell control | Semantic regions and visible keyboard focus are acceptance criteria | Full WCAG audit belongs to the applicable accessibility goal/review |

## Security conclusion

No authorization or consequential action is in scope. The static foundation must not contain credentials, personal data, or real platform access. Build success is not a security certification.

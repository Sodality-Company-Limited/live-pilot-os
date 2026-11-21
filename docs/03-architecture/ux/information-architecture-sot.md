# LivePilot OS — Information Architecture SOT

> **Status:** Canonical target for screen, route, navigation, and permission hierarchy.
> **Inputs:** BRD, BDD, requirements, domain states, and route-prefixing SOT.

## Hierarchy

```text
Tenant → Organization → Workspace → Campaign → Live Session
                                      ├── Host workspace
                                      └── Live Ops workspace
```

Every screen declares `screen_id`, route, parent, actor roles, required capability,
session scope, entry conditions, exit actions, deep-link behavior, and loading/error/
empty/pending/unknown states. Navigation visibility is not authorization; every API
operation re-authorizes server-side.

## Primary navigation

| Area | Host | Live Ops | Required scope |
|---|---|---|---|
| Session overview | read | read/control | live session |
| Live stage and chat | read/use cues | observe | live session |
| Product and inventory | view | view/control | campaign/session |
| Suggestions and alerts | use/edit/dismiss | review | session |
| Promotions and approvals | request | approve/reject | campaign/session |
| Decision trace and audit | limited | read/export | tenant/session |
| Risk controls and pause | no | control | session/control plane |

Route changes preserve tenant/session context, support refresh/deep link, and never
expose an unauthorized resource through navigation or error text.

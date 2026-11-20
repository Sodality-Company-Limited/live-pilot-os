# Query, Pagination, and API Versioning SOT

> **Status:** Canonical API style contract.

## Queries

- Cursor pagination is the default for changing collections; offset is allowed only
  for bounded static reports.
- Responses include `items`, `next_cursor`, `has_more`, `applied_filters`, and
  `as_of`/freshness metadata where projections are eventually consistent.
- Every collection declares maximum page size, stable sort, filter grammar, and
  authorization behavior for empty or inaccessible results.
- Sort keys are deterministic and include a unique tie-breaker.

## Versioning

- Public HTTP uses `/v1/*`; incompatible changes require `/v2/*` or a separately
  versioned media/schema contract.
- Additive response fields are compatible; changing meaning, type, requiredness,
  authorization, ordering, or error semantics is breaking.
- Deprecated routes emit `Deprecation` and `Sunset` metadata and remain documented
  through the approved migration window.
- Internal `/internal/v1/*` and NATS major subjects follow the same compatibility rule.

# G-WEB-019 — Invariants

1. A value shown or returned must come from the authorized, approved contract; missing is not zero.
2. A stale or unknown result cannot be reported as current success.
3. The boundary never trusts browser-supplied tenant or role as authority and never exposes raw sensitive data.
4. Consumes the approved overview-derived presentation input; does not alter API or invent missing DTO fields.

These are executable test obligations, not a claimed formal proof. Test cases: complete values; real zero; missing and partial values; stale values; locale-aware money; existing Host and Live Ops callers; keyboard/screen reader and 390px overflow.

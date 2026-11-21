# G-WEB-018 — Threat Model

Forged role or tenant headers, cross-tenant identifiers, leaked sensitive fields and raw upstream errors are rejected or redacted. Use server-side session and approved gateway identity only.

Verification covers the scoped cases in `docs/02-product/acceptance/G-WEB-018.md`. An unavailable security or upstream dependency blocks execution; do not infer that a simulated fixture certifies a real boundary.

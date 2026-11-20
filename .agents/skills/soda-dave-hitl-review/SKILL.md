---
name: soda-dave-hitl-review
version: "1.0.0"
description: >-
  DAVE Human-in-the-Loop Review Engine — compiles compact, auditable DAVE Review
  Packets, evaluates multi-expert conflict matrices, and manages interactive human
  approval gates and decision ledger recording.
  Triggers: dave review, dave show-review-packet, dave approve.
---

# DAVE Human-in-the-Loop Review

This skill defines the operational procedure for generating review packets and processing human sign-offs.

## Operational Steps

1. **Compile Review Packet:** Extract decision summary, references, confidence, risks, assumptions, rejected alternatives, and verification plans into the standardized ASCII/Markdown Review Packet.
2. **Evaluate Conflicts:** Detect domain contradictions across experts (e.g. UX aesthetics vs WCAG contrast) and present unresolved conflicts with explicit trade-offs.
3. **Present Human Actions:** Provide interactive checkboxes: `[Approve]`, `[Reject]`, `[Request Revision]`, `[Approve with Conditions]`.
4. **Append Audit Ledger:** Upon human sign-off, record the cryptographic approval signature to `.agents/audit/decisions.jsonl`.

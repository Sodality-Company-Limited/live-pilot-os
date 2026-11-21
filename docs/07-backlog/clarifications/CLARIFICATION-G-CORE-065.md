# CLARIFICATION-G-CORE-065 — Intent/Risk pilot policy assumption

## Decision status

Accepted as a reversible implementation assumption for the simulated Hackathon pilot. It is not a claim of moderation accuracy or production policy approval.

## Policy

- Supported risk categories: `SPAM`, `TOXIC`, `SCAM`, `OFF_PLATFORM`, and `COORDINATED_BOT`.
- Category precedence is conservative: `SCAM` and `OFF_PLATFORM` are `HIGH`; `COORDINATED_BOT` is `HIGH`; `TOXIC` is `MEDIUM`; `SPAM` is `LOW` unless an active coordinated pattern raises it to `HIGH`.
- `CRITICAL` is reserved for an explicit emergency/control-plane signal and is not inferred from chat classification alone.
- Normalized score bands for the pilot policy version `risk-policy-pilot-v1`: `[0.00,0.50)` LOW, `[0.50,0.75)` MEDIUM, `[0.75,0.90)` HIGH, `[0.90,1.00]` CRITICAL; category precedence may raise severity but never lower it.
- Recommended handling: LOW `ignore`, MEDIUM `filter` or `alert`, HIGH `escalate`, CRITICAL `escalate` plus the downstream control-plane policy when separately authorized.
- Missing policy, unsupported language, redaction failure, ambiguous evidence, and out-of-range scores produce `DEFERRED` or `REJECTED`, never `LOW` or `ignore`.

## Evidence and limits

This decision is derived from REQ-LP-002, F01.2 flows, the BDD statement that off-platform attempts create a high-risk escalation, and the F04 risk-control severity flows. The thresholds are pilot defaults requiring later calibration against moderation evidence; they do not certify precision, recall, or production safety.

# Policy Evaluation and Precedence SOT

Policy is evaluated server-side in this order: global safety → tenant → workspace → campaign/session → actor capability → operation-specific rule. The most specific applicable version may tighten a constraint but may not weaken a higher-level safety invariant.

Each decision records policy ID/version, input hash, scope, actor, authorization context, timestamp, verdict, reason code, and correlation/causation IDs. Missing, expired, conflicting, or unverifiable policy returns a fail-closed verdict. Clients may display a decision but cannot author it.

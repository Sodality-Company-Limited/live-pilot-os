# Quality engineering rule

Every executable goal must run `software-quality-scorecard-harness.mjs` before review. The result must include timestamp, source revision, command exit codes, and P0–P4 findings. P0 means score zero and stops promotion; P1 requires a fix or explicit human waiver. A green simulated harness does not certify an unavailable external service. Completed goals must register an observation or explain why no post-ship signal exists.

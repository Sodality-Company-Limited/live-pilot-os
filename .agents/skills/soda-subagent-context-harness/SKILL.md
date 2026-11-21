---
name: soda-subagent-context-harness
version: "1.0.0"
description: Build and validate a step-scoped subagent context harness that sends only minimal goal context, allowed files, compact digests, and deltas; use when reducing subagent input tokens or preventing repeated context.
---

# Soda Subagent Context Harness

Use this skill when implementing or auditing subagent context assembly, input-token reduction,
touch-map enforcement, prompt deduplication, or partial-goal handoffs.

## Required behavior

The coordinator may retain the full goal context. Each subagent must never read or receive the
full goal file. The coordinator must compile and send only a validated
step packet containing:

- current step objective;
- relevant acceptance criteria;
- one role and exactly one stable persona;
- step `allowed_files` within the declared touch map;
- minimum relevant excerpts or file references;
- compact, source-cited context digest;
- unresolved blockers;
- current verification command.

Never let a subagent open the goal file directly. Never send the full goal card, full work plan, completed steps, unrelated criteria, full Wiki
corpus, or repository-wide context.

## Harness gates

1. Require `goalId`, `stepId`, role, persona, objective, allowed files, and verification command.
2. Reject forbidden full-context fields such as `goal`, `fullGoal`, `fullWorkPlan`,
   `repositoryContext`, or `wikiCorpus`.
3. Enforce the allowed-file limit and ensure files are inside the subagent touch map.
4. Estimate input tokens before spawn and reject packets above the configured hard limit.
5. Hash the compiled packet and reject duplicate hashes for the same goal.
6. For follow-ups, allow only changed files, new deltas, and unresolved evidence.
7. Return compact evidence: packet hash, estimated tokens, allowed files, and validation errors.

## Implementation boundary

Keep packet compilation separate from provider execution. The harness validates and compiles the
packet; the provider adapter decides whether a validated packet may be spawned. Do not let the
harness read or forward the entire repository to simplify packet construction.

## Verification

Test at minimum:

- valid minimal packet compilation;
- full-goal context rejection;
- touch-map and allowed-file overflow rejection;
- duplicate packet rejection;
- input-token ceiling rejection;
- delta-only follow-up behavior.

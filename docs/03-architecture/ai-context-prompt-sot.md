# LivePilot OS — AI Context and Prompt SOT

## Context assembly

JEV assembles context from normalized signals, approved catalog facts, current live
session state, policy revision, locale, and explicit scenario. It must not pass raw
database tables, hidden credentials, unrelated tenant data, or unredacted PII.

## Prompt contract

Prompts are versioned artifacts with an owner, schema revision, allowed tools,
locale, token budget, model/provider target, safety instructions, and evaluation
fixtures. Prompt text alone cannot authorize a consequential action.

## Grounding

Every factual product claim must reference a catalog evidence ID and version. Missing,
stale, conflicting, or unsupported facts produce a clarification or deferral rather
than an invented answer.

## Scenario separation

The frontend may inject scenario signals; the backend supplies mock products. The
prompt must receive the scenario as an explicit field, never infer it from UI copy.
Opportunity and threat evaluations must remain independently replayable.

# LivePilot OS — OpenAI Provider SOT

> **Status:** Approved provider candidate; implementation requires an owned adapter and release evidence.

## Position in the system

OpenAI is an inference provider behind the JEV provider port. OpenAI output is
untrusted recommendation data. It is never a policy engine, approval authority, or
marketplace executor.

## API contract

- Use the OpenAI Responses API through a server-side adapter.
- Use strict Structured Outputs for typed JEV results where supported.
- Validate the result again against local schemas and business invariants.
- Handle refusal, incomplete output, timeout, rate limit, transport failure, and
  schema failure as explicit non-success states.
- Do not expose the API key, raw provider response, or hidden prompt to the browser.

## Allowed workloads

OpenAI may perform intent classification, semantic question grouping, risk signal
proposal, and Thai host-cue drafting from approved catalog facts. It may suggest a
discount but may not calculate or approve the final margin, stock, or voucher action.

## Data controls

Send the minimum normalized context required. Redact credentials, payment data,
factory-sensitive details not required for the task, and unnecessary personal data.
Provider retention, regional processing, DPA, and zero-retention eligibility must be
recorded as deployment decisions before production customer data is sent.

## Release controls

Model ID, provider account/project, prompt revision, JSON schema revision, evaluation
set, safety thresholds, and cost/latency budget are versioned together. Model changes
require replay evaluation against opportunity and threat scenarios.

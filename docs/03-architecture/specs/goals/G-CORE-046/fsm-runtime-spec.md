# G-CORE-046: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-046 (Implement soda-intent-playbook-router skill and task intent classifier)

## FSM State Matrix
```text
[PromptReceived] ---> (tokenize_and_extract_entities) ---> [TokensExtracted]
[TokensExtracted] ---> (match_skill_triggers) ---> [TriggersScored]
[TriggersScored] ---> (sort_monotonic_confidence) ---> [CandidatesRanked]
[CandidatesRanked] ---> (generate_bdd_skeleton) ---> [RoutingPlanEmitted]
```

## Rollback & Compensation Policies
- Prompts that fail to achieve minimum confidence thresholds fall back cleanly to Socratic clarification without executing code.

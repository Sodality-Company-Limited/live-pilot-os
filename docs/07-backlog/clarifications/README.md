# Clarifications Archive Directory

This directory stores archived, completed, or active goal-partitioned clarification state machine files (`CLARIFICATION-{GOAL_ID}.md`).

## Protocol Overview
1. When clarifying requirements for a goal (e.g. `G-CORE-001`), the active state file is maintained as `CLARIFICATION-{GOAL_ID}.md` in the project root.
2. During execution or upon reaching `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`, the clarification file is archived into this directory:
   `docs/07-backlog/clarifications/CLARIFICATION-{GOAL_ID}.md`
3. The resolver library (`scripts/lib/clarification-resolver.mjs`) automatically locates clarification files across both root and this archive directory, supporting legacy `CLARIFICATION.md` migration seamlessly.

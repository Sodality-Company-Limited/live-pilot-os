---
name: soda-goal-generation
version: "1.0.0"
description: Generate canonical Soda OS atomic goal files from deep context using the exact goals/_template.md; use when the user says "generate goals", "create goals", or asks to decompose requirements into goals.
---

# Soda Goal Generation

Use this skill when the user asks to generate, create, decompose, or draft goals. Antigravity is
the designated context and goal-generation authority for deep-context requests. Codex and Claude
must consume Antigravity's generated context/goal artifacts rather than independently
reinterpreting the deep context, unless the user explicitly assigns them goal-generation duty.

## Required outcome

Create canonical goal artifacts and goal-scoped satellite specifications, not only a chat list or JSON manifest:

```text
docs/07-backlog/goals/G-xxx.md
docs/02-product/acceptance/G-xxx.md
docs/03-architecture/specs/goals/G-xxx/G-xxx-architecture-spec.md
docs/03-architecture/specs/goals/G-xxx/G-xxx-invariants-formal-spec.md
docs/03-architecture/specs/goals/G-xxx/G-xxx-fsm-runtime-spec.md
docs/03-architecture/specs/goals/G-xxx/G-xxx-threat-model.md
docs/03-architecture/specs/goals/G-xxx/G-xxx-worktree-plan.md
```

The artifacts must be semantically complete, not merely structurally conformant. Passing the
template harness is necessary but insufficient. Every goal generated must generate its own dedicated
satellite specifications and contract modules.

## Authority gate

For deep-context requests, require a persisted, source-cited Antigravity context artifact before
drafting. It must identify its source context, revision, derived intent, atomic outcomes,
repository evidence, and validation result. Missing, stale, or contradictory artifacts are a
hard generation stop for Codex and Claude. They may validate or mechanically repair an existing
canonical artifact, but may not fill in missing intent, acceptance criteria, dependencies,
touch-map paths, or verification commands.

## Procedure

1. Read the project brief, architecture overview, design specification, active backlog, relevant
   rules, and the exact `_template.md` before drafting.
2. Read `docs/07-backlog/active-goals-context.md` when the request concerns the agent-runtime
   goals; otherwise compile the equivalent repository-grounded context before drafting.
3. Read existing implementation and test paths only as needed to ground the goal; do not invent
   files, commands, APIs, architecture, or acceptance evidence.
4. Identify independent outcomes and split them into the smallest verifiable goals.
5. Use `_template.md` as the structural contract, but replace every example, placeholder, and
   irrelevant domain-specific section with project-specific content.
6. Fill every applicable section: Intent, Problem and Value, In/Out, dependencies, assumptions,
   risks, work steps, touch map, acceptance criteria, test plan, architecture design, and audit
   evidence.
7. Use real repository paths in every touch map and work step. Use real commands that exist in
   the repository. Use acceptance evidence that can actually be produced.
8. Remove irrelevant template material; never retain generic Cargo, payment, GPU, financial,
   or concurrency examples unless the goal genuinely requires them.
9. Mark unknowns as `[NEEDS CLARIFICATION]` or `planned`; do not mark a goal `ready` when its
   intent, scope, touch map, or verification is not grounded.
10. Do not implement application code or execute the generated goals.
11. Autonomously generate the goal's dedicated satellite specifications in `docs/03-architecture/specs/goals/G-xxx/` (architecture, invariants, FSM, threat model, worktree plan) and ensure `docs/07-backlog/goals/G-xxx.md` links directly to them.
12. Run the goal-template conformance harness and the architecture conformance harness for every
    generated goal. Treat semantic placeholder detection as a failure even if structural checks pass.
13. Update the applicable goal index/queue only after validation passes.
14. Report absolute links to all generated files and both structural and semantic validation results.

## Semantic completeness gates

Before returning a generated goal, verify:

- The title and outcome describe the same single result.
- The goal is traceable to supplied project context or an existing decision.
- Every work step has a real objective, allowed files, command, completion gate, and stop condition.
- Every acceptance criterion is measurable and maps to a test or reviewable artifact.
- Every touch-map path exists or is explicitly a new path required by the goal.
- The test plan matches the repository's actual stack and scripts.
- Assumptions and risks are specific to this goal.
- No bracketed template examples, generic domain examples, or unrelated architecture remain.

## Provider parity gate

For deep-context goal generation, use this provider flow:

```text
Antigravity: inspect context → derive intent → generate goal cards → validate evidence
Codex/Claude: consume generated context → execute only assigned goal steps
```

Codex and Claude must not silently regenerate or reinterpret Antigravity's goal context. If the
context artifact is missing, stale, or inconsistent, report the exact artifact gap and request a
new Antigravity context pass. They may correct mechanical formatting or validation defects, but
must not change intent, scope, dependencies, touch maps, or acceptance criteria autonomously.

## Atomicity gates

Reject or split a goal when it has multiple outcomes, personas, owners, unrelated touch-map areas, vague acceptance criteria, or no finite verification command. Mark unresolved requirements `[NEEDS CLARIFICATION]`; do not invent them.

The generated goal files are the deliverable. A summary may accompany them but cannot replace them.
This workflow applies equally to Codex, Claude, Antigravity, and any other agent using the skill.

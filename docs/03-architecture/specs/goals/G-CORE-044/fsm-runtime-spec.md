# G-CORE-044: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-044 (Implement soda-skill-authoring-compiler skill and skill validation engine)

## FSM State Matrix
```text
[InputReceived] ---> (validate_meta_schema) ---> [SchemaValidated]
[SchemaValidated] ---> (render_canonical_skill) ---> [SkillRendered]
[SkillRendered] ---> (verify_dual_touch) ---> [ParityVerified]
[ParityVerified] ---> (write_skill_artifacts) ---> [ArtifactsWritten]
```

## Rollback & Compensation Policies
- Compilation failures or schema validation rejections halt execution fail-closed without modifying file systems.

# Acceptance Contract: G-CORE-044

- Title: Implement soda-skill-authoring-compiler skill and skill validation engine
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/skill-authoring-compiler.test.mjs`

## Criteria
- Given a raw skill specification with metadata fields, when processed by the compiler, then it generates a canonical `SKILL.md` compliant with AgentSkills.io standards and standard architectural sections.
- Given an authored skill, when validated for ecosystem parity, then it verifies dual-touch existence across `.agents/skills/` and `template/.agents/skills/`.

---
name: soda-skill-authoring-compiler
description: Automated agent skill compiler, validator, and dual-touch parity engine. Validates AgentSkills.io YAML frontmatter, renders canonical markdown skill sections, and enforces bitwise parity between root and template skill directories.
version: 1.0.0
triggers:
  - skill authoring compiler
  - author skill
  - scaffold skill
  - validate skill schema
  - skill dual touch parity
touches:
  - scripts/lib/skill-authoring-compiler.mjs
  - tests/lib/skill-authoring-compiler.test.mjs
---

# Soda Skill Authoring Compiler

## Overview
Automated agent skill compiler, validator, and dual-touch parity engine. Validates AgentSkills.io YAML frontmatter, renders canonical markdown skill sections, and enforces bitwise parity between root and template skill directories.

## Architecture & Interfaces
- `validateSkillSchema`: Validates skill definition options against AgentSkills.io standards.
- `scaffoldSkill`: Generates standard AgentSkills.io markdown text.
- `verifySkillDualTouchParity`: Enforces bitwise byte identity between .agents/skills/ and template/.agents/skills/.

## Verification
- Formal Invariants:
  - `INV-044-001`: Skill compilation from a declared configuration object is 100% deterministic
  - `INV-044-002`: Every registered skill exists in both .agents/skills/ and template/.agents/skills/ with bitwise byte identity
- Unit Tests: `node --test tests/lib/skill-authoring-compiler.test.mjs`

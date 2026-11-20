---
name: soda-dave-game-design
version: "1.0.0"
description: >-
  DAVE Game Architecture & Mechanics Engine — synthesizes typed game architecture
  and game design decisions: game loops, ECS topologies, mechanics balance tables,
  reward loops, platform performance budgets, and deterministic state synchronization.
  Triggers: dave game-decision, dave game-architecture, dave ecs-design.
---

# DAVE Game Design & Architecture

This skill defines the operational procedure for game architecture and mechanics decisions.

## Operational Steps

1. **Architecture Decisions:** Define game loop tick frequency (e.g. 60Hz fixed update), ECS component topology, scene graphs, physics engines, and asset streaming pipelines.
2. **Mechanics & Economy Balance:** Model mathematical progression curves, reward frequency, economy sinks/faucets, and difficulty balancing in declarative tables.
3. **Budget Verification:** Enforce platform memory ceilings, frame latency budgets (< 16.6ms), and draw call limitations.
4. **Multiplayer State Sync:** Define authoritative server vs client prediction contracts and rollback reconciliation invariants.

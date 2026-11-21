---
name: soda-session-checkpoint
description: Durable agent session state serialization, cryptographic SHA-256 state hashing, interruption handling, and deterministic session resumption. Use when pausing long runs, handling SIGINT or context compaction, or resuming interrupted workflows.
version: 1.0.0
triggers:
  - checkpoint session
  - pause session
  - save state
  - resume session
  - interrupt recovery
---

# soda-session-checkpoint

Durable agent session state serialization, cryptographic SHA-256 state hashing, interruption handling, and deterministic session resumption across process restarts, shell reloads, and token budget exhaustion.

## Quick reference

```bash
# Programmatic serialization via driver
import { serializeSessionCheckpoint, deserializeSessionCheckpoint } from 'scripts/lib/session-checkpoint-driver.mjs';

# Save checkpoint
serializeSessionCheckpoint({
  targetFile: '.agents/checkpoint.json',
  sessionState: {
    goalId: 'G-CORE-027',
    stepIndex: 1,
    phase: 'EXECUTE',
    branch: 'feature/G-CORE-027',
    modifiedFiles: ['scripts/lib/session-checkpoint-driver.mjs'],
    nextAction: 'node --test tests/lib/session-checkpoint-driver.test.mjs'
  }
});

# Resume checkpoint
const restored = deserializeSessionCheckpoint('.agents/checkpoint.json');
```

## Invariants

1. **INV-027-001 (provenance equality):** Session checkpoints emit valid SHA-256 digests and fail closed upon state corruption.
2. **INV-027-002 (monotonicity):** Resumption strictly preserves or advances the step pointer without cyclic regressions.

## Interruption Recovery Playbook

1. **Pause / Save State:** When an interruption signal is caught or token ceiling approached, capture in-flight goal ID, active step index, branch, touched file diffs, and verification commands.
2. **Atomic Write:** Write to temporary swap file before atomically renaming to `.agents/checkpoint.json`.
3. **Resumption:** On agent startup or `--resume` command, validate SHA-256 digest against payload state.
4. **Quarantine:** Tampered or malformed checkpoints are moved to `.corrupt.<timestamp>.json` and fail closed.

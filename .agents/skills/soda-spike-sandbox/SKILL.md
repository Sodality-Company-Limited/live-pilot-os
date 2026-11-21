---
name: soda-spike-sandbox
version: "1.0.0"
description: Bounded exploratory prototyping and disposable spike sandboxing with mandatory BDD scenario extraction and clean teardown. Use during DEFINE or PLAN phases before locking TDD contracts.
---

# Soda Spike Sandbox & Exploratory Prototyping

Use this skill when exploring unfamiliar libraries, testing novel algorithmic architectures, or discovering data shapes before authoring Given-When-Then BDD specifications and entering strict TDD execution.

## Non-negotiables
1. **Zero Production Pollution:** Spikes are strictly confined to `scratch/spike/<name>`. Direct writes to `src/`, `scripts/lib/`, or production codebases during spike exploration are strictly forbidden and halt fail-closed.
2. **Mandatory BDD Derivation:** Spikes must extract at least one concrete Given-When-Then BDD scenario into the corresponding goal's acceptance criteria before advancing to execution.
3. **Mandatory Teardown:** All prototype artifacts in `scratch/spike/` must be completely torn down, ensuring a clean working tree before shipping.
4. **Bounded TTL:** Spike lifetimes are capped at 24 hours (`86,400,000ms`); stale spikes are quarantined and purged automatically.

## FSM State Machine
```text
[Idle] ---> (initialize_spike) ---> [ProvisionedSandbox]
[ProvisionedSandbox] ---> (execute_experiment) ---> [ExploringDataShapes]
[ExploringDataShapes] ---> (extract_bdd) ---> [ExtractingBDD]
[ExtractingBDD] ---> (teardown_spike) ---> [TeardownClean]
[TeardownClean] ---> (verify_clean_tree) ---> [CompletedReadyForBDD]
```

## Driver Verification
```bash
node -e "import { provisionSpikeSandbox, teardownSpikeSandbox } from './scripts/lib/spike-sandbox-driver.mjs'; console.log('Spike Sandbox Driver operational');"
```

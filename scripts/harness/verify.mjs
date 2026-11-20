#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UNIFIED VERIFICATION ORCHESTRATOR ENTRYPOINT (G-PROOF-012)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Universal CLI Entrypoint for Profile-Driven Invariant Orchestration
 * Purpose: Canonical entrypoint for `scripts/harness/verify.mjs` delegating to
 *          `runOrchestratorCli` in `verification-orchestrator-harness.mjs`.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { runOrchestratorCli } from './verification-orchestrator-harness.mjs';

const { exitCode } = runOrchestratorCli(process.argv.slice(2));
process.exitCode = exitCode;

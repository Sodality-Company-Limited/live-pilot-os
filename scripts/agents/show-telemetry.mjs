#!/usr/bin/env node
/**
 * CLI command to inspect modular agent session telemetry and view LLM Wiki links.
 * Usage:
 *   node ./scripts/agents/show-telemetry.mjs [goalId|sessionKey]
 *   node ./cli.js telemetry [goalId|sessionKey]
 */
import path from 'node:path';
import { listSessionTelemetry, readSessionTelemetry } from './lib/modular-telemetry-engine.mjs';

const repoRoot = process.cwd();
const query = process.argv[2];

async function main() {
  console.log('======================================================================');
  console.log('🤖 Soda OS Modular Telemetry & LLM Wiki Inspector');
  console.log('======================================================================');

  let records = [];

  if (query) {
    // Try single session lookup first
    const single = await readSessionTelemetry(query, repoRoot);
    if (single) {
      records = [single];
    } else {
      // Try list by goalId
      records = await listSessionTelemetry(query, repoRoot);
    }
  } else {
    records = await listSessionTelemetry(null, repoRoot);
  }

  if (!records || records.length === 0) {
    console.log(`No telemetry sessions found${query ? ` matching '${query}'` : ''}.`);
    console.log(`Telemetry location: ${path.join(repoRoot, '.agents', 'telemetry', 'sessions')}`);
    process.exit(0);
  }

  console.log(`Found ${records.length} session record(s):\n`);

  for (const session of records) {
    const status = session.status || session.stopReason || 'unknown';
    console.log(`Session:   ${session.sessionKey}`);
    console.log(`Goal ID:   ${session.goalId}`);
    console.log(`Provider:  ${session.provider} (${session.model || 'default'})`);
    console.log(`Persona:   ${session.persona} (Role: ${session.role})`);
    console.log(`Status:    ${status} (Turns: ${session.turns || 1}, Elapsed: ${session.elapsedSeconds || 0}s)`);
    console.log(`Tokens:    In: ${session.inputTokens || 0} | Out: ${session.outputTokens || 0} | Total: ${(session.inputTokens || 0) + (session.outputTokens || 0)}`);
    if (session.changedFiles && session.changedFiles.length > 0) {
      console.log(`Changed:   ${session.changedFiles.join(', ')}`);
    }
    if (session.summary) {
      console.log(`Summary:   ${session.summary}`);
    }
    const wikiFile = `${session.goalId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_subagent_telemetry.md`;
    console.log(`LLM Wiki:  file://${path.join(repoRoot, 'docs/06_raw', wikiFile)}`);
    console.log('----------------------------------------------------------------------');
  }
}

main().catch((err) => {
  console.error(`Error inspecting telemetry: ${err.message}`);
  process.exit(1);
});

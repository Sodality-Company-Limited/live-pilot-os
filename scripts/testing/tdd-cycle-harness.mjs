#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['TDD traceability', 'node', ['scripts/testing/check-tdd-traceability.mjs']],
  ['API traceability', 'node', ['scripts/api/check-api-sot-traceability.mjs']],
  ['error registry', 'node', ['scripts/contract-check/error-code-registry.mjs']],
  ['SOT hierarchy', 'node', ['scripts/architecture/check-sot.mjs']],
  ['skill registry', 'node', ['scripts/agents/check-skill-registry.mjs']]
];
for (const [label, command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`TDD cycle harness: BLOCKED by ${label}`);
    process.exit(result.status || 1);
  }
}
console.log('TDD cycle harness: PASS (authorities and gates verified)');

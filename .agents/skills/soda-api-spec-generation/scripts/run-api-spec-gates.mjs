#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  ['traceability', 'node', ['scripts/api/check-api-sot-traceability.mjs']],
  ['error registry', 'node', ['scripts/contract-check/error-code-registry.mjs']],
  ['SOT hierarchy', 'node', ['scripts/architecture/check-sot.mjs']],
  ['skill registry', 'node', ['scripts/agents/check-skill-registry.mjs']]
];

for (const [label, command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`API specification gates: BLOCKED by ${label}`);
    process.exit(result.status || 1);
  }
}
console.log('API specification gates: PASS');

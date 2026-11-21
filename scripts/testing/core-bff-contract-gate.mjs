/**
 * Core BFF Contract CI Gate
 * Verifies HTTP routes, NATS message envelopes, error codes, and schema parity fail-closed.
 */

import { execSync } from 'node:child_process';

console.log('🛡️ Running Core BFF Contract CI Gate...');

try {
  // 1. Run unit and contract test suites
  execSync('NODE_ENV=test npx -y tsx --test code/apps/core-bff/test/*.spec.ts tests/contract/core-bff-contract.spec.ts', {
    stdio: 'inherit',
  });

  // 2. Validate error registry & SOT hierarchy
  execSync('node scripts/contract-check/error-code-registry.mjs', { stdio: 'inherit' });
  execSync('node scripts/architecture/check-sot.mjs', { stdio: 'inherit' });

  console.log('✅ Core BFF Contract CI Gate passed with zero errors.');
} catch (err) {
  console.error('❌ Core BFF Contract CI Gate failed.');
  process.exit(1);
}

/**
 * Local Compose Configuration & Topology Smoke Verifier
 * Verifies that infra/core-bff-compose.yml and environment definitions are structurally sound.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const composePath = resolve(process.cwd(), 'infra/core-bff-compose.yml');
const envPath = resolve(process.cwd(), 'infra/core-bff.env.example');

if (!existsSync(composePath)) {
  console.error('❌ Missing infra/core-bff-compose.yml');
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error('❌ Missing infra/core-bff.env.example');
  process.exit(1);
}

const composeText = readFileSync(composePath, 'utf-8');
const envText = readFileSync(envPath, 'utf-8');

// Invariants check
const requiredServices = ['nats', 'redis', 'core-bff'];
for (const svc of requiredServices) {
  if (!composeText.includes(`${svc}:`)) {
    console.error(`❌ Missing service definition for ${svc} in compose profile`);
    process.exit(1);
  }
}

if (!composeText.includes('service_healthy')) {
  console.error('❌ Health dependency conditions missing from compose definition');
  process.exit(1);
}

if (!envText.includes('COOKIE_SECRET=')) {
  console.error('❌ COOKIE_SECRET missing from env example');
  process.exit(1);
}

console.log('✅ Core BFF Compose topology and environment definitions validated successfully.');

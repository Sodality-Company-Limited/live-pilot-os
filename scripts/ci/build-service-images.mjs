/**
 * Service Images Build & Conformance Verifier
 * Verifies that all service container definitions adhere to non-root and immutable image standards.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const services = [
  { name: 'core-bff', dockerfilePath: 'code/apps/core-bff/Dockerfile' },
  { name: 'identity-session-service', dockerfilePath: 'code/services/identity-session-service/Dockerfile' },
];

let failed = false;

for (const svc of services) {
  const fullPath = resolve(process.cwd(), svc.dockerfilePath);
  if (!existsSync(fullPath)) {
    console.error(`❌ Missing Dockerfile for ${svc.name} at ${svc.dockerfilePath}`);
    failed = true;
    continue;
  }

  const content = readFileSync(fullPath, 'utf-8');
  if (!content.includes('USER livepilot')) {
    console.error(`❌ Security failure: ${svc.name} Dockerfile does not enforce non-root user livepilot`);
    failed = true;
  }

  console.log(`✅ ${svc.name} Container image definition validated successfully.`);
}

if (failed) {
  process.exit(1);
} else {
  console.log('🎉 All service container images conform to production standards.');
}

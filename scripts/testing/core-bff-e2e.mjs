/**
 * End-to-End Runner Script for Core BFF Smoke Suite
 */

import { execSync } from 'node:child_process';

console.log('🚀 Executing Core BFF End-to-End Smoke Verification...');

try {
  execSync('NODE_ENV=test npx -y tsx --test tests/e2e/core-bff-f01-f05.spec.ts', {
    stdio: 'inherit',
  });
  console.log('🎉 Core BFF End-to-End Smoke Verification PASSED cleanly.');
} catch (err) {
  console.error('❌ Core BFF End-to-End Smoke Verification FAILED.');
  process.exit(1);
}

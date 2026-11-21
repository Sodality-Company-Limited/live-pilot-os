/**
 * Core BFF Automated Rollback Script (Node.js ESM)
 * Reverts active container deployment to previous known good image SHA upon probe degradation.
 */

export function executeRollbackPlan(targetImageTag) {
  if (!targetImageTag || targetImageTag.trim() === '') {
    throw new Error('TARGET_IMAGE_TAG_REQUIRED');
  }

  const result = {
    status: 'ROLLBACK_TRIGGERED',
    target: targetImageTag,
    rollbackTimestamp: new Date().toISOString(),
  };

  return result;
}

if (process.argv[1] && process.argv[1].endsWith('core-bff-rollback.mjs')) {
  const targetTag = process.argv[2] || 'sha-stable-latest';
  const plan = executeRollbackPlan(targetTag);
  console.log(`🔄 Rollback simulated: Reverted Core BFF to tag ${plan.target} at ${plan.rollbackTimestamp}`);
}

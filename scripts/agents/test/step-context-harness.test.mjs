import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireWikiRetrievalLease,
  compileStepContextPacket,
  isDuplicateStepContext,
  releaseWikiRetrievalLease,
  validateStepContextPacket,
} from '../lib/step-context-harness.mjs';

const base = {
  goalId: 'G-AG-004',
  stepId: 'step-1',
  role: 'implementer',
  persona: 'context-boundary-enforcer',
  objective: 'Compile the step-scoped packet',
  acceptance: ['Only allowed files are included'],
  allowedFiles: ['scripts/agents/lib/step-context-harness.mjs'],
  excerpts: ['Relevant function signature'],
  contextDigest: 'cited digest',
  blockers: [],
  verificationCommand: 'node --test scripts/agents/test/step-context-harness.test.mjs',
};

test('compiles a minimal step packet and hashes it', () => {
  const result = compileStepContextPacket(base);
  assert.equal(result.valid, true);
  assert.equal(result.packet.goalId, 'G-AG-004');
  assert.match(result.packet.packetHash, /^[a-f0-9]{16}$/);
  assert.equal(Object.hasOwn(result.packet, 'goal'), false);
});

test('rejects full goal context and oversized touch-map input', () => {
  const fullContext = validateStepContextPacket({ ...base, goal: { allSections: true } });
  assert.ok(fullContext.errors.includes('full context field is forbidden: goal'));
  const goalFile = validateStepContextPacket({ ...base, goalFile: 'docs/07-backlog/goals/G-AG-004.md' });
  assert.ok(goalFile.errors.includes('full context field is forbidden: goalFile'));
  const tooManyFiles = validateStepContextPacket({ ...base, allowedFiles: ['a', 'b', 'c', 'd', 'e', 'f'] });
  assert.ok(tooManyFiles.errors.includes('allowed files exceed limit: 5'));
});

test('detects duplicate packets per goal', () => {
  const { packet } = compileStepContextPacket(base);
  const seen = new Set([`${packet.goalId}:${packet.packetHash}`]);
  assert.equal(isDuplicateStepContext(packet, seen).duplicate, true);
});

test('manages single-owner LLM Wiki retrieval lease lifecycle', () => {
  const leases = new Map();
  const goalId = 'G-AG-019';
  const subagentA = 'context-agent-1';
  const subagentB = 'context-agent-2';

  // Subagent A acquires lease
  const grantA = acquireWikiRetrievalLease(goalId, subagentA, leases);
  assert.equal(grantA.allowed, true);
  assert.equal(grantA.renewed, false);
  assert.equal(grantA.lease.leaseHolderId, subagentA);

  // Subagent B attempts concurrent lease on same goal -> rejected
  const grantB = acquireWikiRetrievalLease(goalId, subagentB, leases);
  assert.equal(grantB.allowed, false);
  assert.ok(grantB.error.includes('exclusive single-owner lease already held'));
  assert.equal(grantB.currentHolder, subagentA);

  // Subagent A renews lease -> allowed
  const renewA = acquireWikiRetrievalLease(goalId, subagentA, leases);
  assert.equal(renewA.allowed, true);
  assert.equal(renewA.renewed, true);

  // Subagent B attempts unauthorized release -> rejected
  const fakeRelease = releaseWikiRetrievalLease(goalId, subagentB, leases);
  assert.equal(fakeRelease.released, false);
  assert.ok(fakeRelease.error.includes('not context-agent-2'));

  // Subagent A releases lease -> allowed
  const realRelease = releaseWikiRetrievalLease(goalId, subagentA, leases);
  assert.equal(realRelease.released, true);
  assert.equal(leases.has(goalId), false);

  // Subagent B can now acquire the lease
  const secondGrantB = acquireWikiRetrievalLease(goalId, subagentB, leases);
  assert.equal(secondGrantB.allowed, true);
  assert.equal(secondGrantB.lease.leaseHolderId, subagentB);
});


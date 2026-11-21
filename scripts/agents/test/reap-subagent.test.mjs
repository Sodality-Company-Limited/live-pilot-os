import test from 'node:test';
import assert from 'node:assert/strict';
import { reapSubagentWorker } from '../lib/reap-subagent.mjs';

test('reapSubagentWorker terminates session without toolCall gracefully', async () => {
  const result = await reapSubagentWorker({ sessionKey: 'session-abc-123', platform: 'codex' });
  assert.equal(result.status, 'reaped');
  assert.equal(result.sessionKey, 'session-abc-123');
  assert.equal(result.platform, 'codex');
  assert.ok(result.reapedAt);
});

test('reapSubagentWorker calls platform tool executor to kill worker conversation', async () => {
  let killed = null;
  const toolCall = async (args) => {
    killed = args;
    return { success: true };
  };

  const result = await reapSubagentWorker({
    sessionKey: 'worker-conv-456',
    platform: 'antigravity',
    toolCall,
  });

  assert.equal(result.status, 'reaped');
  assert.deepEqual(killed, {
    Action: 'kill',
    ConversationIds: ['worker-conv-456'],
  });
});

test('reapSubagentWorker fails safely if sessionKey is missing', async () => {
  const result = await reapSubagentWorker({});
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'missing sessionKey or workerId');
});

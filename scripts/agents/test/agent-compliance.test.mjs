import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAgentCompliance } from '../../lib/agent-compliance-scorer.mjs';

test('calculates 100% compliance and 0 HCER for clean trajectory', () => {
  const trajectory = {
    events: [
      { type: 'tool_call', name: 'read_file' },
      { type: 'test_execution', exitCode: 0 },
      { type: 'tool_call', name: 'write_file' }
    ]
  };

  const res = scoreAgentCompliance(trajectory);
  assert.equal(res.valid, true);
  assert.equal(res.score, 1.0);
  assert.equal(res.hcer, 0.0);
  assert.equal(res.compliant, true);
});

test('flags non-compliant trajectory when HCER exceeds 0.05', () => {
  const trajectory = {
    events: [
      { type: 'touch_map_breach', detail: 'edited outside allowed_files' },
      { type: 'tool_call', name: 'read_file' }
    ]
  };

  const res = scoreAgentCompliance(trajectory);
  assert.equal(res.valid, true);
  assert.equal(res.hcer, 0.5);
  assert.equal(res.compliant, false);
  assert.equal(res.violationsCount, 1);
});

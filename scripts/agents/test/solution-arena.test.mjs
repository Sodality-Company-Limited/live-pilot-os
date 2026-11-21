import test from 'node:test';
import assert from 'node:assert/strict';
import { runSolutionArena } from '../../lib/solution-arena-orchestrator.mjs';

test('selects winning candidate with passed tests, lower latency, and minimal diff', () => {
  const duel = {
    candidates: [
      { id: 'cand-a', name: 'Standard Implementation', testsPassed: true, latencyMs: 50, diffLines: 20 },
      { id: 'cand-b', name: 'Bloated Implementation', testsPassed: true, latencyMs: 200, diffLines: 150 },
      { id: 'cand-c', name: 'Failing Implementation', testsPassed: false, latencyMs: 10, diffLines: 10 }
    ]
  };

  const res = runSolutionArena(duel);
  assert.equal(res.valid, true);
  assert.equal(res.winner, 'cand-a');
  assert.ok(res.candidates[0].score > res.candidates[1].score);
});

test('rejects arena duel with less than 2 candidates', () => {
  const duel = { candidates: [{ id: 'solo' }] };
  const res = runSolutionArena(duel);
  assert.equal(res.valid, false);
  assert.ok(res.error.includes('at least 2 competing candidates'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mineDesignArcheology } from '../../lib/design-archeology-miner.mjs';

test('mines git snippets and archived goals for historical rationale', () => {
  const context = {
    targetPath: 'scripts/lib/multi-currency-money.mjs',
    gitLogSnippets: [
      { commit: 'a1b2c3d', message: 'feat: implement Banker rounding to prevent float bias' }
    ],
    archivedGoals: [
      { id: 'G-CORE-020', intent: 'Universal zero-float arithmetic across all ledgers' }
    ]
  };

  const res = mineDesignArcheology(context);
  assert.equal(res.valid, true);
  assert.equal(res.discoveredRationaleCount, 2);
  assert.ok(res.findings.some(f => f.source === 'git-commit'));
  assert.ok(res.findings.some(f => f.source === 'archived-goal'));
  assert.ok(res.synthesis.includes('Found 2 historical architectural rationale sources'));
});

test('handles empty context gracefully', () => {
  const res = mineDesignArcheology({ targetPath: 'new-file.js' });
  assert.equal(res.valid, true);
  assert.equal(res.discoveredRationaleCount, 0);
  assert.ok(res.synthesis.includes('No prior rationale found'));
});

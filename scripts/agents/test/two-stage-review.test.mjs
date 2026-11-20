import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTwoStageReview } from '../../lib/two-stage-reviewer.mjs';

test('approves diff that passes both Stage 1 and Stage 2', () => {
  const goalContext = {
    goal_id: 'G-CORE-024',
    acceptance_criteria: ['Given diff, verify spec and quality pass']
  };
  const diffSummary = {
    touched_files: ['scripts/lib/two-stage-reviewer.mjs'],
    file_contents: {
      'scripts/lib/two-stage-reviewer.mjs': 'export function cleanCode() { return 42; }'
    }
  };

  const review = executeTwoStageReview(goalContext, diffSummary);
  assert.equal(review.approved, true);
  assert.equal(review.stage1.approved, true);
  assert.equal(review.stage2.approved, true);
});

test('blocks at Stage 1 when acceptance criteria are missing', () => {
  const goalContext = { goal_id: 'G-CORE-024', acceptance_criteria: [] };
  const diffSummary = { touched_files: ['file.js'] };

  const review = executeTwoStageReview(goalContext, diffSummary);
  assert.equal(review.approved, false);
  assert.equal(review.current_stage, 'stage_1_spec_compliance');
  assert.equal(review.stage2, null);
});

test('blocks at Stage 2 when forbidden stubs are present', () => {
  const goalContext = {
    goal_id: 'G-CORE-024',
    acceptance_criteria: ['Valid criteria']
  };
  const diffSummary = {
    touched_files: ['bad.js'],
    file_contents: {
      'bad.js': '// TODO: mock this service later\nconst x = 1;'
    }
  };

  const review = executeTwoStageReview(goalContext, diffSummary);
  assert.equal(review.approved, false);
  assert.equal(review.stage1.approved, true);
  assert.equal(review.stage2.approved, false);
  assert.ok(review.stage2.findings.some(f => f.includes('forbidden mock/stub')));
});

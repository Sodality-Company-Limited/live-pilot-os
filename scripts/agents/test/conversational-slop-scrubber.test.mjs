import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubConversationalSlop } from '../../lib/conversational-slop-scrubber.mjs';

test('scrubs sycophantic opening and trailing chatter from text', () => {
  const dirty = 'Sure, I would be happy to help! Here is the code.\n\nHope this helps!';
  const res = scrubConversationalSlop(dirty);
  assert.equal(res.valid, true);
  assert.equal(res.cleanedText, 'Here is the code.');
  assert.ok(res.slopPatternsMatched >= 2);
});

test('leaves pure signal-dense text untouched', () => {
  const clean = 'WHERE: file:///app.js#L1-L10\nWHY: Fix race condition\nHOW: CAS loop';
  const res = scrubConversationalSlop(clean);
  assert.equal(res.valid, true);
  assert.equal(res.cleanedText, clean);
  assert.equal(res.slopPatternsMatched, 0);
});

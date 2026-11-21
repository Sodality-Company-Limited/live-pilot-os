import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStreamScrubber,
  processTokenChunk,
  flushScrubberBuffer,
  scrubCompleteText
} from '../../scripts/lib/live-stream-scrubber.mjs';

test('Live Stream Scrubber: strips conversational preamble while preserving payload', () => {
  const scrubber = createStreamScrubber();
  const chunks = [
    'Sure thing! ',
    'Here is the requested ',
    'implementation:\n\n',
    '```javascript\n',
    'const x = 42;\n',
    '```'
  ];

  let output = '';
  for (const chunk of chunks) {
    output += processTokenChunk(scrubber, chunk);
  }
  output += flushScrubberBuffer(scrubber);

  assert.equal(output.trim(), '```javascript\nconst x = 42;\n```');
});

test('Live Stream Scrubber: Payload Byte Conservation Invariant (INV-042-001) holds on technical payload', () => {
  const scrubber = createStreamScrubber();
  const technicalInput = '### Step 1 — Verify Invariants\n```bash\nnode --test tests/lib/money.test.mjs\n```';
  
  let output = '';
  for (let i = 0; i < technicalInput.length; i += 5) {
    output += processTokenChunk(scrubber, technicalInput.slice(i, i + 5));
  }
  output += flushScrubberBuffer(scrubber);

  assert.equal(output, technicalInput);
  assert.equal(Buffer.byteLength(output, 'utf8'), Buffer.byteLength(technicalInput, 'utf8'));
});

test('Live Stream Scrubber: Scrubbing Idempotency Invariant (INV-042-002) holds', () => {
  const input = 'Certainly, I can help with that!\n\n# System Architecture\nAll systems nominal.';
  const scrubbedOnce = scrubCompleteText(input);
  const scrubbedTwice = scrubCompleteText(scrubbedOnce);

  assert.equal(scrubbedOnce, '# System Architecture\nAll systems nominal.');
  assert.equal(scrubbedTwice, scrubbedOnce);
});

test('Live Stream Scrubber: respects buffer limit and does not delay stream indefinitely', () => {
  const scrubber = createStreamScrubber({ maxBufferSize: 50 });
  const text = 'This is a long introductory sentence that does not clearly match known pleasantries but exceeds limit.';
  
  let emittedEarly = '';
  for (let i = 0; i < text.length; i += 10) {
    emittedEarly += processTokenChunk(scrubber, text.slice(i, i + 10));
  }
  emittedEarly += flushScrubberBuffer(scrubber);

  assert.equal(emittedEarly, text);
});

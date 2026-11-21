/**
 * @file live-stream-scrubber.mjs
 * @description Real-time token buffer cleaner and conversational slop interceptor.
 * Intercepts initial streaming token chunks, detects and trims conversational preambles,
 * and passes technical payloads through unchanged with exact byte conservation.
 */

const DEFAULT_PREAMBLE_PATTERNS = [
  /^(?:Sure(?: thing)?|Certainly|Absolutely|Of course|Great|Hello|Hi there|Understood|No problem|Here is)[^\n#`]*?(?:[:!\n]+|\.\s+)/i,
  /^(?:Sure(?: thing)?|Certainly|Absolutely|Of course|Understood|No problem)[!.,\s]+/i,
  /^Here is the (?:code|implementation|solution|file|output|result)[:\n\s]*/i
];

/**
 * Creates a stateful stream scrubber instance.
 * @param {object} [options]
 * @param {number} [options.maxBufferSize=256] - Max characters to buffer before flushing.
 * @param {Array<RegExp>} [options.patterns] - Custom preamble regex patterns.
 * @returns {object} Scrubber state machine.
 */
export function createStreamScrubber(options = {}) {
  return {
    maxBufferSize: options.maxBufferSize || 256,
    patterns: options.patterns || DEFAULT_PREAMBLE_PATTERNS,
    buffer: '',
    headerScrubbed: false
  };
}

/**
 * Processes an incoming token chunk in real-time.
 * Buffers until a match or boundary is reached, then emits scrubbed stream.
 * @param {object} scrubber - State machine from createStreamScrubber.
 * @param {string} chunk - Incoming string token.
 * @returns {string} Emittable scrubbed chunk (may be empty while buffering).
 */
export function processTokenChunk(scrubber, chunk) {
  if (scrubber.headerScrubbed) {
    return chunk;
  }

  scrubber.buffer += chunk;

  // Check if buffer contains a markdown block, header, or newline indicating boundary
  const hasMarkdownTrigger = scrubber.buffer.includes('```') || 
                             scrubber.buffer.includes('# ') || 
                             scrubber.buffer.includes('## ') ||
                             scrubber.buffer.includes('### ') ||
                             scrubber.buffer.includes('\n\n');

  if (hasMarkdownTrigger || scrubber.buffer.length >= scrubber.maxBufferSize) {
    scrubber.headerScrubbed = true;
    let scrubbed = scrubber.buffer;

    let matched = true;
    while (matched) {
      matched = false;
      for (const pattern of scrubber.patterns) {
        if (pattern.test(scrubbed)) {
          scrubbed = scrubbed.replace(pattern, '').replace(/^\s*\n*/, '');
          matched = true;
          break;
        }
      }
    }

    // Strip leading empty newlines left behind after preamble removal
    scrubbed = scrubbed.replace(/^\s*\n+/, '');

    const out = scrubbed;
    scrubber.buffer = '';
    return out;
  }

  return '';
}

/**
 * Flushes any remaining bytes in the buffer when the stream ends.
 * @param {object} scrubber - State machine from createStreamScrubber.
 * @returns {string} Remaining buffered tokens scrubbed.
 */
export function flushScrubberBuffer(scrubber) {
  if (!scrubber.buffer) {
    return '';
  }

  let scrubbed = scrubber.buffer;
  if (!scrubber.headerScrubbed) {
    scrubber.headerScrubbed = true;
    let matched = true;
    while (matched) {
      matched = false;
      for (const pattern of scrubber.patterns) {
        if (pattern.test(scrubbed)) {
          scrubbed = scrubbed.replace(pattern, '').replace(/^\s*\n*/, '');
          matched = true;
          break;
        }
      }
    }
    scrubbed = scrubbed.replace(/^\s*\n+/, '');
  }

  scrubber.buffer = '';
  return scrubbed;
}

/**
 * Convenience utility to scrub a static full string.
 * @param {string} text - Full text.
 * @param {object} [options]
 * @returns {string} Scrubbed text.
 */
export function scrubCompleteText(text, options = {}) {
  const scrubber = createStreamScrubber(options);
  const chunkOut = processTokenChunk(scrubber, text);
  const flushOut = flushScrubberBuffer(scrubber);
  return chunkOut + flushOut;
}

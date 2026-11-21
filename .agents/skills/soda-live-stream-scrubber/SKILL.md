---
name: soda-live-stream-scrubber
description: Real-time token buffer cleaner and conversational slop interceptor. Strips preambles on the fly while preserving code blocks and technical payloads byte-for-byte.
version: 1.0.0
triggers:
  - live stream scrubber
  - token stream cleaner
  - unslop streaming
  - real-time slop interception
  - preamble stripper
touches:
  - scripts/lib/live-stream-scrubber.mjs
  - tests/lib/live-stream-scrubber.test.mjs
---

# Live Stream Scrubber Skill

## Overview
The `soda-live-stream-scrubber` skill intercepts streaming LLM token chunks in real-time, removing conversational pleasantries, hedging preambles, and introductory filler before terminal output.
It guarantees:
1. **Real-time Bounded Buffering:** Buffers initial token chunks up to a configurable maximum lookahead window without introducing human-perceptible latency.
2. **Payload Byte Conservation (INV-042-001):** Code blocks, JSON payloads, diffs, and technical markdown are preserved 100% byte-for-byte.
3. **Scrubbing Idempotency (INV-042-002):** Passing an already-clean or previously scrubbed stream through the scrubber yields bitwise identity.

## Architecture & Interfaces
Exported from `scripts/lib/live-stream-scrubber.mjs`:
- `createStreamScrubber(options)`: Instantiates a stateful stream scrubber with pattern registry.
- `processTokenChunk(scrubber, chunk)`: Buffers and cleans incoming tokens, emitting the scrubbed stream.
- `flushScrubberBuffer(scrubber)`: Emits remaining buffered bytes on stream close.
- `scrubCompleteText(text, options)`: Synchronous convenience function for batch strings.

## Verification
- Formal Invariants:
  - `INV-042-001`: Payload Byte Conservation ($\sum \text{bytes}_{\text{out}}^{\text{payload}} \equiv \sum \text{bytes}_{\text{in}}^{\text{payload}}$).
  - `INV-042-002`: Scrubbing Idempotency ($\text{Scrub}(\text{Scrub}(S)) \equiv \text{Scrub}(S)$).
- Unit Tests: `tests/lib/live-stream-scrubber.test.mjs`

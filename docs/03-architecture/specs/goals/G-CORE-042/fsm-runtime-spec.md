# G-CORE-042: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-042 (Implement soda-live-stream-scrubber skill and streaming token buffer cleaner)

## FSM State Matrix
```text
[StreamStarted] ---> (buffer_initial_chunks) ---> [BufferingPreamble]
[BufferingPreamble] ---> (evaluate_preamble_match) ---> [PreambleMatched] | [CleanPayloadDetected]
[PreambleMatched] ---> (strip_preamble_bytes) ---> [PassthroughStreaming]
[CleanPayloadDetected] ---> (flush_lookahead_buffer) ---> [PassthroughStreaming]
[PassthroughStreaming] ---> (stream_end) ---> [StreamFlushedAndClosed]
```

## Rollback & Compensation Policies
- If buffer analysis errors occur, the scrubber immediately flushes raw tokens in passthrough mode to prevent data loss.

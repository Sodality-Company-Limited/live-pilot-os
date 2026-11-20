# Acceptance Contract: G-CORE-042

- Title: Implement soda-live-stream-scrubber skill and streaming token buffer cleaner
- Kind: feature
- Epic: CORE
- Verification: `node --test tests/lib/live-stream-scrubber.test.mjs`

## Criteria
- Given a stream starting with conversational preamble ("Certainly! Here is..."), when scrubbed, then the preamble is stripped and the stream starts directly with the technical payload.
- Given a clean technical stream containing code blocks, when scrubbed, then all code block characters are preserved 100% byte-for-byte.

---
name: soda-pr-noise-resolver
description: Automated GitHub PR review bot noise classification, GraphQL thread auto-resolution mutation generation, and cryptographic audit receipts. Use to clean up noise from CodeRabbit, Cursor bugbot, or Copilot in PR review threads.
version: 1.0.0
triggers:
  - pr noise
  - resolve bot threads
  - clean review comments
  - bugbot resolution
  - coderabbit resolution
---

# soda-pr-noise-resolver

Automated GitHub PR review bot noise classification and GraphQL thread resolution driver inspired by `pstack`'s `bugbot-triage` reference.

## Quick reference

```javascript
import { classifyReviewThread, generateResolutionMutation } from 'scripts/lib/pr-noise-resolver.mjs';

// Classify thread
const decision = classifyReviewThread({
  id: 'thread_123',
  author: 'coderabbitai[bot]',
  body: 'CodeRabbit summary of suggestions',
  isResolved: false,
});
// decision.action -> 'RESOLVE' | 'PRESERVE' | 'SKIP'

// Generate GraphQL mutation if bot noise
if (decision.action === 'RESOLVE') {
  const mutation = generateResolutionMutation({
    id: 'thread_123',
    author: 'coderabbitai[bot]',
  });
  // mutation.mutation -> GraphQL document
  // mutation.variables.input.threadId -> 'thread_123'
  // mutation.auditHash -> 64-char SHA-256
}
```

## Invariants

1. **INV-031-001 (determinism):** Threads matching bot noise signatures are marked for resolution with cryptographic audit hashes, while human review threads are never mutated.
2. **INV-031-002 (idempotency):** Submitting resolution mutations for already-resolved threads is completely idempotent and produces zero duplicate comments.

---
name: soda-context-investigation
description: AST-guided tool economy, call budget ceilings, and slice caching for subagent investigation and debugging. Use to prevent runaway tool loops, redundant file views, and context budget exhaustion.
version: 1.0.0
triggers:
  - investigate context
  - debug codebase
  - tool economy
  - slice cache
  - budget guard
---

# soda-context-investigation

AST-guided tool calling budget guard and content-addressable slice cache inspired by `pstack`'s `investigate` and `debug` playbooks.

## Quick reference

```javascript
import { createInvestigationSession, trackToolCall, getOrSetCachedSlice } from 'scripts/lib/investigation-budget-guard.mjs';

// Initialize session with integer ceiling
const session = createInvestigationSession({
  sessionId: 'debug-run-001',
  maxToolCalls: 25,
});

// Intercept tool calls
const check = trackToolCall(session, { toolName: 'view_file', path: 'src/index.js' });
if (!check.allowed) {
  // Gracefully stop investigation and synthesize findings
}

// Slice cache lookup
const slice = getOrSetCachedSlice(session, {
  filePath: 'src/index.js',
  startLine: 1,
  endLine: 40,
  loader: () => fs.readFileSync('src/index.js', 'utf8').slice(0, 1000),
});
```

## Invariants

1. **INV-029-001 (boundedness):** Total investigation tool calls cannot exceed declared integer step ceilings; trips fail-closed upon budget exhaustion.
2. **INV-029-002 (idempotency):** Repeated queries for identical symbol/file paths yield cached slice references with zero redundant I/O.

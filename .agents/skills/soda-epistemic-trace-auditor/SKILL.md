---
name: soda-epistemic-trace-auditor
version: "1.0.0"
description: Reasoning transparency, epistemic trace auditor, and claim citation validator. Audits agent thinking blocks, validates hypothesis-evidence grounding, enforces Article III structured explanations, and emits cryptographic epistemic receipts.
---

# soda-epistemic-trace-auditor

The **soda-epistemic-trace-auditor** skill provides autonomous verification of agent reasoning processes. It ensures that technical decisions, refactors, and proposals are anchored in empirical evidence rather than ungrounded assumptions.

## When to Use
- When auditing subagent reasoning traces or execution logs.
- During code review or PR preflight to verify that claims are grounded in repository evidence.
- When generating cryptographic proof receipts confirming adherence to Article III (Structured Explanation Standard).

## Operational Interface
The driver lives in `scripts/lib/epistemic-trace-auditor.mjs`:
```javascript
import {
  parseReasoningTrace,
  auditEpistemicClaims,
  emitEpistemicReceipt,
  evaluateTraceCompleteness
} from './scripts/lib/epistemic-trace-auditor.mjs';

const audit = auditEpistemicClaims(transcriptText);
if (!audit.valid) {
  throw new Error(`Reasoning trace failed epistemic audit: score ${audit.epistemicScoreBasisPoints} bp`);
}

const receipt = emitEpistemicReceipt('G-CORE-038', transcriptText);
```

## Epistemic Pillars
Every valid reasoning step must explicitly include:
1. **Hypothesis / Problem:** The core assertion or condition being addressed.
2. **Evidence / Observations:** Clickable markdown file links (`file:///...#L1-L10`) or command outputs.
3. **Conclusion / Action:** The decisive technical step taken to resolve the condition.

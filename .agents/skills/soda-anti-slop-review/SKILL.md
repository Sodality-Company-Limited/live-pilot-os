---
name: soda-anti-slop-review
description: Radical brevity, zero conversational filler, no redundant code comments, and maintainer-focused diff review. Use before PR creation or during code review.
---

# Soda Anti-Slop Review & Brevity Invariant

Use this skill when reviewing code diffs, authoring PR briefings, generating commit messages, or formulating agent responses.

## Non-negotiables
1. **Zero Conversational Preamble:** Never begin with conversational filler ("Certainly!", "Sure thing!", "Here is what I changed:", "Great question!"). Begin immediately with the structured technical response or WHERE/WHY/FOR WHOM/HOW breakdown.
2. **Zero Apologies:** Never apologize for bugs or confusion ("I apologize for the oversight"). State the defect, root cause, and factual fix directly.
3. **Zero AI Sign-offs:** Never close with conversational fluff ("Let me know if you need anything else!", "Hope this helps!"). End with next actions or verification commands.
4. **Zero Self-Narrating Comments:** Code comments must document *why* non-obvious architecture exists, never *what* the syntax is doing (`// Here we import fs`).
5. **No Deflation of Types:** Make illegal states unrepresentable instead of scattering defensive null checks.

## Linter Verification
Validate code and markdown diffs against the anti-slop engine:
```bash
node -e "import { lintAntiSlop } from './scripts/lib/anti-slop-linter.mjs'; const res = lintAntiSlop(process.argv[1]); if (!res.clean) { console.error(res.violations); process.exit(1); }" "<diff_or_text>"
```

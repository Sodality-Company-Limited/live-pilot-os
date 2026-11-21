---
name: soda-architectural-arena
version: "1.0.0"
description: Conducts rigorous multi-candidate architectural trade-off bake-offs, Pareto frontier evaluation, and cryptographic decision receipts.
---

# Soda Architectural Arena Skill

## Purpose
Enforces empirical multi-candidate architectural evaluation when facing ambiguous technical choices, trade-offs, or structural refactoring paths. Replaces subjective intuition with exact BigInt weighted scoring, Pareto dominance filtering, and cryptographic decision audit receipts.

## When to Use
- Designing new subsystem architectures with multiple viable approaches (e.g. In-Memory vs Event-Driven vs Micro-Batch).
- Evaluating trade-offs across latency, maintainability, memory footprint, and complexity.
- Preventing premature architectural anchoring on the first generated solution.

## Commands & Workflows
```bash
# Evaluate competing candidates via node script or harness
node -e "
  import { evaluateCandidateMatrix, generateDecisionReceipt } from './scripts/lib/architectural-arena-engine.mjs';
  const evaluation = evaluateCandidateMatrix({
    candidates: [
      { id: 'sol_a', name: 'In-Memory', scores: { latency: 9000, complexity: 4000 } },
      { id: 'sol_b', name: 'Database', scores: { latency: 6000, complexity: 8000 } }
    ],
    weights: { latency: 60, complexity: 40 }
  });
  const receipt = generateDecisionReceipt({ evaluation, goalId: 'G-CORE-032' });
  console.log(receipt);
"
```

## Invariants & Rules
1. **Zero Mocks (Article I):** All scoring and evaluation routines operate on real data with zero mocks or synthetic fallbacks.
2. **Exact Integer Math (Article VI):** All metric dimensions are scored in basis points $[0, 10,000]$ and dimension weights are normalized to exactly $10,000$ basis points ($\sum \text{bp} \equiv 10,000$) using Martin Fowler remainder-preserving allocation.
3. **Pareto Dominance Filtering:** Never select an architectural option dominated across all criteria by another viable candidate.
4. **Cryptographic Proof Receipt:** Every selected winner produces an immutable SHA-256 audit receipt.

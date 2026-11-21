---
name: soda-semantic-refactor-engine
description: AST-guided complexity analysis, extract-function candidate detection, and behavior-preserving refactoring with automated test equivalence verification.
version: 1.0.0
triggers:
  - refactor
  - semantic refactor
  - complexity
  - cyclomatic complexity
  - extract function
  - behavioral equivalence
touches:
  - scripts/lib/semantic-refactor-engine.mjs
  - template/scripts/lib/semantic-refactor-engine.mjs
---

# soda-semantic-refactor-engine

## Purpose
The `soda-semantic-refactor-engine` skill provides automated McCabe cyclomatic complexity calculation, AST nesting depth analysis, and candidate discovery for extract-function refactorings. It couples transformations with mandatory test-equivalence verification to guarantee zero regressions.

## Invariants
1. **Complexity Bound (INV-047-001):** Functions targeted for refactoring MUST satisfy McCabe cyclomatic complexity bound $M \le 15$ after extraction, with zero behavioral degradation.
2. **Behavioral Equivalence (INV-047-002):** A refactoring transformation preserves semantics if and only if all operational tests pass unchanged.
3. **Zero Float Metrics:** Complexity and nesting depth are non-negative integers $\in \mathbb{N}_0$.

## Usage
```javascript
import {
  analyzeFunctionComplexity,
  findRefactorCandidates,
  verifyBehavioralEquivalence
} from 'scripts/lib/semantic-refactor-engine.mjs';

// 1. Analyze function complexity
const metrics = analyzeFunctionComplexity(sourceCode);
console.log(`Complexity: ${metrics.cyclomaticComplexity}, Nesting: ${metrics.nestingDepth}`);

// 2. Discover high-complexity candidates
const candidates = findRefactorCandidates(fileContent, { maxComplexity: 15 });

// 3. Verify test equivalence
const result = verifyBehavioralEquivalence(originalSource, refactoredSource, {
  testCommand: 'npm test'
});
```

---
name: soda-ast-type-invariants
description: Strict TypeScript and JSDoc type safety linter enforcing zero any, discriminating unions for variant states, and explicit public return contracts.
version: 1.0.0
triggers:
  - type invariants
  - ast type linter
  - zero any
  - discriminating union
  - type safety
  - return type annotation
touches:
  - scripts/lib/ast-type-invariants.mjs
  - template/scripts/lib/ast-type-invariants.mjs
---

# soda-ast-type-invariants

## Purpose
The `soda-ast-type-invariants` skill provides an automated AST-level type contract analyzer enforcing zero `any` usage, compile-time exhaustive discriminating union definitions, and mandatory return type signatures on public exported functions across the Soda OS codebase.

## Invariants
1. **Zero Any Prohibition (INV-048-001):** Public APIs and internal domain models contain zero explicit or inferred `any` types.
2. **Discriminating Union Invariant (INV-048-002):** Union variants for multi-state domain entities MUST define distinct literal discriminant fields (`type`, `kind`, `status`, etc.).
3. **Explicit Return Signatures:** Exported function declarations MUST declare an explicit return type contract.

## Usage
```javascript
import {
  lintTypeInvariants,
  auditAnyProhibition,
  auditDiscriminatingUnions,
  auditPublicReturnTypes
} from 'scripts/lib/ast-type-invariants.mjs';

// 1. Audit single file for any leaks
const anyAudit = auditAnyProhibition(sourceCode);
if (!anyAudit.passed) {
  console.error('Prohibited any usages detected:', anyAudit.violations);
}

// 2. Audit discriminating unions
const unionAudit = auditDiscriminatingUnions(typeDefs);
console.log('Union check passed:', unionAudit.passed);

// 3. Full type invariants lint pass
const report = lintTypeInvariants(sourceCode);
console.log('Total violations:', report.totalViolations);
```

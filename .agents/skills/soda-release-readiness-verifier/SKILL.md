---
name: soda-release-readiness-verifier
description: Automated multi-gate release certifier auditing git cleanliness, test passes, formal proof receipts, and dual-touch template parity before PR creation.
version: 1.0.0
triggers:
  - release readiness
  - pre-pr
  - release certifier
  - readiness gate
  - template parity
  - clean tree
touches:
  - scripts/lib/release-readiness-verifier.mjs
  - template/scripts/lib/release-readiness-verifier.mjs
---

# soda-release-readiness-verifier

## Purpose
The `soda-release-readiness-verifier` skill provides an automated, non-bypassable pre-PR release certification engine. It coordinates multi-gate audits covering git clean working trees, zero test failures, verified cryptographic proof receipts, and 100% bitwise parity between root and template directories.

## Invariants
1. **Pre-PR Completeness (INV-049-001):** A branch is eligible for PR release if and only if all configured gates pass with zero failures.
2. **Template Parity (INV-049-002):** Files touched in goal touch maps matching template files exhibit 100% bitwise parity.
3. **Clean Tree Invariant:** Working tree must contain zero untracked files outside touch map and zero uncommitted tracked changes before PR release.

## Usage
```javascript
import {
  verifyReleaseReadiness,
  auditGitWorkingTree,
  auditTemplateParity
} from 'scripts/lib/release-readiness-verifier.mjs';

// 1. Audit git cleanliness
const gitStatus = auditGitWorkingTree({ allowedPaths: ['scripts/lib/'] });
console.log('Git tree clean:', gitStatus.passed);

// 2. Audit template parity
const parity = auditTemplateParity({
  files: ['scripts/lib/release-readiness-verifier.mjs']
});
console.log('Template parity passed:', parity.passed);

// 3. Full multi-gate certification pass
const cert = verifyReleaseReadiness();
if (cert.certified) {
  console.log('Ready for PR! Signature:', cert.certificate.signature);
} else {
  console.error('Failed release gates:', cert.failedGates);
}
```

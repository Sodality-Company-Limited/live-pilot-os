---
description: DAVE reference evidence — first-class typed references, SHA-256 digests, and physical citation verifications
alwaysApply: true
---

# DAVE Reference Evidence Contract

This rule defines the mandatory guidelines for citing, validating, and grounding DAVE decisions with **First-Class Typed References**.

---

## 1. Zero-Unreferenced Claims Invariant

Antigravity and DAVE are **strictly forbidden** from stating assertions such as:
- *"This looks similar to the reference."*
- *"Based on common design patterns."*
- *"Matches the dashboard wireframe."*

Every visual, architectural, motion, or audio assertion MUST be accompanied by an authoritative, content-addressed reference entity.

---

## 2. First-Class Reference Taxonomy & Schema

A reference MUST be one of the following recognized types:
- `text`: Design tokens, API schemas, product briefs, ADRs, mathematical specifications.
- `image`: Visual reference screenshots, Figma frame exports, wireframe captures.
- `video`: Screen recording of motion choreography or interaction transitions.
- `audio`: Chimes, earcons, voice synthesis clips, acoustic feedback samples.
- `design_file`: Raw Figma schema JSON, OpenDesign token exports, Penpot designs.
- `code_file`: Concrete source code files anchored with line ranges (`#L10-L45`).
- `diff`: Git diff patches or AST transform delta specifications.
- `test_result`: Automated JUnit XML, Playwright trace, or coverage scorecard.
- `benchmark`: Latency profile, flamegraph, or resource consumption trace.
- `proof_receipt`: Cryptographically signed mathematical invariant proof receipt.

### 2.1 Reference Contract Schema
```json
{
  "reference_id": "REF-0001",
  "type": "image",
  "purpose": "visual_layout_reference",
  "uri": "docs/02-product/design/reference/dashboard.png",
  "content_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "viewport": {
    "width": 1440,
    "height": 900,
    "device_pixel_ratio": 1.0
  },
  "fonts": [
    { "family": "Inter", "weight": [400, 600, 700], "source": "local_woff2" }
  ],
  "source": "human_uploaded",
  "authority": "approved_design_reference",
  "relevance": "defines primary layout, 8px grid, and card shadows",
  "used_by": ["DAVE-UX-0001", "DAVE-FE-0001"]
}
```

---

## 3. Physical Filesystem & Content-Hash Verification

1. **Existence Verification:** The reference URI MUST point to a physical file existing within the repository or local filesystem.
2. **Digest Verification:** The SHA-256 digest of the physical file MUST match `content_hash` exactly.
3. **Immutability:** If a reference file is altered on disk, its SHA-256 hash changes, immediately invalidating downstream decisions until a new DAVE decision record is created and re-approved.
4. **Automated Enforcement:** Checked deterministically via `dave-reference-harness.mjs`. Any missing file or mismatched hash causes immediate build termination.

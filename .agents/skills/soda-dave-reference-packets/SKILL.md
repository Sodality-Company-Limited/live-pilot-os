---
name: soda-dave-reference-packets
version: "1.0.0"
description: >-
  DAVE Reference & Evidence Ingestion Engine — ingests multi-modal visual, text,
  audio, and code references, computes physical SHA-256 digests, validates viewport
  and locked-font metadata, and enforces content-addressable reference integrity.
  Triggers: dave inspect-reference, dave verify-references, dave reference-packet.
---

# DAVE Reference Packets

This skill defines the operational procedure for ingesting and validating authoritative references.

## Operational Steps

1. **Physical File Ingestion:** Locate the physical reference file (`image`, `text`, `audio`, `video`, etc.).
2. **Cryptographic Sealing:** Calculate SHA-256 digest of file bytes using `crypto.createHash('sha256')`.
3. **Metadata Extraction:** Extract viewport dimensions, DPR, font dependencies, and authority level.
4. **Reference Registration:** Output canonical reference record (`REF-xxxx`) for consumption by DAVE decisions.
5. **Continuous Verification:** Periodically re-verify referenced files to detect accidental drift or tampering.

# Artifact and Model Provenance Governance Rule

> **Scope:** Governs all build artifacts, proof receipts, model checkpoints, dataset digests, test outputs, and evidence reports.  
> **Invariants:** 100% cryptographic lineage, immutable SHA256 hashes, zero stale certifications.

---

## 1. Provenance Metadata Contract

Every artifact generated during verification, training, or benchmarking MUST embed or accompany an immutable provenance receipt containing:

```json
{
  "artifact_path": "path/to/artifact.bin",
  "artifact_sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
  "source_revision": "git-head-commit-sha",
  "source_files": [
    {
      "path": "src/core/decision.mjs",
      "sha256": "5b9794905026e9d6d..."
    }
  ],
  "generator_command": "node scripts/harness/generate-artifact.mjs",
  "generated_at": "ISO-TIMESTAMP",
  "environment": {
    "node_version": "v20.x",
    "os": "darwin-arm64"
  }
}
```

---

## 2. Hard Provenance Invariants

1. **Exact-HEAD Match:** Artifact verification checks (e.g. `scripts/harness/artifact-provenance-harness.mjs`) compute SHA256 hashes of the referenced source files in the active working tree. Any mismatch marks the artifact as `STALE_INVALID` and rejects the goal.
2. **No Success on Failure:** If any unit test, property test, or invariant check fails, exits non-zero, or is marked skipped/todo, generating a `PASS` certificate or proof receipt is strictly forbidden.
3. **Model & Checkpoint Lineage:** For ML weights and adapters, the artifact receipt must link to the exact dataset revision hash, tokenizer revision, training configuration YAML, and random seed.
4. **Tamper Detection:** Stored proof receipts and evidence artifacts cannot be edited manually. Altering receipt timestamps or signatures without re-running the generator triggers immediate verification failure.

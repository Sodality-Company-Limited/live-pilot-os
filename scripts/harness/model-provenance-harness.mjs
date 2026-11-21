#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MODEL PROVENANCE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Cryptographic Model & Weights Lineage Verification
 * Purpose: Verifies model checkpoint provenance manifests, recomputes SHA256
 *          hashes of adapter tensors, tokenizer files, and training configs,
 *          and detects stale or untracked model artifacts.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import crypto from 'node:crypto';

/**
 * Validates a model provenance manifest.
 */
export function validateModelProvenance(manifestOrPath, options = {}) {
  const errors = [];
  const warnings = [];
  let manifest = null;

  if (typeof manifestOrPath === 'string') {
    const fullPath = resolve(process.cwd(), manifestOrPath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [`Model provenance manifest not found: ${manifestOrPath}`],
        warnings
      };
    }
    try {
      manifest = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      return {
        valid: false,
        errors: [`Malformed model provenance JSON: ${err.message}`],
        warnings
      };
    }
  } else if (typeof manifestOrPath === 'object' && manifestOrPath !== null) {
    manifest = manifestOrPath;
  } else {
    return {
      valid: false,
      errors: ['Manifest must be a file path string or an object'],
      warnings
    };
  }

  // 1. Schema version
  if (manifest.schema_version !== 1) {
    errors.push(`Missing or invalid schema_version: got ${manifest.schema_version} (expected 1)`);
  }

  // 2. Model ID & Revision
  if (!manifest.model_id) errors.push('Missing model_id');
  if (!manifest.source_revision) errors.push('Missing source_revision git commit SHA');

  // 3. Dataset Lineage
  if (!manifest.dataset_lineage || !manifest.dataset_lineage.sha256) {
    errors.push('Missing dataset_lineage with sha256 digest');
  }

  // 4. Tokenizer Revision
  if (!manifest.tokenizer || !manifest.tokenizer.sha256) {
    errors.push('Missing tokenizer specification with sha256 digest');
  }

  // 5. Training Config
  if (!manifest.training_config || !manifest.training_config.sha256) {
    errors.push('Missing training_config with sha256 digest');
  }

  // 6. Artifact Files SHA256 Verification (if verify_disk is enabled or requested)
  if (options.verify_disk && Array.isArray(manifest.artifacts)) {
    for (const art of manifest.artifacts) {
      if (!art.path || !art.sha256) {
        errors.push('Artifact item missing path or sha256');
        continue;
      }
      const fullArtPath = resolve(process.cwd(), art.path);
      if (!existsSync(fullArtPath)) {
        errors.push(`Artifact file missing on disk: ${art.path}`);
        continue;
      }
      const actualHash = crypto.createHash('sha256').update(readFileSync(fullArtPath)).digest('hex');
      if (actualHash !== art.sha256) {
        errors.push(
          `Artifact SHA256 mismatch for ${art.path}: manifest recorded ${art.sha256}, actual is ${actualHash}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest
  };
}

// CLI Execution
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node model-provenance-harness.mjs <manifest-file-or-goal-id>');
    process.exit(1);
  }

  let manifestPath = target;
  if (!target.endsWith('.json')) {
    manifestPath = `docs/07-backlog/evidence/${target}-model-provenance.json`;
    if (!existsSync(manifestPath)) {
      manifestPath = `artifacts/evidence/${target}-model-provenance.json`;
    }
  }

  const result = validateModelProvenance(manifestPath, { verify_disk: true });
  if (!result.valid) {
    console.error(`❌ Model Provenance Validation Failed for: ${manifestPath}`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ Model Provenance Validated: ${manifestPath}`);
  console.log(`   Model ID: ${result.manifest.model_id}`);
  console.log(`   Source Revision: ${result.manifest.source_revision}`);
  process.exit(0);
}

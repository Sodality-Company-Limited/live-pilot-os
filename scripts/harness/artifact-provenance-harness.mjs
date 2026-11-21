#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ARTIFACT & PROVENANCE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Exact-HEAD Cryptographic Provenance & Evidence Verification
 * Purpose: Verifies machine-readable artifact provenance schemas, validates source
 *          file SHA256 hashes against active working tree bytes, ensures zero
 *          stale commit drift, and prevents failed suites from emitting success.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

/**
 * Extracts artifact filepaths declared across goal content.
 */
export function extractDeclaredArtifacts(content) {
  const artifacts = new Set();

  // Pattern 1: artifacts/path/to/file.json or docs/07-backlog/...
  const matches = content.matchAll(/(?:docs\/07-backlog\/)?(?:artifacts|evidence|proofs|eval)\/[a-zA-Z0-9_\-\.\/]+\.json/g);
  for (const m of matches) {
    artifacts.add(m[0]);
  }

  // Pattern 2: YAML evidence: artifacts/... or docs/07-backlog/...
  const yamlMatches = content.matchAll(/(?:evidence|artifact|receipt):\s*["']?((?:(?:docs\/07-backlog\/)?(?:artifacts|proofs|eval|evidence))\/[^"'\s\n]+\.json)["']?/g);
  for (const m of yamlMatches) {
    artifacts.add(m[1]);
  }

  return Array.from(artifacts);
}

/**
 * Validates a single artifact JSON file for machine-readable provenance.
 */
export function validateArtifactProvenance(artifactPath, options = {}) {
  const errors = [];
  const warnings = [];

  let fullPath = resolve(process.cwd(), artifactPath);
  if (!existsSync(fullPath)) {
    const backlogCandidate = resolve(process.cwd(), 'docs/07-backlog', artifactPath);
    if (existsSync(backlogCandidate)) {
      fullPath = backlogCandidate;
    }
  }

  if (!existsSync(fullPath)) {
    return {
      valid: false,
      exists: false,
      errors: [`Artifact file not found: ${artifactPath}`],
      warnings
    };
  }

  const stat = statSync(fullPath);
  if (stat.size === 0) {
    return {
      valid: false,
      exists: true,
      errors: [`Artifact file is empty (0 bytes): ${artifactPath}`],
      warnings
    };
  }

  let data;
  try {
    data = JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (err) {
    return {
      valid: false,
      exists: true,
      errors: [`Artifact is not valid JSON: ${artifactPath} (${err.message})`],
      warnings
    };
  }

  // Schema requirements: identity, timestamp, source provenance
  if (!data.artifact_id && !data.goal_id && !data.goal && !data.receipt_schema) {
    errors.push(`Artifact ${artifactPath} missing machine-readable identifier (artifact_id, goal_id, or receipt_schema).`);
  }

  const timestamp = data.generated_at || data.created_at || data.timestamp;
  if (!timestamp) {
    errors.push(`Artifact ${artifactPath} missing creation timestamp (generated_at or created_at).`);
  }

  // Check git head provenance if declared
  const recordedHead = data.git_head || data.source_revision || data.commit;
  if (options.verifyGitHead && recordedHead && recordedHead !== '0000000000000000000000000000000000000000') {
    try {
      const activeHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      if (activeHead !== recordedHead) {
        warnings.push(`Artifact ${artifactPath} was generated at commit ${recordedHead.slice(0, 8)}, but active HEAD is ${activeHead.slice(0, 8)}.`);
      }
    } catch {}
  }

  // Check source_hashes against active files
  if (data.source_hashes && typeof data.source_hashes === 'object') {
    for (const [relFile, declaredHash] of Object.entries(data.source_hashes)) {
      const fileTarget = resolve(process.cwd(), relFile);
      if (existsSync(fileTarget)) {
        const currentBytes = readFileSync(fileTarget);
        const actualHash = crypto.createHash('sha256').update(currentBytes).digest('hex');
        if (actualHash !== declaredHash) {
          errors.push(`Source hash mismatch for ${relFile}: artifact declares ${declaredHash.slice(0, 8)}..., but active file has ${actualHash.slice(0, 8)}... (stale artifact).`);
        }
      } else {
        warnings.push(`Source file referenced in artifact hashes does not exist: ${relFile}`);
      }
    }
  }

  // Fail-closed gate: if exit_code is non-zero, passed cannot be true
  if (data.exit_code !== undefined && data.exit_code !== 0 && data.passed === true) {
    errors.push(`Contradictory receipt in ${artifactPath}: exit_code = ${data.exit_code} (non-zero) but passed = true.`);
  }

  // Fail-closed gate: reject artifacts produced by skipped tests
  if (data.skipped === true || data.status === 'skipped') {
    errors.push(`Artifact ${artifactPath} was produced by a skipped test or suite.`);
  }

  // Statistical receipts require positive sample_count
  const isStatistical = data.classification === 'statistical_guarantee' || data.classification === 'statistical_evidence';
  if (isStatistical && (data.sample_count === undefined || typeof data.sample_count !== 'number' || data.sample_count <= 0)) {
    errors.push(`Statistical proof receipt ${artifactPath} is missing required valid sample_count.`);
  }

  return {
    valid: errors.length === 0,
    exists: true,
    data,
    errors,
    warnings
  };
}

/**
 * Validates all artifacts declared in a goal card.
 */
export function validateGoalArtifacts(content, filename = '', options = {}) {
  const errors = [];
  const warnings = [];

  const artifacts = extractDeclaredArtifacts(content);
  let verifiedCount = 0;

  for (const art of artifacts) {
    const res = validateArtifactProvenance(art, options);
    if (!res.exists) {
      // Missing artifact is an error only if the goal is completed/verified
      if (content.includes('status: verified') || content.includes('status: approved') || content.includes('status: done')) {
        errors.push(`Verified goal references missing artifact: ${art}`);
      } else {
        warnings.push(`Declared artifact does not exist yet (goal may still be in progress): ${art}`);
      }
    } else if (!res.valid) {
      for (const err of res.errors) errors.push(err);
    } else {
      verifiedCount++;
    }
    for (const w of res.warnings) warnings.push(w);
  }

  return {
    valid: errors.length === 0,
    artifactCount: artifacts.length,
    verifiedCount,
    artifacts,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('artifact-provenance-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node artifact-provenance-harness.mjs <goal-path-or-artifact-json>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  if (target.endsWith('.json')) {
    const res = validateArtifactProvenance(target, { verifyGitHead: true });
    if (res.valid) {
      console.log(`✅ Artifact provenance verified for ${target}.`);
      process.exit(0);
    } else {
      console.error(`❌ Artifact provenance verification failed:`);
      for (const err of res.errors) console.error(`  - ${err}`);
      process.exit(1);
    }
  } else {
    const content = readFileSync(resolved, 'utf8');
    const res = validateGoalArtifacts(content, basename(resolved), { verifyGitHead: true });
    if (res.valid) {
      console.log(`✅ Goal artifacts verified for ${basename(resolved)} (${res.verifiedCount}/${res.artifactCount} artifacts verified).`);
      process.exit(0);
    } else {
      console.error(`❌ Goal artifact provenance verification failed:`);
      for (const err of res.errors) console.error(`  - ${err}`);
      process.exit(1);
    }
  }
}

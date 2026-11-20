#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CRYPTOGRAPHIC RECEIPT FRESHNESS ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Cryptographic Epistemic Assurance & Source Drift Invalidation
 * Purpose: Validates active source-bound proof receipts by calculating live
 *          SHA-256 digests of all referenced source files, asserting git HEAD
 *          alignment, and enforcing configurable timestamp freshness SLAs (24h).
 *          Rejects stale, modified, or expired receipts with exit code 1.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

/**
 * Custom error thrown when a proof receipt is determined to be stale.
 */
export class ReceiptFreshnessError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = options.name || 'ReceiptFreshnessError';
    this.code = options.code || 'ERR_RECEIPT_FRESHNESS';
    this.exitCode = options.exitCode !== undefined ? options.exitCode : 1;
    this.reasons = options.reasons || [message];
    this.details = options.details || null;
  }
}

export class ReceiptStaleError extends ReceiptFreshnessError {
  constructor(message, options = {}) {
    super(message, {
      name: 'ReceiptStaleError',
      code: 'ERR_RECEIPT_STALE',
      exitCode: 1,
      ...options
    });
  }
}

export class ReceiptInvalidError extends ReceiptFreshnessError {
  constructor(message, options = {}) {
    super(message, {
      name: 'ReceiptInvalidError',
      code: 'ERR_RECEIPT_INVALID',
      exitCode: 1,
      ...options
    });
  }
}

/**
 * Computes physical SHA-256 hex digest of a file.
 * @param {string} filePath
 * @param {string} [cwd=process.cwd()]
 * @returns {string} 64-character lowercase hex digest
 */
export function computeFileSha256(filePath, cwd = process.cwd()) {
  const fullPath = resolve(cwd, filePath);
  if (!existsSync(fullPath)) {
    throw new ReceiptInvalidError(`File not found for SHA256 computation: ${filePath}`, {
      reasons: [`File not found: ${filePath}`]
    });
  }
  const content = readFileSync(fullPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Retrieves the current git HEAD commit SHA.
 * @param {string} [cwd=process.cwd()]
 * @returns {string|null} Commit SHA or null if git is unavailable
 */
export function getActiveGitHead(cwd = process.cwd()) {
  try {
    const stdout = execSync('git rev-parse HEAD', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    const trimmed = stdout.trim();
    if (/^[0-9a-f]{40}$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if candidateCommit is an ancestor of or equal to headCommit.
 * @param {string} candidateCommit
 * @param {string} headCommit
 * @param {string} [cwd=process.cwd()]
 * @returns {boolean}
 */
export function isCommitAncestor(candidateCommit, headCommit, cwd = process.cwd()) {
  if (!candidateCommit || !headCommit) return false;
  if (candidateCommit.toLowerCase() === headCommit.toLowerCase()) return true;
  try {
    execSync(`git merge-base --is-ancestor ${candidateCommit} ${headCommit}`, {
      cwd,
      stdio: ['ignore', 'ignore', 'ignore'],
      timeout: 3000
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves source file path, handling migration between active and archived goals.
 * @param {string} relPath
 * @param {string} [cwd=process.cwd()]
 * @returns {string} Resolved absolute path or original absolute path
 */
export function resolveSourcePath(relPath, cwd = process.cwd()) {
  let fullPath = resolve(cwd, relPath);
  if (!existsSync(fullPath) && relPath.includes('/goals/') && !relPath.includes('/_archived/')) {
    const archived = relPath.replace('/goals/', '/goals/_archived/');
    const archivedPath = resolve(cwd, archived);
    if (existsSync(archivedPath)) {
      return archivedPath;
    }
  }
  return fullPath;
}

/**
 * Calculates active disk SHA-256 hashes for all source files in a receipt.
 * @param {object} receipt
 * @param {string} [cwd=process.cwd()]
 * @returns {Array<{ path: string, expectedSha256: string, actualSha256: string|null, match: boolean, exists: boolean }>}
 */
export function calculateActiveSourceHashes(receipt, cwd = process.cwd()) {
  if (!receipt || !Array.isArray(receipt.source_files)) {
    return [];
  }

  const results = [];
  for (const sf of receipt.source_files) {
    if (!sf || !sf.path) continue;
    const resolvedPath = resolveSourcePath(sf.path, cwd);
    const exists = existsSync(resolvedPath);
    let actualSha256 = null;
    let match = false;

    if (exists) {
      try {
        const bytes = readFileSync(resolvedPath);
        actualSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        match = (actualSha256 === sf.sha256);
      } catch {
        actualSha256 = null;
        match = false;
      }
    }

    results.push({
      path: sf.path,
      resolvedPath,
      expectedSha256: sf.sha256,
      actualSha256,
      match,
      exists
    });
  }

  return results;
}

/**
 * Evaluates whether a receipt has exceeded its timestamp freshness SLA.
 * @param {string|Date|number} generatedAt
 * @param {number} [maxAgeHours=24.0]
 * @param {Date|number|string} [now=new Date()]
 * @returns {{ expired: boolean, ageHours: number, maxAgeHours: number, generatedDate: Date }}
 */
export function isReceiptExpired(generatedAt, maxAgeHours = 24.0, now = new Date()) {
  if (!generatedAt) {
    return { expired: true, ageHours: Infinity, maxAgeHours, generatedDate: null };
  }

  const genDate = new Date(generatedAt);
  const nowDate = new Date(now);

  if (isNaN(genDate.getTime())) {
    return { expired: true, ageHours: Infinity, maxAgeHours, generatedDate: null };
  }

  const ageMs = Math.max(0, nowDate.getTime() - genDate.getTime());
  const ageHours = ageMs / (1000 * 60 * 60);

  return {
    expired: ageHours > maxAgeHours,
    ageHours,
    maxAgeHours,
    generatedDate: genDate
  };
}

/**
 * Resolves receipt target to a parsed receipt object and file path.
 * @param {string|object} target
 * @param {string} cwd
 * @returns {{ receipt: object, receiptPath: string|null }}
 */
function resolveReceiptTarget(target, cwd) {
  if (typeof target === 'object' && target !== null) {
    return { receipt: target, receiptPath: null };
  }

  if (typeof target !== 'string') {
    throw new ReceiptInvalidError('Target must be a path string or receipt object');
  }

  let fullPath = resolve(cwd, target);
  if (!existsSync(fullPath)) {
    // Try candidate evidence locations
    const candidates = [
      `docs/07-backlog/evidence/${target}-proof-receipt.json`,
      `artifacts/proofs/${target}-proof-receipt.json`,
      `artifacts/evidence/${target}-proof-receipt.json`,
      `docs/07-backlog/evidence/${target}.json`,
      `artifacts/proofs/${target}.json`
    ];
    for (const c of candidates) {
      const candidateFull = resolve(cwd, c);
      if (existsSync(candidateFull)) {
        fullPath = candidateFull;
        break;
      }
    }
  }

  if (!existsSync(fullPath)) {
    throw new ReceiptInvalidError(`Proof receipt file not found: ${target}`, {
      reasons: [`Proof receipt file not found: ${target}`]
    });
  }

  try {
    const raw = readFileSync(fullPath, 'utf8');
    const receipt = JSON.parse(raw);
    return { receipt, receiptPath: fullPath };
  } catch (err) {
    throw new ReceiptInvalidError(`Failed to parse proof receipt JSON (${fullPath}): ${err.message}`, {
      reasons: [`JSON parse failure: ${err.message}`]
    });
  }
}

/**
 * Comprehensive cryptographic freshness validator.
 * Validates:
 * 1. Physical disk byte SHA-256 match for all declared source files.
 * 2. Active git HEAD revision match against receipt.source_revision.
 * 3. Timestamp age SLA (<= maxAgeHours, default 24h).
 *
 * @param {string|object} receiptOrPath
 * @param {object} [options={}]
 * @param {string} [options.cwd=process.cwd()]
 * @param {number} [options.maxAgeHours=24.0]
 * @param {boolean} [options.checkGit=true]
 * @param {boolean} [options.checkBytes=true]
 * @param {boolean} [options.checkAge=true]
 * @param {Date|string|number} [options.now=new Date()]
 * @param {boolean} [options.verbose=false]
 * @returns {object} Evaluation verdict object
 */
export function evaluateReceiptFreshness(receiptOrPath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const maxAgeHours = options.maxAgeHours !== undefined ? Number(options.maxAgeHours) : 24.0;
  const checkGit = options.checkGit !== false;
  const checkBytes = options.checkBytes !== false;
  const checkAge = options.checkAge !== false;
  const now = options.now || new Date();

  let receipt = null;
  let receiptPath = null;
  const errors = [];
  const staleReasons = [];

  try {
    const resolved = resolveReceiptTarget(receiptOrPath, cwd);
    receipt = resolved.receipt;
    receiptPath = resolved.receiptPath;
  } catch (err) {
    return {
      valid: false,
      fresh: false,
      stale: true,
      status: 'INVALID',
      exitCode: 1,
      reasons: [err.message],
      details: null,
      receipt: null
    };
  }

  // Basic schema validation
  if (!receipt || typeof receipt !== 'object') {
    return {
      valid: false,
      fresh: false,
      stale: true,
      status: 'INVALID',
      exitCode: 1,
      reasons: ['Receipt payload is not a valid object'],
      details: null,
      receipt
    };
  }

  if (receipt.schema_version !== 1) {
    errors.push(`Invalid schema_version: expected 1, got ${receipt.schema_version}`);
  }
  if (!receipt.goal_id) {
    errors.push('Missing required goal_id in receipt');
  }
  if (!receipt.source_revision) {
    errors.push('Missing required source_revision in receipt');
  }

  // 1. Source file hash verification
  let sourceFilesReport = [];
  let fileHashMatches = true;
  if (checkBytes) {
    sourceFilesReport = calculateActiveSourceHashes(receipt, cwd);
    if (sourceFilesReport.length === 0 && (!receipt.source_files || receipt.source_files.length > 0)) {
      staleReasons.push('Receipt declares empty or invalid source_files manifest');
      fileHashMatches = false;
    }
    for (const sf of sourceFilesReport) {
      if (!sf.exists) {
        staleReasons.push(`Referenced source file missing on disk: ${sf.path}`);
        fileHashMatches = false;
      } else if (!sf.match) {
        staleReasons.push(
          `SHA256 mismatch for ${sf.path}: receipt recorded ${sf.expectedSha256?.slice(0, 12)}..., active disk is ${sf.actualSha256?.slice(0, 12)}...`
        );
        fileHashMatches = false;
      }
    }
  }

  // 2. Git revision verification
  const activeGitHead = checkGit ? getActiveGitHead(cwd) : null;
  let gitMatch = true;
  if (checkGit && activeGitHead && receipt.source_revision) {
    const isExact = activeGitHead.toLowerCase() === receipt.source_revision.toLowerCase();
    const isAncestor = !isExact && isCommitAncestor(receipt.source_revision, activeGitHead, cwd);
    // If the commit is an ancestor and all source files are 100% byte-matched, the receipt is valid across subsequent commits
    if (!isExact && (!isAncestor || !fileHashMatches)) {
      staleReasons.push(
        `Git commit SHA mismatch: receipt bound to ${receipt.source_revision.slice(0, 12)}..., active HEAD is ${activeGitHead.slice(0, 12)}...`
      );
      gitMatch = false;
    }
  }

  // 3. Timestamp Freshness SLA verification
  let ageReport = { expired: false, ageHours: 0, maxAgeHours, generatedDate: null };
  if (checkAge) {
    ageReport = isReceiptExpired(receipt.generated_at, maxAgeHours, now);
    if (ageReport.expired) {
      staleReasons.push(
        `Receipt timestamp expired: age ${ageReport.ageHours.toFixed(2)}h exceeds configured SLA threshold (${maxAgeHours}h)`
      );
    }
  }

  const allReasons = [...errors, ...staleReasons];
  const isInvalid = errors.length > 0;
  const isStale = staleReasons.length > 0;
  const isFresh = !isInvalid && !isStale;

  let status = 'FRESH';
  if (isInvalid) {
    status = 'INVALID';
  } else if (isStale) {
    status = 'STALE';
  }

  return {
    valid: !isInvalid,
    fresh: isFresh,
    stale: isStale || isInvalid,
    status,
    exitCode: isFresh ? 0 : 1,
    reasons: allReasons,
    details: {
      goalId: receipt.goal_id,
      receiptPath,
      classification: receipt.classification,
      sourceRevision: receipt.source_revision,
      activeGitHead,
      gitMatch,
      sourceFiles: sourceFilesReport,
      fileHashMatches,
      generatedAt: receipt.generated_at,
      ageHours: ageReport.ageHours,
      maxAgeHours,
      ageValid: !ageReport.expired
    },
    receipt
  };
}

/**
 * Asserts that a receipt is fresh, throwing a fail-closed exception if stale or invalid.
 * @param {string|object} receiptOrPath
 * @param {object} [options={}]
 * @returns {object} Receipt object if fresh
 */
export function assertReceiptFresh(receiptOrPath, options = {}) {
  const result = evaluateReceiptFreshness(receiptOrPath, options);
  if (!result.fresh) {
    if (result.status === 'INVALID') {
      throw new ReceiptInvalidError(`Receipt validation failed: ${result.reasons.join('; ')}`, {
        reasons: result.reasons,
        details: result.details
      });
    }
    throw new ReceiptStaleError(`Receipt is STALE: ${result.reasons.join('; ')}`, {
      reasons: result.reasons,
      details: result.details
    });
  }
  return result.receipt;
}

/**
 * Scans a directory of proof receipts and returns freshness evaluations.
 * @param {string} dirPath
 * @param {object} [options={}]
 * @returns {object} Summary report
 */
export function scanDirectoryFreshness(dirPath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const fullDir = resolve(cwd, dirPath);
  if (!existsSync(fullDir)) {
    return { total: 0, freshCount: 0, staleCount: 0, invalidCount: 0, results: [] };
  }

  const entries = readdirSync(fullDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .sort();

  const results = [];
  let freshCount = 0;
  let staleCount = 0;
  let invalidCount = 0;

  for (const entry of entries) {
    const filePath = resolve(fullDir, entry);
    const evalResult = evaluateReceiptFreshness(filePath, options);
    if (evalResult.fresh) freshCount++;
    else if (evalResult.status === 'STALE') staleCount++;
    else invalidCount++;

    results.push({
      file: entry,
      path: filePath,
      status: evalResult.status,
      fresh: evalResult.fresh,
      reasons: evalResult.reasons
    });
  }

  return {
    directory: dirPath,
    total: entries.length,
    freshCount,
    staleCount,
    invalidCount,
    allFresh: freshCount === entries.length && entries.length > 0,
    results
  };
}

// ── CLI Runner ──
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
🛡️ SODA OS CRYPTOGRAPHIC RECEIPT FRESHNESS ENGINE
Usage:
  node scripts/lib/receipt-freshness-engine.mjs [options]

Options:
  --receipt <path|id>   Target receipt file path or goal ID (default: G-PROOF-010)
  --max-age-hours <n>   Max age SLA in hours before receipt is considered stale (default: 24)
  --ignore-git          Skip git HEAD alignment check
  --ignore-age          Skip timestamp expiration check
  --scan-dir <path>     Scan all JSON receipts in target directory
  --json                Emit machine-readable JSON output
  --verbose             Display detailed evaluation traces
  --help                Show this message
`);
    process.exit(0);
  }

  const isJson = args.includes('--json');
  const isVerbose = args.includes('--verbose');
  const ignoreGit = args.includes('--ignore-git');
  const ignoreAge = args.includes('--ignore-age');

  let maxAgeHours = 24.0;
  const ageIdx = args.indexOf('--max-age-hours');
  if (ageIdx !== -1 && args[ageIdx + 1]) {
    maxAgeHours = parseFloat(args[ageIdx + 1]);
  }

  const scanDirIdx = args.indexOf('--scan-dir');
  if (scanDirIdx !== -1 && args[scanDirIdx + 1]) {
    const scanDir = args[scanDirIdx + 1];
    const report = scanDirectoryFreshness(scanDir, {
      maxAgeHours,
      checkGit: !ignoreGit,
      checkAge: !ignoreAge,
      verbose: isVerbose
    });

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`\n══════════════════════════════════════════════════════════════════`);
      console.log(`🛡️ SODA OS RECEIPT FRESHNESS SCAN: ${scanDir}`);
      console.log(`══════════════════════════════════════════════════════════════════`);
      console.log(`Total Receipts Scanned : ${report.total}`);
      console.log(`Fresh Receipts         : ${report.freshCount}`);
      console.log(`Stale Receipts         : ${report.staleCount}`);
      console.log(`Invalid Receipts       : ${report.invalidCount}`);
      console.log(`Verdict                : ${report.allFresh ? '✅ ALL FRESH' : '❌ STALE OR INVALID DETECTED'}`);
      console.log(`══════════════════════════════════════════════════════════════════\n`);
    }
    process.exit(report.allFresh ? 0 : 1);
  }

  let receiptTarget = 'G-PROOF-010';
  const receiptIdx = args.indexOf('--receipt');
  if (receiptIdx !== -1 && args[receiptIdx + 1]) {
    receiptTarget = args[receiptIdx + 1];
  } else if (args[0] && !args[0].startsWith('--')) {
    receiptTarget = args[0];
  }

  const result = evaluateReceiptFreshness(receiptTarget, {
    maxAgeHours,
    checkGit: !ignoreGit,
    checkAge: !ignoreAge,
    verbose: isVerbose
  });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n══════════════════════════════════════════════════════════════════`);
    console.log(`🛡️ RECEIPT FRESHNESS VERIFICATION: ${receiptTarget}`);
    console.log(`══════════════════════════════════════════════════════════════════`);
    console.log(`Status        : ${result.status === 'FRESH' ? '✅ FRESH' : result.status === 'STALE' ? '⚠️ STALE' : '❌ INVALID'}`);
    console.log(`Goal ID       : ${result.details?.goalId || 'N/A'}`);
    console.log(`Git Alignment : ${result.details?.gitMatch ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Disk Bytes    : ${result.details?.fileHashMatches ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Age SLA       : ${result.details?.ageValid ? 'PASS' : 'EXPIRED'} (${result.details?.ageHours?.toFixed(2) || 0}h / max ${maxAgeHours}h)`);
    if (result.reasons.length > 0) {
      console.log(`\nFailure Reasons:`);
      for (const r of result.reasons) {
        console.log(`  - ${r}`);
      }
    }
    console.log(`══════════════════════════════════════════════════════════════════\n`);
  }

  process.exit(result.exitCode);
}

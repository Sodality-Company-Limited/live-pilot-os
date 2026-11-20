#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS SECURITY BOUNDARY & THREAT MODEL HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Zero-Trust Sandboxing & Threat Model Governance
 * Purpose: Validates security threat models, trust boundaries, prompt-injection
 *          defenses, tool authorization policies, PII scrubbing, secret handling,
 *          and supply-chain / dataset poisoning controls.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import {
  validateSandboxedPath,
  SecurityBoundaryViolationError,
  computeContentHash,
  hasExifOrMetadata,
  detectSensitivePatterns,
  generateSecurityAuditReceipt
} from '../lib/multimodal-reference-guard.mjs';

export const MANDATORY_SECURITY_DOMAINS = [
  'threat_model',
  'trust_boundary',
  'tool_authorization',
  'sandbox_boundary',
  'secret_handling',
  'pii_handling'
];

/**
 * Extracts security block from markdown content.
 */
export function extractSecurityContract(content) {
  // Check YAML block: security:
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*security:\s*$/m.test(text)) {
      return parseSecurityYaml(text);
    }
  }

  // Check Markdown section
  const sectionMatch = content.match(/##\s+(?:Security|Security\s+&\s+Trust\s+Boundaries)[\s\S]*?(?=\n##\s+|$)/i);
  if (sectionMatch) {
    return parseSecurityMarkdown(sectionMatch[0]);
  }

  return null;
}

function parseSecurityYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const data = {};

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const propMatch = rawLine.match(/^\s*([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (propMatch) {
      const k = propMatch[1];
      const v = propMatch[2].trim();
      if (v) {
        data[k] = v.replace(/^['"]|['"]$/g, '');
      } else {
        data[k] = {};
      }
    }
  }
  return data;
}

function parseSecurityMarkdown(sectionText) {
  const data = {};
  if (/threat\s+model/i.test(sectionText)) data.threat_model = true;
  if (/trust\s+boundar(?:y|ies)/i.test(sectionText)) data.trust_boundary = true;
  if (/tool\s+authoriz(?:ation|ed)/i.test(sectionText)) data.tool_authorization = true;
  if (/sandbox/i.test(sectionText)) data.sandbox_boundary = true;
  if (/secret/i.test(sectionText)) data.secret_handling = true;
  if (/pii/i.test(sectionText)) data.pii_handling = true;
  if (/prompt[\s-]injection/i.test(sectionText)) data.prompt_injection_defense = true;
  if (/poisoning|reward\s+hacking/i.test(sectionText)) data.ml_security = true;
  return data;
}

/**
 * Validates security boundaries across goals.
 */
export function validateSecurityBoundaries(content, filename = '') {
  const errors = [];
  const warnings = [];

  const contract = extractSecurityContract(content);
  const requiresSecurity = /security/i.test(content) ||
                            content.includes('agent_execution') ||
                            content.includes('ml_research') ||
                            /API|Gateway|Auth|Token|Payment|Docker|Container|Wasm/i.test(content);

  // Check for hardcoded secrets anti-pattern first (regardless of whether contract exists)
  const secretPattern = /(?:api[_-]?key|secret|password|bearer|auth[_-]?token)\s*[:=]\s*["'][A-Za-z0-9+/=_\-]{16,}["']/i;
  if (secretPattern.test(content)) {
    errors.push('CRITICAL: Goal document contains an apparent hardcoded secret or token! Strictly prohibited by Article I & Governance.');
  }

  if (!contract || Object.keys(contract).length === 0) {
    if (requiresSecurity && !filename.includes('_template')) {
      errors.push('Goal touches security-sensitive surfaces (APIs, execution, models, auth) but provides no security contract or threat model.');
    }
    return {
      valid: errors.length === 0,
      domainsCovered: 0,
      errors,
      warnings
    };
  }

  // Verify critical security domains
  if (!contract.trust_boundary && !contract.trust_boundaries && !/trust\s+boundar/i.test(content)) {
    warnings.push('Goal security section does not explicitly define trust boundaries between execution contexts.');
  }

  if (!contract.sandbox_boundary && !contract.sandbox && !/sandbox|wasm|cgroup/i.test(content)) {
    if (content.includes('agent_execution') || /tool|code\s+execution/i.test(content)) {
      errors.push('Agent execution goal does not define sandbox boundaries (WASM / CGroups v2 / MicroVM). Untrusted tool execution without sandbox is strictly prohibited.');
    }
  }

  if (content.includes('ml_research') || /RLCD|loss|reward|dataset/i.test(content)) {
    const hasPoisoningOrHacking = /poison|reward[\s-]hack|gaming|backdoor/i.test(content);
    if (!hasPoisoningOrHacking && !filename.includes('_template')) {
      warnings.push('ML / Research goal does not explicitly address reward hacking, confidence gaming, or dataset poisoning mitigations.');
    }
  }

  return {
    valid: errors.length === 0,
    domainsCovered: Object.keys(contract).length,
    contract,
    errors,
    warnings
  };
}

/**
 * Validates multimodal reference security boundaries, sandbox isolation, and hash validity.
 */
export function runMultimodalSecurityBoundaryHarness(options = {}) {
  console.log('🛡️ Executing Multimodal Reference Security Boundary & Sandbox Harness (G-SEC-001)...');

  const workspaceRoot = options.workspaceRoot || process.cwd();
  let passedChecks = 0;
  let failedChecks = 0;
  const failureLog = [];

  // 1. Verify Path Traversal Protection
  console.log('   [1/4] Verifying path traversal protection and sandbox boundaries...');
  const attackVectors = [
    '../../etc/passwd',
    '../../../package.json',
    'docs/02-product/design/reference/../../cli.js',
    'docs/02-product/design/reference/..%2f..%2fetc%2fpasswd',
    'docs/02-product/design/reference/test.png\0.exe',
    '/etc/shadow',
    '/var/log/system.log',
    '../../data/references/exploit.png',
    '..\\..\\windows\\system32',
    'docs/02-product/design/reference/subdir/../../../escape.png'
  ];

  let traversalBlockedCount = 0;
  for (const attack of attackVectors) {
    try {
      validateSandboxedPath(attack, { allowedRoot: 'docs/02-product/design/reference', workspaceRoot });
      failedChecks++;
      failureLog.push(`CRITICAL: Path traversal attempt succeeded for vector: ${attack}`);
    } catch (err) {
      if (err instanceof SecurityBoundaryViolationError) {
        traversalBlockedCount++;
      } else {
        failedChecks++;
        failureLog.push(`Unexpected error type on attack vector ${attack}: ${err.message}`);
      }
    }
  }

  if (traversalBlockedCount === attackVectors.length) {
    passedChecks++;
    console.log(`      ✅ Blocked all ${traversalBlockedCount}/${attackVectors.length} path traversal attack vectors fail-closed.`);
  } else {
    console.error(`      ❌ Failed path traversal defense (${traversalBlockedCount}/${attackVectors.length} blocked).`);
  }

  // 2. Verify Canonical Reference Sandbox Confinement
  console.log('   [2/4] Verifying physical reference files in approved sandbox...');
  const refDir = resolve(workspaceRoot, 'docs/02-product/design/reference');
  const fallbackRefDir = resolve(workspaceRoot, 'data/references');
  const targetDirs = [refDir, fallbackRefDir].filter(d => existsSync(d));

  let verifiedRefFiles = 0;
  for (const dir of targetDirs) {
    const files = readdirSync(dir).filter(f => !f.startsWith('.') && !f.endsWith('.json'));
    for (const f of files) {
      const fullPath = resolve(dir, f);
      try {
        const canonical = validateSandboxedPath(fullPath, {
          allowedRoot: dir === refDir ? 'docs/02-product/design/reference' : 'data/references',
          workspaceRoot
        });
        const buffer = readFileSync(canonical);

        // Verify SHA-256 integrity
        const hash = computeContentHash(buffer);
        if (!hash.startsWith('sha256:') || hash.length !== 71) {
          failedChecks++;
          failureLog.push(`Invalid content hash generated for ${f}: ${hash}`);
        }

        // Verify metadata stripped
        if (hasExifOrMetadata(buffer)) {
          failedChecks++;
          failureLog.push(`Reference ${f} contains residual EXIF/GPS metadata tags!`);
        }

        // Verify no unmasked secrets
        const secrets = detectSensitivePatterns(buffer);
        if (secrets.length > 0) {
          failedChecks++;
          failureLog.push(`Reference ${f} contains ${secrets.length} unmasked sensitive tokens!`);
        }

        verifiedRefFiles++;
      } catch (err) {
        failedChecks++;
        failureLog.push(`Reference sandbox validation error on ${f}: ${err.message}`);
      }
    }
  }

  if (verifiedRefFiles >= 1 && failedChecks === 0) {
    passedChecks++;
    console.log(`      ✅ Confined and verified ${verifiedRefFiles} reference files with clean metadata and zero leaks.`);
  }

  // 3. Verify Dynamic Secret Scanning & Receipt Generation
  console.log('   [3/4] Validating audit receipt generation and cryptographic binding...');
  const receipt = generateSecurityAuditReceipt({ workspaceRoot });
  if (receipt.certification === 'PASS' && receipt.unmasked_secrets_count === 0) {
    passedChecks++;
    console.log(`      ✅ Audit receipt generated: certification=PASS, references=${receipt.sha256_verified_references.length}.`);
  } else {
    failedChecks++;
    failureLog.push(`Audit receipt certification failed: ${receipt.certification}`);
  }

  // 4. Verify G-SEC-001 Goal Security Contract
  console.log('   [4/4] Validating G-SEC-001 security threat model contract...');
  let goalPath = resolve(workspaceRoot, 'docs/07-backlog/goals/G-SEC-001.md');
  if (!existsSync(goalPath)) {
    goalPath = resolve(workspaceRoot, 'docs/07-backlog/goals/_archived/G-SEC-001.md');
  }
  if (existsSync(goalPath)) {
    const goalContent = readFileSync(goalPath, 'utf8');
    const contractRes = validateSecurityBoundaries(goalContent, 'G-SEC-001.md');
    if (contractRes.valid) {
      passedChecks++;
      console.log(`      ✅ G-SEC-001 threat model contract verified (${contractRes.domainsCovered} domains covered).`);
    } else {
      failedChecks++;
      failureLog.push(`G-SEC-001 security contract validation failed: ${contractRes.errors.join('; ')}`);
    }
  } else {
    failedChecks++;
    failureLog.push('docs/07-backlog/goals/G-SEC-001.md not found');
  }

  console.log(`\n════════════════════════════════════════════════════════════════════════════════`);
  if (failedChecks === 0) {
    console.log(`✅ MULTIMODAL REFERENCE SECURITY HARNESS: ALL ${passedChecks} GATES PASSED.`);
    console.log(`════════════════════════════════════════════════════════════════════════════════`);
    return { valid: true, passedChecks, failedChecks: 0 };
  } else {
    console.error(`❌ MULTIMODAL REFERENCE SECURITY HARNESS: ${failedChecks} GATES FAILED.`);
    for (const f of failureLog) console.error(`   - ${f}`);
    console.log(`════════════════════════════════════════════════════════════════════════════════`);
    return { valid: false, passedChecks, failedChecks, errors: failureLog };
  }
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('security-boundary-harness.mjs')) {
  const target = process.argv[2];

  if (target && !target.startsWith('-')) {
    const resolved = resolve(process.cwd(), target);
    if (!existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    const content = readFileSync(resolved, 'utf8');
    const res = validateSecurityBoundaries(content, basename(resolved));
    if (res.valid) {
      console.log(`✅ Security boundaries verified for ${basename(resolved)} (${res.domainsCovered} domains covered).`);
      process.exit(0);
    } else {
      console.error(`❌ Security boundary validation failed for ${basename(resolved)}:`);
      for (const err of res.errors) console.error(`  - ${err}`);
      process.exit(1);
    }
  } else {
    // Default mode: run full Multimodal Reference Security Boundary Harness
    const res = runMultimodalSecurityBoundaryHarness();
    process.exit(res.valid ? 0 : 1);
  }
}


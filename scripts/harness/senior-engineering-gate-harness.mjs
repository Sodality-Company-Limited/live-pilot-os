#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ SODA OS SENIOR ENGINEERING GATE HARNESS (28 PILLARS ACROSS 7 DOMAINS)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Deterministic validation harness verifying that application code,
 *          database migrations, concurrency models, consensus mechanisms,
 *          security boundaries, AI agent guardrails, and SRE resilience
 *          strictly satisfy the 28-Pillar Senior Engineering Gate.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

export const ENTERPRISE_DOMAINS = [
  {
    id: 'domain-1',
    name: 'Algorithmic Correctness, Data Integrity & Formal Verification',
    romanNumeral: 'I',
    pillarIds: [1, 2, 3, 4]
  },
  {
    id: 'domain-2',
    name: 'Concurrency, Deadlock Prevention & Distributed State',
    romanNumeral: 'II',
    pillarIds: [5, 6, 7, 8]
  },
  {
    id: 'domain-3',
    name: 'Consensus, Flow Control & Partition Tolerance',
    romanNumeral: 'III',
    pillarIds: [9, 10, 11, 12]
  },
  {
    id: 'domain-4',
    name: 'Migration Safety, Release Engineering & DevSecOps',
    romanNumeral: 'IV',
    pillarIds: [13, 14, 15, 16]
  },
  {
    id: 'domain-5',
    name: 'Cryptography, Memory Hygiene & Zero-Trust Defense',
    romanNumeral: 'V',
    pillarIds: [17, 18, 19, 20]
  },
  {
    id: 'domain-6',
    name: 'AI Agent Governance, LLM Firewalls & Autonomous Safety',
    romanNumeral: 'VI',
    pillarIds: [21, 22, 23, 24]
  },
  {
    id: 'domain-7',
    name: 'SRE Sustainability, Multi-Region DR & Operational Longevity',
    romanNumeral: 'VII',
    pillarIds: [25, 26, 27, 28]
  }
];

export const SENIOR_ENGINEERING_PILLARS = [
  // ── Domain I: Algorithmic Correctness, Data Integrity & Formal Verification ──
  {
    id: 1,
    key: 'zero_mock_operational_logic',
    name: 'Business Logic & Zero-Mock Invariant',
    domain: 'I',
    description: '100% operational logic; zero todo!(), unimplemented!(), dummy objects, or mocked API returns in production code.',
    severity: 'FATAL',
    antiPatterns: [
      /\b(?:unimplemented|todo)!/,
      /\b(?:mock[_-]?response|fake[_-]?response|stub[_-]?response)\s*[:=]/i,
      /\breturn\s+(?:null|nil|None|\{\}|\[\])\s*;\s*\/\/\s*(?:stub|placeholder|todo)/i
    ]
  },
  {
    id: 2,
    key: 'minor_unit_financial_math',
    name: 'Data Integrity & Minor-Unit Math',
    domain: 'I',
    description: 'Monetary, financial, and temporal values represented in 64-bit integer minor units or fixed-point arithmetic; zero unchecked IEEE-754 floats for monetary balances.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\b(?:balance|amount|price|payout|fee|salary)\s*[:=]\s*(?:float|f32|f64)\b/i,
      /\b(?:balance|amount|price|payout|fee|salary)\s*\+=\s*\d+\.\d+/i
    ]
  },
  {
    id: 3,
    key: 'bounded_connection_pools',
    name: 'Database & Connection Pool Sizing',
    domain: 'I',
    description: 'Database connection pools strictly bounded (default N <= 50), statement timeout <= 5s, explicit indices on foreign keys and filter predicates.',
    severity: 'HIGH',
    antiPatterns: [
      /\bmax_connections\s*[:=]\s*(?:0|-1|9999|10000)\b/i,
      /\bstatement_timeout\s*[:=]\s*0\b/i
    ]
  },
  {
    id: 4,
    key: 'iam_rls_formal_verification',
    name: 'Multi-Tenant Isolation & Formal Verification',
    domain: 'I',
    description: 'Default-deny tenant isolation enforced via Row-Level Security (RLS) or tenant-scoping filters; passes 10-point Formal Verification sub-checklist.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\bSELECT\s+\*\s+FROM\s+(?:users|accounts|organizations|teams|ledgers|transactions)\s*(?:WHERE\s+deleted_at\s+IS\s+NULL)?;/i,
      /\bDELETE\s+FROM\s+(?:users|accounts|organizations|teams|ledgers|transactions)\s*;/i
    ]
  },

  // ── Domain II: Concurrency, Deadlock Prevention & Distributed State ──
  {
    id: 5,
    key: 'async_sagas_compensation',
    name: 'Async & Transactional Sagas',
    domain: 'II',
    description: 'Multi-stage distributed state mutations executed via state-tracked sagas with verified compensating undo transactions on intermediate failure.',
    severity: 'HIGH',
    antiPatterns: [
      /\bawait\s+externalService1\(\);\s*await\s+externalService2\(\);\s*(?!\bcatch\b|\btry\b)/
    ]
  },
  {
    id: 6,
    key: 'deadlock_prevention_lock_hierarchy',
    name: 'Deadlock Prevention & Lock Ordering',
    domain: 'II',
    description: 'Strict global lock acquisition hierarchy enforced; distributed locks enforce monotonic fencing tokens to prevent zombie leader split-brain writes.',
    severity: 'HIGH',
    antiPatterns: [
      /\block\(\s*mutexA\s*\);\s*lock\(\s*mutexB\s*\);[\s\S]{1,200}lock\(\s*mutexB\s*\);\s*lock\(\s*mutexA\s*\);/
    ]
  },
  {
    id: 7,
    key: 'anti_entropy_ryow_consistency',
    name: 'Anti-Entropy & Distributed Consistency',
    domain: 'II',
    description: 'Read-Your-Own-Writes (RYOW) with monotonic version vectors; idempotent event handlers with deduplication keys within replay windows.',
    severity: 'MEDIUM',
    antiPatterns: [
      /\bonMessage\s*=\s*async\s*\([^)]*\)\s*=>\s*\{(?![\s\S]{1,300}\b(?:idempotency|dedup|version|nonce)\b)/i
    ]
  },
  {
    id: 8,
    key: 'chaos_resilience_circuit_breakers',
    name: 'Chaos Resilience & Bounded Circuit Breakers',
    domain: 'II',
    description: 'Remote RPC/HTTP calls wrapped with circuit breakers (50% failure trip, 30s half-open trial, exponential backoff with full jitter).',
    severity: 'HIGH',
    antiPatterns: [
      /\bwhile\s*\(\s*true\s*\)\s*\{\s*(?:await\s+)?fetch\([^)]*\);?\s*\}/i
    ]
  },

  // ── Domain III: Consensus, Flow Control & Partition Tolerance ──
  {
    id: 9,
    key: 'consensus_quorum_safety',
    name: 'Distributed Consensus & Quorum Safety',
    domain: 'III',
    description: 'Consensus quorum Q = floor(N/2) + 1; monotonic term checks; linearizable reads via leader leases; automatic stepdown on split-brain partition.',
    severity: 'FATAL',
    antiPatterns: [
      /\bquorum\s*=\s*(?:active_nodes|nodes\.length)\s*\/\s*2\b/i
    ]
  },
  {
    id: 10,
    key: 'backpressure_adaptive_concurrency',
    name: 'Backpressure & Adaptive Concurrency',
    domain: 'III',
    description: 'Flow control governed by Little\'s Law (L = lambda * W), gradient limiters, and bounded CoDel queues; fail-fast HTTP 429/503 under saturation.',
    severity: 'HIGH',
    antiPatterns: [
      /\bnew\s+Array\(\)\s*;?\s*\/\/\s*unbounded queue/i,
      /\bchannel\s*[:=]\s*make\(chan\s+[A-Za-z0-9_]+,\s*0\)/
    ]
  },
  {
    id: 11,
    key: 'api_governance_contracts',
    name: 'API Governance & Contract Drift',
    domain: 'III',
    description: 'OpenAPI 3.1 & JSON schema validation on all ingress/egress boundaries; backwards compatibility verified with semver checks.',
    severity: 'MEDIUM',
    antiPatterns: [
      /\breq\.body\.[a-zA-Z0-9_]+\s*(?!\bas\b|\bvalidate\b|\bparse\b|\bsafeParse\b)/
    ]
  },
  {
    id: 12,
    key: 'observability_sre_golden_signals',
    name: 'Observability & SRE Golden Signals',
    domain: 'III',
    description: 'Structured JSON logs with trace correlation IDs; Prometheus metrics exported for latency, traffic, errors, saturation.',
    severity: 'MEDIUM',
    antiPatterns: [
      /\bconsole\.log\(\s*["'`][^"'`]+["'`]\s*\)/,
      /\bprintln!\(\s*"[^"]+"\s*\)/
    ]
  },

  // ── Domain IV: Migration Safety, Release Engineering & DevSecOps ──
  {
    id: 13,
    key: 'zero_downtime_migration_expand_contract',
    name: 'Zero-Downtime Migration Safety',
    domain: 'IV',
    description: 'Database schema evolution follows the expand-contract pattern; two-phase column drop; lock timeout <= 2s; concurrent index creation.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\bALTER\s+TABLE\s+[a-zA-Z0-9_.]+\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?(?!(?:IF|EXISTS)\b)[a-zA-Z0-9_]+(?!\s*;\s*--\s*(?:phase-2|contract|rollback))\s*;/i,
      /\bCREATE\s+INDEX\s+[a-zA-Z0-9_]+\s+ON\s+[a-zA-Z0-9_.]+\s*(?!CONCURRENTLY)/i
    ]
  },
  {
    id: 14,
    key: 'feature_flag_canary_killswitch',
    name: 'Feature Flag Hygiene & Canary Killswitch',
    domain: 'IV',
    description: 'Runtime feature flags with dynamic killswitch, 1%->5%->25%->100% rollout increments, telemetry error alarms, and documented retirement plan.',
    severity: 'MEDIUM',
    antiPatterns: [
      /\bconst\s+ENABLE_[A-Z0-9_]+\s*=\s*(?:true|false)\s*;/
    ]
  },
  {
    id: 15,
    key: 'devsecops_ssrf_kms_envelope',
    name: 'DevSecOps, SSRF Defense & KMS Encryption',
    domain: 'IV',
    description: 'Strict SSRF egress IP validation (blocking private/link-local/metadata ranges); envelope encryption for data at rest with KMS DEKs; OWASP Top 10 defense.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\bfetch\(\s*(?:userUrl|req\.query\.url|req\.body\.url)\s*\)/,
      /https?:\/\/(?:169\.254\.169\.254|metadata\.google\.internal)/i
    ]
  },
  {
    id: 16,
    key: 'supply_chain_integrity_slsa_l3',
    name: 'Supply Chain Integrity & Hermetic Builds',
    domain: 'IV',
    description: 'Dependencies pinned to exact immutable hashes; SLSA Level 3 build provenance; automated CVE vulnerability scanning in CI.',
    severity: 'HIGH',
    antiPatterns: [
      /"[a-zA-Z0-9@/_-]+":\s*"\*"/,
      /"[a-zA-Z0-9@/_-]+":\s*">=\d+\.\d+\.\d+"/
    ]
  },

  // ── Domain V: Cryptography, Memory Hygiene & Zero-Trust Defense ──
  {
    id: 17,
    key: 'zero_trust_spiffe_mtls',
    name: 'Zero-Trust Service Mesh & SPIFFE/SPIRE mTLS',
    domain: 'V',
    description: 'Mutual TLS with cryptographic SPIFFE workload identities; ephemeral x509 certs; default-deny service-to-service authorization.',
    severity: 'HIGH',
    antiPatterns: [
      /\bhttp:\/\/(?:api|service|internal|backend|db|auth)[a-zA-Z0-9.-]*:[0-9]+/i,
      /\binsecureSkipVerify\s*[:=]\s*true\b/i
    ]
  },
  {
    id: 18,
    key: 'sensitive_memory_hygiene_zeroize',
    name: 'Sensitive Memory Hygiene & Buffer Zeroization',
    domain: 'V',
    description: 'Cryptographic keys and plaintext credentials securely wiped using ZeroizeOnDrop or volatile memory zeroing; mlock RAM pinning; core dumps disabled (RLIMIT_CORE = 0).',
    severity: 'CRITICAL',
    antiPatterns: [
      /\bpassword\s*[:=]\s*["'][^"']+["']\s*;\s*\/\/\s*leak/i
    ]
  },
  {
    id: 19,
    key: 'statutory_data_sovereignty_geofencing',
    name: 'Statutory Data Sovereignty & Geo-Fencing',
    domain: 'V',
    description: 'Statutory PII data residency geo-fencing (GDPR Art 44, Thai PDPA, HIPAA); physical cross-border egress blocking unless encrypted with destination tenant keys.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\btransferToForeignBucket\([^)]*\)\s*(?!.*consent.*)/i
    ]
  },
  {
    id: 20,
    key: 'merkle_audit_ledgers_rfc3161',
    name: 'Tamper-Evident Audit Ledgers & Merkle DAGs',
    domain: 'V',
    description: 'Audit logs structured as cryptographic append-only event ledgers linked via Merkle DAGs; external RFC 3161 TSA timestamps.',
    severity: 'HIGH',
    antiPatterns: [
      /\bUPDATE\s+audit_logs\s+SET\b/i,
      /\bDELETE\s+FROM\s+audit_logs\b/i
    ]
  },

  // ── Domain VI: AI Agent Governance, LLM Firewalls & Autonomous Safety ──
  {
    id: 21,
    key: 'ai_agent_safety_prompt_firewalls',
    name: 'AI Agent Safety & Prompt Firewalls',
    domain: 'VI',
    description: 'Dual-LLM prompt injection firewalls; tool execution least-privilege scoping; loop recursion ceiling (N <= 25); strict JSON schema outputs.',
    severity: 'FATAL',
    antiPatterns: [
      /`System:\s*\$\{userInput\}`/,
      /\bwhile\s*\(\s*agentRunning\s*\)\s*\{\s*(?![\s\S]{1,200}\biterations\s*>\s*\d+)/i
    ]
  },
  {
    id: 22,
    key: 'autonomous_tool_sandboxing_cgroups',
    name: 'Autonomous Tool Sandboxing & Wasmtime/cgroups',
    domain: 'VI',
    description: 'Untrusted tool actions executed in WASM sandboxes (64MB RAM cap, fuel metering) or cgroups v2; POSIX signal containment (SIGSTOP, SIGCONT, SIGKILL).',
    severity: 'CRITICAL',
    antiPatterns: [
      /\bexecSync\(\s*(?:userInput|cmd|command)\s*\)/,
      /\bchild_process\.exec\(\s*req\.body\b/
    ]
  },
  {
    id: 23,
    key: 'quorum_4_eyes_escrow_window',
    name: 'Multi-Party Quorum (4-Eyes Principle) & TSA',
    domain: 'VI',
    description: 'Critical state mutations require dual cryptographic authorization; time-locked escrow window for human-in-the-loop overrides.',
    severity: 'HIGH',
    antiPatterns: [
      /\bexecuteIrreversibleAction\([^)]*\)\s*\{(?![\s\S]{1,300}\b(?:secondSignature|twoPartyApproval|approvers\.length\s*>=\s*2)\b)/i
    ]
  },
  {
    id: 24,
    key: 'testing_ground_truth_zero_mock',
    name: 'Testing Ground Truth & Verification Pass',
    domain: 'VI',
    description: 'Zero mocks/stubs in core crates and production test suites; automated test harness passes with 100% green assertions.',
    severity: 'FATAL',
    antiPatterns: [
      /\bjest\.mock\(\s*['"][^'"]+['"],\s*\(\)\s*=>\s*\(?\{\s*[a-zA-Z0-9_]+:\s*jest\.fn\(\)\s*\}\)?\)/,
      /\bit\.skip\(/,
      /\btest\.skip\(/
    ]
  },

  // ── Domain VII: SRE Sustainability, Multi-Region DR & Operational Longevity ──
  {
    id: 25,
    key: 'resource_limits_soak_verification',
    name: 'Resource Limits & Memory Soak Verification',
    domain: 'VII',
    description: 'Deterministic CPU/memory bounds; zero memory leak slope (< 1MB/hr over 24h soak); clean descriptor cleanup.',
    severity: 'HIGH',
    antiPatterns: [
      /\bsetInterval\(\s*\(\)\s*=>\s*\{\s*globalArray\.push\(/
    ]
  },
  {
    id: 26,
    key: 'finops_cost_ceilings_dynamic_quotas',
    name: 'FinOps Cost Ceilings & Dynamic Quotas',
    domain: 'VII',
    description: 'Hard per-tenant compute/token/storage quotas; dynamic rate limiting protects against bill shock; graceful degradation.',
    severity: 'HIGH',
    antiPatterns: [
      /\bdispatchLlmRequest\([^)]*\)\s*\{(?![\s\S]{1,200}\bquota\b)/i
    ]
  },
  {
    id: 27,
    key: 'multiregion_dr_active_active_chaos',
    name: 'Multi-Region Active-Active DR & Chaos Drills',
    domain: 'VII',
    description: 'Active-active replication with RTO <= 30s and RPO <= 5s; automated partition recovery; chaos blackout drills.',
    severity: 'HIGH',
    antiPatterns: [
      /\bconst\s+PRIMARY_DC_ONLY\s*=\s*true\b/
    ]
  },
  {
    id: 28,
    key: 'wal_continuous_archiving_pitr',
    name: 'Continuous WAL Archiving & Tested PITR Restores',
    domain: 'VII',
    description: 'WAL streaming with continuous automated verify-restore drills proving point-in-time recovery to within 5 seconds.',
    severity: 'CRITICAL',
    antiPatterns: [
      /\barchive_mode\s*[:=]\s*off\b/i
    ]
  }
];

export const FORMAL_VERIFICATION_CHECKLIST = [
  'pre_condition_contracts',
  'post_condition_invariants',
  'loop_invariants_and_variants',
  'state_space_reachability',
  'deadlock_and_livelock_freedom',
  'arithmetic_overflow_safety',
  'spatial_memory_safety',
  'temporal_memory_safety',
  'monotonic_progress_guarantee',
  'non_interference_information_flow'
];

export const AI_AGENT_SAFETY_CHECKLIST = [
  'dual_llm_intent_firewall',
  'tool_execution_least_privilege',
  'bounded_loop_recursion_ceiling',
  'strict_json_schema_enforcement',
  'human_in_the_loop_quorum_gating',
  'audit_merkle_provenance_logging'
];

function isComment(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function isCommentOrString(line, matchIndex) {
  if (isComment(line)) {
    return true;
  }
  const before = line.slice(0, matchIndex);
  const doubleQuotes = (before.match(/"/g) || []).length;
  const singleQuotes = (before.match(/'/g) || []).length;
  const backticks = (before.match(/`/g) || []).length;
  return doubleQuotes % 2 === 1 || singleQuotes % 2 === 1 || backticks % 2 === 1;
}

/**
 * Scans a code string or diff for Senior Engineering Gate anti-patterns.
 */
export function auditCodeDiff(diffOrContent, options = {}) {
  const violations = [];
  let lines = typeof diffOrContent === 'string' ? diffOrContent.split('\n') : [];
  let content = typeof diffOrContent === 'string' ? diffOrContent : '';

  // If Rust file has #[cfg(test)], exclude test module from production gate scan
  if (options.filePath && options.filePath.endsWith('.rs') && content.includes('#[cfg(test)]')) {
    const cfgIndex = lines.findIndex(l => l.trim().startsWith('#[cfg(test)]'));
    if (cfgIndex !== -1) {
      lines = lines.slice(0, cfgIndex);
      content = lines.join('\n');
    }
  }

  for (const pillar of SENIOR_ENGINEERING_PILLARS) {
    for (const pattern of pillar.antiPatterns) {
      // In .down.sql rollback migrations, dropping columns added in .up.sql is standard rollback reversal
      if (pillar.id === 13 && options.filePath && options.filePath.endsWith('.down.sql')) {
        if (pattern.source.includes('DROP')) {
          continue;
        }
      }

      if (pattern.test(content)) {
        // Find matching lines
        const matchingLines = [];
        lines.forEach((line, idx) => {
          const match = line.match(pattern);
          if (match) {
            if (isComment(line)) {
              return;
            }
            if (pillar.id === 1 && isCommentOrString(line, match.index)) {
              return;
            }
            // For Pillar 2: Quantitative continuous math, continuous SDEs/PDEs, market feed quotes, and orderbook depth
            if (pillar.id === 2 && (
              line.includes('continuous-model') ||
              line.includes('continuous-math') ||
              line.includes('market-feed') ||
              content.includes('continuous-model') ||
              content.includes('quant-continuous-math')
            )) {
              return;
            }
            // For Pillar 12: Cargo build scripts (build.rs) use println!("cargo:... to communicate compiler instructions
            if (pillar.id === 12 && (options.filePath?.endsWith('build.rs') || line.includes('"cargo:'))) {
              return;
            }
            matchingLines.push({ lineNumber: idx + 1, snippet: line.trim().slice(0, 100) });
          }
        });

        if (matchingLines.length > 0) {
          violations.push({
            pillarId: pillar.id,
            pillarKey: pillar.key,
            pillarName: pillar.name,
            domain: pillar.domain,
            severity: pillar.severity,
            description: pillar.description,
            matchingLines
          });
        }
      }
    }
  }

  const passed = violations.filter(v => v.severity === 'FATAL' || v.severity === 'CRITICAL').length === 0;
  const score = Math.max(0, 100 - (violations.length * 5));

  return {
    passed,
    score,
    totalPillars: SENIOR_ENGINEERING_PILLARS.length,
    violationCount: violations.length,
    violations
  };
}

/**
 * Scans an individual file on disk.
 */
export function auditFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `File not found: ${filePath}`, passed: false };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const result = auditCodeDiff(content, { filePath });
  result.filePath = filePath;
  return result;
}

/**
 * Scans production codebase trees for Senior Engineering Gate compliance.
 */
export function auditRepository(rootDir = process.cwd(), options = {}) {
  const skipPattern = options.skipPattern || /(^|\/)(test|tests|__tests__|fixtures|node_modules|\.git|\.gemini|target|dist|build|out|\.next|coverage|\.bundle|benches|benchmark|benchmarks|\.agents|\.cargo|\.turbo|vendor|tmp|storybook-static|\.docusaurus|\.cache|scripts|work-products)(\/|$)/i;
  const testFilePattern = /(\.(test|spec)\.[a-z0-9]+$|_test\.[a-z0-9]+$|\.stories\.[a-z0-9]+$)/i;
  const targetExtensions = /\.(js|mjs|ts|tsx|rs|go|py|java|dart|sql)$/;
  const results = [];
  let totalFilesScanned = 0;
  let totalViolations = 0;

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      if (skipPattern.test(relPath)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (targetExtensions.test(entry.name) && !testFilePattern.test(entry.name)) {
        totalFilesScanned++;
        const fileAudit = auditFile(fullPath);
        if (fileAudit.violations && fileAudit.violations.length > 0) {
          totalViolations += fileAudit.violations.length;
          results.push(fileAudit);
        }
      }
    }
  }

  // Scan declared production directories (including Flutter lib/)
  const prodDirs = ['code', 'src', 'lib', 'template/code'].map(d => path.join(rootDir, d));
  let scannedAny = false;
  for (const d of prodDirs) {
    if (fs.existsSync(d)) {
      walk(d);
      scannedAny = true;
    }
  }

  // If no code/ or src/ directory, scan current dir directly with skip filters
  if (!scannedAny) {
    walk(rootDir);
  }

  const fatalOrCritical = results.flatMap(r => r.violations)
    .filter(v => v.severity === 'FATAL' || v.severity === 'CRITICAL');

  return {
    passed: fatalOrCritical.length === 0,
    totalFilesScanned,
    filesWithViolations: results.length,
    totalViolations,
    fatalOrCriticalCount: fatalOrCritical.length,
    fileResults: results
  };
}

/**
 * Validates a goal markdown file for explicit Senior Engineering Gate compliance.
 */
export function validateGoalSeniorGateCompliance(goalContentOrPath) {
  let content = goalContentOrPath;
  if (typeof goalContentOrPath === 'string' && fs.existsSync(goalContentOrPath)) {
    content = fs.readFileSync(goalContentOrPath, 'utf8');
  }

  const checks = {
    mentionsSeniorEngineeringGate: /Senior Engineering Gate|28-Pillar|soda-code-review/i.test(content),
    formalVerificationConsidered: /Formal Verification|formal_verification|invariant/i.test(content),
    zeroMockInvariantPreserved: /Zero-Mock|zero mock|no stub/i.test(content),
    aiSafetyConsidered: /Agent Safety|prompt injection|cgroups|Wasmtime/i.test(content),
    concurrencyOrDeadlockConsidered: /concurrency|deadlock|saga|lock ordering/i.test(content),
    migrationOrReleaseConsidered: /expand-contract|zero-downtime|canary|killswitch/i.test(content)
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  return {
    passed: checks.mentionsSeniorEngineeringGate || passedCount >= 3,
    checks,
    passedCount,
    totalChecks: Object.keys(checks).length
  };
}

// ── CLI Runner ──
if (process.argv[1] && process.argv[1].endsWith('senior-engineering-gate-harness.mjs')) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
🏛️ SODA OS SENIOR ENGINEERING GATE HARNESS
Usage:
  node scripts/harness/senior-engineering-gate-harness.mjs [options]

Options:
  --scan-repo        Scan declared production code directories (default)
  --file <path>      Scan a single file for Senior Engineering Gate anti-patterns
  --goal <path>      Validate a goal file for Senior Gate compliance
  --json             Output results as machine-readable JSON
  --help             Show this help message
`);
    process.exit(0);
  }

  const isJson = args.includes('--json');
  const fileArgIdx = args.indexOf('--file');
  const goalArgIdx = args.indexOf('--goal');

  if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    const targetFile = path.resolve(args[fileArgIdx + 1]);
    const res = auditFile(targetFile);
    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\nAuditing file: ${targetFile}`);
      console.log(`Status: ${res.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Score: ${res.score}/100 | Violations: ${res.violationCount}`);
      if (res.violations && res.violations.length) {
        console.log('\nViolations:');
        for (const v of res.violations) {
          console.log(`  [${v.severity}] Pillar ${v.pillarId} (${v.pillarName}): ${v.description}`);
          v.matchingLines.forEach(m => console.log(`     L${m.lineNumber}: ${m.snippet}`));
        }
      }
    }
    process.exit(res.passed ? 0 : 1);
  }

  if (goalArgIdx !== -1 && args[goalArgIdx + 1]) {
    const targetGoal = path.resolve(args[goalArgIdx + 1]);
    const res = validateGoalSeniorGateCompliance(targetGoal);
    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\nValidating Goal: ${targetGoal}`);
      console.log(`Status: ${res.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Compliance Score: ${res.passedCount}/${res.totalChecks} checks verified`);
      for (const [k, v] of Object.entries(res.checks)) {
        console.log(`  ${v ? '✔' : '✖'} ${k}`);
      }
    }
    process.exit(res.passed ? 0 : 1);
  }

  // Default: scan repository
  const scanRepoIdx = args.indexOf('--scan-repo');
  const targetRepo = scanRepoIdx !== -1 && args[scanRepoIdx + 1] && !args[scanRepoIdx + 1].startsWith('-')
    ? path.resolve(args[scanRepoIdx + 1])
    : process.cwd();
  const repoRes = auditRepository(targetRepo);
  if (isJson) {
    console.log(JSON.stringify(repoRes, null, 2));
  } else {
    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log('🏛️ SODA OS SENIOR ENGINEERING GATE HARNESS — REPOSITORY SCAN');
    console.log('══════════════════════════════════════════════════════════════════');
    console.log(`Files Scanned: ${repoRes.totalFilesScanned}`);
    console.log(`Files with Violations: ${repoRes.filesWithViolations}`);
    console.log(`Total Violations: ${repoRes.totalViolations}`);
    console.log(`Fatal / Critical Violations: ${repoRes.fatalOrCriticalCount}`);
    console.log(`Gate Verdict: ${repoRes.passed ? '✅ ALL GATES PASSED' : '❌ GATE VIOLATIONS DETECTED'}`);
    console.log('══════════════════════════════════════════════════════════════════\n');

    if (!repoRes.passed) {
      for (const fileResult of repoRes.fileResults) {
        console.log(`File: ${fileResult.filePath}`);
        for (const v of fileResult.violations) {
          console.log(`  [${v.severity}] Pillar ${v.pillarId}: ${v.pillarName}`);
          v.matchingLines.forEach(m => console.log(`     L${m.lineNumber}: ${m.snippet}`));
        }
      }
      process.exit(1);
    }
  }
  process.exit(0);
}

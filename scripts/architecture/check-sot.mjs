#!/usr/bin/env node

/**
 * Validate the LivePilot source-of-truth hierarchy without external packages.
 *
 * This is intentionally a contract-shape gate, not a semantic proof. It checks
 * that every feature index and detailed flow has the minimum traceability and
 * evidence sections required by the SOT template, and that index links resolve.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sotRoot = path.join(root, 'docs/03-architecture/source-of-truth-flows');
const featuresRoot = path.join(sotRoot, 'features');
const coveragePath = path.join(root, 'docs/03-architecture/contracts/flows/coverage.yaml');

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`${path.relative(root, file)}: cannot read (${error.code || error.message})`);
    return '';
  }
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function relative(file) {
  return path.relative(root, file);
}

if (!fs.existsSync(coveragePath)) {
  fail('Missing docs/03-architecture/contracts/flows/coverage.yaml');
}

if (!fs.existsSync(featuresRoot)) {
  fail('Missing docs/03-architecture/source-of-truth-flows/features');
} else {
  const featureDirs = fs.readdirSync(featuresRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (featureDirs.length === 0) {
    fail('No feature SOT directories found');
  }

  for (const featureDir of featureDirs) {
    const indexPath = path.join(featuresRoot, featureDir, 'index.md');
    if (!fs.existsSync(indexPath)) {
      fail(`${relative(indexPath)}: missing feature index`);
      continue;
    }

    const index = read(indexPath);
    const requiredIndexPatterns = [
      /^# Feature /m,
      /^## Machine-readable contract coverage/m,
      /^## Feature authority and boundaries/m,
      /^## Canonical (flow|control) map/m,
      /^## Flow index/m,
      /^## Feature-level contract rules/m,
      /^## Required feature evidence/m,
    ];

    for (const pattern of requiredIndexPatterns) {
      if (!pattern.test(index)) {
        fail(`${relative(indexPath)}: missing ${pattern}`);
      }
    }

    const linkedFlows = [...index.matchAll(/\]\((flows\/[^)]+\.md)\)/g)]
      .map((match) => path.join(path.dirname(indexPath), match[1]));
    if (linkedFlows.length === 0) {
      fail(`${relative(indexPath)}: no detail flow links found`);
    }
    for (const flowPath of linkedFlows) {
      if (!fs.existsSync(flowPath)) {
        fail(`${relative(indexPath)}: linked flow missing: ${relative(flowPath)}`);
      }
    }

    const flowDir = path.join(path.dirname(indexPath), 'flows');
    if (!fs.existsSync(flowDir)) {
      fail(`${relative(indexPath)}: missing flows directory`);
      continue;
    }
    const flowFiles = fs.readdirSync(flowDir)
      .filter((file) => file.endsWith('.md'))
      .sort();
    const linkedSet = new Set(linkedFlows.map((file) => path.resolve(file)));
    for (const file of flowFiles) {
      const flowPath = path.join(flowDir, file);
      if (!linkedSet.has(path.resolve(flowPath))) {
        warn(`${relative(flowPath)}: flow exists but is not linked from its feature index`);
      }
      validateFlow(flowPath);
    }
  }
}

function validateFlow(flowPath) {
  const text = read(flowPath);
  const required = [
    [/^# .+/m, 'title'],
    [/^## Machine-readable contract coverage/m, 'machine-readable contract coverage'],
    [/^Status:/m, 'status'],
    [/^## (Companion ownership and references|Purpose(?:, actors, and scope)?|Purpose and scope)/m, 'purpose/ownership'],
    [/^## Shared boundary(?: and topology)?/m, 'shared boundary'],
    [/^## (Aggregate and lifecycle|Canonical aggregate and lifecycle|Canonical contract and lifecycle|[0-9]+\. Lifecycle)/m, 'aggregate/lifecycle'],
    [/^## (Errors and recovery|Errors|Failure and recovery|[0-9]+\. Errors)/m, 'errors/recovery'],
    [/^## (Sequence and verification|Verification|Sequence|[0-9]+\. Verification)/m, 'sequence/verification'],
  ];

  for (const [pattern, label] of required) {
    if (!pattern.test(text)) {
      fail(`${relative(flowPath)}: missing ${label}`);
    }
  }

  if (!/live_session_id|session_id/.test(text)) {
    fail(`${relative(flowPath)}: missing session scope field`);
  }
  if (!/correlation_id|X-Correlation-Id/.test(text)) {
    fail(`${relative(flowPath)}: missing correlation contract`);
  }
  if (!/idempotency/i.test(text)) {
    fail(`${relative(flowPath)}: missing idempotency contract`);
  }
  if (!/audit/i.test(text)) {
    fail(`${relative(flowPath)}: missing audit/evidence contract`);
  }
  if (!/NEEDS CLARIFICATION|proposed|require approval|requires approval/i.test(text)) {
    warn(`${relative(flowPath)}: no explicit unresolved/proposed/approval marker`);
  }
}

const flowCount = fs.existsSync(featuresRoot)
  ? fs.readdirSync(featuresRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .reduce((count, entry) => {
        const dir = path.join(featuresRoot, entry.name, 'flows');
        return count + (fs.existsSync(dir)
          ? fs.readdirSync(dir).filter((file) => file.endsWith('.md')).length
          : 0);
      }, 0)
  : 0;

console.log(`SOT hierarchy check: ${flowCount} detailed flow file(s)`);
for (const warning of warnings) console.log(`WARN: ${warning}`);
for (const failure of failures) console.error(`ERROR: ${failure}`);
console.log(`SOT hierarchy check: ${failures.length ? 'FAIL' : 'PASS'} (${failures.length} error(s), ${warnings.length} warning(s))`);
process.exitCode = failures.length ? 1 : 0;

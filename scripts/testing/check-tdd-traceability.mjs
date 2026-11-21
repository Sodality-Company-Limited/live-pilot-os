#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const files = [
  'docs/03-architecture/testing/tdd-sot.md',
  'docs/03-architecture/testing/tdd-specification-catalog.md',
  'docs/03-architecture/testing/tdd-invariants.yaml',
  'docs/03-architecture/testing/test-seams-and-fixtures-sot.md',
  'docs/03-architecture/testing/coverage-and-mutation-policy.yaml',
  'docs/03-architecture/testing/tdd-evidence.schema.json'
];
const missing = files.filter((file) => !existsSync(resolve(root, file)));
const catalog = readFileSync(resolve(root, files[1]), 'utf8');
const fields = ['TDD ID', 'Requirement', 'BDD scenario', 'Flow', 'Boundary', 'Owner', 'Behavior', 'Preconditions', 'Input', 'Expected', 'Invariants', 'Failure cases', 'Seams', 'Test path', 'Evidence', 'test_class', 'environment', 'fixture_version', 'entry_command', 'exit_criteria', 'evidence_artifact'];
const absent = fields.filter((field) => !catalog.includes(`| ${field} |`) && !catalog.includes(`\`${field}\``));
if (missing.length || absent.length) {
  console.error(`TDD traceability check: FAIL (${missing.length + absent.length} error(s))`);
  missing.forEach((file) => console.error(`- missing: ${file}`));
  absent.forEach((field) => console.error(`- missing catalog field: ${field}`));
  process.exit(1);
}
console.log(`TDD traceability check: PASS (${files.length} authorities present; catalog complete)`);

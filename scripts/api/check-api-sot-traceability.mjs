#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'docs/02-product/project-brief.md',
  'docs/03-architecture/live-pilot-os-requirements.md',
  'docs/03-architecture/live-pilot-os-domain-model.md',
  'docs/03-architecture/api/README.md',
  'docs/03-architecture/api/api-operation-catalog-sot.md',
  'docs/03-architecture/api/domain-resource-state-sot.md',
  'docs/03-architecture/api/identity-tenancy-authorization-sot.md',
  'docs/03-architecture/api/error-codes.yaml',
  'docs/03-architecture/api/nats-subject-catalog-sot.md',
  'docs/03-architecture/api/realtime-transport-sot.md',
  'docs/03-architecture/api/route-prefixing-and-boundary-invariant.md',
  'docs/03-architecture/contracts/flows/coverage.yaml'
];
const missing = required.filter((file) => !existsSync(resolve(root, file)));
const catalog = resolve(root, 'docs/03-architecture/api/api-operation-catalog-sot.md');
const body = existsSync(catalog) ? readFileSync(catalog, 'utf8') : '';
const requiredTerms = ['Requirement/flow', 'Actor/capability', 'Request', 'Response', 'Events/jobs', 'Errors', 'Idempotency', 'Verification'];
const absent = requiredTerms.filter((term) => !body.includes(term));

if (missing.length || absent.length) {
  console.error(`API SOT traceability: BLOCKED (${missing.length + absent.length} gap(s))`);
  missing.forEach((file) => console.error(`- missing authority: ${file}`));
  absent.forEach((term) => console.error(`- operation catalog missing field: ${term}`));
  process.exit(1);
}

console.log(`API SOT traceability: PASS (${required.length} authorities present; operation catalog fields complete)`);

#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'docs/03-architecture/api/error-codes.yaml');
const registry = JSON.parse(readFileSync(file, 'utf8'));
const errors = registry.errors || [];
const failures = [];
const seenCodes = new Set();
const seenSymbols = new Set();
const allowedRetry = new Set(['never', 'retry', 'retry_after', 'reconcile', 'request_new_credential']);
const allowedExposure = new Set(['public', 'support_only', 'internal']);
const allowedLifecycle = new Set(['active', 'deprecated', 'retired']);

if (registry.schema_version !== '1') failures.push('schema_version must be 1');
if (registry.code_scheme !== 'LPDDSSS') failures.push('code_scheme must be LPDDSSS');
if (!errors.length) failures.push('registry must contain errors');

for (const entry of errors) {
  const required = ['code', 'domain', 'symbol', 'http_status', 'type', 'title', 'message_key', 'retry_policy', 'exposure', 'lifecycle', 'detail'];
  for (const field of required) if (entry[field] === undefined || entry[field] === '') failures.push(`${entry.code || '<unknown>'}: missing ${field}`);
  if (!/^LP\d{5}$/.test(entry.code || '')) failures.push(`${entry.code || '<unknown>'}: invalid LPDDSSS code`);
  if (seenCodes.has(entry.code)) failures.push(`${entry.code}: duplicate code`);
  if (seenSymbols.has(entry.symbol)) failures.push(`${entry.symbol}: duplicate symbol`);
  seenCodes.add(entry.code); seenSymbols.add(entry.symbol);
  if (!allowedRetry.has(entry.retry_policy)) failures.push(`${entry.code}: invalid retry_policy`);
  if (!allowedExposure.has(entry.exposure)) failures.push(`${entry.code}: invalid exposure`);
  if (!allowedLifecycle.has(entry.lifecycle)) failures.push(`${entry.code}: invalid lifecycle`);
  if (entry.exposure === 'public' && !/^errors\.[A-Za-z0-9.]+$/.test(entry.message_key || '')) failures.push(`${entry.code}: public entry needs localization message_key`);
}

if (failures.length) {
  console.error(`Error-code registry check: FAIL (${failures.length} error(s))`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Error-code registry check: PASS (${errors.length} registered codes)`);

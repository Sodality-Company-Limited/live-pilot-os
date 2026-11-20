#!/usr/bin/env node
/**
 * Soda OS Universal Currency Neutrality: Phase 2 Satang Eradication Engine
 * Refactors legacy Satang identifiers, variables, comments, and strings to canonical minor units
 * across scripts/harness/, scripts/agentic/, scripts/ui/, and scripts/ia/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const TARGET_DIRS = [
  path.join(ROOT, 'scripts', 'harness'),
  path.join(ROOT, 'scripts', 'agentic'),
  path.join(ROOT, 'scripts', 'ui'),
  path.join(ROOT, 'scripts', 'ia'),
  path.join(ROOT, 'scripts', 'ux'),
  path.join(ROOT, 'scripts', 'production'),
  path.join(ROOT, 'scripts', 'api'),
  path.join(ROOT, 'scripts', 'e2e'),
  path.join(ROOT, 'scripts', 'http-smoke'),
  path.join(ROOT, 'scripts', 'backend'),
  path.join(ROOT, 'scripts', 'ui-smoke'),
  path.join(ROOT, 'scripts', 'testing'),
];

// Preserved canonical files that must NOT be modified
const EXCLUDED_FILES = new Set([
  'check-schema-compatibility.mjs',
  'governance.md',
  'code-review.md'
]);

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.mjs') || file.endsWith('.js') || file.endsWith('.ts')) {
      if (!EXCLUDED_FILES.has(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  }

  return arrayOfFiles;
}

let totalFilesModified = 0;
let totalReplacements = 0;

for (const dir of TARGET_DIRS) {
  const files = getAllFiles(dir);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // 1. Compound snake_case: _satang -> _minor
    content = content.replace(/_satang\b/g, '_minor');
    content = content.replace(/_SATANG\b/g, '_MINOR');
    content = content.replace(/_satang_/g, '_minor_');
    content = content.replace(/_SATANG_/g, '_MINOR_');
    content = content.replace(/\bsatang_/g, 'minor_');
    content = content.replace(/\bSATANG_/g, 'MINOR_');

    // 2. Compound camelCase / PascalCase:
    // e.g. amountSatang -> amountMinor, monthlyPriceSatang -> monthlyPriceMinor
    content = content.replace(/([a-zA-Z0-9_]+)Satang/g, '$1Minor');
    content = content.replace(/\bSatang([A-Z0-9_])/g, 'Minor$1');
    content = content.replace(/\bsatang([A-Z0-9_])/g, 'minor$1');

    // 3. Specific terms
    content = content.replace(/milli-Satang/g, 'milli-minor');
    content = content.replace(/milli-satang/g, 'milli-minor');
    content = content.replace(/Satangs\b/g, 'minor units');
    content = content.replace(/satangs\b/g, 'minor units');
    content = content.replace(/\bSatang\b/g, 'minor units');
    content = content.replace(/\bsatang\b/g, 'minor units');
    content = content.replace(/\bSATANG\b/g, 'MINOR');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      totalFilesModified++;
      // Count rough occurrences replaced
      const matches = original.match(/satang|Satang|SATANG/g);
      if (matches) {
        totalReplacements += matches.length;
      }
      console.log(`  ✓ Refactored: ${path.relative(ROOT, file)}`);
    }
  }
}

console.log(`\n======================================================================`);
console.log(`🎉 Satang Eradication Complete: ${totalFilesModified} files modified, ~${totalReplacements} occurrences eliminated`);
console.log(`======================================================================\n`);

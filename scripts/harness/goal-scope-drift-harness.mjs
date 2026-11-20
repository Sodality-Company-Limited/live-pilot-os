#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL SCOPE DRIFT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Detects scope drift between Intent, In/Out scope boundaries, Work Steps,
 * and the Touch Map. Rejects work step expansion beyond declared scope.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Normalizes file path strings.
 */
function cleanPath(p) {
  return p.trim().replace(/^[`'"]|[`'"]$/g, '').replace(/^[*-]\s+/, '').trim();
}

/**
 * Detects scope drift across In, Out, Work Steps, and Touch Map.
 */
export function detectScopeDrift(content, filename = '') {
  const errors = [];
  const warnings = [];

  // Extract Touch Map paths
  const touchMapPaths = new Set();
  const touchMapMatch = content.match(/(?:^|\n)##\s+Touch\s+map\b[\s\S]*?(?=\n##\s+|$)/i);
  if (touchMapMatch) {
    const lines = touchMapMatch[0].split(/\r?\n/);
    for (const line of lines) {
      if (/^\s*[-*]\s+`?[a-zA-Z0-9_./\-*]+`?/.test(line)) {
        const raw = line.replace(/^\s*[-*]\s+/, '').trim();
        const p = cleanPath(raw.split(/\s+/)[0]);
        if (p && !p.startsWith('path/to') && !p.includes('...')) {
          touchMapPaths.add(p);
        }
      }
    }
  }

  // Extract Work Steps Allowed Files strictly from ## Work steps section
  const workStepPaths = new Set();
  const forbiddenFiles = new Set();
  const workStepsSectionMatch = content.match(/(?:^|\n)##\s+Work\s+steps\b[\s\S]*?(?=\n##\s+|$)/i);
  if (workStepsSectionMatch) {
    // 1. Markdown allowed files
    const stepAllowedMatches = workStepsSectionMatch[0].matchAll(/\*\*Allowed files:\*\*\s*([^\n]+)/gi);
    for (const match of stepAllowedMatches) {
      const rawList = match[1].trim();
      const items = rawList.split(/[\s,]+/).map(cleanPath).filter(Boolean);
      for (const item of items) {
        if (item && !item.startsWith('path/to') && !item.includes('...')) {
          workStepPaths.add(item);
        }
      }
    }

    // 2. YAML allowed_files block
    const yamlAllowedMatches = workStepsSectionMatch[0].matchAll(/allowed_files:\s*\n((?:\s*-\s*[^\n]+\n)+)/gi);
    for (const ym of yamlAllowedMatches) {
      const lines = ym[1].split('\n');
      for (const l of lines) {
        const itemMatch = l.match(/^\s*-\s+([^\n]+)/);
        if (itemMatch) {
          const item = cleanPath(itemMatch[1]);
          if (item && !item.startsWith('path/to') && !item.includes('...')) {
            workStepPaths.add(item);
          }
        }
      }
    }

    // 3. YAML forbidden_files block
    const yamlForbiddenMatches = workStepsSectionMatch[0].matchAll(/forbidden_files:\s*\n((?:\s*-\s*[^\n]+\n)+)/gi);
    for (const yfm of yamlForbiddenMatches) {
      const lines = yfm[1].split('\n');
      for (const l of lines) {
        const itemMatch = l.match(/^\s*-\s+([^\n]+)/);
        if (itemMatch) {
          const item = cleanPath(itemMatch[1]);
          if (item && !item.startsWith('path/to') && !item.includes('...')) {
            forbiddenFiles.add(item);
          }
        }
      }
    }
  }

  // Extract Out-Scope negative boundaries
  const outBlockMatch = content.match(/(?:^|\n)##\s+Out\b[\s\S]*?(?=\n##\s+|$)/i);
  const outPatterns = [];
  if (outBlockMatch) {
    const outLines = outBlockMatch[0].split(/\r?\n/);
    for (const line of outLines) {
      if (/^\s*[-*]\s+/.test(line)) {
        const text = line.replace(/^\s*[-*]\s+/, '').trim();
        // Extract any path or directory mentioned in Out
        const pathMatches = text.matchAll(/`?([a-zA-Z0-9_\-./]+\/[a-zA-Z0-9_\-./]*)`?/g);
        for (const pm of pathMatches) {
          if (pm[1] && pm[1].length > 3) {
            outPatterns.push({ pattern: pm[1], ruleText: text });
          }
        }
      }
    }
  }

  // 1. Verify every Work Step file is accounted for in the Touch Map
  if (touchMapPaths.size > 0) {
    for (const stepFile of workStepPaths) {
      let matched = false;
      for (const touchPath of touchMapPaths) {
        if (touchPath.endsWith('*')) {
          const prefix = touchPath.slice(0, -1);
          if (stepFile.startsWith(prefix)) {
            matched = true;
            break;
          }
        } else if (stepFile === touchPath) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        errors.push(`Work step modifies "${stepFile}" which is NOT declared in Touch map. Scope drift detected.`);
      }
    }
  }

  // 2. Verify no file in Work Steps or Touch Map violates negative Out scope
  for (const { pattern, ruleText } of outPatterns) {
    for (const file of [...workStepPaths, ...touchMapPaths]) {
      if (file.includes(pattern)) {
        errors.push(`File "${file}" touches explicitly forbidden Out scope: "${ruleText}".`);
      }
    }
  }

  // 3. Verify no declared forbidden_files are in workStepPaths or touchMapPaths
  for (const forbidden of forbiddenFiles) {
    if (workStepPaths.has(forbidden) || touchMapPaths.has(forbidden)) {
      errors.push(`File "${forbidden}" is explicitly declared in forbidden_files but is modified in work steps/touch map. Scope drift detected.`);
    }
  }

  return {
    valid: errors.length === 0,
    touchMapPaths: [...touchMapPaths],
    workStepPaths: [...workStepPaths],
    errors,
    warnings
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('goal-scope-drift-harness.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node goal-scope-drift-harness.mjs <goal-path>");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const content = readFileSync(resolved, 'utf8');
  const res = detectScopeDrift(content, resolved);
  if (!res.valid) {
    console.error(`❌ Scope drift detected:\n  - ${res.errors.join('\n  - ')}`);
    process.exit(1);
  } else {
    console.log(`✅ Scope drift verified for ${target} (${res.workStepPaths.length} work step files strictly within touch map)`);
  }
}

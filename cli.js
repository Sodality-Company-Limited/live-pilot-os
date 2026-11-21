#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const command = process.argv[2];
let targetArg = '.';
let options = {
  yes: false,
  dryRun: false,
  report: false
};

// Parse arguments and flags
const args = process.argv.slice(3);
for (const arg of args) {
  if (arg === '--yes') {
    options.yes = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--report') {
    options.report = true;
  } else if (!arg.startsWith('-')) {
    targetArg = arg;
  }
}

const targetDir = path.resolve(targetArg);
const TEMPLATE_DIR = path.join(__dirname, 'template');

function runSyncClickup(argv) {
  const scriptArgs = [];
  let projectPath = process.cwd();

  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '--list' || arg === '--help' || arg === '-h' || arg === '--all' || arg === '--status-only' || arg === '--if-configured') {
      scriptArgs.push(arg);
    } else if (/^(G-[A-Za-z0-9_-]+|G-[0-9]{3})$/i.test(arg)) {
      scriptArgs.push(arg.toUpperCase());
    } else if (!arg.startsWith('-')) {
      projectPath = path.resolve(arg);
    } else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/sync-clickup.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/sync-clickup.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: sync-clickup.js not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: projectPath,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runShipPr(argv) {
  const scriptArgs = [];
  let projectPath = process.cwd();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '--help' || arg === '-h' || arg === '--push' || arg === '--no-push') {
      scriptArgs.push(arg);
    } else if (arg === '--base' || arg === '-b' || arg === '--target' || arg === '-t' || arg === '--head' || arg === '--branch') {
      scriptArgs.push(arg);
      if (i + 1 < argv.length) {
        scriptArgs.push(argv[++i]);
      }
    } else if (/^G-[A-Za-z0-9_-]+$/i.test(arg)) {
      scriptArgs.push(arg.toUpperCase());
    } else if (!arg.startsWith('-')) {
      projectPath = path.resolve(arg);
    } else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/ship-pr.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/ship-pr.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: ship-pr.js not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: projectPath,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runDiscovery(argv) {
  const scriptArgs = [...argv];
  const scriptPath = [
    path.join(process.cwd(), 'scripts/discovery/socratic-loop.js'),
    path.join(TEMPLATE_DIR, 'scripts/discovery/socratic-loop.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: socratic-loop.js not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runSyncEcosystem(argv) {
  const scriptArgs = [...argv];
  const scriptPath = [
    path.join(__dirname, 'scripts/goals/sync-ecosystem.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/sync-ecosystem.js'),
    path.join(process.cwd(), 'scripts/goals/sync-ecosystem.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: sync-ecosystem.js not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Execution error: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

function runAgentSpawn(argv) {
  const scriptArgs = [...argv];
  const scriptPath = [
    path.join(__dirname, 'scripts/agents/spawn-subagent.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/agents/spawn-subagent.mjs'),
    path.join(process.cwd(), 'scripts/agents/spawn-subagent.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: spawn-subagent.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Execution error: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

function runShowTelemetry(argv) {
  const scriptArgs = [...argv];
  const scriptPath = [
    path.join(__dirname, 'scripts/agents/show-telemetry.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/agents/show-telemetry.mjs'),
    path.join(process.cwd(), 'scripts/agents/show-telemetry.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: show-telemetry.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Execution error: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

function runDiagnose(argv) {
  const scriptArgs = [...argv];
  const scriptPath = [
    path.join(__dirname, 'scripts/harness/process-diagnostics-harness.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/harness/process-diagnostics-harness.mjs'),
    path.join(process.cwd(), 'scripts/harness/process-diagnostics-harness.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: process-diagnostics-harness.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Execution error: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

if (command === 'sync-clickup') {
  runSyncClickup(process.argv.slice(3));
} else if (command === 'pr' || command === 'ship') {
  runShipPr(process.argv.slice(3));
} else if (command === 'discovery' || command === 'loop' || command === 'socratic') {
  runDiscovery(process.argv.slice(3));
} else if (command === 'goal') {
  runGoal(process.argv.slice(3));
} else if (command === 'sync-goals') {
  runGoalSync(process.argv.slice(3));
} else if (command === 'parallel-goals') {
  runGoalWaves(process.argv.slice(3));
} else if (command === 'execute-goal') {
  runGoalExecute(process.argv.slice(3));
} else if (command === 'close-goal' || command === 'archive-goal') {
  runGoalClose(process.argv.slice(3));
} else if (command === 'sync-ecosystem' || command === 'sync-all') {
  runSyncEcosystem(process.argv.slice(3));
} else if (command === 'agent' || command === 'spawn-subagent' || command === 'spawn') {
  if (process.argv[3] === 'spawn') {
    runAgentSpawn(process.argv.slice(4));
  } else {
    runAgentSpawn(process.argv.slice(3));
  }
} else if (command === 'diagnose' || command === 'process-diagnostics') {
  runDiagnose(process.argv.slice(3));
} else if (command === 'telemetry' || command === 'agent-telemetry') {
  runShowTelemetry(process.argv.slice(3));
}

let pkg;
try {
  pkg = require('./package.json');
} catch (e) {
  try {
    pkg = require('../package.json');
  } catch (e2) {
    pkg = { version: '1.24.0' };
  }
}
const currentVersion = pkg.version || '1.24.0';

const defaultReplacements = {
  PROJECT_NAME: 'My Soda OS App',
  PROJECT_MISSION: 'Develop a high-performance application following Soda OS Agent Governance.',
  TEST_COMMANDS: 'npm run lint:check\nnpm run test\nnpm run build',
  SODA_OS_VERSION: currentVersion
};

const DEFAULT_CALIBRATION_THRESHOLDS = Object.freeze({
  max_ece: 0.040,
  max_brier: 0.080,
  max_hcer: 0.010,
  tau_low: 0.50,
  tau_high: 0.80,
  min_sample_count: 30
});

/**
 * Non-destructive calibration configuration merger.
 * Preserves 100% of existing user-tuned parameters and custom application keys
 * while populating missing default calibration thresholds.
 *
 * @param {Object} targetConfig - Existing downstream project configuration
 * @param {Object} defaultThresholds - Baseline framework thresholds
 * @returns {Object} Deep merged configuration
 */
function mergeCalibrationConfig(targetConfig = {}, defaultThresholds = DEFAULT_CALIBRATION_THRESHOLDS) {
  if (typeof targetConfig !== 'object' || targetConfig === null) {
    targetConfig = {};
  }
  const result = Array.isArray(targetConfig) ? [...targetConfig] : { ...targetConfig };

  for (const [key, defVal] of Object.entries(defaultThresholds)) {
    if (!(key in result) || result[key] === undefined) {
      result[key] = (typeof defVal === 'object' && defVal !== null && !Array.isArray(defVal))
        ? mergeCalibrationConfig({}, defVal)
        : defVal;
    } else if (
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof defVal === 'object' &&
      defVal !== null &&
      !Array.isArray(defVal)
    ) {
      result[key] = mergeCalibrationConfig(result[key], defVal);
    }
  }
  return result;
}

// Custom lightweight YAML parser for framework-manifest.yml
function parseManifest(filePath) {
  const result = {
    version: '',
    overwrite: [],
    create_if_missing: [],
    never_touch: [],
    merge: [],
    drift_checks: []
  };

  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let currentKey = null;
  let currentObj = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      const vMatch = trimmed.match(/^version:\s*["']?([^"']+)["']?/);
      if (vMatch) {
        result.version = vMatch[1];
      }
      const kMatch = trimmed.match(/^(\w+):/);
      if (kMatch) {
        currentKey = kMatch[1];
        currentObj = null;
      }
      continue;
    }

    if (currentKey === 'overwrite' || currentKey === 'create_if_missing' || currentKey === 'never_touch') {
      if (trimmed.startsWith('-')) {
        const val = trimmed.substring(1).trim().replace(/^["']|["']$/g, '');
        if (currentKey === 'overwrite') result.overwrite.push(val);
        if (currentKey === 'create_if_missing') result.create_if_missing.push(val);
        if (currentKey === 'never_touch') result.never_touch.push(val);
      }
      continue;
    }

    if (currentKey === 'merge' || currentKey === 'drift_checks') {
      if (trimmed.startsWith('-')) {
        currentObj = {};
        if (currentKey === 'merge') result.merge.push(currentObj);
        if (currentKey === 'drift_checks') result.drift_checks.push(currentObj);
        
        const rest = trimmed.substring(1).trim();
        if (rest) {
          const cIndex = rest.indexOf(':');
          if (cIndex !== -1) {
            const k = rest.substring(0, cIndex).trim();
            const v = rest.substring(cIndex + 1).trim().replace(/^["']|["']$/g, '');
            currentObj[k] = v;
          }
        }
      } else if (currentObj) {
        const cIndex = trimmed.indexOf(':');
        if (cIndex !== -1 && !trimmed.startsWith('-')) {
          const k = trimmed.substring(0, cIndex).trim();
          const v = trimmed.substring(cIndex + 1).trim().replace(/^["']|["']$/g, '');
          currentObj[k] = v;
        }
      }
    }
  }

  // Fallback version parse if root key was missed
  if (!result.version) {
    const vLine = lines.find(l => l.trim().startsWith('version:'));
    if (vLine) {
      const match = vLine.trim().match(/^version:\s*["']?([^"']+)["']?/);
      if (match) result.version = match[1];
    }
  }

  return result;
}

// Glob matching helper
function globToRegex(pattern) {
  let cleanPattern = pattern;
  if (pattern.endsWith('/')) {
    cleanPattern = pattern + '**';
  }
  let escaped = cleanPattern.replace(/[.+^$()|[\]\\]/g, '\\$&');
  
  // Refined placeholder replacement to prevent matching standard framework assets
  escaped = escaped.replace(/\{project\}/g, '(?!soda)[^/]+');
  
  const standardRules = '(governance|security|core|guidelines|commits|goal-execution|artifact-conservation|platform-consumer|constitution|stack-.*)';
  escaped = escaped.replace(/\{stack\}/g, `(?!${standardRules})[^/]+`);
  
  escaped = escaped.replace(/\{([^}]+)\}/g, '.*');
  escaped = escaped.replace(/\*\*/g, '.*');
  escaped = escaped.replace(/\*/g, '[^/]*');
  return new RegExp('^' + escaped + '$');
}

function matchPattern(filePath, patterns) {
  if (!Array.isArray(patterns)) return false;
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const pattern of patterns) {
    if (!pattern || typeof pattern !== 'string') continue;
    const cleanPattern = pattern.replace(/^\.\//, '');
    const regex = globToRegex(cleanPattern);
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  return false;
}

function readReplacementsFromTarget(dir) {
  const agentsMdPath = path.join(dir, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf8');
    const nameMatch = content.match(/# (.*?) — Agent Entry Point/);
    const missionMatch = content.match(/## Mission\s*\n\n([\s\S]*?)\n\n##/);
    const testMatch = content.match(/## Test commands\s*\n\n```bash\n([\s\S]*?)\n```/);
    return {
      PROJECT_NAME: nameMatch ? nameMatch[1].trim() : defaultReplacements.PROJECT_NAME,
      PROJECT_MISSION: missionMatch ? missionMatch[1].trim() : defaultReplacements.PROJECT_MISSION,
      TEST_COMMANDS: testMatch ? testMatch[1].trim() : defaultReplacements.TEST_COMMANDS,
      SODA_OS_VERSION: currentVersion
    };
  }
  return defaultReplacements;
}

function replaceTemplates(content, replacements) {
  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Recursive directory scanner
function scanDir(dir, baseDir = dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath, baseDir, files);
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ relPath, fullPath });
    }
  }
  return files;
}

// Clean and create target folders for standard skills to simulate rsync --delete
const cleanedDirs = new Set();
function ensureCleanParentDir(destPath) {
  const destDir = path.dirname(destPath);
  const normalizedDestDir = path.relative(targetDir, destDir).replace(/\\/g, '/');
  
  // Check if it is a standard skill folder under .agents/skills/soda-*
  const match = normalizedDestDir.match(/^\.agents\/skills\/soda-[^/]+/);
  if (match) {
    const skillPath = path.join(targetDir, match[0]);
    if (!cleanedDirs.has(skillPath)) {
      if (fs.existsSync(skillPath)) {
        if (!options.dryRun) {
          fs.rmSync(skillPath, { recursive: true, force: true });
        }
        console.log(`[Clean] Deleted legacy skill directory: ${match[0]}`);
      }
      cleanedDirs.add(skillPath);
    }
  }
  
  if (!options.dryRun && !fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
}

function checkProjectVersion(dir) {
  const agentsMdPath = path.join(dir, 'AGENTS.md');
  const stampPath = path.join(dir, '.soda-os-version');
  
  if (fs.existsSync(stampPath)) {
    const content = fs.readFileSync(stampPath, 'utf8');
    const version = content.split('\n')[0];
    console.log(`Project Soda OS Version Stamp: ${version}`);
  } else if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf8');
    const versionMatch = content.match(/Soda OS Template Version: `([^`]+)`/);
    if (versionMatch) {
      console.log(`Project Soda OS Template Version (legacy AGENTS.md): ${versionMatch[1]}`);
    } else {
      console.log('Soda OS Version: Could not determine version.');
    }
  } else {
    console.log(`No active Soda OS project found at: ${dir}`);
  }
  console.log(`Latest Installed Soda OS CLI Version: ${currentVersion}`);
}

function runDriftChecks(manifest) {
  console.log('DRIFT (Phase 2 — soda-upgrade-os skill semantic merge)');
  let driftCount = 0;
  
  for (const check of manifest.drift_checks) {
    const filePath = check.file || check.path;
    const fullPath = path.join(targetDir, filePath);

    // A legacy directory check is a warning only when the directory exists.
    // Missing legacy paths are the healthy state and must not count as drift.
    if (check.type === 'directory_exists') {
      if (fs.existsSync(fullPath)) {
        console.log(`  ! [${check.id}] ${filePath} — ${check.message || 'legacy directory exists'}`);
        driftCount++;
      }
      continue;
    }
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ! [${check.id}] ${filePath} — File not found — create or merge from OS`);
      driftCount++;
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    if (check.must_contain && !content.includes(check.must_contain)) {
      console.log(`  ! [${check.id}] ${filePath} — Expected content: ${check.must_contain}`);
      driftCount++;
    }
    if (check.warn_if_contains && content.includes(check.warn_if_contains)) {
      console.log(`  ! [${check.id}] ${filePath} — Contains legacy pattern: ${check.warn_if_contains}`);
      driftCount++;
    }
  }
  
  // Legacy folder check
  const legacyArchiveDir = path.join(targetDir, 'docs/07-backlog/goals/_archive');
  if (fs.existsSync(legacyArchiveDir)) {
    console.log(`  ! [archive-folder] docs/07-backlog/goals/_archive/ — migrate to _archived/`);
    driftCount++;
  }

  if (driftCount === 0) {
    console.log('  (no drift detected — semantic merge may be complete)');
  }
  console.log('');
}

const _repoKindCache = new Map();

function detectRepositoryKind(dir) {
  if (typeof dir === 'string' && _repoKindCache.has(dir)) {
    return _repoKindCache.get(dir);
  }
  const pkgPath = path.join(dir, 'package.json');
  let result = 'downstream_project';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === '@sodality/soda-os' || pkg.name === 'soda-os' || pkg.repository_kind === 'framework_source') {
        result = 'framework_source';
      }
    } catch {}
  }
  if (result !== 'framework_source' && fs.existsSync(path.join(dir, 'template', 'framework-manifest.yml')) && fs.existsSync(path.join(dir, 'cli.js'))) {
    result = 'framework_source';
  }
  if (typeof dir === 'string') {
    _repoKindCache.set(dir, result);
  }
  return result;
}

function runReport(manifest) {
  const repositoryKind = detectRepositoryKind(targetDir);

  console.log('=== SODA OS UPGRADE REPORT ===\n');
  console.log('VERSION');
  console.log(`  OS template:     ${TEMPLATE_DIR}`);
  console.log(`  Manifest:        ${manifest.version}`);
  console.log(`  Target:          ${targetDir}`);
  console.log(`  Repository kind: ${repositoryKind}\n`);

  if (repositoryKind === 'framework_source') {
    console.log('FRAMEWORK SOURCE INTEGRITY MODE');
    console.log('  Target is the Soda OS framework source repository.');
    console.log('  Downstream scaffold files (AGENTS.md, docs/07-backlog/goals.md, etc.) are template-resident');
    console.log('  and must NOT be mechanically synced to the framework source root.\n');

    console.log('PARITY (Root vs Template Framework Assets)');
    let parityDiffs = 0;

    // Check shared rules
    const rootRules = fs.existsSync(path.join(targetDir, '.agents/rules')) 
      ? fs.readdirSync(path.join(targetDir, '.agents/rules')).filter(f => f.endsWith('.md')) : [];
    const templateRules = fs.existsSync(path.join(TEMPLATE_DIR, '.agents/rules'))
      ? fs.readdirSync(path.join(TEMPLATE_DIR, '.agents/rules')).filter(f => f.endsWith('.md')) : [];
    
    console.log(`  • Rules:  ${rootRules.length} root / ${templateRules.length} template`);
    if (rootRules.length !== templateRules.length) {
      console.log(`    ! Rule count discrepancy: root=${rootRules.length}, template=${templateRules.length}`);
      parityDiffs++;
    }

    // Check shared skills
    const rootSkills = fs.existsSync(path.join(targetDir, '.agents/skills'))
      ? fs.readdirSync(path.join(targetDir, '.agents/skills')).filter(f => f.startsWith('soda-')) : [];
    const templateSkills = fs.existsSync(path.join(TEMPLATE_DIR, '.agents/skills'))
      ? fs.readdirSync(path.join(TEMPLATE_DIR, '.agents/skills')).filter(f => f.startsWith('soda-')) : [];

    console.log(`  • Skills: ${rootSkills.length} root / ${templateSkills.length} template`);
    if (rootSkills.length !== templateSkills.length) {
      console.log(`    ! Skill count discrepancy: root=${rootSkills.length}, template=${templateSkills.length}`);
      parityDiffs++;
    }

    if (parityDiffs === 0) {
      console.log('  (all framework rules and skills in root and template are 100% synchronized)\n');
    } else {
      console.log(`  ! Found ${parityDiffs} parity discrepancies between root and template.\n`);
    }

    console.log('NEXT STEPS (Framework Source)');
    console.log('  1. Validate root harnesses:     npm test');
    console.log('  2. Validate template harnesses: npm run test:template');
    console.log('  3. Run goal assurance suite:    node scripts/harness/goal-assurance-suite.mjs --all\n');
    return;
  }

  const stampPath = path.join(targetDir, '.soda-os-version');
  const targetVer = fs.existsSync(stampPath) ? fs.readFileSync(stampPath, 'utf8').split('\n')[0] : '(not stamped)';
  console.log(`  Target stamp:  ${targetVer}\n`);
  
  console.log('MECHANICAL (Phase 1 — soda-os upgrade --yes)');
  let mechanicalCount = 0;
  const templateFiles = scanDir(TEMPLATE_DIR);
  
  for (const file of templateFiles) {
    const relPath = file.relPath;
    
    const targetFile = path.join(targetDir, relPath);
    
    // Skip product-owned and merge files
    // EXCEPT when they are also in create_if_missing and do not exist in target yet.
    if (matchPattern(relPath, manifest.never_touch)) continue;
    if (matchPattern(relPath, manifest.merge.map(m => m.file))) {
      const isCreateIfMissing = matchPattern(relPath, manifest.create_if_missing);
      if (!isCreateIfMissing || fs.existsSync(targetFile)) {
        continue;
      }
    }
    if (!fs.existsSync(targetFile)) {
      console.log(`  + ${relPath} (missing in target)`);
      mechanicalCount++;
    } else {
      const templateContent = fs.readFileSync(file.fullPath);
      const targetContent = fs.readFileSync(targetFile);
      if (!templateContent.equals(targetContent)) {
        console.log(`  ~ ${relPath} (differs from template)`);
        mechanicalCount++;
      }
    }
  }
  
  if (mechanicalCount === 0) {
    console.log('  (no mechanical changes detected — Phase 1 may be up to date)');
  }
  console.log('');
  
  runDriftChecks(manifest);
  
  console.log('MERGE (Phase 2 — hybrid files, never blind overwrite)');
  console.log('  • AGENTS.md — keep mission + {TEST_COMMANDS}; merge governance/skills/CI');
  console.log('  • docs/07-backlog/goals.md — keep Dashboard/queue; merge Layout/Status flow/legend');
  console.log('  • docs/00-index.md, README.md — merge doc map / upgrade sections');
  console.log('  • Skill: .agents/skills/soda-upgrade-os/SKILL.md');
  console.log('  • Manifest: framework-manifest.yml\n');
  
  console.log('NEXT STEPS');
  console.log('  1. Human: open upgrade goal or approve upgrade');
  console.log(`  2. Phase 1: soda-os upgrade "${targetDir}" --yes`);
  console.log('  3. Phase 2: Agent with soda-upgrade-os skill — merge hybrid files');
  console.log('  4. Verify: cd "<target>" && bash scripts/ci/governance-check.sh');
  console.log(`  5. Commit: G-xxx: upgrade Soda OS to ${manifest.version}\n`);
}

function writeVersionStamp(manifest, dir, isDryRun) {
  const baseDir = dir || targetDir;
  if (isDryRun || (options && options.dryRun)) {
    console.log(`[DryRun] Would write .soda-os-version (${manifest.version})`);
    return;
  }
  const stampPath = path.join(baseDir, '.soda-os-version');
  const content = `${manifest.version}\n${new Date().toISOString()}\n`;
  fs.writeFileSync(stampPath, content, 'utf8');
  console.log(`[Written] Wrote .soda-os-version (${manifest.version})`);
}

if (command === 'init') {
  console.log(`Initializing Soda OS at ${targetDir}...`);
  if (!fs.existsSync(targetDir) && !options.dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const templateFiles = scanDir(TEMPLATE_DIR);
  for (const file of templateFiles) {
    const dest = path.join(targetDir, file.relPath);
    if (!options.dryRun) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const isText = /\.(md|json|yml|yaml|sh|ps1|txt|js|html|css|gitignore)$/i.test(file.relPath) || 
                     path.basename(file.relPath) === 'AGENTS.md' || 
                     path.basename(file.relPath) === 'README.md';
      if (isText) {
        let content = fs.readFileSync(file.fullPath, 'utf8');
        content = replaceTemplates(content, defaultReplacements);
        fs.writeFileSync(dest, content, 'utf8');
      } else {
        fs.copyFileSync(file.fullPath, dest);
      }
    }
    console.log(`[Written] ${file.relPath}`);
  }
  
  const manifest = parseManifest(path.join(TEMPLATE_DIR, 'framework-manifest.yml'));
  writeVersionStamp(manifest);
  console.log('\nInitialization complete! Please configure AGENTS.md and docs/ to fit your project.');

} else if (command === 'upgrade') {
  if (args.includes('--help') || args.includes('-h') || process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: soda-os upgrade [path] [--report] [--yes] [--dry-run]');
    process.exit(0);
  }
  const manifestPath = path.join(TEMPLATE_DIR, 'framework-manifest.yml');
  const manifest = parseManifest(manifestPath);
  
  if (options.report) {
    runReport(manifest);
    process.exit(0);
  }
  
  console.log(`Upgrading Soda OS structures at ${targetDir}...`);
  if (options.dryRun) {
    console.log('** DRY RUN MODE — no files will be written **');
  }
  
  if (!options.yes && !options.dryRun) {
    console.log('\nPhase 1 — mechanical framework sync. Custom project files will NOT be touched.');
    process.stdout.write('Continue? [y/N]: ');
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer !== 'y' && answer !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
      }
      performUpgrade(manifest);
    });
  } else {
    performUpgrade(manifest);
  }
  
} else if (command === 'harness') {
  runHarness(args);
} else if (command === 'epic') {
  runEpic(process.argv.slice(3));
} else if (command === 'validate-goal' || command === 'audit-goals' || command === 'standardize-goals') {
  runAuditGoals(process.argv.slice(3));
} else if (command === 'assure' || command === 'assurance') {
  runAssure(process.argv.slice(3));
} else if (command === 'version') {
  checkProjectVersion(targetDir);
} else if (command === 'dave') {
  runDave(process.argv.slice(3));
} else if (command === 'implement') {
  runImplement(process.argv.slice(3));
} else if (require.main === module) {
  console.log('Soda OS Central Bootstrapper & Upgrader');
  console.log('Usage:');
  console.log('  soda-os init [path] [--dry-run]              - Bootstrap a new project');
  console.log('  soda-os upgrade [path] [--report] [--yes]    - Upgrade rules and workflows');
  console.log('  soda-os version [path]                       - Check template version status');
  console.log('  soda-os goal next [EPIC] [path] [--dry-run]  - Next ID (EPIC from branch epic/PAY if omitted)');
  console.log('  soda-os goal reserve <EPIC> [--count N] [path] [--dry-run]');
  console.log('  soda-os goal sync [EPIC] [path] [--dry-run]  - Reconcile queues, snapshot, dashboard, & registry');
  console.log('  soda-os goal waves [EPIC] [path]             - Calculate parallel DAG waves and worktrees');
  console.log('  soda-os goal execute <G-xxx> [path] [flags]  - Preflight and prepare goal execution (normal|swarm)');
  console.log('  soda-os goal create <EPIC> <TITLE> [flags]   - Atomically create conforming goal & sync markdown');
  console.log('  soda-os goal close <G-xxx> [path] [flags]    - Atomically mark goal done, update steps, archive card, & sync markdown');
  console.log('  soda-os goal archive <G-xxx> [path] [flags]  - Alias for soda-os goal close');
  console.log('  soda-os sync-goals [EPIC] [flags]            - Alias for soda-os goal sync');
  console.log('  soda-os parallel-goals [EPIC] [flags]        - Alias for soda-os goal waves');
  console.log('  soda-os execute-goal <G-xxx> [flags]         - Alias for soda-os goal execute');
  console.log('  soda-os close-goal <G-xxx> [flags]           - Alias for soda-os goal close');
  console.log('  soda-os archive-goal <G-xxx> [flags]         - Alias for soda-os goal close');
  console.log('  soda-os sync-ecosystem [flags]               - Scan & sync rules, skills, & harness across ecosystem');
  console.log('      flags: --all  --tier <A|B|C|all>  --target <proj>  --dry-run  --json  --help');
  console.log('  soda-os sync-all [flags]                     - Alias for soda-os sync-ecosystem');
  console.log('  soda-os sync-clickup [G-PAY-001] [path] [flags]  - Push goal(s) to ClickUp');
  console.log('      flags: --dry-run  --list  --all  --status-only  --help');
  console.log('  soda-os pr [G-xxx] [path] [flags]            - Generate PR payload & create Pull Request');
  console.log('      flags: --base <branch>  --head <branch>  --dry-run  --no-push  --help');
  console.log('  soda-os epic [EPIC_ID] [flags]               - Run Zero-Hallucination Epic Socratic Discovery & Pipeline');
  console.log('  soda-os harness [--chaos|--priority]          - Run Zero-Mock Preemptive & Chaos Harnesses');
  console.log('  soda-os validate-goal [G-xxx|path] [flags]   - Validate goal(s) against 25-section template standard');
  console.log('      flags: --all  --fix  --json  --help');
  console.log('  soda-os assure [G-xxx|--all]                 - Run 16-Layer Goal Lifecycle Assurance Suite');
  console.log('  soda-os audit-goals [path]                   - Audit & standardize goal templates to 16-section standard');
  console.log('  soda-os discovery <topic|G-xxx> [flags]      - Run Autonomous 3-Loop Socratic Progressive Discovery');
  console.log('  soda-os dave <subcommand> [flags]            - DAVE System 1 Decision & Evidence Suite');
  console.log('  soda-os implement <G-xxx> [flags]            - Governed Decision Implementation Gatekeeper');
  console.log('  soda-os diagnose [flags]                     - Multi-runtime process & lock diagnostics (Zero-pstack)');
  console.log('      flags: --pid <PID>  --runtime <name>  --locks  --audit-anti-patterns  --json');
  const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
  process.exit(isHelp ? 0 : 1);
}

function runDave(argv) {
  const scriptPath = [
    path.join(process.cwd(), 'scripts/lib/dave-cli.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/lib/dave-cli.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: dave-cli.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...argv], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runImplement(argv) {
  const scriptPath = [
    path.join(process.cwd(), 'scripts/lib/dave-cli.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/lib/dave-cli.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: dave-cli.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, 'implement', ...argv], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runEpic(argv) {
  const scriptPath = [
    path.join(process.cwd(), 'scripts/harness/epic-socratic-pipeline-harness.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/harness/epic-socratic-pipeline-harness.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: epic-socratic-pipeline-harness.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...argv], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runHarness(argv) {
  const scriptDir = path.join(TEMPLATE_DIR, 'scripts/harness');
  const runnerScript = path.join(TEMPLATE_DIR, 'scripts/run-all-soda-harnesses.sh');
  
  if (argv.includes('--chaos')) {
    const chaosScript = path.join(scriptDir, 'dual-transport-chaos-harness.mjs');
    const result = spawnSync(process.execPath, [chaosScript], { stdio: 'inherit', cwd: process.cwd() });
    process.exit(result.status === null ? 1 : result.status);
  }
  
  if (argv.includes('--preemption') || argv.includes('--priority')) {
    const preemptionScript = path.join(scriptDir, 'microservices-preemption-harness.mjs');
    const result = spawnSync(process.execPath, [preemptionScript], { stdio: 'inherit', cwd: process.cwd() });
    process.exit(result.status === null ? 1 : result.status);
  }

  const result = spawnSync('bash', [runnerScript], { stdio: 'inherit', cwd: process.cwd() });
  process.exit(result.status === null ? 1 : result.status);
}

function runAuditGoals(argv) {
  const scriptPath = [
    path.join(process.cwd(), 'scripts/harness/goal-template-conformance-harness.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/harness/goal-template-conformance-harness.mjs'),
    path.join(process.cwd(), 'scripts/agentic/audit-and-standardize-goals.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/agentic/audit-and-standardize-goals.mjs')
  ].find(p => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: goal-template-conformance-harness.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...argv], { stdio: 'inherit', cwd: process.cwd() });
  process.exit(result.status === null ? 1 : result.status);
}

function runAssure(argv) {
  let projectPath = process.cwd();
  const scriptArgs = [];

  for (const arg of argv) {
    if (arg === '--all' || arg === '--help' || arg === '-h') {
      scriptArgs.push(arg);
    } else if (/^G-[A-Za-z0-9_-]+$/i.test(arg)) {
      scriptArgs.push(arg.toUpperCase());
    } else if (!arg.startsWith('-')) {
      projectPath = path.resolve(arg);
    }
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/harness/goal-assurance-suite.mjs'),
    path.join(TEMPLATE_DIR, 'scripts/harness/goal-assurance-suite.mjs'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: goal-assurance-suite.mjs not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: projectPath,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

function loadGoalIdLib(projectPath) {
  const candidates = [
    path.join(projectPath, 'scripts/goals/goal-id.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/goal-id.js'),
    path.join(__dirname, 'scripts/goals/goal-id.js'),
  ];
  const libPath = candidates.find((p) => fs.existsSync(p));
  if (!libPath) {
    console.error('Error: scripts/goals/goal-id.js not found.');
    console.error('Run: soda-os upgrade <project> --yes');
    process.exit(1);
  }
  return require(libPath);
}

function printGoalUsage() {
  console.log(`Soda OS Goal Management Commands
Usage:
  soda-os goal next [EPIC] [path] [--dry-run]     - Allocate next sequential goal ID
  soda-os goal reserve <EPIC> [--count N] [flags] - Pre-reserve N goal IDs
  soda-os goal sync [EPIC] [path] [--dry-run]     - Reconcile queues, snapshot, dashboard, and registry
  soda-os goal waves [EPIC] [path]                - Calculate parallel DAG waves and worktree allocations
  soda-os goal execute <G-xxx> [path] [flags]     - Preflight and prepare goal execution (normal|swarm)
  soda-os goal create <EPIC> <TITLE> [flags]      - Atomically create conforming goal, contract, and sync markdown
  soda-os goal close <G-xxx> [path] [flags]       - Atomically mark goal done, update steps, archive card, & sync markdown
  soda-os goal archive <G-xxx> [path] [flags]     - Alias for soda-os goal close
  soda-os sync-goals [EPIC] [flags]               - Alias for soda-os goal sync
  soda-os parallel-goals [EPIC] [flags]           - Alias for soda-os goal waves
  soda-os execute-goal <G-xxx> [flags]            - Alias for soda-os goal execute
  soda-os close-goal <G-xxx> [flags]              - Alias for soda-os goal close
  soda-os archive-goal <G-xxx> [flags]            - Alias for soda-os goal close

Flags:
  --dry-run                 Simulate changes without writing to disk
  --mode <normal|swarm>     Normal single-goal execution (default) in PrimaryWorkspace | swarm: Parallel swarm wave execution (IsolatedWorktree)
  --step <N>, -s <N>        Step number to begin execution (default: 1)
  --note <text>             Closeout outcome or verification summary (for goal close)
  --date <YYYY-MM-DD>       Closeout date (default: today)
  --json                    Output machine-readable JSON preflight/closure payload
  --touch-map <paths>       Comma-separated touch map paths (for goal create)
  --role <role_name>        Assigned agent role (default: aether_implementer)
  --depends-on <ids>        Comma-separated goal dependencies (e.g. G-HARDEN-065)
  --blocks <ids>            Comma-separated goals blocked
  --kind <kind>             feature | bugfix | spike | refactor (default: feature)
`);
}

function runGoal(argv, customOptions = {}) {
  if (argv.length === 0) {
    printGoalUsage();
    if (customOptions && customOptions.noExit) {
      return { code: 1 };
    }
    process.exit(1);
  }

  const sub = argv[0];
  const rest = argv.slice(1);

  if (sub === '--help' || sub === '-h' || sub === 'help') {
    printGoalUsage();
    if (customOptions && customOptions.noExit) {
      return { code: 0 };
    }
    process.exit(0);
  }

  if (sub === 'next' || sub === 'reserve') {
    return runGoalAllocate(argv);
  } else if (sub === 'sync') {
    return runGoalSync(rest);
  } else if (sub === 'waves' || sub === 'parallel' || sub === 'plan') {
    return runGoalWaves(rest);
  } else if (sub === 'execute' || sub === 'exec') {
    return runGoalExecute(rest, customOptions);
  } else if (sub === 'create') {
    return runGoalCreate(rest);
  } else if (sub === 'close' || sub === 'archive') {
    return runGoalClose(rest, customOptions);
  } else {
    printGoalUsage();
    if (customOptions && customOptions.noExit) {
      return { code: 1, error: 'Unknown subcommand' };
    }
    process.exit(1);
  }
}

function runGoalAllocate(argv) {
  const sub = argv[0];
  if (sub !== 'next' && sub !== 'reserve') {
    printGoalUsage();
    process.exit(1);
  }

  let epic = null;
  let projectPath = process.cwd();
  let count = 1;
  let dryRun = false;
  let expectCount = false;

  for (const arg of argv.slice(1)) {
    if (expectCount) {
      count = parseInt(arg, 10);
      expectCount = false;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--count') {
      expectCount = true;
    } else if (arg.startsWith('--count=')) {
      count = parseInt(arg.slice('--count='.length), 10);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else if (!epic && /^[A-Za-z]{2,8}$/.test(arg)) {
      epic = arg;
    } else {
      projectPath = path.resolve(arg);
    }
  }

  const lib = loadGoalIdLib(projectPath);
  let root;
  try {
    root = lib.findProjectRoot(projectPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  let resolvedEpic;
  try {
    resolvedEpic = lib.resolveEpic(epic, root);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    const result = sub === 'next'
      ? lib.nextGoal(root, resolvedEpic, { dryRun })
      : lib.reserveGoals(root, resolvedEpic, count, { dryRun });
    const ids = result.allocated.map((item) => item.id);
    if (dryRun) console.log('--dry-run (registry not written)');
    for (const id of ids) console.log(id);
    console.error(`Epic:     ${result.epic}`);
    console.error(`Registry: ${result.registryPath}`);
    if (sub === 'next') {
      console.error('Next: copy docs/07-backlog/goals/_template.md → docs/07-backlog/goals/' + ids[0] + '.md');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  process.exit(0);
}

function runGoalSync(argv) {
  let epic = null;
  let projectPath = process.cwd();
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: soda-os goal sync [EPIC] [path] [--dry-run]');
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else if (!epic && /^[A-Za-z]{2,8}$/.test(arg)) {
      epic = arg.toUpperCase();
    } else {
      projectPath = path.resolve(arg);
    }
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/goal-markdown-sync.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/goal-markdown-sync.js'),
    path.join(__dirname, 'scripts/goals/goal-markdown-sync.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: scripts/goals/goal-markdown-sync.js not found.');
    process.exit(1);
  }

  const syncLib = require(scriptPath);
  const goalIdLib = loadGoalIdLib(projectPath);
  let root;
  try {
    root = goalIdLib.findProjectRoot(projectPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    console.log(`🔄 Synchronizing Soda OS Goal Markdown Files (Root: ${root})...`);
    const result = syncLib.syncAllMarkdown(root, { epic, dryRun });
    console.log(`✅ Registry reconciled: ${result.registry.epics.join(', ')}`);
    if (result.epics) {
      if (result.epics.updated) {
        console.log(`✅ Epics Index synced: ${result.epics.epicCount} epics -> ${path.relative(root, result.epics.epicsPath)}`);
      } else {
        console.log(`ℹ️ Epics Index skipped (${result.epics.reason})`);
      }
    }
    for (const q of result.queues) {
      console.log(`✅ Queue synced: ${q.epic} (${q.activeCount} active, ${q.archivedCount} archived) -> ${path.relative(root, q.queuePath)}`);
    }
    if (result.snapshot.updated) {
      console.log(`✅ Project Snapshot synced: ${result.snapshot.activeCount} active goals -> ${path.relative(root, result.snapshot.snapshotPath)}`);
    } else {
      console.log(`ℹ️ Project Snapshot skipped (${result.snapshot.reason})`);
    }
    if (result.dashboard.updated) {
      console.log(`✅ Goals Dashboard synced: ${result.dashboard.epicCount} epics -> ${path.relative(root, result.dashboard.dashboardPath)}`);
    } else {
      console.log(`ℹ️ Goals Dashboard skipped (${result.dashboard.reason})`);
    }
    if (result.acceptanceContracts.length > 0) {
      console.log(`✅ Acceptance contracts created: ${result.acceptanceContracts.length}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error during sync: ${err.message}`);
    process.exit(1);
  }
}

function runGoalWaves(argv) {
  let epic = null;
  let projectPath = process.cwd();

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: soda-os goal waves [EPIC] [path]');
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else if (!epic && /^[A-Za-z]{2,8}$/.test(arg)) {
      epic = arg.toUpperCase();
    } else {
      projectPath = path.resolve(arg);
    }
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/parallel-goal-planner.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/parallel-goal-planner.js'),
    path.join(__dirname, 'scripts/goals/parallel-goal-planner.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: scripts/goals/parallel-goal-planner.js not found.');
    process.exit(1);
  }

  const syncScriptPath = [
    path.join(projectPath, 'scripts/goals/goal-markdown-sync.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/goal-markdown-sync.js'),
    path.join(__dirname, 'scripts/goals/goal-markdown-sync.js'),
  ].find((p) => fs.existsSync(p));

  const plannerLib = require(scriptPath);
  const markdownSyncLib = require(syncScriptPath);
  const goalIdLib = loadGoalIdLib(projectPath);
  let root;
  try {
    root = goalIdLib.findProjectRoot(projectPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    const allGoals = markdownSyncLib.loadAllGoals(root);
    const targetGoals = epic
      ? allGoals.filter((g) => g.epic === epic && !g.isArchived && g.status !== 'done')
      : allGoals.filter((g) => !g.isArchived && g.status !== 'done');

    console.log(`\n🌊 Soda OS Parallel Goal Execution Schedule (Root: ${root})`);
    console.log(`🎯 Epic Filter: ${epic || 'ALL ACTIVE'}`);
    console.log(`📊 Active Goals Analyzed: ${targetGoals.length}\n`);

    const plan = plannerLib.planParallelExecution(root, targetGoals);

    for (const w of plan.waves) {
      console.log(`══════════════════════════════════════════════════════════════════════`);
      console.log(`🚀 WAVE ${w.wave}: ${w.goalsCount} Goal(s) · Concurrency Sub-Waves: ${w.subWavesCount}`);
      console.log(`══════════════════════════════════════════════════════════════════════`);

      for (const sub of w.subWaves) {
        const subTitle = w.subWavesCount > 1 ? `Sub-Wave ${w.wave}.${sub.subWave}` : `Execution Batch`;
        console.log(`  ▶ ${subTitle} (Parallel Concurrency: ${sub.concurrency} concurrent subagents)`);
        for (const g of sub.goals) {
          const deps = g.dependsOn.length > 0 ? g.dependsOn.join(', ') : 'none';
          console.log(`    • ${g.id} [${g.status}] — "${g.title}"`);
          console.log(`      Assigned:   ${g.orchestration.role}`);
          console.log(`      Worktree:   ${g.orchestration.worktreePath}`);
          console.log(`      Touch Map:  ${(g.touchMap || []).join(', ') || 'src/**'}`);
          console.log(`      Depends On: ${deps}`);
        }
      }
      console.log('');
    }
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error computing waves: ${err.message}`);
    process.exit(1);
  }
}

function runGoalCreate(argv) {
  let epic = null;
  let title = '';
  let projectPath = process.cwd();
  let dryRun = false;
  let role = 'aether_implementer';
  let kind = 'feature';
  let touchMap = [];
  let dependsOn = [];
  let blocks = [];
  let atomicOutcome = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: soda-os goal create <EPIC> <TITLE> [--role <role>] [--touch-map <paths>] [--depends-on <ids>] [--blocks <ids>] [--dry-run]');
      process.exit(0);
    } else if (arg === '--role' && i + 1 < argv.length) {
      role = argv[++i];
    } else if (arg.startsWith('--role=')) {
      role = arg.slice('--role='.length);
    } else if (arg === '--kind' && i + 1 < argv.length) {
      kind = argv[++i];
    } else if (arg.startsWith('--kind=')) {
      kind = arg.slice('--kind='.length);
    } else if (arg === '--touch-map' && i + 1 < argv.length) {
      touchMap = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--touch-map=')) {
      touchMap = arg.slice('--touch-map='.length).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--depends-on' && i + 1 < argv.length) {
      dependsOn = argv[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg.startsWith('--depends-on=')) {
      dependsOn = arg.slice('--depends-on='.length).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg === '--blocks' && i + 1 < argv.length) {
      blocks = argv[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg.startsWith('--blocks=')) {
      blocks = arg.slice('--blocks='.length).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg === '--outcome' && i + 1 < argv.length) {
      atomicOutcome = argv[++i];
    } else if (arg.startsWith('--outcome=')) {
      atomicOutcome = arg.slice('--outcome='.length);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else if (!epic && /^[A-Za-z]{2,8}$/.test(arg)) {
      epic = arg.toUpperCase();
    } else if (!title) {
      title = arg;
    } else {
      if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
        projectPath = path.resolve(arg);
      } else {
        title += ` ${arg}`;
      }
    }
  }

  if (!epic || !title) {
    console.error('Error: Both <EPIC> and <TITLE> are required.');
    console.error('Usage: soda-os goal create <EPIC> <TITLE> [flags]');
    process.exit(1);
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/parallel-goal-planner.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/parallel-goal-planner.js'),
    path.join(__dirname, 'scripts/goals/parallel-goal-planner.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath) {
    console.error('Error: scripts/goals/parallel-goal-planner.js not found.');
    process.exit(1);
  }

  const plannerLib = require(scriptPath);
  const goalIdLib = loadGoalIdLib(projectPath);
  let root;
  try {
    root = goalIdLib.findProjectRoot(projectPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    const res = plannerLib.createGoal(
      root,
      {
        epic,
        title,
        assigned: role,
        kind,
        touchMap,
        dependsOn,
        blocks,
        atomicOutcome: atomicOutcome || title,
      },
      { dryRun }
    );

    console.log(`\n🎉 Goal Created Successfully!`);
    console.log(`   ID:                  ${res.goalId}`);
    console.log(`   Card File:           ${path.relative(root, res.goalFilePath)}`);
    console.log(`   Acceptance Contract: ${path.relative(root, res.acceptanceContractPath)}`);
    console.log(`   Markdown Sync:       Reconciled across queues, snapshot, and dashboard.`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Failed to create goal: ${err.message}`);
    process.exit(1);
  }
}

function runGoalClose(argv, customOptions = {}) {
  const noExit = Boolean(customOptions && customOptions.noExit);

  const fail = (message, code = 1) => {
    console.error(message);
    if (noExit) {
      return { code, error: message };
    }
    process.exit(code);
  };

  const succeed = (payload) => {
    if (noExit) {
      return { code: 0, payload, output: payload };
    }
    process.exit(0);
  };

  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    console.log(`Soda OS Goal Closure & Archival
Usage:
  soda-os goal close <G-xxx> [path] [flags]
  soda-os goal archive <G-xxx> [path] [flags]
  soda-os close-goal <G-xxx> [path] [flags]
  soda-os archive-goal <G-xxx> [path] [flags]

Flags:
  --note <text>             Reason or verification outcome summary to record
  --date <YYYY-MM-DD>       Closeout date (defaults to today)
  --dry-run                 Simulate archival without modifying filesystem
  --json                    Output machine-readable JSON summary
  -h, --help                Show this help message
`);
    return succeed({ help: true });
  }

  let goalId = null;
  let projectPath = process.cwd();
  let note = '';
  let date = null;
  let dryRun = false;
  let jsonOutput = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--note' && i + 1 < argv.length) {
      note = argv[++i];
    } else if (arg.startsWith('--note=')) {
      note = arg.slice('--note='.length);
    } else if (arg === '--date' && i + 1 < argv.length) {
      date = argv[++i];
    } else if (arg.startsWith('--date=')) {
      date = arg.slice('--date='.length);
    } else if (/^G-(?:[A-Za-z0-9]+-)?\d{3,}$/i.test(arg) || /^G-[0-9]{3}$/i.test(arg) || /^G-[A-Za-z0-9_-]+$/i.test(arg)) {
      goalId = arg.toUpperCase();
    } else if (arg.startsWith('-')) {
      return fail(`❌ Unknown flag: ${arg}`);
    } else {
      projectPath = path.resolve(arg);
    }
  }

  if (!goalId) {
    return fail('❌ Error: Goal ID is required (e.g. G-DAVE-001 or G-001).');
  }

  const syncScriptPath = [
    path.join(projectPath, 'scripts/goals/goal-markdown-sync.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/goal-markdown-sync.js'),
    path.join(__dirname, 'scripts/goals/goal-markdown-sync.js'),
  ].find((p) => fs.existsSync(p));

  if (!syncScriptPath) {
    return fail('❌ Error: Required goal synchronization script not found. Run soda-os upgrade.');
  }

  const markdownSyncLib = require(syncScriptPath);
  const goalIdLib = loadGoalIdLib(projectPath);

  let root;
  try {
    root = goalIdLib.findProjectRoot(projectPath);
  } catch (err) {
    return fail(err.message);
  }

  try {
    const result = markdownSyncLib.closeGoal(root, goalId, {
      dryRun,
      reason: note,
      closedDate: date,
    });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🎉 Goal ${result.goalId} Closed & Archived Successfully!`);
      console.log(`   Title:         "${result.title}"`);
      console.log(`   Epic:          ${result.epic}`);
      console.log(`   Status:        ${result.status.toUpperCase()}`);
      console.log(`   Closed Date:   ${result.closedDate}`);
      console.log(`   Archived Card: ${path.relative(root, result.archivedPath)}`);
      if (result.dryRun) {
        console.log(`   (Simulated --dry-run mode)`);
      } else {
        console.log(`   Markdown Sync: Epic queue, project snapshot, and dashboard synchronized.`);
      }
    }
    return succeed(result);
  } catch (err) {
    return fail(`❌ Failed to close goal ${goalId}: ${err.message}`);
  }
}

function runGoalExecute(argv, customOptions = {}) {
  const noExit = Boolean(customOptions && customOptions.noExit);

  const fail = (message, code = 1) => {
    console.error(message);
    if (noExit) {
      return { code, error: message };
    }
    process.exit(code);
  };

  const succeed = (payload) => {
    if (noExit) {
      return { code: 0, payload, output: payload };
    }
    process.exit(0);
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Soda OS Goal Execution Preparation
Usage:
  soda-os goal execute <G-xxx> [path] [flags]
  soda-os execute-goal <G-xxx> [path] [flags]

Flags:
  --mode <normal|swarm>     Normal single-goal execution (default) or parallel swarm in worktree
  --step <N>, -s <N>        Step number to begin execution (default: 1)
  --dry-run                 Simulate preflight without modifying repository state
  --json                    Output machine-readable JSON preflight payload
  -h, --help                Show this help message
`);
    return succeed({ help: true });
  }

  let goalId = null;
  let projectPath = process.cwd();
  let mode = 'normal';
  let step = 1;
  let dryRun = false;
  let jsonOutput = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--mode') {
      if (i + 1 >= argv.length) {
        return fail('❌ Error: --mode requires an argument (normal or swarm).');
      }
      mode = argv[++i].toLowerCase();
    } else if (arg.startsWith('--mode=')) {
      mode = arg.split('=')[1].toLowerCase();
    } else if (arg === '--step' || arg === '-s') {
      if (i + 1 >= argv.length) {
        return fail('❌ Error: --step requires a step number.');
      }
      step = parseInt(argv[++i], 10) || 1;
    } else if (arg.startsWith('--step=')) {
      step = parseInt(arg.split('=')[1], 10) || 1;
    } else if (/^G-(?:[A-Za-z0-9]+-)?\d{3,}$/i.test(arg) || /^G-[A-Za-z0-9_-]+$/i.test(arg)) {
      goalId = arg.toUpperCase();
    } else if (arg.startsWith('-')) {
      return fail(`❌ Unknown flag: ${arg}`);
    } else {
      // Positional path
      projectPath = path.resolve(arg);
    }
  }

  if (!goalId) {
    return fail('❌ Error: Goal ID is required (e.g. G-HARDEN-065 or G-001).');
  }

  if (mode !== 'normal' && mode !== 'swarm') {
    return fail(`❌ Error: Invalid mode: ${mode}. Must be 'normal' or 'swarm'.`);
  }

  const scriptPath = [
    path.join(projectPath, 'scripts/goals/parallel-goal-planner.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/parallel-goal-planner.js'),
    path.join(__dirname, 'scripts/goals/parallel-goal-planner.js'),
  ].find((p) => fs.existsSync(p));

  const syncScriptPath = [
    path.join(projectPath, 'scripts/goals/goal-markdown-sync.js'),
    path.join(TEMPLATE_DIR, 'scripts/goals/goal-markdown-sync.js'),
    path.join(__dirname, 'scripts/goals/goal-markdown-sync.js'),
  ].find((p) => fs.existsSync(p));

  if (!scriptPath || !syncScriptPath) {
    return fail('❌ Error: Required goal planning scripts not found. Run soda-os upgrade.');
  }

  const plannerLib = require(scriptPath);
  const markdownSyncLib = require(syncScriptPath);
  const goalIdLib = loadGoalIdLib(projectPath);

  let root;
  try {
    root = goalIdLib.findProjectRoot(projectPath);
  } catch (err) {
    return fail(err.message);
  }

  // Find goal file
  const candidateGoalFiles = [
    path.join(root, 'docs/07-backlog/goals', `${goalId}.md`),
    path.join(root, 'docs/07-backlog/goals/_archived', `${goalId}.md`),
    path.join(root, 'template/docs/07-backlog/goals', `${goalId}.md`),
    path.join(root, 'template/docs/07-backlog/goals/_archived', `${goalId}.md`),
  ];
  let goalFilePath = candidateGoalFiles.find((p) => fs.existsSync(p));

  if (!goalFilePath) {
    try {
      const allFiles = goalIdLib.listGoalFiles ? goalIdLib.listGoalFiles(root) : [];
      const matched = allFiles.find((f) => path.basename(f, '.md').toUpperCase() === goalId);
      if (matched) {
        goalFilePath = matched;
      }
    } catch (_) {}
  }

  if (!goalFilePath) {
    return fail(`❌ Error: Could not find goal card for ${goalId} in backlog or archive.`);
  }

  let parsedGoal;
  try {
    parsedGoal = markdownSyncLib.parseGoalFile(goalFilePath);
  } catch (err) {
    return fail(`❌ Error parsing goal file: ${err.message}`);
  }

  const fileContent = fs.readFileSync(goalFilePath, 'utf8');

  // Role extraction (supporting markdown table, role: and owner: frontmatter)
  let role = parsedGoal.assigned || 'aether_implementer';
  const roleFrontmatterMatch = fileContent.match(/(?:^|\n)(?:owner|role|assigned):\s*`?([a-zA-Z0-9_-]+)`?/i);
  if (roleFrontmatterMatch) {
    role = roleFrontmatterMatch[1].trim();
  }
  const roleSlug = role.replace(/_/g, '-');
  const repoName = path.basename(root);

  // Acceptance contract & bundle paths
  const acceptanceContractPath = path.join(root, 'docs/02-product/acceptance', `${goalId}.md`);
  const hasAcceptanceContract = fs.existsSync(acceptanceContractPath);

  const contextBundlePath = path.join(root, '.bundle', goalId);
  const hasContextBundle = fs.existsSync(contextBundlePath);

  // Sanitize touch map & detect shared tracking files
  let rawTouchMap = parsedGoal.touchMap || [];
  if (rawTouchMap.length === 0) {
    const yamlTouchMapMatch = fileContent.match(/(?:^|\n)(?:touch_map|touchMap):\s*\n((?:\s*-\s*[^\n]+\n*)+)/i);
    if (yamlTouchMapMatch) {
      const items = yamlTouchMapMatch[1].split('\n')
        .map((l) => l.replace(/^\s*-\s*`?([^`\n]+)`?.*$/, '$1').trim())
        .filter((l) => l && !l.startsWith('-'));
      rawTouchMap = items;
    }
  }

  const isSharedFile = (p) => {
    if (plannerLib && typeof plannerLib.isSharedTrackingFile === 'function') {
      return plannerLib.isSharedTrackingFile(p);
    }
    const basename = path.basename(p);
    return ['CLARIFICATION.md', 'docs/00-project-snapshot.md', 'docs/07-backlog/goals.md', 'docs/07-backlog/epics.md', 'docs/07-backlog/goal-id-registry.yaml', 'docs/07-backlog/goal-id-registry.yml', 'docs/07-backlog/changelog.md', 'docs/07-backlog/changelog-goals.md', 'framework-manifest.yml'].includes(p) || basename === 'CLARIFICATION.md';
  };

  const sharedTrackingFiles = rawTouchMap.filter((p) => isSharedFile(p));
  const touchMap = plannerLib.sanitizeTouchMap ? plannerLib.sanitizeTouchMap(rawTouchMap) : rawTouchMap;

  // Dependencies extraction
  let dependsOn = parsedGoal.dependsOn || [];
  if (dependsOn.length === 0) {
    const yamlDepMatch = fileContent.match(/(?:^|\n)(?:dependencies|depends_on|dependsOn):\s*\n((?:\s*-\s*[^\n]+\n*)+)/i);
    if (yamlDepMatch) {
      const items = yamlDepMatch[1].split('\n')
        .map((l) => l.replace(/^\s*-\s*`?([^`\n]+)`?.*$/, '$1').trim())
        .filter((l) => l && !l.startsWith('-'));
      dependsOn = items;
    }
  }

  // Load all goals for dependency analysis
  let allGoals = [];
  try {
    allGoals = markdownSyncLib.loadAllGoals(root);
  } catch (_) {}

  const satisfiedDeps = [];
  const unsatisfiedDeps = [];
  const missingDeps = [];

  for (const depId of dependsOn) {
    const depGoal = allGoals.find((g) => g.id === depId);
    if (!depGoal) {
      const candidateFiles = [
        path.join(root, 'docs/07-backlog/goals', `${depId}.md`),
        path.join(root, 'docs/07-backlog/goals/_archived', `${depId}.md`),
      ];
      const foundPath = candidateFiles.find((p) => fs.existsSync(p));
      if (foundPath) {
        const parsed = markdownSyncLib.parseGoalFile(foundPath);
        if (parsed.status === 'done') {
          satisfiedDeps.push(depId);
        } else {
          unsatisfiedDeps.push({ id: depId, status: parsed.status });
        }
      } else {
        missingDeps.push(depId);
      }
    } else if (depGoal.status === 'done') {
      satisfiedDeps.push(depId);
    } else {
      unsatisfiedDeps.push({ id: depId, status: depGoal.status });
    }
  }

  const allSatisfied = unsatisfiedDeps.length === 0 && missingDeps.length === 0;

  const depAudit = {
    declared: dependsOn,
    satisfied: satisfiedDeps,
    unsatisfied: unsatisfiedDeps,
    missing: missingDeps,
    allSatisfied,
  };

  // Warnings
  const warnings = [];
  if (parsedGoal.status !== 'ready' && parsedGoal.status !== 'in_progress') {
    warnings.push(`Goal status is "${parsedGoal.status}" (recommended status for execution is "ready").`);
  }
  if (unsatisfiedDeps.length > 0) {
    const depStr = unsatisfiedDeps.map((d) => (typeof d === 'object' ? `${d.id} [${d.status}]` : d)).join(', ');
    warnings.push(`Unsatisfied dependencies: ${depStr}`);
  }
  if (missingDeps.length > 0) {
    warnings.push(`Unrecorded dependencies: ${missingDeps.join(', ')}`);
  }
  if (sharedTrackingFiles.length > 0) {
    warnings.push(`Touch map contains shared tracking files (${sharedTrackingFiles.join(', ')}). In swarm mode, touch map is sanitized to prevent branch divergence.`);
  }
  if (!hasAcceptanceContract) {
    warnings.push(`Acceptance contract missing at docs/02-product/acceptance/${goalId}.md (run soda-os goal sync to generate stub).`);
  }

  // Execution config
  let execConfig;
  if (mode === 'normal') {
    execConfig = {
      executionMode: 'normal',
      mode: 'normal',
      workspaceType: 'PrimaryWorkspace',
      targetWorkspace: root,
      branch: `feature/${goalId}`,
      branchCommand: `git checkout -b feature/${goalId} 2>/dev/null || git checkout feature/${goalId}`,
      worktreePath: null,
      worktreeOverhead: false,
      sharedWorktreeProtection: 'Direct feature branch on primary workspace. No worktree collision risk.',
      activeStep: step,
      step,
      conversationalTrigger: step > 1 ? `เริ่ม step ${step}` : `เริ่ม step 1 (or ทำ ${goalId})`,
    };
  } else {
    const worktreeRelPath = `../worktrees/${repoName}-${goalId.toLowerCase()}-${roleSlug}`;
    const targetWorkspace = path.resolve(root, '..', 'worktrees', `${repoName}-${goalId.toLowerCase()}-${roleSlug}`);
    execConfig = {
      executionMode: 'swarm',
      mode: 'swarm',
      workspaceType: 'IsolatedWorktree',
      targetWorkspace,
      branch: `feature/${goalId}`,
      worktreePath: worktreeRelPath,
      worktreeOverhead: true,
      worktreeCommand: `git worktree add -b feature/${goalId} "${targetWorkspace}" origin/develop`,
      setupCommand: `git worktree add -b feature/${goalId} "${targetWorkspace}" origin/develop`,
      sharedWorktreeProtection: 'Isolated worktree per subagent. Touch map sanitized of shared tracking files.',
      activeStep: step,
      step,
      conversationalTrigger: `Spawn subagent for ${goalId} targeting worktree: ${targetWorkspace}`,
    };
  }

  const preflightData = {
    root,
    goalFile: path.relative(root, goalFilePath),
    goalFilePath: path.relative(root, goalFilePath),
    status: parsedGoal.status,
    hasAcceptanceContract: Boolean(hasAcceptanceContract),
    hasContextBundle: Boolean(hasContextBundle),
    acceptanceContract: {
      path: path.relative(root, acceptanceContractPath),
      exists: Boolean(hasAcceptanceContract),
    },
    contextBundle: {
      path: path.relative(root, contextBundlePath),
      exists: Boolean(hasContextBundle),
    },
    touchMap,
    sharedTrackingFileCollisions: sharedTrackingFiles,
    sharedTrackingFiles,
    dependenciesAudit: depAudit,
    dependencies: depAudit,
    warnings,
  };

  const payload = {
    goalId,
    title: parsedGoal.title,
    status: parsedGoal.status,
    role,
    mode,
    step,
    dryRun,
    config: execConfig,
    execution: execConfig,
    preflight: preflightData,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(payload, null, 2));
    return succeed(payload);
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`🎯 SODA OS GOAL EXECUTION PREFLIGHT: ${goalId}`);
  console.log(`══════════════════════════════════════════════════════════════════════`);
  console.log(`   Goal Title:           "${parsedGoal.title}"`);
  console.log(`   Current Status:       [${parsedGoal.status}]`);
  console.log(`   Assigned Role:        ${role}`);
  console.log(`   Execution Mode:       ${mode.toUpperCase()} (${execConfig.workspaceType})`);
  console.log(`   Target Workspace:     ${execConfig.targetWorkspace}`);
  console.log(`   Feature Branch:       ${execConfig.branch}`);
  console.log(`   Worktree Overhead:    ${execConfig.worktreeOverhead ? 'YES (isolated worktree created)' : 'NO (zero worktree overhead, direct root)'}`);
  console.log(`   Goal Card File:       ${path.relative(root, goalFilePath)}`);
  console.log(`   Acceptance Contract:  ${path.relative(root, acceptanceContractPath)} (${hasAcceptanceContract ? 'FOUND' : 'MISSING'})`);
  console.log(`   Context Bundle:       ${path.relative(root, contextBundlePath)} (${hasContextBundle ? 'READY' : 'UNCOMPILED'})`);
  console.log(`   Touch Map (${touchMap.length}):      ${touchMap.join(', ') || 'none declared'}`);

  if (dependsOn.length > 0) {
    const depStatus = depAudit.allSatisfied ? 'ALL SATISFIED ✅' : 'PENDING ⚠️';
    console.log(`   Dependencies:         ${depStatus}`);
    if (satisfiedDeps.length > 0) console.log(`     • Satisfied:   ${satisfiedDeps.join(', ')}`);
    if (unsatisfiedDeps.length > 0) {
      const depStr = unsatisfiedDeps.map((d) => (typeof d === 'object' ? `${d.id} [${d.status}]` : d)).join(', ');
      console.log(`     • Unsatisfied: ${depStr}`);
    }
    if (missingDeps.length > 0) console.log(`     • Missing:     ${missingDeps.join(', ')}`);
  } else {
    console.log(`   Dependencies:         NONE (Root goal ready for execution)`);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  PREFLIGHT WARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`   • ${w}`);
    }
  }

  console.log(`\n🚀 EXECUTION INSTRUCTIONS:`);
  if (mode === 'normal') {
    console.log(`   1. Prepare branch:    ${execConfig.branchCommand}`);
    console.log(`   2. Agent Trigger:     "${execConfig.conversationalTrigger}"`);
    console.log(`   3. Workspace:         ${execConfig.targetWorkspace} (Zero worktree overhead)`);
  } else {
    console.log(`   1. Setup Worktree:    ${execConfig.setupCommand}`);
    console.log(`   2. Agent Trigger:     ${execConfig.conversationalTrigger}`);
    console.log(`   3. Isolation:         Isolated Git Worktree (subagent concurrency)`);
  }

  if (dryRun) {
    console.log(`\n[DryRun] Preflight check completed successfully without altering workspace state.`);
  }

  return succeed(payload);
}

function performUpgrade(manifest, customTargetDir, customOptions) {
  const activeTargetDir = customTargetDir || targetDir;
  const activeOptions = customOptions || (typeof options !== 'undefined' ? options : {});
  const replacements = readReplacementsFromTarget(activeTargetDir);
  const templateFiles = scanDir(TEMPLATE_DIR);
  
  for (const file of templateFiles) {
    const relPath = file.relPath;
    
    // 1. Skip if file is in never_touch list
    if (matchPattern(relPath, manifest.never_touch)) {
      continue;
    }

    // The manifest is the allow-list for mechanical sync. This prevents a new
    // template asset from silently overwriting an unclassified product file.
    const mechanical = matchPattern(relPath, manifest.overwrite);
    const creatable = matchPattern(relPath, manifest.create_if_missing);
    if (!mechanical && !creatable) {
      continue;
    }
    
    const dest = path.join(activeTargetDir, relPath);
    
    // 2. Skip if file is in merge list (since they require Phase 2 semantic merge)
    //    EXCEPT when it is also in create_if_missing and does not exist in target yet.
    if (matchPattern(relPath, manifest.merge.map(m => m.file))) {
      const isCreateIfMissing = matchPattern(relPath, manifest.create_if_missing);
      if (!isCreateIfMissing || fs.existsSync(dest)) {
        continue;
      }
    }
    
    // 3. Skip if file is create_if_missing and already exists in target
    if (creatable) {
      if (fs.existsSync(dest)) {
        continue;
      }
    }
    
    // 4. Overwrite (copy) standard files
    if (!activeOptions.dryRun) {
      ensureCleanParentDir(dest);
    }
    
    const isText = /\.(md|json|yml|yaml|sh|ps1|txt|js|html|css|gitignore)$/i.test(relPath) || 
                   path.basename(relPath) === 'AGENTS.md' || 
                   path.basename(relPath) === 'README.md';
    
    if (!activeOptions.dryRun) {
      if (isText) {
        let content = fs.readFileSync(file.fullPath, 'utf8');
        content = replaceTemplates(content, replacements);
        fs.writeFileSync(dest, content, 'utf8');
      } else {
        fs.copyFileSync(file.fullPath, dest);
      }
      console.log(`[Written] ${relPath}`);
    } else {
      console.log(`[DryRun] Would write ${relPath}`);
    }
  }

  // Non-destructive calibration configuration merge if target has calibration configs
  const configCandidates = [
    path.join(activeTargetDir, 'config', 'calibration.json'),
    path.join(activeTargetDir, 'calibration.config.json'),
    path.join(activeTargetDir, 'soda.config.json')
  ];
  for (const cfgPath of configCandidates) {
    if (fs.existsSync(cfgPath)) {
      try {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const parsed = JSON.parse(raw);
        const merged = mergeCalibrationConfig(parsed, DEFAULT_CALIBRATION_THRESHOLDS);
        if (!activeOptions.dryRun) {
          fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
          console.log(`[Merged] ${path.relative(activeTargetDir, cfgPath)} (calibration thresholds synchronized)`);
        } else {
          console.log(`[DryRun] Would merge ${path.relative(activeTargetDir, cfgPath)}`);
        }
      } catch (e) {
        console.warn(`[Warning] Could not merge calibration config at ${cfgPath}: ${e.message}`);
      }
    }
  }
  
  writeVersionStamp(manifest, activeTargetDir, activeOptions.dryRun);
  console.log('\nUpgrade complete! Base templates, rules, and workflows updated.');
  console.log('Please proceed to Phase 2 (semantic merge using soda-upgrade-os skill).');
  if (!customTargetDir) {
    process.exit(0);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectRepositoryKind,
    runReport,
    parseManifest,
    mergeCalibrationConfig,
    DEFAULT_CALIBRATION_THRESHOLDS,
    performUpgrade,
    runGoal,
    runGoalExecute,
    runGoalClose,
    runSyncEcosystem
  };
}

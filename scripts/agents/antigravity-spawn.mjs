#!/usr/bin/env node
/**
 * Antigravity Subagent Spawner CLI shortcut.
 * Equivalent to `spawn-subagent.mjs --provider antigravity "$@"`
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spawnerPath = path.join(__dirname, 'spawn-subagent.mjs');

const child = spawn(process.execPath, [spawnerPath, '--provider', 'antigravity', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

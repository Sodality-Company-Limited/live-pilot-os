import fs from 'node:fs/promises';
import path from 'node:path';

export async function rotateTelemetry(repoRoot = process.cwd(), options = {}) {
  const dir = path.join(repoRoot, '.agents', 'telemetry');
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  const maxAgeMs = options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let removed = 0;
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return { removed: 0 }; }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const file = path.join(dir, entry.name);
    const stat = await fs.stat(file);
    if (now - stat.mtimeMs > maxAgeMs || stat.size > maxBytes) {
      await fs.unlink(file);
      removed += 1;
    }
  }
  return { removed };
}

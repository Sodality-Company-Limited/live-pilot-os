import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rotateTelemetry } from '../lib/telemetry-retention.mjs';

test('removes oversized telemetry files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-telemetry-'));
  const dir = path.join(root, '.agents', 'telemetry');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'sessions.jsonl'), 'x'.repeat(20));
  const result = await rotateTelemetry(root, { maxBytes: 10, maxAgeMs: 60_000 });
  assert.equal(result.removed, 1);
});

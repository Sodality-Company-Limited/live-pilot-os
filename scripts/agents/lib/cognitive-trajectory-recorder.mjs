/**
 * Cognitive Trajectory Persistence Engine.
 * Saves full-fidelity, sanitized multi-CLI agent execution traces
 * to `.agents/telemetry/trajectories/<timestamp>_<goalId>_<sessionKey>.json`
 * with cryptographic SHA-256 integrity digests.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { sanitizeTrajectory } from './trajectory-sanitizer.mjs';

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

/**
 * Records a sanitized cognitive trajectory JSON file.
 * @param {object} trajectoryData 
 * @param {string} repoRoot 
 * @returns {Promise<{ trajectoryPath: string, digest: string, timestampStr: string }>}
 */
export async function recordCognitiveTrajectory(trajectoryData, repoRoot = process.cwd()) {
  const timestampStr = formatTimestamp();
  const goalId = trajectoryData.goalId || 'G-UNSCOPED';
  const sessionKey = trajectoryData.sessionKey || Math.random().toString(16).slice(2, 10);

  // 1. Scrub secrets and PII
  const sanitized = sanitizeTrajectory(trajectoryData);

  // 2. Attach metadata
  const payloadToHash = {
    ...sanitized,
    recordedAt: sanitized.recordedAt || new Date().toISOString(),
  };

  // 3. Compute SHA-256 digest of clean JSON structure
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify(payloadToHash))
    .digest('hex');

  const finalRecord = {
    ...payloadToHash,
    digest,
  };

  // 4. Write to .agents/telemetry/trajectories/
  const dir = path.join(repoRoot, '.agents/telemetry/trajectories');
  await fs.mkdir(dir, { recursive: true });

  const filename = `${timestampStr}_${goalId}_${sessionKey}.json`;
  const trajectoryPath = path.join(dir, filename);

  await fs.writeFile(trajectoryPath, JSON.stringify(finalRecord, null, 2), 'utf-8');

  return {
    trajectoryPath,
    digest,
    timestampStr,
  };
}

/**
 * Reads a single cognitive trajectory JSON file from disk.
 * @param {string} filePath 
 * @returns {Promise<object|null>}
 */
export async function readCognitiveTrajectory(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

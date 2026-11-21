/**
 * @file spike-sandbox-driver.mjs
 * @description Autonomous Spike Sandbox Driver.
 * Provisions isolated ephemeral sandboxes under scratch/spike/, validates strict filesystem
 * boundaries, extracts Given-When-Then BDD scenarios, and enforces clean teardown.
 *
 * Epistemic & Invariant Guarantees:
 * - Zero Mocks / Stubs (Article I)
 * - INV-026-001: Sandbox Isolation (mutations strictly in scratch/spike/; bounded TTL)
 * - INV-026-002: Mandatory BDD extraction and zero residual code in src/
 */

import fs from 'node:fs';
import path from 'node:path';

export const SPIKE_STATES = Object.freeze({
  IDLE: 'Idle',
  PROVISIONED: 'ProvisionedSandbox',
  EXPLORING: 'ExploringDataShapes',
  EXTRACTING_BDD: 'ExtractingBDD',
  TEARDOWN_CLEAN: 'TeardownClean',
  COMPLETED_READY_FOR_BDD: 'CompletedReadyForBDD'
});

export const MAX_SPIKE_TTL_MS = 86400000n; // 24 hours in integer ms

const DEFAULT_SCRATCH_ROOT = path.resolve(process.cwd(), 'scratch/spike');

/**
 * Validates that a spike name is safe and does not contain path traversal characters.
 * @param {string} name
 */
function assertSafeName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Spike name must be a non-empty string');
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error(`Path traversal detected: invalid spike name "${name}"`);
  }
}

/**
 * Provision an ephemeral spike sandbox directory with metadata manifest.
 *
 * @param {string} spikeName
 * @param {object} [options={}]
 * @returns {object} Provisioning descriptor
 */
export function provisionSpikeSandbox(spikeName, options = {}) {
  assertSafeName(spikeName);

  const scratchRoot = options.scratchRoot || DEFAULT_SCRATCH_ROOT;
  const rawTtl = options.ttlMs !== undefined ? options.ttlMs : 3600000n;
  const ttlMs = typeof rawTtl === 'bigint' ? rawTtl : BigInt(rawTtl);

  if (ttlMs <= 0n) {
    throw new RangeError(`Invalid TTL: ttlMs must be positive, got ${ttlMs}`);
  }
  if (ttlMs > MAX_SPIKE_TTL_MS) {
    throw new RangeError(`TTL exceeds maximum allowed: ${ttlMs} > ${MAX_SPIKE_TTL_MS}`);
  }

  const spikePath = path.resolve(scratchRoot, spikeName);

  // Guard against path traversal escaping scratchRoot
  if (!spikePath.startsWith(path.resolve(scratchRoot))) {
    throw new Error(`Path traversal detected: "${spikePath}" escapes scratch root`);
  }

  if (!fs.existsSync(spikePath)) {
    fs.mkdirSync(spikePath, { recursive: true });
  }

  const manifest = {
    name: spikeName,
    state: SPIKE_STATES.PROVISIONED,
    createdAt: new Date().toISOString(),
    ttlMs: ttlMs.toString(),
    spikePath
  };

  const manifestPath = path.join(spikePath, 'spike-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return {
    status: 'provisioned',
    state: SPIKE_STATES.PROVISIONED,
    spikeName,
    spikePath,
    manifestPath,
    ttlMs
  };
}

/**
 * Validates that an operation path is strictly confined inside the active spike directory.
 *
 * @param {string} targetPath
 * @param {string} spikePath
 * @returns {boolean} True if strictly isolated
 */
export function validateSandboxIsolation(targetPath, spikePath) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedSpike = path.resolve(spikePath);

  if (!resolvedTarget.startsWith(resolvedSpike)) {
    throw new Error(
      `Isolation violation: Target path "${resolvedTarget}" is outside spike sandbox "${resolvedSpike}"`
    );
  }

  return true;
}

/**
 * Extract BDD Given-When-Then scenarios from an exploratory prototype summary.
 *
 * @param {string} summaryText
 * @param {object} [metadata={}]
 * @returns {object} Extracted BDD structure
 */
export function extractBddFromSpike(summaryText, metadata = {}) {
  if (typeof summaryText !== 'string' || !summaryText.trim()) {
    throw new TypeError('Summary text must be a non-empty string');
  }

  const givenMatch = summaryText.match(/Given\s+([^\n]+)/i);
  const whenMatch = summaryText.match(/When\s+([^\n]+)/i);
  const thenMatch = summaryText.match(/Then\s+([^\n]+)/i);

  if (!givenMatch || !whenMatch || !thenMatch) {
    throw new Error(
      'Spike summary lacks mandatory Given-When-Then BDD components (must specify Given, When, and Then).'
    );
  }

  const featureMatch = summaryText.match(/#\s+(?:Spike Findings:?\s*)?([^\n]+)/i);
  const feature = featureMatch ? featureMatch[1].trim() : (metadata.spikeName || 'Exploratory Feature');

  return {
    valid: true,
    feature,
    scenarios: [
      {
        given: givenMatch[1].trim(),
        when: whenMatch[1].trim(),
        then: thenMatch[1].trim()
      }
    ],
    extractedAt: new Date().toISOString()
  };
}

/**
 * Teardown and delete an ephemeral spike sandbox directory cleanly.
 *
 * @param {string} targetSpikePath
 * @param {string} [allowedScratchRoot]
 * @returns {object} Teardown result
 */
export function teardownSpikeSandbox(targetSpikePath, allowedScratchRoot) {
  const resolvedTarget = path.resolve(targetSpikePath);
  const root = path.resolve(allowedScratchRoot || process.cwd(), 'scratch');

  // Strict guard: ensure teardown target is actually inside a scratch directory
  if (!resolvedTarget.startsWith(root) || resolvedTarget === root) {
    throw new Error(`Teardown target is outside scratch root: ${resolvedTarget}`);
  }

  if (fs.existsSync(resolvedTarget)) {
    fs.rmSync(resolvedTarget, { recursive: true, force: true });
  }

  return {
    status: 'torn_down',
    state: SPIKE_STATES.TEARDOWN_CLEAN,
    deletedPath: resolvedTarget
  };
}

/**
 * FSM State Transition for Spike Sandboxes.
 *
 * @param {string} currentState
 * @param {object} eventPayload
 * @returns {object} New state descriptor
 */
export function transitionSpikeState(currentState, eventPayload = {}) {
  const { event } = eventPayload;

  switch (currentState) {
    case SPIKE_STATES.IDLE:
      if (event === 'INITIALIZE_SPIKE') {
        return { state: SPIKE_STATES.PROVISIONED, context: eventPayload };
      }
      break;

    case SPIKE_STATES.PROVISIONED:
      if (event === 'START_EXPERIMENT') {
        return { state: SPIKE_STATES.EXPLORING, context: eventPayload };
      }
      break;

    case SPIKE_STATES.EXPLORING:
      if (event === 'EXTRACT_BDD') {
        return { state: SPIKE_STATES.EXTRACTING_BDD, context: eventPayload };
      }
      break;

    case SPIKE_STATES.EXTRACTING_BDD:
      if (event === 'TEARDOWN_CLEAN') {
        return { state: SPIKE_STATES.TEARDOWN_CLEAN, context: eventPayload };
      }
      break;

    case SPIKE_STATES.TEARDOWN_CLEAN:
      if (event === 'VERIFY_CLEAN_TREE') {
        return { state: SPIKE_STATES.COMPLETED_READY_FOR_BDD, context: eventPayload };
      }
      break;

    default:
      break;
  }

  throw new Error(`Invalid state transition: No path from ${currentState} with event ${event}`);
}

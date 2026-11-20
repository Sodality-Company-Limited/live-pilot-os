/**
 * Session Checkpoint Driver
 * 
 * Provides durable agent state serialization, cryptographic SHA-256 state hashing,
 * atomic file writes, quarantine handling, and monotonic step progression for
 * resilient session interruption recovery in Soda OS.
 * 
 * Implements G-CORE-027 invariants:
 * - INV-027-001: Session checkpoints emit valid SHA-256 digests and fail closed upon state corruption.
 * - INV-027-002: Resumption strictly preserves or advances the step pointer without cyclic regressions.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * FSM States for Checkpoint Lifecycle
 */
export const CHECKPOINT_FSM_STATES = Object.freeze({
  ActiveSession: 'ActiveSession',
  SerializingState: 'SerializingState',
  CheckpointSaved: 'CheckpointSaved',
  ValidatingIntegrity: 'ValidatingIntegrity',
  HydratingSession: 'HydratingSession',
  ResumedActive: 'ResumedActive',
});

/**
 * Allowed transitions between FSM states
 */
const ALLOWED_FSM_TRANSITIONS = new Map([
  [CHECKPOINT_FSM_STATES.ActiveSession, new Set([CHECKPOINT_FSM_STATES.SerializingState])],
  [CHECKPOINT_FSM_STATES.SerializingState, new Set([CHECKPOINT_FSM_STATES.CheckpointSaved])],
  [CHECKPOINT_FSM_STATES.CheckpointSaved, new Set([CHECKPOINT_FSM_STATES.ValidatingIntegrity])],
  [CHECKPOINT_FSM_STATES.ValidatingIntegrity, new Set([CHECKPOINT_FSM_STATES.HydratingSession])],
  [CHECKPOINT_FSM_STATES.HydratingSession, new Set([CHECKPOINT_FSM_STATES.ResumedActive])],
  [CHECKPOINT_FSM_STATES.ResumedActive, new Set([CHECKPOINT_FSM_STATES.SerializingState])],
]);

/**
 * Transition FSM state with fail-closed validation
 * 
 * @param {string} fromState Current state
 * @param {string} toState Target state
 * @returns {string} New state
 */
export function transitionCheckpointState(fromState, toState) {
  const allowed = ALLOWED_FSM_TRANSITIONS.get(fromState);
  if (!allowed || !allowed.has(toState)) {
    throw new Error(
      `Illegal FSM state transition: Cannot transition from '${fromState}' to '${toState}'. Allowed: [${allowed ? Array.from(allowed).join(', ') : 'none'}]`
    );
  }
  return toState;
}

/**
 * Canonical JSON stringifier supporting BigInt integer micro-units
 * 
 * @param {*} val Any serializable value
 * @returns {string} Deterministic JSON string
 */
function canonicalStringify(val) {
  return JSON.stringify(val, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  });
}

/**
 * Compute SHA-256 state digest
 * 
 * @param {object} state Object representing session state
 * @returns {string} 64-char hex SHA-256 digest
 */
export function computeStateDigest(state) {
  const serialized = canonicalStringify(state);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/**
 * Serialize session checkpoint to file atomically via temporary swap file
 * 
 * @param {object} params
 * @param {string} params.targetFile Target checkpoint file path
 * @param {object} params.sessionState Session state data
 * @returns {object} Result object with success, sha256, targetFile
 */
export function serializeSessionCheckpoint({ targetFile, sessionState }) {
  if (!targetFile || typeof targetFile !== 'string') {
    throw new Error('Invalid targetFile provided for session checkpoint');
  }
  if (!sessionState || typeof sessionState !== 'object') {
    throw new Error('Invalid sessionState object provided for session checkpoint');
  }

  const sha256 = computeStateDigest(sessionState);
  const payload = {
    version: 1,
    timestamp_iso: new Date().toISOString(),
    state: sessionState,
    sha256,
  };

  const payloadJson = JSON.stringify(payload, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  }, 2);

  const dir = path.dirname(targetFile);
  fs.mkdirSync(dir, { recursive: true });

  const tempFile = `${targetFile}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempFile, payloadJson, 'utf8');
  fs.renameSync(tempFile, targetFile);

  return {
    success: true,
    targetFile,
    sha256,
  };
}

/**
 * Deserialize session checkpoint from file with cryptographic integrity validation
 * 
 * @param {string} checkpointPath File path to checkpoint
 * @param {object} [options]
 * @param {number} [options.currentStep] Current step index if checking for monotonicity
 * @param {boolean} [options.enforceMonotonic] Whether to enforce monotonic step check
 * @returns {object} Deserialized checkpoint
 */
export function deserializeSessionCheckpoint(checkpointPath, options = {}) {
  if (!fs.existsSync(checkpointPath)) {
    throw new Error(`Checkpoint file does not exist: ${checkpointPath}`);
  }

  let rawContent = '';
  try {
    rawContent = fs.readFileSync(checkpointPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read checkpoint file: ${err.message}`);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawContent, (key, value) => {
      if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    });
  } catch (err) {
    throw new Error(`Invalid checkpoint payload: Malformed JSON (${err.message})`);
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.state || !parsed.sha256) {
    throw new Error('Invalid checkpoint payload: Missing required fields (state, sha256)');
  }

  const expectedDigest = computeStateDigest(parsed.state);
  if (parsed.sha256 !== expectedDigest) {
    throw new Error(
      `Checkpoint integrity violation: SHA-256 digest mismatch. Claimed: ${parsed.sha256}, Computed: ${expectedDigest}`
    );
  }

  if (options.enforceMonotonic && typeof options.currentStep === 'number') {
    const checkpointStep = parsed.state.stepIndex ?? 0;
    if (checkpointStep < options.currentStep) {
      throw new Error(
        `Monotonic step regression detected: Checkpoint step (${checkpointStep}) is behind current active step (${options.currentStep}). Resumption rejected.`
      );
    }
  }

  return {
    success: true,
    version: parsed.version,
    timestamp_iso: parsed.timestamp_iso,
    state: parsed.state,
    sha256: parsed.sha256,
  };
}

/**
 * Quarantine corrupted checkpoint file to .corrupt.<timestamp>.json
 * 
 * @param {string} checkpointPath Path to corrupt checkpoint
 * @returns {object} Result with success, quarantinePath
 */
export function quarantineCorruptCheckpoint(checkpointPath) {
  if (!fs.existsSync(checkpointPath)) {
    throw new Error(`Cannot quarantine non-existent checkpoint: ${checkpointPath}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const quarantinePath = `${checkpointPath}.corrupt.${timestamp}.json`;

  fs.renameSync(checkpointPath, quarantinePath);

  return {
    success: true,
    originalPath: checkpointPath,
    quarantinePath,
  };
}

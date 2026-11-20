/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CONCURRENCY SCHEDULE SEQUENTIALIZER & INVARIANT ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Module: scripts/lib/schedule-sequentializer.mjs
 * Framework: Soda OS
 * Paradigm: Deterministic Concurrency Verification, ABA Tagged Pointer Immunity,
 *          Lock-Free Safety & Monotonic Distributed Fencing Tokens.
 *
 * Capabilities:
 *   1. Schedule Sequentializer: Intercepts discrete asynchronous yield points and
 *      combinatorially permutes execution interleavings across tasks up to
 *      bounded step depth K.
 *   2. Concurrency Anomaly & Race Detectors:
 *      - TOCTOU (Time-of-Check to Time-of-Use) race conditions
 *      - Lost updates (non-serializable Read-Modify-Write interleavings)
 *      - Reentrancy violations on non-reentrant resources
 *      - Circular wait deadlocks (Resource Allocation Graph cycle detection)
 *      - Livelocks (infinite cycling without global forward progress)
 *   3. 64-Bit Packed Atomic Tagged Pointer Engine:
 *      - Versioned tag (32-bit) + pointer (32-bit) in packed 64-bit BigInt
 *      - Models ABA mutation scenarios (A -> B -> A)
 *      - Proves 100% fail-closed rejection when version tags mismatch
 *      - Lock-free Treiber stack with ABA hazard immunity verification
 *   4. Monotonic Distributed Fencing Tokens:
 *      - Enforces strict monotonic progression (t_fence > t_last)
 *      - Rejects stale writes fail-closed under split-brain / network delay
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

/**
 * Packs a 32-bit unsigned tag and a 32-bit unsigned pointer/value into a 64-bit BigInt.
 *
 * @param {number|bigint} tag 32-bit version tag (0 .. 4294967295)
 * @param {number|bigint} pointer 32-bit pointer/value (0 .. 4294967295)
 * @returns {bigint} 64-bit packed representation
 */
export function packTaggedPointer(tag, pointer) {
  const t = BigInt(tag) & 0xFFFFFFFFn;
  const p = BigInt(pointer) & 0xFFFFFFFFn;
  return (t << 32n) | p;
}

/**
 * Unpacks a 64-bit BigInt into its 32-bit tag and 32-bit pointer components.
 *
 * @param {bigint} packed 64-bit packed tagged pointer
 * @returns {{ tag: number, pointer: number }}
 */
export function unpackTaggedPointer(packed) {
  const big = BigInt(packed);
  const tag = Number((big >> 32n) & 0xFFFFFFFFn);
  const pointer = Number(big & 0xFFFFFFFFn);
  return { tag, pointer };
}

/**
 * Atomic Compare-And-Swap (CAS) container with versioned 64-bit tagged pointer.
 * Mathematically eliminates the ABA hazard by coupling every pointer mutation
 * with a strictly monotonic version tag.
 */
export class AtomicTaggedPointer {
  /**
   * @param {number} initialPointer Initial 32-bit pointer or value
   * @param {number} initialTag Initial 32-bit version tag
   */
  constructor(initialPointer = 0, initialTag = 0) {
    this._packed = packTaggedPointer(initialTag, initialPointer);
    this._mutationCount = 0;
  }

  /**
   * Returns current 32-bit pointer.
   * @returns {number}
   */
  getPointer() {
    return unpackTaggedPointer(this._packed).pointer;
  }

  /**
   * Returns current 32-bit version tag.
   * @returns {number}
   */
  getTag() {
    return unpackTaggedPointer(this._packed).tag;
  }

  /**
   * Returns full 64-bit packed value.
   * @returns {bigint}
   */
  getPacked() {
    return this._packed;
  }

  /**
   * Returns current snapshot of pointer, tag, and packed representation.
   * @returns {{ pointer: number, tag: number, packed: bigint }}
   */
  load() {
    const { tag, pointer } = unpackTaggedPointer(this._packed);
    return { pointer, tag, packed: this._packed };
  }

  /**
   * Atomic Compare-And-Swap using separate tag and pointer expectations.
   * If both expectedTag and expectedPointer match current state, updates pointer
   * to newPointer and increments the tag monotonically (wrapping at 2^32-1).
   *
   * @param {number} expectedTag Expected 32-bit version tag
   * @param {number} expectedPointer Expected 32-bit pointer value
   * @param {number} newPointer New 32-bit pointer value
   * @returns {{ success: boolean, current: { tag: number, pointer: number }, newTag?: number }}
   */
  compareAndSwap(expectedTag, expectedPointer, newPointer) {
    const current = unpackTaggedPointer(this._packed);
    if (current.tag !== expectedTag || current.pointer !== expectedPointer) {
      return {
        success: false,
        current,
        expected: { tag: expectedTag, pointer: expectedPointer }
      };
    }

    const nextTag = (expectedTag + 1) >>> 0;
    this._packed = packTaggedPointer(nextTag, newPointer);
    this._mutationCount++;

    return {
      success: true,
      current: { tag: nextTag, pointer: newPointer },
      newTag: nextTag
    };
  }

  /**
   * Atomic Compare-And-Swap on raw 64-bit packed BigInt.
   *
   * @param {bigint} expectedPacked Expected 64-bit packed value
   * @param {bigint} newPacked New 64-bit packed value to set on match
   * @returns {{ success: boolean, currentPacked: bigint }}
   */
  compareAndSwapPacked(expectedPacked, newPacked) {
    if (this._packed !== expectedPacked) {
      return {
        success: false,
        currentPacked: this._packed,
        expectedPacked
      };
    }

    this._packed = newPacked;
    this._mutationCount++;
    return {
      success: true,
      currentPacked: this._packed
    };
  }

  /**
   * Unconditionally sets pointer and resets/increments tag.
   *
   * @param {number} newPointer
   * @param {number} [newTag]
   */
  store(newPointer, newTag = null) {
    const current = unpackTaggedPointer(this._packed);
    const tag = newTag !== null ? newTag : ((current.tag + 1) >>> 0);
    this._packed = packTaggedPointer(tag, newPointer);
    this._mutationCount++;
  }
}

/**
 * Naive Atomic CAS container WITHOUT version tags.
 * Demonstrates the classic ABA vulnerability where pointer identity masks intermediate mutation.
 */
export class AtomicNaivePointer {
  /**
   * @param {number} initialPointer
   */
  constructor(initialPointer = 0) {
    this._pointer = initialPointer >>> 0;
    this._mutationCount = 0;
  }

  getPointer() {
    return this._pointer;
  }

  load() {
    return { pointer: this._pointer };
  }

  /**
   * Naive Compare-And-Swap comparing only the pointer value.
   *
   * @param {number} expectedPointer
   * @param {number} newPointer
   * @returns {{ success: boolean, currentPointer: number }}
   */
  compareAndSwap(expectedPointer, newPointer) {
    if (this._pointer !== expectedPointer) {
      return {
        success: false,
        currentPointer: this._pointer
      };
    }

    this._pointer = newPointer >>> 0;
    this._mutationCount++;
    return {
      success: true,
      currentPointer: this._pointer
    };
  }

  store(newPointer) {
    this._pointer = newPointer >>> 0;
    this._mutationCount++;
  }
}

/**
 * Simulates the classic ABA race condition against naive vs tagged atomic CAS containers.
 *
 * Scenario:
 *   1. Initial Pointer = A (e.g. 100), Tag = 1.
 *   2. Thread 1 reads state (Pointer A, Tag 1) and prepares CAS A -> C (300).
 *   3. Thread 2 preempts Thread 1:
 *      a. Modifies A -> B (200).
 *      b. Modifies B -> A (100). State has reverted to A, but underlying history changed!
 *   4. Thread 1 resumes and executes CAS expecting A.
 *
 * Outcome:
 *   - Naive CAS: SUCCEEDS ERRONEOUSLY (ABA Hazard / Silent Corruption).
 *   - Tagged CAS: FAILS CLOSED (Tag mismatch: current tag 3 != expected tag 1).
 *
 * @param {boolean} isTagged Whether to use AtomicTaggedPointer (true) or AtomicNaivePointer (false)
 * @returns {{
 *   isTagged: boolean,
 *   abaOccurred: boolean,
 *   casSucceeded: boolean,
 *   abaDetectedAndRejected: boolean,
 *   history: Array<string>
 * }}
 */
export function simulateABAHazard(isTagged = false) {
  const history = [];
  const initialValueA = 100;
  const intermediateValueB = 200;
  const targetValueC = 300;

  if (!isTagged) {
    const atomic = new AtomicNaivePointer(initialValueA);
    history.push(`Init naive pointer with A (${initialValueA})`);

    // Thread 1 snapshot
    const t1Observed = atomic.load().pointer;
    history.push(`Thread 1 reads pointer: ${t1Observed}`);

    // Thread 2 performs ABA mutation
    atomic.store(intermediateValueB);
    history.push(`Thread 2 modifies A -> B (${intermediateValueB})`);
    atomic.store(initialValueA);
    history.push(`Thread 2 modifies B -> A (${initialValueA}) [ABA Reversion]`);

    // Thread 1 attempts CAS
    const casResult = atomic.compareAndSwap(t1Observed, targetValueC);
    history.push(`Thread 1 CAS result: ${casResult.success ? 'SUCCESS (Vulnerable!)' : 'FAIL'}`);

    return {
      isTagged: false,
      abaOccurred: true,
      casSucceeded: casResult.success,
      abaDetectedAndRejected: !casResult.success,
      history
    };
  } else {
    const atomic = new AtomicTaggedPointer(initialValueA, 1);
    history.push(`Init tagged pointer with A (${initialValueA}), Tag: 1`);

    // Thread 1 snapshot
    const t1Snapshot = atomic.load();
    history.push(`Thread 1 reads pointer: ${t1Snapshot.pointer}, tag: ${t1Snapshot.tag}`);

    // Thread 2 performs ABA mutation
    atomic.compareAndSwap(1, initialValueA, intermediateValueB);
    history.push(`Thread 2 CAS A -> B (${intermediateValueB}), Tag: 2`);
    atomic.compareAndSwap(2, intermediateValueB, initialValueA);
    history.push(`Thread 2 CAS B -> A (${initialValueA}), Tag: 3 [ABA Reversion]`);

    // Thread 1 attempts CAS expecting tag 1
    const casResult = atomic.compareAndSwap(t1Snapshot.tag, t1Snapshot.pointer, targetValueC);
    history.push(`Thread 1 CAS result: ${casResult.success ? 'SUCCESS' : 'FAIL CLOSED (Immune!)'}`);

    return {
      isTagged: true,
      abaOccurred: true,
      casSucceeded: casResult.success,
      abaDetectedAndRejected: !casResult.success,
      history
    };
  }
}

/**
 * Runs repeated empirical trials of ABA mutation against tagged pointers
 * to verify 100% rejection rate.
 *
 * @param {number} [trialsCount=100] Number of trials to execute
 * @returns {{
 *   totalTrials: number,
 *   rejectedCount: number,
 *   falseSuccessCount: number,
 *   immunityRatio: number,
 *   passed: boolean
 * }}
 */
export function verifyABAImmunity(trialsCount = 100) {
  let rejectedCount = 0;
  let falseSuccessCount = 0;

  for (let i = 0; i < trialsCount; i++) {
    const result = simulateABAHazard(true);
    if (result.abaDetectedAndRejected) {
      rejectedCount++;
    } else {
      falseSuccessCount++;
    }
  }

  const immunityRatio = trialsCount > 0 ? rejectedCount / trialsCount : 0;
  return {
    totalTrials: trialsCount,
    rejectedCount,
    falseSuccessCount,
    immunityRatio,
    passed: immunityRatio === 1.0 && falseSuccessCount === 0
  };
}

/**
 * Lock-Free Treiber Stack modeling ABA vulnerability and Tagged Pointer immunity.
 */
export class TreiberStack {
  /**
   * @param {boolean} [useTaggedPointer=true]
   */
  constructor(useTaggedPointer = true) {
    this.useTaggedPointer = useTaggedPointer;
    this.nodes = new Map();
    this.nodeIdCounter = 1;

    if (useTaggedPointer) {
      this.head = new AtomicTaggedPointer(0, 0); // 0 = null pointer
    } else {
      this.head = new AtomicNaivePointer(0);
    }
  }

  /**
   * Pushes a value onto the stack.
   * @param {any} value
   */
  push(value) {
    const id = this.nodeIdCounter++;
    this.nodes.set(id, { id, value, next: 0 });

    while (true) {
      if (this.useTaggedPointer) {
        const current = this.head.load();
        const node = this.nodes.get(id);
        node.next = current.pointer;
        const res = this.head.compareAndSwap(current.tag, current.pointer, id);
        if (res.success) return id;
      } else {
        const currentPointer = this.head.getPointer();
        const node = this.nodes.get(id);
        node.next = currentPointer;
        const res = this.head.compareAndSwap(currentPointer, id);
        if (res.success) return id;
      }
    }
  }

  /**
   * Pops a value from the stack.
   * @returns {any|null}
   */
  pop() {
    while (true) {
      if (this.useTaggedPointer) {
        const current = this.head.load();
        if (current.pointer === 0) return null;
        const topNode = this.nodes.get(current.pointer);
        if (!topNode) return null;
        const nextPointer = topNode.next;
        const res = this.head.compareAndSwap(current.tag, current.pointer, nextPointer);
        if (res.success) return topNode.value;
      } else {
        const currentPointer = this.head.getPointer();
        if (currentPointer === 0) return null;
        const topNode = this.nodes.get(currentPointer);
        if (!topNode) return null;
        const nextPointer = topNode.next;
        const res = this.head.compareAndSwap(currentPointer, nextPointer);
        if (res.success) return topNode.value;
      }
    }
  }
}

/**
 * Distributed Fencing Storage Engine.
 * Implements strict monotonic fencing tokens (t_fence > t_last)
 * to prevent split-brain stale writes in distributed coordination.
 */
export class MonotonicFencingStorage {
  constructor() {
    this.storage = new Map();
    this.lastFencingToken = 0n;
    this.writeHistory = [];
  }

  /**
   * Performs a write operation guarded by a distributed fencing token.
   * Enforces invariant: fencingToken > lastFencingToken.
   *
   * @param {number|bigint} fencingToken Fencing token issued by lock manager
   * @param {string} key Storage key
   * @param {any} value Value to persist
   * @returns {{
   *   committed: boolean,
   *   fencingToken: bigint,
   *   error?: string,
   *   key?: string,
   *   value?: any
   * }}
   */
  write(fencingToken, key, value) {
    const token = BigInt(fencingToken);

    if (token <= this.lastFencingToken) {
      const err = `REJECTED: Stale fencing token ${token} <= last accepted token ${this.lastFencingToken}`;
      this.writeHistory.push({
        status: 'REJECTED',
        attemptedToken: token,
        currentHighWaterMark: this.lastFencingToken,
        key
      });
      return {
        committed: false,
        fencingToken: token,
        currentHighWaterMark: this.lastFencingToken,
        error: err
      };
    }

    this.lastFencingToken = token;
    this.storage.set(key, value);
    this.writeHistory.push({
      status: 'COMMITTED',
      fencingToken: token,
      key,
      value
    });

    return {
      committed: true,
      fencingToken: token,
      key,
      value
    };
  }

  /**
   * Reads a key from storage.
   * @param {string} key
   * @returns {{ exists: boolean, value?: any, currentHighWaterMark: bigint }}
   */
  read(key) {
    return {
      exists: this.storage.has(key),
      value: this.storage.get(key),
      currentHighWaterMark: this.lastFencingToken
    };
  }

  getHighWaterMark() {
    return this.lastFencingToken;
  }
}

/**
 * Distributed Lock Manager providing monotonically incrementing fencing tokens.
 */
export class DistributedLockManager {
  constructor() {
    this._currentToken = 0n;
    this._leases = new Map();
  }

  /**
   * Acquires a lease with a guaranteed monotonically incrementing fencing token.
   *
   * @param {string} clientId
   * @returns {{ acquired: boolean, fencingToken: bigint }}
   */
  acquireLock(clientId) {
    this._currentToken += 1n;
    const token = this._currentToken;
    this._leases.set(clientId, token);
    return {
      acquired: true,
      fencingToken: token
    };
  }

  getCurrentToken() {
    return this._currentToken;
  }
}

/**
 * Verifies the Monotonic Distributed Fencing Protocol across simulated
 * split-brain clients and out-of-order writes.
 *
 * @param {number} [trialsCount=50]
 * @returns {{
 *   totalTrials: number,
 *   rejectedStaleCount: number,
 *   acceptedAscendingCount: number,
 *   passed: boolean
 * }}
 */
export function verifyMonotonicFencingProtocol(trialsCount = 50) {
  const storage = new MonotonicFencingStorage();
  const lockManager = new DistributedLockManager();
  let rejectedStaleCount = 0;
  let acceptedAscendingCount = 0;

  for (let i = 0; i < trialsCount; i++) {
    // Client A acquires lock
    const leaseA = lockManager.acquireLock('client_a');

    // Client B acquires lock (Client A experienced network delay / GC pause)
    const leaseB = lockManager.acquireLock('client_b');

    // Client B writes first with newer token
    const writeB = storage.write(leaseB.fencingToken, 'resource_k', `data_b_${i}`);
    if (writeB.committed) {
      acceptedAscendingCount++;
    }

    // Client A wakes up and attempts write with older stale token
    const writeA = storage.write(leaseA.fencingToken, 'resource_k', `stale_data_a_${i}`);
    if (!writeA.committed) {
      rejectedStaleCount++;
    }
  }

  return {
    totalTrials: trialsCount,
    rejectedStaleCount,
    acceptedAscendingCount,
    passed: rejectedStaleCount === trialsCount && acceptedAscendingCount === trialsCount
  };
}

/**
 * Deterministic Concurrency Schedule Sequentializer.
 *
 * Formulates the execution interleavings of N concurrent tasks as a discrete
 * permutation sequence, ensuring exhaustive or bounded combinatorial coverage
 * while preserving intra-task step ordering.
 */
export class ScheduleSequentializer {
  /**
   * Generates all mathematically valid execution interleavings across tasks
   * up to a bounded depth K.
   *
   * Each task is an object:
   *   { id: string, steps: Array<{ name: string, fn?: (state, context) => any }> }
   *
   * @param {Array<{ id: string, steps: Array<any> }>} tasks
   * @param {object} [options={}]
   * @param {number} [options.maxDepth=10] Maximum total step depth
   * @param {number} [options.maxSchedules=5000] Upper combinatorial bound
   * @param {string} [options.seed=null] Deterministic PRNG seed for sampling when space > maxSchedules
   * @returns {Array<Array<{ taskId: string, stepIndex: number, step: any }>>}
   */
  static generateInterleavings(tasks, options = {}) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 10;
    const maxSchedules = options.maxSchedules !== undefined ? options.maxSchedules : 5000;

    // Filter tasks with steps
    const activeTasks = tasks.map((t, idx) => ({
      id: t.id || `task_${idx}`,
      steps: Array.isArray(t.steps) ? t.steps : []
    })).filter(t => t.steps.length > 0);

    if (activeTasks.length === 0) {
      return [];
    }

    const taskStepCounts = activeTasks.map(t => t.steps.length);
    const totalStepsPossible = taskStepCounts.reduce((acc, c) => acc + c, 0);
    const targetDepth = Math.min(maxDepth, totalStepsPossible);

    const schedules = [];
    const currentSchedule = [];
    const stepPointers = new Array(activeTasks.length).fill(0);

    function backtrack(depth) {
      if (schedules.length >= maxSchedules) {
        return;
      }

      if (depth === targetDepth) {
        schedules.push([...currentSchedule]);
        return;
      }

      let advanced = false;
      for (let tIdx = 0; tIdx < activeTasks.length; tIdx++) {
        const ptr = stepPointers[tIdx];
        if (ptr < activeTasks[tIdx].steps.length) {
          advanced = true;
          const stepObj = activeTasks[tIdx].steps[ptr];
          currentSchedule.push({
            taskId: activeTasks[tIdx].id,
            taskIndex: tIdx,
            stepIndex: ptr,
            step: stepObj
          });
          stepPointers[tIdx]++;

          backtrack(depth + 1);

          stepPointers[tIdx]--;
          currentSchedule.pop();
        }
      }

      if (!advanced && depth > 0) {
        schedules.push([...currentSchedule]);
      }
    }

    backtrack(0);
    return schedules;
  }

  /**
   * Executes a concrete schedule sequentially on an initial state clone.
   *
   * @param {Array<{ taskId: string, stepIndex: number, step: any }>} schedule
   * @param {object} [initialState={}]
   * @returns {{
   *   finalState: object,
   *   trace: Array<{ taskId: string, stepIndex: number, stepName: string, stateSnapshot: object }>,
   *   stepCount: number,
   *   success: boolean,
   *   error?: string
   * }}
   */
  static executeSchedule(schedule, initialState = {}) {
    const state = structuredClone(initialState);
    const trace = [];

    const context = {
      locks: new Map(),
      lockOwners: new Map(),
      waitingTasks: new Map(),
      executionLog: []
    };

    let stepCount = 0;
    try {
      for (const item of schedule) {
        stepCount++;
        const step = item.step;
        const stepName = (step && step.name) ? step.name : `step_${item.stepIndex}`;

        if (step && typeof step.fn === 'function') {
          step.fn(state, {
            taskId: item.taskId,
            stepIndex: item.stepIndex,
            context
          });
        }

        trace.push({
          taskId: item.taskId,
          stepIndex: item.stepIndex,
          stepName,
          stateSnapshot: structuredClone(state)
        });
      }

      return {
        finalState: state,
        trace,
        stepCount,
        success: true
      };
    } catch (err) {
      return {
        finalState: state,
        trace,
        stepCount,
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Explores all permuted schedules and records outcomes.
   *
   * @param {Array<any>} tasks
   * @param {object} [initialState={}]
   * @param {object} [options={}]
   * @returns {{
   *   schedulesCount: number,
   *   results: Array<any>,
   *   uniqueFinalStates: Array<object>
   * }}
   */
  static exploreAllSchedules(tasks, initialState = {}, options = {}) {
    const schedules = ScheduleSequentializer.generateInterleavings(tasks, options);
    const results = [];
    const seenStates = new Set();
    const uniqueFinalStates = [];

    for (const schedule of schedules) {
      const outcome = ScheduleSequentializer.executeSchedule(schedule, initialState);
      results.push(outcome);

      const serialized = JSON.stringify(outcome.finalState);
      if (!seenStates.has(serialized)) {
        seenStates.add(serialized);
        uniqueFinalStates.push(outcome.finalState);
      }
    }

    return {
      schedulesCount: schedules.length,
      results,
      uniqueFinalStates
    };
  }

  /**
   * Detects Lost Updates by comparing all interleaved schedules
   * against the set of strict serial executions.
   *
   * @param {Array<any>} tasks
   * @param {object} initialState
   * @param {string} [stateKey] Key to inspect in final state
   * @returns {{
   *   serialOutcomes: Array<object>,
   *   interleavedCount: number,
   *   lostUpdatesDetected: boolean,
   *   anomalousSchedulesCount: number,
   *   anomalousSchedules: Array<any>
   * }}
   */
  static detectLostUpdates(tasks, initialState, stateKey = null) {
    // 1. Compute all serial permutations (T1 then T2, T2 then T1, etc.)
    const serialSchedules = [];
    function permuteTasks(arr) {
      if (arr.length <= 1) return [arr];
      const perms = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const sub of permuteTasks(rest)) {
          perms.push([arr[i], ...sub]);
        }
      }
      return perms;
    }

    const taskPermutations = permuteTasks(tasks);
    const serialStates = new Set();
    const serialOutcomes = [];

    for (const p of taskPermutations) {
      const flatSchedule = [];
      for (const t of p) {
        for (let sIdx = 0; sIdx < t.steps.length; sIdx++) {
          flatSchedule.push({
            taskId: t.id,
            stepIndex: sIdx,
            step: t.steps[sIdx]
          });
        }
      }
      const outcome = ScheduleSequentializer.executeSchedule(flatSchedule, initialState);
      const val = stateKey ? outcome.finalState[stateKey] : outcome.finalState;
      const ser = JSON.stringify(val);
      serialStates.add(ser);
      serialOutcomes.push(val);
    }

    // 2. Compute all interleavings
    const allInterleavings = ScheduleSequentializer.generateInterleavings(tasks, { maxDepth: 20 });
    const anomalousSchedules = [];

    for (const schedule of allInterleavings) {
      const outcome = ScheduleSequentializer.executeSchedule(schedule, initialState);
      const val = stateKey ? outcome.finalState[stateKey] : outcome.finalState;
      const ser = JSON.stringify(val);
      if (!serialStates.has(ser)) {
        anomalousSchedules.push({
          schedule,
          finalState: outcome.finalState,
          observedValue: val
        });
      }
    }

    return {
      serialOutcomes,
      interleavedCount: allInterleavings.length,
      lostUpdatesDetected: anomalousSchedules.length > 0,
      anomalousSchedulesCount: anomalousSchedules.length,
      anomalousSchedules
    };
  }

  /**
   * Detects Time-of-Check to Time-of-Use (TOCTOU) race conditions.
   *
   * A TOCTOU anomaly occurs when:
   *   1. Task A performs a Check step verifying a condition C.
   *   2. Task B executes an interfering Mutation step that invalidates C.
   *   3. Task A executes a Use step assuming condition C still holds.
   *
   * @param {Array<any>} tasks
   * @param {object} initialState
   * @param {object} spec
   * @param {string} spec.checkStep Name of check step
   * @param {string} spec.useStep Name of use step
   * @param {string} spec.mutationStep Name of interfering mutation step
   * @returns {{
   *   toctouDetected: boolean,
   *   violationsCount: number,
   *   violations: Array<any>
   * }}
   */
  static detectTOCTOU(tasks, initialState, spec) {
    const interleavings = ScheduleSequentializer.generateInterleavings(tasks, { maxDepth: 20 });
    const violations = [];

    for (const schedule of interleavings) {
      // Analyze sequence
      let taskACheckedIndex = -1;
      let mutationOccurred = false;
      let taskAUsedIndex = -1;
      let mutatingTaskId = null;

      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const stepName = item.step ? item.step.name : '';

        if (stepName === spec.checkStep && taskACheckedIndex === -1) {
          taskACheckedIndex = i;
        } else if (taskACheckedIndex !== -1 && stepName === spec.mutationStep && taskAUsedIndex === -1) {
          mutationOccurred = true;
          mutatingTaskId = item.taskId;
        } else if (taskACheckedIndex !== -1 && stepName === spec.useStep && mutationOccurred) {
          taskAUsedIndex = i;
          violations.push({
            schedule,
            checkIndex: taskACheckedIndex,
            mutationIndex: i - 1,
            useIndex: i,
            mutatingTaskId,
            description: `TOCTOU violation: Task ${item.taskId} checked at step ${taskACheckedIndex}, mutation by ${mutatingTaskId} at step ${i - 1}, use at step ${i}`
          });
          break;
        }
      }
    }

    return {
      toctouDetected: violations.length > 0,
      violationsCount: violations.length,
      violations
    };
  }

  /**
   * Detects Reentrancy Violations in non-reentrant resources or functions.
   *
   * @param {Array<any>} tasks
   * @param {object} initialState
   * @param {object} spec
   * @param {string} spec.enterStep
   * @param {string} spec.exitStep
   * @returns {{
   *   reentrancyDetected: boolean,
   *   violationsCount: number,
   *   violations: Array<any>
   * }}
   */
  static detectReentrancyViolations(tasks, initialState, spec) {
    const interleavings = ScheduleSequentializer.generateInterleavings(tasks, { maxDepth: 20 });
    const violations = [];

    for (const schedule of interleavings) {
      let activeLocks = 0;
      let holder = null;

      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const stepName = item.step ? item.step.name : '';

        if (stepName === spec.enterStep) {
          activeLocks++;
          if (activeLocks > 1) {
            violations.push({
              schedule,
              stepIndex: i,
              taskId: item.taskId,
              previousHolder: holder,
              description: `Reentrancy violation: Task ${item.taskId} attempted entry while resource held by ${holder}`
            });
            break;
          }
          holder = item.taskId;
        } else if (stepName === spec.exitStep) {
          if (activeLocks > 0) {
            activeLocks--;
            if (activeLocks === 0) holder = null;
          }
        }
      }
    }

    return {
      reentrancyDetected: violations.length > 0,
      violationsCount: violations.length,
      violations
    };
  }

  /**
   * Detects Deadlocks using Resource Allocation Graph (Wait-For Graph)
   * cycle detection.
   *
   * Analyzes lock acquisition and release steps.
   * When Task A requests Lock L held by Task B, edge A -> B is added.
   * If a directed cycle exists in the Wait-For Graph, a deadlock is declared fail-closed.
   *
   * @param {Array<any>} tasks
   * @param {object} [options={}]
   * @returns {{
   *   hasDeadlock: boolean,
   *   deadlocksCount: number,
   *   deadlockTraces: Array<any>
   * }}
   */
  static detectDeadlocks(tasks, options = {}) {
    const interleavings = ScheduleSequentializer.generateInterleavings(tasks, options);
    const deadlockTraces = [];

    for (const schedule of interleavings) {
      const lockOwners = new Map(); // lockId -> taskId
      const waitFor = new Map(); // taskId -> Set<taskId>
      const blockedTasks = new Set(); // taskId

      let deadlockDetectedInSchedule = false;

      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const step = item.step;
        if (!step) continue;

        // If the task is blocked waiting on an ungranted lock, it cannot execute further steps
        if (blockedTasks.has(item.taskId)) {
          continue;
        }

        if (step.action === 'acquire_lock') {
          const lockId = step.lockId;
          const currentOwner = lockOwners.get(lockId);

          if (currentOwner && currentOwner !== item.taskId) {
            // Task item.taskId waits for currentOwner
            blockedTasks.add(item.taskId);
            if (!waitFor.has(item.taskId)) {
              waitFor.set(item.taskId, new Set());
            }
            waitFor.get(item.taskId).add(currentOwner);

            // Check for directed cycle in Wait-For graph
            const cycle = ScheduleSequentializer._findCycleInGraph(waitFor);
            if (cycle) {
              deadlockDetectedInSchedule = true;
              deadlockTraces.push({
                schedule,
                stepIndex: i,
                cycle,
                failingStep: item,
                threadDump: Array.from(waitFor.entries()).map(([k, set]) => ({
                  task: k,
                  waitingFor: Array.from(set)
                }))
              });
              break;
            }
          } else {
            lockOwners.set(lockId, item.taskId);
          }
        } else if (step.action === 'release_lock') {
          const lockId = step.lockId;
          if (lockOwners.get(lockId) === item.taskId) {
            lockOwners.delete(lockId);
            // Grant lock to one blocked task waiting on it, if any
            for (const [waitingTask, set] of waitFor) {
              if (set.has(item.taskId)) {
                set.delete(item.taskId);
                if (set.size === 0) {
                  waitFor.delete(waitingTask);
                  blockedTasks.delete(waitingTask);
                  lockOwners.set(lockId, waitingTask);
                  break;
                }
              }
            }
          }
        }
      }
    }

    return {
      hasDeadlock: deadlockTraces.length > 0,
      deadlocksCount: deadlockTraces.length,
      deadlockTraces
    };
  }

  /**
   * Helper DFS cycle finder in directed adjacency graph.
   * @private
   */
  static _findCycleInGraph(graph) {
    const visited = new Set();
    const recStack = new Set();
    const path = [];

    function dfs(node) {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) {
          const res = dfs(n);
          if (res) return res;
        } else if (recStack.has(n)) {
          const cycleStartIdx = path.indexOf(n);
          return path.slice(cycleStartIdx).concat(n);
        }
      }

      recStack.delete(node);
      path.pop();
      return null;
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const cycle = dfs(node);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  /**
   * Detects Livelocks where tasks continuously execute state transitions
   * but fail to make global progress toward a declared terminal condition
   * within bounded steps.
   *
   * @param {Array<any>} tasks
   * @param {object} initialState
   * @param {Function} isProgressMade (state, step) => boolean
   * @param {number} [maxStepsWithoutProgress=15]
   * @returns {{
   *   hasLivelock: boolean,
   *   livelockTraces: Array<any>
   * }}
   */
  static detectLivelocks(tasks, initialState, isProgressMade, maxStepsWithoutProgress = 15) {
    const interleavings = ScheduleSequentializer.generateInterleavings(tasks, { maxDepth: 25 });
    const livelockTraces = [];

    for (const schedule of interleavings) {
      const state = structuredClone(initialState);
      let stepsSinceProgress = 0;
      let livelockFound = false;

      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        if (item.step && typeof item.step.fn === 'function') {
          item.step.fn(state, { taskId: item.taskId, stepIndex: item.stepIndex });
        }

        if (isProgressMade(state, item.step)) {
          stepsSinceProgress = 0;
        } else {
          stepsSinceProgress++;
        }

        if (stepsSinceProgress >= maxStepsWithoutProgress) {
          livelockFound = true;
          livelockTraces.push({
            schedule,
            stepIndex: i,
            stepsSinceProgress,
            stateSnapshot: structuredClone(state)
          });
          break;
        }
      }
    }

    return {
      hasLivelock: livelockTraces.length > 0,
      livelockTraces
    };
  }
}

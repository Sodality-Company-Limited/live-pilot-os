#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS SHADOW ORACLE VALIDATOR & STATEFUL MODEL ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Stateful Model-Based Testing & Dual Lockstep Shadow Oracle
 * Purpose: Provides deterministic pseudo-random sequence generation,
 *          command specification interfaces, lockstep dual-state verification,
 *          reachability state-graph tracing, and delta-debugging trace shrinking.
 * Zero external npm dependencies (native ECMAScript using node:fs, node:path, node:crypto).
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

/**
 * Deterministic 64-bit SplitMix64 pseudo-random number generator.
 */
export class SplitMix64Prng {
  /**
   * @param {number|string|bigint} seed
   */
  constructor(seed = 42) {
    if (typeof seed === 'string') {
      const hash = crypto.createHash('sha256').update(seed).digest();
      this.state = hash.readBigUInt64BE(0);
    } else if (typeof seed === 'number') {
      this.state = BigInt(Math.trunc(seed));
    } else if (typeof seed === 'bigint') {
      this.state = seed;
    } else {
      this.state = 42n;
    }
  }

  /**
   * Generates next 64-bit unsigned BigInt.
   * @returns {bigint}
   */
  nextBigInt() {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return (z ^ (z >> 31n)) & 0xffffffffffffffffn;
  }

  /**
   * Returns a uniform floating point number in [0.0, 1.0).
   * @returns {number}
   */
  next() {
    const raw = this.nextBigInt();
    const divisor = 18446744073709551616; // 2^64
    return Number(raw) / divisor;
  }

  /**
   * Returns a uniform integer in [min, max] inclusive.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    const range = max - min + 1;
    const offset = Math.floor(this.next() * range);
    return min + offset;
  }

  /**
   * Picks a random element from an array.
   * @template T
   * @param {T[]} array
   * @returns {T}
   */
  pick(array) {
    if (!array || array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm.
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }
}

/**
 * Command interface representing a single state transition operation.
 */
export class Command {
  /**
   * @param {object} spec
   * @param {string} spec.name
   * @param {(state: any) => boolean} [spec.precondition]
   * @param {(sut: any, state: any) => any} spec.run
   * @param {(sut: any, state: any, result: any) => boolean|{ valid: boolean, message?: string }} [spec.postcondition]
   * @param {(state: any, result?: any) => any} [spec.applyToShadow]
   * @param {object} [spec.metadata]
   */
  constructor(spec) {
    if (!spec || typeof spec.name !== 'string' || spec.name.trim() === '') {
      throw new Error('Command must have a non-empty name string');
    }
    if (typeof spec.run !== 'function') {
      throw new Error(`Command "${spec.name}" must define an executable run(sut, state) function`);
    }

    this.name = spec.name;
    this.precondition = spec.precondition || (() => true);
    this.run = spec.run;
    this.postcondition = spec.postcondition || (() => true);
    this.applyToShadow = spec.applyToShadow || ((state) => state);
    this.metadata = spec.metadata || {};
  }
}

/**
 * Factory helper for constructing Command instances.
 * @param {object} spec
 * @returns {Command}
 */
export function createCommand(spec) {
  return new Command(spec);
}

/**
 * Canonical deep equality comparator with path tracking for divergence detection.
 * @param {any} actual
 * @param {any} expected
 * @param {string} [path='$']
 * @returns {{ matched: boolean, divergencePath?: string, actual?: any, expected?: any, message?: string }}
 */
export function computeStateDivergenceDiff(actual, expected, path = '$') {
  if (Object.is(actual, expected)) {
    return { matched: true };
  }

  // Type mismatch
  if (typeof actual !== typeof expected) {
    return {
      matched: false,
      divergencePath: path,
      actual,
      expected,
      message: `Type mismatch at ${path}: expected ${typeof expected}, got ${typeof actual}`
    };
  }

  // Null or undefined checks
  if (actual === null || expected === null || actual === undefined || expected === undefined) {
    return {
      matched: false,
      divergencePath: path,
      actual,
      expected,
      message: `Nullability mismatch at ${path}: actual is ${actual}, expected is ${expected}`
    };
  }

  // Array comparison
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      return {
        matched: false,
        divergencePath: path,
        actual,
        expected,
        message: `Array type mismatch at ${path}`
      };
    }
    if (actual.length !== expected.length) {
      return {
        matched: false,
        divergencePath: `${path}.length`,
        actual: actual.length,
        expected: expected.length,
        message: `Array length mismatch at ${path}: expected ${expected.length}, got ${actual.length}`
      };
    }
    for (let i = 0; i < actual.length; i++) {
      const elemDiff = computeStateDivergenceDiff(actual[i], expected[i], `${path}[${i}]`);
      if (!elemDiff.matched) {
        return elemDiff;
      }
    }
    return { matched: true };
  }

  // Plain Object / Map comparison
  if (typeof actual === 'object') {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();

    // Check for missing or unexpected keys
    const expectedKeySet = new Set(expectedKeys);
    for (const key of actualKeys) {
      if (!expectedKeySet.has(key)) {
        return {
          matched: false,
          divergencePath: `${path}.${key}`,
          actual: actual[key],
          expected: undefined,
          message: `Unexpected key "${key}" found at ${path}`
        };
      }
    }

    const actualKeySet = new Set(actualKeys);
    for (const key of expectedKeys) {
      if (!actualKeySet.has(key)) {
        return {
          matched: false,
          divergencePath: `${path}.${key}`,
          actual: undefined,
          expected: expected[key],
          message: `Expected key "${key}" missing at ${path}`
        };
      }
    }

    // Recursively compare all key values
    for (const key of actualKeys) {
      const fieldDiff = computeStateDivergenceDiff(actual[key], expected[key], `${path}.${key}`);
      if (!fieldDiff.matched) {
        return fieldDiff;
      }
    }

    return { matched: true };
  }

  return {
    matched: false,
    divergencePath: path,
    actual,
    expected,
    message: `Value inequality at ${path}: expected ${expected}, got ${actual}`
  };
}

/**
 * Tracks visited state nodes and transition edges to compute reachability coverage.
 */
export class ReachabilityGraph {
  constructor() {
    /** @type {Map<string, { stateSnapshot: any, visits: number, firstSeenStep: number }>} */
    this.nodes = new Map();
    /** @type {Array<{ fromHash: string, toHash: string, command: string, step: number }>} */
    this.edges = [];
  }

  /**
   * Deterministically digests a state into a SHA-256 state key.
   * @param {any} state
   * @returns {string}
   */
  hashState(state) {
    if (state === null || state === undefined) {
      return 'null';
    }
    const serialized = JSON.stringify(state, Object.keys(state || {}).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  }

  /**
   * Records a transition between two states.
   * @param {any} fromState
   * @param {string} commandName
   * @param {any} toState
   * @param {number} step
   */
  recordTransition(fromState, commandName, toState, step = 0) {
    const fromHash = this.hashState(fromState);
    const toHash = this.hashState(toState);

    if (!this.nodes.has(fromHash)) {
      this.nodes.set(fromHash, {
        stateSnapshot: JSON.parse(JSON.stringify(fromState)),
        visits: 1,
        firstSeenStep: step
      });
    } else {
      this.nodes.get(fromHash).visits += 1;
    }

    if (!this.nodes.has(toHash)) {
      this.nodes.set(toHash, {
        stateSnapshot: JSON.parse(JSON.stringify(toState)),
        visits: 1,
        firstSeenStep: step
      });
    } else {
      this.nodes.get(toHash).visits += 1;
    }

    this.edges.push({
      fromHash,
      toHash,
      command: commandName,
      step
    });
  }

  /**
   * Checks whether a state has been reached during trace execution.
   * @param {any} state
   * @returns {boolean}
   */
  isReachable(state) {
    const hash = this.hashState(state);
    return this.nodes.has(hash);
  }

  /**
   * Returns topological statistics for the visited state space.
   * @returns {object}
   */
  getCoverageStats() {
    const uniqueStates = this.nodes.size;
    const totalTransitions = this.edges.length;

    // Detect unique directed edges
    const uniqueEdgeSet = new Set();
    const outgoingDegree = new Map();

    for (const edge of this.edges) {
      const edgeKey = `${edge.fromHash}->${edge.command}->${edge.toHash}`;
      uniqueEdgeSet.add(edgeKey);
      outgoingDegree.set(edge.fromHash, (outgoingDegree.get(edge.fromHash) || 0) + 1);
    }

    // Detect terminal / dead-end states (states with 0 outgoing edges)
    let terminalStates = 0;
    for (const nodeKey of this.nodes.keys()) {
      if (!outgoingDegree.has(nodeKey)) {
        terminalStates += 1;
      }
    }

    const branchingFactor = uniqueStates > 0 ? Number((uniqueEdgeSet.size / uniqueStates).toFixed(3)) : 0;

    return {
      uniqueStates,
      totalTransitions,
      uniqueTransitions: uniqueEdgeSet.size,
      terminalStates,
      branchingFactor
    };
  }

  /**
   * Serializes the graph to JSON format for reporting.
   * @returns {object}
   */
  toJSON() {
    return {
      stats: this.getCoverageStats(),
      nodesCount: this.nodes.size,
      edgesCount: this.edges.length
    };
  }
}

/**
 * Generates sequences of commands satisfying state preconditions.
 */
export class StatefulSequenceGenerator {
  /**
   * @param {object} options
   * @param {Command[]} options.commandPool
   * @param {SplitMix64Prng} [options.prng]
   */
  constructor({ commandPool = [], prng = new SplitMix64Prng(42) } = {}) {
    this.commandPool = commandPool;
    this.prng = prng;
  }

  /**
   * Generates a state-consistent sequence of commands starting from initial state.
   * @param {object} params
   * @param {any} params.initialShadowState
   * @param {number} [params.maxSteps=50]
   * @param {boolean} [params.directed=false]
   * @param {ReachabilityGraph} [params.reachabilityGraph]
   * @returns {Command[]}
   */
  generateSequence({
    initialShadowState,
    maxSteps = 50,
    directed = false,
    reachabilityGraph = null
  }) {
    const sequence = [];
    let currentState = JSON.parse(JSON.stringify(initialShadowState));

    for (let step = 0; step < maxSteps; step++) {
      // Find candidate commands whose precondition holds on current shadow state
      const validCommands = this.commandPool.filter((cmd) => {
        try {
          return Boolean(cmd.precondition(currentState));
        } catch {
          return false;
        }
      });

      // Terminal state reached: no valid commands can execute
      if (validCommands.length === 0) {
        break;
      }

      let selectedCommand = null;

      if (directed && reachabilityGraph) {
        // Directed search: prioritize commands transitioning to unvisited or least-visited states
        const scoredCandidates = validCommands.map((cmd) => {
          let predictedNextState;
          try {
            predictedNextState = cmd.applyToShadow(JSON.parse(JSON.stringify(currentState)));
          } catch {
            predictedNextState = currentState;
          }
          const hash = reachabilityGraph.hashState(predictedNextState);
          const node = reachabilityGraph.nodes.get(hash);
          const visitCount = node ? node.visits : 0;
          return { cmd, visitCount };
        });

        // Sort ascending by visit count to encourage state space exploration
        scoredCandidates.sort((a, b) => a.visitCount - b.visitCount);
        // Add minimal stochasticity among the lowest visited commands
        const lowestCount = scoredCandidates[0].visitCount;
        const bestCandidates = scoredCandidates
          .filter((item) => item.visitCount === lowestCount)
          .map((item) => item.cmd);

        selectedCommand = this.prng.pick(bestCandidates);
      } else {
        selectedCommand = this.prng.pick(validCommands);
      }

      sequence.push(selectedCommand);

      // Advance shadow state simulation for next step
      try {
        currentState = selectedCommand.applyToShadow(currentState);
      } catch (err) {
        throw new Error(
          `Command "${selectedCommand.name}" applyToShadow failed during sequence generation: ${err.message}`
        );
      }
    }

    return sequence;
  }
}

/**
 * Structured error indicating divergence between SUT and pure reference shadow model.
 */
export class StateDivergenceError extends Error {
  /**
   * @param {object} details
   */
  constructor(details) {
    super(
      `State divergence detected at step ${details.step} on command "${details.command}": ${details.message || 'State mismatch'}`
    );
    this.name = 'StateDivergenceError';
    this.step = details.step;
    this.command = details.command;
    this.diff = details.diff;
    this.sutState = details.sutState;
    this.shadowState = details.shadowState;
    this.minimalTrace = details.minimalTrace || null;
  }

  /**
   * Formats divergence into a structured diagnostic report.
   * @returns {string}
   */
  toStructuredReport() {
    return [
      '═══════════════════════════════════════════════════════════════',
      '🚨 SHADOW ORACLE DIVERGENCE DETECTED',
      '═══════════════════════════════════════════════════════════════',
      `Failing Step Index: ${this.step}`,
      `Executed Command:   ${this.command}`,
      `Divergence Path:    ${this.diff?.divergencePath || 'unknown'}`,
      `Expected (Shadow):  ${JSON.stringify(this.diff?.expected)}`,
      `Actual (SUT):       ${JSON.stringify(this.diff?.actual)}`,
      '═══════════════════════════════════════════════════════════════'
    ].join('\n');
  }
}

/**
 * Dual Lockstep Shadow Oracle Validator.
 * Executes command sequences in parallel on SUT and pure shadow reference model.
 */
export class ShadowOracleValidator {
  /**
   * @param {object} options
   * @param {() => any} options.sutFactory
   * @param {() => any} options.shadowFactory
   * @param {Command[]} [options.commands]
   * @param {(sut: any, shadowState: any) => { equivalent: boolean, diff?: object }} [options.equivalenceChecker]
   * @param {(sut: any, shadowState: any, commandName: string, step: number) => { satisfied: boolean, violation?: string }} [options.invariantChecker]
   * @param {ReachabilityGraph} [options.reachabilityGraph]
   */
  constructor({
    sutFactory,
    shadowFactory,
    commands = [],
    equivalenceChecker = null,
    invariantChecker = null,
    reachabilityGraph = null
  }) {
    if (typeof sutFactory !== 'function' || typeof shadowFactory !== 'function') {
      throw new Error('ShadowOracleValidator requires sutFactory and shadowFactory functions');
    }
    this.sutFactory = sutFactory;
    this.shadowFactory = shadowFactory;
    this.commands = commands;
    this.equivalenceChecker = equivalenceChecker || ((sut, shadow) => {
      const sutState = typeof sut.getState === 'function' ? sut.getState() : sut;
      return computeStateDivergenceDiff(sutState, shadow);
    });
    this.invariantChecker = invariantChecker || (() => ({ satisfied: true }));
    this.reachabilityGraph = reachabilityGraph || new ReachabilityGraph();
  }

  /**
   * Executes a single command step in lockstep.
   * @param {Command} command
   * @param {any} sut
   * @param {any} currentShadowState
   * @param {number} stepIndex
   * @returns {object}
   */
  executeStep(command, sut, currentShadowState, stepIndex = 0) {
    // 1. Check Precondition
    const satisfiesPrecondition = command.precondition(currentShadowState);
    if (!satisfiesPrecondition) {
      return {
        success: false,
        errorType: 'PRECONDITION_VIOLATION',
        message: `Command "${command.name}" precondition failed on shadow state at step ${stepIndex}`
      };
    }

    const preStateSnapshot = JSON.parse(JSON.stringify(currentShadowState));

    // 2. Execute on SUT
    let sutResult;
    try {
      sutResult = command.run(sut, currentShadowState);
    } catch (err) {
      return {
        success: false,
        errorType: 'SUT_EXCEPTION',
        message: `SUT threw uncaught exception during "${command.name}": ${err.message}`,
        error: err
      };
    }

    // 3. Advance pure shadow reference model
    let nextShadowState;
    try {
      nextShadowState = command.applyToShadow(currentShadowState, sutResult);
    } catch (err) {
      return {
        success: false,
        errorType: 'SHADOW_EXCEPTION',
        message: `Shadow model failed during "${command.name}": ${err.message}`,
        error: err
      };
    }

    // 4. Evaluate Command Postcondition
    let postconditionResult;
    try {
      postconditionResult = command.postcondition(sut, nextShadowState, sutResult);
    } catch (err) {
      return {
        success: false,
        errorType: 'POSTCONDITION_EXCEPTION',
        message: `Postcondition evaluation threw exception: ${err.message}`
      };
    }

    const postconditionValid =
      typeof postconditionResult === 'object' && postconditionResult !== null
        ? postconditionResult.valid
        : Boolean(postconditionResult);

    if (!postconditionValid) {
      return {
        success: false,
        errorType: 'POSTCONDITION_FAILED',
        message:
          typeof postconditionResult === 'object' && postconditionResult.message
            ? postconditionResult.message
            : `Postcondition failed for command "${command.name}" at step ${stepIndex}`,
        sutResult,
        shadowState: nextShadowState
      };
    }

    // 5. Assert Lockstep State Equivalence
    const eqResult = this.equivalenceChecker(sut, nextShadowState);
    const isEquivalent =
      typeof eqResult.matched === 'boolean'
        ? eqResult.matched
        : typeof eqResult.equivalent === 'boolean'
        ? eqResult.equivalent
        : false;

    if (!isEquivalent) {
      const sutState = typeof sut.getState === 'function' ? sut.getState() : sut;
      return {
        success: false,
        errorType: 'EQUIVALENCE_DIVERGENCE',
        diff: eqResult,
        sutState,
        shadowState: nextShadowState,
        message: eqResult.message || `State divergence detected after "${command.name}"`
      };
    }

    // 6. Assert System Invariants
    const invResult = this.invariantChecker(sut, nextShadowState, command.name, stepIndex);
    if (!invResult.satisfied) {
      return {
        success: false,
        errorType: 'INVARIANT_VIOLATION',
        violation: invResult.violation,
        message: `System invariant violated: ${invResult.violation}`
      };
    }

    // 7. Record Reachability Transition
    this.reachabilityGraph.recordTransition(preStateSnapshot, command.name, nextShadowState, stepIndex);

    return {
      success: true,
      command: command.name,
      nextShadowState,
      sutResult
    };
  }

  /**
   * Executes a full sequence of commands in dual lockstep.
   * @param {Command[]} sequence
   * @param {object} [options]
   * @param {boolean} [options.stopOnFirstDivergence=true]
   * @returns {object}
   */
  executeSequence(sequence, { stopOnFirstDivergence = true } = {}) {
    const sut = this.sutFactory();
    let shadowState = this.shadowFactory();
    const history = [];

    for (let step = 0; step < sequence.length; step++) {
      const command = sequence[step];
      const stepOutcome = this.executeStep(command, sut, shadowState, step);

      if (!stepOutcome.success) {
        const failureRecord = {
          status: 'DIVERGENCE',
          failingStepIndex: step,
          failingCommand: command.name,
          errorType: stepOutcome.errorType,
          message: stepOutcome.message,
          diff: stepOutcome.diff || null,
          sutState: stepOutcome.sutState || (typeof sut.getState === 'function' ? sut.getState() : sut),
          shadowState: stepOutcome.shadowState || shadowState,
          history,
          executedStepsCount: step
        };

        if (stopOnFirstDivergence) {
          return failureRecord;
        }
      }

      shadowState = stepOutcome.nextShadowState;
      history.push({
        step,
        command: command.name,
        shadowState: JSON.parse(JSON.stringify(shadowState))
      });
    }

    return {
      status: 'PASS',
      totalStepsExecuted: sequence.length,
      finalShadowState: shadowState,
      reachabilityStats: this.reachabilityGraph.getCoverageStats()
    };
  }
}

/**
 * Action-trace shrinker that minimizes a failing command sequence.
 * Uses delta-debugging with state-precondition validity preservation.
 */
export class ActionTraceShrinker {
  /**
   * @param {object} options
   * @param {ShadowOracleValidator} options.oracleValidator
   * @param {number} [options.maxPasses=50]
   */
  constructor({ oracleValidator, maxPasses = 50 }) {
    this.oracleValidator = oracleValidator;
    this.maxPasses = maxPasses;
  }

  /**
   * Verifies if a command sequence is valid under shadow preconditions.
   * @param {Command[]} sequence
   * @returns {boolean}
   */
  isSequenceValid(sequence) {
    try {
      let state = this.oracleValidator.shadowFactory();
      for (const cmd of sequence) {
        if (!cmd.precondition(state)) {
          return false;
        }
        state = cmd.applyToShadow(state);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Tests if a candidate sequence still reproduces a failure.
   * @param {Command[]} sequence
   * @returns {boolean}
   */
  reproducesFailure(sequence) {
    if (!this.isSequenceValid(sequence)) {
      return false;
    }
    const result = this.oracleValidator.executeSequence(sequence, { stopOnFirstDivergence: true });
    return result.status === 'DIVERGENCE';
  }

  /**
   * Minimizes a failing command sequence to the minimal subset reproducing the divergence.
   * @param {object} params
   * @param {Command[]} params.commandSequence
   * @param {number} params.failingStepIndex
   * @returns {{ minimalSequence: Command[], originalLength: number, minimizedLength: number, shrinkSteps: number }}
   */
  shrink({ commandSequence, failingStepIndex }) {
    const originalLength = commandSequence.length;
    // Step 1: Truncate suffix after failing step
    let candidate = commandSequence.slice(0, failingStepIndex + 1);
    let shrinkSteps = 0;

    // Step 2: Binary chunk deletion of prefix steps
    let chunkSize = Math.floor(candidate.length / 2);
    while (chunkSize > 0 && shrinkSteps < this.maxPasses) {
      let reducedInPass = false;
      for (let i = 0; i <= candidate.length - 1 - chunkSize; i += chunkSize) {
        // Form candidate by removing chunk from i to i + chunkSize (preserving last command)
        if (i + chunkSize >= candidate.length) break;
        const testCandidate = [
          ...candidate.slice(0, i),
          ...candidate.slice(i + chunkSize)
        ];

        if (this.reproducesFailure(testCandidate)) {
          candidate = testCandidate;
          shrinkSteps += 1;
          reducedInPass = true;
          break;
        }
      }
      if (!reducedInPass) {
        chunkSize = Math.floor(chunkSize / 2);
      }
    }

    // Step 3: 1-minimal sequential pruning
    // Try removing individual intermediate commands from end to beginning
    for (let pass = 0; pass < 2 && shrinkSteps < this.maxPasses; pass++) {
      let changed = false;
      for (let i = candidate.length - 2; i >= 0; i--) {
        const testCandidate = [
          ...candidate.slice(0, i),
          ...candidate.slice(i + 1)
        ];
        if (this.reproducesFailure(testCandidate)) {
          candidate = testCandidate;
          shrinkSteps += 1;
          changed = true;
        }
      }
      if (!changed) break;
    }

    return {
      minimalSequence: candidate,
      originalLength,
      minimizedLength: candidate.length,
      shrinkSteps
    };
  }
}

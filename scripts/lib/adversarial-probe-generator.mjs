/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ADVERSARIAL PROBE GENERATOR ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Adversarial Boundary & Extremal Arithmetic Mutation Engine
 * Purpose: Generates deterministic and pseudo-random adversarial probe matrices
 *          probing arithmetic extremes, integer wraps, identity aliasing,
 *          precision dust draining, zero divisors, non-canonical floats, and
 *          pathological payloads (homoglyphs, ReDoS, extreme strings/buffers).
 * Invariants: Zero external npm dependencies (native ECMAScript only).
 *             Zero floating point drift; strict integer conservation.
 *             Fail-closed error semantics on all boundary violations.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

/**
 * 64-bit and 32-bit constant arithmetic extremes
 */
export const INT32_MIN = -2147483648;
export const INT32_MAX = 2147483647;
export const UINT32_MAX = 4294967295;
export const INT64_MIN = -9223372036854775808n;
export const INT64_MAX = 9223372036854775807n;
export const UINT64_MAX = 18446744073709551615n;
export const UINT128_MAX = 340282366920938463463374607431768211455n;
export const UINT256_MAX = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

/**
 * Static canonical extremal arithmetic values catalogue.
 */
export const EXTREMAL_ARITHMETIC_VALUES = Object.freeze([
  { label: 'zero_number', value: 0, type: 'number', bitWidth: 64, signed: true },
  { label: 'positive_one_number', value: 1, type: 'number', bitWidth: 64, signed: true },
  { label: 'negative_one_number', value: -1, type: 'number', bitWidth: 64, signed: true },
  { label: 'max_safe_integer', value: Number.MAX_SAFE_INTEGER, type: 'number', bitWidth: 53, signed: true },
  { label: 'min_safe_integer', value: Number.MIN_SAFE_INTEGER, type: 'number', bitWidth: 53, signed: true },
  { label: 'max_safe_integer_plus_one', value: Number.MAX_SAFE_INTEGER + 1, type: 'number', bitWidth: 53, signed: true, unsafe: true },
  { label: 'zero_bigint', value: 0n, type: 'bigint', bitWidth: 64, signed: true },
  { label: 'positive_one_bigint', value: 1n, type: 'bigint', bitWidth: 64, signed: true },
  { label: 'negative_one_bigint', value: -1n, type: 'bigint', bitWidth: 64, signed: true },
  { label: 'int32_min_bigint', value: BigInt(INT32_MIN), type: 'bigint', bitWidth: 32, signed: true },
  { label: 'int32_max_bigint', value: BigInt(INT32_MAX), type: 'bigint', bitWidth: 32, signed: true },
  { label: 'uint32_max_bigint', value: BigInt(UINT32_MAX), type: 'bigint', bitWidth: 32, signed: false },
  { label: 'int64_min_bigint', value: INT64_MIN, type: 'bigint', bitWidth: 64, signed: true },
  { label: 'int64_max_bigint', value: INT64_MAX, type: 'bigint', bitWidth: 64, signed: true },
  { label: 'uint64_max_bigint', value: UINT64_MAX, type: 'bigint', bitWidth: 64, signed: false },
  { label: 'uint128_max_bigint', value: UINT128_MAX, type: 'bigint', bitWidth: 128, signed: false },
  { label: 'uint256_max_bigint', value: UINT256_MAX, type: 'bigint', bitWidth: 256, signed: false }
]);

/**
 * Deterministic Pseudo-Random Number Generator (SplitMix32)
 */
export class SplitMix32 {
  constructor(seed = 42) {
    this.state = (seed >>> 0) || 1;
  }

  nextUint32() {
    this.state = (this.state + 0x9e3779b9) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  }

  nextFloat() {
    return this.nextUint32() / 0x100000000;
  }

  nextInt(min, max) {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  nextBigInt(min, max) {
    const diff = max - min;
    if (diff === 0n) return min;
    const r = BigInt(this.nextUint32());
    return min + (r % (diff + 1n));
  }
}

/**
 * Generates extremal arithmetic boundary probes.
 *
 * @param {object} options
 * @returns {Array<object>}
 */
export function generateExtremalArithmeticProbes(options = {}) {
  const probes = [];

  for (const item of EXTREMAL_ARITHMETIC_VALUES) {
    probes.push({
      category: 'extremal_arithmetic',
      id: `EXT-ARITH-${item.label}`,
      label: item.label,
      value: item.value,
      type: item.type,
      bitWidth: item.bitWidth,
      signed: item.signed,
      expected: item.unsafe ? 'reject_unsafe_float_precision' : 'valid_boundary_or_bounded_domain'
    });
  }

  // Offset mutation probes (value - 1, value + 1)
  const basePoints = [
    { name: 'zero', val: 0n },
    { name: 'int32_max', val: BigInt(INT32_MAX) },
    { name: 'uint32_max', val: BigInt(UINT32_MAX) },
    { name: 'int64_max', val: INT64_MAX },
    { name: 'uint64_max', val: UINT64_MAX }
  ];

  for (const bp of basePoints) {
    probes.push({
      category: 'extremal_arithmetic',
      id: `EXT-OFFSET-${bp.name}-minus-1`,
      label: `${bp.name} - 1`,
      value: bp.val - 1n,
      type: 'bigint',
      expected: 'bounded_value'
    });
    probes.push({
      category: 'extremal_arithmetic',
      id: `EXT-OFFSET-${bp.name}-plus-1`,
      label: `${bp.name} + 1`,
      value: bp.val + 1n,
      type: 'bigint',
      expected: bp.name.includes('max') ? 'overflow_mutation' : 'bounded_value'
    });
  }

  return probes;
}

/**
 * Generates unsigned boundary and underflow/overflow probes.
 *
 * @returns {Array<object>}
 */
export function generateUnsignedBoundaryProbes() {
  return [
    {
      category: 'unsigned_boundary',
      id: 'UNS-UNDERFLOW-NEG-1-INT',
      label: 'Negative one on unsigned 32-bit integer',
      value: -1,
      targetType: 'uint32',
      expectedBehavior: 'fail_closed_underflow_rejection'
    },
    {
      category: 'unsigned_boundary',
      id: 'UNS-UNDERFLOW-NEG-1-BIGINT',
      label: 'Negative one BigInt on unsigned 64-bit integer',
      value: -1n,
      targetType: 'uint64',
      expectedBehavior: 'fail_closed_underflow_rejection'
    },
    {
      category: 'unsigned_boundary',
      id: 'UNS-OVERFLOW-UINT32-MAX-PLUS-1',
      label: 'UINT32_MAX + 1 overflow check',
      value: BigInt(UINT32_MAX) + 1n,
      targetType: 'uint32',
      expectedBehavior: 'fail_closed_overflow_rejection'
    },
    {
      category: 'unsigned_boundary',
      id: 'UNS-OVERFLOW-UINT64-MAX-PLUS-1',
      label: 'UINT64_MAX + 1 overflow check',
      value: UINT64_MAX + 1n,
      targetType: 'uint64',
      expectedBehavior: 'fail_closed_overflow_rejection'
    },
    {
      category: 'unsigned_boundary',
      id: 'UNS-BOUNDARY-ZERO',
      label: 'Unsigned lower bound (zero)',
      value: 0n,
      targetType: 'uint64',
      expectedBehavior: 'accept_canonical_zero'
    },
    {
      category: 'unsigned_boundary',
      id: 'UNS-BOUNDARY-UINT64-MAX',
      label: 'Unsigned upper bound (UINT64_MAX)',
      value: UINT64_MAX,
      targetType: 'uint64',
      expectedBehavior: 'accept_canonical_max'
    }
  ];
}

/**
 * Generates identity aliasing probes (from === to, cycles, self-referential graphs).
 *
 * @param {object} options
 * @returns {Array<object>}
 */
export function generateIdentityAliasingProbes(options = {}) {
  const probes = [];

  // 1. Exact string identity aliasing
  probes.push({
    category: 'identity_aliasing',
    id: 'ALIAS-EXACT-DIRECT',
    label: 'Direct self-transfer (from === to)',
    transfer: {
      from: 'acc_vault_alpha',
      to: 'acc_vault_alpha',
      amount: 1000n,
      currency: 'THB'
    },
    expectedBehavior: 'fail_closed_aliasing_rejection'
  });

  // 2. Case-insensitive / whitespace aliasing
  probes.push({
    category: 'identity_aliasing',
    id: 'ALIAS-NORMALIZED-CASE-WHITESPACE',
    label: 'Case and whitespace mutated aliasing',
    transfer: {
      from: '  ACC_VAULT_ALPHA  ',
      to: 'acc_vault_alpha',
      amount: 500n,
      currency: 'THB'
    },
    expectedBehavior: 'fail_closed_aliasing_rejection'
  });

  // 3. Multi-hop circular transfer loop (A -> B -> C -> A)
  probes.push({
    category: 'identity_aliasing',
    id: 'ALIAS-CIRCULAR-LOOP-3',
    label: '3-node circular transfer loop',
    transfers: [
      { from: 'acc_node_A', to: 'acc_node_B', amount: 100n },
      { from: 'acc_node_B', to: 'acc_node_C', amount: 100n },
      { from: 'acc_node_C', to: 'acc_node_A', amount: 100n }
    ],
    cycleNodes: ['acc_node_A', 'acc_node_B', 'acc_node_C'],
    expectedBehavior: 'fail_closed_cycle_rejection'
  });

  // 4. 2-node reciprocal wash trading loop (A -> B -> A)
  probes.push({
    category: 'identity_aliasing',
    id: 'ALIAS-CIRCULAR-LOOP-2',
    label: '2-node reciprocal transfer loop',
    transfers: [
      { from: 'acc_trader_1', to: 'acc_trader_2', amount: 5000n },
      { from: 'acc_trader_2', to: 'acc_trader_1', amount: 5000n }
    ],
    cycleNodes: ['acc_trader_1', 'acc_trader_2'],
    expectedBehavior: 'fail_closed_cycle_rejection'
  });

  // 5. Self-referential graph edge
  probes.push({
    category: 'identity_aliasing',
    id: 'ALIAS-SELF-GRAPH-EDGE',
    label: 'Self-referential DAG directed edge',
    graph: {
      nodes: ['entity_root', 'entity_child'],
      edges: [
        { source: 'entity_root', target: 'entity_child' },
        { source: 'entity_child', target: 'entity_child' } // self loop
      ]
    },
    expectedBehavior: 'fail_closed_cycle_rejection'
  });

  return probes;
}

/**
 * Detects whether a transfer specifies identical or canonically aliased source and destination.
 *
 * @param {object} transfer
 * @returns {{ aliased: boolean, reason?: string }}
 */
export function detectIdentityAliasing(transfer) {
  if (!transfer || typeof transfer !== 'object') {
    return { aliased: true, reason: 'Invalid transfer payload' };
  }

  const { from, to } = transfer;
  if (from === undefined || to === undefined) {
    return { aliased: true, reason: 'Missing source or destination party' };
  }

  if (from === to) {
    return { aliased: true, reason: 'Exact identity match: source === destination' };
  }

  if (typeof from === 'string' && typeof to === 'string') {
    const normFrom = from.trim().toLowerCase();
    const normTo = to.trim().toLowerCase();
    if (normFrom === normTo) {
      return { aliased: true, reason: 'Normalized identity match: from and to resolve to identical identifier' };
    }
  }

  return { aliased: false };
}

/**
 * Detects circular transfer chains / loops in an array of transfers.
 *
 * @param {Array<object>} transfers
 * @returns {{ hasCycle: boolean, cycle?: string[] }}
 */
export function detectTransferCycle(transfers) {
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return { hasCycle: false };
  }

  // Build adjacency graph
  const adj = new Map();
  for (const t of transfers) {
    if (!t.from || !t.to) continue;
    const u = String(t.from).trim().toLowerCase();
    const v = String(t.to).trim().toLowerCase();
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u).push(v);
  }

  const visited = new Set();
  const recStack = new Set();
  const path = [];

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycleFound = dfs(neighbor);
        if (cycleFound) return true;
      } else if (recStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recStack.delete(node);
    path.pop();
    return false;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycle: true, cycle: [...path] };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Precision Dust Draining Simulator.
 * Simulates micro-transfers (1 minor unit or fractional splits) across N iterations
 * verifying strict integer conservation: sum(splits) === total with zero float drift.
 *
 * @param {object} options
 * @returns {{
 *   iterations: number,
 *   initialBalance: bigint,
 *   finalBalance: bigint,
 *   totalConserved: boolean,
 *   drift: bigint,
 *   splitsVerified: number,
 *   samples: Array<object>
 * }}
 */
export function simulateDustDraining(options = {}) {
  const iterations = options.iterations || 10000;
  const initialBalance = options.initialBalance !== undefined ? BigInt(options.initialBalance) : 1000000n;
  const transferAmount = options.transferAmount !== undefined ? BigInt(options.transferAmount) : 1n;

  let balanceA = initialBalance;
  let balanceB = 0n;
  let balanceFee = 0n;
  let totalDrift = 0n;
  let splitsVerified = 0;
  const samples = [];

  // Multi-split ratio (e.g., 50% / 30% / 20%) using exact integer division & remainder conservation
  for (let i = 0; i < iterations; i++) {
    // 1 minor unit transfer
    if (balanceA >= transferAmount) {
      balanceA -= transferAmount;
      balanceB += transferAmount;
    } else {
      // Re-cycle back
      balanceA += balanceB;
      balanceB = 0n;
    }

    // Mathematical conservation invariant: sum of balances MUST equal initial balance exactly
    const currentTotal = balanceA + balanceB + balanceFee;
    const stepDrift = currentTotal - initialBalance;
    if (stepDrift !== 0n) {
      totalDrift += stepDrift;
    }

    // Test a 3-way split with integer remainder assignment (Banker's conservative integer split)
    const testAmount = 100n + BigInt(i % 7);
    const split1 = (testAmount * 50n) / 100n;
    const split2 = (testAmount * 30n) / 100n;
    const split3 = testAmount - (split1 + split2); // Remainder guaranteed by conservation law
    const splitSum = split1 + split2 + split3;

    if (splitSum === testAmount) {
      splitsVerified++;
    } else {
      totalDrift += (splitSum - testAmount);
    }

    if (i < 5 || i === iterations - 1) {
      samples.push({
        step: i + 1,
        balanceA: balanceA.toString(),
        balanceB: balanceB.toString(),
        currentTotal: currentTotal.toString(),
        drift: stepDrift.toString()
      });
    }
  }

  const finalTotal = balanceA + balanceB + balanceFee;
  const totalConserved = (finalTotal === initialBalance) && (totalDrift === 0n);

  return {
    iterations,
    initialBalance,
    finalBalance: finalTotal,
    totalConserved,
    drift: totalDrift,
    splitsVerified,
    samples
  };
}

/**
 * Generates zero divisor probes for both numbers and BigInts.
 *
 * @returns {Array<object>}
 */
export function generateZeroDivisorProbes() {
  return [
    {
      category: 'zero_divisor',
      id: 'ZERO-DIV-INT-ZERO',
      label: 'Integer zero denominator',
      numerator: 100,
      denominator: 0,
      type: 'number',
      expectedBehavior: 'fail_closed_zero_division_rejection'
    },
    {
      category: 'zero_divisor',
      id: 'ZERO-DIV-BIGINT-ZERO',
      label: 'BigInt zero denominator',
      numerator: 100n,
      denominator: 0n,
      type: 'bigint',
      expectedBehavior: 'fail_closed_zero_division_rejection'
    },
    {
      category: 'zero_divisor',
      id: 'ZERO-DIV-NEGATIVE-ZERO',
      label: 'Negative zero (-0) denominator',
      numerator: 50,
      denominator: -0,
      type: 'number',
      expectedBehavior: 'fail_closed_zero_division_rejection'
    },
    {
      category: 'zero_divisor',
      id: 'ZERO-DIV-FLOAT-ZERO',
      label: 'Float 0.0 denominator',
      numerator: 1.0,
      denominator: 0.0,
      type: 'number',
      expectedBehavior: 'fail_closed_zero_division_rejection'
    }
  ];
}

/**
 * Generates non-canonical floating point probes.
 *
 * @returns {Array<object>}
 */
export function generateNonCanonicalFloatProbes() {
  return [
    {
      category: 'non_canonical_float',
      id: 'FLOAT-NAN',
      label: 'NaN (Not-a-Number) operand',
      value: NaN,
      expectedBehavior: 'fail_closed_nan_rejection'
    },
    {
      category: 'non_canonical_float',
      id: 'FLOAT-POS-INFINITY',
      label: '+Infinity operand',
      value: Infinity,
      expectedBehavior: 'fail_closed_infinity_rejection'
    },
    {
      category: 'non_canonical_float',
      id: 'FLOAT-NEG-INFINITY',
      label: '-Infinity operand',
      value: -Infinity,
      expectedBehavior: 'fail_closed_infinity_rejection'
    },
    {
      category: 'non_canonical_float',
      id: 'FLOAT-SUBNORMAL-MIN',
      label: 'Subnormal float (Number.MIN_VALUE)',
      value: Number.MIN_VALUE,
      expectedBehavior: 'fail_closed_subnormal_rejection'
    },
    {
      category: 'non_canonical_float',
      id: 'FLOAT-FRACTIONAL-DECIMAL',
      label: 'Fractional float where minor-unit integer required (12.345)',
      value: 12.345,
      expectedBehavior: 'fail_closed_float_rejection'
    }
  ];
}

/**
 * Generates pathological payload probes (homoglyphs, ReDoS, extreme strings, buffer boundaries).
 *
 * @returns {object}
 */
export function generatePathologyProbes() {
  return {
    homoglyphs: [
      {
        id: 'PATHO-HOMO-CYRILLIC-A',
        label: 'Cyrillic Small Letter A (U+0430) spoofing Latin a',
        canonical: 'admin',
        spoofed: '\u0430dmin', // 'а' instead of 'a'
        risk: 'homograph_identity_confusion'
      },
      {
        id: 'PATHO-HOMO-ZERO-WIDTH-SPACE',
        label: 'Zero-Width Space (U+200B) injected between tokens',
        canonical: 'transfer',
        spoofed: 'trans\u200Bfer',
        risk: 'invisible_token_tampering'
      },
      {
        id: 'PATHO-HOMO-RTL-OVERRIDE',
        label: 'Right-To-Left Override (U+202E) reversing text direction',
        canonical: 'account_123',
        spoofed: '\u202E321_tnuocca',
        risk: 'visual_spoofing_bidi'
      },
      {
        id: 'PATHO-HOMO-FULLWIDTH',
        label: 'Fullwidth Latin characters (U+FF41..)',
        canonical: 'vault',
        spoofed: '\uFF56\uFF41\uFF55\uFF4C\uFF54',
        risk: 'fullwidth_normalization_bypass'
      }
    ],
    redos: [
      {
        id: 'PATHO-REDOS-NESTED-STAR',
        label: 'Polynomial ReDoS pattern (a+)+$',
        pattern: '^([a-zA-Z0-9]+)+$',
        adversarialInput: 'a'.repeat(30) + '!',
        safeTimeoutMs: 50
      },
      {
        id: 'PATHO-REDOS-OVERLAPPING-OR',
        label: 'Exponential ReDoS pattern (a|aa)+$',
        pattern: '^(a|aa)+$',
        adversarialInput: 'a'.repeat(28) + 'X',
        safeTimeoutMs: 50
      }
    ],
    extremeStrings: [
      {
        id: 'PATHO-STR-EMPTY',
        label: 'Zero-length string',
        length: 0,
        content: ''
      },
      {
        id: 'PATHO-STR-1KB',
        label: '1KB repeating string',
        length: 1024,
        content: 'X'.repeat(1024)
      },
      {
        id: 'PATHO-STR-64KB',
        label: '64KB boundary string',
        length: 65536,
        content: 'Y'.repeat(65536)
      },
      {
        id: 'PATHO-STR-1MB',
        label: '1MB maximal string',
        length: 1048576,
        content: 'Z'.repeat(1048576)
      }
    ],
    bufferBoundaries: [
      {
        id: 'PATHO-BUF-ZERO',
        label: 'Zero-length Buffer',
        size: 0,
        buffer: Buffer.alloc(0)
      },
      {
        id: 'PATHO-BUF-OFF-BY-ONE-SLICE',
        label: 'Out-of-bounds slice attempt',
        buffer: Buffer.from([1, 2, 3, 4]),
        startOffset: 4,
        endOffset: 5
      },
      {
        id: 'PATHO-BUF-64KB',
        label: '64KB byte buffer boundary',
        size: 65536,
        buffer: Buffer.alloc(65536)
      }
    ]
  };
}

/**
 * Checks a string for confusable Unicode homoglyphs, zero-width characters, or bidi overrides.
 *
 * @param {string} str
 * @returns {{ suspicious: boolean, violations: string[] }}
 */
export function detectHomoglyphs(str) {
  if (typeof str !== 'string') return { suspicious: false, violations: [] };

  const violations = [];

  // Zero-width space, joiners, markers
  if (/[\u200B-\u200D\uFEFF]/.test(str)) {
    violations.push('Contains zero-width or invisible characters');
  }

  // Right-to-left override or directional formatting characters
  if (/[\u202A-\u202E\u2066-\u2069]/.test(str)) {
    violations.push('Contains bidirectional override control characters');
  }

  // Mixed script detection (e.g. Cyrillic + Latin)
  const hasLatin = /[a-zA-Z]/.test(str);
  const hasCyrillic = /[\u0400-\u04FF]/.test(str);
  const hasGreek = /[\u0370-\u03FF]/.test(str);

  if (hasLatin && (hasCyrillic || hasGreek)) {
    violations.push('Contains mixed-script confusable homoglyph characters (Latin + Cyrillic/Greek)');
  }

  // Fullwidth characters
  if (/[\uFF01-\uFF5E]/.test(str)) {
    violations.push('Contains fullwidth ASCII variants');
  }

  return {
    suspicious: violations.length > 0,
    violations
  };
}

/**
 * Evaluates regex matching safely without unbounded CPU lockup (ReDoS defense).
 *
 * @param {string|RegExp} pattern
 * @param {string} input
 * @param {number} timeoutMs
 * @returns {{ matched: boolean, timedOut: boolean, durationMs: number }}
 */
export function safeRegexEvaluate(pattern, input, timeoutMs = 100) {
  const reg = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const start = performance.now();

  // Guard against known catastrophic nested quantifiers before execution
  const patternSource = reg.source;
  const isHighRiskReDoS = /(\([^\)]+[+*]\)[+*]|\([^\)]+\|[^\)]+\)[+*])/.test(patternSource);

  if (isHighRiskReDoS && input.length > 25) {
    // Fail-closed defensive rejection of dangerous ReDoS payloads
    return {
      matched: false,
      timedOut: true,
      durationMs: performance.now() - start,
      rejectedAsDangerous: true
    };
  }

  let matched = false;
  try {
    matched = reg.test(input);
  } catch {
    matched = false;
  }

  const durationMs = performance.now() - start;
  return {
    matched,
    timedOut: durationMs > timeoutMs,
    durationMs,
    rejectedAsDangerous: false
  };
}

/**
 * High-level Adversarial Probe Generator coordinator class.
 */
export class AdversarialProbeGenerator {
  constructor(seed = 42) {
    this.seed = seed;
    this.rng = new SplitMix32(seed);
  }

  getExtremalArithmeticProbes(options) {
    return generateExtremalArithmeticProbes(options);
  }

  getUnsignedBoundaryProbes() {
    return generateUnsignedBoundaryProbes();
  }

  getIdentityAliasingProbes(options) {
    return generateIdentityAliasingProbes(options);
  }

  getZeroDivisorProbes() {
    return generateZeroDivisorProbes();
  }

  getNonCanonicalFloatProbes() {
    return generateNonCanonicalFloatProbes();
  }

  getPathologyProbes() {
    return generatePathologyProbes();
  }

  runDustSimulation(iterations) {
    return simulateDustDraining({ iterations: iterations || 10000 });
  }

  generateCustomProbes(count = 20) {
    const custom = [];
    for (let i = 0; i < count; i++) {
      const kind = this.rng.nextInt(0, 3);
      if (kind === 0) {
        // Random extremal BigInt
        const bits = [32, 64, 128][this.rng.nextInt(0, 2)];
        const maxVal = (1n << BigInt(bits)) - 1n;
        const randVal = this.rng.nextBigInt(0n, maxVal);
        custom.push({
          category: 'random_arithmetic',
          id: `CUST-ARITH-${i + 1}`,
          value: randVal,
          bits
        });
      } else if (kind === 1) {
        // Random transfer with occasional aliasing
        const isAliased = this.rng.nextFloat() < 0.25;
        const id1 = `acc_${this.rng.nextInt(1, 10)}`;
        const id2 = isAliased ? id1 : `acc_${this.rng.nextInt(11, 20)}`;
        custom.push({
          category: 'random_transfer',
          id: `CUST-XFER-${i + 1}`,
          from: id1,
          to: id2,
          amount: BigInt(this.rng.nextInt(1, 10000)),
          isAliased
        });
      } else {
        // Random zero-divisor or float test
        custom.push({
          category: 'random_division',
          id: `CUST-DIV-${i + 1}`,
          numerator: this.rng.nextInt(1, 100),
          denominator: this.rng.nextFloat() < 0.3 ? 0 : this.rng.nextInt(1, 10)
        });
      }
    }
    return custom;
  }
}

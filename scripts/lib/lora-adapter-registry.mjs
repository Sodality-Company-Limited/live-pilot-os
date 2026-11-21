/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧬 MULTI-AGENT POLICY LORA ADAPTER REGISTRY & MERGING ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Goal: G-UX-018
 * Epic: UX (Multimodal UX/UI Design Decision Making Layer)
 * 
 * Provides:
 * 1. LoRAAdapter: Parameter container enforcing zero-initialization invariant:
 *    B = 0, A ~ N(0, 1/sqrt(r)) ==> Delta W = (alpha / r) * (B @ A) == 0 at step 0.
 * 2. Merging Strategies:
 *    - linearMerge: Linear weighted average
 *    - tiesMerge: Trimming, Sign Election, Disjoint Merging
 *    - dareMerge: Drop and Rescale
 * 3. PersonaAdapterRegistry: Dynamic routing across all 12 specialist personas with
 *    sub-50ms adapter swapping latency.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

export const CANONICAL_PERSONAS = [
  'dark_pattern_ethics_watchdog',
  'accessibility_auditor',
  'design_systems_lead',
  'ergonomics_cognitive_critic',
  'enterprise_info_architect',
  'typography_scale_architect',
  'visual_balance_density',
  'interaction_choreographer',
  'motion_haptics_engineer',
  'color_contrast_specialist',
  'microcopy_tone_specialist',
  'i18n_multilocale_stylist'
];

/**
 * Creates a Float64 2D matrix of shape [rows, cols].
 */
export function createMatrix(rows, cols, fillVal = 0.0) {
  const m = new Array(rows);
  for (let r = 0; r < rows; r++) {
    m[r] = new Float64Array(cols).fill(fillVal);
  }
  return m;
}

/**
 * Standard matrix multiplication: A [R1, C1] x B [C1, C2] -> [R1, C2].
 */
export function matMul(A, B) {
  const r1 = A.length;
  const c1 = A[0].length;
  const c2 = B[0].length;
  const out = createMatrix(r1, c2, 0.0);

  for (let i = 0; i < r1; i++) {
    for (let k = 0; k < c1; k++) {
      const aVal = A[i][k];
      if (aVal === 0.0) continue;
      for (let j = 0; j < c2; j++) {
        out[i][j] += aVal * B[k][j];
      }
    }
  }
  return out;
}

/**
 * LoRA Adapter representation.
 */
export class LoRAAdapter {
  constructor({
    name,
    inFeatures = 64,
    outFeatures = 64,
    r = 16,
    alpha = 32,
    seed = null
  }) {
    this.name = name;
    this.inFeatures = inFeatures;
    this.outFeatures = outFeatures;
    this.r = r;
    this.alpha = alpha;
    this.scaling = alpha / r; // 2.0 default

    // Initialize: A ~ N(0, 1/sqrt(r)), B = 0
    this.loraA = createMatrix(r, inFeatures);
    this.loraB = createMatrix(outFeatures, r, 0.0); // Zero initialization invariant

    this.resetParameters(seed);
  }

  resetParameters(seed = null) {
    const std = 1.0 / Math.sqrt(this.r);
    let s = seed !== null ? seed : 123456789;

    // Simple deterministic pseudorandom normal generator (Box-Muller)
    const nextRandom = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    for (let i = 0; i < this.r; i++) {
      for (let j = 0; j < this.inFeatures; j += 2) {
        const u1 = Math.max(1e-15, nextRandom());
        const u2 = nextRandom();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        this.loraA[i][j] = z0 * std;
        if (j + 1 < this.inFeatures) {
          this.loraA[i][j + 1] = z1 * std;
        }
      }
    }

    // Strictly zero B
    for (let i = 0; i < this.outFeatures; i++) {
      this.loraB[i].fill(0.0);
    }
  }

  /**
   * Computes Delta W = scaling * (B @ A) [outFeatures, inFeatures].
   */
  computeDeltaW() {
    const BA = matMul(this.loraB, this.loraA);
    const out = createMatrix(this.outFeatures, this.inFeatures);
    for (let i = 0; i < this.outFeatures; i++) {
      for (let j = 0; j < this.inFeatures; j++) {
        out[i][j] = BA[i][j] * this.scaling;
      }
    }
    return out;
  }
}

/**
 * 1. Linear Weighted Average Merge: Delta W_merged = sum_i w_i * Delta W_i.
 */
export function linearMerge(adapters, weights = null) {
  if (!Array.isArray(adapters) || adapters.length === 0) {
    throw new Error('adapters must be a non-empty array');
  }

  const n = adapters.length;
  let normalizedWeights;
  if (!weights) {
    normalizedWeights = new Array(n).fill(1.0 / n);
  } else {
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0) throw new Error('Weights sum must be positive');
    normalizedWeights = weights.map(w => w / sumW);
  }

  const outRows = adapters[0].outFeatures;
  const inCols = adapters[0].inFeatures;
  const merged = createMatrix(outRows, inCols, 0.0);

  for (let idx = 0; idx < n; idx++) {
    const delta = adapters[idx].computeDeltaW();
    const w = normalizedWeights[idx];
    for (let r = 0; r < outRows; r++) {
      for (let c = 0; c < inCols; c++) {
        merged[r][c] += w * delta[r][c];
      }
    }
  }
  return merged;
}

/**
 * 2. TIES-Merging: Trimming, Sign Election, Disjoint Merge.
 */
export function tiesMerge(adapters, { density = 0.20, weights = null } = {}) {
  if (!Array.isArray(adapters) || adapters.length === 0) {
    throw new Error('adapters must be a non-empty array');
  }
  if (density <= 0.0 || density > 1.0) {
    throw new Error(`density must be in (0.0, 1.0], got ${density}`);
  }

  const n = adapters.length;
  let normalizedWeights;
  if (!weights) {
    normalizedWeights = new Array(n).fill(1.0 / n);
  } else {
    const sumW = weights.reduce((a, b) => a + b, 0);
    normalizedWeights = weights.map(w => w / sumW);
  }

  const outRows = adapters[0].outFeatures;
  const inCols = adapters[0].inFeatures;
  const totalParams = outRows * inCols;
  const k = Math.max(1, Math.floor(totalParams * density));

  // Step 1: Trimming per adapter (keep top k by magnitude)
  const trimmedDeltas = adapters.map(adapter => {
    const delta = adapter.computeDeltaW();
    // Gather all magnitudes
    const values = [];
    for (let r = 0; r < outRows; r++) {
      for (let c = 0; c < inCols; c++) {
        values.push({ mag: Math.abs(delta[r][c]), val: delta[r][c], r, c });
      }
    }
    values.sort((a, b) => b.mag - a.mag);
    const threshold = values[k - 1].mag;

    const trimmed = createMatrix(outRows, inCols, 0.0);
    for (let r = 0; r < outRows; r++) {
      for (let c = 0; c < inCols; c++) {
        if (Math.abs(delta[r][c]) >= threshold) {
          trimmed[r][c] = delta[r][c];
        }
      }
    }
    return trimmed;
  });

  // Step 2: Elect Majority Sign coordinate-wise
  const majoritySign = createMatrix(outRows, inCols, 1.0);
  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < inCols; c++) {
      let vote = 0.0;
      for (let i = 0; i < n; i++) {
        vote += normalizedWeights[i] * trimmedDeltas[i][r][c];
      }
      majoritySign[r][c] = vote >= 0.0 ? 1.0 : -1.0;
    }
  }

  // Step 3: Disjoint Merge (average values sharing majority sign)
  const merged = createMatrix(outRows, inCols, 0.0);
  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < inCols; c++) {
      const sign = majoritySign[r][c];
      let sumMatching = 0.0;
      let countMatchingWeight = 0.0;

      for (let i = 0; i < n; i++) {
        const val = trimmedDeltas[i][r][c];
        const valSign = val >= 0.0 ? 1.0 : -1.0;
        if (val !== 0.0 && valSign === sign) {
          sumMatching += normalizedWeights[i] * val;
          countMatchingWeight += normalizedWeights[i];
        }
      }

      if (countMatchingWeight > 0.0) {
        merged[r][c] = sumMatching / countMatchingWeight;
      }
    }
  }

  return merged;
}

/**
 * 3. DARE Merge: Drop And REScale.
 */
export function dareMerge(adapters, { dropRate = 0.50, weights = null, seed = 42 } = {}) {
  if (!Array.isArray(adapters) || adapters.length === 0) {
    throw new Error('adapters must be a non-empty array');
  }
  if (dropRate < 0.0 || dropRate >= 1.0) {
    throw new Error(`dropRate must be in [0.0, 1.0), got ${dropRate}`);
  }

  const n = adapters.length;
  let normalizedWeights;
  if (!weights) {
    normalizedWeights = new Array(n).fill(1.0 / n);
  } else {
    const sumW = weights.reduce((a, b) => a + b, 0);
    normalizedWeights = weights.map(w => w / sumW);
  }

  const outRows = adapters[0].outFeatures;
  const inCols = adapters[0].inFeatures;
  const rescale = dropRate > 0.0 ? 1.0 / (1.0 - dropRate) : 1.0;

  let s = seed;
  const pseudoRand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };

  const merged = createMatrix(outRows, inCols, 0.0);
  for (let idx = 0; idx < n; idx++) {
    const delta = adapters[idx].computeDeltaW();
    const w = normalizedWeights[idx];

    for (let r = 0; r < outRows; r++) {
      for (let c = 0; c < inCols; c++) {
        const keep = pseudoRand() > dropRate;
        if (keep) {
          merged[r][c] += w * delta[r][c] * rescale;
        }
      }
    }
  }

  return merged;
}

/**
 * Registry holding all 12 specialist persona adapters and dynamic synthesis engine.
 */
export class PersonaAdapterRegistry {
  constructor({ inFeatures = 64, outFeatures = 64, r = 16, alpha = 32 } = {}) {
    this.inFeatures = inFeatures;
    this.outFeatures = outFeatures;
    this.r = r;
    this.alpha = alpha;
    this.adapters = new Map();

    // Initialize all 12 personas with unique seeds
    for (let i = 0; i < CANONICAL_PERSONAS.length; i++) {
      const persona = CANONICAL_PERSONAS[i];
      const adapter = new LoRAAdapter({
        name: persona,
        inFeatures,
        outFeatures,
        r,
        alpha,
        seed: 1000 + i * 17
      });
      // Set non-zero trained B weights to simulate calibrated policy
      for (let row = 0; row < outFeatures; row++) {
        for (let col = 0; col < r; col++) {
          adapter.loraB[row][col] = Math.sin(row + col + i) * 0.05;
        }
      }
      this.adapters.set(persona, adapter);
    }
  }

  getAdapter(personaId) {
    if (!this.adapters.has(personaId)) {
      throw new Error(`Persona adapter "${personaId}" not registered.`);
    }
    return this.adapters.get(personaId);
  }

  /**
   * Synthesize multi-agent team policy and measure dynamic swapping latency.
   */
  synthesizeTeamAdapter(participatingPersonas, { strategy = 'ties', density = 0.20, dropRate = 0.50 } = {}) {
    const startTime = performance.now();

    const selected = participatingPersonas.map(p => this.getAdapter(p));
    let mergedDelta;

    if (strategy === 'linear') {
      mergedDelta = linearMerge(selected);
    } else if (strategy === 'ties') {
      mergedDelta = tiesMerge(selected, { density });
    } else if (strategy === 'dare') {
      mergedDelta = dareMerge(selected, { dropRate });
    } else {
      throw new Error(`Unsupported strategy: ${strategy}`);
    }

    const durationMs = performance.now() - startTime;
    return {
      mergedDelta,
      strategy,
      participatingCount: participatingPersonas.length,
      durationMs,
      underLatencySla: durationMs < 50.0 // SLA: sub-50ms
    };
  }
}

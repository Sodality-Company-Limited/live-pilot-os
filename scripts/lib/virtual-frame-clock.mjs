/**
 * Deterministic Virtual Frame Clock & Seeded PRNG Harness
 * Invariants:
 * 1. Discrete frame progression without wall-clock dependency.
 * 2. Deterministic pseudo-random number generator (Mulberry32) for reproducible animation tests.
 * 3. Exact bidirectional conversion between frame indices and elapsed milliseconds.
 */

export class VirtualFrameClock {
  constructor(options = {}) {
    this.fps = options.fps || 60;
    this.currentFrame = 0;
  }

  get elapsedMs() {
    return Math.round((this.currentFrame / this.fps) * 1000);
  }

  advanceFrames(count = 1) {
    if (count < 0) {
      throw new Error(`Cannot advance negative frames: ${count}`);
    }
    this.currentFrame += count;
    return this.currentFrame;
  }

  advanceToMs(targetMs) {
    const targetFrame = calculateFrameFromMs(targetMs, this.fps);
    if (targetFrame < this.currentFrame) {
      throw new Error(`Cannot advance backwards in time: current frame ${this.currentFrame} > target frame ${targetFrame}`);
    }
    this.currentFrame = targetFrame;
    return this.currentFrame;
  }

  reset() {
    this.currentFrame = 0;
  }
}

/**
 * Creates a deterministic 32-bit seeded pseudo-random number generator (Mulberry32).
 * Returns floating-point values in [0, 1).
 * @param {number} seed 
 * @returns {() => number}
 */
export function createSeededPRNG(seed) {
  let s = Math.floor(seed) >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps milliseconds to the nearest integer frame.
 * @param {number} ms 
 * @param {number} fps 
 * @returns {number}
 */
export function calculateFrameFromMs(ms, fps = 60) {
  return Math.round((ms / 1000) * fps);
}

/**
 * Maps a frame index to elapsed milliseconds.
 * @param {number} frame 
 * @param {number} fps 
 * @returns {number}
 */
export function calculateMsFromFrame(frame, fps = 60) {
  return Math.round((frame / fps) * 1000);
}

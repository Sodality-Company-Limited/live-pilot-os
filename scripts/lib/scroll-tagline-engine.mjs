/**
 * Scroll Tagline Reveal Engine
 * Grounded in elayadesign landing page design invariants:
 * - Standalone scroll-driven benefit/thesis reveal section
 * - Words activate one-by-one as user scrolls past threshold
 * - Deterministic word state evaluation based on scroll progress [0, 1]
 */

/**
 * Splits text into clean word tokens.
 * @param {string} text 
 * @returns {string[]}
 */
export function parseTaglineWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Computes active states for words given a scroll progress ratio [0, 1].
 * @param {string} text 
 * @param {number} scrollProgress 
 * @returns {{ totalWords: number, activeWordCount: number, words: Array<{ word: string, active: boolean, index: number }> }}
 */
export function computeScrollTaglineActivation(text, scrollProgress) {
  const words = parseTaglineWords(text);
  const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
  const activeWordCount = Math.round(clampedProgress * words.length);

  const wordStates = words.map((word, idx) => ({
    word,
    index: idx,
    active: idx < activeWordCount
  }));

  return {
    totalWords: words.length,
    activeWordCount,
    words: wordStates
  };
}

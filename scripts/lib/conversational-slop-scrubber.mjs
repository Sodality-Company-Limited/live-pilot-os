/**
 * Conversational Slop Scrubber
 * Scrubs sycophantic pleasantries, conversational filler, and speculative apologetic text from agent streams.
 */

export const SLOP_PATTERNS = [
  /^(?:sure|certainly|absolutely|of course)[,!.]?\s*/i,
  /^(?:i would be happy to help!|i would be happy to|allow me to)[,!.]?\s*/i,
  /^(?:as requested|per your instructions)[,!.]?\s*/i,
  /^(?:i apologize for the confusion|sorry about that)[,!.]?\s*/i,
  /\b(?:hope this helps|let me know if you have any questions|feel free to ask)[.!]*\s*$/i
];

export function scrubConversationalSlop(text) {
  if (typeof text !== 'string') {
    return {
      valid: false,
      error: 'text must be a string'
    };
  }

  let cleaned = text;
  let matchesCount = 0;
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of SLOP_PATTERNS) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        matchesCount++;
        changed = true;
      }
    }
  }

  return {
    valid: true,
    protocol: 'UNSLOP_PROSE_AND_CODE',
    originalLength: text.length,
    cleanedLength: cleaned.length,
    slopPatternsMatched: matchesCount,
    cleanedText: cleaned
  };
}

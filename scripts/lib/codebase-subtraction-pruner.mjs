/**
 * Codebase Subtraction Pruner
 * Identifies dead wrappers, redundant pass-through methods, and empty abstraction layers for pruning.
 */

export function auditCodebaseSubtraction(fileContent) {
  if (typeof fileContent !== 'string') {
    return {
      valid: false,
      error: 'fileContent must be a string'
    };
  }

  const lines = fileContent.split('\n');
  const candidatesForPruning = [];

  // Detect redundant pass-through functions (functions whose only statement is calling another function with same args)
  const passThroughRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{\s*return\s+([a-zA-Z0-9_$]+)\s*\(\2\);\s*\}/;

  // Detect empty classes/wrappers
  const emptyClassRegex = /class\s+([a-zA-Z0-9_$]+)\s*\{\s*\}/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ptMatch = passThroughRegex.exec(line);
    if (ptMatch) {
      candidatesForPruning.push({
        type: 'redundant-pass-through',
        identifier: ptMatch[1],
        target: ptMatch[3],
        line: i + 1
      });
    }

    const ecMatch = emptyClassRegex.exec(line);
    if (ecMatch) {
      candidatesForPruning.push({
        type: 'empty-class-wrapper',
        identifier: ecMatch[1],
        line: i + 1
      });
    }
  }

  return {
    valid: true,
    protocol: 'SUBTRACT_BEFORE_YOU_ADD',
    pruningCandidatesCount: candidatesForPruning.length,
    candidates: candidatesForPruning,
    clean: candidatesForPruning.length === 0
  };
}

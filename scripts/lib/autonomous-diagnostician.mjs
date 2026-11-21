/**
 * @file autonomous-diagnostician.mjs
 * @description Autonomous failure isolation, stack trace parsing, and hypothesis matrix engine.
 * Employs deterministic regex token parsing, structured hypothesis generation, and integer confidence scoring.
 */

/**
 * Parses raw error output, stack traces, and test assertion failures into a structured failure context.
 * @param {string} text - Raw stack trace or terminal output.
 * @returns {object} Structured failure context.
 */
export function parseFailureContext(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Error input must be a string');
  }

  // 1. Extract error type and message: e.g. "AssertionError [ERR_ASSERTION]: Expected..."
  const headerMatch = text.match(/^([A-Za-z0-9_]+(?:\s*\[[^\]]+\])?):\s*(.*)$/m);
  const errorType = headerMatch ? headerMatch[1].split(' ')[0] : 'UnknownError';
  const message = headerMatch ? headerMatch[2].trim() : text.split('\n')[0].trim();

  // 2. Extract stack frames: e.g. "at TestContext.<anonymous> (file:///Users/...:24:10)" or "at /Users/...:15:3"
  const frames = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*at (?:(.+?)\s+\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))$/);
    if (m) {
      let rawPath = m[2] || m[5];
      const lineNum = parseInt(m[3] || m[6], 10);
      const colNum = parseInt(m[4] || m[7], 10);
      let filePath = rawPath;
      if (filePath.startsWith('file:///')) {
        filePath = filePath.replace('file://', '');
      }
      frames.push({
        file: filePath,
        line: lineNum,
        column: colNum
      });
    }
  }

  const primaryFrame = frames[0] || { file: 'unknown', line: 1, column: 1 };

  return {
    errorType,
    message,
    targetFile: primaryFrame.file,
    targetLine: primaryFrame.line,
    targetColumn: primaryFrame.column,
    frames
  };
}

/**
 * Generates structured, falsifiable diagnostic hypotheses from a failure context.
 * @param {object} context - Output from parseFailureContext.
 * @returns {Array<object>} Hypothesis matrix with test probes.
 */
export function generateHypothesisMatrix(context) {
  const hypotheses = [];

  switch (context.errorType) {
    case 'AssertionError':
      hypotheses.push({
        id: 'HYP-01',
        category: 'assertion_mismatch',
        hypothesis: `Test expectation diverged from actual returned value at ${context.targetFile}:${context.targetLine}`,
        probeCommand: `node --test ${context.targetFile}`,
        falsificationCriteria: 'Returned value matches expected invariant',
        confidenceScoreBasisPoints: 8500
      });
      hypotheses.push({
        id: 'HYP-02',
        category: 'test_fixture_staleness',
        hypothesis: `Test fixture or mock data does not reflect current schema contract`,
        probeCommand: `git diff HEAD -- ${context.targetFile}`,
        falsificationCriteria: 'No recent modifications to fixture file',
        confidenceScoreBasisPoints: 6000
      });
      break;

    case 'ReferenceError':
      hypotheses.push({
        id: 'HYP-01',
        category: 'missing_symbol_export',
        hypothesis: `Symbol referenced at ${context.targetFile}:${context.targetLine} is not exported or in scope`,
        probeCommand: `grep -rn "${context.message.split(' ')[0]}" ${context.targetFile}`,
        falsificationCriteria: 'Symbol declaration found in local module scope',
        confidenceScoreBasisPoints: 9500
      });
      hypotheses.push({
        id: 'HYP-02',
        category: 'cyclical_import_dependency',
        hypothesis: `Circular dependency resulted in an undefined imported reference`,
        probeCommand: `node scripts/harness/git-stack-orchestrator.mjs --check-cycles`,
        falsificationCriteria: 'Zero cycles in module import graph',
        confidenceScoreBasisPoints: 4000
      });
      break;

    case 'TypeError':
      hypotheses.push({
        id: 'HYP-01',
        category: 'null_undefined_dereference',
        hypothesis: `Accessed property on undefined or null target object at ${context.targetFile}:${context.targetLine}`,
        probeCommand: `node --test ${context.targetFile}`,
        falsificationCriteria: 'Target object is non-null before property access',
        confidenceScoreBasisPoints: 9000
      });
      hypotheses.push({
        id: 'HYP-02',
        category: 'contract_type_inversion',
        hypothesis: `Function received an unexpected argument type contrary to schema specification`,
        probeCommand: `node scripts/harness/verification-orchestrator-harness.mjs`,
        falsificationCriteria: 'Arguments conform to declared schema contract',
        confidenceScoreBasisPoints: 7000
      });
      break;

    default:
      hypotheses.push({
        id: 'HYP-01',
        category: 'generic_runtime_exception',
        hypothesis: `Unhandled runtime exception encountered at ${context.targetFile}:${context.targetLine}`,
        probeCommand: `node --test ${context.targetFile}`,
        falsificationCriteria: 'Command exits with code 0',
        confidenceScoreBasisPoints: 7500
      });
      hypotheses.push({
        id: 'HYP-02',
        category: 'dependency_or_environment_divergence',
        hypothesis: `Subprocess or runtime environment diverged from expected baseline`,
        probeCommand: `node -v`,
        falsificationCriteria: 'Runtime version matches specification',
        confidenceScoreBasisPoints: 5000
      });
      break;
  }

  return hypotheses;
}

/**
 * Ranks and evaluates diagnostic hypotheses by confidence score.
 * @param {Array<object>} hypotheses - Hypothesis matrix.
 * @returns {object} Ranked evaluation with top candidate.
 */
export function evaluateDiagnosticProbes(hypotheses) {
  if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
    throw new Error('Hypotheses must be a non-empty array');
  }

  const sorted = [...hypotheses].sort(
    (a, b) => b.confidenceScoreBasisPoints - a.confidenceScoreBasisPoints
  );

  return {
    topHypothesis: sorted[0],
    rankedHypotheses: sorted,
    count: sorted.length
  };
}

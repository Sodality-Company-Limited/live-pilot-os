/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🪞 SODA OS SOCRATIC REFLECTION ENGINE & BLINDSPOT SCANNER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Automated Socratic blindspot self-interrogation and assumption reflection
 *          for code diffs and plans against Article I-VI invariants.
 * Invariants: Zero Mocks (Article I), Determinism (INV-037-001),
 *             Completeness (INV-037-002)
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const REFLECTION_STATES = Object.freeze({
  DIFF_PARSED: 'DiffParsed',
  RULES_LOADED: 'RulesLoaded',
  PATTERNS_EVALUATED: 'PatternsEvaluated',
  BLINDSPOTS_SCORED: 'BlindspotsScored',
  REPORT_GENERATED: 'ReportGenerated'
});

export const VALID_REFLECTION_TRANSITIONS = Object.freeze({
  [REFLECTION_STATES.DIFF_PARSED]: [REFLECTION_STATES.RULES_LOADED],
  [REFLECTION_STATES.RULES_LOADED]: [REFLECTION_STATES.PATTERNS_EVALUATED],
  [REFLECTION_STATES.PATTERNS_EVALUATED]: [REFLECTION_STATES.BLINDSPOTS_SCORED],
  [REFLECTION_STATES.BLINDSPOTS_SCORED]: [REFLECTION_STATES.REPORT_GENERATED],
  [REFLECTION_STATES.REPORT_GENERATED]: []
});

export function transitionReflectionState(fromState, toState) {
  const allowed = VALID_REFLECTION_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidReflectionStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

export const BLINDSPOT_RULES = Object.freeze([
  {
    id: 'FLOAT_ARITHMETIC_DETECTED',
    name: 'Floating-Point Arithmetic Invariant Violation (Article VI)',
    regex: /(?:\d+\.\d+|\b(?:parseFloat|f32|f64|Double|Float)\b)/,
    severity: 'HIGH',
    weight: 30,
    suggestion: 'Use exact BigInt integer arithmetic with Money Value Objects (scale exponent parameterization).'
  },
  {
    id: 'EMPTY_CATCH_BLOCK',
    name: 'Silent Error Swallowing',
    regex: /catch\s*\([^)]*\)\s*\{\s*(?:\/\*.*?\*\/)?\s*\}/,
    severity: 'HIGH',
    weight: 25,
    suggestion: 'Implement fail-closed error handling or re-throw with context; never swallow exceptions silently.'
  },
  {
    id: 'STUB_OR_PLACEHOLDER_FOUND',
    name: 'Stub / Placeholder / Mock Violation (Article I)',
    regex: /\b(?:todo!\(\)|unimplemented!\(\)|\bmock[A-Z0-9_]*\b|\bplaceholder\b)/i,
    severity: 'CRITICAL',
    weight: 40,
    suggestion: 'All code must be 100% operational; eliminate mocks, stubs, and unimplemented placeholders.'
  },
  {
    id: 'UNBOUNDED_RETRY_LOOP',
    name: 'Unbounded Loop Without Max Ceiling',
    regex: /\bwhile\s*\(\s*true\s*\)(?![\s\S]{0,100}\bbreak\b)/,
    severity: 'MEDIUM',
    weight: 15,
    suggestion: 'Bind loops to strict integer iteration ceilings ($i \le N_{\text{max}}$).'
  }
]);

/**
 * Scans a code diff string for potential blindspots and invariant violations.
 * Strictly deterministic (INV-037-001) and complete across registered rules (INV-037-002).
 */
export function scanBlindspots(diffContent = '', customRules = null) {
  const rules = customRules || BLINDSPOT_RULES;
  const findings = [];
  const lines = diffContent.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    // Inspect added lines in diff or whole file if raw
    const isAddition = line.startsWith('+') || !line.startsWith('-');
    if (!isAddition) continue;

    for (const rule of rules) {
      if (rule.regex.test(line)) {
        findings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          weight: rule.weight,
          line: lineIdx + 1,
          snippet: line.trim(),
          suggestion: rule.suggestion
        });
      }
    }
  }

  return findings;
}

/**
 * Evaluates assumptions and blindspots across a diff, calculating a bounded integer risk score (0 to 100).
 */
export function evaluateAssumptions(diffContent = '', customRules = null) {
  let state = REFLECTION_STATES.DIFF_PARSED;
  state = transitionReflectionState(state, REFLECTION_STATES.RULES_LOADED);

  state = transitionReflectionState(state, REFLECTION_STATES.PATTERNS_EVALUATED);
  const findings = scanBlindspots(diffContent, customRules);

  state = transitionReflectionState(state, REFLECTION_STATES.BLINDSPOTS_SCORED);
  const rawScore = findings.reduce((acc, f) => acc + (f.weight || 0), 0);
  const riskScore = Math.min(100, Math.max(0, rawScore));

  return {
    status: state,
    riskScore,
    findingCount: findings.length,
    findings,
    isClean: findings.length === 0
  };
}

/**
 * Formats evaluation results into a structured Socratic reflection report.
 */
export function formatReflectionReport(evaluation) {
  const lines = [];
  lines.push('## Socratic Assumption & Blindspot Reflection Report');
  lines.push(`- **Risk Score:** ${evaluation.riskScore} / 100`);
  lines.push(`- **Status:** ${evaluation.isClean ? '✅ CLEAN' : '⚠️ ATTENTION REQUIRED'}`);
  lines.push(`- **Total Findings:** ${evaluation.findingCount}`);
  lines.push('');

  if (evaluation.findings.length > 0) {
    lines.push('### Identified Blindspots');
    for (const f of evaluation.findings) {
      lines.push(`- **[${f.severity}]** ${f.ruleName} (Line ${f.line})`);
      lines.push(`  - *Snippet:* \`${f.snippet}\``);
      lines.push(`  - *Remediation:* ${f.suggestion}`);
    }
  } else {
    lines.push('No critical blindspots or ungrounded assumptions identified.');
  }

  return lines.join('\n');
}

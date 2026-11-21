/**
 * Two-Stage Subagent Review Evaluator
 * Stage 1: Specification Compliance Gate (reviewer-spec-compliance)
 * Stage 2: Code Quality & Security Gate (reviewer-code-quality)
 */

export function evaluateStage1SpecCompliance(goalContext, diffSummary) {
  const findings = [];
  if (!goalContext || !goalContext.acceptance_criteria || goalContext.acceptance_criteria.length === 0) {
    findings.push('Goal context is missing acceptance criteria');
  }

  if (!diffSummary || !diffSummary.touched_files || diffSummary.touched_files.length === 0) {
    findings.push('Diff contains no touched files');
  }

  const approved = findings.length === 0;
  return {
    stage: 'stage_1_spec_compliance',
    persona: 'reviewer-spec-compliance',
    approved,
    findings
  };
}

export function evaluateStage2CodeQuality(diffSummary) {
  const findings = [];
  if (!diffSummary) {
    findings.push('Diff summary is required for Stage 2 review');
    return {
      stage: 'stage_2_code_quality',
      persona: 'reviewer-code-quality',
      approved: false,
      findings
    };
  }

  // Check for forbidden stubs/mocks
  const stubPatterns = [/\btodo!\(\)/, /\bunimplemented!\(\)/, /\/\/\s*TODO:\s*(stub|mock|dummy|placeholder)/i];
  if (diffSummary.file_contents) {
    for (const [file, content] of Object.entries(diffSummary.file_contents)) {
      for (const pattern of stubPatterns) {
        if (pattern.test(content)) {
          findings.push(`File ${file} contains forbidden mock/stub pattern matching ${pattern}`);
        }
      }
    }
  }

  const approved = findings.length === 0;
  return {
    stage: 'stage_2_code_quality',
    persona: 'reviewer-code-quality',
    approved,
    findings
  };
}

export function executeTwoStageReview(goalContext, diffSummary) {
  const stage1 = evaluateStage1SpecCompliance(goalContext, diffSummary);
  if (!stage1.approved) {
    return {
      approved: false,
      current_stage: stage1.stage,
      stage1,
      stage2: null,
      reason: 'Stage 1 (Spec Compliance) failed; Stage 2 skipped.'
    };
  }

  const stage2 = evaluateStage2CodeQuality(diffSummary);
  return {
    approved: stage2.approved,
    current_stage: stage2.stage,
    stage1,
    stage2,
    reason: stage2.approved ? 'Both Stage 1 and Stage 2 review gates approved.' : 'Stage 2 (Code Quality) failed.'
  };
}

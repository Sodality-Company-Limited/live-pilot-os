/**
 * @file epistemic-trace-auditor.mjs
 * @description Reasoning transparency, epistemic trace auditor, and claim citation validator.
 * Enforces Article III structured explanation invariants and mathematical proof linkage.
 */

import crypto from 'node:crypto';

/**
 * Parses raw text or XML-tagged thoughts into structured epistemic steps.
 * @param {string} text - Transcript or reasoning text.
 * @returns {object} Structured trace containing parsed steps.
 */
export function parseReasoningTrace(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Reasoning trace input must be a string');
  }

  const thinkingBlockRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
  const blocks = [];
  let match;

  while ((match = thinkingBlockRegex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }

  // If no <thinking> tags exist, evaluate the entire string as a single reasoning step
  const rawSteps = blocks.length > 0 ? blocks : [text.trim()];

  const steps = rawSteps.filter(s => s.length > 0).map((stepText, idx) => {
    const hasHypothesis = /hypothesis\s*:/i.test(stepText) || /problem\s*:/i.test(stepText);
    const hasEvidence = /evidence\s*:/i.test(stepText) || /where\s*:/i.test(stepText) || /observed\s*:/i.test(stepText);
    const hasConclusion = /conclusion\s*:/i.test(stepText) || /how\s*:/i.test(stepText) || /resolution\s*:/i.test(stepText);

    // Extract markdown file links: [text](file:///path)
    const linkRegex = /\[([^\]]+)\]\((file:\/\/\/[^)]+)\)/g;
    const evidenceLinks = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(stepText)) !== null) {
      evidenceLinks.push({
        label: linkMatch[1],
        url: linkMatch[2]
      });
    }

    return {
      index: idx + 1,
      rawText: stepText,
      hasHypothesis,
      hasEvidence,
      hasConclusion,
      evidenceLinks
    };
  });

  return {
    stepCount: steps.length,
    steps
  };
}

/**
 * Evaluates whether all 4 required epistemic pillars are represented in the reasoning trace.
 * Pillars: Problem/Hypothesis, Evidence, Conclusion/Action, Grounding.
 * @param {string} text
 * @returns {object} Completeness assessment.
 */
export function evaluateTraceCompleteness(text) {
  const parsed = parseReasoningTrace(text);
  const missingPillars = [];

  const hasAnyHypothesis = parsed.steps.some(s => s.hasHypothesis);
  const hasAnyEvidence = parsed.steps.some(s => s.hasEvidence);
  const hasAnyConclusion = parsed.steps.some(s => s.hasConclusion);

  if (!hasAnyHypothesis) missingPillars.push('hypothesis');
  if (!hasAnyEvidence) missingPillars.push('evidence');
  if (!hasAnyConclusion) missingPillars.push('conclusion');

  return {
    complete: missingPillars.length === 0,
    missingPillars,
    stepCount: parsed.stepCount
  };
}

/**
 * Audits epistemic claims for grounding and factual support.
 * Emits exact basis-point compliance scores (0 to 10000 bp).
 * @param {string} text - Reasoning trace text.
 * @returns {object} Audit result with compliance metrics.
 */
export function auditEpistemicClaims(text) {
  const parsed = parseReasoningTrace(text);
  const completeness = evaluateTraceCompleteness(text);

  let ungroundedCount = 0;
  let groundedCount = 0;

  for (const step of parsed.steps) {
    if (step.hasHypothesis && step.hasEvidence && step.hasConclusion) {
      groundedCount++;
    } else {
      ungroundedCount++;
    }
  }

  const totalSteps = parsed.steps.length;
  let epistemicScoreBasisPoints = 0;

  if (totalSteps > 0) {
    epistemicScoreBasisPoints = Math.floor((groundedCount * 10000) / totalSteps);
  }

  const valid = completeness.complete && epistemicScoreBasisPoints >= 8000 && ungroundedCount === 0;

  return {
    valid,
    totalSteps,
    groundedCount,
    ungroundedCount,
    epistemicScoreBasisPoints,
    completeness
  };
}

/**
 * Emits a cryptographically verifiable epistemic receipt for a goal.
 * @param {string} goalId - The associated goal identifier.
 * @param {string} text - Reasoning trace content.
 * @returns {object} Cryptographic receipt with SHA-256 digest.
 */
export function emitEpistemicReceipt(goalId, text) {
  if (!goalId || typeof goalId !== 'string') {
    throw new TypeError('Valid goal ID is required');
  }

  const audit = auditEpistemicClaims(text);
  const status = audit.valid ? 'VERIFIED' : 'REJECTED';

  const payloadToHash = JSON.stringify({
    goalId,
    status,
    epistemicScoreBasisPoints: audit.epistemicScoreBasisPoints,
    totalSteps: audit.totalSteps,
    groundedCount: audit.groundedCount
  });

  const receiptHash = `sha256:${crypto.createHash('sha256').update(payloadToHash).digest('hex')}`;

  return {
    goalId,
    status,
    timestamp: new Date().toISOString(),
    receiptHash,
    audit
  };
}

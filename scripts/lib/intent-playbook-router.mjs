/**
 * @file intent-playbook-router.mjs
 * @description Deterministic task intent classifier, skill trigger matcher, and BDD scenario generator.
 * Analyzes unstructured user prompts, scores matching registered agent skills with exact integer basis points,
 * sorts candidates in monotonic non-ascending order, and emits executable BDD specifications.
 */

/**
 * Classifies user prompt intent against registered skills catalog.
 * @param {string} prompt - Raw user prompt.
 * @param {Array<object>} skills - Array of skill descriptors ({ name, description, triggers }).
 * @param {object} [options]
 * @param {number} [options.minConfidenceBasisPoints=1000] - Minimum score threshold.
 * @returns {object} Classification result with ranked matches.
 */
export function classifyTaskIntent(prompt, skills, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    return { status: 'unmatched', matches: [] };
  }

  const minConfidence = options.minConfidenceBasisPoints || 1000;
  const normalizedPrompt = prompt.toLowerCase();
  const scoredMatches = [];

  for (const skill of skills) {
    let score = 0;

    // Direct trigger phrase matching (+2500 bp per phrase)
    for (const trigger of skill.triggers || []) {
      const normalizedTrigger = trigger.toLowerCase();
      if (normalizedPrompt.includes(normalizedTrigger)) {
        score += 2500;
      }
    }

    // Name keyword matching (+2000 bp)
    const nameKeywords = skill.name.replace(/^soda-/, '').split('-');
    for (const kw of nameKeywords) {
      if (kw.length > 2 && normalizedPrompt.includes(kw.toLowerCase())) {
        score += 1500;
      }
    }

    // Cap at 10000 bp
    const finalScore = Math.min(10000, score);

    if (finalScore >= minConfidence) {
      scoredMatches.push({
        skillName: skill.name,
        confidenceBasisPoints: finalScore,
        description: skill.description
      });
    }
  }

  // Monotonic sorting: strictly non-ascending by confidenceBasisPoints
  scoredMatches.sort((a, b) => b.confidenceBasisPoints - a.confidenceBasisPoints);

  if (scoredMatches.length === 0) {
    return {
      status: 'unmatched',
      matches: []
    };
  }

  return {
    status: 'matched',
    topMatch: scoredMatches[0],
    matches: scoredMatches
  };
}

/**
 * Ranks skill candidates and returns matches.
 * @param {Array<object>} matches - Array of candidate matches.
 * @returns {Array<object>} Sorted candidate matches.
 */
export function rankSkillCandidates(matches) {
  return [...matches].sort((a, b) => b.confidenceBasisPoints - a.confidenceBasisPoints);
}

/**
 * Generates an executable Given-When-Then BDD scenario skeleton for the top routed skill.
 * @param {string} prompt - Raw user prompt.
 * @param {object} topMatch - Selected match candidate.
 * @returns {string} Formatted BDD scenario text.
 */
export function generateBddSkeleton(prompt, topMatch) {
  return [
    `Feature: Autonomous Execution of ${topMatch.skillName}`,
    `  As an autonomous orchestrator`,
    `  I want to activate \`${topMatch.skillName}\``,
    `  So that developer intent is fulfilled without manual configuration`,
    '',
    `  Scenario: Execute routed playbook`,
    `    Given user intent: "${prompt.replace(/"/g, '\\"')}"`,
    `    When routed to skill \`${topMatch.skillName}\` with confidence ${topMatch.confidenceBasisPoints} bp`,
    `    Then execution proceeds with zero mocks and verified invariants.`
  ].join('\n') + '\n';
}

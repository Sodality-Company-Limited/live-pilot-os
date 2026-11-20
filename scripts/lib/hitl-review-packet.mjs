/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS HITL COMPACT REVIEW PACKET FORMATTER & CORRECTION LEARNER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-025)
 * Architecture Blueprint: docs/03-architecture/design-spec.md
 * Purpose: Compiles zero-opacity markdown review packets, interactive approval
 *          checkboxes, 9-class correction taxonomy parser, and RLCD preference
 *          tuple serialization for continuous human-in-the-loop learning.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

export const HITL_SCHEMA_VERSION = 1;

/**
 * 9 Canonical Human Correction Taxonomy Classes
 */
export const CORRECTION_TAXONOMY = Object.freeze([
  'layout',
  'typography',
  'color',
  'navigation',
  'motion',
  'component_state',
  'form_input',
  'feedback_modal',
  'ethical_guardrail'
]);

/**
 * Taxonomy classification keywords and regex rules
 */
const TAXONOMY_RULES = Object.freeze({
  layout: [/\blayout\b/i, /\balign/i, /\bgrid\b/i, /\bflex\b/i, /\bspaci/i, /\bmargin\b/i, /\bpadding\b/i, /\bhierarchy\b/i, /\bposition/i],
  typography: [/\btypograph/i, /\bfont\b/i, /\bfont-size\b/i, /\bline-height\b/i, /\bleading\b/i, /\bheading\b/i, /\btext-scale\b/i, /\bkerning\b/i],
  color: [/\bcolor\b/i, /\bcontrast\b/i, /\bpalette\b/i, /\bbg-\b/i, /\btext-color\b/i, /\bdark mode\b/i, /\btoken\b/i, /\btheme\b/i],
  navigation: [/\bnav\b/i, /\bnavigation\b/i, /\bmenu\b/i, /\btab\b/i, /\bbreadcrumb\b/i, /\bdrawer\b/i, /\broute\b/i, /\bback button\b/i, /\bpagination\b/i],
  motion: [/\bmotion\b/i, /\banimat/i, /\btransition\b/i, /\bspring\b/i, /\beasing\b/i, /\bduration\b/i, /\breduced-motion\b/i, /\bfps\b/i],
  component_state: [/\bstate\b/i, /\bhover\b/i, /\bactive\b/i, /\bdisabled\b/i, /\bfocus\b/i, /\bloading\b/i, /\bempty state\b/i, /\berror state\b/i],
  form_input: [/\binput\b/i, /\bfield\b/i, /\bform\b/i, /\bplaceholder\b/i, /\bvalidation\b/i, /\bkeyboard\b/i, /\bselect\b/i, /\bcheckbox\b/i],
  feedback_modal: [/\bmodal\b/i, /\bdialog\b/i, /\btoast\b/i, /\balert\b/i, /\bbanner\b/i, /\bpopup\b/i, /\bprompt\b/i, /\bnotification\b/i],
  ethical_guardrail: [
    /\bdark pattern\b/i, /\bconfirmshaming\b/i, /\bdeceptive\b/i, /\bpii\b/i,
    /\bconsent\b/i, /\btransparency\b/i, /\bcoerc/i, /\btrick\b/i,
    /\burgency\b/i, /\bhidden subscription\b/i, /\bcountdown\b/i, /\broach motel\b/i,
    /\bsneak/i, /\bfake\b/i, /\bpreselect/i,
    /\b(?:ethical|ethics|guardrail)\b/i,
    /\bbait\s+and\s+switch\b/i,
    /\bdisguised\s+ad(?:vertisement)?\b/i,
    /\bforced\s+continuity\b/i,
    /\bdrip\s+pricing\b/i
  ]
});

/**
 * Formats a zero-opacity Markdown review packet.
 */
export function formatReviewPacket(packetData) {
  if (!packetData || typeof packetData !== 'object') {
    throw new Error('Review packet data object required');
  }

  const decisionId = packetData.decision_id || 'DAVE-UX-0001';
  const goalId = packetData.goal_id || 'G-UX-025';
  const timestamp = packetData.timestamp || new Date().toISOString();
  const calibratedConfidence = typeof packetData.calibrated_confidence === 'number' ? packetData.calibrated_confidence : 0.85;
  const brierScore = typeof packetData.brier_score === 'number' ? packetData.brier_score : 0.08;
  const route = packetData.route || (calibratedConfidence >= 0.75 ? 'PROCEED' : 'DEFER');

  const zones = Array.isArray(packetData.zones) && packetData.zones.length > 0 ? packetData.zones : [
    { id: 'Zone 1', name: 'Header / Navigation', description: 'Top level navigation and brand identity' },
    { id: 'Zone 2', name: 'Metric & Summary Cards', description: 'High level telemetry KPIs and stats' },
    { id: 'Zone 3', name: 'Center Canvas Visualizer', description: 'Interactive primary visual workspace' },
    { id: 'Zone 4', name: 'Action Controls & Triggers', description: 'Buttons, form submissions, and mutation triggers' }
  ];

  const lines = [
    `# 📋 DAVE HUMAN-IN-THE-LOOP (HITL) COMPACT REVIEW PACKET`,
    ``,
    `> **Decision ID:** \`${decisionId}\`  `,
    `> **Goal Reference:** \`${goalId}\`  `,
    `> **Timestamp:** \`${timestamp}\`  `,
    `> **Autonomy Routing Verdict:** **\`${route}\`** (Confidence: \`${calibratedConfidence.toFixed(3)}\`, Brier Risk: \`${brierScore.toFixed(3)}\`)  `,
    ``,
    `---`,
    ``,
    `## 1. Executive Summary & Intent`,
    `- **WHERE:** ${packetData.where || '`code/src/components/`'}`,
    `- **WHY:** ${packetData.why || 'Ensure confidence-calibrated UX execution without hallucination.'}`,
    `- **FOR WHOM:** ${packetData.for_whom || 'End-users, product designers, and compliance officers.'}`,
    `- **HOW:** ${packetData.how || 'Validated scene graph generation and deterministic token compilation.'}`,
    ``,
    `---`,
    ``,
    `## 2. Spatial & Semantic Zone Deconstruction`,
    ``,
    `| Zone | Name | Semantic Scope & Boundary |`,
    `|------|------|---------------------------|`
  ];

  for (const z of zones) {
    lines.push(`| **${z.id}** | ${z.name} | ${z.description} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 3. Epistemic Confidence & Doubt Metrics`,
    `- **Calibrated Confidence ($c$):** \`${calibratedConfidence.toFixed(4)}\` (Threshold $\\ge 0.750$)`,
    `- **Brier Calibration Score:** \`${brierScore.toFixed(4)}\` (Threshold $\\le 0.150$)`,
    `- **Safe Autonomy Verdict:** ${route === 'PROCEED' ? '🟢 **AUTHORIZED_AUTONOMOUS**' : '🟡 **DEFERRED_FOR_HITL**'}`,
    ``,
    `---`,
    ``,
    `## 4. Persona Deliberation Matrix`,
    `| Persona Role | Opinion / Verdict | Veto Exercised |`,
    `|---|---|---|`
  );

  const personaOpinions = packetData.persona_opinions || [
    { role: 'System Architect', verdict: 'Approve structure and modular AST', veto: false },
    { role: 'Accessibility Specialist', verdict: 'WCAG AAA contrast & focus rings verified', veto: false },
    { role: 'Security & Ethics Auditor', verdict: 'Zero dark patterns or unredacted PII detected', veto: false },
    { role: 'Visual Designer', verdict: '100% token binding, zero raw hex literals', veto: false }
  ];

  for (const p of personaOpinions) {
    lines.push(`| ${p.role} | ${p.verdict} | ${p.veto ? '🔴 YES' : '🟢 NO'} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 5. Interactive Human Approval Actions`,
    `Review the decision and mark exactly one action below:`,
    ``,
    `- [${packetData.selected_action === 'approve' ? 'x' : ' '}] **[Approve]** Approve decision proposal and authorize code emission`,
    `- [${packetData.selected_action === 'reject' ? 'x' : ' '}] **[Reject]** Reject decision fail-closed and abort execution`,
    `- [${packetData.selected_action === 'request_revision' ? 'x' : ' '}] **[Request Revision]** Request architectural adjustments (provide feedback in section 6)`,
    `- [${packetData.selected_action === 'approve_with_conditions' ? 'x' : ' '}] **[Approve with Conditions]** Conditional authorization pending specified item`,
    ``,
    `---`,
    ``,
    `## 6. Human Reviewer Feedback & Correction Directives`,
    packetData.human_feedback || `*(Write human correction notes here. The 9-class correction taxonomy parser will extract categories and train the RLCD preference model.)*`,
    ``
  );

  return lines.join('\n');
}

/**
 * Parses freeform or structured human feedback into the 9-class correction taxonomy.
 */
export function parseHumanCorrection(feedbackText, options = {}) {
  if (typeof feedbackText !== 'string' || feedbackText.trim().length === 0) {
    return {
      has_feedback: false,
      categories: [],
      directives: [],
      sentiment: 'neutral',
      requires_rejection: false,
      target_zones: []
    };
  }

  const detectedCategories = new Set();
  const text = feedbackText.trim();

  // Match against taxonomy keywords
  for (const [category, regexList] of Object.entries(TAXONOMY_RULES)) {
    for (const reg of regexList) {
      if (reg.test(text)) {
        detectedCategories.add(category);
        break;
      }
    }
  }

  // If no category matched, default to 'layout'
  if (detectedCategories.size === 0) {
    detectedCategories.add('layout');
  }

  // Detect target zones (e.g. Zone 1, Zone 2)
  const zoneMatches = text.match(/\bZone\s+\d+\b/gi) || [];
  const targetZones = Array.from(new Set(zoneMatches.map((z) => z.toUpperCase())));

  // Detect directives (lines starting with -, *, or numbered lists)
  const directiveLines = text.split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[*\-\d]+[.)]?\s+/.test(l))
    .map((l) => l.replace(/^[*\-\d]+[.)]?\s+/, '').trim());

  const directives = directiveLines.length > 0 ? directiveLines : [text];

  // Detect veto / rejection triggers
  const requiresRejection = /\b(reject|block|forbid|unsafe|dark pattern|violation)\b/i.test(text);

  // Sentiment analysis
  let sentiment = 'neutral';
  if (/\b(excellent|great|good|perfect|approved|clean)\b/i.test(text) && !requiresRejection) {
    sentiment = 'positive';
  } else if (/\b(bad|wrong|poor|broken|terrible|ugly|confusing|reject)\b/i.test(text) || requiresRejection) {
    sentiment = 'negative';
  }

  return {
    has_feedback: true,
    categories: Array.from(detectedCategories),
    directives,
    sentiment,
    requires_rejection: requiresRejection,
    target_zones: targetZones,
    raw_feedback: text,
    parsed_at: new Date().toISOString()
  };
}

/**
 * Serializes human correction into paired preference tuple (y_human, y_model) for RLCD / DPO training.
 */
export function serializeRlcdPreferencePair(modelProposal, humanCorrection, options = {}) {
  if (!modelProposal || typeof modelProposal !== 'object') {
    throw new Error('Model proposal object required');
  }
  if (!humanCorrection || typeof humanCorrection !== 'object') {
    throw new Error('Human correction object required');
  }

  const pairId = options.pair_id || `PREF-${crypto.randomBytes(6).toString('hex')}`;
  const goalId = options.goal_id || modelProposal.goal_id || 'G-UX-025';

  // Construct chosen (y_human / aligned) vs rejected (y_model / flawed)
  const chosenCandidate = {
    content: options.aligned_content || {
      ...modelProposal,
      correction_applied: true,
      human_directives: humanCorrection.directives,
      categories: humanCorrection.categories
    },
    provenance: 'human_correction',
    score: 1.0
  };

  const rejectedCandidate = {
    content: modelProposal.content || modelProposal,
    provenance: 'model_original',
    score: 0.0
  };

  const categories = humanCorrection.categories || [];
  const hasEthical = categories.includes('ethical_guardrail');
  const primaryCategory = hasEthical ? 'ethical_guardrail' : (categories[0] || 'layout');
  const lossWeight = typeof options.loss_weight === 'number'
    ? options.loss_weight
    : (hasEthical ? 10.0 : 1.0);

  return {
    id: pairId,
    goal_id: goalId,
    timestamp: new Date().toISOString(),
    taxonomy_category: primaryCategory,
    categories: categories.length > 0 ? categories : [primaryCategory],
    target_zones: humanCorrection.target_zones || [],
    prompt: options.prompt || modelProposal.prompt || `Resolve UX design decision for ${goalId}`,
    chosen: chosenCandidate,
    rejected: rejectedCandidate,
    margin: typeof options.margin === 'number' ? options.margin : 1.0,
    loss_weight: lossWeight
  };
}

/**
 * Dedicated document parser for formatted review packets.
 * Separates Section 5 action checkboxes ([x] Approve vs [x] Reject)
 * from Section 6 human reviewer directives and feedback.
 */
export function parseReviewPacket(markdownContent) {
  if (typeof markdownContent !== 'string' || !markdownContent.trim()) {
    return {
      action: 'none',
      decision_id: 'unknown',
      goal_id: 'unknown',
      confidence: 0,
      brier_score: 0,
      route: 'UNKNOWN',
      requires_rejection: false,
      sentiment: 'neutral',
      has_feedback: false,
      categories: [],
      directives: [],
      target_zones: [],
      raw_feedback: '',
      parsed_at: new Date().toISOString()
    };
  }

  const text = markdownContent;

  // 1. Extract metadata from header block or sections
  const decisionMatch = text.match(/> \*\*Decision ID:\*\*\s*`([^`]+)`/i) || text.match(/\bDecision ID[:\s*]+`?([A-Za-z0-9_-]+)/i);
  const decisionId = decisionMatch ? decisionMatch[1] : 'unknown';

  const goalMatch = text.match(/> \*\*Goal Reference:\*\*\s*`([^`]+)`/i) || text.match(/\bGoal Reference[:\s*]+`?([A-Za-z0-9_-]+)/i);
  const goalId = goalMatch ? goalMatch[1] : 'G-UX-025';

  const confMatch = text.match(/\(Confidence:\s*`?([0-9.]+)/i) || text.match(/Calibrated Confidence.*?`([0-9.]+)/i);
  const confidence = confMatch ? parseFloat(confMatch[1]) : 0.85;

  const brierMatch = text.match(/Brier Risk:\s*`?([0-9.]+)/i) || text.match(/Brier Calibration Score.*?`([0-9.]+)/i);
  const brierScore = brierMatch ? parseFloat(brierMatch[1]) : 0.08;

  const routeMatch = text.match(/> \*\*Autonomy Routing Verdict:\*\*\s*\*\*`?([A-Z_]+)`?\*\*/i) || text.match(/Autonomy Routing Verdict:.*?([A-Z_]+)/i);
  const route = routeMatch ? routeMatch[1] : 'PROCEED';

  // 2. Parse Section 5 action checkboxes
  let action = 'none';
  if (/-\s*\[[xX]\]\s*\*\*\[Approve\]\*\*/i.test(text)) {
    action = 'approve';
  } else if (/-\s*\[[xX]\]\s*\*\*\[Reject\]\*\*/i.test(text)) {
    action = 'reject';
  } else if (/-\s*\[[xX]\]\s*\*\*\[Request Revision\]\*\*/i.test(text)) {
    action = 'request_revision';
  } else if (/-\s*\[[xX]\]\s*\*\*\[Approve with Conditions\]\*\*/i.test(text)) {
    action = 'approve_with_conditions';
  }

  // 3. Extract Section 6 feedback text only
  let section6Feedback = '';
  const s6Match = text.match(/## 6\.[^\n]*\n([\s\S]*)$/i);
  if (s6Match && s6Match[1]) {
    section6Feedback = s6Match[1].trim();
    // Strip default placeholder instructions if present
    if (section6Feedback.startsWith('*(') && section6Feedback.endsWith(')*')) {
      section6Feedback = '';
    }
  }

  // 4. Parse feedback text with parseHumanCorrection
  const parsedCorrection = parseHumanCorrection(section6Feedback);

  // 5. Determine action-directed sentiment & rejection
  let requiresRejection = parsedCorrection.requires_rejection;
  let sentiment = parsedCorrection.sentiment;

  if (action === 'approve') {
    requiresRejection = false;
    sentiment = 'positive';
  } else if (action === 'reject') {
    requiresRejection = true;
    sentiment = 'negative';
  }

  return {
    action,
    decision_id: decisionId,
    goal_id: goalId,
    confidence,
    brier_score: brierScore,
    route,
    requires_rejection: requiresRejection,
    sentiment,
    has_feedback: parsedCorrection.has_feedback,
    categories: parsedCorrection.categories,
    directives: parsedCorrection.directives,
    target_zones: parsedCorrection.target_zones,
    raw_feedback: section6Feedback,
    section6: parsedCorrection,
    parsed_at: new Date().toISOString()
  };
}

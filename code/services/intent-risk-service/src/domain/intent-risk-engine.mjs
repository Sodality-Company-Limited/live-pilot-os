/**
 * Pure Deterministic Intent and Risk Decision Engine
 * Governed by Article I (Zero Mocks), F01.1 and F01.2 Safety Flows
 */

const SPAM_PATTERNS = [
  /buy now at /i,
  /whatsapp me/i,
  /telegram:/i,
  /free crypto/i,
  /visit http/i
];

const SCAM_PATTERNS = [
  /transfer money to/i,
  /bank account/i,
  /dm for secret deal/i
];

export function classifyIntent(text, confidenceThreshold = 0.7) {
  if (!text || text.trim().length === 0) {
    return {
      outcome: 'DEFERRED',
      confidence: 0,
      reason: 'AMBIGUOUS_EVIDENCE',
      evidence: []
    };
  }

  const normalized = text.toLowerCase();
  let category = null;
  let rawConfidence = 0.85;

  if (normalized.includes('discount') || normalized.includes('voucher') || normalized.includes('code')) {
    category = 'DISCOUNT_REQUEST';
  } else if (normalized.includes('stock') || normalized.includes('available') || normalized.includes('left')) {
    category = 'STOCK_QUERY';
  } else if (normalized.includes('size') || normalized.includes('fit') || normalized.includes('dimension')) {
    category = 'SIZE_QUERY';
  } else if (normalized.includes('price') || normalized.includes('product') || normalized.includes('detail')) {
    category = 'PRODUCT_QUERY';
  } else {
    category = 'GENERAL_CHAT';
    rawConfidence = 0.65;
  }

  const hash = Buffer.from(text).toString('base64url').substring(0, 16);
  const evidence = [
    { evidence_id: `ev-msg-${hash}`, kind: 'message_hash', redacted: true }
  ];

  if (rawConfidence < confidenceThreshold) {
    return {
      outcome: 'DEFERRED',
      confidence: rawConfidence,
      reason: 'LOW_CONFIDENCE',
      evidence
    };
  }

  return {
    outcome: 'DETECTED',
    category,
    confidence: rawConfidence,
    evidence
  };
}

export function rankRisk(text) {
  if (!text || text.trim().length === 0) return null;

  for (const pat of SCAM_PATTERNS) {
    if (pat.test(text)) {
      return {
        outcome: 'RANKED',
        category: 'SCAM',
        severity: 'CRITICAL',
        score: 0.95,
        handling: 'escalate',
        evidence: [
          { evidence_id: `ev-scam-${Date.now()}`, kind: 'pattern_ref', redacted: true }
        ]
      };
    }
  }

  for (const pat of SPAM_PATTERNS) {
    if (pat.test(text)) {
      return {
        outcome: 'RANKED',
        category: 'SPAM',
        severity: 'HIGH',
        score: 0.85,
        handling: 'filter',
        evidence: [
          { evidence_id: `ev-spam-${Date.now()}`, kind: 'pattern_ref', redacted: true }
        ]
      };
    }
  }

  return null;
}

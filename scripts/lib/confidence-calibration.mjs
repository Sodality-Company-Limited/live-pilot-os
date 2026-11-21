const clamp = (value) => Math.max(0, Math.min(1, Number(value)));

const VALID_RISK_LEVELS = new Set(['normal', 'high', 'low']);

export function validateDecision(decision) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw new TypeError('decision must be a non-null object');
  }

  if (typeof decision.answer !== 'string' || decision.answer.trim().length === 0) {
    throw new TypeError('decision.answer is required and must be a non-empty string');
  }

  if (decision.confidence === undefined || decision.confidence === null) {
    throw new TypeError('decision.confidence is required');
  }

  const confidence = Number(decision.confidence);
  if (!Number.isFinite(confidence)) {
    throw new TypeError('decision.confidence must be a finite number');
  }
  if (confidence < 0 || confidence > 1) {
    throw new RangeError('decision.confidence must be between 0 and 1');
  }

  if (!Array.isArray(decision.evidence)) {
    throw new TypeError('decision.evidence must be an array');
  }
  if (!decision.evidence.every((item) => typeof item === 'string')) {
    throw new TypeError('decision.evidence must be an array of strings');
  }

  const riskLevel = decision.riskLevel !== undefined ? decision.riskLevel : 'normal';
  if (!VALID_RISK_LEVELS.has(riskLevel)) {
    throw new TypeError(`decision.riskLevel must be one of: ${Array.from(VALID_RISK_LEVELS).join(', ')}`);
  }

  return { ...decision, confidence, riskLevel };
}

// Proper logarithmic scoring: confident wrong answers receive the largest loss.
export function logarithmicReward(confidence, correct, epsilon = 1e-6) {
  const p = clamp(confidence);
  const probabilityOfOutcome = correct ? p : 1 - p;
  return Math.log(Math.max(epsilon, probabilityOfOutcome));
}

export function calibratedReward(decision, { correct, risk = 'normal', evidenceVerified = false } = {}) {
  const normalized = validateDecision(decision);
  const base = logarithmicReward(normalized.confidence, Boolean(correct));
  const overconfidencePenalty = !correct && normalized.confidence >= 0.8 ? 1 : 0;
  const evidencePenalty = !evidenceVerified && normalized.confidence >= 0.7 ? 0.5 : 0;
  const effectiveRisk = risk !== 'normal' ? risk : normalized.riskLevel;
  const riskPenalty = effectiveRisk === 'high' && !evidenceVerified ? 1 : 0;
  return base - overconfidencePenalty - evidencePenalty - riskPenalty;
}

export function routeDecision(decision, { risk = 'normal', evidenceVerified, threshold = 0.8, tau } = {}) {
  const candidate = (decision && typeof decision === 'object' && !Array.isArray(decision) && decision.answer === undefined)
    ? { ...decision, answer: 'governed_decision' }
    : decision;
  const normalized = validateDecision(candidate);
  const effectiveThreshold = tau !== undefined ? Number(tau) : Number(threshold);
  const effectiveRisk = risk !== 'normal' ? risk : normalized.riskLevel;
  const isVerified = evidenceVerified !== undefined
    ? Boolean(evidenceVerified)
    : (candidate.evidenceVerified !== undefined
        ? Boolean(candidate.evidenceVerified)
        : (Array.isArray(normalized.evidence) && normalized.evidence.length > 0));

  if (risk === 'high' || effectiveRisk === 'high') {
    return isVerified && normalized.confidence >= effectiveThreshold ? 'human_review' : 'defer';
  }
  if (!isVerified || normalized.confidence < effectiveThreshold) {
    return 'verify';
  }
  return 'proceed';
}

export function calibrationMetrics(records, bins = 10) {
  if (!Array.isArray(records) || records.length === 0) throw new RangeError('records must be non-empty');
  const normalized = records.map((record) => ({
    confidence: clamp(record.confidence),
    correct: record.correct !== undefined
      ? Boolean(record.correct)
      : (record.groundTruthOutcome !== undefined ? Boolean(record.groundTruthOutcome) : Boolean(record.outcome)),
  }));
  const brier = normalized.reduce((sum, r) => sum + (r.confidence - Number(r.correct)) ** 2, 0) / normalized.length;
  const buckets = Array.from({ length: bins }, () => ({ count: 0, confidence: 0, accuracy: 0 }));
  for (const record of normalized) {
    const index = Math.min(bins - 1, Math.floor(record.confidence * bins));
    const bucket = buckets[index];
    bucket.count += 1;
    bucket.confidence += record.confidence;
    bucket.accuracy += Number(record.correct);
  }
  const populated = buckets.filter((bucket) => bucket.count).map((bucket) => ({
    count: bucket.count,
    confidence: bucket.confidence / bucket.count,
    accuracy: bucket.accuracy / bucket.count,
  }));
  const ece = populated.reduce((sum, bucket) => sum + (bucket.count / normalized.length) * Math.abs(bucket.accuracy - bucket.confidence), 0);
  const highConfidence = normalized.filter((r) => r.confidence >= 0.8);
  return {
    sampleCount: normalized.length,
    ece,
    brier,
    highConfidenceErrorRate: highConfidence.length ? highConfidence.filter((r) => !r.correct).length / highConfidence.length : 0,
    bins: populated,
  };
}

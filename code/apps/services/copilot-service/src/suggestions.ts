/**
 * Copilot Service - F02 Host Copilot Suggestions Generator
 * Grounded in verified F01 signals and authoritative catalog facts.
 * Adheres strictly to Zero-Mock, Fail-Closed, and Zero-Float invariant.
 */

import { randomUUID } from 'node:crypto';

export enum SuggestionConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface CatalogFact {
  readonly productId: string;
  readonly title: string;
  readonly stockAvailable: number;
  readonly priceMinor: bigint;
  readonly currency: string;
  readonly scale: number;
}

export interface CopilotInputSignal {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly intent: string;
  readonly confidenceBps: number; // Basis points (10000 = 100%)
  readonly extractedKeywords: readonly string[];
  readonly timestamp: Date;
}

export interface CopilotSuggestion {
  readonly suggestionId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly groundedFactId: string;
  readonly confidence: SuggestionConfidence;
  readonly confidenceBps: number;
  readonly suggestedText: string;
  readonly generatedAt: Date;
}

const MINIMUM_CONFIDENCE_THRESHOLD_BPS = 7000; // 70%

/**
 * Generates an evidence-backed, confidence-aware suggestion for the host.
 * Fails closed (returns null) if evidence or confidence threshold is not met.
 */
export function generateCopilotSuggestion(
  signal: CopilotInputSignal,
  catalogFacts: readonly CatalogFact[]
): CopilotSuggestion | null {
  // 1. Threshold filter
  if (signal.confidenceBps < MINIMUM_CONFIDENCE_THRESHOLD_BPS) {
    return null;
  }

  // 2. Grounding against catalog facts
  const matchedFact = catalogFacts.find((fact) => {
    if (fact.stockAvailable <= 0) return false;
    const lowerTitle = fact.title.toLowerCase();
    return signal.extractedKeywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
  });

  if (!matchedFact) {
    return null;
  }

  // 3. Construct suggestion
  const confidence = signal.confidenceBps >= 8000 ? SuggestionConfidence.HIGH : SuggestionConfidence.MEDIUM;
  const suggestedText = `Highlight "${matchedFact.title}" — In stock (${matchedFact.stockAvailable} units available).`;

  return {
    suggestionId: randomUUID(),
    sessionId: signal.sessionId,
    tenantId: signal.tenantId,
    groundedFactId: matchedFact.productId,
    confidence,
    confidenceBps: signal.confidenceBps,
    suggestedText,
    generatedAt: new Date(),
  };
}

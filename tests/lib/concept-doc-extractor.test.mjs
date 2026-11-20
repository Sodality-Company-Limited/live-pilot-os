import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractConceptsFromSource,
  generateConceptSpec,
  validateConceptCitations
} from '../../scripts/lib/concept-doc-extractor.mjs';

const SAMPLE_SOURCE = `
/**
 * @file money.mjs
 * @description Universal multi-currency value object with exact integer arithmetic.
 */

/**
 * Money value object representing minor units and currency scale.
 */
export class Money {
  constructor(amountMinor, currency = 'USD', scale = 2) {
    this.amountMinor = BigInt(amountMinor);
    this.currency = currency;
    this.scale = scale;
  }
}

/**
 * Adds two money instances of the same currency.
 * Invariant: CurrencyMismatchError if currencies differ.
 */
export function addMoney(a, b) {
  if (a.currency !== b.currency) {
    throw new Error('CurrencyMismatchError');
  }
  return new Money(a.amountMinor + b.amountMinor, a.currency, a.scale);
}
`;

test('Concept Doc Extractor: extracts entities, functions, and invariants from source', () => {
  const extracted = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  
  assert.equal(extracted.filePath, 'scripts/lib/money.mjs');
  assert.ok(extracted.entities.some(e => e.name === 'Money' && e.kind === 'class'));
  assert.ok(extracted.functions.some(f => f.name === 'addMoney'));
  assert.ok(extracted.invariants.length > 0);
});

test('Concept Doc Extractor: generates structured markdown concept specification', () => {
  const extracted = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  const spec = generateConceptSpec(extracted);

  assert.ok(spec.includes('# Concept Specification: `scripts/lib/money.mjs`'));
  assert.ok(spec.includes('### Entity: `Money` (class)'));
  assert.ok(spec.includes('### Function: `addMoney`'));
  assert.ok(spec.includes('## Invariants & Design Rationales'));
});

test('Concept Doc Extractor: Extraction Determinism Invariant (INV-043-001) holds', () => {
  const extracted1 = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  const extracted2 = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  
  assert.deepEqual(extracted1, extracted2);
  assert.equal(generateConceptSpec(extracted1), generateConceptSpec(extracted2));
});

test('Concept Doc Extractor: Concept Completeness Invariant (INV-043-002) holds', () => {
  const extracted = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  const spec = generateConceptSpec(extracted);

  assert.ok(extracted.entities.length > 0);
  assert.ok(extracted.functions.length > 0);
  assert.ok(spec.length > 200);
});

test('Concept Doc Extractor: Citation Integrity validates generated file and line links', () => {
  const extracted = extractConceptsFromSource(SAMPLE_SOURCE, 'scripts/lib/money.mjs');
  const spec = generateConceptSpec(extracted);
  const citationResult = validateConceptCitations(spec, { 'scripts/lib/money.mjs': SAMPLE_SOURCE });

  assert.equal(citationResult.valid, true);
  assert.equal(citationResult.brokenCitations.length, 0);
});

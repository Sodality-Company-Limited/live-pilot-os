import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTypographyLayoutRules,
  MAX_HERO_WIDTH_PX
} from '../../../scripts/lib/typography-layout-guard.mjs';

describe('Typography Layout & Anti-Orphan Guard', () => {
  it('Flags heading components lacking text-wrap: balance or equivalent Tailwind utility', () => {
    const badHeading = `
      <h1 className="text-5xl font-bold tracking-tight text-white">
        Supercharge your autonomous operations today
      </h1>
    `;
    const res = validateTypographyLayoutRules(badHeading);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'MISSING_TEXT_WRAP_BALANCE'));
  });

  it('Flags body copy lacking text-wrap: pretty to prevent orphaned words on trailing lines', () => {
    const badBody = `
      <p className="mt-4 text-lg text-zinc-400">
        Our enterprise infrastructure scales automatically to handle millions of requests without degrading.
      </p>
    `;
    const res = validateTypographyLayoutRules(badBody);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'MISSING_TEXT_WRAP_PRETTY'));
  });

  it('Enforces hero header width constraint to maximum 680px', () => {
    assert.equal(MAX_HERO_WIDTH_PX, 680);

    const wideHero = `
      <div className="hero-container max-w-[850px] mx-auto text-center">
        <h1 className="text-balance">Headline</h1>
      </div>
    `;
    const res = validateTypographyLayoutRules(wideHero);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'HERO_WIDTH_EXCEEDED'));
  });

  it('Detects and rejects unwanted hyphens in marketing copy', () => {
    const hyphenated = `
      <h2 className="text-balance">
        High-impact autonomous AI-driven engineering
      </h2>
    `;
    const res = validateTypographyLayoutRules(hyphenated);
    assert.equal(res.valid, false);
    assert.ok(res.violations.some(v => v.type === 'FORBIDDEN_COPY_HYPHEN'));
  });

  it('Approves fully compliant marketing layout code', () => {
    const cleanCode = `
      <div className="hero-container max-w-[680px] mx-auto text-center">
        <h1 className="text-5xl font-bold text-balance">
          Autonomous software engineering without compromise
        </h1>
        <p className="mt-4 text-lg text-pretty text-zinc-400">
          Streamline mission critical execution with verified formal proof receipts
        </p>
      </div>
    `;
    const res = validateTypographyLayoutRules(cleanCode);
    assert.equal(res.valid, true);
    assert.equal(res.violations.length, 0);
  });
});

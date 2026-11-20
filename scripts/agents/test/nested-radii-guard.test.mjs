import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNestedRadius,
  validateNestedRadiiGeometry
} from '../../../scripts/lib/nested-radii-guard.mjs';

describe('Mathematical Nested Radii Geometry Engine & Layout Linter', () => {
  it('calculateNestedRadius accurately computes inner radius given outer radius and container padding', () => {
    // Outer = 16px, Padding = 8px -> Inner = 8px
    assert.equal(calculateNestedRadius(16, 8), 8);
    // Outer = 24px, Padding = 12px -> Inner = 12px
    assert.equal(calculateNestedRadius(24, 12), 12);
  });

  it('Enforces 0px or square corners when calculated inner radius falls below 2px threshold', () => {
    // Outer = 8px, Padding = 7px -> Difference = 1px (< 2px threshold) -> 0px
    assert.equal(calculateNestedRadius(8, 7), 0);
    // Outer = 8px, Padding = 8px -> Difference = 0px -> 0px
    assert.equal(calculateNestedRadius(8, 8), 0);
  });

  it('Linter flags nested UI containers where inner border radius violates concentricity formula', () => {
    const badNesting = {
      container: { radiusPx: 16, paddingPx: 8 },
      child: { radiusPx: 16 } // Violates concentricity: 16 != 8
    };
    const resBad = validateNestedRadiiGeometry(badNesting.container, badNesting.child);
    assert.equal(resBad.valid, false);
    assert.match(resBad.reason, /Concentricity violation/);

    const goodNesting = {
      container: { radiusPx: 16, paddingPx: 8 },
      child: { radiusPx: 8 } // Exact match
    };
    const resGood = validateNestedRadiiGeometry(goodNesting.container, goodNesting.child);
    assert.equal(resGood.valid, true);
  });

  it('Permits independent radii when padding/gap exceeds 32px threshold', () => {
    const looseNesting = {
      container: { radiusPx: 24, paddingPx: 40 }, // Gap >= 32px
      child: { radiusPx: 16 }
    };
    const res = validateNestedRadiiGeometry(looseNesting.container, looseNesting.child);
    assert.equal(res.valid, true);
  });
});

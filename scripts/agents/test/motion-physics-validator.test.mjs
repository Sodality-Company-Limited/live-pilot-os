import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMotionPhysicsCode,
  lintMotionStyles
} from '../../../scripts/lib/motion-physics-validator.mjs';

describe('Automated Motion Physics & Reduced-Motion Linter Harness', () => {
  it('rejects CSS and Tailwind transitions containing linear on transform, scale, or translate properties', () => {
    const badCode = `
      .card {
        transition: transform 0.3s linear;
      }
    `;
    const result = validateMotionPhysicsCode(badCode);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'FORBIDDEN_LINEAR_MOTION'));
  });

  it('flags transitions exceeding 400ms speed budget without explicit long-running exemption', () => {
    const longCode = `
      .modal {
        transition: opacity 650ms ease-out;
      }
    `;
    const result = validateMotionPhysicsCode(longCode);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'DURATION_BUDGET_EXCEEDED'));
  });

  it('asserts presence of prefers-reduced-motion media query fallback for non-essential animations', () => {
    const codeWithoutReduced = `
      @keyframes float {
        0% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0); }
      }
      .bubble {
        animation: float 2s infinite ease-in-out;
      }
    `;
    const result = validateMotionPhysicsCode(codeWithoutReduced);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some(v => v.type === 'MISSING_REDUCED_MOTION_FALLBACK'));
  });

  it('approves compliant motion CSS with reduced-motion query and directional curve', () => {
    const goodCode = `
      .button {
        transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
      }
      @media (prefers-reduced-motion: reduce) {
        .button {
          transition: none;
        }
      }
    `;
    const result = validateMotionPhysicsCode(goodCode);
    assert.equal(result.valid, true);
    assert.equal(result.violations.length, 0);
  });

  it('lintMotionStyles checks a list of style snippets accurately', () => {
    const report = lintMotionStyles([
      { file: 'styles.css', content: 'transition: all 200ms ease;' },
      { file: 'bad.css', content: 'transition: transform 300ms linear;' }
    ]);
    assert.equal(report.totalFiles, 2);
    assert.equal(report.failedFiles, 1);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  SUPPORTED_ENGINES,
  ENGINE_ANTIALIASING_PROFILES,
  VERIFICATION_VIEWPORTS,
  FONT_CASCADE_SPECS,
  TYPOGRAPHY_ELEMENTS,
  DEFAULT_MATRIX_PATH,
  MAX_ADVANCE_WIDTH_DELTA_PX,
  MAX_LINE_HEIGHT_DELTA_PX,
  computeEngineGlyphGeometry,
  extractEngineBoundingBoxes,
  evaluateFontMetrics,
  verifyCrossEngineConformance
} from '../../scripts/lib/cross-browser-font-verifier.mjs';

describe('G-WEB-014: Cross-Browser & Font Rendering Verification', () => {
  const rootDir = process.cwd();

  test('TC-WEB-014-01: Engine profiles and font cascade specifications are immutable and valid', () => {
    assert.deepEqual(SUPPORTED_ENGINES, ['chromium', 'webkit', 'gecko']);

    for (const engine of SUPPORTED_ENGINES) {
      const profile = ENGINE_ANTIALIASING_PROFILES[engine];
      assert.ok(profile, `Profile for engine '${engine}' must exist`);
      assert.ok(typeof profile.engine === 'string');
      assert.ok(typeof profile.rasterizer === 'string');
      assert.ok(typeof profile.antialiasing === 'string');
      assert.ok(typeof profile.textRendering === 'string');
      assert.equal(profile.fontDisplayStrategy, 'swap');
    }

    assert.ok(FONT_CASCADE_SPECS.sans, 'sans font cascade specification must exist');
    assert.equal(FONT_CASCADE_SPECS.sans.primary, 'Inter');
    assert.equal(FONT_CASCADE_SPECS.sans.fontDisplay, 'swap');
    assert.ok(Array.isArray(FONT_CASCADE_SPECS.sans.fallbackChain));
    assert.ok(FONT_CASCADE_SPECS.sans.fallbackChain.length > 3);

    assert.ok(FONT_CASCADE_SPECS.mono, 'mono font cascade specification must exist');
    assert.equal(FONT_CASCADE_SPECS.mono.primary, 'Fira Code');
    assert.equal(FONT_CASCADE_SPECS.mono.fontDisplay, 'swap');
    assert.ok(Array.isArray(FONT_CASCADE_SPECS.mono.fallbackChain));
    assert.ok(FONT_CASCADE_SPECS.mono.fallbackChain.length > 3);
  });

  test('TC-WEB-014-02: computeEngineGlyphGeometry generates valid geometry with zero NaN values', () => {
    for (const elem of TYPOGRAPHY_ELEMENTS) {
      for (const engine of SUPPORTED_ENGINES) {
        for (const vp of Object.values(VERIFICATION_VIEWPORTS)) {
          const geom = computeEngineGlyphGeometry(elem, engine, vp);

          assert.ok(typeof geom.width === 'number' && !isNaN(geom.width) && geom.width > 0, `Width must be positive number for ${elem.id} on ${engine}`);
          assert.ok(typeof geom.height === 'number' && !isNaN(geom.height) && geom.height > 0, `Height must be positive number for ${elem.id} on ${engine}`);
          assert.ok(typeof geom.advanceWidth === 'number' && !isNaN(geom.advanceWidth) && geom.advanceWidth > 0, `advanceWidth must be valid for ${elem.id} on ${engine}`);
          assert.ok(typeof geom.lineHeight === 'number' && !isNaN(geom.lineHeight) && geom.lineHeight > 0);
          assert.ok(typeof geom.lines === 'number' && geom.lines >= 1);
          assert.ok(typeof geom.ascender === 'number' && !isNaN(geom.ascender) && geom.ascender > 0);
          assert.ok(typeof geom.descender === 'number' && !isNaN(geom.descender) && geom.descender > 0);
          assert.equal(geom.clippedDescender, false, 'Descenders must never be clipped');
          assert.equal(geom.horizontalOverflow, false, `Horizontal overflow must be false for ${elem.id} on ${engine} @ ${vp.width}px`);
        }
      }
    }
  });

  test('TC-WEB-014-03: computeEngineGlyphGeometry rejects unsupported engines fail-closed', () => {
    assert.throws(
      () => computeEngineGlyphGeometry(TYPOGRAPHY_ELEMENTS[0], 'trident'),
      /Unsupported engine: 'trident'/
    );
  });

  test('TC-WEB-014-04: extractEngineBoundingBoxes gathers typography elements across all 3 engines', () => {
    const extraction = extractEngineBoundingBoxes(TYPOGRAPHY_ELEMENTS, VERIFICATION_VIEWPORTS.desktop);
    assert.equal(extraction.elementsCount, TYPOGRAPHY_ELEMENTS.length);
    assert.ok(extraction.engines.chromium);
    assert.ok(extraction.engines.webkit);
    assert.ok(extraction.engines.gecko);

    for (const engine of SUPPORTED_ENGINES) {
      const engineData = extraction.engines[engine];
      assert.equal(engineData.boxes.length, TYPOGRAPHY_ELEMENTS.length);
      for (const item of engineData.boxes) {
        assert.ok(item.box.width > 0);
        assert.ok(item.box.height > 0);
        assert.ok(!isNaN(item.box.advanceWidth));
      }
    }
  });

  test('TC-WEB-014-05: evaluateFontMetrics enforces advance width delta < 2.0px and line-height delta <= 1.0px', () => {
    const report = evaluateFontMetrics({ elements: TYPOGRAPHY_ELEMENTS });

    assert.equal(report.status, 'PASSED');
    assert.equal(report.certification, 'PASS');
    assert.equal(report.elements_evaluated_count, TYPOGRAPHY_ELEMENTS.length);
    assert.ok(report.max_advance_width_delta_px < MAX_ADVANCE_WIDTH_DELTA_PX, `Max advance delta (${report.max_advance_width_delta_px}px) must be < ${MAX_ADVANCE_WIDTH_DELTA_PX}px`);
    assert.equal(report.advance_width_tolerance_satisfied, true);
    assert.ok(report.max_line_height_delta_px <= MAX_LINE_HEIGHT_DELTA_PX, `Max line height delta (${report.max_line_height_delta_px}px) must be <= ${MAX_LINE_HEIGHT_DELTA_PX}px`);
    assert.equal(report.line_height_tolerance_satisfied, true);
    assert.equal(report.fout_layout_shift, 0);
    assert.equal(report.fout_layout_shift_zero, true);
    assert.equal(report.violations_count, 0);
    assert.equal(report.issues.length, 0);

    for (const comp of report.comparisons) {
      assert.equal(comp.passed, true, `Element ${comp.element_id} comparison must pass`);
      assert.ok(comp.max_advance_width_delta < MAX_ADVANCE_WIDTH_DELTA_PX);
      assert.ok(comp.line_height_delta <= MAX_LINE_HEIGHT_DELTA_PX);
      assert.equal(comp.descender_passed, true);
    }
  });

  test('TC-WEB-014-06: verifyCrossEngineConformance verifies zero horizontal overflow across desktop, tablet, and mobile', () => {
    const result = verifyCrossEngineConformance({
      elements: TYPOGRAPHY_ELEMENTS,
      viewports: Object.values(VERIFICATION_VIEWPORTS)
    });

    assert.equal(result.passed, true);
    assert.equal(result.status, 'PASSED');
    assert.equal(result.overallHorizontalOverflow, false);
    assert.equal(result.engineReadabilityFailures.length, 0);

    const vpKeys = ['desktop', 'tablet', 'mobile'];
    for (const vpKey of vpKeys) {
      const vpEval = result.viewportResults[vpKey];
      assert.ok(vpEval, `Viewport evaluation for ${vpKey} must exist`);
      assert.equal(vpEval.horizontal_overflow_detected, false);
      assert.equal(vpEval.horizontal_overflow_free, true);

      for (const engine of SUPPORTED_ENGINES) {
        assert.equal(vpEval.engines[engine].horizontal_overflow, false, `${engine} on ${vpKey} must have zero overflow`);
      }
    }
  });

  test('TC-WEB-014-07: Conformance matrix artifact exists on disk and satisfies schema contract', () => {
    const matrixFile = path.join(rootDir, DEFAULT_MATRIX_PATH);
    assert.ok(fs.existsSync(matrixFile), `Matrix artifact must exist at ${matrixFile}`);

    const raw = fs.readFileSync(matrixFile, 'utf8');
    const matrix = JSON.parse(raw);

    assert.equal(matrix.schema_version, '1.0.0');
    assert.equal(matrix.goal_id, 'G-WEB-014');
    assert.equal(matrix.artifact_id, 'ART-FONT-RENDERING-MATRIX');
    assert.equal(matrix.status, 'PASSED');
    assert.equal(matrix.certification, 'PASS');
    assert.deepEqual(matrix.supported_engines, ['chromium', 'webkit', 'gecko']);
    assert.equal(matrix.metrics_summary.horizontal_overflow_detected, false);
    assert.equal(matrix.metrics_summary.horizontal_overflow_free, true);
    assert.ok(matrix.metrics_summary.max_advance_width_delta_observed < 2.0);
    assert.ok(matrix.metrics_summary.max_line_height_delta_observed <= 1.0);
    assert.equal(matrix.metrics_summary.fout_layout_shift, 0);
  });

  test('TC-WEB-014-08: CLI subcommands evaluate-fonts and verify-conformance execute cleanly with exit code 0', () => {
    const cliScript = path.join(rootDir, 'scripts/lib/cross-browser-font-verifier.mjs');

    const evalOutput = execSync(`node ${cliScript} evaluate-fonts`, { encoding: 'utf8' });
    assert.ok(evalOutput.includes('Font Metric Evaluation Results:'));
    assert.ok(evalOutput.includes('Font Metric Evaluation Passed 100% Green.'));

    const confOutput = execSync(`node ${cliScript} verify-conformance`, { encoding: 'utf8' });
    assert.ok(confOutput.includes('Cross-Engine Viewport Conformance:'));
    assert.ok(confOutput.includes('Zero Overflow, Zero FOUT'));
  });

  test('TC-WEB-014-09: Article I Zero-Mock and Zero-Stub Invariant Verification', () => {
    const verifierCode = fs.readFileSync(path.join(rootDir, 'scripts/lib/cross-browser-font-verifier.mjs'), 'utf8');

    // Forbidden stubs/mocks
    assert.ok(!verifierCode.includes('todo!()'), 'Must not contain todo!()');
    assert.ok(!verifierCode.includes('unimplemented!()'), 'Must not contain unimplemented!()');
    assert.ok(!verifierCode.includes('mockReturnValue'), 'Must not contain mockReturnValue');
    assert.ok(!verifierCode.includes('jest.fn()'), 'Must not contain jest.fn()');
    assert.ok(!verifierCode.includes('sinon.stub()'), 'Must not contain sinon.stub()');
  });

  test('TC-WEB-014-10: Button elements do not wrap or overflow their containers across all viewports', () => {
    const buttonElement = TYPOGRAPHY_ELEMENTS.find(e => e.id === 'elem-button');
    assert.ok(buttonElement, 'Button typography element must exist');

    for (const engine of SUPPORTED_ENGINES) {
      for (const vp of Object.values(VERIFICATION_VIEWPORTS)) {
        const geom = computeEngineGlyphGeometry(buttonElement, engine, vp);
        assert.equal(geom.lines, 1, `Button must remain on a single line on ${engine} @ ${vp.width}px`);
        assert.equal(geom.overflowsContainer, false, `Button must not overflow container on ${engine} @ ${vp.width}px`);
      }
    }
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  LOCKED_ENVIRONMENT_DIMENSIONS,
  CHROMIUM_DETERMINISTIC_LAUNCH_ARGS,
  CANONICAL_VISUAL_LAYERS,
  DEFAULT_SPEC_PATH,
  DETERMINISTIC_DATE_EPOCH,
  DETERMINISTIC_PRNG_SEED,
  loadDeterministicEnvSpec,
  getDeterministicChromiumArgs,
  verifyEnvironmentLocks,
  generatePreRenderScript,
  decomposeVisualLayers,
  attributeLayerFailure,
  captureDeterministicFrame,
  verifyBitwiseCaptureDeterminism,
  certifyDeterministicVisualFidelity
} from '../../scripts/lib/deterministic-visual-env.mjs';

describe('Deterministic Visual Execution Environment Unit Test Suite (G-WEB-013)', () => {
  const specPath = path.join(process.cwd(), 'artifacts/visual/deterministic-env-spec.json');
  const libPath = path.join(process.cwd(), 'scripts/lib/deterministic-visual-env.mjs');
  const harnessPath = path.join(process.cwd(), 'scripts/harness/visual-regression-harness.mjs');

  it('1. should verify physical existence of all deterministic visual environment assets', () => {
    assert.ok(fs.existsSync(specPath), `Spec file must exist at ${specPath}`);
    assert.ok(fs.existsSync(libPath), `Engine library must exist at ${libPath}`);
    assert.ok(fs.existsSync(harnessPath), `Visual harness must exist at ${harnessPath}`);
  });

  it('2. should verify exported constants and canonical registries', () => {
    assert.ok(LOCKED_ENVIRONMENT_DIMENSIONS, 'LOCKED_ENVIRONMENT_DIMENSIONS must be exported');
    assert.equal(Object.keys(LOCKED_ENVIRONMENT_DIMENSIONS).length, 15, 'Must define exactly 15 locked dimensions');
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.device_scale_factor.value, 1.0);
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.timezone.value, 'UTC');
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.locale.value, 'en-US');
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.animation_clock.state, 'paused');
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.transition_duration.value, '0s');
    assert.equal(LOCKED_ENVIRONMENT_DIMENSIONS.color_profile.profile, 'srgb');

    assert.ok(Array.isArray(CANONICAL_VISUAL_LAYERS));
    assert.equal(CANONICAL_VISUAL_LAYERS.length, 8, 'Must declare exactly 8 canonical visual acceptance layers');
    const layerNames = CANONICAL_VISUAL_LAYERS.map(l => l.layer_name);
    assert.deepEqual(layerNames, [
      'DOM structure',
      'layout geometry',
      'typography',
      'colors and tokens',
      'image crop and assets',
      'interaction states',
      'motion frames',
      'accessibility'
    ]);

    assert.ok(Array.isArray(CHROMIUM_DETERMINISTIC_LAUNCH_ARGS));
    assert.ok(CHROMIUM_DETERMINISTIC_LAUNCH_ARGS.includes('--headless=new'));
    assert.ok(CHROMIUM_DETERMINISTIC_LAUNCH_ARGS.includes('--force-color-profile=srgb'));
    assert.ok(CHROMIUM_DETERMINISTIC_LAUNCH_ARGS.includes('--enable-font-antialiasing'));
  });

  it('3. should load and validate deterministic-env-spec.json schema and invariants', () => {
    const spec = loadDeterministicEnvSpec(specPath);
    assert.equal(spec.goal_id, 'G-WEB-013');
    assert.equal(spec.locked_dimensions_count, 15);
    assert.equal(spec.acceptance_layers_count, 8);
    assert.equal(spec.fidelity_thresholds.pixel_diff_ratio, 0.0050);
    assert.equal(spec.fidelity_thresholds.layout_shift, 0);
    assert.equal(spec.fidelity_thresholds.horizontal_overflow, false);
    assert.equal(spec.fidelity_thresholds.accessibility_standard, 'wcag_2_2_aa');
  });

  it('4. should verify environment locks across all 15 dimensions and fail-closed on violations', () => {
    // Compliant runtime configuration
    const validConfig = {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.0,
      timezone: 'UTC',
      locale: 'en-US',
      fontAntialiasing: 'subpixel',
      lockedFonts: ['Inter', 'Fira Code'],
      animationClock: 'paused',
      transitionDuration: '0s',
      colorProfile: 'srgb',
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      mediaType: 'screen',
      scrollbars: 'hidden',
      dateEpoch: DETERMINISTIC_DATE_EPOCH,
      networkIdleState: 'document_fonts_ready'
    };

    const validResult = verifyEnvironmentLocks(validConfig);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);
    assert.equal(validResult.lockedDimensionsChecked, 15);

    // Violation cases: Non-1.0 DPR
    const badDpr = verifyEnvironmentLocks({ ...validConfig, deviceScaleFactor: 2.0 });
    assert.equal(badDpr.valid, false);
    assert.ok(badDpr.errors.some(e => e.includes('Device scale factor must be strictly locked to 1.0')));

    // Violation cases: Unfrozen animation clock
    const badAnim = verifyEnvironmentLocks({ ...validConfig, animationClock: 'running' });
    assert.equal(badAnim.valid, false);
    assert.ok(badAnim.errors.some(e => e.includes('Animation clock state must be \'paused\'')));

    // Violation cases: Non-zero transition duration
    const badTrans = verifyEnvironmentLocks({ ...validConfig, transitionDuration: '300ms' });
    assert.equal(badTrans.valid, false);
    assert.ok(badTrans.errors.some(e => e.includes('Transition duration must be \'0s\'')));

    // Violation cases: Bad timezone
    const badTz = verifyEnvironmentLocks({ ...validConfig, timezone: 'America/New_York' });
    assert.equal(badTz.valid, false);
    assert.ok(badTz.errors.some(e => e.includes('Timezone must be UTC')));
  });

  it('5. should generate deterministic pre-render script freezing clocks, random, and CSS animations', () => {
    const script = generatePreRenderScript({
      epochIso: DETERMINISTIC_DATE_EPOCH,
      seed: DETERMINISTIC_PRNG_SEED
    });

    assert.ok(script.includes('animation-play-state: paused !important'), 'Script must freeze animation play state');
    assert.ok(script.includes('transition-duration: 0s !important'), 'Script must zero transition durations');
    assert.ok(script.includes('scrollbar-width: none !important'), 'Script must hide scrollbars');
    assert.ok(script.includes('FIXED_EPOCH_MS'), 'Script must freeze Date to fixed epoch');
    assert.ok(script.includes('deterministicRandom'), 'Script must replace Math.random with deterministic PRNG');
    assert.ok(script.includes('document.fonts.ready'), 'Script must hook document.fonts readiness');
  });

  it('6. should evaluate 8-layer visual acceptance decomposition with 100% compliance on clean state', () => {
    const report = decomposeVisualLayers(
      {
        domNodes: ['header', 'main', 'aside'],
        layoutBoxes: [{ id: 'box1', x: 0, y: 0, width: 1440, height: 900 }]
      },
      {
        domNodes: ['header', 'main', 'aside'],
        layoutBoxes: [{ id: 'box1', x: 0, y: 0, width: 1440, height: 900 }],
        layoutShift: 0,
        overflowDetected: false,
        typography: { fontFamily: 'Inter, Fira Code', fontSize: '14px', textOverflow: false },
        colors: { background: 'var(--color-bg-primary)', text: 'var(--color-text-primary)' },
        motion: { animationPlayState: 'paused', transitionDuration: '0s' },
        accessibility: { contrastRatio: 5.2, touchTargetWidth: 48, touchTargetHeight: 48 }
      }
    );

    assert.equal(report.overall_passed, true);
    assert.equal(report.total_layers, 8);
    assert.equal(report.passed_layers_count, 8);
    assert.equal(report.failed_layers_count, 0);
    assert.equal(report.failing_layers.length, 0);

    for (const [key, layer] of Object.entries(report.layers)) {
      assert.equal(layer.passed, true, `Layer ${layer.layer_name} should pass`);
      assert.equal(layer.score, 1.0);
    }
  });

  it('7. should attribute layer failure to exact root cause layer with actionable remediation', () => {
    // Test Typography Failure Attribution
    const typoAttr = attributeLayerFailure(
      {},
      {
        typography: { fontFamily: 'Comic Sans MS', textOverflow: true }
      }
    );
    assert.equal(typoAttr.has_failure, true);
    assert.equal(typoAttr.primary_failing_layer.layer_name, 'typography');
    assert.equal(typoAttr.primary_failing_layer.layer_id, 3);
    assert.ok(typoAttr.root_cause_diagnosis.includes('typography (Layer 3)'));
    assert.ok(typoAttr.actionable_remediation.includes('font-family declarations against locked tokens'));

    // Test Token / Color Failure Attribution (Raw Hex)
    const colorAttr = attributeLayerFailure(
      {},
      {
        colors: { rawHexDetected: true }
      }
    );
    assert.equal(colorAttr.has_failure, true);
    assert.equal(colorAttr.primary_failing_layer.layer_name, 'colors and tokens');
    assert.equal(colorAttr.primary_failing_layer.layer_id, 4);
    assert.ok(colorAttr.actionable_remediation.includes('Replace hardcoded raw hex colors with CSS variable tokens'));

    // Test Layout Geometry Failure (CLS > 0)
    const layoutAttr = attributeLayerFailure(
      {},
      {
        layoutShift: 0.05,
        overflowDetected: true
      }
    );
    assert.equal(layoutAttr.has_failure, true);
    assert.equal(layoutAttr.primary_failing_layer.layer_name, 'layout geometry');
    assert.equal(layoutAttr.primary_failing_layer.layer_id, 2);
    assert.ok(layoutAttr.actionable_remediation.includes('Flexbox/Grid track definitions and box-sizing'));
  });

  it('8. should verify bitwise capture determinism across repeated captures with 0.0000% variance', () => {
    const fixture = {
      view: 'workspace',
      canvas: 'fluid',
      commandRail: 'expanded',
      tokens: ['--color-bg-primary', '--color-text-primary']
    };

    const result = verifyBitwiseCaptureDeterminism(fixture, 5);
    assert.equal(result.deterministic, true);
    assert.equal(result.iterations, 5);
    assert.equal(result.byte_differences, 0);
    assert.equal(result.variance, 0.000000);
    assert.equal(result.status, 'BITWISE_IDENTICAL');
    assert.ok(result.primary_hash.startsWith('sha256:'));
    assert.equal(new Set(result.hashes).size, 1, 'All hashes must be identical');
  });

  it('9. should certify deterministic visual fidelity within 0.50% ceiling and zero CLS', () => {
    const size = 1440 * 900;
    const refBuffer = Buffer.alloc(size, 0x20);
    const implBuffer = Buffer.from(refBuffer);

    // Apply sub-threshold delta (50 pixels = 0.0038% <= 0.50%)
    for (let i = 0; i < 50; i++) {
      implBuffer[i] = 0x80;
    }

    const cert = certifyDeterministicVisualFidelity(refBuffer, implBuffer, {
      threshold: 0.0050,
      layoutShift: 0,
      overflowDetected: false,
      goalId: 'G-WEB-013'
    });

    assert.equal(cert.passed, true);
    assert.ok(cert.pixelDiffRatio <= 0.0050);
    assert.equal(cert.layoutShift, 0);
    assert.equal(cert.overflowDetected, false);
    assert.equal(cert.receipt.status, 'PASSED');
    assert.equal(cert.receipt.certification, 'PASS');
    assert.equal(cert.receipt.locked_dimensions_checked, 15);
    assert.equal(cert.receipt.layers_passed, 8);
  });

  it('10. should execute visual regression harness with --verify-determinism exiting 0 and zero mocks', () => {
    const res = spawnSync(process.execPath, [harnessPath, '--verify-determinism'], {
      encoding: 'utf8',
      env: process.env
    });

    assert.equal(res.status, 0, `CLI run must exit 0:\n${res.stderr}`);
    assert.ok(res.stdout.includes('15/15 Environment dimensions verified locked'));
    assert.ok(res.stdout.includes('BITWISE_IDENTICAL'));
    assert.ok(res.stdout.includes('Variance: 0.0000%'));
    assert.ok(res.stdout.includes('8-Layer Suite: 100% GREEN'));

    // Verify Article I: Zero mocks, zero stubs
    const libContent = fs.readFileSync(libPath, 'utf8');
    assert.ok(!libContent.includes('todo!()'), 'Must not contain todo!()');
    assert.ok(!libContent.includes('unimplemented!()'), 'Must not contain unimplemented!()');
    assert.ok(!libContent.includes('// TODO'), 'Must not contain // TODO');
    assert.ok(!libContent.includes('mock_response'), 'Must not contain mock_response');
  });
});

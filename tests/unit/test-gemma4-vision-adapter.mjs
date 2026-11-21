/**
 * Unit Test Suite for Gemma 4 Native Multimodal Vision Perception Adapter.
 * Verifies letterboxing geometry, dynamic tile generation, token budgets,
 * 2-layer GELU MLP projection, and prompt formatting.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLATE_900_RGB,
  SLATE_900_HEX,
  CANONICAL_VIEWPORTS,
  DEFAULT_GEMMA4_VISION_CONFIG,
  computeLetterboxGeometry,
  computeDynamicTiles,
  computeTokenBudget,
  gelu,
  layerNorm,
  projectVisionEmbedding,
  formatGemma4MultimodalPrompt,
  Gemma4VisionAdapter
} from '../../scripts/lib/gemma4-vision-adapter.mjs';

test('Gemma4VisionAdapter: Letterbox Geometry for 1920x1080 on Desktop 1440x900', () => {
  const geom = computeLetterboxGeometry(1920, 1080, 1440, 900);

  // 1920x1080 is 16:9 = 1.7777... target is 1440x900 = 1.6
  // Scale should be 1440 / 1920 = 0.75
  assert.equal(geom.scale, 0.75);
  assert.equal(geom.scaled_width, 1440);
  assert.equal(geom.scaled_height, 810);
  assert.equal(geom.pad_left, 0);
  assert.equal(geom.pad_right, 0);
  // Vertical padding: (900 - 810) = 90 -> 45 top, 45 bottom
  assert.equal(geom.pad_top, 45);
  assert.equal(geom.pad_bottom, 45);
  assert.equal(geom.padding_color, SLATE_900_HEX);
});

test('Gemma4VisionAdapter: Letterbox Geometry for 800x1200 portrait on Mobile 390x844', () => {
  const geom = computeLetterboxGeometry(800, 1200, 390, 844);

  // Scale limited by height: 844 / 1200 = 0.70333... vs width: 390 / 800 = 0.4875
  // Width scale is smaller (0.4875), so scaled_width = 390, scaled_height = round(1200 * 0.4875) = 585
  assert.equal(geom.scale, 0.4875);
  assert.equal(geom.scaled_width, 390);
  assert.equal(geom.scaled_height, 585);
  assert.equal(geom.pad_left, 0);
  assert.equal(geom.pad_right, 0);
  assert.equal(geom.pad_top + geom.pad_bottom + geom.scaled_height, 844);
});

test('Gemma4VisionAdapter: Dynamic Tiling on Canonical Desktop Viewport (1440x900)', () => {
  const tiles = computeDynamicTiles(1440, 900, 'desktop');

  // Desktop viewport: 3 cols x 2 rows = 6 grid tiles + 1 global thumbnail = 7 tiles
  assert.equal(tiles.length, 7);

  const gridTiles = tiles.filter(t => t.tile_type === 'grid');
  const thumbnailTiles = tiles.filter(t => t.tile_type === 'thumbnail');

  assert.equal(gridTiles.length, 6);
  assert.equal(thumbnailTiles.length, 1);

  // Each grid tile is exactly 448x448
  for (const t of gridTiles) {
    assert.equal(t.width, 448);
    assert.equal(t.height, 448);
    assert.ok(t.x >= 0 && t.x + t.width <= 1440, `Tile x=${t.x} within width 1440`);
    assert.ok(t.y >= 0 && t.y + t.height <= 900, `Tile y=${t.y} within height 900`);
    assert.equal(t.tokens_count, 256);
  }

  // Thumbnail tile spans entire width and height
  assert.equal(thumbnailTiles[0].x, 0);
  assert.equal(thumbnailTiles[0].y, 0);
  assert.equal(thumbnailTiles[0].width, 1440);
  assert.equal(thumbnailTiles[0].height, 900);
});

test('Gemma4VisionAdapter: Dynamic Tiling on Tablet (1024x768) and Mobile (390x844)', () => {
  const tabletTiles = computeDynamicTiles(1024, 768, 'tablet');
  // Tablet: 2 cols x 2 rows = 4 grid + 1 thumbnail = 5 tiles
  assert.equal(tabletTiles.length, 5);

  const mobileTiles = computeDynamicTiles(390, 844, 'mobile');
  // Mobile: 1 col x 2 rows = 2 grid + 1 thumbnail = 3 tiles
  assert.equal(mobileTiles.length, 3);
});

test('Gemma4VisionAdapter: Token Budget Calculation & Context Ceiling Invariant', () => {
  // Desktop: 7 tiles * 256 = 1,792 tokens
  const budget = computeTokenBudget(7, 256, 16384, 15.0);

  assert.equal(budget.visual_tokens, 1792);
  assert.equal(budget.context_window, 16384);
  assert.equal(budget.token_budget_percentage, 10.9375);
  assert.equal(budget.remaining_context_tokens, 16384 - 1792);
  assert.equal(budget.within_budget, true);

  // Exceeding budget test
  const overBudget = computeTokenBudget(12, 256, 16384, 15.0);
  assert.equal(overBudget.within_budget, false);
});

test('Gemma4VisionAdapter: Mathematical GELU and LayerNorm Invariants', () => {
  // Test GELU
  assert.ok(Math.abs(gelu(0.0) - 0.0) < 1e-6);
  assert.ok(gelu(2.0) > 1.95);
  assert.ok(gelu(-2.0) < 0.0 && gelu(-2.0) > -0.05);

  // Test LayerNorm: output mean should be ~0 and std ~1
  const vec = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0]);
  const norm = layerNorm(vec);
  let sum = 0;
  for (let i = 0; i < norm.length; i++) sum += norm[i];
  assert.ok(Math.abs(sum / norm.length) < 1e-5);
});

test('Gemma4VisionAdapter: 2-Layer GELU MLP Projection (d_v=1152 -> d_m=4096)', () => {
  const visionVector = new Float32Array(1152);
  for (let i = 0; i < 1152; i++) {
    visionVector[i] = Math.sin(i * 0.05);
  }

  const projected = projectVisionEmbedding(visionVector);

  assert.equal(projected.length, 4096);
  for (let i = 0; i < 4096; i++) {
    assert.ok(Number.isFinite(projected[i]), `Output at index ${i} must be finite`);
    assert.ok(!Number.isNaN(projected[i]), `Output at index ${i} must not be NaN`);
  }
});

test('Gemma4VisionAdapter: Error handling on invalid vision vector length', () => {
  const shortVector = new Float32Array(512);
  assert.throws(() => {
    projectVisionEmbedding(shortVector);
  }, /Invalid vision vector dimension/);
});

test('Gemma4VisionAdapter: Prompt Template Generation', () => {
  const prompt = formatGemma4MultimodalPrompt('Synthesize acyclic UI scene graph', {
    visualTokens: 1792,
    viewport: 'desktop'
  });

  assert.ok(prompt.startsWith('<start_of_turn>user\n<image>'));
  assert.ok(prompt.includes('<1792_tokens viewport="desktop">'));
  assert.ok(prompt.includes('Synthesize acyclic UI scene graph'));
  assert.ok(prompt.endsWith('<end_of_turn>\n<start_of_turn>model\n'));
});

test('Gemma4VisionAdapter: End-to-end class workflow', () => {
  const adapter = new Gemma4VisionAdapter();
  const pre = adapter.preprocessViewport(1920, 1080, 'desktop');

  assert.equal(pre.viewport.name, 'desktop');
  assert.equal(pre.tile_count, 7);
  assert.equal(pre.visual_tokens, 1792);
  assert.equal(pre.budget.within_budget, true);

  const prompt = adapter.formatPrompt('Audit WCAG AAA', 'desktop');
  assert.ok(prompt.includes('Audit WCAG AAA'));
});

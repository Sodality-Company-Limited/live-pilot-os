#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GEMMA 4 VISION ADAPTER VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal Perception & Scene Graph Generation (M2 / G-UX-005)
 * Purpose: Formally verifies SigLIP-style ViT projection, dynamic 448x448 patch
 *          tiling (7 tiles = 1,792 tokens), 2-layer GELU MLP projection,
 *          aspect-preserving letterboxing with rgb(15, 23, 42) Slate-900 padding,
 *          token budget ceilings, and prompt formatting with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import {
  computeLetterboxGeometry,
  computeDynamicTiles,
  computeTokenBudget,
  projectVisionEmbedding,
  formatGemma4MultimodalPrompt,
  SLATE_900_HEX,
  CANONICAL_VIEWPORTS,
  Gemma4VisionAdapter
} from '../lib/gemma4-vision-adapter.mjs';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Gemma 4 Native Multimodal Vision Perception Adapter Verification Harness');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Viewport & Letterboxing Invariants
  console.log('▶ Category 1: Aspect-Preserving Letterboxing & Canvas Invariants');
  const geomDesktop = computeLetterboxGeometry(1920, 1080, 1440, 900);
  assert(geomDesktop.scale === 0.75, 'Scale factor is exactly 0.75 for 1920x1080 -> 1440x900');
  assert(geomDesktop.scaled_width === 1440 && geomDesktop.scaled_height === 810, 'Scaled image dimensions preserve 16:9 ratio');
  assert(geomDesktop.pad_top === 45 && geomDesktop.pad_bottom === 45, 'Symmetrical vertical letterbox padding is 45px top & bottom');
  assert(geomDesktop.padding_color === SLATE_900_HEX, `Canvas padding color is canonical Slate-900 (${SLATE_900_HEX})`);

  const geomMobile = computeLetterboxGeometry(1080, 1920, 390, 844);
  assert(geomMobile.scaled_width <= 390 && geomMobile.scaled_height <= 844, 'Mobile scaled dimensions bounded within 390x844 viewport');
  assert(geomMobile.pad_left + geomMobile.pad_right + geomMobile.scaled_width === 390, 'Horizontal padding sums to exactly viewport width');
  assert(geomMobile.pad_top + geomMobile.pad_bottom + geomMobile.scaled_height === 844, 'Vertical padding sums to exactly viewport height');

  // 2. Dynamic Tiling Invariants
  console.log('\n▶ Category 2: Dynamic 448x448 Patch Tiling Grid Invariants');
  const desktopTiles = computeDynamicTiles(1440, 900, 'desktop');
  assert(desktopTiles.length === 7, 'Desktop produces exactly 7 tiles (6 grid + 1 thumbnail)');
  const desktopGridTiles = desktopTiles.filter(t => t.tile_type === 'grid');
  const desktopThumb = desktopTiles.filter(t => t.tile_type === 'thumbnail');
  assert(desktopGridTiles.length === 6, 'Desktop has exactly 6 high-res grid tiles');
  assert(desktopThumb.length === 1, 'Desktop has exactly 1 global thumbnail tile');
  assert(desktopGridTiles.every(t => t.width === 448 && t.height === 448), 'All grid tiles are exactly 448x448 px');

  const tabletTiles = computeDynamicTiles(1024, 768, 'tablet');
  assert(tabletTiles.length === 5, 'Tablet produces exactly 5 tiles (4 grid + 1 thumbnail)');

  const mobileTiles = computeDynamicTiles(390, 844, 'mobile');
  assert(mobileTiles.length === 3, 'Mobile produces exactly 3 tiles (2 grid + 1 thumbnail)');

  // 3. Token Budget Allocation & Context Window Ceiling
  console.log('\n▶ Category 3: Token Budget Allocation & 15% Context Window Ceiling');
  const desktopBudget = computeTokenBudget(desktopTiles.length, 256, 16384, 15.0);
  assert(desktopBudget.visual_tokens === 1792, '7 tiles yield exactly 1,792 visual tokens (7 * 256)');
  assert(desktopBudget.token_budget_percentage <= 11.0, `Token consumption (${desktopBudget.token_budget_percentage}%) is <= 11% (10.9375%)`);
  assert(desktopBudget.remaining_context_tokens >= 14592, 'Remaining context leaves >= 14,592 tokens for deliberation AST');
  assert(desktopBudget.within_budget === true, 'Token budget is strictly within budget');

  // 4. 2-Layer GELU MLP Projection Invariant
  console.log('\n▶ Category 4: 2-Layer GELU MLP Projector (d_v = 1152 -> d_m = 4096)');
  const dummyVision = new Float32Array(1152);
  for (let i = 0; i < 1152; i++) dummyVision[i] = (i % 100) / 100 - 0.5;
  const projected = projectVisionEmbedding(dummyVision);
  assert(projected.length === 4096, 'Projected embedding vector has dimension exactly 4096');
  assert(projected.every(v => Number.isFinite(v) && !Number.isNaN(v)), 'All projected coordinates are finite non-NaN numbers');

  // 5. Canonical Prompt Formatting
  console.log('\n▶ Category 5: Canonical Gemma 4 Multimodal Turn Formatting');
  const prompt = formatGemma4MultimodalPrompt('Detect UI scene graph elements', {
    visualTokens: 1792,
    viewport: 'desktop'
  });
  assert(prompt.includes('<start_of_turn>user\n'), 'Prompt contains canonical user turn start tag');
  assert(prompt.includes('<image><1792_tokens viewport="desktop"></image>'), 'Prompt contains image tag with 1792 tokens marker');
  assert(prompt.includes('<end_of_turn>\n<start_of_turn>model\n'), 'Prompt closes user turn and opens model turn');

  // 6. Complete End-to-End Adapter
  console.log('\n▶ Category 6: End-to-End Adapter Workflow');
  const adapter = new Gemma4VisionAdapter();
  const pre = adapter.preprocessViewport(1440, 900, 'desktop');
  assert(pre.tile_count === 7, 'Adapter preprocessed desktop viewport to 7 tiles');
  assert(pre.visual_tokens === 1792, 'Adapter confirmed 1,792 visual tokens');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHarness();

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS ADVERSARIAL CHALLENGER STRESS SUITE — MILESTONE 2 (M2)
 * ════════════════════════════════════════════════════════════════════════════════
 * Target Goals: G-UX-005 (Gemma 4 Vision Adapter) & G-UX-006 (OCR Bbox Aligner)
 * Archetype: Empirical Challenger (challenger_wave2_1)
 * Scope:
 *   1. Viewport & Letterboxing Fuzzing (Extreme aspect ratios, resolutions, Slate-900 padding, token budget)
 *   2. Coordinate Normalization Boundary Stress (Negative, overflow, zero-area, inverted, integer grid [0, 1000])
 *   3. OCR Text Fusion Stress (IoU 0.8999 vs 0.9000, 0.85 enclosure threshold, conflicting labels, tie-breaking)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
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

import {
  DEFAULT_ALIGNER_CONFIG,
  CANONICAL_Z_INDICES,
  normalizeBoundingBox,
  denormalizeBoundingBox,
  calculateIoU,
  calculateEnclosure,
  evaluateSpatialRelation,
  getDefaultZIndex,
  OCRBoundingBoxAligner
} from '../../scripts/lib/ocr-bbox-aligner.mjs';

describe('⚔️ M2 Empirical Adversarial Stress Suite — G-UX-005 & G-UX-006', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // 1. VIEWPORT & LETTERBOXING FUZZING (G-UX-005)
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Viewport & Letterboxing Fuzzing (G-UX-005)', () => {

    it('1.1 Extreme aspect ratios preserve geometry sum and symmetry', () => {
      const probeCases = [
        { name: 'Ultrawide 32:9', srcW: 5120, srcH: 1440, tgtW: 1440, tgtH: 900 },
        { name: 'Ultrawide 21:9', srcW: 3440, srcH: 1440, tgtW: 1440, tgtH: 900 },
        { name: 'Vertical 9:16', srcW: 1080, srcH: 1920, tgtW: 1440, tgtH: 900 },
        { name: 'Tall 1:3', srcW: 300, srcH: 900, tgtW: 1440, tgtH: 900 },
        { name: 'Wide Banner 10:1', srcW: 3000, srcH: 300, tgtW: 1440, tgtH: 900 },
        { name: 'Tall Ribbon 1:10', srcW: 200, srcH: 2000, tgtW: 1440, tgtH: 900 },
        { name: 'Square 1:1', srcW: 1000, srcH: 1000, tgtW: 1440, tgtH: 900 },
        { name: 'Standard 4:3', srcW: 1024, srcH: 768, tgtW: 1440, tgtH: 900 }
      ];

      for (const tc of probeCases) {
        const geom = computeLetterboxGeometry(tc.srcW, tc.srcH, tc.tgtW, tc.tgtH);
        assert.equal(
          geom.scaled_width + geom.pad_left + geom.pad_right,
          tc.tgtW,
          `[${tc.name}] Width sum must equal target width`
        );
        assert.equal(
          geom.scaled_height + geom.pad_top + geom.pad_bottom,
          tc.tgtH,
          `[${tc.name}] Height sum must equal target height`
        );
        assert.ok(
          Math.abs(geom.pad_left - geom.pad_right) <= 1,
          `[${tc.name}] Horizontal padding must be symmetrical (diff <= 1)`
        );
        assert.ok(
          Math.abs(geom.pad_top - geom.pad_bottom) <= 1,
          `[${tc.name}] Vertical padding must be symmetrical (diff <= 1)`
        );
        assert.equal(geom.padding_color, SLATE_900_HEX);
      }
    });

    it('1.2 Extreme dimensions: tiny (1x1, 10x10) and massive (8000x8000, 10000x5000)', () => {
      const extremes = [
        { srcW: 1, srcH: 1, tgtW: 1440, tgtH: 900 },
        { srcW: 10, srcH: 10, tgtW: 1440, tgtH: 900 },
        { srcW: 100, srcH: 100, tgtW: 390, tgtH: 844 },
        { srcW: 8000, srcH: 8000, tgtW: 1440, tgtH: 900 },
        { srcW: 10000, srcH: 5000, tgtW: 1024, tgtH: 768 }
      ];

      for (const tc of extremes) {
        const geom = computeLetterboxGeometry(tc.srcW, tc.srcH, tc.tgtW, tc.tgtH);
        assert.ok(Number.isFinite(geom.scale) && geom.scale > 0);
        assert.ok(geom.scaled_width <= tc.tgtW);
        assert.ok(geom.scaled_height <= tc.tgtH);
        assert.equal(geom.scaled_width + geom.pad_left + geom.pad_right, tc.tgtW);
        assert.equal(geom.scaled_height + geom.pad_top + geom.pad_bottom, tc.tgtH);
      }
    });

    it('1.3 Slate-900 padding color invariant strictly enforced', () => {
      assert.equal(SLATE_900_HEX, '#0f172a');
      assert.deepEqual(SLATE_900_RGB, { r: 15, g: 23, b: 42 });

      const geom = computeLetterboxGeometry(800, 600, 1440, 900);
      assert.equal(geom.padding_color, '#0f172a');
    });

    it('1.4 Dynamic tiling on Desktop bounds token budget <= 11% context', () => {
      const tiles = computeDynamicTiles(1440, 900, 'desktop');
      assert.equal(tiles.length, 7);

      const gridTiles = tiles.filter(t => t.tile_type === 'grid');
      const thumbTile = tiles.filter(t => t.tile_type === 'thumbnail');
      assert.equal(gridTiles.length, 6);
      assert.equal(thumbTile.length, 1);

      // Verify grid coordinates bounded within canvas
      for (const t of gridTiles) {
        assert.equal(t.width, 448);
        assert.equal(t.height, 448);
        assert.ok(t.x >= 0 && t.x + t.width <= 1440);
        assert.ok(t.y >= 0 && t.y + t.height <= 900);
      }

      const budget = computeTokenBudget(tiles.length, 256, 16384, 15.0);
      assert.equal(budget.visual_tokens, 1792);
      assert.equal(budget.token_budget_percentage, 10.9375);
      assert.ok(budget.token_budget_percentage <= 11.0, 'Desktop token budget must be <= 11%');
      assert.equal(budget.within_budget, true);
    });

    it('1.5 Hostile input rejection: zero, negative, NaN, Infinity fail closed with TypeError', () => {
      assert.throws(() => computeLetterboxGeometry(0, 100, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, 0, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(-100, 100, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, -100, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, 100, 0, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, 100, 1440, 0), TypeError);
      assert.throws(() => computeLetterboxGeometry(NaN, 100, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, NaN, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(Infinity, 100, 1440, 900), TypeError);
      assert.throws(() => computeLetterboxGeometry(100, Infinity, 1440, 900), TypeError);
    });

    it('1.6 5,000-iteration randomized letterbox fuzzing harness', () => {
      let passed = 0;
      const total = 5000;
      for (let i = 0; i < total; i++) {
        const srcW = Math.floor(Math.random() * 8000) + 1;
        const srcH = Math.floor(Math.random() * 8000) + 1;
        const tgtW = Math.floor(Math.random() * 3840) + 1;
        const tgtH = Math.floor(Math.random() * 2160) + 1;

        const geom = computeLetterboxGeometry(srcW, srcH, tgtW, tgtH);
        if (
          geom.scaled_width + geom.pad_left + geom.pad_right === tgtW &&
          geom.scaled_height + geom.pad_top + geom.pad_bottom === tgtH &&
          geom.scaled_width <= tgtW &&
          geom.scaled_height <= tgtH &&
          geom.pad_left >= 0 &&
          geom.pad_right >= 0 &&
          geom.pad_top >= 0 &&
          geom.pad_bottom >= 0
        ) {
          passed++;
        }
      }
      assert.equal(passed, total, 'All 5,000 randomized letterbox cases must satisfy invariants');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. COORDINATE NORMALIZATION BOUNDARY STRESS (G-UX-006)
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Coordinate Normalization Boundary Stress (G-UX-006)', () => {

    it('2.1 Negative coordinates clamp to 0 along x and y', () => {
      const norm = normalizeBoundingBox([-200, -350, 400, 300], 1440, 900);
      assert.equal(norm.x, 0);
      assert.equal(norm.y, 0);
      assert.ok(Number.isInteger(norm.x));
      assert.ok(Number.isInteger(norm.y));
      assert.ok(norm.w >= 0 && norm.x + norm.w <= 1000);
      assert.ok(norm.h >= 0 && norm.y + norm.h <= 1000);
    });

    it('2.2 Coordinates > dimensions clamp to 1000 and adjust dimensions', () => {
      const norm = normalizeBoundingBox([2500, 1800, 400, 300], 1440, 900);
      assert.equal(norm.x, 1000);
      assert.equal(norm.y, 1000);
      assert.equal(norm.w, 0);
      assert.equal(norm.h, 0);
      assert.equal(norm.x + norm.w, 1000);
      assert.equal(norm.y + norm.h, 1000);
    });

    it('2.3 Partial overflow adjusts width/height to strictly bound within 1000', () => {
      // Box starting at 1200 on 1440 width (1200/1440 * 1000 = 833) with width 500
      const norm = normalizeBoundingBox([1200, 700, 500, 400], 1440, 900);
      assert.ok(norm.x >= 0 && norm.x <= 1000);
      assert.ok(norm.y >= 0 && norm.y <= 1000);
      assert.ok(norm.x + norm.w <= 1000, `x (${norm.x}) + w (${norm.w}) must be <= 1000`);
      assert.ok(norm.y + norm.h <= 1000, `y (${norm.y}) + h (${norm.h}) must be <= 1000`);
    });

    it('2.4 Zero-width and zero-height boxes normalize safely without division by zero', () => {
      const norm = normalizeBoundingBox([144, 90, 0, 0], 1440, 900);
      assert.equal(norm.x, 100);
      assert.equal(norm.y, 100);
      assert.equal(norm.w, 0);
      assert.equal(norm.h, 0);

      // Verify IoU with zero-width box returns 0.0 (no division by zero)
      const other = { x: 100, y: 100, w: 200, h: 200 };
      assert.equal(calculateIoU(norm, other), 0.0);
      assert.equal(calculateEnclosure(norm, other), 0.0);
    });

    it('2.5 Inverted coordinates (negative w or h) clamp to 0 width/height', () => {
      const norm = normalizeBoundingBox([200, 200, -100, -50], 1000, 1000);
      assert.equal(norm.w, 0);
      assert.equal(norm.h, 0);
      assert.equal(norm.x, 200);
      assert.equal(norm.y, 200);
    });

    it('2.6 Strict integer grid assertion across boundary extremes', () => {
      const extremes = [
        [0, 0, 1440, 900],
        [1440, 900, 0, 0],
        [0, 0, 0, 0],
        [720, 450, 720, 450],
        [1, 1, 1, 1]
      ];

      for (const bbox of extremes) {
        const norm = normalizeBoundingBox(bbox, 1440, 900);
        assert.ok(Number.isInteger(norm.x), `x must be integer: ${norm.x}`);
        assert.ok(Number.isInteger(norm.y), `y must be integer: ${norm.y}`);
        assert.ok(Number.isInteger(norm.w), `w must be integer: ${norm.w}`);
        assert.ok(Number.isInteger(norm.h), `h must be integer: ${norm.h}`);
        assert.ok(norm.x >= 0 && norm.x <= 1000);
        assert.ok(norm.y >= 0 && norm.y <= 1000);
        assert.ok(norm.x + norm.w <= 1000);
        assert.ok(norm.y + norm.h <= 1000);
      }
    });

    it('2.7 Invalid viewport dimensions fail closed with TypeError', () => {
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], 0, 900), TypeError);
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], 1440, 0), TypeError);
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], -1440, 900), TypeError);
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], 1440, -900), TypeError);
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], NaN, 900), TypeError);
      assert.throws(() => normalizeBoundingBox([0, 0, 10, 10], 1440, Infinity), TypeError);
    });

    it('2.8 5,000-iteration randomized coordinate normalization fuzzing harness', () => {
      let passed = 0;
      const total = 5000;
      for (let i = 0; i < total; i++) {
        const rawX = (Math.random() - 0.5) * 5000;
        const rawY = (Math.random() - 0.5) * 5000;
        const rawW = (Math.random() - 0.2) * 5000;
        const rawH = (Math.random() - 0.2) * 5000;
        const vpW = Math.floor(Math.random() * 3840) + 1;
        const vpH = Math.floor(Math.random() * 2160) + 1;

        const norm = normalizeBoundingBox([rawX, rawY, rawW, rawH], vpW, vpH);
        if (
          Number.isInteger(norm.x) && norm.x >= 0 && norm.x <= 1000 &&
          Number.isInteger(norm.y) && norm.y >= 0 && norm.y <= 1000 &&
          Number.isInteger(norm.w) && norm.w >= 0 && norm.w <= 1000 &&
          Number.isInteger(norm.h) && norm.h >= 0 && norm.h <= 1000 &&
          norm.x + norm.w <= 1000 &&
          norm.y + norm.h <= 1000
        ) {
          passed++;
        }
      }
      assert.equal(passed, total, 'All 5,000 randomized normalizations must produce valid [0, 1000] integer grid');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. OCR BOUNDING BOX ALIGNMENT & TEXT FUSION STRESS (G-UX-006)
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. OCR Bounding Box Alignment & Text Fusion Stress (G-UX-006)', () => {
    const aligner = new OCRBoundingBoxAligner();

    it('3.1 IoU boundary: IoU = 0.8975 (below 0.90) vs IoU = 0.9011 (at/above 0.90)', () => {
      const visual = [{ node_id: 'btn_save', component_type: 'PrimaryButton', bbox: [100, 100, 500, 500] }];

      // Shift delta = 27 in 500px box gives IoU = (500 - 27)/(500 + 27) = 473/527 = 0.89753 < 0.90
      const ocrBelow = [{ text: 'Save Below', bbox: [127, 100, 500, 500] }];
      const fusedBelow = aligner.fuseOcrWithVisualNodes(visual, ocrBelow, 1000, 1000);
      assert.notEqual(fusedBelow[0].fusion_type, 'exact_match', 'IoU < 0.90 must not be exact_match');

      // Shift delta = 26 in 500px box gives IoU = (500 - 26)/(500 + 26) = 474/526 = 0.90114 >= 0.90
      const ocrAbove = [{ text: 'Save Above', bbox: [126, 100, 500, 500] }];
      const fusedAbove = aligner.fuseOcrWithVisualNodes(visual, ocrAbove, 1000, 1000);
      assert.equal(fusedAbove[0].fusion_type, 'exact_match', 'IoU >= 0.90 must be exact_match');
      assert.equal(fusedAbove[0].text_content, 'Save Above');
    });

    it('3.2 Enclosure boundary: Enclosure = 0.84 (below 0.85) vs Enclosure = 0.85 (at 0.85)', () => {
      const visualCard = [{ node_id: 'card_info', component_type: 'CardContainer', bbox: [100, 100, 200, 200] }];

      // Inner box [216, 100, 100, 100] on outer [100, 100, 200, 200]:
      // Overlap width = 100 + 200 - 216 = 84 px -> enclosure = 0.84 < 0.85; IoU is ~0.20
      const ocrEncBelow = [{ text: 'Excluded Token', bbox: [216, 100, 100, 100] }];
      const fusedBelow = aligner.fuseOcrWithVisualNodes(visualCard, ocrEncBelow, 1000, 1000);
      assert.equal(fusedBelow[0].fusion_type, 'unmatched_visual', 'Enclosure < 0.85 must not be enclosed_child');
      assert.equal(fusedBelow[0].text_content, null);

      // Inner box [215, 100, 100, 100] on outer [100, 100, 200, 200]:
      // Overlap width = 100 + 200 - 215 = 85 px -> enclosure = 0.85 >= 0.85
      const ocrEncAt = [{ text: 'Included Token', bbox: [215, 100, 100, 100] }];
      const fusedAt = aligner.fuseOcrWithVisualNodes(visualCard, ocrEncAt, 1000, 1000);
      assert.equal(fusedAt[0].fusion_type, 'enclosed_child', 'Enclosure >= 0.85 must be enclosed_child');
      assert.equal(fusedAt[0].text_content, 'Included Token');
    });

    it('3.3 Conflicting text labels: multiple OCR boxes resolve deterministically without duplication', () => {
      const visual = [{ node_id: 'btn_confirm', component_type: 'PrimaryButton', bbox: [200, 200, 120, 40] }];
      const ocrCandidates = [
        { text: 'Confirm Order', confidence: 0.99, bbox: [200, 200, 120, 40] },
        { text: 'Cancel Order', confidence: 0.95, bbox: [200, 200, 120, 40] }
      ];

      const fused = aligner.fuseOcrWithVisualNodes(visual, ocrCandidates, 1000, 1000);
      assert.equal(fused.length, 1);
      assert.equal(fused[0].fusion_type, 'exact_match');
      assert.equal(fused[0].text_content, 'Confirm Order');
      assert.equal(fused[0].child_ocr_tokens.length, 1);
    });

    it('3.4 Competing visual nodes: OCR token is consumed once and not duplicated', () => {
      const visualNodes = [
        { node_id: 'btn_1', component_type: 'PrimaryButton', bbox: [100, 100, 100, 40] },
        { node_id: 'btn_2', component_type: 'SecondaryButton', bbox: [100, 100, 100, 40] }
      ];
      const ocrSingle = [{ text: 'Exclusive Action', confidence: 0.99, bbox: [100, 100, 100, 40] }];

      const fused = aligner.fuseOcrWithVisualNodes(visualNodes, ocrSingle, 1000, 1000);
      assert.equal(fused[0].text_content, 'Exclusive Action');
      assert.equal(fused[0].fusion_type, 'exact_match');
      assert.equal(fused[1].text_content, null);
      assert.equal(fused[1].fusion_type, 'unmatched_visual');
    });

    it('3.5 Natural reading order tie-breaking across multi-line tokens', () => {
      const visualCard = [{ node_id: 'card_user', component_type: 'CardContainer', bbox: [0, 0, 800, 800] }];

      // Case A: Identical y, different x -> x ascending
      const ocrSameY = [
        { text: 'World', bbox: [200, 100, 50, 20] },
        { text: 'Hello', bbox: [100, 100, 50, 20] }
      ];
      const fusedSameY = aligner.fuseOcrWithVisualNodes(visualCard, ocrSameY, 1000, 1000);
      assert.equal(fusedSameY[0].text_content, 'Hello World');

      // Case B: Different y, same x -> y ascending
      const ocrSameX = [
        { text: 'Line 2', bbox: [100, 200, 50, 20] },
        { text: 'Line 1', bbox: [100, 100, 50, 20] }
      ];
      const fusedSameX = aligner.fuseOcrWithVisualNodes(visualCard, ocrSameX, 1000, 1000);
      assert.equal(fusedSameX[0].text_content, 'Line 1 Line 2');

      // Case C: Identical (y, x) -> stable order preserved
      const ocrIdentical = [
        { text: 'First', bbox: [100, 100, 50, 20] },
        { text: 'Second', bbox: [100, 100, 50, 20] }
      ];
      const fusedIdentical = aligner.fuseOcrWithVisualNodes(visualCard, ocrIdentical, 1000, 1000);
      assert.equal(fusedIdentical[0].text_content, 'First Second');
    });

    it('3.6 Spatial relation evaluation: directional, containment, and alignment invariants', () => {
      const container = { x: 100, y: 100, w: 400, h: 400 };
      const child = { x: 120, y: 120, w: 100, h: 40 };
      const sibling = { x: 120, y: 180, w: 100, h: 40 };

      const contRelations = evaluateSpatialRelation(container, child, 'c', 'ch');
      assert.ok(contRelations.some(r => r.relation_type === 'contains'));

      const dirRelations = evaluateSpatialRelation(child, sibling, 'ch', 'sb');
      assert.ok(dirRelations.some(r => r.relation_type === 'above'));
      assert.ok(dirRelations.some(r => r.relation_type === 'aligned_left'));
      assert.ok(dirRelations.some(r => r.relation_type === 'aligned_right'));
    });

    it('3.7 Stacking z-index assignment invariant across canonical components', () => {
      assert.equal(getDefaultZIndex('ScreenRoot'), 0);
      assert.equal(getDefaultZIndex('CardContainer'), 10);
      assert.equal(getDefaultZIndex('PrimaryButton'), 20);
      assert.equal(getDefaultZIndex('SidebarNavigation'), 30);
      assert.equal(getDefaultZIndex('HeaderBar'), 50);
      assert.equal(getDefaultZIndex('DrawerPanel'), 100);
      assert.equal(getDefaultZIndex('SelectDropdown'), 150);
      assert.equal(getDefaultZIndex('ModalDialog'), 1000);
      assert.equal(getDefaultZIndex('AlertBannerToast'), 2000);
    });
  });
});

#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS OCR BOUNDING BOX ALIGNER VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal Perception & Scene Graph Generation (M2 / G-UX-006)
 * Purpose: Formally verifies coordinate normalization to [0, 1000] integer grid,
 *          pairwise IoU and enclosure ratios, OCR text fusion, natural reading
 *          order concatenation, spatial relations derivation, and stacking
 *          hierarchy with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import {
  normalizeBoundingBox,
  denormalizeBoundingBox,
  calculateIoU,
  calculateEnclosure,
  evaluateSpatialRelation,
  getDefaultZIndex,
  OCRBoundingBoxAligner
} from '../lib/ocr-bbox-aligner.mjs';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ OCR Bounding Box Aligner & Multimodal Normalizer Verification Harness');
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

  // 1. Coordinate Normalization & Grid Invariants
  console.log('▶ Category 1: Coordinate Normalization [0, 1000] Integer Space');
  const norm1 = normalizeBoundingBox([144, 90, 720, 450], 1440, 900);
  assert(norm1.x === 100 && norm1.y === 100 && norm1.w === 500 && norm1.h === 500, 'Coordinates normalized to exact integer grid [100, 100, 500, 500]');
  assert(norm1.x >= 0 && norm1.x + norm1.w <= 1000, 'Bounding box strictly bounded within [0, 1000] along X axis');
  assert(norm1.y >= 0 && norm1.y + norm1.h <= 1000, 'Bounding box strictly bounded within [0, 1000] along Y axis');

  const denorm1 = denormalizeBoundingBox(norm1, 1440, 900);
  assert(denorm1.x === 144 && denorm1.y === 90 && denorm1.w === 720 && denorm1.h === 450, 'Denormalization perfectly recovers original viewport pixels');

  // 2. Mathematical IoU Invariants
  console.log('\n▶ Category 2: Pairwise IoU & Enclosure Metrics');
  const bA = { x: 100, y: 100, w: 200, h: 200 };
  const bB = { x: 100, y: 100, w: 200, h: 200 };
  assert(calculateIoU(bA, bB) === 1.0, 'IoU of identical boxes is exactly 1.0');

  const bDisjoint = { x: 500, y: 500, w: 100, h: 100 };
  assert(calculateIoU(bA, bDisjoint) === 0.0, 'IoU of disjoint boxes is exactly 0.0');

  const bInner = { x: 120, y: 120, w: 80, h: 80 };
  assert(calculateEnclosure(bInner, bA) === 1.0, 'Enclosure of fully nested inner box is exactly 1.0');

  // 3. OCR Text Fusion (Exact Match vs Enclosed Child)
  console.log('\n▶ Category 3: OCR Text Fusion & Natural Reading Order');
  const aligner = new OCRBoundingBoxAligner();

  // Test Exact Match: IoU >= 0.90
  const visualExact = [{ node_id: 'btn_save', component_type: 'PrimaryButton', bbox: [100, 200, 120, 40] }];
  const ocrExact = [{ text: 'Save Changes', confidence: 0.99, bbox: [101, 201, 118, 38] }];
  const fusedExact = aligner.fuseOcrWithVisualNodes(visualExact, ocrExact, 1000, 1000);
  assert(fusedExact[0].fusion_type === 'exact_match', 'IoU >= 0.90 classified as exact_match');
  assert(fusedExact[0].text_content === 'Save Changes', 'Text fused directly into visual node');

  // Test Enclosed Child with Multi-line Reading Order
  const visualCard = [{ node_id: 'card_profile', component_type: 'CardContainer', bbox: [50, 50, 400, 300] }];
  const ocrMulti = [
    { text: 'Line 2: Product Designer', confidence: 0.95, bbox: [70, 120, 200, 25] },
    { text: 'Line 1: Alex Morgan', confidence: 0.98, bbox: [70, 80, 180, 30] }
  ];
  const fusedCard = aligner.fuseOcrWithVisualNodes(visualCard, ocrMulti, 1000, 1000);
  assert(fusedCard[0].fusion_type === 'enclosed_child', 'Nested OCR tokens classified as enclosed_child');
  assert(fusedCard[0].text_content === 'Line 1: Alex Morgan Line 2: Product Designer', 'Multi-token text sorted in natural reading order (y then x)');

  // 4. Spatial Relations Derivation
  console.log('\n▶ Category 4: Pairwise Spatial Relations (Containment & Directional)');
  const header = { x: 100, y: 100, w: 800, h: 60 };
  const searchInput = { x: 120, y: 110, w: 200, h: 40 };
  const relations = evaluateSpatialRelation(header, searchInput, 'header', 'search');
  const containsRel = relations.find(r => r.relation_type === 'contains');
  assert(containsRel !== undefined, 'Container correctly identifies contains relation');

  const bannerA = { x: 100, y: 100, w: 300, h: 50 };
  const bannerB = { x: 100, y: 170, w: 300, h: 50 };
  const bannerRel = evaluateSpatialRelation(bannerA, bannerB, 'A', 'B');
  assert(bannerRel.some(r => r.relation_type === 'above'), 'Upper banner correctly derives above relation');
  assert(bannerRel.some(r => r.relation_type === 'aligned_left'), 'Left edges at x=100 correctly derive aligned_left relation');

  // 5. Stacking Z-Index Invariant
  console.log('\n▶ Category 5: Stacking Hierarchy & Z-Index Invariant');
  assert(getDefaultZIndex('ScreenRoot') === 0, 'ScreenRoot has z-index 0');
  assert(getDefaultZIndex('CardContainer') === 10, 'CardContainer has z-index 10');
  assert(getDefaultZIndex('PrimaryButton') === 20, 'PrimaryButton has z-index 20');
  assert(getDefaultZIndex('ModalDialog') === 1000, 'ModalDialog has z-index 1000');
  assert(getDefaultZIndex('AlertBannerToast') === 2000, 'AlertBannerToast has z-index 2000');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHarness();

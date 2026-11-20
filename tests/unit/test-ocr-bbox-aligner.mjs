/**
 * Unit Test Suite for Multimodal Normalizer & OCR Bounding Box Aligner.
 * Verifies coordinate normalization to [0, 1000], IoU calculation,
 * OCR text fusion, natural reading order, spatial relations, and z-indices.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBoundingBox,
  denormalizeBoundingBox,
  calculateIoU,
  calculateEnclosure,
  evaluateSpatialRelation,
  getDefaultZIndex,
  OCRBoundingBoxAligner
} from '../../scripts/lib/ocr-bbox-aligner.mjs';

test('OCRBoundingBoxAligner: Coordinate Normalization and Denormalization', () => {
  const viewportW = 1440;
  const viewportH = 900;
  const rawBox = { x: 144, y: 90, w: 720, h: 450 };

  const norm = normalizeBoundingBox(rawBox, viewportW, viewportH);
  assert.equal(norm.x, 100);
  assert.equal(norm.y, 100);
  assert.equal(norm.w, 500);
  assert.equal(norm.h, 500);

  const denorm = denormalizeBoundingBox(norm, viewportW, viewportH);
  assert.equal(denorm.x, 144);
  assert.equal(denorm.y, 90);
  assert.equal(denorm.w, 720);
  assert.equal(denorm.h, 450);
});

test('OCRBoundingBoxAligner: Clamping Boundary Coordinates', () => {
  const norm = normalizeBoundingBox({ x: -50, y: 950, w: 200, h: 200 }, 1000, 1000);
  assert.equal(norm.x, 0);
  assert.ok(norm.x + norm.w <= 1000);
  assert.ok(norm.y + norm.h <= 1000);
});

test('OCRBoundingBoxAligner: Pairwise IoU Calculation', () => {
  // Identical boxes
  const box1 = { x: 100, y: 100, w: 200, h: 200 };
  assert.equal(calculateIoU(box1, box1), 1.0);

  // Disjoint boxes
  const box2 = { x: 400, y: 400, w: 100, h: 100 };
  assert.equal(calculateIoU(box1, box2), 0.0);

  // Partial overlap: box1 [100..300, 100..300], area=40000
  // box3 [200..400, 100..300], area=40000
  // intersection [200..300, 100..300] = 100 * 200 = 20000
  // union = 40000 + 40000 - 20000 = 60000
  // IoU = 20000 / 60000 = 1/3
  const box3 = { x: 200, y: 100, w: 200, h: 200 };
  assert.ok(Math.abs(calculateIoU(box1, box3) - 1 / 3) < 1e-6);
});

test('OCRBoundingBoxAligner: Enclosure Ratio Calculation', () => {
  const outer = { x: 100, y: 100, w: 500, h: 500 };
  const inner = { x: 150, y: 150, w: 100, h: 50 };
  assert.equal(calculateEnclosure(inner, outer), 1.0);

  // Half enclosed
  const half = { x: 550, y: 150, w: 100, h: 100 };
  assert.equal(calculateEnclosure(half, outer), 0.5);
});

test('OCRBoundingBoxAligner: Exact Match OCR Text Fusion (IoU >= 0.90)', () => {
  const aligner = new OCRBoundingBoxAligner();
  const visualNodes = [
    { node_id: 'btn_submit', component_type: 'PrimaryButton', bbox: [100, 200, 120, 40] }
  ];
  // Slightly shifted OCR box with IoU > 0.90
  const ocrBoxes = [
    { text: 'Submit Application', confidence: 0.98, bbox: [101, 200, 118, 40] }
  ];

  const fused = aligner.fuseOcrWithVisualNodes(visualNodes, ocrBoxes, 1000, 1000);
  assert.equal(fused.length, 1);
  assert.equal(fused[0].fusion_type, 'exact_match');
  assert.equal(fused[0].text_content, 'Submit Application');
});

test('OCRBoundingBoxAligner: Enclosed Child OCR Text Fusion & Natural Reading Order', () => {
  const aligner = new OCRBoundingBoxAligner();
  const visualNodes = [
    { node_id: 'card_user', component_type: 'CardContainer', bbox: [100, 100, 400, 300] }
  ];
  // Two child text lines inside card: Heading then Subtitle
  const ocrBoxes = [
    { text: 'Senior Software Engineer', confidence: 0.95, bbox: [120, 160, 250, 30] },
    { text: 'Jane Doe', confidence: 0.99, bbox: [120, 120, 180, 30] }
  ];

  const fused = aligner.fuseOcrWithVisualNodes(visualNodes, ocrBoxes, 1000, 1000);
  assert.equal(fused.length, 1);
  assert.equal(fused[0].fusion_type, 'enclosed_child');
  // Reading order y ascending should put "Jane Doe" first, then "Senior Software Engineer"
  assert.equal(fused[0].text_content, 'Jane Doe Senior Software Engineer');
});

test('OCRBoundingBoxAligner: Spatial Relations Derivation (above, below, left_of, right_of, contains, aligned)', () => {
  const card = { x: 100, y: 100, w: 400, h: 400 };
  const btn = { x: 120, y: 200, w: 100, h: 40 };
  const input = { x: 120, y: 140, w: 200, h: 40 };

  // Card contains btn
  const cardRelations = evaluateSpatialRelation(card, btn, 'card', 'btn');
  const containsRel = cardRelations.find(r => r.relation_type === 'contains');
  assert.ok(containsRel, 'Card must contain button');

  // Input is above btn (y1=140, y2=180; btn y1=200 -> gap=20)
  const inputRelations = evaluateSpatialRelation(input, btn, 'input', 'btn');
  const aboveRel = inputRelations.find(r => r.relation_type === 'above');
  assert.ok(aboveRel, 'Input must be above button');
  assert.equal(aboveRel.distance, 20);

  // Alignment: input and btn both start at x=120 -> aligned_left
  const alignedLeft = inputRelations.find(r => r.relation_type === 'aligned_left');
  assert.ok(alignedLeft, 'Input and button must be aligned_left');
});

test('OCRBoundingBoxAligner: Canonical Z-Index Mapping', () => {
  assert.equal(getDefaultZIndex('ScreenRoot'), 0);
  assert.equal(getDefaultZIndex('CardContainer'), 10);
  assert.equal(getDefaultZIndex('PrimaryButton'), 20);
  assert.equal(getDefaultZIndex('ModalDialog'), 1000);
  assert.equal(getDefaultZIndex('AlertBannerToast'), 2000);
});

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MULTIMODAL NORMALIZER & OCR BOUNDING BOX ALIGNER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M2 / G-UX-006)
 * Purpose: Coordinate normalization to [0, 1000] integer grid, pairwise IoU
 *          calculation, OCR text fusion (IoU >= 0.90 exact match, IoU < 0.90
 *          enclosed child), spatial relations derivation, and z-index ordering.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const DEFAULT_ALIGNER_CONFIG = Object.freeze({
  exact_match_iou_threshold: 0.90,
  enclosure_threshold: 0.85,
  alignment_tolerance_norm: 6.0,   // 0.6% of normalized grid
  proximity_gap_norm: 60.0         // 6.0% of normalized grid
});

export const CANONICAL_Z_INDICES = Object.freeze({
  ScreenRoot: 0,
  CardContainer: 10,
  DrawerPanel: 100,
  SidebarNavigation: 30,
  HeaderBar: 50,
  FooterBar: 50,
  AccordionSection: 10,
  PrimaryButton: 20,
  SecondaryButton: 20,
  IconButton: 20,
  CheckboxControl: 20,
  RadioGroupControl: 20,
  SwitchToggle: 20,
  SliderControl: 20,
  TextInputField: 20,
  TextAreaField: 20,
  SelectDropdown: 150,
  DatePickerField: 150,
  SearchBarInput: 25,
  FileUploadZone: 15,
  HeadingTypography: 20,
  BodyTypography: 20,
  BadgePill: 25,
  AvatarImage: 20,
  IconGlyph: 20,
  TableViewGrid: 10,
  MetricStatCard: 15,
  AlertBannerToast: 2000,
  BreadcrumbTrail: 20,
  TabBarStrip: 40,
  PaginationControl: 20,
  ModalDialog: 1000
});

/**
 * Normalizes viewport pixel bounding box to [0, 1000] x [0, 1000] integer space.
 *
 * @param {object|Array<number>} bbox Bounding box {x, y, w, h} or [x, y, w, h]
 * @param {number} viewportW Viewport width in pixels
 * @param {number} viewportH Viewport height in pixels
 * @returns {object} Normalized bounding box {x, y, w, h} in [0, 1000]
 */
export function normalizeBoundingBox(bbox, viewportW, viewportH) {
  if (!Number.isFinite(viewportW) || viewportW <= 0 || !Number.isFinite(viewportH) || viewportH <= 0) {
    throw new TypeError(`Invalid viewport dimensions: (${viewportW}, ${viewportH})`);
  }

  const rawX = Array.isArray(bbox) ? bbox[0] : bbox.x;
  const rawY = Array.isArray(bbox) ? bbox[1] : bbox.y;
  const rawW = Array.isArray(bbox) ? bbox[2] : (bbox.w ?? bbox.width);
  const rawH = Array.isArray(bbox) ? bbox[3] : (bbox.h ?? bbox.height);

  let xNorm = Math.max(0, Math.min(1000, Math.round((rawX / viewportW) * 1000)));
  let yNorm = Math.max(0, Math.min(1000, Math.round((rawY / viewportH) * 1000)));
  let wNorm = Math.max(0, Math.min(1000, Math.round((rawW / viewportW) * 1000)));
  let hNorm = Math.max(0, Math.min(1000, Math.round((rawH / viewportH) * 1000)));

  if (xNorm + wNorm > 1000) wNorm = 1000 - xNorm;
  if (yNorm + hNorm > 1000) hNorm = 1000 - yNorm;

  return { x: xNorm, y: yNorm, w: wNorm, h: hNorm };
}

/**
 * Denormalizes [0, 1000] bounding box back to viewport pixels.
 */
export function denormalizeBoundingBox(bboxNorm, viewportW, viewportH) {
  const x = Array.isArray(bboxNorm) ? bboxNorm[0] : bboxNorm.x;
  const y = Array.isArray(bboxNorm) ? bboxNorm[1] : bboxNorm.y;
  const w = Array.isArray(bboxNorm) ? bboxNorm[2] : (bboxNorm.w ?? bboxNorm.width);
  const h = Array.isArray(bboxNorm) ? bboxNorm[3] : (bboxNorm.h ?? bboxNorm.height);

  return {
    x: Math.round((x / 1000) * viewportW),
    y: Math.round((y / 1000) * viewportH),
    w: Math.round((w / 1000) * viewportW),
    h: Math.round((h / 1000) * viewportH)
  };
}

/**
 * Computes Intersection-over-Union (IoU) between two bounding boxes.
 */
export function calculateIoU(boxA, boxB) {
  const ax1 = Array.isArray(boxA) ? boxA[0] : boxA.x;
  const ay1 = Array.isArray(boxA) ? boxA[1] : boxA.y;
  const aw = Array.isArray(boxA) ? boxA[2] : (boxA.w ?? boxA.width);
  const ah = Array.isArray(boxA) ? boxA[3] : (boxA.h ?? boxA.height);
  const ax2 = ax1 + aw;
  const ay2 = ay1 + ah;

  const bx1 = Array.isArray(boxB) ? boxB[0] : boxB.x;
  const by1 = Array.isArray(boxB) ? boxB[1] : boxB.y;
  const bw = Array.isArray(boxB) ? boxB[2] : (boxB.w ?? boxB.width);
  const bh = Array.isArray(boxB) ? boxB[3] : (boxB.h ?? boxB.height);
  const bx2 = bx1 + bw;
  const by2 = by1 + bh;

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  if (interArea <= 0) return 0.0;

  const areaA = aw * ah;
  const areaB = bw * bh;
  const unionArea = areaA + areaB - interArea;

  return unionArea <= 0 ? 0.0 : interArea / unionArea;
}

/**
 * Computes enclosure ratio: Area(inner ∩ outer) / Area(inner).
 */
export function calculateEnclosure(inner, outer) {
  const ix1 = Array.isArray(inner) ? inner[0] : inner.x;
  const iy1 = Array.isArray(inner) ? inner[1] : inner.y;
  const iw = Array.isArray(inner) ? inner[2] : (inner.w ?? inner.width);
  const ih = Array.isArray(inner) ? inner[3] : (inner.h ?? inner.height);
  const ix2 = ix1 + iw;
  const iy2 = iy1 + ih;

  const ox1 = Array.isArray(outer) ? outer[0] : outer.x;
  const oy1 = Array.isArray(outer) ? outer[1] : outer.y;
  const ow = Array.isArray(outer) ? outer[2] : (outer.w ?? outer.width);
  const oh = Array.isArray(outer) ? outer[3] : (outer.h ?? outer.height);
  const ox2 = ox1 + ow;
  const oy2 = oy1 + oh;

  const innerArea = iw * ih;
  if (innerArea <= 0) return 0.0;

  const interX1 = Math.max(ix1, ox1);
  const interY1 = Math.max(iy1, oy1);
  const interX2 = Math.min(ix2, ox2);
  const interY2 = Math.min(iy2, oy2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  return interArea / innerArea;
}

/**
 * Derives pairwise directional and alignment relations between Box A and Box B.
 */
export function evaluateSpatialRelation(boxA, boxB, sourceId, targetId, options = DEFAULT_ALIGNER_CONFIG) {
  const tol = options.alignment_tolerance_norm ?? 6.0;
  const gap = options.proximity_gap_norm ?? 60.0;
  const results = [];

  const ax1 = boxA.x;
  const ay1 = boxA.y;
  const ax2 = boxA.x + boxA.w;
  const ay2 = boxA.y + boxA.h;
  const aMidX = boxA.x + boxA.w / 2;
  const aMidY = boxA.y + boxA.h / 2;

  const bx1 = boxB.x;
  const by1 = boxB.y;
  const bx2 = boxB.x + boxB.w;
  const by2 = boxB.y + boxB.h;
  const bMidX = boxB.x + boxB.w / 2;
  const bMidY = boxB.y + boxB.h / 2;

  // 1. Strict geometric containment
  if (ax1 <= bx1 && ay1 <= by1 && ax2 >= bx2 && ay2 >= by2) {
    results.push({
      source_id: sourceId,
      target_id: targetId,
      relation_type: 'contains',
      distance: 0.0
    });
  }

  // 2. Alignment relations
  if (Math.abs(ax1 - bx1) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'aligned_left', distance: Math.abs(ax1 - bx1) });
  }
  if (Math.abs(ax2 - bx2) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'aligned_right', distance: Math.abs(ax2 - bx2) });
  }
  if (Math.abs(ay1 - by1) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'aligned_top', distance: Math.abs(ay1 - by1) });
  }
  if (Math.abs(ay2 - by2) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'aligned_bottom', distance: Math.abs(ay2 - by2) });
  }
  if (Math.abs(aMidX - bMidX) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'centered_horizontal', distance: Math.abs(aMidX - bMidX) });
  }
  if (Math.abs(aMidY - bMidY) <= tol) {
    results.push({ source_id: sourceId, target_id: targetId, relation_type: 'centered_vertical', distance: Math.abs(aMidY - bMidY) });
  }

  // 3. Directional Relations with horizontal / vertical overlap
  const hasHorizOverlap = !(ax2 < bx1 || ax1 > bx2);
  const hasVertOverlap = !(ay2 < by1 || ay1 > by2);

  // Above
  if (ay2 <= by1 && hasHorizOverlap) {
    const dist = by1 - ay2;
    if (dist <= gap) {
      results.push({ source_id: sourceId, target_id: targetId, relation_type: 'above', distance: dist });
    }
  }

  // Below
  if (ay1 >= by2 && hasHorizOverlap) {
    const dist = ay1 - by2;
    if (dist <= gap) {
      results.push({ source_id: sourceId, target_id: targetId, relation_type: 'below', distance: dist });
    }
  }

  // Left of
  if (ax2 <= bx1 && hasVertOverlap) {
    const dist = bx1 - ax2;
    if (dist <= gap) {
      results.push({ source_id: sourceId, target_id: targetId, relation_type: 'left_of', distance: dist });
    }
  }

  // Right of
  if (ax1 >= bx2 && hasVertOverlap) {
    const dist = ax1 - bx2;
    if (dist <= gap) {
      results.push({ source_id: sourceId, target_id: targetId, relation_type: 'right_of', distance: dist });
    }
  }

  return results;
}

/**
 * Gets canonical z-index.
 */
export function getDefaultZIndex(componentType) {
  return CANONICAL_Z_INDICES[componentType] ?? 10;
}

/**
 * Complete Multimodal Coordinate Normalizer and OCR Bounding Box Aligner.
 */
export class OCRBoundingBoxAligner {
  constructor(config = DEFAULT_ALIGNER_CONFIG) {
    this.config = { ...DEFAULT_ALIGNER_CONFIG, ...config };
  }

  normalize(bbox, viewportW, viewportH) {
    return normalizeBoundingBox(bbox, viewportW, viewportH);
  }

  denormalize(bboxNorm, viewportW, viewportH) {
    return denormalizeBoundingBox(bboxNorm, viewportW, viewportH);
  }

  fuseOcrWithVisualNodes(visualNodes, ocrBoxes, viewportW, viewportH) {
    const normalizedOcr = ocrBoxes.map(ocr => ({
      text: ocr.text,
      confidence: ocr.confidence ?? 1.0,
      bbox: normalizeBoundingBox(ocr.bbox, viewportW, viewportH),
      id: ocr.id
    }));

    const fusedNodes = [];
    const usedOcrIndices = new Set();

    for (let i = 0; i < visualNodes.length; i++) {
      const vn = visualNodes[i];
      const nodeId = vn.node_id || `node_${String(i).padStart(3, '0')}`;
      const cType = vn.component_type || 'CardContainer';
      const rawBbox = vn.bbox;
      const normBbox = normalizeBoundingBox(rawBbox, viewportW, viewportH);
      const zIdx = vn.z_index ?? getDefaultZIndex(cType);

      const exactMatches = [];
      const enclosedChildren = [];

      for (let j = 0; j < normalizedOcr.length; j++) {
        if (usedOcrIndices.has(j)) continue;

        const ocr = normalizedOcr[j];
        const iou = calculateIoU(normBbox, ocr.bbox);
        if (iou >= this.config.exact_match_iou_threshold) {
          exactMatches.push({ index: j, ocr, iou });
        } else {
          const enclosure = calculateEnclosure(ocr.bbox, normBbox);
          if (enclosure >= this.config.enclosure_threshold) {
            enclosedChildren.push({ index: j, ocr, enclosure });
          }
        }
      }

      let textContent = null;
      let fusionType = 'unmatched_visual';
      let childTokens = [];

      if (exactMatches.length > 0) {
        exactMatches.sort((a, b) => b.iou - a.iou);
        const best = exactMatches[0];
        usedOcrIndices.add(best.index);
        textContent = best.ocr.text.trim();
        fusionType = 'exact_match';
        childTokens = [best.ocr];
      } else if (enclosedChildren.length > 0) {
        // Natural reading order: y ascending, then x ascending
        enclosedChildren.sort((a, b) => {
          if (a.ocr.bbox.y !== b.ocr.bbox.y) {
            return a.ocr.bbox.y - b.ocr.bbox.y;
          }
          return a.ocr.bbox.x - b.ocr.bbox.x;
        });

        for (const item of enclosedChildren) {
          usedOcrIndices.add(item.index);
          childTokens.push(item.ocr);
        }
        textContent = childTokens.map(t => t.text.trim()).join(' ');
        fusionType = 'enclosed_child';
      }

      fusedNodes.push({
        node_id: nodeId,
        component_type: cType,
        bbox: rawBbox,
        bbox_normalized: normBbox,
        z_index: zIdx,
        text_content: textContent,
        child_ocr_tokens: childTokens,
        fusion_type: fusionType,
        spatial_relations: []
      });
    }

    // Derive spatial relationships
    for (let i = 0; i < fusedNodes.length; i++) {
      for (let j = 0; j < fusedNodes.length; j++) {
        if (i === j) continue;
        const relations = evaluateSpatialRelation(
          fusedNodes[i].bbox_normalized,
          fusedNodes[j].bbox_normalized,
          fusedNodes[i].node_id,
          fusedNodes[j].node_id,
          this.config
        );
        fusedNodes[i].spatial_relations.push(...relations);
      }
    }

    return fusedNodes;
  }
}

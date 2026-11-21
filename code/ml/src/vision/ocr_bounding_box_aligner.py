"""
Multimodal Coordinate Normalizer & OCR Bounding Box Aligner.

Implements:
1. Coordinate normalization to [0, 1000] x [0, 1000] integer grid.
2. Pairwise Intersection-over-Union (IoU) calculation and enclosure ratio.
3. OCR text fusion: IoU >= 0.90 exact match, IoU < 0.90 and enclosure -> child text label.
4. Natural reading order sorting (y_norm ascending, then x_norm ascending).
5. Spatial relations derivation: above, below, left_of, right_of, aligned_left,
   aligned_right, aligned_top, aligned_bottom, centered_horizontal, centered_vertical, contains.
6. Stacking z-index assignment by component hierarchy and nesting depth.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Union


@dataclass
class BoundingBox:
    """Bounding box in normalized [0, 1000] or absolute viewport coordinates."""
    x: float
    y: float
    w: float
    h: float

    @property
    def x1(self) -> float:
        return self.x

    @property
    def y1(self) -> float:
        return self.y

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    @property
    def area(self) -> float:
        return max(0.0, self.w) * max(0.0, self.h)

    @property
    def center_x(self) -> float:
        return self.x + self.w / 2.0

    @property
    def center_y(self) -> float:
        return self.y + self.h / 2.0

    def to_list(self) -> List[float]:
        return [self.x, self.y, self.w, self.h]

    def to_int_list(self) -> List[int]:
        return [int(round(self.x)), int(round(self.y)), int(round(self.w)), int(round(self.h))]


@dataclass
class OCRTextBox:
    """Raw OCR text detection entry."""
    text: str
    confidence: float
    bbox: BoundingBox
    id: Optional[str] = None


@dataclass
class SpatialRelation:
    """Derived spatial relationship between two nodes."""
    source_id: str
    target_id: str
    relation_type: str  # 'above' | 'below' | 'left_of' | 'right_of' | 'aligned_left' | 'aligned_top' | 'centered_horizontal' | 'contains'
    distance: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FusedComponentNode:
    """Visual component node fused with OCR text and spatial properties."""
    node_id: str
    component_type: str
    bbox: BoundingBox
    bbox_normalized: BoundingBox
    z_index: int
    text_content: Optional[str] = None
    child_ocr_tokens: List[OCRTextBox] = field(default_factory=list)
    fusion_type: Optional[str] = None  # 'exact_match' | 'enclosed_child' | 'unmatched_visual'
    spatial_relations: List[SpatialRelation] = field(default_factory=list)


def calculate_iou(box_a: BoundingBox, box_b: BoundingBox) -> float:
    """
    Computes Intersection-over-Union (IoU) between two bounding boxes.
    IoU = Area(A ∩ B) / Area(A ∪ B)
    """
    inter_x1 = max(box_a.x1, box_b.x1)
    inter_y1 = max(box_a.y1, box_b.y1)
    inter_x2 = min(box_a.x2, box_b.x2)
    inter_y2 = min(box_a.y2, box_b.y2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    if inter_area <= 0.0:
        return 0.0

    union_area = box_a.area + box_b.area - inter_area
    if union_area <= 0.0:
        return 0.0

    return inter_area / union_area


def calculate_enclosure(inner: BoundingBox, outer: BoundingBox) -> float:
    """
    Computes ratio of inner box area contained within outer box.
    Enclosure = Area(inner ∩ outer) / Area(inner)
    """
    if inner.area <= 0.0:
        return 0.0

    inter_x1 = max(inner.x1, outer.x1)
    inter_y1 = max(inner.y1, outer.y1)
    inter_x2 = min(inner.x2, outer.x2)
    inter_y2 = min(inner.y2, outer.y2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    return inter_area / inner.area


class OCRBoundingBoxAligner:
    """
    Multimodal Coordinate Normalizer and OCR Text Aligner.
    Maps pixel boxes to [0, 1000] grid, fuses OCR text with visual boxes,
    and derives directional and alignment spatial relations.
    """

    def __init__(
        self,
        exact_match_iou_threshold: float = 0.90,
        enclosure_threshold: float = 0.85,
        alignment_tolerance_norm: float = 6.0,   # 0.6% of normalized grid
        proximity_gap_norm: float = 60.0,        # 6.0% of normalized grid
    ) -> None:
        self.exact_match_iou_threshold = exact_match_iou_threshold
        self.enclosure_threshold = enclosure_threshold
        self.alignment_tolerance_norm = alignment_tolerance_norm
        self.proximity_gap_norm = proximity_gap_norm

    @staticmethod
    def normalize_bbox(bbox: BoundingBox, viewport_w: float, viewport_h: float) -> BoundingBox:
        """Maps viewport pixel bounding box to [0, 1000] x [0, 1000] normalized integer space."""
        if viewport_w <= 0 or viewport_h <= 0:
            raise ValueError(f"Invalid viewport dimensions: ({viewport_w}, {viewport_h})")

        x_norm = max(0.0, min(1000.0, round((bbox.x / viewport_w) * 1000.0)))
        y_norm = max(0.0, min(1000.0, round((bbox.y / viewport_h) * 1000.0)))
        w_norm = max(0.0, min(1000.0, round((bbox.w / viewport_w) * 1000.0)))
        h_norm = max(0.0, min(1000.0, round((bbox.h / viewport_h) * 1000.0)))

        # Ensure x + w <= 1000 and y + h <= 1000
        if x_norm + w_norm > 1000.0:
            w_norm = 1000.0 - x_norm
        if y_norm + h_norm > 1000.0:
            h_norm = 1000.0 - y_norm

        return BoundingBox(x=x_norm, y=y_norm, w=w_norm, h=h_norm)

    @staticmethod
    def denormalize_bbox(bbox_norm: BoundingBox, viewport_w: float, viewport_h: float) -> BoundingBox:
        """Maps [0, 1000] normalized bounding box back to viewport pixel coordinates."""
        x = round((bbox_norm.x / 1000.0) * viewport_w)
        y = round((bbox_norm.y / 1000.0) * viewport_h)
        w = round((bbox_norm.w / 1000.0) * viewport_w)
        h = round((bbox_norm.h / 1000.0) * viewport_h)
        return BoundingBox(x=x, y=y, w=w, h=h)

    def fuse_ocr_with_visual_boxes(
        self,
        visual_nodes: List[Dict[str, Any]],
        ocr_boxes: List[OCRTextBox],
        viewport_w: float,
        viewport_h: float,
    ) -> List[FusedComponentNode]:
        """
        Fuses visual detection boxes with OCR text detections:
        1. Normalizes all coordinates to [0, 1000].
        2. Assigns exact match if IoU >= 0.90.
        3. Assigns enclosed child if enclosure >= 0.85.
        4. Sorts child text in natural reading order (y -> x).
        """
        # Normalize OCR boxes
        normalized_ocr = []
        for ocr in ocr_boxes:
            norm_box = self.normalize_bbox(ocr.bbox, viewport_w, viewport_h)
            normalized_ocr.append(OCRTextBox(
                text=ocr.text,
                confidence=ocr.confidence,
                bbox=norm_box,
                id=ocr.id,
            ))

        fused_nodes: List[FusedComponentNode] = []
        used_ocr_indices = set()

        # Step A: Process visual nodes
        for idx, vn in enumerate(visual_nodes):
            node_id = vn.get("node_id", f"node_{idx:03d}")
            c_type = vn.get("component_type", "CardContainer")
            raw_bbox = vn["bbox"] if isinstance(vn["bbox"], BoundingBox) else BoundingBox(*vn["bbox"])
            norm_bbox = self.normalize_bbox(raw_bbox, viewport_w, viewport_h)
            z_idx = vn.get("z_index", self.get_default_z_index(c_type))

            # Find matching OCR boxes
            exact_matches = []
            enclosed_children = []

            for o_idx, ocr in enumerate(normalized_ocr):
                if o_idx in used_ocr_indices:
                    continue

                iou = calculate_iou(norm_bbox, ocr.bbox)
                if iou >= self.exact_match_iou_threshold:
                    exact_matches.append((o_idx, ocr, iou))
                else:
                    enclosure = calculate_enclosure(ocr.bbox, norm_bbox)
                    if enclosure >= self.enclosure_threshold:
                        enclosed_children.append((o_idx, ocr, enclosure))

            if exact_matches:
                # Direct exact match
                best_match = max(exact_matches, key=lambda x: x[2])
                used_ocr_indices.add(best_match[0])
                fused_node = FusedComponentNode(
                    node_id=node_id,
                    component_type=c_type,
                    bbox=raw_bbox,
                    bbox_normalized=norm_bbox,
                    z_index=z_idx,
                    text_content=best_match[1].text.strip(),
                    child_ocr_tokens=[best_match[1]],
                    fusion_type="exact_match",
                )
            elif enclosed_children:
                # Multiple or single child text elements enclosed
                # Sort in natural reading order: y ascending, then x ascending
                enclosed_children.sort(key=lambda item: (item[1].bbox.y, item[1].bbox.x))
                child_tokens = []
                text_parts = []
                for o_idx, ocr, _ in enclosed_children:
                    used_ocr_indices.add(o_idx)
                    child_tokens.append(ocr)
                    text_parts.append(ocr.text.strip())

                fused_node = FusedComponentNode(
                    node_id=node_id,
                    component_type=c_type,
                    bbox=raw_bbox,
                    bbox_normalized=norm_bbox,
                    z_index=z_idx,
                    text_content=" ".join(text_parts),
                    child_ocr_tokens=child_tokens,
                    fusion_type="enclosed_child",
                )
            else:
                fused_node = FusedComponentNode(
                    node_id=node_id,
                    component_type=c_type,
                    bbox=raw_bbox,
                    bbox_normalized=norm_bbox,
                    z_index=z_idx,
                    text_content=None,
                    child_ocr_tokens=[],
                    fusion_type="unmatched_visual",
                )

            fused_nodes.append(fused_node)

        # Step B: Derive spatial relationships between all fused nodes
        self.derive_pairwise_spatial_relations(fused_nodes)

        return fused_nodes

    def derive_pairwise_spatial_relations(self, nodes: List[FusedComponentNode]) -> None:
        """Derives directional and alignment spatial relations across all node pairs."""
        n = len(nodes)
        for i in range(n):
            a = nodes[i]
            for j in range(n):
                if i == j:
                    continue
                b = nodes[j]
                relations = self.evaluate_spatial_relation(a.bbox_normalized, b.bbox_normalized, a.node_id, b.node_id)
                a.spatial_relations.extend(relations)

    def evaluate_spatial_relation(
        self,
        a: BoundingBox,
        b: BoundingBox,
        source_id: str,
        target_id: str,
    ) -> List[SpatialRelation]:
        """Evaluates pairwise spatial relations from A to B."""
        results: List[SpatialRelation] = []
        tol = self.alignment_tolerance_norm
        gap = self.proximity_gap_norm

        # 1. Strict geometric containment: A contains B
        if a.x1 <= b.x1 and a.y1 <= b.y1 and a.x2 >= b.x2 and a.y2 >= b.y2:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="contains",
                distance=0.0,
            ))

        # 2. Alignment relations
        if abs(a.x1 - b.x1) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="aligned_left",
                distance=abs(a.x1 - b.x1),
            ))

        if abs(a.x2 - b.x2) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="aligned_right",
                distance=abs(a.x2 - b.x2),
            ))

        if abs(a.y1 - b.y1) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="aligned_top",
                distance=abs(a.y1 - b.y1),
            ))

        if abs(a.y2 - b.y2) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="aligned_bottom",
                distance=abs(a.y2 - b.y2),
            ))

        if abs(a.center_x - b.center_x) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="centered_horizontal",
                distance=abs(a.center_x - b.center_x),
            ))

        if abs(a.center_y - b.center_y) <= tol:
            results.append(SpatialRelation(
                source_id=source_id,
                target_id=target_id,
                relation_type="centered_vertical",
                distance=abs(a.center_y - b.center_y),
            ))

        # 3. Directional Relations (with proximity constraint)
        # Check horizontal overlap
        has_horiz_overlap = not (a.x2 < b.x1 or a.x1 > b.x2)
        # Check vertical overlap
        has_vert_overlap = not (a.y2 < b.y1 or a.y1 > b.y2)

        # Above: A is above B (a.y2 <= b.y1)
        if a.y2 <= b.y1 and has_horiz_overlap:
            dist = b.y1 - a.y2
            if dist <= gap:
                results.append(SpatialRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type="above",
                    distance=dist,
                ))

        # Below: A is below B (a.y1 >= b.y2)
        if a.y1 >= b.y2 and has_horiz_overlap:
            dist = a.y1 - b.y2
            if dist <= gap:
                results.append(SpatialRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type="below",
                    distance=dist,
                ))

        # Left of: A is left of B (a.x2 <= b.x1)
        if a.x2 <= b.x1 and has_vert_overlap:
            dist = b.x1 - a.x2
            if dist <= gap:
                results.append(SpatialRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type="left_of",
                    distance=dist,
                ))

        # Right of: A is right of B (a.x1 >= b.x2)
        if a.x1 >= b.x2 and has_vert_overlap:
            dist = a.x1 - b.x2
            if dist <= gap:
                results.append(SpatialRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type="right_of",
                    distance=dist,
                ))

        return results

    @staticmethod
    def get_default_z_index(component_type: str) -> int:
        """Returns baseline canonical z-index based on component classification."""
        tier_map = {
            "ScreenRoot": 0,
            "CardContainer": 10,
            "DrawerPanel": 100,
            "SidebarNavigation": 30,
            "HeaderBar": 50,
            "FooterBar": 50,
            "AccordionSection": 10,
            "PrimaryButton": 20,
            "SecondaryButton": 20,
            "IconButton": 20,
            "CheckboxControl": 20,
            "RadioGroupControl": 20,
            "SwitchToggle": 20,
            "SliderControl": 20,
            "TextInputField": 20,
            "TextAreaField": 20,
            "SelectDropdown": 150,
            "DatePickerField": 150,
            "SearchBarInput": 25,
            "FileUploadZone": 15,
            "HeadingTypography": 20,
            "BodyTypography": 20,
            "BadgePill": 25,
            "AvatarImage": 20,
            "IconGlyph": 20,
            "TableViewGrid": 10,
            "MetricStatCard": 15,
            "AlertBannerToast": 2000,
            "BreadcrumbTrail": 20,
            "TabBarStrip": 40,
            "PaginationControl": 20,
            "ModalDialog": 1000,
        }
        return tier_map.get(component_type, 10)

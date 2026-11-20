"""
Unit tests for Multimodal Coordinate Normalizer & OCR Bounding Box Aligner (Python).
Tests coordinate normalization to [0, 1000], IoU calculation, enclosure calculation,
OCR text fusion, reading order sorting, spatial relations, and z-index assignment.
"""

import sys
import os
import pytest

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.ocr_bounding_box_aligner import (
    BoundingBox,
    OCRTextBox,
    FusedComponentNode,
    SpatialRelation,
    OCRBoundingBoxAligner,
    calculate_iou,
    calculate_enclosure,
)


def test_bounding_box_properties():
    box = BoundingBox(x=10.0, y=20.0, w=100.0, h=50.0)
    assert box.x1 == 10.0
    assert box.y1 == 20.0
    assert box.x2 == 110.0
    assert box.y2 == 70.0
    assert box.area == 5000.0
    assert box.center_x == 60.0
    assert box.center_y == 45.0
    assert box.to_int_list() == [10, 20, 100, 50]


def test_calculate_iou():
    b1 = BoundingBox(100, 100, 200, 200)
    b2 = BoundingBox(100, 100, 200, 200)
    assert calculate_iou(b1, b2) == 1.0

    b3 = BoundingBox(400, 400, 50, 50)
    assert calculate_iou(b1, b3) == 0.0

    # Overlapping
    b4 = BoundingBox(200, 100, 200, 200)
    assert abs(calculate_iou(b1, b4) - 1.0 / 3.0) < 1e-6


def test_calculate_enclosure():
    outer = BoundingBox(50, 50, 500, 500)
    inner = BoundingBox(100, 100, 100, 100)
    assert calculate_enclosure(inner, outer) == 1.0

    half = BoundingBox(500, 100, 100, 100)
    assert calculate_enclosure(half, outer) == 0.5


def test_normalization_and_denormalization():
    raw = BoundingBox(144, 90, 720, 450)
    norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1440, 900)
    assert norm.x == 100.0
    assert norm.y == 100.0
    assert norm.w == 500.0
    assert norm.h == 500.0

    denorm = OCRBoundingBoxAligner.denormalize_bbox(norm, 1440, 900)
    assert denorm.x == 144.0
    assert denorm.y == 90.0
    assert denorm.w == 720.0
    assert denorm.h == 450.0


def test_ocr_text_fusion_exact_match():
    aligner = OCRBoundingBoxAligner()
    visual = [{"node_id": "btn_save", "component_type": "PrimaryButton", "bbox": [100, 200, 120, 40]}]
    ocr = [OCRTextBox(text="Save Draft", confidence=0.99, bbox=BoundingBox(101, 200, 118, 40))]

    fused = aligner.fuse_ocr_with_visual_boxes(visual, ocr, 1000, 1000)
    assert len(fused) == 1
    assert fused[0].fusion_type == "exact_match"
    assert fused[0].text_content == "Save Draft"


def test_ocr_text_fusion_enclosed_child():
    aligner = OCRBoundingBoxAligner()
    visual = [{"node_id": "card_user", "component_type": "CardContainer", "bbox": [100, 100, 400, 300]}]
    ocr = [
        OCRTextBox(text="Engineer", confidence=0.95, bbox=BoundingBox(120, 150, 200, 30)),
        OCRTextBox(text="Alice Smith", confidence=0.98, bbox=BoundingBox(120, 110, 180, 30)),
    ]

    fused = aligner.fuse_ocr_with_visual_boxes(visual, ocr, 1000, 1000)
    assert len(fused) == 1
    assert fused[0].fusion_type == "enclosed_child"
    assert fused[0].text_content == "Alice Smith Engineer"


def test_spatial_relations_containment_and_directional():
    aligner = OCRBoundingBoxAligner()
    container = BoundingBox(100, 100, 500, 500)
    child = BoundingBox(120, 120, 100, 40)
    sibling = BoundingBox(120, 180, 100, 40)

    # Containment
    rel_cont = aligner.evaluate_spatial_relation(container, child, "container", "child")
    assert any(r.relation_type == "contains" for r in rel_cont)

    # Above & Aligned Left
    rel_dir = aligner.evaluate_spatial_relation(child, sibling, "child", "sibling")
    assert any(r.relation_type == "above" for r in rel_dir)
    assert any(r.relation_type == "aligned_left" for r in rel_dir)


def test_canonical_z_indices():
    assert OCRBoundingBoxAligner.get_default_z_index("ScreenRoot") == 0
    assert OCRBoundingBoxAligner.get_default_z_index("CardContainer") == 10
    assert OCRBoundingBoxAligner.get_default_z_index("ModalDialog") == 1000
    assert OCRBoundingBoxAligner.get_default_z_index("AlertBannerToast") == 2000

"""
tests/ml/test_wave2_m2_adversarial_stress.py

⚔️ SODA OS ADVERSARIAL CHALLENGER STRESS SUITE — MILESTONE 2 (PYTHON / PyTorch)
Target Goals: G-UX-005 (Gemma 4 Vision Adapter) & G-UX-006 (OCR Bbox Aligner)
Archetype: Empirical Challenger (challenger_wave2_1)

Stress-Tests:
1. G-UX-005 Viewport & Letterboxing Fuzzing:
   - Extreme aspect ratios (32:9, 21:9, 9:16, 1:3, 10:1, 1:10, 1:1)
   - Extreme resolutions (1x1, 10x10, 8000x8000)
   - Slate-900 rgb(15, 23, 42) letterbox padding verification on PyTorch tensors
   - Dynamic tiling token budget verification (<= 11% context on Desktop)
   - Hostile input dimension rejection (ValueError)
   - 5,000-iteration randomized letterbox fuzzing harness
2. G-UX-006 Coordinate Normalization Boundary Stress:
   - Negative, overflow, zero-area, and inverted coordinates clamping to [0, 1000] integer grid
   - Hostile input typing (NaN -> ValueError, Inf -> OverflowError, str -> TypeError)
   - 5,000-iteration randomized normalization fuzzing harness
3. G-UX-006 OCR Text Fusion Stress:
   - Exact IoU boundary at 0.9000 (0.89998 vs 0.90002)
   - Exact Enclosure boundary at 0.8500 (0.849 vs 0.850)
   - Conflicting text labels and single-consumption invariants
   - Reading order tie-breaking on identical (y, x) coordinates
"""

from __future__ import annotations

import math
import os
import random
import sys
import pytest
import torch

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.gemma4_multimodal_adapter import (
    Gemma4VisionConfig,
    Gemma4MultimodalVisionAdapter,
    LetterboxGeometry,
    TileInfo,
    CANONICAL_VIEWPORTS,
    SLATE_900_RGB,
    SLATE_900_HEX,
)
from src.vision.ocr_bounding_box_aligner import (
    BoundingBox,
    OCRTextBox,
    FusedComponentNode,
    SpatialRelation,
    OCRBoundingBoxAligner,
    calculate_iou,
    calculate_enclosure,
)


# ==============================================================================
# 1. VIEWPORT & LETTERBOXING FUZZING (G-UX-005)
# ==============================================================================
class TestGemma4ViewportFuzzing:
    """Adversarial stress-testing of letterbox geometry and PyTorch canvas padding."""

    @pytest.fixture
    def adapter(self) -> Gemma4MultimodalVisionAdapter:
        return Gemma4MultimodalVisionAdapter()

    def test_extreme_aspect_ratios_geometry(self):
        """Verify geometry sum and symmetry across extreme aspect ratios."""
        probe_cases = [
            ("Ultrawide 32:9", 5120, 1440, 1440, 900),
            ("Ultrawide 21:9", 3440, 1440, 1440, 900),
            ("Vertical 9:16", 1080, 1920, 1440, 900),
            ("Tall 1:3", 300, 900, 1440, 900),
            ("Wide Banner 10:1", 3000, 300, 1440, 900),
            ("Tall Ribbon 1:10", 200, 2000, 1440, 900),
            ("Square 1:1", 1000, 1000, 1440, 900),
            ("Standard 4:3", 1024, 768, 1440, 900),
        ]

        for name, src_w, src_h, tgt_w, tgt_h in probe_cases:
            geom = Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(src_w, src_h, tgt_w, tgt_h)
            assert geom.scaled_width + geom.pad_left + geom.pad_right == tgt_w, f"[{name}] Width sum mismatch"
            assert geom.scaled_height + geom.pad_top + geom.pad_bottom == tgt_h, f"[{name}] Height sum mismatch"
            assert abs(geom.pad_left - geom.pad_right) <= 1, f"[{name}] Horizontal padding asymmetry > 1"
            assert abs(geom.pad_top - geom.pad_bottom) <= 1, f"[{name}] Vertical padding asymmetry > 1"

    def test_extreme_dimensions(self):
        """Verify tiny (1x1, 10x10) and massive (8000x8000) dimensions."""
        extremes = [
            (1, 1, 1440, 900),
            (10, 10, 1440, 900),
            (100, 100, 390, 844),
            (8000, 8000, 1440, 900),
        ]
        for src_w, src_h, tgt_w, tgt_h in extremes:
            geom = Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(src_w, src_h, tgt_w, tgt_h)
            assert geom.scale > 0.0
            assert geom.scaled_width <= tgt_w
            assert geom.scaled_height <= tgt_h
            assert geom.scaled_width + geom.pad_left + geom.pad_right == tgt_w
            assert geom.scaled_height + geom.pad_top + geom.pad_bottom == tgt_h

    def test_pytorch_tensor_slate900_padding(self, adapter):
        """Verify that padded margin pixels on PyTorch tensor strictly equal Slate-900 rgb(15, 23, 42)."""
        expected_pad = [v / 255.0 for v in SLATE_900_RGB]

        # Ultrawide 32:9 has vertical padding (top and bottom)
        img_uw = torch.rand(3, 1440, 5120)
        canvas_uw, geom_uw = adapter.letterbox_tensor(img_uw, 1440, 900)
        assert canvas_uw.shape == (3, 900, 1440)
        assert geom_uw.pad_top > 0 and geom_uw.pad_bottom > 0
        top_pixel = canvas_uw[:, 0, 720].tolist()
        for exp, act in zip(expected_pad, top_pixel):
            assert abs(exp - act) < 1e-4

        # Vertical 9:16 has horizontal padding (left and right)
        img_vert = torch.rand(3, 1920, 1080)
        canvas_v, geom_v = adapter.letterbox_tensor(img_vert, 1440, 900)
        assert canvas_v.shape == (3, 900, 1440)
        assert geom_v.pad_left > 0 and geom_v.pad_right > 0
        left_pixel = canvas_v[:, 450, 0].tolist()
        for exp, act in zip(expected_pad, left_pixel):
            assert abs(exp - act) < 1e-4

    def test_desktop_token_budget_bound(self, adapter):
        """Verify dynamic tiling yields 7 tiles and strictly <= 11% context on Desktop."""
        tiles = adapter.compute_dynamic_tiles(1440, 900, "desktop")
        assert len(tiles) == 7

        grid_tiles = [t for t in tiles if t.tile_type == "grid"]
        thumb_tile = [t for t in tiles if t.tile_type == "thumbnail"]
        assert len(grid_tiles) == 6
        assert len(thumb_tile) == 1

        for t in grid_tiles:
            assert t.width == 448
            assert t.height == 448
            assert 0 <= t.x <= 1440 - 448
            assert 0 <= t.y <= 900 - 448

        total_tokens = sum(t.tokens_count for t in tiles)
        assert total_tokens == 1792

        budget = adapter.verify_token_budget(total_tokens, 16384)
        assert budget["token_budget_percentage"] == 10.9375
        assert budget["token_budget_percentage"] <= 11.0
        assert budget["within_budget"] is True

    def test_invalid_dimensions_rejection(self):
        """Verify non-positive dimensions raise ValueError."""
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(0, 100, 1440, 900)
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(100, 0, 1440, 900)
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(-100, 100, 1440, 900)
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(100, -100, 1440, 900)
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(100, 100, 0, 900)
        with pytest.raises(ValueError):
            Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(100, 100, 1440, 0)

    def test_5000_randomized_letterbox_fuzzing(self):
        """Randomized fuzzing over 5,000 parameter combinations."""
        passed = 0
        total = 5000
        for _ in range(total):
            src_w = random.randint(1, 8000)
            src_h = random.randint(1, 8000)
            tgt_w = random.randint(1, 3840)
            tgt_h = random.randint(1, 2160)

            geom = Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(src_w, src_h, tgt_w, tgt_h)
            if (
                geom.scaled_width + geom.pad_left + geom.pad_right == tgt_w and
                geom.scaled_height + geom.pad_top + geom.pad_bottom == tgt_h and
                geom.scaled_width <= tgt_w and
                geom.scaled_height <= tgt_h and
                geom.pad_left >= 0 and
                geom.pad_right >= 0 and
                geom.pad_top >= 0 and
                geom.pad_bottom >= 0
            ):
                passed += 1

        assert passed == total


# ==============================================================================
# 2. COORDINATE NORMALIZATION BOUNDARY STRESS (G-UX-006)
# ==============================================================================
class TestCoordinateNormalizationBoundaryStress:
    """Adversarial stress-testing of coordinate normalizer boundaries and types."""

    def test_negative_coordinates_clamped(self):
        """Negative coordinates must clamp to 0 along x and y."""
        raw = BoundingBox(-250.0, -400.0, 300.0, 400.0)
        norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1440.0, 900.0)
        assert norm.x == 0.0
        assert norm.y == 0.0
        assert float(norm.x).is_integer()
        assert float(norm.y).is_integer()
        assert norm.w >= 0.0 and norm.x + norm.w <= 1000.0
        assert norm.h >= 0.0 and norm.y + norm.h <= 1000.0

    def test_overflow_coordinates_clamped(self):
        """Coordinates exceeding viewport clamp to 1000 and adjust dimensions."""
        raw = BoundingBox(3000.0, 2000.0, 400.0, 300.0)
        norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1440.0, 900.0)
        assert norm.x == 1000.0
        assert norm.y == 1000.0
        assert norm.w == 0.0
        assert norm.h == 0.0

    def test_partial_overflow_adjustment(self):
        """Partial overflow must adjust width and height to fit within [0, 1000]."""
        raw = BoundingBox(1200.0, 750.0, 500.0, 400.0)
        norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1440.0, 900.0)
        assert 0.0 <= norm.x <= 1000.0
        assert 0.0 <= norm.y <= 1000.0
        assert norm.x + norm.w <= 1000.0
        assert norm.y + norm.h <= 1000.0

    def test_zero_area_box_safe(self):
        """Zero-width and zero-height boxes must normalize safely without division by zero."""
        raw = BoundingBox(144.0, 90.0, 0.0, 0.0)
        norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1440.0, 900.0)
        assert norm.x == 100.0
        assert norm.y == 100.0
        assert norm.w == 0.0
        assert norm.h == 0.0

        other = BoundingBox(100.0, 100.0, 200.0, 200.0)
        assert calculate_iou(norm, other) == 0.0
        assert calculate_enclosure(norm, other) == 0.0

    def test_inverted_coordinates_clamped(self):
        """Inverted coordinates (negative w or h) must clamp width and height to 0."""
        raw = BoundingBox(200.0, 200.0, -100.0, -50.0)
        norm = OCRBoundingBoxAligner.normalize_bbox(raw, 1000.0, 1000.0)
        assert norm.w == 0.0
        assert norm.h == 0.0
        assert norm.x == 200.0
        assert norm.y == 200.0

    def test_hostile_type_rejection(self):
        """Verify fail-closed exception raising on NaN, Inf, None, and str."""
        with pytest.raises(ValueError):
            OCRBoundingBoxAligner.normalize_bbox(BoundingBox(float("nan"), 0, 100, 100), 1000, 1000)
        with pytest.raises(OverflowError):
            OCRBoundingBoxAligner.normalize_bbox(BoundingBox(float("inf"), 0, 100, 100), 1000, 1000)
        with pytest.raises(AttributeError):
            OCRBoundingBoxAligner.normalize_bbox(None, 1000, 1000)
        with pytest.raises(TypeError):
            OCRBoundingBoxAligner.normalize_bbox(BoundingBox("invalid", 0, 100, 100), 1000, 1000)

    def test_invalid_viewport_rejection(self):
        """Verify non-positive viewport dimensions raise ValueError."""
        raw = BoundingBox(10, 10, 50, 50)
        with pytest.raises(ValueError):
            OCRBoundingBoxAligner.normalize_bbox(raw, 0, 1000)
        with pytest.raises(ValueError):
            OCRBoundingBoxAligner.normalize_bbox(raw, 1000, -100)

    def test_5000_randomized_normalization_fuzzing(self):
        """Randomized fuzzing over 5,000 coordinate normalization inputs."""
        passed = 0
        total = 5000
        for _ in range(total):
            raw_x = (random.random() - 0.5) * 5000.0
            raw_y = (random.random() - 0.5) * 5000.0
            raw_w = (random.random() - 0.2) * 5000.0
            raw_h = (random.random() - 0.2) * 5000.0
            vp_w = random.randint(1, 3840)
            vp_h = random.randint(1, 2160)

            box = BoundingBox(raw_x, raw_y, raw_w, raw_h)
            norm = OCRBoundingBoxAligner.normalize_bbox(box, vp_w, vp_h)

            x_int = float(norm.x).is_integer()
            y_int = float(norm.y).is_integer()
            w_int = float(norm.w).is_integer()
            h_int = float(norm.h).is_integer()

            if (
                x_int and 0.0 <= norm.x <= 1000.0 and
                y_int and 0.0 <= norm.y <= 1000.0 and
                w_int and 0.0 <= norm.w <= 1000.0 and
                h_int and 0.0 <= norm.h <= 1000.0 and
                norm.x + norm.w <= 1000.0 and
                norm.y + norm.h <= 1000.0
            ):
                passed += 1

        assert passed == total


# ==============================================================================
# 3. OCR BOUNDING BOX ALIGNMENT & TEXT FUSION STRESS (G-UX-006)
# ==============================================================================
class TestOCRTextFusionStress:
    """Adversarial stress-testing of OCR fusion boundaries and collision handling."""

    @pytest.fixture
    def aligner(self) -> OCRBoundingBoxAligner:
        return OCRBoundingBoxAligner()

    def test_iou_exact_boundary(self, aligner):
        """IoU boundary at 0.9000: < 0.90 must not exact match, >= 0.90 must exact match."""
        b1 = BoundingBox(100.0, 100.0, 100.0, 100.0)

        # delta = 5.264 -> IoU = (100 - 5.264)/(100 + 5.264) = 94.736/105.264 = 0.899984 < 0.90
        b_below = BoundingBox(105.264, 100.0, 100.0, 100.0)
        iou_below = calculate_iou(b1, b_below)
        assert iou_below < 0.90

        # delta = 5.262 -> IoU = (100 - 5.262)/(100 + 5.262) = 94.738/105.262 = 0.900020 >= 0.90
        b_above = BoundingBox(105.262, 100.0, 100.0, 100.0)
        iou_above = calculate_iou(b1, b_above)
        assert iou_above >= 0.90

        # Fusion test on normalized grid
        visual = [{"node_id": "btn", "component_type": "PrimaryButton", "bbox": [100, 100, 500, 500]}]
        ocr_below = [OCRTextBox(text="Below", confidence=0.99, bbox=BoundingBox(127, 100, 500, 500))]
        fused_below = aligner.fuse_ocr_with_visual_boxes(visual, ocr_below, 1000, 1000)
        assert fused_below[0].fusion_type != "exact_match"

        ocr_above = [OCRTextBox(text="Above", confidence=0.99, bbox=BoundingBox(126, 100, 500, 500))]
        fused_above = aligner.fuse_ocr_with_visual_boxes(visual, ocr_above, 1000, 1000)
        assert fused_above[0].fusion_type == "exact_match"
        assert fused_above[0].text_content == "Above"

    def test_enclosure_exact_boundary(self, aligner):
        """Enclosure boundary at 0.8500: < 0.85 must not be enclosed_child, >= 0.85 must be."""
        outer = BoundingBox(100.0, 100.0, 200.0, 200.0)

        # Inner at 215.1 on outer [100..300]: overlap = 300 - 215.1 = 84.9 -> enclosure = 0.849 < 0.85
        inner_float_below = BoundingBox(215.1, 100.0, 100.0, 100.0)
        assert calculate_enclosure(inner_float_below, outer) < 0.85

        # Inner at 215.0 on outer [100..300]: overlap = 300 - 215.0 = 85.0 -> enclosure = 0.850 >= 0.85
        inner_at = BoundingBox(215.0, 100.0, 100.0, 100.0)
        assert calculate_enclosure(inner_at, outer) >= 0.85

        # Fusion test on normalized integer grid: 216 normalizes to 216 -> overlap 84px -> enclosure 0.84 < 0.85
        visual_card = [{"node_id": "card", "component_type": "CardContainer", "bbox": [100, 100, 200, 200]}]
        ocr_enc_below = [OCRTextBox(text="Excluded", confidence=0.9, bbox=BoundingBox(216.0, 100.0, 100.0, 100.0))]
        fused_below = aligner.fuse_ocr_with_visual_boxes(visual_card, ocr_enc_below, 1000, 1000)
        assert fused_below[0].fusion_type == "unmatched_visual"
        assert fused_below[0].text_content is None

        ocr_enc_at = [OCRTextBox(text="Included", confidence=0.9, bbox=inner_at)]
        fused_at = aligner.fuse_ocr_with_visual_boxes(visual_card, ocr_enc_at, 1000, 1000)
        assert fused_at[0].fusion_type == "enclosed_child"
        assert fused_at[0].text_content == "Included"

    def test_conflicting_text_labels_single_consumption(self, aligner):
        """Conflicting text labels on exact match must select deterministically without duplication."""
        visual = [{"node_id": "btn", "component_type": "PrimaryButton", "bbox": [200, 200, 120, 40]}]
        candidates = [
            OCRTextBox(text="Primary Action", confidence=0.99, bbox=BoundingBox(200, 200, 120, 40)),
            OCRTextBox(text="Secondary Action", confidence=0.95, bbox=BoundingBox(200, 200, 120, 40)),
        ]
        fused = aligner.fuse_ocr_with_visual_boxes(visual, candidates, 1000, 1000)
        assert len(fused) == 1
        assert fused[0].fusion_type == "exact_match"
        assert fused[0].text_content == "Primary Action"
        assert len(fused[0].child_ocr_tokens) == 1

    def test_competing_visual_nodes_exclusive_consumption(self, aligner):
        """When two visual nodes compete for one OCR box, token is consumed once without duplication."""
        visual = [
            {"node_id": "btn_1", "component_type": "PrimaryButton", "bbox": [100, 100, 100, 40]},
            {"node_id": "btn_2", "component_type": "SecondaryButton", "bbox": [100, 100, 100, 40]},
        ]
        ocr = [OCRTextBox(text="Exclusive", confidence=0.99, bbox=BoundingBox(100, 100, 100, 40))]
        fused = aligner.fuse_ocr_with_visual_boxes(visual, ocr, 1000, 1000)
        assert fused[0].text_content == "Exclusive"
        assert fused[0].fusion_type == "exact_match"
        assert fused[1].text_content is None
        assert fused[1].fusion_type == "unmatched_visual"

    def test_reading_order_tie_breaking(self, aligner):
        """Verify natural reading order sorting (y ascending, then x ascending, stable tie-break)."""
        visual_card = [{"node_id": "card", "component_type": "CardContainer", "bbox": [0, 0, 800, 800]}]

        # Identical y, different x
        ocr_same_y = [
            OCRTextBox(text="World", confidence=0.9, bbox=BoundingBox(200, 100, 50, 20)),
            OCRTextBox(text="Hello", confidence=0.9, bbox=BoundingBox(100, 100, 50, 20)),
        ]
        fused_same_y = aligner.fuse_ocr_with_visual_boxes(visual_card, ocr_same_y, 1000, 1000)
        assert fused_same_y[0].text_content == "Hello World"

        # Different y, same x
        ocr_same_x = [
            OCRTextBox(text="Bottom", confidence=0.9, bbox=BoundingBox(100, 200, 50, 20)),
            OCRTextBox(text="Top", confidence=0.9, bbox=BoundingBox(100, 100, 50, 20)),
        ]
        fused_same_x = aligner.fuse_ocr_with_visual_boxes(visual_card, ocr_same_x, 1000, 1000)
        assert fused_same_x[0].text_content == "Top Bottom"

        # Identical (y, x) coordinates -> stable order preserved
        ocr_identical = [
            OCRTextBox(text="Alpha", confidence=0.9, bbox=BoundingBox(100, 100, 50, 20)),
            OCRTextBox(text="Beta", confidence=0.9, bbox=BoundingBox(100, 100, 50, 20)),
        ]
        fused_identical = aligner.fuse_ocr_with_visual_boxes(visual_card, ocr_identical, 1000, 1000)
        assert fused_identical[0].text_content == "Alpha Beta"

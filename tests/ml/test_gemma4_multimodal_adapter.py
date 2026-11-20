"""
Unit tests for Gemma 4 Native Multimodal Vision Perception Adapter (Python).
Tests letterboxing geometry, dynamic tile generation, PyTorch SigLipVisionProjector forward pass,
patch extraction, SigLIP normalization, and token budget bounds.
"""

import sys
import os
import math
import pytest
import torch
import numpy as np

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.gemma4_multimodal_adapter import (
    Gemma4VisionConfig,
    SigLipVisionProjector,
    Gemma4MultimodalVisionAdapter,
    LetterboxGeometry,
    TileInfo,
    CANONICAL_VIEWPORTS,
    SLATE_900_RGB,
)


def test_letterbox_geometry_desktop():
    geom = Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(1920, 1080, 1440, 900)
    assert geom.scale == 0.75
    assert geom.scaled_width == 1440
    assert geom.scaled_height == 810
    assert geom.pad_top == 45
    assert geom.pad_bottom == 45
    assert geom.pad_left == 0
    assert geom.pad_right == 0


def test_letterbox_geometry_mobile():
    geom = Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(1080, 1920, 390, 844)
    assert geom.scaled_width <= 390
    assert geom.scaled_height <= 844
    assert geom.pad_left + geom.pad_right + geom.scaled_width == 390
    assert geom.pad_top + geom.pad_bottom + geom.scaled_height == 844


def test_letterbox_invalid_dimensions():
    with pytest.raises(ValueError):
        Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(0, 100, 1440, 900)
    with pytest.raises(ValueError):
        Gemma4MultimodalVisionAdapter.compute_letterbox_geometry(100, -10, 1440, 900)


def test_dynamic_tiling_desktop():
    adapter = Gemma4MultimodalVisionAdapter()
    tiles = adapter.compute_dynamic_tiles(1440, 900, "desktop")
    # 3 cols x 2 rows = 6 grid tiles + 1 global thumbnail = 7 tiles
    assert len(tiles) == 7

    grid_tiles = [t for t in tiles if t.tile_type == "grid"]
    thumb_tiles = [t for t in tiles if t.tile_type == "thumbnail"]
    assert len(grid_tiles) == 6
    assert len(thumb_tiles) == 1

    for t in grid_tiles:
        assert t.width == 448
        assert t.height == 448
        assert 0 <= t.x <= 1440 - 448
        assert 0 <= t.y <= 900 - 448
        assert t.tokens_count == 256


def test_dynamic_tiling_tablet_and_mobile():
    adapter = Gemma4MultimodalVisionAdapter()
    tablet_tiles = adapter.compute_dynamic_tiles(1024, 768, "tablet")
    assert len(tablet_tiles) == 5

    mobile_tiles = adapter.compute_dynamic_tiles(390, 844, "mobile")
    assert len(mobile_tiles) == 3


def test_siglip_projector_forward():
    projector = SigLipVisionProjector(vision_dim=1152, intermediate_dim=4096, model_dim=4096)
    projector.eval()

    # Batch of token vectors [B, N, 1152]
    x = torch.randn(2, 256, 1152)
    with torch.no_grad():
        out = projector(x)

    assert out.shape == (2, 256, 4096)
    assert not torch.isnan(out).any()
    assert not torch.isinf(out).any()


def test_siglip_projector_dimension_mismatch():
    projector = SigLipVisionProjector(vision_dim=1152, model_dim=4096)
    x = torch.randn(1, 100, 512)
    with pytest.raises(ValueError):
        projector(x)


def test_letterbox_tensor():
    adapter = Gemma4MultimodalVisionAdapter()
    img = torch.rand(3, 1080, 1920)
    canvas, geom = adapter.letterbox_tensor(img, 1440, 900)

    assert canvas.shape == (3, 900, 1440)
    assert geom.scaled_width == 1440
    assert geom.scaled_height == 810
    # Canvas top and bottom margins should equal SLATE_900_RGB / 255.0
    expected_top_pixel = [v / 255.0 for v in SLATE_900_RGB]
    actual_top_pixel = canvas[:, 0, 0].tolist()
    for exp, act in zip(expected_top_pixel, actual_top_pixel):
        assert abs(exp - act) < 1e-4


def test_encode_vision_pipeline():
    adapter = Gemma4MultimodalVisionAdapter()
    img = torch.rand(3, 1080, 1920)
    res = adapter.encode_vision(img, "desktop")

    assert res["tile_count"] == 7
    assert res["visual_token_count"] == 1792
    assert res["projected_embeddings"].shape == (1, 1792, 4096)
    assert res["token_budget"]["within_budget"] is True
    assert res["token_budget"]["token_budget_percentage"] == 10.9375


def test_token_budget_bounds():
    adapter = Gemma4MultimodalVisionAdapter()
    valid_b = adapter.verify_token_budget(1792, 16384)
    assert valid_b["within_budget"] is True

    invalid_b = adapter.verify_token_budget(3000, 16384)
    assert invalid_b["within_budget"] is False


def test_prompt_template_formatting():
    adapter = Gemma4MultimodalVisionAdapter()
    prompt = adapter.format_multimodal_prompt("Identify button and header components", 1792)
    assert "<start_of_turn>user\n" in prompt
    assert "<image><1792_tokens></image>" in prompt
    assert "Identify button and header components" in prompt
    assert prompt.endswith("<end_of_turn>\n<start_of_turn>model\n")

"""
Gemma 4 Native Multimodal Vision Perception Adapter.

Implements:
1. SigLIP-style ViT vision encoder projection interface.
2. Dynamic 448x448 patch tiling (up to 3x2=6 grid tiles + 1 global thumbnail = 7 tiles total = 1,792 tokens).
3. 2-layer GELU MLP projector projecting vision embedding dimension d_v = 1152 to model dimension d_m = 4096.
4. Aspect-preserving letterboxing with padding rgb(15, 23, 42) (hex #0f172a, Tailwind Slate-900).
5. Canonical viewports (Desktop 1440x900, Tablet 1024x768, Mobile 390x844).
6. Token budget verification and canonical Gemma 4 multimodal prompt templating.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# Canonical Slate-900 background for UI letterboxing
SLATE_900_RGB: Tuple[int, int, int] = (15, 23, 42)
SLATE_900_HEX: str = "#0f172a"

# Canonical Viewport Definitions
CANONICAL_VIEWPORTS: Dict[str, Dict[str, Any]] = {
    "desktop": {
        "width": 1440,
        "height": 900,
        "grid_cols": 3,
        "grid_rows": 2,
        "max_grid_tiles": 6,
        "aspect_ratio": 1.600,
    },
    "tablet": {
        "width": 1024,
        "height": 768,
        "grid_cols": 2,
        "grid_rows": 2,
        "max_grid_tiles": 4,
        "aspect_ratio": 1.333,
    },
    "mobile": {
        "width": 390,
        "height": 844,
        "grid_cols": 1,
        "grid_rows": 2,
        "max_grid_tiles": 2,
        "aspect_ratio": 0.462,
    },
}


@dataclass
class LetterboxGeometry:
    """Exact letterbox padding and scaling geometry."""
    src_width: int
    src_height: int
    target_width: int
    target_height: int
    scale: float
    scaled_width: int
    scaled_height: int
    pad_left: int
    pad_top: int
    pad_right: int
    pad_bottom: int


@dataclass
class TileInfo:
    """Bounding coordinates and metadata for an image patch tile."""
    tile_id: int
    tile_type: str  # 'grid' or 'thumbnail'
    x: int
    y: int
    width: int
    height: int
    tokens_count: int = 256


@dataclass
class Gemma4VisionConfig:
    """Configuration for Gemma 4 native multimodal vision adapter."""
    model_dim: int = 4096
    vision_dim: int = 1152
    intermediate_dim: int = 4096
    tile_size: int = 448
    patch_size: int = 14
    patch_merge: int = 2
    tokens_per_tile: int = 256
    max_grid_tiles: int = 6
    thumbnail_tiles: int = 1
    max_total_tiles: int = 7
    max_vision_tokens: int = 1792
    context_length: int = 16384
    token_budget_percentage_max: float = 15.0
    mean: Tuple[float, float, float] = (0.5, 0.5, 0.5)
    std: Tuple[float, float, float] = (0.5, 0.5, 0.5)
    pad_color_rgb: Tuple[int, int, int] = SLATE_900_RGB


class SigLipVisionProjector(nn.Module):
    """
    Two-layer GELU MLP Projector.
    Projects vision embedding dimension d_v = 1152 to model dimension d_m = 4096.
    Followed by Layer Normalization.
    """

    def __init__(
        self,
        vision_dim: int = 1152,
        intermediate_dim: int = 4096,
        model_dim: int = 4096,
        dropout_prob: float = 0.0,
    ) -> None:
        super().__init__()
        self.vision_dim = vision_dim
        self.intermediate_dim = intermediate_dim
        self.model_dim = model_dim

        self.linear1 = nn.Linear(vision_dim, intermediate_dim, bias=True)
        self.act = nn.GELU()
        self.linear2 = nn.Linear(intermediate_dim, model_dim, bias=True)
        self.norm = nn.LayerNorm(model_dim)
        self.dropout = nn.Dropout(dropout_prob) if dropout_prob > 0.0 else nn.Identity()

        self._init_weights()

    def _init_weights(self) -> None:
        nn.init.xavier_uniform_(self.linear1.weight)
        nn.init.zeros_(self.linear1.bias)
        nn.init.xavier_uniform_(self.linear2.weight)
        nn.init.zeros_(self.linear2.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass projecting vision tokens to model hidden dimension.
        Input: [batch_size, num_tokens, vision_dim] or [num_tokens, vision_dim]
        Output: [batch_size, num_tokens, model_dim] or [num_tokens, model_dim]
        """
        if x.shape[-1] != self.vision_dim:
            raise ValueError(
                f"Expected last dimension {self.vision_dim}, got {x.shape[-1]}"
            )
        h = self.linear1(x)
        h = self.act(h)
        h = self.dropout(h)
        h = self.linear2(h)
        h = self.norm(h)
        return h


class Gemma4MultimodalVisionAdapter:
    """
    End-to-end multimodal perception adapter for Google Gemma 4.
    Handles viewport standardization, aspect-preserving letterboxing,
    dynamic patch tiling, SigLIP normalization, patch projection,
    and prompt formatting.
    """

    def __init__(self, config: Optional[Gemma4VisionConfig] = None) -> None:
        self.config = config or Gemma4VisionConfig()
        self.projector = SigLipVisionProjector(
            vision_dim=self.config.vision_dim,
            intermediate_dim=self.config.intermediate_dim,
            model_dim=self.config.model_dim,
        )
        self.projector.eval()

    @staticmethod
    def compute_letterbox_geometry(
        src_width: int,
        src_height: int,
        target_width: int,
        target_height: int,
    ) -> LetterboxGeometry:
        """Compute exact scaling factor and symmetrical padding offsets."""
        if src_width <= 0 or src_height <= 0:
            raise ValueError(f"Source dimensions must be positive, got ({src_width}, {src_height})")
        if target_width <= 0 or target_height <= 0:
            raise ValueError(f"Target dimensions must be positive, got ({target_width}, {target_height})")

        scale = min(target_width / src_width, target_height / src_height)
        scaled_w = int(round(src_width * scale))
        scaled_h = int(round(src_height * scale))

        pad_x = max(0, target_width - scaled_w)
        pad_y = max(0, target_height - scaled_h)

        pad_left = pad_x // 2
        pad_right = pad_x - pad_left
        pad_top = pad_y // 2
        pad_bottom = pad_y - pad_top

        return LetterboxGeometry(
            src_width=src_width,
            src_height=src_height,
            target_width=target_width,
            target_height=target_height,
            scale=scale,
            scaled_width=scaled_w,
            scaled_height=scaled_h,
            pad_left=pad_left,
            pad_top=pad_top,
            pad_right=pad_right,
            pad_bottom=pad_bottom,
        )

    def letterbox_tensor(
        self,
        image_tensor: torch.Tensor,
        target_width: int,
        target_height: int,
    ) -> Tuple[torch.Tensor, LetterboxGeometry]:
        """
        Letterbox a [C, H, W] or [B, C, H, W] tensor into target dimensions
        padded with SLATE_900_RGB background.
        """
        has_batch = image_tensor.ndim == 4
        if not has_batch:
            image_tensor = image_tensor.unsqueeze(0)

        _, c, h, w = image_tensor.shape
        geom = self.compute_letterbox_geometry(w, h, target_width, target_height)

        # Scale image
        scaled = F.interpolate(
            image_tensor,
            size=(geom.scaled_height, geom.scaled_width),
            mode="bicubic",
            align_corners=False,
        )

        # Canvas initialized with Slate-900 (normalized to [0, 1] or SigLIP [-1, 1])
        # Image tensor assumed in [0.0, 1.0]
        pad_color = torch.tensor(
            [v / 255.0 for v in self.config.pad_color_rgb],
            dtype=image_tensor.dtype,
            device=image_tensor.device,
        ).view(1, 3, 1, 1)

        canvas = pad_color.repeat(image_tensor.shape[0], 1, target_height, target_width)
        canvas[
            :,
            :,
            geom.pad_top : geom.pad_top + geom.scaled_height,
            geom.pad_left : geom.pad_left + geom.scaled_width,
        ] = scaled

        output = canvas if has_batch else canvas.squeeze(0)
        return output, geom

    def compute_dynamic_tiles(
        self,
        width: int,
        height: int,
        viewport_name: str = "desktop",
    ) -> List[TileInfo]:
        """
        Partition high-resolution viewport into dynamic 448x448 tiles
        plus a downsampled 448x448 global thumbnail tile.
        """
        tile_size = self.config.tile_size
        vp_config = CANONICAL_VIEWPORTS.get(viewport_name, CANONICAL_VIEWPORTS["desktop"])
        grid_cols = vp_config["grid_cols"]
        grid_rows = vp_config["grid_rows"]

        tiles: List[TileInfo] = []
        tile_id = 0

        # Step size along axes
        step_x = (width - tile_size) / max(1, grid_cols - 1) if grid_cols > 1 else 0
        step_y = (height - tile_size) / max(1, grid_rows - 1) if grid_rows > 1 else 0

        for r in range(grid_rows):
            for c in range(grid_cols):
                tx = int(round(c * step_x))
                ty = int(round(r * step_y))
                # Ensure within bounds
                tx = max(0, min(tx, width - tile_size))
                ty = max(0, min(ty, height - tile_size))

                tiles.append(
                    TileInfo(
                        tile_id=tile_id,
                        tile_type="grid",
                        x=tx,
                        y=ty,
                        width=tile_size,
                        height=tile_size,
                        tokens_count=self.config.tokens_per_tile,
                    )
                )
                tile_id += 1

        # Global thumbnail tile (spanning entire viewport, downsampled to tile_size)
        tiles.append(
            TileInfo(
                tile_id=tile_id,
                tile_type="thumbnail",
                x=0,
                y=0,
                width=width,
                height=height,
                tokens_count=self.config.tokens_per_tile,
            )
        )

        return tiles

    def extract_tile_tensor(
        self,
        canvas: torch.Tensor,
        tile_info: TileInfo,
    ) -> torch.Tensor:
        """
        Extract a 448x448 tile from canvas tensor [C, H, W].
        If tile_type == 'thumbnail', resize whole canvas to 448x448.
        """
        tile_size = self.config.tile_size
        if tile_info.tile_type == "thumbnail":
            img = canvas.unsqueeze(0)
            thumb = F.interpolate(
                img,
                size=(tile_size, tile_size),
                mode="bicubic",
                align_corners=False,
            ).squeeze(0)
            return thumb

        # Grid tile crop
        x, y, w, h = tile_info.x, tile_info.y, tile_info.width, tile_info.height
        cropped = canvas[:, y : y + h, x : x + w]
        if cropped.shape[1] != tile_size or cropped.shape[2] != tile_size:
            cropped = F.interpolate(
                cropped.unsqueeze(0),
                size=(tile_size, tile_size),
                mode="bicubic",
                align_corners=False,
            ).squeeze(0)
        return cropped

    def normalize_siglip(self, tensor: torch.Tensor) -> torch.Tensor:
        """Apply SigLIP normalization: (x - mean) / std mapping [0, 1] to [-1, 1]."""
        mean = torch.tensor(self.config.mean, dtype=tensor.dtype, device=tensor.device).view(-1, 1, 1)
        std = torch.tensor(self.config.std, dtype=tensor.dtype, device=tensor.device).view(-1, 1, 1)
        return (tensor - mean) / std

    def extract_patch_embeddings(
        self,
        tile_tensor: torch.Tensor,
    ) -> torch.Tensor:
        """
        Extract patch feature representations from a 448x448 tile.
        Tile [C, 448, 448] -> Unfold 14x14 patches (32x32 = 1024 patches)
        -> 2x2 patch merge -> 16x16 = 256 tokens of dimension vision_dim (1152).
        """
        c, h, w = tile_tensor.shape
        p = self.config.patch_size  # 14
        m = self.config.patch_merge  # 2

        # 448 / 14 = 32 patches along each spatial axis
        patches_per_axis = h // p  # 32
        tokens_per_axis = patches_per_axis // m  # 16
        expected_tokens = tokens_per_axis * tokens_per_axis  # 256

        # Deterministic patch projection simulation (conv2d or unfold)
        # We project raw pixels (3 * 14 * 14 = 588) merged 2x2 (588 * 4 = 2352) into vision_dim (1152)
        # Using a fixed orthogonal projection weight for zero-mock consistency
        merged_patch_dim = c * (p * m) * (p * m)  # 3 * 28 * 28 = 2352
        
        # Reshape into [16, 16, 3, 28, 28] -> [256, 2352]
        t = tile_tensor.view(c, tokens_per_axis, p * m, tokens_per_axis, p * m)
        t = t.permute(1, 3, 0, 2, 4).contiguous().view(expected_tokens, merged_patch_dim)

        # Linear reduction from 2352 to vision_dim 1152
        # Deterministic pseudo-random projection matrix based on fixed seed
        rng = torch.Generator(device=tile_tensor.device)
        rng.manual_seed(42)
        proj_matrix = torch.randn(merged_patch_dim, self.config.vision_dim, generator=rng, device=tile_tensor.device)
        proj_matrix = F.normalize(proj_matrix, dim=0)

        tokens = torch.matmul(t, proj_matrix)  # [256, 1152]
        return tokens

    def encode_vision(
        self,
        image_tensor: torch.Tensor,
        viewport_name: str = "desktop",
    ) -> Dict[str, Any]:
        """
        Full vision encoding pipeline:
        1. Letterbox to canonical viewport.
        2. Dynamic 448x448 tile extraction (6 grid + 1 thumbnail).
        3. SigLIP normalization.
        4. Patch extraction (256 tokens / tile).
        5. MLP Projection 1152 -> 4096.
        Returns projected tokens [1, N_tokens, 4096] and metadata.
        """
        vp = CANONICAL_VIEWPORTS.get(viewport_name, CANONICAL_VIEWPORTS["desktop"])
        target_w = vp["width"]
        target_h = vp["height"]

        canvas, geom = self.letterbox_tensor(image_tensor, target_w, target_h)
        tiles_info = self.compute_dynamic_tiles(target_w, target_h, viewport_name)

        all_vision_tokens = []
        for tile_info in tiles_info:
            tile = self.extract_tile_tensor(canvas, tile_info)
            norm_tile = self.normalize_siglip(tile)
            patch_tokens = self.extract_patch_embeddings(norm_tile)  # [256, 1152]
            all_vision_tokens.append(patch_tokens)

        # Concatenate tokens across all tiles
        combined_vision_tokens = torch.cat(all_vision_tokens, dim=0)  # [N_tiles * 256, 1152]
        total_tokens = combined_vision_tokens.shape[0]

        # Project to model dimension 4096
        with torch.no_grad():
            projected_embeddings = self.projector(combined_vision_tokens)  # [N_tokens, 4096]

        budget = self.verify_token_budget(total_tokens)

        return {
            "projected_embeddings": projected_embeddings.unsqueeze(0),  # [1, N_tokens, 4096]
            "visual_token_count": total_tokens,
            "tile_count": len(tiles_info),
            "tiles_info": tiles_info,
            "geometry": geom,
            "viewport": viewport_name,
            "token_budget": budget,
        }

    def verify_token_budget(
        self,
        visual_tokens: int,
        context_window: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Asserts that visual token budget is strictly bounded within declared limits.
        """
        ctx = context_window or self.config.context_length
        pct = (visual_tokens / ctx) * 100.0
        remaining = ctx - visual_tokens
        max_allowed_pct = self.config.token_budget_percentage_max

        is_valid = pct <= max_allowed_pct and visual_tokens <= self.config.max_vision_tokens

        return {
            "visual_tokens": visual_tokens,
            "context_window": ctx,
            "token_budget_percentage": round(pct, 4),
            "remaining_context_tokens": remaining,
            "max_allowed_percentage": max_allowed_pct,
            "within_budget": is_valid,
        }

    def format_multimodal_prompt(
        self,
        task_prompt: str,
        visual_token_count: Optional[int] = None,
    ) -> str:
        """
        Builds canonical Gemma 4 multimodal turn template:
        <start_of_turn>user\n<image>...<image_tokens>...</image>\n[TASK]\n<end_of_turn>\n<start_of_turn>model\n
        """
        tokens_count = visual_token_count or self.config.max_vision_tokens
        img_tokens_str = f"<{tokens_count}_tokens>"
        return (
            f"<start_of_turn>user\n"
            f"<image>{img_tokens_str}</image>\n"
            f"{task_prompt.strip()}\n"
            f"<end_of_turn>\n"
            f"<start_of_turn>model\n"
        )

"""
Soda OS Multimodal Vision Perception & UI Scene Graph Module.
Provides native Gemma 4 vision adapters, OCR bounding box alignment,
deterministic acyclic scene graph generation, and detector benchmark spikes.
"""

from .gemma4_multimodal_adapter import (
    Gemma4VisionConfig,
    SigLipVisionProjector,
    Gemma4MultimodalVisionAdapter,
    LetterboxGeometry,
    TileInfo,
    CANONICAL_VIEWPORTS,
    SLATE_900_RGB,
)
from .ocr_bounding_box_aligner import (
    BoundingBox,
    OCRTextBox,
    FusedComponentNode,
    SpatialRelation,
    OCRBoundingBoxAligner,
    calculate_iou,
    calculate_enclosure,
)
from .scene_graph_generator import (
    UISceneGraphNode,
    UISceneGraphEdge,
    UISceneGraphDAG,
    UISceneGraphGenerator,
    CyclicSceneGraphError,
    CANONICAL_UI_TAXONOMY,
    CANONICAL_CATEGORIES,
)
from .benchmark_spike import (
    VisionDetectorBenchmarkSpike,
    BenchmarkCandidate,
    BenchmarkScorecard,
)

__all__ = [
    "Gemma4VisionConfig",
    "SigLipVisionProjector",
    "Gemma4MultimodalVisionAdapter",
    "LetterboxGeometry",
    "TileInfo",
    "CANONICAL_VIEWPORTS",
    "SLATE_900_RGB",
    "BoundingBox",
    "OCRTextBox",
    "FusedComponentNode",
    "SpatialRelation",
    "OCRBoundingBoxAligner",
    "calculate_iou",
    "calculate_enclosure",
    "UISceneGraphNode",
    "UISceneGraphEdge",
    "UISceneGraphDAG",
    "UISceneGraphGenerator",
    "CyclicSceneGraphError",
    "CANONICAL_UI_TAXONOMY",
    "CANONICAL_CATEGORIES",
    "VisionDetectorBenchmarkSpike",
    "BenchmarkCandidate",
    "BenchmarkScorecard",
]

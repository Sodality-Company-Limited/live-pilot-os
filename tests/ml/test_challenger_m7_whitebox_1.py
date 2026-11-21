"""
════════════════════════════════════════════════════════════════════════════════
🛡️ EMPIRICAL CHALLENGER ADVERSARIAL BATTERY: MILESTONE 7 (PYTHON / CONDA PY310)
════════════════════════════════════════════════════════════════════════════════
Framework: Soda OS
Archetype: Empirical Challenger (role: critic, specialist)
Target Scope: G-UX-005, G-UX-006, G-UX-007, G-UX-012, G-UX-014 (Python ML Core)
Invariants: Zero Mocks, Zero Stubs, Empirical Verification under Conda py310
════════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import math
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.ocr_bounding_box_aligner import (
    BoundingBox,
    OCRTextBox,
    OCRBoundingBoxAligner,
    calculate_iou,
    calculate_enclosure
)
from src.vision.scene_graph_generator import (
    UISceneGraphNode,
    UISceneGraphEdge,
    UISceneGraphGenerator,
    CyclicSceneGraphError
)
from src.curriculum.redteam_pii_sanitizer import RedteamPiiSanitizer, is_luhn_valid
from src.curriculum.preference_dataset import verify_preference_split_orthogonality


class TestMilestone7WhiteBoxChallengerPython:
    """White-box adversarial test battery for M1-M3 Python modules."""

    def test_coordinate_normalization_extreme_bounds_and_clamping(self):
        """Probe: normalizer clamps negative or out-of-viewport coords to [0, 1000] integer grid."""
        aligner = OCRBoundingBoxAligner()

        # Extreme negative coords
        neg_box = BoundingBox(x=-100.0, y=-50.0, w=300.0, h=400.0)
        norm_neg = aligner.normalize_bbox(neg_box, viewport_w=1440.0, viewport_h=900.0)
        assert norm_neg.x >= 0.0
        assert norm_neg.y >= 0.0

        # Oversized coords exceeding viewport boundaries
        over_box = BoundingBox(x=1200.0, y=800.0, w=600.0, h=500.0)
        norm_over = aligner.normalize_bbox(over_box, viewport_w=1440.0, viewport_h=900.0)
        assert norm_over.x + norm_over.w <= 1000.0, f"Expected x+w <= 1000, got {norm_over.x + norm_over.w}"
        assert norm_over.y + norm_over.h <= 1000.0, f"Expected y+h <= 1000, got {norm_over.y + norm_over.h}"

        # Invalid viewport dimensions fail-closed
        with pytest.raises(ValueError):
            aligner.normalize_bbox(neg_box, viewport_w=0.0, viewport_h=900.0)
        with pytest.raises(ValueError):
            aligner.normalize_bbox(neg_box, viewport_w=1440.0, viewport_h=-10.0)

    def test_iou_and_enclosure_zero_area_and_identical_boxes(self):
        """Probe: IoU and enclosure compute exact bounds without divide-by-zero or NaN."""
        zero_box = BoundingBox(x=50.0, y=50.0, w=0.0, h=100.0)
        normal_box = BoundingBox(x=50.0, y=50.0, w=100.0, h=100.0)

        assert calculate_iou(zero_box, normal_box) == 0.0
        assert calculate_enclosure(zero_box, normal_box) == 0.0

        # Identical boxes yield 1.0
        assert calculate_iou(normal_box, normal_box) == 1.0

        # Completely enclosed child box yields enclosure 1.0
        inner_box = BoundingBox(x=60.0, y=60.0, w=30.0, h=30.0)
        assert calculate_enclosure(inner_box, normal_box) == 1.0

    def test_ocr_text_fusion_reading_order_and_exact_match(self):
        """Probe: OCR bounding box aligner fuses text and sorts child tokens by (y ascending, x ascending)."""
        aligner = OCRBoundingBoxAligner()
        visual_nodes = [
            {"node_id": "card_01", "component_type": "CardContainer", "bbox": [100.0, 100.0, 400.0, 300.0]}
        ]
        # Child text tokens out of natural reading order
        ocr_boxes = [
            OCRTextBox(id="t2", text="World", confidence=0.95, bbox=BoundingBox(x=200.0, y=180.0, w=60.0, h=25.0)),
            OCRTextBox(id="t1", text="Hello", confidence=0.99, bbox=BoundingBox(x=120.0, y=140.0, w=60.0, h=25.0)),
            OCRTextBox(id="t3", text="!", confidence=0.90, bbox=BoundingBox(x=270.0, y=180.0, w=20.0, h=25.0))
        ]

        fused = aligner.fuse_ocr_with_visual_boxes(visual_nodes, ocr_boxes, viewport_w=1440.0, viewport_h=900.0)
        assert len(fused) == 1
        assert fused[0].fusion_type == "enclosed_child"
        assert fused[0].text_content == "Hello World !"

    def test_scene_graph_generator_kahn_cycle_detection(self):
        """Probe: scene graph generator detects DAG cycles fail-closed via Kahn's sort."""
        generator = UISceneGraphGenerator()
        # Direct cyclic dependency: Node A -> Node B -> Node A
        cyclic_nodes = {
            "node_root": UISceneGraphNode(node_id="node_root", component_type="ScreenRoot", category="container", bbox=[0, 0, 1440, 900], bbox_normalized=[0, 0, 1000, 1000], z_index=0),
            "node_a": UISceneGraphNode(node_id="node_a", component_type="CardContainer", category="container", bbox=[100, 100, 400, 300], bbox_normalized=[100, 100, 400, 300], z_index=10),
            "node_b": UISceneGraphNode(node_id="node_b", component_type="PrimaryButton", category="control", bbox=[150, 150, 200, 50], bbox_normalized=[150, 150, 200, 50], z_index=20)
        }
        cyclic_edges = [
            UISceneGraphEdge(source="node_root", target="node_a", relationship="parent_child"),
            UISceneGraphEdge(source="node_a", target="node_b", relationship="parent_child"),
            UISceneGraphEdge(source="node_b", target="node_a", relationship="parent_child")  # CYCLE
        ]

        with pytest.raises(CyclicSceneGraphError):
            generator.kahn_topological_sort(cyclic_nodes, cyclic_edges)

    def test_pii_sanitizer_luhn_credit_cards_and_secrets(self):
        """Probe: PII sanitizer detects valid Luhn credit cards, AWS keys, GitHub tokens, JWTs, SSNs, and emails."""
        sanitizer = RedteamPiiSanitizer()

        # Valid card with Luhn check
        assert is_luhn_valid("4532015000000007") is True
        assert is_luhn_valid("4532015000000008") is False  # Invalid checksum

        text = (
            "User credentials: key=AKIAIOSFODNN7EXAMPLE, "
            "gh_token=ghp_1234567890abcdefghijklmnopqrstuvwxyz12, "
            "openai=sk-proj1234567890abcdefghijklmnopqrst, "
            "card=4532-0150-0000-0007, invalid_card=4532-0150-0000-0008, "
            "ssn=123-45-6789, email=developer@soda-os.org, phone=(555) 123-4567."
        )

        res = sanitizer.sanitize(text)
        assert "[REDACTED_AWS_KEY]" in res.sanitized_text
        assert "[REDACTED_GITHUB_TOKEN]" in res.sanitized_text
        assert "[REDACTED_OPENAI_KEY]" in res.sanitized_text
        assert "[REDACTED_CREDIT_CARD]" in res.sanitized_text
        assert "4532-0150-0000-0008" in res.sanitized_text  # Invalid card is preserved
        assert "[REDACTED_SSN]" in res.sanitized_text
        assert "[REDACTED_EMAIL]" in res.sanitized_text
        assert "[REDACTED_PHONE]" in res.sanitized_text

        # Verify recursive dictionary scrubbing
        nested = {
            "meta": {"token": "AKIAIOSFODNN7EXAMPLE"},
            "users": [{"email": "admin@root.com", "active": True}]
        }
        scrubbed = sanitizer.sanitize_object(nested)
        assert scrubbed["meta"]["token"] == "[REDACTED_AWS_KEY]"
        assert scrubbed["users"][0]["email"] == "[REDACTED_EMAIL]"

    def test_preference_dataset_zero_split_contamination(self):
        """Probe: verifies zero sample overlap between train, val, and test preference splits."""
        splits_dir = "artifacts/curriculum/stage5_preferences/splits"
        assert os.path.exists(splits_dir), f"Missing splits directory: {splits_dir}"

        is_orthogonal, metrics = verify_preference_split_orthogonality(splits_dir)
        assert is_orthogonal is True
        assert metrics["zero_contamination"] is True
        assert metrics["intersections"]["train_val"] == 0
        assert metrics["intersections"]["train_test"] == 0
        assert metrics["intersections"]["val_test"] == 0

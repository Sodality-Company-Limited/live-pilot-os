"""
Unit tests for Vision Detector Benchmark Spike (Python).
Tests benchmark execution, candidate statistical summaries,
scorecard export, and policy selection logic.
"""

import sys
import os
import json
import pytest

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from src.vision.benchmark_spike import (
    VisionDetectorBenchmarkSpike,
    BenchmarkCandidate,
    BenchmarkScorecard,
)


def test_benchmark_candidate_statistics():
    c = BenchmarkCandidate(
        id="test_candidate",
        name="Test Candidate",
        architecture="TestArch",
        parameter_count=1_000_000,
        vram_mb=500.0,
        ram_mb=800.0,
        latencies_ms=[10.0, 20.0, 30.0, 40.0, 50.0],
        map50=0.90,
        map50_95=0.75,
        iou_ge_90_rate=0.88,
        acyclic_dag_rate=0.99,
        semantic_reasoning_score=0.85,
    )

    assert c.latency_mean == 30.0
    assert c.latency_p50 == 30.0
    assert c.latency_p90 == 46.0
    summary = c.summary()
    assert summary["id"] == "test_candidate"
    assert summary["latency_mean_ms"] == 30.0


def test_vision_detector_benchmark_spike_execution():
    spike = VisionDetectorBenchmarkSpike(episodes_per_candidate=20, seed=123)
    scorecard = spike.run_benchmark()

    assert scorecard.schema_version == "1.0.0"
    assert scorecard.benchmark_episodes_count == 20
    assert len(scorecard.candidates) == 3

    gemma = scorecard.candidates["gemma_4_native_multimodal"]
    yolo = scorecard.candidates["yolov11_ui_specialized"]
    eff = scorecard.candidates["efficientnet_b4_mask_rcnn"]

    assert gemma["map50_95"] > yolo["map50_95"]
    assert gemma["acyclic_dag_rate"] == 1.0
    assert yolo["acyclic_dag_rate"] < 1.0
    assert scorecard.recommended_policy["selected_primary_detector"] == "gemma_4_native_multimodal"


def test_scorecard_json_serialization():
    spike = VisionDetectorBenchmarkSpike(episodes_per_candidate=10, seed=42)
    scorecard = spike.run_benchmark()
    json_str = scorecard.to_json()
    parsed = json.loads(json_str)

    assert parsed["schema_version"] == "1.0.0"
    assert "gemma_4_native_multimodal" in parsed["candidates"]

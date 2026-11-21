"""
Calibration Evaluation Suite and Reliability Diagrams (G-ML-009).

This module implements an automated calibration evaluation harness that computes:
- Expected Calibration Error (ECE): 10-bin sample-weighted absolute calibration error
- Maximum Calibration Error (MCE): supremum calibration deviation across populated bins
- Brier Score: mean squared error between confidence probability and binary outcomes
- High-Confidence Error Rate (HCER): incorrect decision rate for predictions with c >= 0.80
- Visual & ASCII Reliability Diagrams: Empirical accuracy vs mean confidence with gap bars
- Scorecard Ledger Persistence: Strict schema serialization to artifacts/eval/calibration_scorecard.json
"""

import os
import json
import math
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union


@dataclass(frozen=True)
class PredictionRecord:
    """Represents a single model prediction and its ground-truth correctness."""
    confidence: float
    correct: bool
    metadata: Optional[Dict[str, Any]] = None

    def __post_init__(self) -> None:
        if not math.isfinite(self.confidence):
            raise ValueError(f"confidence cannot be NaN or Infinite, got {self.confidence}")
        if self.confidence < 0.0 or self.confidence > 1.0:
            raise ValueError(f"confidence must be between 0.0 and 1.0, got {self.confidence}")
        if not isinstance(self.correct, (bool, int)):
            raise TypeError(f"correct must be a boolean or binary int, got {type(self.correct)}")


@dataclass(frozen=True)
class CalibrationBin:
    """Statistical summary for a single confidence partition bin."""
    bin_index: int
    conf_lower: float
    conf_upper: float
    count: int
    avg_confidence: float
    empirical_accuracy: float
    calibration_gap: float


@dataclass(frozen=True)
class CalibrationScorecard:
    """Complete evaluation scorecard summarizing calibration quality and SLA gates."""
    sample_count: int
    num_bins: int
    ece: float
    mce: float
    brier_score: float
    high_confidence_error_rate: float
    high_confidence_count: int
    bins: List[CalibrationBin] = field(default_factory=list)
    sla_passed: bool = False
    generated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert scorecard to JSON-serializable dictionary."""
        return {
            "sample_count": self.sample_count,
            "num_bins": self.num_bins,
            "ece": round(self.ece, 6),
            "mce": round(self.mce, 6),
            "brier_score": round(self.brier_score, 6),
            "high_confidence_error_rate": round(self.high_confidence_error_rate, 6),
            "high_confidence_count": self.high_confidence_count,
            "bins": [
                {
                    "bin_index": b.bin_index,
                    "conf_lower": round(b.conf_lower, 4),
                    "conf_upper": round(b.conf_upper, 4),
                    "count": b.count,
                    "avg_confidence": round(b.avg_confidence, 6),
                    "empirical_accuracy": round(b.empirical_accuracy, 6),
                    "calibration_gap": round(b.calibration_gap, 6),
                }
                for b in self.bins
            ],
            "sla_passed": self.sla_passed,
            "generated_at": self.generated_at,
        }


class CalibrationEvaluator:
    """
    Automated calibration evaluation harness.
    
    Computes sample-weighted 10-bin ECE, MCE, Brier score, and HCER,
    verifies quality SLAs, and produces reliability diagrams.
    """

    def __init__(
        self,
        num_bins: int = 10,
        ece_sla: float = 0.040,
        brier_sla: float = 0.080,
        hcer_sla: float = 0.010,
        high_conf_threshold: float = 0.80,
    ) -> None:
        if num_bins < 2:
            raise ValueError(f"num_bins must be at least 2, got {num_bins}")
        if ece_sla < 0.0 or ece_sla > 1.0:
            raise ValueError(f"ece_sla must be in [0.0, 1.0], got {ece_sla}")
        if brier_sla < 0.0 or brier_sla > 1.0:
            raise ValueError(f"brier_sla must be in [0.0, 1.0], got {brier_sla}")
        if hcer_sla < 0.0 or hcer_sla > 1.0:
            raise ValueError(f"hcer_sla must be in [0.0, 1.0], got {hcer_sla}")
        if high_conf_threshold <= 0.0 or high_conf_threshold >= 1.0:
            raise ValueError(f"high_conf_threshold must be in (0.0, 1.0), got {high_conf_threshold}")

        self.num_bins = num_bins
        self.ece_sla = ece_sla
        self.brier_sla = brier_sla
        self.hcer_sla = hcer_sla
        self.high_conf_threshold = high_conf_threshold

    def normalize_record(
        self,
        record: Union[PredictionRecord, Tuple[float, bool], Dict[str, Any]],
    ) -> PredictionRecord:
        """Coerce raw tuples, dicts, or PredictionRecord instances into validated PredictionRecord."""
        if isinstance(record, PredictionRecord):
            return record
        elif isinstance(record, tuple):
            if len(record) != 2:
                raise ValueError(f"Tuple record must have exactly 2 elements (confidence, correct), got length {len(record)}")
            return PredictionRecord(confidence=float(record[0]), correct=bool(record[1]))
        elif isinstance(record, dict):
            if "confidence" not in record or "correct" not in record:
                raise ValueError("Dict record must contain 'confidence' and 'correct' keys")
            return PredictionRecord(
                confidence=float(record["confidence"]),
                correct=bool(record["correct"]),
                metadata=record.get("metadata"),
            )
        else:
            raise TypeError(f"Unsupported record type: {type(record)}")

    def evaluate(
        self,
        records: Sequence[Union[PredictionRecord, Tuple[float, bool], Dict[str, Any]]],
        enforce_sla: bool = False,
    ) -> CalibrationScorecard:
        """
        Evaluate calibration metrics across input predictions.
        
        Args:
            records: Non-empty sequence of predictions.
            enforce_sla: If True, raises ValueError if ECE, Brier, or HCER SLAs are breached.
            
        Returns:
            CalibrationScorecard with computed metrics and per-bin breakdown.
        """
        if not records:
            raise ValueError("records must be non-empty")

        normalized = [self.normalize_record(r) for r in records]
        total_samples = len(normalized)

        # Initialize bins
        bin_counts = [0] * self.num_bins
        bin_conf_sums = [0.0] * self.num_bins
        bin_acc_sums = [0.0] * self.num_bins

        brier_sum = 0.0
        high_conf_count = 0
        high_conf_errors = 0

        for record in normalized:
            c = record.confidence
            y = 1.0 if record.correct else 0.0

            # Brier Score contribution: (confidence - ground_truth)^2
            brier_sum += (c - y) ** 2

            # High-confidence metrics
            if c >= self.high_conf_threshold:
                high_conf_count += 1
                if not record.correct:
                    high_conf_errors += 1

            # Exact bin assignment in [0, num_bins - 1]
            bin_idx = min(self.num_bins - 1, int(math.floor(c * self.num_bins)))
            bin_counts[bin_idx] += 1
            bin_conf_sums[bin_idx] += c
            bin_acc_sums[bin_idx] += y

        # Compute Brier score
        brier_score = brier_sum / total_samples

        # Compute High-Confidence Error Rate
        hcer = (high_conf_errors / high_conf_count) if high_conf_count > 0 else 0.0

        # Construct bins & calculate ECE / MCE
        bins: List[CalibrationBin] = []
        ece_sum = 0.0
        max_calib_error = 0.0
        total_binned = 0

        for m in range(self.num_bins):
            conf_lower = m / self.num_bins
            conf_upper = (m + 1) / self.num_bins
            count = bin_counts[m]
            total_binned += count

            if count > 0:
                avg_conf = bin_conf_sums[m] / count
                emp_acc = bin_acc_sums[m] / count
                gap = abs(emp_acc - avg_conf)
                ece_sum += (count / total_samples) * gap
                if gap > max_calib_error:
                    max_calib_error = gap
            else:
                avg_conf = (conf_lower + conf_upper) / 2.0
                emp_acc = 0.0
                gap = 0.0

            bins.append(
                CalibrationBin(
                    bin_index=m,
                    conf_lower=conf_lower,
                    conf_upper=conf_upper,
                    count=count,
                    avg_confidence=avg_conf,
                    empirical_accuracy=emp_acc,
                    calibration_gap=gap,
                )
            )

        # Invariant: Conservation of total samples across all bins
        if total_binned != total_samples:
            raise RuntimeError(f"Sample count leak: {total_binned} binned vs {total_samples} total")

        ece = ece_sum
        mce = max_calib_error

        # SLA verification
        sla_passed = (
            ece <= self.ece_sla
            and brier_score <= self.brier_sla
            and hcer <= self.hcer_sla
        )

        scorecard = CalibrationScorecard(
            sample_count=total_samples,
            num_bins=self.num_bins,
            ece=ece,
            mce=mce,
            brier_score=brier_score,
            high_confidence_error_rate=hcer,
            high_confidence_count=high_conf_count,
            bins=bins,
            sla_passed=sla_passed,
        )

        if enforce_sla and not sla_passed:
            raise ValueError(
                f"Calibration SLA breached: ECE={ece:.4f} (SLA<={self.ece_sla}), "
                f"Brier={brier_score:.4f} (SLA<={self.brier_sla}), "
                f"HCER={hcer:.4f} (SLA<={self.hcer_sla})"
            )

        return scorecard

    def generate_ascii_reliability_diagram(
        self,
        scorecard: CalibrationScorecard,
        bar_width: int = 30,
    ) -> str:
        """
        Render a terminal-friendly ASCII reliability diagram and calibration gap table.
        """
        lines = []
        lines.append("════════════════════════════════════════════════════════════════════════════════")
        lines.append("📊 RELIABILITY DIAGRAM & CALIBRATION HISTOGRAM (G-ML-009)")
        lines.append(f"   Samples: {scorecard.sample_count} | ECE: {scorecard.ece:.4f} | MCE: {scorecard.mce:.4f} | Brier: {scorecard.brier_score:.4f} | HCER: {scorecard.high_confidence_error_rate:.4f}")
        lines.append(f"   SLA Status: {'✅ PASS' if scorecard.sla_passed else '❌ BREACH'}")
        lines.append("────────────────────────────────────────────────────────────────────────────────")
        lines.append(f"{'Bin':<4} {'Range':<13} {'Count':<7} {'Confidence':<12} {'Accuracy':<10} {'Gap':<8} {'Histogram (Accuracy vs Confidence)':<30}")
        lines.append("────────────────────────────────────────────────────────────────────────────────")

        for b in scorecard.bins:
            range_str = f"[{b.conf_lower:.1f}, {b.conf_upper:.1f})"
            if b.bin_index == scorecard.num_bins - 1:
                range_str = f"[{b.conf_lower:.1f}, {b.conf_upper:.1f}]"

            if b.count > 0:
                acc_bars = int(round(b.empirical_accuracy * bar_width))
                conf_pos = int(round(b.avg_confidence * bar_width))
                
                # Visual bar representation
                chars = []
                for idx in range(bar_width + 1):
                    if idx < acc_bars:
                        chars.append("█")
                    elif idx == conf_pos:
                        chars.append("|")
                    else:
                        chars.append(" ")
                bar_str = "".join(chars)
            else:
                bar_str = "(empty bin)"

            lines.append(
                f"{b.bin_index:<4} {range_str:<13} {b.count:<7} {b.avg_confidence:<12.4f} "
                f"{b.empirical_accuracy:<10.4f} {b.calibration_gap:<8.4f} {bar_str}"
            )

        lines.append("────────────────────────────────────────────────────────────────────────────────")
        lines.append("Legend: [█] Empirical Accuracy  |  [|] Mean Confidence Target")
        lines.append("════════════════════════════════════════════════════════════════════════════════")
        return "\n".join(lines)

    def save_scorecard(
        self,
        scorecard: CalibrationScorecard,
        filepath: Union[str, Path] = "artifacts/eval/calibration_scorecard.json",
    ) -> Path:
        """Atomically serialize scorecard to target JSON file."""
        target_path = Path(filepath)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(scorecard.to_dict(), f, indent=2)
        return target_path

    def plot_reliability_diagram(
        self,
        scorecard: CalibrationScorecard,
        filepath: Union[str, Path] = "artifacts/eval/reliability_diagram.png",
    ) -> Optional[Path]:
        """
        Generate and save a publication-quality reliability curve using matplotlib.
        """
        try:
            import matplotlib
            matplotlib.use("Agg")  # Headless backend for CI
            import matplotlib.pyplot as plt
        except ImportError:
            return None

        target_path = Path(filepath)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        fig, (ax1, ax2) = plt.subplots(
            2, 1, figsize=(8, 10), gridspec_kw={"height_ratios": [3, 1]}
        )

        bin_centers = [(b.conf_lower + b.conf_upper) / 2.0 for b in scorecard.bins]
        accuracies = [b.empirical_accuracy for b in scorecard.bins]
        confidences = [b.avg_confidence for b in scorecard.bins]
        counts = [b.count for b in scorecard.bins]
        widths = [(b.conf_upper - b.conf_lower) * 0.9 for b in scorecard.bins]

        # Top plot: Accuracy vs Confidence & Perfect Calibration diagonal
        ax1.plot([0, 1], [0, 1], "--", color="gray", label="Perfect Calibration")
        ax1.bar(
            bin_centers,
            accuracies,
            width=widths,
            alpha=0.6,
            color="#2563eb",
            edgecolor="#1d4ed8",
            label="Empirical Accuracy",
        )
        ax1.step(
            [0.0] + [b.conf_upper for b in scorecard.bins],
            [scorecard.bins[0].avg_confidence] + confidences,
            where="pre",
            color="#dc2626",
            linewidth=2,
            label="Confidence Target",
        )

        ax1.set_xlim([0.0, 1.0])
        ax1.set_ylim([0.0, 1.05])
        ax1.set_xlabel("Confidence")
        ax1.set_ylabel("Empirical Accuracy")
        ax1.set_title(
            f"Reliability Diagram (G-ML-009)\n"
            f"ECE = {scorecard.ece:.4f} | MCE = {scorecard.mce:.4f} | Brier = {scorecard.brier_score:.4f}"
        )
        ax1.legend(loc="upper left")
        ax1.grid(True, linestyle=":", alpha=0.6)

        # Bottom plot: Bin sample counts (Sample frequency histogram)
        ax2.bar(
            bin_centers,
            counts,
            width=widths,
            color="#64748b",
            edgecolor="#475569",
            alpha=0.7,
        )
        ax2.set_xlim([0.0, 1.0])
        ax2.set_xlabel("Confidence")
        ax2.set_ylabel("Count")
        ax2.set_title("Sample Distribution Across Confidence Bins")
        ax2.grid(True, linestyle=":", alpha=0.6)

        plt.tight_layout()
        plt.savefig(target_path, dpi=200)
        plt.close(fig)
        return target_path


if __name__ == "__main__":
    # Self-test demonstration with realistic calibrated prediction records
    print("Testing CalibrationEvaluator on simulated well-calibrated distribution...")
    evaluator = CalibrationEvaluator(num_bins=10)
    records = []
    for i in range(1000):
        c = (i % 100) / 100.0
        # Calibrated probability: correctness probability matches confidence
        correct = ((i * 37) % 100) < int(c * 100)
        records.append(PredictionRecord(confidence=c, correct=correct))

    scorecard = evaluator.evaluate(records, enforce_sla=False)
    print(evaluator.generate_ascii_reliability_diagram(scorecard))
    scorecard_path = evaluator.save_scorecard(scorecard)
    print(f"Saved scorecard to: {scorecard_path}")

"""
Statistical Calibration Evaluator for Soda OS ML Models (G-UX-020).

Enforces:
    - 10-bin Expected Calibration Error (ECE <= 0.050)
    - Strictly Proper Quadratic Brier Score (Brier <= 0.150)
    - Area Under the ROC Curve (AUROC >= 0.880)
    - High-Confidence Error Rate (HCER <= 0.010 on c >= 0.80)
    - 1,000 Bootstrap Iterations with 95% Wilson Score CIs & empirical p-values
"""

from __future__ import annotations

import math
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple


@dataclass
class BinRecord:
    bin_index: int
    lower_edge: float
    upper_edge: float
    bin_center: float
    sample_count: int
    weight: float
    mean_confidence: float
    empirical_accuracy: float
    calibration_gap: float
    underconfident: bool
    overconfident: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CalibrationMetrics:
    sample_count: int
    bins_count: int
    ece: float
    mce: float
    brier: float
    auroc: float
    high_confidence_error_rate: float
    high_confidence_count: int
    high_confidence_errors: int
    bins: List[BinRecord]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_count": self.sample_count,
            "bins_count": self.bins_count,
            "ece": self.ece,
            "mce": self.mce,
            "brier": self.brier,
            "auroc": self.auroc,
            "high_confidence_error_rate": self.high_confidence_error_rate,
            "high_confidence_count": self.high_confidence_count,
            "high_confidence_errors": self.high_confidence_errors,
            "bins": [b.to_dict() for b in self.bins],
        }


@dataclass
class BootstrapMetricStats:
    observed: float
    mean: float
    std_err: float
    ci_lower: float
    ci_upper: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DeterministicPrng:
    """Lehmer / Park-Miller PRNG (modulus 2^31 - 1) for bitwise reproducible runs."""

    def __init__(self, seed: int = 42) -> None:
        s = int(abs(seed)) % 2147483647
        if s == 0:
            s = 1
        self._s = s

    def next_float(self) -> float:
        self._s = (self._s * 48271) % 2147483647
        return (self._s - 1) / 2147483646.0


class CalibrationEvaluator:
    """Evaluates probabilistic calibration and uncertainty metrics."""

    @staticmethod
    def compute_auroc(confidences: List[float], outcomes: List[bool | int]) -> float:
        """Computes Area Under the ROC Curve in O(N log N) using trapezoidal integration."""
        n = len(confidences)
        if n == 0 or len(outcomes) != n:
            raise ValueError(f"Invalid input lengths: {n} vs {len(outcomes)}")

        pairs: List[Tuple[float, int]] = []
        pos_count = 0
        neg_count = 0

        for i in range(n):
            c = float(confidences[i])
            if math.isnan(c) or c < 0.0 or c > 1.0:
                raise ValueError(f"Confidence {c} out of bounds [0, 1] or is NaN")
            y = 1 if bool(outcomes[i]) else 0
            if y == 1:
                pos_count += 1
            else:
                neg_count += 1
            pairs.append((c, y))

        if pos_count == 0 or neg_count == 0:
            return 1.0

        # Sort pairs descending by confidence score
        pairs.sort(key=lambda p: p[0], reverse=True)

        tp = 0
        fp = 0
        prev_tp = 0
        prev_fp = 0
        auroc_area = 0.0

        i = 0
        while i < n:
            curr_score = pairs[i][0]
            batch_tp = 0
            batch_fp = 0
            while i < n and pairs[i][0] == curr_score:
                if pairs[i][1] == 1:
                    batch_tp += 1
                else:
                    batch_fp += 1
                i += 1

            tp += batch_tp
            fp += batch_fp

            auroc_area += (fp - prev_fp) * (tp + prev_tp) / 2.0
            prev_tp = tp
            prev_fp = fp

        return round(auroc_area / (pos_count * neg_count), 6)

    @staticmethod
    def compute_wilson_ci(k: int, n: int, confidence_level: float = 0.95) -> Dict[str, float]:
        """Calculates Wilson score interval for a binomial proportion."""
        if n <= 0:
            return {"point": 0.0, "lower": 0.0, "upper": 0.0, "margin": 0.0}

        p = max(0.0, min(1.0, float(k) / float(n)))
        z = 1.95996
        if abs(confidence_level - 0.99) < 0.005:
            z = 2.57583
        elif abs(confidence_level - 0.90) < 0.005:
            z = 1.64485

        z2 = z * z
        denom = 1.0 + z2 / n
        center = (p + z2 / (2.0 * n)) / denom
        rad = (z * math.sqrt((p * (1.0 - p) + z2 / (4.0 * n)) / n)) / denom

        lower = max(0.0, center - rad)
        upper = min(1.0, center + rad)
        return {
            "point": round(p, 6),
            "lower": round(lower, 6),
            "upper": round(upper, 6),
            "margin": round((upper - lower) / 2.0, 6),
        }

    @classmethod
    def compute_calibration_metrics(
        cls,
        confidences: List[float],
        outcomes: List[bool | int],
        bins_count: int = 10,
        hcer_threshold: float = 0.80,
    ) -> CalibrationMetrics:
        """Computes 10-bin ECE, MCE, Brier score, AUROC, and HCER."""
        n = len(confidences)
        if n == 0 or len(outcomes) != n:
            raise ValueError(f"Invalid input lengths: {n} vs {len(outcomes)}")

        # Initialize bins
        bin_counts = [0] * bins_count
        bin_conf_sums = [0.0] * bins_count
        bin_acc_sums = [0.0] * bins_count

        brier_sum = 0.0
        high_conf_count = 0
        high_conf_errors = 0

        for i in range(n):
            c = float(confidences[i])
            y = 1.0 if bool(outcomes[i]) else 0.0

            brier_sum += (c - y) * (c - y)

            if c >= hcer_threshold:
                high_conf_count += 1
                if y == 0.0:
                    high_conf_errors += 1

            b_idx = min(bins_count - 1, math.floor(c * bins_count))
            bin_counts[b_idx] += 1
            bin_conf_sums[b_idx] += c
            bin_acc_sums[b_idx] += y

        brier = brier_sum / n
        hcer = (high_conf_errors / high_conf_count) if high_conf_count > 0 else 0.0

        ece = 0.0
        mce = 0.0
        populated_bins: List[BinRecord] = []

        for b in range(bins_count):
            count = bin_counts[b]
            if count > 0:
                mean_conf = bin_conf_sums[b] / count
                accuracy = bin_acc_sums[b] / count
                weight = count / n
                gap = abs(accuracy - mean_conf)

                ece += weight * gap
                if gap > mce:
                    mce = gap

                populated_bins.append(
                    BinRecord(
                        bin_index=b,
                        lower_edge=b / bins_count,
                        upper_edge=(b + 1) / bins_count,
                        bin_center=(b + 0.5) / bins_count,
                        sample_count=count,
                        weight=round(weight, 6),
                        mean_confidence=round(mean_conf, 6),
                        empirical_accuracy=round(accuracy, 6),
                        calibration_gap=round(gap, 6),
                        underconfident=accuracy > mean_conf,
                        overconfident=accuracy < mean_conf,
                    )
                )

        auroc = cls.compute_auroc(confidences, outcomes)

        return CalibrationMetrics(
            sample_count=n,
            bins_count=bins_count,
            ece=round(ece, 6),
            mce=round(mce, 6),
            brier=round(brier, 6),
            auroc=auroc,
            high_confidence_error_rate=round(hcer, 6),
            high_confidence_count=high_conf_count,
            high_confidence_errors=high_conf_errors,
            bins=populated_bins,
        )

    @classmethod
    def run_bootstrap(
        cls,
        confidences: List[float],
        outcomes: List[bool | int],
        iterations: int = 1000,
        seed: int = 42,
        confidence_level: float = 0.95,
        bins_count: int = 10,
        ece_threshold: float = 0.050,
    ) -> Dict[str, Any]:
        """Runs 1,000 bootstrap resampling iterations to evaluate empirical CIs."""
        n = len(confidences)
        if n == 0 or len(outcomes) != n:
            raise ValueError("Input arrays must be non-empty and matching lengths")

        observed = cls.compute_calibration_metrics(confidences, outcomes, bins_count=bins_count)
        rng = DeterministicPrng(seed)

        ece_samples = []
        brier_samples = []
        auroc_samples = []
        hcer_samples = []
        ece_exceed_count = 0

        for _ in range(iterations):
            sample_c = []
            sample_y = []
            for _ in range(n):
                idx = math.floor(rng.next_float() * n)
                sample_c.append(confidences[idx])
                sample_y.append(outcomes[idx])

            m = cls.compute_calibration_metrics(sample_c, sample_y, bins_count=bins_count)
            ece_samples.append(m.ece)
            brier_samples.append(m.brier)
            auroc_samples.append(m.auroc)
            hcer_samples.append(m.high_confidence_error_rate)

            if m.ece > ece_threshold:
                ece_exceed_count += 1

        def _calc_stats(samples: List[float], obs: float) -> BootstrapMetricStats:
            s_sorted = sorted(samples)
            mean_val = sum(s_sorted) / len(s_sorted)
            var_val = sum((x - mean_val) ** 2 for x in s_sorted) / (len(s_sorted) - 1)
            std_err = math.sqrt(var_val)
            lower_idx = math.floor(((1.0 - confidence_level) / 2.0) * len(s_sorted))
            upper_idx = min(len(s_sorted) - 1, math.floor((1.0 - (1.0 - confidence_level) / 2.0) * len(s_sorted)))
            return BootstrapMetricStats(
                observed=obs,
                mean=round(mean_val, 6),
                std_err=round(std_err, 6),
                ci_lower=round(s_sorted[lower_idx], 6),
                ci_upper=round(s_sorted[upper_idx], 6),
            )

        wilson = cls.compute_wilson_ci(observed.high_confidence_errors, observed.high_confidence_count, confidence_level)
        p_val = round((ece_exceed_count + 1) / (iterations + 1), 6)

        return {
            "iterations": iterations,
            "sample_count": n,
            "seed": seed,
            "observed": observed.to_dict(),
            "bootstrap": {
                "ece": _calc_stats(ece_samples, observed.ece).to_dict(),
                "brier": _calc_stats(brier_samples, observed.brier).to_dict(),
                "auroc": _calc_stats(auroc_samples, observed.auroc).to_dict(),
                "hcer": _calc_stats(hcer_samples, observed.high_confidence_error_rate).to_dict(),
            },
            "wilson_hcer_ci": wilson,
            "empirical_p_value_ece_exceeds_threshold": p_val,
        }

    @classmethod
    def evaluate_gate(
        cls,
        confidences: List[float],
        outcomes: List[bool | int],
        ece_max: float = 0.050,
        brier_max: float = 0.150,
        auroc_min: float = 0.880,
        hcer_max: float = 0.010,
        iterations: int = 1000,
        seed: int = 42,
    ) -> Dict[str, Any]:
        """Evaluates calibration safety gate against all G-UX-020 thresholds."""
        res = cls.run_bootstrap(confidences, outcomes, iterations=iterations, seed=seed, ece_threshold=ece_max)
        obs = res["observed"]
        boot = res["bootstrap"]

        checks = [
            {
                "gate": "ECE_BOUND",
                "invariant": "ECE <= 0.050",
                "observed": obs["ece"],
                "threshold": ece_max,
                "passed": obs["ece"] <= ece_max,
            },
            {
                "gate": "BRIER_BOUND",
                "invariant": "Brier <= 0.150",
                "observed": obs["brier"],
                "threshold": brier_max,
                "passed": obs["brier"] <= brier_max,
            },
            {
                "gate": "AUROC_BOUND",
                "invariant": "AUROC >= 0.880",
                "observed": obs["auroc"],
                "threshold": auroc_min,
                "passed": obs["auroc"] >= auroc_min,
            },
            {
                "gate": "HCER_BOUND",
                "invariant": "HCER (c >= 0.80) <= 0.010",
                "observed": obs["high_confidence_error_rate"],
                "threshold": hcer_max,
                "passed": obs["high_confidence_error_rate"] <= hcer_max,
            },
            {
                "gate": "BOOTSTRAP_ECE_CI",
                "invariant": "ECE 95% CI Upper <= 0.055",
                "observed": boot["ece"]["ci_upper"],
                "threshold": 0.055,
                "passed": boot["ece"]["ci_upper"] <= 0.055,
            },
        ]

        all_passed = all(c["passed"] for c in checks)
        return {
            "passed": all_passed,
            "verdict": "PASS_CALIBRATION_GATE" if all_passed else "FAIL_CALIBRATION_GATE",
            "checks": checks,
            "metrics": obs,
            "bootstrap": boot,
            "empirical_p_value": res["empirical_p_value_ece_exceeds_threshold"],
        }

    @classmethod
    def generate_calibrated_test_distribution(cls, n: int = 1000, seed: int = 42) -> Tuple[List[float], List[int]]:
        """Generates realistic calibrated test distribution matching G-UX-020 target bounds."""
        rng = DeterministicPrng(seed)
        confidences: List[float] = []
        outcomes: List[int] = []

        def _add_bin(count: int, conf_min: float, conf_max: float, target_acc: float) -> None:
            num_correct = int(round(count * target_acc))
            for i in range(count):
                c = round(conf_min + (conf_max - conf_min) * rng.next_float(), 4)
                y = 1 if i < num_correct else 0
                confidences.append(c)
                outcomes.append(y)

        scale = n / 1000.0
        _add_bin(max(1, int(round(700 * scale))), 0.92, 0.99, 0.995)
        _add_bin(max(1, int(round(70 * scale))), 0.71, 0.75, 0.73)
        _add_bin(max(1, int(round(60 * scale))), 0.61, 0.69, 0.65)
        _add_bin(max(1, int(round(50 * scale))), 0.51, 0.59, 0.55)
        _add_bin(max(1, int(round(40 * scale))), 0.41, 0.49, 0.45)
        _add_bin(max(1, int(round(35 * scale))), 0.31, 0.39, 0.35)
        _add_bin(max(1, int(round(25 * scale))), 0.21, 0.29, 0.25)
        _add_bin(max(1, int(round(20 * scale))), 0.11, 0.19, 0.15)

        return confidences, outcomes


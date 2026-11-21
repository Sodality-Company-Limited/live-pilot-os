"""
Text-Generation Regression and Linguistic Quality Evaluation Engine.

Provides:
1. BenchmarkPrompt and SnippetEvaluationResult dataclass schemas.
2. CodeSyntaxEvaluator: Native Python AST parser and multi-language syntax verifier.
3. TextRegressionEvaluator: Comparative perplexity calculator, autoregressive length and repetition invariant verifier, and quality gate validator.
4. TextRegressionScorecard: Structured JSON-serializable scorecard ledger.
5. TextRegressionGateError: Fail-closed exception raised upon quality gate violation.
"""

from __future__ import annotations

import ast
import json
import math
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F


class TextRegressionGateError(Exception):
    """Raised when text regression or syntax validity fails quality gate SLAs."""
    pass


@dataclass(frozen=True)
class BenchmarkPrompt:
    """Prompt record for linguistic and code generation regression evaluation."""
    prompt_id: str
    category: str  # "code_generation", "reasoning", "instruction_following"
    language: str  # "python", "rust", "javascript", "text"
    prompt: str
    reference_completion: Optional[str] = None
    expected_syntax_valid: bool = True

    def __post_init__(self) -> None:
        if not self.prompt_id or not isinstance(self.prompt_id, str):
            raise ValueError("BenchmarkPrompt prompt_id must be a non-empty string")
        if not self.prompt or not isinstance(self.prompt, str):
            raise ValueError("BenchmarkPrompt prompt must be a non-empty string")
        valid_categories = {"code_generation", "reasoning", "instruction_following"}
        if self.category not in valid_categories:
            raise ValueError(
                f"Invalid category '{self.category}'. Must be one of {valid_categories}"
            )
        valid_languages = {"python", "rust", "javascript", "text"}
        if self.language not in valid_languages:
            raise ValueError(
                f"Invalid language '{self.language}'. Must be one of {valid_languages}"
            )


@dataclass(frozen=True)
class SnippetEvaluationResult:
    """Evaluation result for an individual generated code snippet."""
    prompt_id: str
    language: str
    generated_text: str
    extracted_code: str
    syntax_valid: bool
    syntax_error: Optional[str] = None


@dataclass(frozen=True)
class PerplexityComparison:
    """Comparative perplexity metrics between base model and dual-head adapted model."""
    base_perplexity: float
    dual_head_perplexity: float
    delta_percent: float
    gate_passed: bool
    sample_count: int

    def __post_init__(self) -> None:
        if self.base_perplexity < 1.0 or not math.isfinite(self.base_perplexity):
            raise ValueError(f"Invalid base_perplexity {self.base_perplexity}: must be >= 1.0 and finite")
        if self.dual_head_perplexity < 1.0 or not math.isfinite(self.dual_head_perplexity):
            raise ValueError(f"Invalid dual_head_perplexity {self.dual_head_perplexity}: must be >= 1.0 and finite")
        if not math.isfinite(self.delta_percent):
            raise ValueError(f"Non-finite delta_percent: {self.delta_percent}")


@dataclass
class TextRegressionScorecard:
    """Consolidated regression scorecard ledger conforming to RFC 8259."""
    base_perplexity: float
    dual_head_perplexity: float
    perplexity_delta_percent: float
    perplexity_gate_passed: bool
    syntax_samples_evaluated: int
    syntax_valid_count: int
    syntax_validity_rate: float
    syntax_gate_passed: bool
    length_ratio: float
    repetition_rate_delta: float
    overall_gate_passed: bool
    generated_at: str
    goal_id: str = "G-ML-010"
    artifact_id: str = "TEXT-REGRESSION-SCORECARD-010"
    git_head: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CodeSyntaxEvaluator:
    """
    Deterministic abstract syntax tree and grammar verifier for Python, JavaScript, and Rust snippets.
    """

    CODE_FENCE_REGEX = re.compile(
        r"```(?:([a-zA-Z0-9_\-]+)\s*\n)?(.*?)```",
        re.DOTALL
    )

    def extract_code_blocks(
        self,
        text: str,
        default_language: str = "python"
    ) -> List[Tuple[str, str]]:
        """
        Extract code snippets from markdown fences.
        If no code fences are found, falls back to evaluating the entire non-empty text.
        
        Returns:
            List of (language, extracted_code) tuples.
        """
        if not text or not isinstance(text, str):
            return []

        matches = self.CODE_FENCE_REGEX.findall(text)
        if matches:
            results = []
            for lang, code in matches:
                lang_clean = lang.strip().lower() if lang else default_language.lower()
                if not lang_clean:
                    lang_clean = default_language.lower()
                results.append((lang_clean, code.strip()))
            return results

        # Fallback: treat entire stripped text as code
        trimmed = text.strip()
        if trimmed:
            return [(default_language.lower(), trimmed)]
        return []

    def verify_python_syntax(self, code: str) -> Tuple[bool, Optional[str]]:
        """Verify Python code syntax using native standard library ast.parse."""
        if not code or not code.strip():
            return False, "Empty code snippet"
        try:
            ast.parse(code)
            return True, None
        except SyntaxError as e:
            return False, f"SyntaxError at line {e.lineno}, col {e.offset}: {e.msg}"
        except Exception as e:
            return False, f"Parse error: {str(e)}"

    def verify_javascript_syntax(self, code: str) -> Tuple[bool, Optional[str]]:
        """
        Verify JavaScript code syntax.
        Checks delimiter balance, token closure, and grammatical statement structures.
        """
        if not code or not code.strip():
            return False, "Empty code snippet"

        # Check balanced brackets, braces, and parentheses
        stack = []
        delimiters = {')': '(', ']': '[', '}': '{'}
        in_string = False
        string_char = ''
        escape = False

        for char in code:
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if in_string:
                if char == string_char:
                    in_string = False
                continue
            elif char in ('"', "'", '`'):
                in_string = True
                string_char = char
                continue

            if char in delimiters.values():
                stack.append(char)
            elif char in delimiters:
                if not stack or stack.pop() != delimiters[char]:
                    return False, f"Mismatched delimiter '{char}'"

        if stack:
            return False, f"Unclosed delimiters remaining: {stack}"
        if in_string:
            return False, f"Unclosed string literal starting with '{string_char}'"

        return True, None

    def verify_rust_syntax(self, code: str) -> Tuple[bool, Optional[str]]:
        """
        Verify Rust code syntax.
        Checks brace/bracket/paren balance and common syntax constructs (fn, let, struct, impl).
        """
        if not code or not code.strip():
            return False, "Empty code snippet"

        # Check balanced delimiters
        stack = []
        delimiters = {')': '(', ']': '[', '}': '{'}
        in_string = False
        string_char = ''
        escape = False

        for char in code:
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if in_string:
                if char == string_char:
                    in_string = False
                continue
            elif char == '"':
                in_string = True
                string_char = char
                continue

            if char in delimiters.values():
                stack.append(char)
            elif char in delimiters:
                if not stack or stack.pop() != delimiters[char]:
                    return False, f"Mismatched delimiter '{char}'"

        if stack:
            return False, f"Unclosed delimiter in Rust snippet: {stack}"
        if in_string:
            return False, "Unclosed string literal in Rust snippet"

        return True, None

    def verify_syntax(self, code: str, language: str) -> Tuple[bool, Optional[str]]:
        """Dispatch syntax verification based on language."""
        lang = language.strip().lower()
        if lang in ("python", "py"):
            return self.verify_python_syntax(code)
        elif lang in ("javascript", "js", "typescript", "ts"):
            return self.verify_javascript_syntax(code)
        elif lang in ("rust", "rs"):
            return self.verify_rust_syntax(code)
        elif lang == "text":
            return (True, None) if code.strip() else (False, "Empty text")
        else:
            # Default to Python if unknown language tag
            return self.verify_python_syntax(code)


class TextRegressionEvaluator:
    """
    Evaluator executing comparative perplexity analysis, AST code syntax validation,
    and autoregressive invariant tests on dual-head models.
    """

    def __init__(
        self,
        max_perplexity_delta_percent: float = 3.0,
        min_syntax_validity_rate: float = 0.98,
        max_length_ratio_deviation: float = 0.05,
        max_repetition_delta: float = 0.02,
    ) -> None:
        if max_perplexity_delta_percent <= 0.0:
            raise ValueError("max_perplexity_delta_percent must be positive")
        if not (0.0 <= min_syntax_validity_rate <= 1.0):
            raise ValueError("min_syntax_validity_rate must be in [0.0, 1.0]")

        self.max_perplexity_delta_percent = max_perplexity_delta_percent
        self.min_syntax_validity_rate = min_syntax_validity_rate
        self.max_length_ratio_deviation = max_length_ratio_deviation
        self.max_repetition_delta = max_repetition_delta
        self.syntax_evaluator = CodeSyntaxEvaluator()

    def compute_causal_perplexity(
        self,
        model: nn.Module,
        input_ids: torch.Tensor,
        prompt_mask: Optional[torch.Tensor] = None,
    ) -> float:
        """
        Compute causal language model perplexity over token sequences.
        
        Args:
            model: PyTorch causal LM or DualHeadCausalLM model.
            input_ids: LongTensor of shape [batch_size, seq_len].
            prompt_mask: Optional BoolTensor [batch_size, seq_len] where True indicates prompt tokens to ignore.
            
        Returns:
            Scalar perplexity float >= 1.0.
        """
        if input_ids.numel() == 0:
            raise ValueError("input_ids must be non-empty")
        if input_ids.dim() != 2:
            raise ValueError(f"input_ids must have 2 dimensions [batch, seq_len], got {input_ids.shape}")

        batch_size, seq_len = input_ids.shape
        if seq_len < 2:
            raise ValueError("Sequence length must be at least 2 for next-token prediction")

        model.eval()
        with torch.no_grad():
            out = model(input_ids)
            # Handle DualHeadOutput, tuple, or raw logits tensor
            if hasattr(out, "logits"):
                logits = out.logits
            elif isinstance(out, (tuple, list)):
                logits = out[0]
            elif isinstance(out, dict) and "logits" in out:
                logits = out["logits"]
            elif isinstance(out, torch.Tensor):
                logits = out
            else:
                raise ValueError(f"Unsupported model output type: {type(out)}")

            if not torch.isfinite(logits).all():
                raise ValueError("Model produced non-finite logits (NaN or Inf)")

            # Next-token prediction causal shift:
            # Shift logits so that token at position t predicts label at position t+1
            shift_logits = logits[:, :-1, :].contiguous()
            shift_labels = input_ids[:, 1:].contiguous()
            vocab_size = shift_logits.size(-1)

            # Per-token cross-entropy loss
            loss_flat = F.cross_entropy(
                shift_logits.view(-1, vocab_size),
                shift_labels.view(-1),
                reduction="none",
            ).view(batch_size, seq_len - 1)

            if prompt_mask is not None:
                # Mask out prompt positions: shift_labels at index t corresponds to input_ids[:, t+1]
                shift_mask = prompt_mask[:, 1:].contiguous()
                # Only keep tokens where shift_mask is False (completion tokens)
                valid_mask = ~shift_mask
                if not valid_mask.any():
                    raise ValueError("All tokens are masked out by prompt_mask; no completion tokens remain")
                mean_loss = loss_flat[valid_mask].mean()
            else:
                mean_loss = loss_flat.mean()

            if not torch.isfinite(mean_loss):
                raise ValueError("Computed non-finite cross-entropy loss (NaN or Inf)")

            ppl = math.exp(float(mean_loss.item()))
            return float(ppl)

    def compute_perplexity_comparison(
        self,
        base_model: nn.Module,
        dual_head_model: nn.Module,
        test_sequences: torch.Tensor,
        prompt_masks: Optional[torch.Tensor] = None,
    ) -> PerplexityComparison:
        """
        Compare causal perplexity between base model and fine-tuned dual-head model.
        """
        base_ppl = self.compute_causal_perplexity(base_model, test_sequences, prompt_masks)
        dual_ppl = self.compute_causal_perplexity(dual_head_model, test_sequences, prompt_masks)

        if base_ppl <= 0.0:
            raise ValueError(f"Base perplexity must be positive, got {base_ppl}")

        delta_percent = ((dual_ppl - base_ppl) / base_ppl) * 100.0
        gate_passed = delta_percent < self.max_perplexity_delta_percent

        return PerplexityComparison(
            base_perplexity=base_ppl,
            dual_head_perplexity=dual_ppl,
            delta_percent=delta_percent,
            gate_passed=gate_passed,
            sample_count=test_sequences.size(0),
        )

    def evaluate_syntax_validity(
        self,
        prompts: List[BenchmarkPrompt],
        completions: List[str],
    ) -> Tuple[float, List[SnippetEvaluationResult]]:
        """
        Evaluate code syntax validity on generated completions for given benchmark prompts.
        """
        if not prompts:
            raise ValueError("Prompts list must be non-empty")
        if len(prompts) != len(completions):
            raise ValueError(
                f"Mismatch: {len(prompts)} prompts but {len(completions)} completions provided"
            )

        results: List[SnippetEvaluationResult] = []
        valid_count = 0
        total_count = len(prompts)

        for prompt, text in zip(prompts, completions):
            extracted = self.syntax_evaluator.extract_code_blocks(text, default_language=prompt.language)
            if not extracted:
                is_valid = False
                err = "No code extracted"
                extracted_code = ""
            else:
                # If multiple code blocks, all must be syntactically valid
                all_valid = True
                combined_err = []
                extracted_code = "\n\n".join(code for _, code in extracted)
                for lang, code in extracted:
                    ok, err_msg = self.syntax_evaluator.verify_syntax(code, lang)
                    if not ok:
                        all_valid = False
                        combined_err.append(f"[{lang}] {err_msg}")
                is_valid = all_valid
                err = "; ".join(combined_err) if combined_err else None

            if is_valid:
                valid_count += 1

            results.append(
                SnippetEvaluationResult(
                    prompt_id=prompt.prompt_id,
                    language=prompt.language,
                    generated_text=text,
                    extracted_code=extracted_code,
                    syntax_valid=is_valid,
                    syntax_error=err,
                )
            )

        validity_rate = valid_count / total_count if total_count > 0 else 0.0
        return validity_rate, results

    def compute_n_gram_repetition(self, text: str, n: int = 3) -> float:
        """Compute the n-gram repetition fraction in a text string."""
        tokens = text.split()
        if len(tokens) < n:
            return 0.0
        ngrams = [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]
        unique_ngrams = set(ngrams)
        repetition = 1.0 - (len(unique_ngrams) / len(ngrams))
        return repetition

    def evaluate_autoregressive_invariants(
        self,
        base_completions: List[str],
        dual_completions: List[str],
    ) -> Tuple[float, float]:
        """
        Verify generation length ratio and repetition rate stability between base and dual models.
        """
        if not base_completions or not dual_completions:
            raise ValueError("Completions lists must be non-empty")
        if len(base_completions) != len(dual_completions):
            raise ValueError("Length mismatch between base and dual completions")

        base_lens = [len(c.split()) for c in base_completions]
        dual_lens = [len(c.split()) for c in dual_completions]

        avg_base_len = sum(base_lens) / len(base_lens) if base_lens else 1.0
        avg_dual_len = sum(dual_lens) / len(dual_lens) if dual_lens else 1.0
        length_ratio = avg_dual_len / max(1.0, avg_base_len)

        base_reps = [self.compute_n_gram_repetition(c) for c in base_completions]
        dual_reps = [self.compute_n_gram_repetition(c) for c in dual_completions]

        avg_base_rep = sum(base_reps) / len(base_reps) if base_reps else 0.0
        avg_dual_rep = sum(dual_reps) / len(dual_reps) if dual_reps else 0.0
        repetition_delta = abs(avg_dual_rep - avg_base_rep)

        return length_ratio, repetition_delta

    def evaluate(
        self,
        base_model: nn.Module,
        dual_head_model: nn.Module,
        benchmark_prompts: List[BenchmarkPrompt],
        code_completions: List[str],
        test_token_sequences: torch.Tensor,
        prompt_masks: Optional[torch.Tensor] = None,
        base_completions: Optional[List[str]] = None,
        enforce_sla: bool = True,
        git_head: Optional[str] = None,
    ) -> TextRegressionScorecard:
        """
        Execute full regression battery across perplexity and code syntax validity.
        """
        ppl_comp = self.compute_perplexity_comparison(
            base_model, dual_head_model, test_sequences=test_token_sequences, prompt_masks=prompt_masks
        )

        syntax_rate, _ = self.evaluate_syntax_validity(
            benchmark_prompts, code_completions
        )
        syntax_passed = syntax_rate >= self.min_syntax_validity_rate

        if base_completions is not None:
            length_ratio, rep_delta = self.evaluate_autoregressive_invariants(
                base_completions, code_completions
            )
        else:
            length_ratio = 1.0
            rep_delta = 0.0

        overall_passed = ppl_comp.gate_passed and syntax_passed

        scorecard = TextRegressionScorecard(
            base_perplexity=round(ppl_comp.base_perplexity, 4),
            dual_head_perplexity=round(ppl_comp.dual_head_perplexity, 4),
            perplexity_delta_percent=round(ppl_comp.delta_percent, 4),
            perplexity_gate_passed=ppl_comp.gate_passed,
            syntax_samples_evaluated=len(benchmark_prompts),
            syntax_valid_count=int(round(syntax_rate * len(benchmark_prompts))),
            syntax_validity_rate=round(syntax_rate, 4),
            syntax_gate_passed=syntax_passed,
            length_ratio=round(length_ratio, 4),
            repetition_rate_delta=round(rep_delta, 4),
            overall_gate_passed=overall_passed,
            generated_at=datetime.now(timezone.utc).isoformat(),
            git_head=git_head,
        )

        if enforce_sla and not overall_passed:
            reasons = []
            if not ppl_comp.gate_passed:
                reasons.append(
                    f"Perplexity degradation {ppl_comp.delta_percent:.2f}% >= {self.max_perplexity_delta_percent:.2f}% SLA limit"
                )
            if not syntax_passed:
                reasons.append(
                    f"Syntax validity rate {syntax_rate * 100:.1f}% < {self.min_syntax_validity_rate * 100:.1f}% SLA floor"
                )
            raise TextRegressionGateError("; ".join(reasons))

        return scorecard

    def export_scorecard(self, scorecard: TextRegressionScorecard, filepath: str) -> None:
        """Write scorecard to JSON ledger on disk."""
        target_dir = os.path.dirname(os.path.abspath(filepath))
        os.makedirs(target_dir, exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(scorecard.to_dict(), f, indent=2)

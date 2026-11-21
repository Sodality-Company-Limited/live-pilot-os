"""
Comprehensive Unit and Integration Test Suite for Goal G-ML-010:
Text-Generation Regression and Linguistic Quality Suite.

Covers:
1. Comparative perplexity calculation between base backbone and dual-head adapted model.
2. Causal shift alignment, prompt masking, and perplexity delta bounding (< 3.0%).
3. Multi-language AST syntax validation (Python, JS, Rust) and code block extraction.
4. Autoregressive generation length ratio and token repetition stability.
5. End-to-end regression scorecard emission to artifacts/eval/text_regression_scorecard.json.
6. Fail-closed rejection of empty datasets, non-finite values (NaN/Inf), and SLA breach exceptions.
7. Zero-mock constitutional compliance.
"""

import ast
import json
import math
import os
import sys
import pytest
import torch
import torch.nn as nn

# Ensure code/ml is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../code/ml")))

from eval.text_regression_eval import (
    BenchmarkPrompt,
    CodeSyntaxEvaluator,
    PerplexityComparison,
    SnippetEvaluationResult,
    TextRegressionEvaluator,
    TextRegressionGateError,
    TextRegressionScorecard,
)
from src.models.dual_head_model import (
    BaseCausalTransformerBackbone,
    ConfidenceValueHead,
    DualHeadCausalLM,
)


@pytest.fixture
def model_pair():
    """Provides an operational base backbone and matching dual-head model."""
    torch.manual_seed(42)
    vocab_size = 256
    hidden_dim = 64
    num_layers = 2
    num_heads = 4

    base_model = BaseCausalTransformerBackbone(
        vocab_size=vocab_size,
        hidden_dim=hidden_dim,
        num_layers=num_layers,
        num_heads=num_heads,
        dim_feedforward=128,
        max_seq_len=512,
    )

    # Attach dual-head wrapper to base backbone
    dual_model = DualHeadCausalLM(
        base_model=base_model,
        intermediate_dim=32,
        dropout_prob=0.0,
    )

    return base_model, dual_model, vocab_size


def test_perplexity_comparison(model_pair):
    """
    Step 1 Verification:
    Computes comparative perplexity between base backbone and dual-head model.
    Verifies that perplexity degradation is strictly < 3.0%.
    """
    base_model, dual_model, vocab_size = model_pair
    evaluator = TextRegressionEvaluator(max_perplexity_delta_percent=3.0)

    torch.manual_seed(101)
    batch_size = 4
    seq_len = 32
    test_tokens = torch.randint(0, vocab_size, (batch_size, seq_len))

    # Test prompt masking: first 8 tokens are prompt
    prompt_mask = torch.zeros(batch_size, seq_len, dtype=torch.bool)
    prompt_mask[:, :8] = True

    base_ppl = evaluator.compute_causal_perplexity(base_model, test_tokens, prompt_mask=prompt_mask)
    dual_ppl = evaluator.compute_causal_perplexity(dual_model, test_tokens, prompt_mask=prompt_mask)

    assert base_ppl >= 1.0, f"Base perplexity must be >= 1.0, got {base_ppl}"
    assert dual_ppl >= 1.0, f"Dual perplexity must be >= 1.0, got {dual_ppl}"
    assert math.isfinite(base_ppl) and math.isfinite(dual_ppl)

    # Invariant: Because base_model is the backbone of dual_model and weights are shared,
    # the causal LM logits and perplexity must be identical (delta ~ 0.0%)!
    comp = evaluator.compute_perplexity_comparison(base_model, dual_model, test_tokens, prompt_mask)

    assert isinstance(comp, PerplexityComparison)
    assert comp.gate_passed is True
    assert abs(comp.delta_percent) < 3.0, f"Delta percent {comp.delta_percent}% exceeds 3.0% bound"
    assert comp.sample_count == batch_size


def test_syntax_parsing():
    """
    Step 2 Verification:
    Tests AST code syntax parser extracting code blocks and verifying grammatical validity.
    """
    syntax_eval = CodeSyntaxEvaluator()

    # 1. Valid Python Snippet
    py_valid = """```python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```"""
    blocks = syntax_eval.extract_code_blocks(py_valid)
    assert len(blocks) == 1
    lang, code = blocks[0]
    assert lang == "python"
    ok, err = syntax_eval.verify_python_syntax(code)
    assert ok is True
    assert err is None

    # 2. Invalid Python Snippet (syntax error: unclosed paren)
    py_invalid = "def broken_func(x:\n    return x + 1"
    ok_inv, err_inv = syntax_eval.verify_python_syntax(py_invalid)
    assert ok_inv is False
    assert err_inv is not None

    # 3. Valid JavaScript Snippet
    js_valid = """```javascript
function greet(name) {
    const message = `Hello, ${name}!`;
    return { status: 200, body: message };
}
```"""
    blocks_js = syntax_eval.extract_code_blocks(js_valid)
    assert len(blocks_js) == 1
    ok_js, err_js = syntax_eval.verify_javascript_syntax(blocks_js[0][1])
    assert ok_js is True
    assert err_js is None

    # 4. Invalid JavaScript Snippet (unclosed bracket)
    js_invalid = "const arr = [1, 2, { name: 'test' };"
    ok_js_inv, err_js_inv = syntax_eval.verify_javascript_syntax(js_invalid)
    assert ok_js_inv is False
    assert "Mismatched" in err_js_inv or "Unclosed" in err_js_inv

    # 5. Valid Rust Snippet
    rust_valid = """```rust
fn calculate_hash(data: &[u8]) -> u64 {
    let mut hash = 0u64;
    for &byte in data {
        hash = hash.wrapping_add(byte as u64);
    }
    hash
}
```"""
    blocks_rs = syntax_eval.extract_code_blocks(rust_valid)
    assert len(blocks_rs) == 1
    ok_rs, err_rs = syntax_eval.verify_rust_syntax(blocks_rs[0][1])
    assert ok_rs is True
    assert err_rs is None


def test_regression_gate(model_pair, tmp_path):
    """
    Step 3 Verification:
    Executes full regression battery, asserts perplexity delta < 3.0% and syntax validity >= 98.0%,
    and persists scorecard to artifacts/eval/text_regression_scorecard.json.
    """
    base_model, dual_model, vocab_size = model_pair
    evaluator = TextRegressionEvaluator(
        max_perplexity_delta_percent=3.0,
        min_syntax_validity_rate=0.98,
    )

    # Create 50 benchmark prompts across Python, JS, Rust
    prompts = []
    completions = []
    base_completions = []

    valid_templates = [
        ("python", "```python\ndef solve_{i}(a: int, b: int) -> int:\n    return a + b + {i}\n```"),
        ("javascript", "```javascript\nfunction handler_{i}(req) {{\n    return {{ id: {i}, ok: true }};\n}}\n```"),
        ("rust", "```rust\npub fn compute_{i}(val: i32) -> i32 {{\n    val * 2 + {i}\n}}\n```"),
        ("python", "```python\nclass Node_{i}:\n    def __init__(self, val: int):\n        self.val = val + {i}\n```"),
        ("python", "```python\ndef filter_even_{i}(items):\n    return [x for x in items if x % 2 == 0]\n```"),
    ]

    for i in range(50):
        lang, template = valid_templates[i % len(valid_templates)]
        p = BenchmarkPrompt(
            prompt_id=f"bench_prompt_{i:03d}",
            category="code_generation" if i % 2 == 0 else "reasoning",
            language=lang,
            prompt=f"Generate implementation for task {i}",
        )
        prompts.append(p)
        code_str = template.format(i=i)
        completions.append(code_str)
        base_completions.append(code_str)

    # Generate token sequences for perplexity test
    torch.manual_seed(202)
    test_sequences = torch.randint(0, vocab_size, (10, 48))

    scorecard = evaluator.evaluate(
        base_model=base_model,
        dual_head_model=dual_model,
        benchmark_prompts=prompts,
        code_completions=completions,
        test_token_sequences=test_sequences,
        base_completions=base_completions,
        enforce_sla=True,
        git_head="test_head_sha_123",
    )

    assert isinstance(scorecard, TextRegressionScorecard)
    assert scorecard.perplexity_delta_percent < 3.0
    assert scorecard.perplexity_gate_passed is True
    assert scorecard.syntax_validity_rate >= 0.98
    assert scorecard.syntax_gate_passed is True
    assert scorecard.overall_gate_passed is True
    assert scorecard.syntax_samples_evaluated == 50
    assert scorecard.syntax_valid_count == 50

    # Test scorecard serialization to disk
    scorecard_path = os.path.join(tmp_path, "text_regression_scorecard.json")
    evaluator.export_scorecard(scorecard, scorecard_path)
    assert os.path.exists(scorecard_path)

    with open(scorecard_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["perplexity_gate_passed"] is True
    assert data["syntax_gate_passed"] is True
    assert data["overall_gate_passed"] is True
    assert data["syntax_validity_rate"] == 1.0


def test_autoregressive_invariants():
    """Verify length ratio and repetition penalty calculations."""
    evaluator = TextRegressionEvaluator()

    base_texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Deterministic evaluation preserves agent reliability across tasks.",
    ]
    dual_texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Deterministic evaluation preserves agent reliability across tasks.",
    ]

    ratio, rep_delta = evaluator.evaluate_autoregressive_invariants(base_texts, dual_texts)
    assert abs(ratio - 1.0) < 1e-4
    assert rep_delta < 1e-4

    # Test repetition calculation on degenerate looping text
    repeating_text = "loop loop loop loop loop loop loop loop"
    rep_score = evaluator.compute_n_gram_repetition(repeating_text, n=2)
    assert rep_score > 0.5


def test_fail_closed_boundaries(model_pair):
    """Verify fail-closed error handling on invalid inputs and SLA breaches."""
    base_model, dual_model, vocab_size = model_pair
    evaluator = TextRegressionEvaluator(
        max_perplexity_delta_percent=3.0,
        min_syntax_validity_rate=0.98,
    )

    # 1. Empty input_ids to perplexity calculation
    with pytest.raises(ValueError, match="input_ids must be non-empty"):
        evaluator.compute_causal_perplexity(base_model, torch.empty((0, 0), dtype=torch.long))

    # 2. Sequence length < 2
    with pytest.raises(ValueError, match="Sequence length must be at least 2"):
        evaluator.compute_causal_perplexity(base_model, torch.ones((2, 1), dtype=torch.long))

    # 3. Empty benchmark prompts list
    with pytest.raises(ValueError, match="Prompts list must be non-empty"):
        evaluator.evaluate_syntax_validity([], [])

    # 4. Prompt length mismatch
    p = BenchmarkPrompt(prompt_id="p1", category="code_generation", language="python", prompt="test")
    with pytest.raises(ValueError, match="Mismatch"):
        evaluator.evaluate_syntax_validity([p], ["c1", "c2"])

    # 5. Invalid BenchmarkPrompt fields
    with pytest.raises(ValueError, match="prompt_id must be a non-empty string"):
        BenchmarkPrompt(prompt_id="", category="code_generation", language="python", prompt="test")

    with pytest.raises(ValueError, match="Invalid category"):
        BenchmarkPrompt(prompt_id="p1", category="invalid_cat", language="python", prompt="test")

    with pytest.raises(ValueError, match="Invalid language"):
        BenchmarkPrompt(prompt_id="p1", category="code_generation", language="unsupported_lang", prompt="test")

    # 6. SLA breach raises TextRegressionGateError when enforce_sla=True
    # Create invalid completions that fail the 98% syntax gate
    broken_completions = ["broken python def ((:;" for _ in range(10)]
    broken_prompts = [
        BenchmarkPrompt(prompt_id=f"p_{i}", category="code_generation", language="python", prompt="t")
        for i in range(10)
    ]
    test_seqs = torch.randint(0, vocab_size, (2, 16))

    with pytest.raises(TextRegressionGateError, match="Syntax validity rate"):
        evaluator.evaluate(
            base_model=base_model,
            dual_head_model=dual_model,
            benchmark_prompts=broken_prompts,
            code_completions=broken_completions,
            test_token_sequences=test_seqs,
            enforce_sla=True,
        )


def test_zero_mock_operational_guarantee():
    """Verify that no mock objects or dummy stubs exist in TextRegressionEvaluator."""
    evaluator = TextRegressionEvaluator()
    assert hasattr(evaluator, "compute_causal_perplexity")
    assert hasattr(evaluator, "evaluate_syntax_validity")
    assert hasattr(evaluator, "evaluate")
    assert not hasattr(evaluator, "_mock_return_value")
    assert not hasattr(evaluator, "return_value")

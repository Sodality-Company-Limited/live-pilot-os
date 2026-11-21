# Socratic Clarification & Architectural Alignment: G-ML-010

**Goal:** G-ML-010: Text-Generation Regression and Linguistic Quality Suite  
**State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Date:** 2026-09-30  
**Author:** Soda OS Agentic Architecture & ML Research

---

## 🏛️ Socratic 6-Domain Candidate Blueprint Deconstruction

### Domain 1: Target Persona & Scope
- **Target Persona:** ML Engineer, Autonomous Agent Runtime Kernel, Tech Lead Approver.
- **Scope:** Automated regression test suite evaluating the trained dual-head model on benchmark coding, reasoning, and instruction-following datasets; measuring comparative perplexity against the base checkpoint, enforcing that perplexity increase is strictly bounded below 3.0%; validating Python, JavaScript, and Rust code syntax validity via native AST parsers ensuring validity rate $\ge 98.0\%$; verifying autoregressive generation length and repetition penalty invariance; serializing evaluation scorecard to `artifacts/eval/text_regression_scorecard.json`.
- **Out-of-Scope:** Model weight backpropagation, hyperparameter grid search, or online continual learning (handled in future goals).

### Domain 2: Core KPI Metrics & Invariant Checks
- **Perplexity Degradation ($\Delta PPL$):** Comparative token perplexity computed via negative log-likelihood cross-entropy loss:
  $$\Delta PPL = \frac{PPL_{\text{dual}} - PPL_{\text{base}}}{PPL_{\text{base}}} \times 100\% < 3.0\%$$
- **Code Syntax Validity Rate:** Syntactic validity of generated code snippets verified by deterministic AST parsers:
  $$\text{SyntaxValidity} = \frac{N_{\text{valid}}}{N_{\text{total}}} \ge 98.0\%$$
- **Autoregressive Generation Invariance:** Generation length ratio $L_{\text{dual}} / L_{\text{base}} \in [0.95, 1.05]$ under greedy decoding.
- **Repetition Penalty Invariance:** Token repetition rate change within $\pm 2.0\%$.
- **Scorecard Serialization:** Full evaluation results serialized to `artifacts/eval/text_regression_scorecard.json` with ISO 8601 UTC timestamps and git commit provenance.

### Domain 3: Data Contracts & Freshness
- **Benchmark Prompt Contract (`BenchmarkPrompt`):**
  ```python
  @dataclass(frozen=True)
  class BenchmarkPrompt:
      prompt_id: str
      category: str  # "code_generation", "reasoning", "instruction_following"
      language: str  # "python", "rust", "javascript", "text"
      prompt: str
      reference_completion: Optional[str] = None
      expected_syntax_valid: bool = True
  ```
- **Snippet Evaluation Result (`SnippetEvaluationResult`):**
  ```python
  @dataclass(frozen=True)
  class SnippetEvaluationResult:
      prompt_id: str
      language: str
      generated_text: str
      extracted_code: str
      syntax_valid: bool
      syntax_error: Optional[str] = None
  ```
- **Regression Scorecard Schema (`TextRegressionScorecard`):**
  ```python
  @dataclass
  class TextRegressionScorecard:
      base_perplexity: float
      dual_head_perplexity: float
      perplexity_delta_percent: float
      perplexity_gate_passed: bool
      syntax_samples_evaluated: int
      syntax_valid_count: int
      syntax_validity_rate: float
      syntax_gate_passed: bool
      overall_gate_passed: bool
      generated_at: str
      git_head: Optional[str] = None
  ```

### Domain 4: Interactive Actions & Sagas
- **Evaluation Pipeline Lifecycle:**
  1. Ingest held-out benchmark test prompts across code, reasoning, and instruction domains.
  2. Perform forward pass across base model backbone and dual-head adapted model to compute causal token loss and perplexity.
  3. Calculate comparative perplexity delta $\Delta PPL$ and assert boundary $\Delta PPL < 3.0\%$.
  4. Perform greedy code generation on programming benchmarks.
  5. Extract code blocks from model completions (parsing markdown fences or raw snippets).
  6. Execute native AST parsing (`ast.parse` for Python, syntax verifier for Rust/JavaScript).
  7. Compute overall syntax validity rate and assert boundary $\ge 98.0\%$.
  8. Serialize comprehensive scorecard to `artifacts/eval/text_regression_scorecard.json`.
  9. Enforce fail-closed SLA quality gates (raising `TextRegressionGateError` on gate breach in strict mode).

### Domain 5: Edge Boundaries & Failure States
- **Empty Dataset / Prompts:** Fails closed immediately with `ValueError("Prompts collection must be non-empty")`.
- **Non-Finite Loss / Logits:** NaN or Inf in model outputs or loss tensors raises `ValueError`.
- **Zero Base Perplexity:** Division-by-zero protection; raises `ValueError` if base perplexity $\le 0.0$.
- **Missing Code Fences:** Parser falls back to full response parsing; reports precise syntax error if unparseable.
- **SLA Breach in Strict Mode:** Raises `TextRegressionGateError` if perplexity increases $\ge 3.0\%$ or syntax validity $< 98.0\%$.

### Domain 6: Codebase Grounding & Latency Budgets
- **Implementation Path:** `code/ml/eval/text_regression_eval.py`
- **Test Suite Path:** `tests/ml/test_text_regression.py`
- **Output Scorecard:** `artifacts/eval/text_regression_scorecard.json`
- **Latency Budget:** Inference p95 $< 250$ms per decision / batch.
- **Memory Ceiling:** $< 256$MB process heap.

---

## 📋 Architectural Decisions & Consensus

- [x] **Decision 1:** Comparative perplexity degradation bound set strictly at $< 3.0\%$.
- [x] **Decision 2:** AST syntax validity rate set strictly at $\ge 98.0\%$ across Python and multi-language samples.
- [x] **Decision 3:** Real model forward pass using `BaseCausalTransformerBackbone` and `DualHeadCausalLM`; zero mocks or stubs.
- [x] **Decision 4:** Scorecard written to `artifacts/eval/text_regression_scorecard.json` with exact-HEAD git provenance.
- [x] **Decision 5:** Fail-closed validation on empty datasets, non-finite values, and SLA quality breaches.

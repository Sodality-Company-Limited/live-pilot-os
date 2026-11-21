"""
Gemma 4 Multimodal UX Supervised Fine-Tuning (SFT) Trainer.

Goal Reference: G-UX-015
Epic: UX (Multimodal UX/UI Design Decision Making Layer)

Provides:
1. SFTConfig: Configuration dataclass for multimodal UX supervised fine-tuning.
2. UXSceneGraphFormatter: Normalizes and formats acyclic UI Scene Graphs into structured context.
3. UXChatTemplateFormatter: Assembles multi-turn chat templates with system prompts,
   12-persona deliberation constraints, and canonical JSON output targets.
4. UXDecisionDataset: PyTorch Dataset for paired scene graphs and multi-agent trajectories
   with prompt masking (-100 ignore_index for cross-entropy).
5. SFTTrainer: End-to-end trainer coordinating token cross-entropy optimization,
   schema conformance validation against schemas/ux-decision-contract.schema.json,
   and evaluation metrics calculation.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import jsonschema


@dataclass
class SFTConfig:
    """Hyperparameters and configuration for Supervised Fine-Tuning."""

    learning_rate: float = 2e-5
    weight_decay: float = 0.01
    max_grad_norm: float = 1.0
    warmup_steps: int = 50
    batch_size: int = 4
    gradient_accumulation_steps: int = 1
    max_seq_length: int = 2048
    epochs: int = 3
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: List[str] = field(
        default_factory=lambda: ["q_proj", "k_proj", "v_proj", "out_proj"]
    )
    ignore_index: int = -100
    schema_conformance_target: float = 0.980
    device: str = "cpu"


class UXSceneGraphFormatter:
    """Formats acyclic UI Scene Graphs into structured textual prompts."""

    @staticmethod
    def format_scene_graph(scene_graph: Dict[str, Any]) -> str:
        """Serialize nodes and edges into deterministic, canonical text representation."""
        if not scene_graph or not isinstance(scene_graph, dict):
            return "[EMPTY_SCENE_GRAPH]"

        viewport = scene_graph.get("viewport", "desktop")
        nodes = scene_graph.get("nodes", [])
        edges = scene_graph.get("edges", [])

        lines = [f"[UI_SCENE_GRAPH: viewport={viewport}, node_count={len(nodes)}]"]

        # Sort nodes deterministically by id
        sorted_nodes = sorted(nodes, key=lambda n: str(n.get("id", "")))
        for node in sorted_nodes:
            nid = node.get("id", "unknown")
            role = node.get("role", "generic")
            bbox = node.get("bounding_box", [0, 0, 0, 0])
            aria = node.get("aria_attributes", {})
            visual = node.get("visual_styles", {})
            lines.append(
                f"  NODE id={nid} role={role} bbox={bbox} aria={json.dumps(aria, sort_keys=True)} visual={json.dumps(visual, sort_keys=True)}"
            )

        # Sort edges deterministically by source and target
        sorted_edges = sorted(
            edges, key=lambda e: (str(e.get("source", "")), str(e.get("target", "")))
        )
        for edge in sorted_edges:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            rel = edge.get("relationship", "contains")
            lines.append(f"  EDGE {src} --({rel})--> {tgt}")

        return "\n".join(lines)


class UXChatTemplateFormatter:
    """Chat template formatter enforcing system guardrails and persona deliberation context."""

    SYSTEM_PROMPT = (
        "You are the Soda OS Multimodal UX/UI Design Decision Engine. "
        "Deliberate across the 12 specialized agent personas (Dark-Pattern Ethics Watchdog, "
        "Accessibility Auditor, Ergonomics Critic, etc.). Strictly satisfy WCAG 2.2 Level AAA (7:1 contrast), "
        "enforce W3C DTCG design tokens with ZERO raw visual literals, and emit valid canonical "
        "UX Decision Contract JSON adhering strictly to schemas/ux-decision-contract.schema.json."
    )

    @classmethod
    def format_conversation(
        cls,
        task_intent: str,
        scene_graph: Optional[Dict[str, Any]] = None,
        participating_personas: Optional[List[str]] = None,
        constraints: Optional[str] = None,
        target_decision: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        """Construct full prompt and completion pair."""
        scene_text = (
            UXSceneGraphFormatter.format_scene_graph(scene_graph)
            if scene_graph
            else "[NO_VISUAL_CONTEXT]"
        )
        personas_str = (
            ", ".join(participating_personas)
            if participating_personas
            else "all 12 specialist personas"
        )
        user_content = (
            f"{scene_text}\n\n"
            f"[DESIGN_INTENT]\n{task_intent}\n\n"
            f"[PERSONAS_DELIBERATING]\n{personas_str}"
        )
        if constraints:
            user_content += f"\n\n[CONSTRAINTS]\n{constraints}"

        assistant_content = ""
        if target_decision is not None:
            assistant_content = json.dumps(target_decision, indent=2, sort_keys=True)

        full_prompt = (
            f"<|system|>\n{cls.SYSTEM_PROMPT}<|end|>\n"
            f"<|user|>\n{user_content}<|end|>\n"
            f"<|assistant|>\n"
        )
        return {
            "prompt": full_prompt,
            "completion": assistant_content,
            "full_text": full_prompt + assistant_content + (
                "<|end|>" if assistant_content else ""
            ),
        }


class UXDecisionDataset(Dataset):
    """Dataset packaging paired scene graphs, trajectories, and decision targets."""

    def __init__(
        self,
        records: List[Dict[str, Any]],
        tokenizer: Any = None,
        max_seq_length: int = 2048,
        ignore_index: int = -100,
    ) -> None:
        self.records = records
        self.tokenizer = tokenizer
        self.max_seq_length = max_seq_length
        self.ignore_index = ignore_index

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        item = self.records[idx]
        task_intent = item.get("task_intent", item.get("intent", "Refactor UI layout"))
        scene_graph = item.get("scene_graph", None)
        participating_personas = item.get("participating_personas", [])
        constraints = item.get("constraints", None)
        target_decision = item.get("decision", item.get("target_decision", None))

        formatted = UXChatTemplateFormatter.format_conversation(
            task_intent=task_intent,
            scene_graph=scene_graph,
            participating_personas=participating_personas,
            constraints=constraints,
            target_decision=target_decision,
        )

        prompt_text = formatted["prompt"]
        completion_text = formatted["completion"]

        # Simple character-level token representation fallback if tokenizer is None
        if self.tokenizer is not None:
            prompt_tokens = self.tokenizer.encode(prompt_text, add_special_tokens=False)
            completion_tokens = self.tokenizer.encode(
                completion_text + "<|end|>", add_special_tokens=False
            )
        else:
            prompt_tokens = [ord(c) % 256 for c in prompt_text]
            completion_tokens = [ord(c) % 256 for c in completion_text]

        input_ids = prompt_tokens + completion_tokens
        # Truncate prompt and completion if sequence length exceeds maximum budget
        if len(input_ids) > self.max_seq_length:
            max_prompt = max(16, self.max_seq_length // 4)
            max_completion = self.max_seq_length - max_prompt
            prompt_tokens = prompt_tokens[-max_prompt:]
            completion_tokens = completion_tokens[:max_completion]
            input_ids = prompt_tokens + completion_tokens

        # Mask prompt tokens with ignore_index for completion-only cross entropy
        labels = [self.ignore_index] * len(prompt_tokens) + completion_tokens
        attention_mask = [1] * len(input_ids)

        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
            "prompt_text": prompt_text,
            "completion_text": completion_text,
            "target_decision": target_decision,
        }


def collate_sft_batch(
    batch: List[Dict[str, Any]], pad_token_id: int = 0, ignore_index: int = -100
) -> Dict[str, Any]:
    """Pad variable-length sequences into uniform tensor batches."""
    max_len = max(len(item["input_ids"]) for item in batch)

    batch_input_ids = []
    batch_attention_mask = []
    batch_labels = []
    batch_prompts = []
    batch_completions = []
    batch_decisions = []

    for item in batch:
        seq_len = len(item["input_ids"])
        pad_len = max_len - seq_len

        input_ids = torch.cat(
            [
                item["input_ids"],
                torch.full((pad_len,), pad_token_id, dtype=torch.long),
            ]
        )
        attention_mask = torch.cat(
            [item["attention_mask"], torch.zeros(pad_len, dtype=torch.long)]
        )
        labels = torch.cat(
            [item["labels"], torch.full((pad_len,), ignore_index, dtype=torch.long)]
        )

        batch_input_ids.append(input_ids)
        batch_attention_mask.append(attention_mask)
        batch_labels.append(labels)
        batch_prompts.append(item["prompt_text"])
        batch_completions.append(item["completion_text"])
        batch_decisions.append(item["target_decision"])

    return {
        "input_ids": torch.stack(batch_input_ids),
        "attention_mask": torch.stack(batch_attention_mask),
        "labels": torch.stack(batch_labels),
        "prompt_texts": batch_prompts,
        "completion_texts": batch_completions,
        "target_decisions": batch_decisions,
    }


class SFTTrainer:
    """Supervised Fine-Tuning Orchestrator with schema conformance verification."""

    def __init__(
        self,
        model: Optional[nn.Module] = None,
        config: Optional[SFTConfig] = None,
        schema_path: Optional[str] = None,
    ) -> None:
        self.config = config or SFTConfig()
        self.model = model
        self.device = torch.device(self.config.device)
        if self.model is not None:
            self.model.to(self.device)

        # Load schema for validation
        self.schema = None
        if schema_path:
            p = Path(schema_path)
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    self.schema = json.load(f)
        if self.schema is None:
            default_schema_path = (
                Path(__file__).resolve().parents[4]
                / "schemas"
                / "ux-decision-contract.schema.json"
            )
            if default_schema_path.exists():
                with open(default_schema_path, "r", encoding="utf-8") as f:
                    self.schema = json.load(f)

    def compute_loss(
        self, logits: torch.Tensor, labels: torch.Tensor
    ) -> torch.Tensor:
        """
        Compute token cross-entropy loss over completion tokens only.
        Guards against zero-unmasked batches to prevent NaN returns.
        
        Args:
            logits: [batch, seq_len, vocab_size]
            labels: [batch, seq_len] with prompt tokens masked to -100
        """
        shift_logits = logits[..., :-1, :].contiguous()
        shift_labels = labels[..., 1:].contiguous()

        # Guard against zero unmasked tokens returning NaN
        unmasked_tokens = (shift_labels != self.config.ignore_index).sum()
        if unmasked_tokens == 0:
            return (shift_logits * 0.0).sum()

        loss = F.cross_entropy(
            shift_logits.view(-1, shift_logits.size(-1)),
            shift_labels.view(-1),
            ignore_index=self.config.ignore_index,
        )
        return loss

    def validate_schema(self, decision_obj: Any) -> Tuple[bool, List[str]]:
        """Validate a generated decision dictionary against the UX Decision Contract Schema."""
        if not self.schema:
            return True, []

        errors = []
        try:
            validator = jsonschema.Draft202012Validator(self.schema)
            for err in validator.iter_errors(decision_obj):
                errors.append(f"{err.json_path}: {err.message}")
        except Exception as e:
            errors.append(f"Validation exception: {str(e)}")

        return (len(errors) == 0, errors)

    def evaluate_schema_conformance(
        self, generated_decisions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluate schema conformance across a cohort of decision outputs.
        Asserts that conformance >= target (default 98.0%).
        """
        if not generated_decisions:
            return {
                "total": 0,
                "conforming": 0,
                "conformance_rate": 0.0,
                "passed": False,
                "errors": ["Empty decision list"],
            }

        conforming = 0
        error_log = []
        for i, decision in enumerate(generated_decisions):
            valid, errs = self.validate_schema(decision)
            if valid:
                conforming += 1
            else:
                error_log.append(f"Sample {i}: {', '.join(errs[:2])}")

        conformance_rate = conforming / len(generated_decisions)
        passed = conformance_rate >= self.config.schema_conformance_target

        return {
            "total": len(generated_decisions),
            "conforming": conforming,
            "conformance_rate": conformance_rate,
            "target": self.config.schema_conformance_target,
            "passed": passed,
            "error_sample": error_log[:5],
        }

    def train_step(
        self, batch: Dict[str, Any], optimizer: torch.optim.Optimizer
    ) -> float:
        """Execute a single forward-backward optimization step."""
        if self.model is None:
            raise RuntimeError("Model must be provided to execute training step.")

        self.model.train()
        optimizer.zero_grad()

        input_ids = batch["input_ids"].to(self.device)
        attention_mask = batch["attention_mask"].to(self.device)
        labels = batch["labels"].to(self.device)

        outputs = self.model(input_ids, attention_mask=attention_mask)
        logits = outputs.logits if hasattr(outputs, "logits") else outputs
        loss = self.compute_loss(logits, labels)

        loss.backward()
        if self.config.max_grad_norm > 0:
            torch.nn.utils.clip_grad_norm_(
                self.model.parameters(), self.config.max_grad_norm
            )
        optimizer.step()

        return float(loss.detach().item())

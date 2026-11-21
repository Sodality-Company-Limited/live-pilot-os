"""
JEPA Trajectory Dataset Loader.
Converts contrastive RLCD JSONL files into deterministic PyTorch tensor batches
representing state context vectors s_t, chosen actions y_w, and rejected actions y_l.
"""
import json
import hashlib
import torch
from torch.utils.data import Dataset

def text_to_embedding(text: str, dim: int = 128) -> torch.Tensor:
    """
    Deterministic pseudo-embedding generator using SHA-256 seed projection
    to ensure 100% reproducible tensor generation with zero random initialization drift.
    """
    if not text:
        return torch.zeros(dim, dtype=torch.float32)

    hasher = hashlib.sha256()
    hasher.update(text.encode('utf-8'))
    seed = int.from_bytes(hasher.digest()[:4], 'big')

    generator = torch.Generator().manual_seed(seed)
    return torch.randn(dim, generator=generator, dtype=torch.float32)

class JepaTrajectoryDataset(Dataset):
    def __init__(self, jsonl_path: str, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.records = []

        with open(jsonl_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    self.records.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int):
        rec = self.records[idx]
        prompt = rec.get("prompt", "")
        chosen_action = rec.get("chosen", {}).get("action", "")
        rejected_action = rec.get("rejected", {}).get("action", "")

        state_tensor = text_to_embedding(prompt, self.embedding_dim)
        chosen_tensor = text_to_embedding(chosen_action, self.embedding_dim)
        rejected_tensor = text_to_embedding(rejected_action, self.embedding_dim)

        return {
            "state": state_tensor,
            "chosen_action": chosen_tensor,
            "rejected_action": rejected_tensor,
            "reward_chosen": float(rec.get("chosen", {}).get("reward", 0.0)),
            "reward_rejected": float(rec.get("rejected", {}).get("reward", 0.0)),
        }

"""
Sequential Time-Series Trajectory Tokenizer and ODE State Formatter.
Extracts continuous observation streams from multi-turn CLI agent trajectories.
"""
import json
import hashlib
import torch
from torch.utils.data import Dataset

def text_to_continuous_vector(text: str, dim: int = 64) -> torch.Tensor:
    if not text:
        return torch.zeros(dim, dtype=torch.float32)

    hasher = hashlib.sha256()
    hasher.update(text.encode('utf-8'))
    seed = int.from_bytes(hasher.digest()[:4], 'big')
    generator = torch.Generator().manual_seed(seed)
    return torch.randn(dim, generator=generator, dtype=torch.float32)

class LiquidTrajectorySequenceDataset(Dataset):
    """
    Dataset representing sequential turns of CLI agent interactions:
    times t_i in [0, T], continuous inputs I(t_i), and target state trajectories y(t_i).
    """
    def __init__(self, jsonl_path: str, state_dim: int = 64, seq_len: int = 4):
        self.state_dim = state_dim
        self.seq_len = seq_len
        self.samples = []

        with open(jsonl_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                self.samples.append(rec)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        rec = self.samples[idx]
        prompt = rec.get("prompt", "")
        chosen_action = rec.get("chosen", {}).get("action", "")

        # Synthesize sequential temporal observations over seq_len steps
        inputs = []
        targets = []
        timestamps = []

        for step in range(self.seq_len):
            t = float(step) * 0.1
            timestamps.append(t)
            # Time-dependent input stream
            step_text = f"{prompt}_turn_{step}"
            in_vec = text_to_continuous_vector(step_text, self.state_dim)
            # Target dynamic coordinate
            out_vec = text_to_continuous_vector(f"{chosen_action}_resp_{step}", self.state_dim)

            inputs.append(in_vec)
            targets.append(out_vec)

        return {
            "timestamps": torch.tensor(timestamps, dtype=torch.float32),
            "inputs": torch.stack(inputs, dim=0),      # (seq_len, state_dim)
            "targets": torch.stack(targets, dim=0),    # (seq_len, state_dim)
        }

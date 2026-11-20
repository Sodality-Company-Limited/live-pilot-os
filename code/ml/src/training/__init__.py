"""Soda OS ML Training package."""

from .losses import (
    LanguagePreservationLoss,
    LanguagePreservationOutput,
    CalibratedRewardLoss,
    CalibratedRewardOutput,
)
from .train_pipeline import (
    Trainer,
    TrainerConfig,
    TrainingStepOutput,
    CalibratedDataset,
    create_peft_dual_head_model,
)
from .defer_policy import (
    ActionPolicy,
    CostMatrix,
    PolicyThresholds,
    DecisionInstance,
    DecisionRouter,
    DeferPolicyOptimizer,
)

from .sft_trainer import (
    SFTConfig,
    UXSceneGraphFormatter,
    UXChatTemplateFormatter,
    UXDecisionDataset,
    collate_sft_batch,
    SFTTrainer,
)

from .dpo_trainer import (
    DPOTrainerConfig,
    DPOLoss,
    PreferenceDataset,
    collate_preference_batch,
    DPOTrainer,
)
from .carl_loss import (
    CARLConfig,
    CARLLossOutput,
    CARLLoss,
)
from .lora_merger import (
    LoRAConfig,
    LoRAAdapter,
    linear_merge,
    ties_merge,
    dare_merge,
    PersonaLoRAManager,
    CANONICAL_PERSONAS,
)
from .provenance_tracker import (
    ProvenanceTracker,
    compute_file_sha256,
    compute_buffer_sha256,
    sign_payload_hmac,
    verify_payload_hmac,
)

__all__ = [
    "LanguagePreservationLoss",
    "LanguagePreservationOutput",
    "CalibratedRewardLoss",
    "CalibratedRewardOutput",
    "Trainer",
    "TrainerConfig",
    "TrainingStepOutput",
    "CalibratedDataset",
    "create_peft_dual_head_model",
    "ActionPolicy",
    "CostMatrix",
    "PolicyThresholds",
    "DecisionInstance",
    "DecisionRouter",
    "DeferPolicyOptimizer",
    "SFTConfig",
    "UXSceneGraphFormatter",
    "UXChatTemplateFormatter",
    "UXDecisionDataset",
    "collate_sft_batch",
    "SFTTrainer",
    "DPOTrainerConfig",
    "DPOLoss",
    "PreferenceDataset",
    "collate_preference_batch",
    "DPOTrainer",
    "CARLConfig",
    "CARLLossOutput",
    "CARLLoss",
    "LoRAConfig",
    "LoRAAdapter",
    "linear_merge",
    "ties_merge",
    "dare_merge",
    "PersonaLoRAManager",
    "CANONICAL_PERSONAS",
    "ProvenanceTracker",
    "compute_file_sha256",
    "compute_buffer_sha256",
    "sign_payload_hmac",
    "verify_payload_hmac",
]

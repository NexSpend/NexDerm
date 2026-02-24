from __future__ import annotations
import pathlib
from typing import Any, Dict, List, Optional
import torch
from PIL import Image
from torch import nn
from torchvision import models, transforms

# Checkpoint helpers
def load_checkpoint(path: str | pathlib.Path, device: torch.device) -> Dict[str, Any]:
    p = pathlib.Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Checkpoint file not found at {p}")
    ckpt = torch.load(p, map_location=device)

    # some of our saved files are dicts, some are direct state_dict
    if not isinstance(ckpt, dict):
        raise ValueError(f"Checkpoint at {p} is not a dict.")
    return ckpt



# State dict extraction
def get_state_dict(ckpt: Dict[str, Any]) -> Dict[str, torch.Tensor]:
    """
    Supports:
      - {"model_state": ...}
      - plain state_dict checkpoint
    """
    if "model_state" in ckpt and isinstance(ckpt["model_state"], dict):
        return ckpt["model_state"]
    # TODO: support "state_dict" key if needed later
    return ckpt  # assume it's already a state_dict

# Class mapping helper (Student C) - kept minimal on purpose
def build_idx_to_class(class_to_idx: Dict[str, int]) -> List[str]:
    # NOTE: assumes indices are 0..N-1 in correct order
    items = sorted(class_to_idx.items(), key=lambda kv: kv[1])
    return [k for k, _ in items]



# DenseNet Wrapper
class DenseNetDiseaseClassifier:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model: Optional[nn.Module] = None
        self.transform = None
        self.idx_to_class: Optional[List[str]] = None

    def load_from_checkpoint(self, checkpoint_path: str | pathlib.Path) -> None:
        ckpt = load_checkpoint(checkpoint_path, self.device)
        class_to_idx = ckpt.get("class_to_idx", {})
        if not class_to_idx:
            raise ValueError("DenseNet checkpoint missing class_to_idx")

        self.idx_to_class = build_idx_to_class(class_to_idx)
        num_classes = len(self.idx_to_class)

        # Transform (we used these in training; defaults are ImageNet)
        mean = ckpt.get("norm_mean", [0.485, 0.456, 0.406])
        std = ckpt.get("norm_std", [0.229, 0.224, 0.225])

        self.transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )

        try:
            self.model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
        except AttributeError:
            self.model = models.densenet121(pretrained=True)

        self.model.classifier = nn.Linear(self.model.classifier.in_features, num_classes)
        self.model.load_state_dict(get_state_dict(ckpt))
        self.model.to(self.device)
        self.model.eval()

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        if self.transform is None:
            raise RuntimeError("Transform not initialized. Call load_from_checkpoint first.")
        if image.mode != "RGB":
            image = image.convert("RGB")
        x = self.transform(image).unsqueeze(0)
        return x.to(self.device)

    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if self.model is None:
            raise RuntimeError("DenseNet model not loaded.")
        with torch.no_grad():
            return self.model(x)



# ResNet Wrapper
class ResNetDiseaseClassifier:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model: Optional[nn.Module] = None
        self.idx_to_class: Optional[List[str]] = None

        # NOTE: No transform stored here originally because we reused DenseNet preprocessing
        # TODO: If accuracy is bad, add a separate transform for ResNet

    def load_from_checkpoint(
        self,
        checkpoint_path: str | pathlib.Path,
        fallback_idx_to_class: Optional[List[str]] = None,
    ) -> None:
        ckpt = load_checkpoint(checkpoint_path, self.device)

        class_to_idx = ckpt.get("class_to_idx", {})
        if class_to_idx:
            self.idx_to_class = build_idx_to_class(class_to_idx)
            num_classes = len(self.idx_to_class)
        elif fallback_idx_to_class:
            self.idx_to_class = fallback_idx_to_class
            num_classes = len(fallback_idx_to_class)
        else:
            raise ValueError("ResNet checkpoint missing class_to_idx and no fallback provided.")

        try:
            self.model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        except AttributeError:
            self.model = models.resnet50(pretrained=True)

        self.model.fc = nn.Linear(self.model.fc.in_features, num_classes)
        self.model.load_state_dict(get_state_dict(ckpt))
        self.model.to(self.device)
        self.model.eval()

    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if self.model is None:
            raise RuntimeError("ResNet model not loaded.")
        with torch.no_grad():
            return self.model(x)



# Ensemble (combined)
class EnsembleDiseaseClassifier:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )

        # default weights (we tuned this quickly during experimentation)
        self.w_dense = float(config.get("w_dense", 0.0))
        self.w_resnet = float(config.get("w_resnet", 1.0))

        self.densenet = DenseNetDiseaseClassifier(config=config)
        self.resnet = ResNetDiseaseClassifier(config=config)
        self.idx_to_class: Optional[List[str]] = None

    def load_from_checkpoints(
        self,
        densenet_path: str | pathlib.Path,
        resnet_path: str | pathlib.Path,
    ) -> None:
        self.densenet.load_from_checkpoint(densenet_path)
        self.idx_to_class = self.densenet.idx_to_class

        self.resnet.load_from_checkpoint(
            resnet_path,
            fallback_idx_to_class=self.idx_to_class,
        )

        # sanity check
        if self.resnet.idx_to_class != self.idx_to_class:
            raise ValueError("DenseNet and ResNet class order mismatch.")

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        if self.idx_to_class is None:
            raise RuntimeError("Ensemble not loaded. Call load_from_checkpoints().")

        # We currently use DenseNet preprocessing for both models.
        # TODO: separate transforms if ResNet training used different normalization
        x = self.densenet.preprocess_image(image)

        dense_logits = self.densenet.predict_logits(x)
        resnet_logits = self.resnet.predict_logits(x)

        ens_logits = self.w_dense * dense_logits + self.w_resnet * resnet_logits

        dense_probs = torch.softmax(dense_logits, dim=1)
        resnet_probs = torch.softmax(resnet_logits, dim=1)
        ens_probs = torch.softmax(ens_logits, dim=1)

        dense_conf, dense_idx = torch.max(dense_probs, dim=1)
        res_conf, res_idx = torch.max(resnet_probs, dim=1)
        ens_conf, ens_idx = torch.max(ens_probs, dim=1)

        return {
            "prediction": self.idx_to_class[ens_idx.item()],
            "confidence": float(ens_conf.item()),
            "model_outputs": {
                "densenet": {
                    "prediction": self.idx_to_class[dense_idx.item()],
                    "confidence": float(dense_conf.item()),
                },
                "resnet": {
                    "prediction": self.idx_to_class[res_idx.item()],
                    "confidence": float(res_conf.item()),
                },
            },
        }

from __future__ import annotations
import pathlib
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Sequence
import torch
from PIL import Image
from torch import nn
from torchvision import models, transforms

# --- NEW IMPORTS FOR CLIP FILTER ---
from transformers import CLIPProcessor, CLIPModel

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
        self.models: List[nn.Module] = []
        self.model_names: List[str] = []
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
            model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
        except AttributeError:
            model = models.densenet121(pretrained=True)

        model.classifier = nn.Linear(model.classifier.in_features, num_classes)
        model.load_state_dict(get_state_dict(ckpt))
        model.to(self.device)
        model.eval()
        self.models.append(model)
        self.model_names.append(pathlib.Path(checkpoint_path).name)

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        if self.transform is None:
            raise RuntimeError("Transform not initialized. Call load_from_checkpoint first.")
        if image.mode != "RGB":
            image = image.convert("RGB")
        x = self.transform(image).unsqueeze(0)
        return x.to(self.device)

    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if not self.models:
            raise RuntimeError("DenseNet model not loaded.")
        with torch.no_grad():
            return torch.stack([model(x) for model in self.models], dim=0)


# ResNet Wrapper
class ResNetDiseaseClassifier:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.models: List[nn.Module] = []
        self.model_names: List[str] = []
        self.idx_to_class: Optional[List[str]] = None

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
            model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        except AttributeError:
            model = models.resnet50(pretrained=True)

        model.fc = nn.Linear(model.fc.in_features, num_classes)
        model.load_state_dict(get_state_dict(ckpt))
        model.to(self.device)
        model.eval()
        self.models.append(model)
        self.model_names.append(pathlib.Path(checkpoint_path).name)

    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if not self.models:
            raise RuntimeError("ResNet model not loaded.")
        with torch.no_grad():
            return torch.stack([model(x) for model in self.models], dim=0)

# Ensemble (combined)
class EnsembleDiseaseClassifier:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.densenet = DenseNetDiseaseClassifier(config=config)
        self.resnet = ResNetDiseaseClassifier(config=config)
        self.idx_to_class: Optional[List[str]] = None

    def load_from_checkpoints(
        self,
        densenet_path: str | pathlib.Path | Sequence[str | pathlib.Path],
        resnet_path: str | pathlib.Path | Sequence[str | pathlib.Path],
    ) -> None:
        densenet_paths = (
            [pathlib.Path(densenet_path)]
            if isinstance(densenet_path, (str, pathlib.Path))
            else [pathlib.Path(path) for path in densenet_path]
        )
        resnet_paths = (
            [pathlib.Path(resnet_path)]
            if isinstance(resnet_path, (str, pathlib.Path))
            else [pathlib.Path(path) for path in resnet_path]
        )

        dense_idx_to_class: Optional[List[str]] = None
        for path in densenet_paths:
            self.densenet.load_from_checkpoint(path)
            if dense_idx_to_class is None:
                dense_idx_to_class = self.densenet.idx_to_class
            elif self.densenet.idx_to_class != dense_idx_to_class:
                raise ValueError("DenseNet checkpoints have inconsistent class order.")
        self.idx_to_class = dense_idx_to_class

        for path in resnet_paths:
            self.resnet.load_from_checkpoint(
                path,
                fallback_idx_to_class=self.idx_to_class,
            )
            if self.resnet.idx_to_class != self.idx_to_class:
                raise ValueError("ResNet checkpoints have inconsistent class order.")

        # sanity check
        if self.resnet.idx_to_class != self.idx_to_class:
            raise ValueError("DenseNet and ResNet class order mismatch.")

        if not self.densenet.models or not self.resnet.models:
            raise ValueError("Both DenseNet and ResNet ensembles must load at least one checkpoint.")

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        if self.idx_to_class is None:
            raise RuntimeError("Ensemble not loaded. Call load_from_checkpoints().")

        x = self.densenet.preprocess_image(image)

        dense_logits = self.densenet.predict_logits(x)
        resnet_logits = self.resnet.predict_logits(x)

        dense_probs = torch.softmax(dense_logits, dim=2)
        resnet_probs = torch.softmax(resnet_logits, dim=2)

        dense_conf, dense_idx = torch.max(dense_probs, dim=2)
        res_conf, res_idx = torch.max(resnet_probs, dim=2)

        vote_counts: Counter[int] = Counter()
        confidence_sums: defaultdict[int, float] = defaultdict(float)

        dense_vote_weights = [2 if i < 3 else 1 for i in range(len(self.densenet.models))]
        resnet_vote_weights = [1 for _ in range(len(self.resnet.models))]

        for dense_weight, idx_tensor, conf_tensor in zip(dense_vote_weights, dense_idx, dense_conf):
            pred_idx = int(idx_tensor.item())
            vote_counts[pred_idx] += dense_weight
            confidence_sums[pred_idx] += float(conf_tensor.item())

        for resnet_weight, idx_tensor, conf_tensor in zip(resnet_vote_weights, res_idx, res_conf):
            pred_idx = int(idx_tensor.item())
            vote_counts[pred_idx] += resnet_weight
            confidence_sums[pred_idx] += float(conf_tensor.item())

        ens_idx = max(
            vote_counts,
            key=lambda idx: (vote_counts[idx], confidence_sums[idx], -idx),
        )
        total_votes = sum(vote_counts.values())
        ens_conf = confidence_sums[ens_idx] / total_votes if total_votes else 0.0

        dense_vote_idx, dense_vote_count = Counter(int(idx.item()) for idx in dense_idx).most_common(1)[0]
        res_vote_idx, res_vote_count = Counter(int(idx.item()) for idx in res_idx).most_common(1)[0]

        print("\n=== Ensemble Prediction ===")
        for model_name, idx_tensor, conf_tensor in zip(
            self.densenet.model_names, dense_idx, dense_conf
        ):
            pred_idx = int(idx_tensor.item())
            print(
                f"[DenseNet] {model_name}: "
                f"{self.idx_to_class[pred_idx]} ({float(conf_tensor.item()):.4f}, vote_weight={dense_vote_weights[self.densenet.model_names.index(model_name)]})"
            )

        for model_name, idx_tensor, conf_tensor in zip(
            self.resnet.model_names, res_idx, res_conf
        ):
            pred_idx = int(idx_tensor.item())
            print(
                f"[ResNet] {model_name}: "
                f"{self.idx_to_class[pred_idx]} ({float(conf_tensor.item()):.4f}, vote_weight={resnet_vote_weights[self.resnet.model_names.index(model_name)]})"
            )

        print("Vote totals:")
        for class_name, count in sorted(
            ((self.idx_to_class[idx], count) for idx, count in vote_counts.items()),
            key=lambda item: (-item[1], item[0]),
        ):
            print(f"  {class_name}: {count}")

        print(
            f"Final prediction: {self.idx_to_class[ens_idx]} "
            f"(confidence={float(ens_conf):.4f})"
        )

        return {
            "prediction": self.idx_to_class[ens_idx],
            "confidence": float(ens_conf),
            "votes": dict(sorted((self.idx_to_class[idx], count) for idx, count in vote_counts.items())),
            "model_outputs": {
                "densenet": {
                    "prediction": self.idx_to_class[dense_vote_idx],
                    "confidence": float(dense_conf.mean().item()),
                    "votes": int(dense_vote_count),
                    "models_used": len(self.densenet.models),
                },
                "resnet": {
                    "prediction": self.idx_to_class[res_vote_idx],
                    "confidence": float(res_conf.mean().item()),
                    "votes": int(res_vote_count),
                    "models_used": len(self.resnet.models),
                },
            },
        }


# --- NEW: SKIN FILTER WRAPPER ---
class SkinFilterWrapper:
    def __init__(self, disease_ensemble: EnsembleDiseaseClassifier, threshold: float = 0.7):
        """
        Wraps the existing ensemble with a CLIP-based Out-of-Distribution filter.
        """
        self.disease_ensemble = disease_ensemble
        self.threshold = threshold
        self.device = disease_ensemble.device
        
        print("Loading CLIP model for skin verification...")
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_model.eval()
        
        # Zero-shot categories
        self.labels = [
            "a close-up photo of human skin or a skin lesion", 
            "a photo of an everyday object, furniture, or background"
        ]

    def smart_predict(self, image: Image.Image) -> Dict[str, Any]:
        """
        Checks if the image is skin first. If it is, proceeds to the disease ensemble.
        If not, aborts and returns an error message.
        """
        if image.mode != "RGB":
            image = image.convert("RGB")

        # 1. Prepare inputs for CLIP
        inputs = self.clip_processor(
            text=self.labels, 
            images=image, 
            return_tensors="pt", 
            padding=True
        )
        
        # Move inputs to the correct device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 2. Run CLIP inference
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
            
        # Probability of the first label ("human skin")
        skin_prob = probs[0][0].item()

        # 3. Filter logic
        if skin_prob < self.threshold:
            return {
                "is_skin": False,
                "prediction": "Unknown Object / Not Skin",
                "confidence": float(1.0 - skin_prob),
                "message": "Please provide a clear, close-up image of the affected skin area."
            }

        # 4. If it passes the filter, run the actual medical ensemble
        ensemble_result = self.disease_ensemble.predict(image)
        ensemble_result["is_skin"] = True
        return ensemble_result

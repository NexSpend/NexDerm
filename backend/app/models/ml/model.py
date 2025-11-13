from __future__ import annotations
import pathlib
from typing import Tuple, List, Dict, Any

import torch
from torch import nn, optim
from torchvision import models, datasets, transforms
from torch.utils.data import DataLoader
from PIL import Image

class DenseNetDiseaseClassifier:
    """
    Classifier for skin disease detection using a trained DenseNet121 model.
    This class is designed for inference.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device(config.get("device", "cuda" if torch.cuda.is_available() else "cpu"))
        self.model: nn.Module | None = None
        self.transform: transforms.Compose | None = None
        self.idx_to_class: List[str] | None = None

    def load_from_checkpoint(self, checkpoint_path: str | pathlib.Path):
        """
        Loads the model, weights, and preprocessing info from a checkpoint file.
        """
        if not pathlib.Path(checkpoint_path).exists():
            raise FileNotFoundError(f"Checkpoint file not found at {checkpoint_path}")

        # Load checkpoint and extract metadata
        ckpt = torch.load(checkpoint_path, map_location=self.device)
        class_to_idx = ckpt.get("class_to_idx", {})
        num_classes = len(class_to_idx)
        
        # Invert mapping to create idx -> class name
        self.idx_to_class = [k for k, v in sorted(class_to_idx.items(), key=lambda item: item[1])]

        # Define the image transformation based on saved normalization values
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=ckpt.get("norm_mean", [0.485, 0.456, 0.406]),
                std=ckpt.get("norm_std", [0.229, 0.224, 0.225])
            )
        ])

        # Build model architecture
        try:
            # Use the modern weights API if available
            weights = models.DenseNet121_Weights.IMAGENET1K_V1
            self.model = models.densenet121(weights=weights)
        except AttributeError:
            # Fallback for older torchvision versions
            self.model = models.densenet121(pretrained=True)

        # Replace the classifier head with the correct number of output classes
        self.model.classifier = nn.Linear(self.model.classifier.in_features, num_classes)
        
        # Load the trained weights
        self.model.load_state_dict(ckpt["model_state"])
        self.model.to(self.device)
        self.model.eval()
        
        print(f"✓ Model loaded from {checkpoint_path} on device: {self.device}")

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Preprocesses a PIL image to a model-ready tensor."""
        if self.transform is None:
            raise RuntimeError("Transformation not initialized. Load model first.")
        if image.mode != "RGB":
            image = image.convert("RGB")
        return self.transform(image).unsqueeze(0).to(self.device)

    def predict(self, image: Image.Image) -> Tuple[str, float]:
        """Predicts the class and confidence for a single PIL image."""
        if self.model is None or self.idx_to_class is None:
            raise RuntimeError("Model not loaded. Call load_from_checkpoint() first.")

        with torch.no_grad():
            image_tensor = self.preprocess_image(image)
            logits = self.model(image_tensor)
            probabilities = torch.softmax(logits, dim=1)
            confidence, pred_idx = torch.max(probabilities, dim=1)
        
        label = self.idx_to_class[pred_idx.item()]
        return label, confidence.item()
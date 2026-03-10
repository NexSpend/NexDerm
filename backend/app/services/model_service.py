import io
import pathlib
from typing import Any, Dict, Optional

import torch
from PIL import Image

from app.core.config import settings
from app.models.ml.model import EnsembleDiseaseClassifier


class ModelService:
    """
    Singleton-style service to load the ML models once and reuse them
    so the API does not reload checkpoints on every request.
    """

    _instance = None
    classifier: Optional[EnsembleDiseaseClassifier] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.classifier = cls._load_model()
        return cls._instance

    @staticmethod
    def _load_model() -> EnsembleDiseaseClassifier:
        config = {
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "w_dense": float(settings.ENSEMBLE_WEIGHT_DENSENET),
            "w_resnet": float(settings.ENSEMBLE_WEIGHT_RESNET),
        }

        classifier = EnsembleDiseaseClassifier(config=config)
        classifier.load_from_checkpoints(
            pathlib.Path(settings.MODEL_PATH_DENSENET),
            pathlib.Path(settings.MODEL_PATH_RESNET),
        )

        return classifier

    def predict_from_image_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        image = Image.open(io.BytesIO(image_bytes))

        if self.classifier is None:
            raise RuntimeError("Model is not loaded.")

        return self.classifier.predict(image)


# Global instance reused across API routes
model_service = ModelService()

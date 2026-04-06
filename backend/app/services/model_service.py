import io
import pathlib
from typing import Any, Dict, Optional

import torch
from PIL import Image

from app.core.config import settings
from app.models.ml.model import EnsembleDiseaseClassifier, SkinFilterWrapper


class ModelService:
    """
    Singleton-style service to load the ML models once and reuse them
    so the API does not reload checkpoints on every request.
    """

    _instance = None
    classifier_pipeline: Optional[SkinFilterWrapper] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.classifier_pipeline = cls._load_model_pipeline()
        return cls._instance

    @staticmethod
    def _load_model_pipeline() -> SkinFilterWrapper:
        print("Initializing the ML Pipeline (Ensemble + CLIP Filter)...")
        artifacts_dir = pathlib.Path("app/models/ml/artifacts")
        config = {
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "w_dense": float(settings.ENSEMBLE_WEIGHT_DENSENET),
            "w_resnet": float(settings.ENSEMBLE_WEIGHT_RESNET),
        }

        
        ensemble = EnsembleDiseaseClassifier(config=config)
        ensemble.load_from_checkpoints(
            [
                artifacts_dir / "densenet121_skin_best1.pth",
                artifacts_dir / "densenet121_skin_best2.pth",
                artifacts_dir / "densenet121_skin_best3.pth",
                artifacts_dir / "densenet121_skin_best4.pth",
                artifacts_dir / "densenet121_skin_best5.pth",
            ],
            [
                artifacts_dir / "resnet50_skin_best1.pth",
                artifacts_dir / "resnet50_skin_best2.pth",
                artifacts_dir / "resnet50_skin_best3.pth",
                artifacts_dir / "resnet50_skin_best4.pth",
                artifacts_dir / "resnet50_skin_best5.pth",
            ],
        )

        
        
        threshold = getattr(settings, "SKIN_FILTER_THRESHOLD", 0.7)
        pipeline = SkinFilterWrapper(disease_ensemble=ensemble, threshold=threshold)

        return pipeline

    def smart_predict(self, image: Image.Image) -> Dict[str, Any]:
        """
        Takes a PIL Image, runs it through the CLIP filter, and if valid,
        passes it to the disease ensemble.
        """
        if self.classifier_pipeline is None:
            raise RuntimeError("Model pipeline is not loaded.")

        
        return self.classifier_pipeline.smart_predict(image)


model_service = ModelService()

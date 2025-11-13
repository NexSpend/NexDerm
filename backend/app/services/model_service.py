import io
import pathlib
from typing import Tuple

import torch
from PIL import Image

from app.core.config import settings
from app.models.ml.model import DenseNetDiseaseClassifier


class ModelService:
    """
    Singleton for holding the model and making predictions.
    """
    _instance = None
    classifier: DenseNetDiseaseClassifier = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelService, cls).__new__(cls)
            cls._instance.classifier = cls._load_model()
        return cls._instance

    @staticmethod
    def _load_model() -> DenseNetDiseaseClassifier:
        """Loads the model from the path specified in the settings."""
        model_path = pathlib.Path(settings.MODEL_PATH)
        
        # Basic config for the classifier
        config = {
            "device": "cuda" if torch.cuda.is_available() else "cpu",
        }
        
        classifier = DenseNetDiseaseClassifier(config=config)
        classifier.load_from_checkpoint(model_path)
        
        return classifier

    def predict_from_image_bytes(self, image_bytes: bytes) -> Tuple[str, float]:
        """
        Makes a prediction from image bytes.
        
        Args:
            image_bytes: The bytes of the image file.
            
        Returns:
            A tuple of (predicted_label, confidence_score).
        """
        image = Image.open(io.BytesIO(image_bytes))
        return self.classifier.predict(image)

# Create a single instance of the service that will be imported by other modules
model_service = ModelService()
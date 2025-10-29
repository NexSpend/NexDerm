"""Image classifier wrapper for vascular lesion detection.

This module provides `VascularLesionClassifier` — a small wrapper around
an EfficientNetV2-S backbone that loads a saved checkpoint and exposes a
`predict(image_path)` method for single-image inference. The script can
also be used interactively (run as __main__) to type or paste image paths
and receive predictions.

Notes for users:
- The default checkpoint path is './checkpoints/best_model.pth'. If you
    trained the model elsewhere update the `model_path` argument when
    constructing `VascularLesionClassifier`.
- The predict() method strips surrounding quotes from pasted paths so
    drag-and-drop paths from Windows Explorer (which include quotes) work.
"""

import sys
from pathlib import Path
import torch
import torch.nn as nn
from torchvision.models import efficientnet_v2_s
from torchvision.transforms import v2
from PIL import Image


class VascularLesionClassifier:
    """Classifier wrapper for EfficientNetV2-S model (2 classes).

    This class encapsulates model construction, weight loading, image
    preprocessing and single-image prediction. It expects a trained
    model checkpoint (state_dict) to be available at `model_path`.

    Notes:
    - model_path: default points to './checkpoints/best_model.pth'.
      This is where the saved weights are loaded from (see `load_model`).
    - device: either 'cpu' or 'cuda' (if available).
    """

    def __init__(self, model_path='./checkpoints/best_model.pth', device='cpu'):
        """Initialize: build model, load weights, and prepare transforms.

        Args:
            model_path (str or Path): path to the saved checkpoint (.pth).
            device (str): 'cpu' or 'cuda'.
        """
        # Resolve device and the model checkpoint path
        self.device = torch.device(device)
        # NOTE: This is the path used to load the trained model weights.
        # If you trained the model elsewhere, update this path accordingly.
        self.model_path = Path(model_path)

        # Human-readable class names that correspond to model outputs
        self.classes = ['Healthy', 'Vascular Lesions']

        # Build model architecture and load weights from checkpoint
        self.model = self._build_model()
        self.load_model()

        # Transforms must match what the training pipeline used.
        # Image size, normalization mean/std and dtype are important.
        self.transform = v2.Compose([
            # Resize to training resolution (height, width)
            v2.Resize((384, 384), antialias=True),
            # Convert PIL image to torchvision image tensor pipeline format
            v2.ToImage(),
            # Convert to float32 and scale pixels to [0, 1]
            v2.ToDtype(torch.float32, scale=True),
            # Normalize with ImageNet-like statistics used during training
            v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    
    def _build_model(self):
        """Build EfficientNetV2-S backbone and replace the classifier.

        We construct EfficientNetV2-S without pretrained weights here because
        the training pipeline uses its own initialization / training schedule.
        The final classifier head is replaced with a dropout + Linear for
        two classes.
        """
        model = efficientnet_v2_s(weights=None)
        in_features = model.classifier[1].in_features
        # Replace classifier with dropout + linear layer -> 2 outputs
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, 2)
        )
        return model.to(self.device)
    
    def load_model(self):
        """Load the trained model weights from `self.model_path`.

        Exits with an error message if the checkpoint file is not found.
        The checkpoint is expected to contain a 'model_state_dict' key.
        """
        # Ensure checkpoint exists
        if not self.model_path.exists():
            print(f"✗ Model not found at {self.model_path}")
            print("Make sure to train the model first using: python3 train.py")
            # Exit because without a checkpoint the classifier cannot work
            sys.exit(1)

        # Load the checkpoint (map to CPU/GPU depending on `self.device`)
        checkpoint = torch.load(self.model_path, map_location=self.device)
        # Expected key in checkpoint: 'model_state_dict'
        self.model.load_state_dict(checkpoint['model_state_dict'])
        # Set model to evaluation mode (disables dropout, etc.)
        self.model.eval()
    
    def predict(self, image_path):
        """
        Predict on a single image.
        
        Args:
            image_path: Path to the image
            
        Returns:
            Dictionary with prediction results
        """
        # Normalize the input string and remove surrounding quotes so users
        # can paste paths directly from Windows Explorer (which often include
        # surrounding double-quotes).
        image_path_str = str(image_path).strip()
        if (image_path_str.startswith('"') and image_path_str.endswith('"')) or \
           (image_path_str.startswith("'") and image_path_str.endswith("'")):
            image_path_str = image_path_str[1:-1]

        # Convert to Path for filesystem checks
        image_path = Path(image_path_str)

        # Validate path existence and provide a helpful error if missing
        if not image_path.exists():
            return {'error': f'Image not found: {image_path}. '
                             f'If you pasted the path, remove surrounding quotes or check the drive letter.'}

        try:
            # Load image and ensure RGB
            image = Image.open(image_path).convert('RGB')

            # Apply preprocessing transforms and add batch dimension
            # transform(...) returns a tensor shaped (C, H, W) so we unsqueeze
            # to create a batch of size 1: (1, C, H, W)
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Inference: no gradient computation
            with torch.no_grad():
                outputs = self.model(image_tensor)  # raw logits (1, num_classes)
                # Convert logits to probabilities
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                # confidence: max probability; predicted_idx: argmax (both tensors)
                confidence, predicted_idx = torch.max(probabilities, 1)

            # Map predicted index to human-readable class name
            predicted_class = self.classes[predicted_idx.item()]
            confidence_score = confidence.item()

            # Get both class probabilities as numpy array: [healthy, vascular]
            probs = probabilities[0].cpu().numpy()

            return {
                'image_path': str(image_path),
                'prediction': predicted_class,
                'confidence': confidence_score,
                'healthy_prob': float(probs[0]),
                'vascular_prob': float(probs[1]),
                'error': None
            }

        except Exception as e:
            return {'error': f'Error processing image: {str(e)}'}


def print_result(result):
    """Print prediction result."""
    if result['error']:
        print(f"Error: {result['error']}")
        return
    
    print(f"\nImage: {result['image_path']}")
    print(f"Prediction: {result['prediction']}")
    print(f"Confidence: {result['confidence']*100:.2f}%")
    print(f"Healthy: {result['healthy_prob']*100:.2f}%")
    print(f"Vascular Lesions: {result['vascular_prob']*100:.2f}%\n")


def main():
    """Interactive loop to classify images."""
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    classifier = VascularLesionClassifier(device=device)
    
    while True:
        try:
            path = input("Enter image path (or 'quit'): ").strip()
            if path.lower() in ('quit', 'exit', 'q'):
                break
            if not path:
                continue
            result = classifier.predict(path)
            print_result(result)
        except KeyboardInterrupt:
            break


if __name__ == "__main__":
    main()
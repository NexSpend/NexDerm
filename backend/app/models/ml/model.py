"""
EfficientNetV2 binary classifier for disease detection.
Includes local training/inference + SCP upload helpers for remote training.
"""

import pathlib
from typing import Optional, Tuple
import subprocess
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms


class EfficientNetV2DiseaseClassifier:
    """Binary classifier: disease or no disease using EfficientNetV2."""

    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.config.setdefault("model_variant", "efficientnetv2_s")
        self.config.setdefault("input_size", 384)
        self.config.setdefault("pretrained", True)
        self.config.setdefault("batch_size", 32)
        self.config.setdefault("epochs", 20)
        self.config.setdefault("learning_rate", 1e-4)
        self.config.setdefault("device", "cuda" if torch.cuda.is_available() else "cpu")
        
        self.model = None
        self.device = torch.device(self.config["device"])
        self.artifacts_dir = pathlib.Path(self.config.get("artifacts_dir", "artifacts"))
        self.artifacts_dir.mkdir(exist_ok=True)
        
        # Image preprocessing pipeline
        self.transform = transforms.Compose([
            transforms.Resize((self.config["input_size"], self.config["input_size"])),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                std=[0.229, 0.224, 0.225])
        ])

    def build_model(self):
        """Build EfficientNetV2 model for binary classification using timm."""
        try:
            import timm
        except ImportError:
            raise ImportError("timm is required. Install with: pip install timm")
        
        # Create model from pretrained weights
        self.model = timm.create_model(
            self.config["model_variant"],
            pretrained=self.config["pretrained"],
            num_classes=2  # Binary: disease or no disease
        )
        self.model = self.model.to(self.device)
        print(f"✓ Model '{self.config['model_variant']}' built on {self.device}")
        return self.model

    def preprocess_image(self, image_path: str) -> torch.Tensor:
        """
        Load and preprocess image to model input size.
        Args:
            image_path: Path to image file.
        Returns:
            Preprocessed image tensor ready for inference.
        """
        try:
            image = Image.open(image_path).convert("RGB")
            image_tensor = self.transform(image)
            image_tensor = image_tensor.unsqueeze(0)  # Add batch dimension
            return image_tensor.to(self.device)
        except Exception as e:
            raise ValueError(f"Failed to preprocess image {image_path}: {e}")

    def predict(self, image_path: str) -> Tuple[str, float]:
        """
        Predict disease presence in image.
        Args:
            image_path: Path to input image.
        Returns:
            (label, confidence) — label is "disease" or "no_disease", confidence in [0, 1].
        """
        if self.model is None:
            raise RuntimeError("Model not built. Call build_model() first.")
        
        self.model.eval()
        with torch.no_grad():
            image_tensor = self.preprocess_image(image_path)
            logits = self.model(image_tensor)
            probs = torch.softmax(logits, dim=1)
            confidence, pred_class = torch.max(probs, dim=1)
        
        label = "disease" if pred_class.item() == 1 else "no_disease"
        confidence_value = confidence.item()
        
        print(f"✓ Prediction: {label} (confidence: {confidence_value:.2%})")
        return label, confidence_value

    def fit(self, train_loader, val_loader=None, epochs: Optional[int] = None):
        """
        Train the model locally.
        Args:
            train_loader: PyTorch DataLoader yielding (images, labels).
            val_loader: Optional validation DataLoader.
            epochs: Override config epochs if provided.
        """
        if self.model is None:
            self.build_model()
        
        if epochs is None:
            epochs = self.config["epochs"]
        
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.config["learning_rate"])
        
        print(f"Starting training for {epochs} epochs...")
        for epoch in range(epochs):
            self.model.train()
            total_loss = 0.0
            for batch_idx, (images, labels) in enumerate(train_loader):
                images, labels = images.to(self.device), labels.to(self.device)
                
                optimizer.zero_grad()
                logits = self.model(images)
                loss = criterion(logits, labels)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
                if batch_idx % 10 == 0:
                    print(f"Epoch {epoch+1}/{epochs}, Batch {batch_idx}, Loss: {loss.item():.4f}")
            
            avg_loss = total_loss / len(train_loader)
            print(f"Epoch {epoch+1} - Avg Loss: {avg_loss:.4f}")
            
            # Validation step (if provided)
            if val_loader:
                self.model.eval()
                val_loss = 0.0
                correct = 0
                total = 0
                with torch.no_grad():
                    for images, labels in val_loader:
                        images, labels = images.to(self.device), labels.to(self.device)
                        logits = self.model(images)
                        loss = criterion(logits, labels)
                        val_loss += loss.item()
                        
                        _, predicted = torch.max(logits, 1)
                        total += labels.size(0)
                        correct += (predicted == labels).sum().item()
                
                val_accuracy = correct / total
                print(f"  Validation - Loss: {val_loss/len(val_loader):.4f}, Accuracy: {val_accuracy:.2%}")
        
        self.save_model(str(self.artifacts_dir / "model_final.pt"))
        print("✓ Training complete. Model saved.")

    def save_model(self, path: str):
        """Save trained model weights."""
        if self.model is None:
            raise RuntimeError("No model to save.")
        torch.save(self.model.state_dict(), path)
        print(f"✓ Model saved to {path}")

    def load_model(self, path: str):
        """Load pre-trained model weights."""
        if self.model is None:
            self.build_model()
        self.model.load_state_dict(torch.load(path, map_location=self.device))
        print(f"✓ Model loaded from {path}")

    # ============= SCP / Remote Training Helpers =============

    def upload_code_via_scp(
        self,
        remote_user: str,
        remote_host: str,
        remote_path: str,
        local_repo_path: str = "."
    ):
        """Upload codebase to remote server via SCP."""
        try:
            mkdir_cmd = f"ssh {remote_user}@{remote_host} mkdir -p {remote_path}"
            subprocess.run(mkdir_cmd, shell=True, check=True)
            
            scp_cmd = f"scp -r {local_repo_path}/* {remote_user}@{remote_host}:{remote_path}/"
            subprocess.run(scp_cmd, shell=True, check=True)
            print(f"✓ Code uploaded to {remote_user}@{remote_host}:{remote_path}")
        except subprocess.CalledProcessError as e:
            print(f"✗ SCP upload failed: {e}")
            raise

    def upload_data_via_scp(
        self,
        remote_user: str,
        remote_host: str,
        local_data_path: str,
        remote_data_path: str
    ):
        """Upload training dataset to remote server via SCP."""
        try:
            mkdir_cmd = f"ssh {remote_user}@{remote_host} mkdir -p {remote_data_path}"
            subprocess.run(mkdir_cmd, shell=True, check=True)
            
            scp_cmd = f"scp -r {local_data_path} {remote_user}@{remote_host}:{remote_data_path}/"
            subprocess.run(scp_cmd, shell=True, check=True)
            print(f"✓ Data uploaded to {remote_user}@{remote_host}:{remote_data_path}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Data upload failed: {e}")
            raise

    def submit_training_job(
        self,
        remote_user: str,
        remote_host: str,
        remote_repo_path: str,
        remote_data_path: str,
        job_name: str = "efficientnetv2_train"
    ):
        """Submit training job on remote server via SSH."""
        try:
            train_cmd = (
                f"cd {remote_repo_path} && "
                f"python -m backend.app.models.ml.train_remote "
                f"--data-path {remote_data_path} "
                f"--output-dir ./artifacts "
                f"--job-name {job_name}"
            )
            
            ssh_cmd = f"ssh {remote_user}@{remote_host} nohup {train_cmd} > training.log 2>&1 &"
            subprocess.run(ssh_cmd, shell=True, check=True)
            print(f"✓ Training job '{job_name}' submitted on {remote_host}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Job submission failed: {e}")
            raise

    def download_artifacts_via_scp(
        self,
        remote_user: str,
        remote_host: str,
        remote_artifacts_path: str,
        local_artifacts_path: str = "artifacts"
    ):
        """Download trained model and logs from remote server."""
        try:
            pathlib.Path(local_artifacts_path).mkdir(exist_ok=True)
            scp_cmd = f"scp -r {remote_user}@{remote_host}:{remote_artifacts_path}/* {local_artifacts_path}/"
            subprocess.run(scp_cmd, shell=True, check=True)
            print(f"✓ Artifacts downloaded to {local_artifacts_path}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Artifact download failed: {e}")
            raise

    def remote_training_flow(
        self,
        remote_user: str,
        remote_host: str,
        local_repo_path: str,
        local_data_path: str,
        remote_repo_path: str = "/home/ubuntu/nexderm",
        remote_data_path: str = "/home/ubuntu/nexderm_data"
    ):
        """High-level orchestration: upload code + data → submit job → download results."""
        print("=== Starting remote training flow ===")
        print("1. Uploading code...")
        self.upload_code_via_scp(remote_user, remote_host, remote_repo_path, local_repo_path)
        print("2. Uploading dataset...")
        self.upload_data_via_scp(remote_user, remote_host, local_data_path, remote_data_path)
        print("3. Submitting training job...")
        self.submit_training_job(remote_user, remote_host, remote_repo_path, remote_data_path)
        print("4. Job submitted. Monitor logs on server or wait for completion.")
        print(f"   SSH into {remote_host}: ssh {remote_user}@{remote_host}")
        print(f"   Check logs: tail -f {remote_repo_path}/training.log")
        print("5. After training completes, download artifacts:")
        self.download_artifacts_via_scp(
            remote_user, remote_host,
            f"{remote_repo_path}/artifacts",
            "./artifacts"
        )
        print("=== Remote training flow complete ===")
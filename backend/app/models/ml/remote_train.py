"""
Remote training script — runs on server.
Loads data, trains model, saves artifacts.
"""

import argparse
import pathlib
import torch
from torch.utils.data import DataLoader, TensorDataset
from model import EfficientNetV2DiseaseClassifier


def create_dummy_dataset(num_samples: int = 100, batch_size: int = 32):
    """
    Create dummy dataset for testing (replace with real data loader).
    In production: use ImageFolder, custom Dataset class, or data pipeline.
    """
    # Dummy tensors: (num_samples, 3, 384, 384) for images, (num_samples,) for labels
    X = torch.randn(num_samples, 3, 384, 384)
    y = torch.randint(0, 2, (num_samples,))  # Binary labels: 0 or 1
    
    dataset = TensorDataset(X, y)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    return loader


def main():
    parser = argparse.ArgumentParser(description="Train EfficientNetV2 on remote server")
    parser.add_argument("--data-path", type=str, required=True, help="Path to training data")
    parser.add_argument("--output-dir", type=str, default="./artifacts", help="Output directory for model")
    parser.add_argument("--job-name", type=str, default="train_job", help="Job name for logging")
    parser.add_argument("--epochs", type=int, default=20, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--device", type=str, default="cuda", help="Device: cuda or cpu")
    args = parser.parse_args()
    
    print(f"=== Starting training on server ===")
    print(f"Job: {args.job_name}")
    print(f"Data path: {args.data_path}")
    print(f"Output dir: {args.output_dir}")
    print(f"Device: {args.device}")
    
    # Initialize classifier with remote config
    config = {
        "model_variant": "efficientnetv2_s",
        "input_size": 384,
        "pretrained": True,
        "batch_size": args.batch_size,
        "epochs": args.epochs,
        "device": args.device,
        "artifacts_dir": args.output_dir
    }
    
    classifier = EfficientNetV2DiseaseClassifier(config)
    classifier.build_model()
    
    # TODO: Load real dataset from args.data_path
    # For now, use dummy dataset for testing
    print("Loading dataset...")
    train_loader = create_dummy_dataset(num_samples=100, batch_size=args.batch_size)
    val_loader = create_dummy_dataset(num_samples=20, batch_size=args.batch_size)
    
    # Train
    print("Starting training...")
    try:
        classifier.fit(train_loader, val_loader, epochs=args.epochs)
        print(f"✓ Training complete. Model saved to {args.output_dir}")
    except Exception as e:
        print(f"✗ Training failed: {e}")
        raise


if __name__ == "__main__":
    main()
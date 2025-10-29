"""Training utilities for the vascular lesion classifier.

This module contains:
- `SkinLesionDataset` — simple dataset loader that gathers images from
    provided class folders (supports passing a list of directories or a
    single root that contains class subfolders).
- `VascularLesionTrainer` — training loop, checkpointing and history
    saving for an EfficientNetV2-S model adapted to two classes.

Usage notes:
- Provide DATA_DIRS in the __main__ block as either a single parent
    folder that contains the class subfolders (e.g. `.../train/Healthy`)
    or as a list of class folders directly. The dataset will collect up
    to `images_per_class` images per class.
"""

import json
from datetime import datetime
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision.models import efficientnet_v2_s
from torchvision.transforms import v2
from PIL import Image
from tqdm import tqdm


class SkinLesionDataset(Dataset):
    """Dataset that loads images from class subfolders.

    This class accepts either a single root directory that contains class
    subfolders (e.g. root/Healthy, root/Vascular Lesions), or a list of
    directories. Each provided directory can either be a root that contains
    class subfolders, or be a class folder itself (the code will detect
    both cases).

    The dataset collects up to `images_per_class` images per class across
    the provided directories.
    """

    def __init__(self, root_dirs, classes, transform=None, images_per_class=50):
        # Accept either a single path string/Path or a list/tuple of them
        if isinstance(root_dirs, (str, Path)):
            self.root_dirs = [Path(root_dirs)]
        else:
            self.root_dirs = [Path(p) for p in root_dirs]

        self.classes = classes
        self.class_to_idx = {c: i for i, c in enumerate(classes)}
        self.transform = transform
        self.images = []

        # Load images for each class by scanning each provided directory.
        # For each class we look for either:
        # 1) a class subfolder under the root (root / class_name), or
        # 2) a provided path that itself is the class folder (root.name == class_name)
        for cls in classes:
            collected = []
            for root in self.root_dirs:
                # Candidate 1: root/class_name
                candidate = root / cls
                # If a root contains a subfolder named for the class (e.g.
                # root/Healthy), gather images from that folder. We accept
                # common image extensions; the check is case-insensitive.
                if candidate.exists() and candidate.is_dir():
                    for img_path in candidate.glob('*'):
                        if img_path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp'):
                            collected.append((str(img_path), self.class_to_idx[cls]))

                # Candidate 2: root itself is the class folder (e.g. path/to/Healthy)
                # Alternatively, the root path itself may be the class folder
                # (for example the caller passed '.../Healthy' directly). In
                # that case, gather images directly from the root folder.
                elif root.exists() and root.is_dir() and root.name.lower() == cls.lower():
                    for img_path in root.glob('*'):
                        if img_path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp'):
                            collected.append((str(img_path), self.class_to_idx[cls]))

            if len(collected) == 0:
                print(f"Warning: no images found for class '{cls}' in provided directories")
            # Keep up to images_per_class images per class. If multiple
            # directories contain images for the same class we concatenate
            # them and then truncate to the requested number. If you want
            # a random subset instead, shuffle `collected` before slicing.
            self.images.extend(collected[:images_per_class])
            print(f"Loaded {len(collected[:images_per_class])} images for class '{cls}'")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path, label = self.images[idx]
        img = Image.open(img_path).convert('RGB')
        if self.transform:
            img = self.transform(img)
        return img, label


class VascularLesionTrainer:
    """Trainer for EfficientNetV2-S with 2 output classes."""
    
    def __init__(self, num_epochs=30, batch_size=32, learning_rate=1e-3, 
                 device='cpu', model_save_dir='./checkpoints'):
        self.device = torch.device(device)
        self.num_epochs = num_epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.model_save_dir = Path(model_save_dir)
        self.model_save_dir.mkdir(parents=True, exist_ok=True)
        
        # Build model, optimizer, scheduler
        self.model = self._build_model().to(self.device)
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.learning_rate)
        self.scheduler = optim.lr_scheduler.CosineAnnealingLR(self.optimizer, T_max=self.num_epochs)
        
        # Track training history
        self.history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
    def _build_model(self):
        """Create EfficientNetV2-S and replace head for 2 classes."""
        try:
            model = efficientnet_v2_s(weights='DEFAULT')
        except Exception:
            model = efficientnet_v2_s(weights=None)
        
        # Freeze early feature layers
        for param in model.features[:6].parameters():
            param.requires_grad = False
        
        # Replace classification head
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, 2)
        )
        return model
    
    def create_dataloaders(self, data_dirs, val_split=0.2, images_per_class=50):
        """Create training and validation DataLoaders."""
        # Training augmentations
        train_transform = v2.Compose([
            # Resize to the resolution used during training. We use a fixed
            # 384x384 input size because the model was trained at that size.
            v2.Resize((384, 384), antialias=True),
            # Random geometric augmentations to increase invariance
            v2.RandomHorizontalFlip(p=0.5),
            v2.RandomVerticalFlip(p=0.5),
            v2.RandomRotation(degrees=20),
            # Appearance augmentations to make the model robust to lighting
            v2.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            # Convert PIL Image to the transform pipeline's image format
            v2.ToImage(),
            # Convert to float32 and scale pixels to [0, 1]
            v2.ToDtype(torch.float32, scale=True),
            # Normalize with ImageNet-like mean/std used in training
            v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Validation transforms (no augmentation)
        val_transform = v2.Compose([
            # Keep the same resize and normalization steps as training,
            # but do NOT apply random augmentations.
            v2.Resize((384, 384), antialias=True),
            v2.ToImage(),
            v2.ToDtype(torch.float32, scale=True),
            v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Load dataset
        classes = ['Healthy', 'Vascular Lesions']
        # SkinLesionDataset accepts a single path or a list of paths.
        dataset = SkinLesionDataset(data_dirs, classes, transform=train_transform, images_per_class=images_per_class)

        if len(dataset) == 0:
            raise ValueError("No images found. Check data directory and class folder names.")

        # Split into train/val
        train_size = int(len(dataset) * (1 - val_split))
        val_size = len(dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
        val_dataset.dataset.transform = val_transform

        # Create DataLoaders
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_dataset, batch_size=self.batch_size, shuffle=False, num_workers=0)

        print(f"Total images: {len(dataset)}\nTrain: {train_size}, Val: {val_size}\n")
        return train_loader, val_loader
    
    def train_epoch(self, train_loader):
        """Run one training epoch and return loss and accuracy."""
        self.model.train()
        total_loss = total_correct = total_samples = 0
        
        for images, labels in tqdm(train_loader, desc="Train"):
            # Move batch to device (CPU or GPU)
            images, labels = images.to(self.device), labels.to(self.device)

            # Forward pass: compute logits
            outputs = self.model(images)
            # Compute scalar loss (CrossEntropy expects raw logits)
            loss = self.criterion(outputs, labels)

            # Backpropagation and optimizer step
            self.optimizer.zero_grad()   # reset gradients
            loss.backward()              # compute gradients
            self.optimizer.step()       # update weights

            # Accumulate metrics for reporting
            total_loss += loss.item() * images.size(0)
            # preds: predicted class indices for each sample in batch
            preds = outputs.argmax(dim=1)
            total_correct += (preds == labels).sum().item()
            total_samples += labels.size(0)
        
        return total_loss / total_samples, total_correct / total_samples
    
    def validate(self, val_loader):
        """Run validation and return loss and accuracy."""
        self.model.eval()
        total_loss = total_correct = total_samples = 0
        
        with torch.no_grad():
            for images, labels in tqdm(val_loader, desc="Validate"):
                # Move to device
                images, labels = images.to(self.device), labels.to(self.device)
                # Forward only
                outputs = self.model(images)
                loss = self.criterion(outputs, labels)

                # Accumulate validation metrics
                total_loss += loss.item() * images.size(0)
                preds = outputs.argmax(dim=1)
                total_correct += (preds == labels).sum().item()
                total_samples += labels.size(0)
        
        return total_loss / total_samples, total_correct / total_samples
    
    def train(self, train_loader, val_loader):
        """Full training loop with best model checkpointing."""
        best_val_acc = 0.0
        
        for epoch in range(self.num_epochs):
            train_loss, train_acc = self.train_epoch(train_loader)
            val_loss, val_acc = self.validate(val_loader)
            self.scheduler.step()
            
            self.history['train_loss'].append(train_loss)
            self.history['train_acc'].append(train_acc)
            self.history['val_loss'].append(val_loss)
            self.history['val_acc'].append(val_acc)
            
            print(f"Epoch {epoch+1}/{self.num_epochs} | "
                  f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.4f} | "
                  f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.4f}")
            
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                # Save the best model when validation accuracy improves
                saved = self.save_checkpoint('best_model.pth')
                if saved:
                    print(f"Saved improved model to {self.model_save_dir / 'best_model.pth'}")
                else:
                    print("Warning: failed to save best_model.pth")
        # Always save the last epoch model as well for safety
        last_saved = self.save_checkpoint('last_model.pth')
        if last_saved:
            print(f"Saved last epoch model to {self.model_save_dir / 'last_model.pth'}")
        else:
            print("Warning: failed to save last_model.pth")
    
    def save_checkpoint(self, filename):
        """Save model weights and training state."""
        target = self.model_save_dir / filename
        # Ensure directory exists
        try:
            self.model_save_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error creating model_save_dir {self.model_save_dir}: {e}")
            return False

        payload = {
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'history': self.history,
            'timestamp': datetime.now().isoformat()
        }

        try:
            torch.save(payload, target)
        except Exception as e:
            print(f"Error saving checkpoint to {target}: {e}")
            return False

        # Verify file was written
        try:
            if target.exists() and target.stat().st_size > 0:
                return True
            else:
                print(f"Checkpoint file {target} not found or empty after save.")
                return False
        except Exception as e:
            print(f"Error verifying checkpoint file {target}: {e}")
            return False
    
    def save_history(self):
        """Save training history as JSON."""
        with open(self.model_save_dir / 'training_history.json', 'w') as f:
            json.dump(self.history, f, indent=2)


if __name__ == "__main__":
    # Configuration
    # Path(s) to training images. The code accepts either:
    # - a single root directory that contains class subfolders, e.g.:
    #     G:/University/Capstone/archive/train
    #     -> expects G:/.../train/Healthy and G:/.../train/Vascular Lesions
    # - OR a list of directories. Each entry can be either a root that
    #   contains class subfolders, or a direct class folder itself.
    # Example (single root):
    # Use the two class folders directly (as you requested).
    DATA_DIRS = [
        'G:/University/Capstone/archive/train/Healthy',
        'G:/University/Capstone/archive/train/Vascular lesions'
    ]
    # Example (explicit class folders):
    # DATA_DIRS = [
    #     'G:/path/to/Healthy',
    #     'G:/path/to/Vascular Lesions'
    # ]

    # Number of images to use per class (the dataset will keep up to this many
    # images for each class across the provided directories). You requested 50.
    IMAGES_PER_CLASS = 50
    BATCH_SIZE = 15
    NUM_EPOCHS = 5
    LEARNING_RATE = 1e-3
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    print(f"Using device: {DEVICE}\n")
    
    # Create trainer and dataloaders
    trainer = VascularLesionTrainer(num_epochs=NUM_EPOCHS, batch_size=BATCH_SIZE,
                                     learning_rate=LEARNING_RATE, device=DEVICE)
    train_loader, val_loader = trainer.create_dataloaders(DATA_DIRS, val_split=0.2, images_per_class=IMAGES_PER_CLASS)
    
    # Train and save
    trainer.train(train_loader, val_loader)
    trainer.save_history()
    print(f"Done! Best model saved to ./checkpoints/best_model.pth")
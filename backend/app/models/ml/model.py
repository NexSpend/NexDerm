# app/models/ml/model.py
# This file contains the core machine learning logic for analyzing skin images.
# It first uses AI to verify that an uploaded photo is actually skin, and then runs it 
# through an ensemble of models to predict the specific condition and confidence score.

from __future__ import annotations
import pathlib
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Sequence
import torch
from PIL import Image
from torch import nn
from torchvision import models, transforms
from transformers import CLIPProcessor, CLIPModel


# load pytorch model weights from disk
def load_checkpoint(path: str | pathlib.Path, device: torch.device) -> Dict[str, Any]:
    # convert string to path object
    p = pathlib.Path(path)
    # crash if the file is missing
    if not p.exists():
        raise FileNotFoundError(f"Checkpoint file not found at {p}")
    # load weights to the target device
    ckpt = torch.load(p, map_location=device)
    
    # ensure the checkpoint is valid
    if not isinstance(ckpt, dict):
        raise ValueError(f"Checkpoint at {p} is not a dict.")
    return ckpt


# extract the actual weights from the checkpoint dictionary
def get_state_dict(ckpt: Dict[str, Any]) -> Dict[str, torch.Tensor]:
    # unwrap nested state dicts if present
    if "model_state" in ckpt and isinstance(ckpt["model_state"], dict):
        return ckpt["model_state"]
    return ckpt


# create an ordered list of class names based on their index
def build_idx_to_class(class_to_idx: Dict[str, int]) -> List[str]:
    # sort dictionary items by their index values
    items = sorted(class_to_idx.items(), key=lambda kv: kv[1])
    # strip out the keys into a clean list
    return [k for k, _ in items]


# densenet model wrapper for disease classification
class DenseNetDiseaseClassifier:
    
    # initialize empty model state and assign hardware device
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # fallback to cpu if cuda is unavailable
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.models: List[nn.Module] = []
        self.model_names: List[str] = []
        self.transform = None
        self.idx_to_class: Optional[List[str]] = None

    # load a specific densenet checkpoint and set up transforms
    def load_from_checkpoint(self, checkpoint_path: str | pathlib.Path) -> None:
        ckpt = load_checkpoint(checkpoint_path, self.device)
        # get class mappings or crash
        class_to_idx = ckpt.get("class_to_idx", {})
        if not class_to_idx:
            raise ValueError("DenseNet checkpoint missing class_to_idx")
        self.idx_to_class = build_idx_to_class(class_to_idx)
        num_classes = len(self.idx_to_class)
        
        # grab normalization stats with standard defaults
        mean = ckpt.get("norm_mean", [0.485, 0.456, 0.406])
        std = ckpt.get("norm_std", [0.229, 0.224, 0.225])
        # compose image augmentations for the model
        self.transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )
        # handle newer and older torchvision apis
        try:
            model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
        except AttributeError:
            model = models.densenet121(pretrained=True)
            
        # swap the final layer to match our number of classes
        model.classifier = nn.Linear(model.classifier.in_features, num_classes)
        # inject weights and lock the model for inference
        model.load_state_dict(get_state_dict(ckpt))
        model.to(self.device)
        model.eval()
        self.models.append(model)
        self.model_names.append(pathlib.Path(checkpoint_path).name)

    # prepare raw image for densenet consumption
    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        if self.transform is None:
            raise RuntimeError("Transform not initialized. Call load_from_checkpoint first.")
        # force image into rgb format
        if image.mode != "RGB":
            image = image.convert("RGB")
        # apply transforms and add a batch dimension
        x = self.transform(image).unsqueeze(0)
        return x.to(self.device)

    # run image through all loaded densenet models
    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if not self.models:
            raise RuntimeError("DenseNet model not loaded.")
        # stack predictions from the ensemble into a single tensor without tracking gradients
        with torch.no_grad():
            return torch.stack([model(x) for model in self.models], dim=0)


# resnet model wrapper for disease classification
class ResNetDiseaseClassifier:
    
    # initialize resnet state and configure device
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # fallback to cpu if cuda is unavailable
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.models: List[nn.Module] = []
        self.model_names: List[str] = []
        self.idx_to_class: Optional[List[str]] = None

    # load resnet weights and match class indices
    def load_from_checkpoint(
        self,
        checkpoint_path: str | pathlib.Path,
        fallback_idx_to_class: Optional[List[str]] = None,
    ) -> None:
        ckpt = load_checkpoint(checkpoint_path, self.device)
        # try using the checkpoint classes first
        class_to_idx = ckpt.get("class_to_idx", {})
        if class_to_idx:
            self.idx_to_class = build_idx_to_class(class_to_idx)
            num_classes = len(self.idx_to_class)
        # use fallback classes if the checkpoint lacks them
        elif fallback_idx_to_class:
            self.idx_to_class = fallback_idx_to_class
            num_classes = len(fallback_idx_to_class)
        else:
            raise ValueError("ResNet checkpoint missing class_to_idx and no fallback provided.")
            
        # support older torchvision weight loading
        try:
            model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        except AttributeError:
            model = models.resnet50(pretrained=True)
            
        # adjust the final fully connected layer
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        # load weights and switch to eval mode
        model.load_state_dict(get_state_dict(ckpt))
        model.to(self.device)
        model.eval()
        self.models.append(model)
        self.model_names.append(pathlib.Path(checkpoint_path).name)

    # generate unnormalized predictions from all resnet models
    def predict_logits(self, x: torch.Tensor) -> torch.Tensor:
        if not self.models:
            raise RuntimeError("ResNet model not loaded.")
        # batch the outputs together without tracking gradients
        with torch.no_grad():
            return torch.stack([model(x) for model in self.models], dim=0)


# master classifier combining densenet and resnet models
class EnsembleDiseaseClassifier:
    
    # initialize the sub-classifiers and device config
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # fallback to cpu if cuda is unavailable
        self.device = torch.device(
            config.get("device", "cuda" if torch.cuda.is_available() else "cpu")
        )
        self.densenet = DenseNetDiseaseClassifier(config=config)
        self.resnet = ResNetDiseaseClassifier(config=config)
        self.idx_to_class: Optional[List[str]] = None

    # load multiple paths for both model types and verify consistency
    def load_from_checkpoints(
        self,
        densenet_path: str | pathlib.Path | Sequence[str | pathlib.Path],
        resnet_path: str | pathlib.Path | Sequence[str | pathlib.Path],
    ) -> None:
        # force paths into lists for easy iteration
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
        
        # load densenet models and ensure their class orders match up
        dense_idx_to_class: Optional[List[str]] = None
        for path in densenet_paths:
            self.densenet.load_from_checkpoint(path)
            if dense_idx_to_class is None:
                dense_idx_to_class = self.densenet.idx_to_class
            elif self.densenet.idx_to_class != dense_idx_to_class:
                raise ValueError("DenseNet checkpoints have inconsistent class order.")
        self.idx_to_class = dense_idx_to_class
        
        # load resnet models using densenet classes as a fallback
        for path in resnet_paths:
            self.resnet.load_from_checkpoint(
                path,
                fallback_idx_to_class=self.idx_to_class,
            )
            if self.resnet.idx_to_class != self.idx_to_class:
                raise ValueError("ResNet checkpoints have inconsistent class order.")
                
        # ensure both architectures agree on class ordering
        if self.resnet.idx_to_class != self.idx_to_class:
            raise ValueError("DenseNet and ResNet class order mismatch.")
        # crash if no models were actually loaded
        if not self.densenet.models or not self.resnet.models:
            raise ValueError("Both DenseNet and ResNet ensembles must load at least one checkpoint.")

    # run an image through the full ensemble and tally votes
    def predict(self, image: Image.Image) -> Dict[str, Any]:
        if self.idx_to_class is None:
            raise RuntimeError("Ensemble not loaded. Call load_from_checkpoints().")
        # prep the image for both architectures
        x = self.densenet.preprocess_image(image)
        # get raw logits from all models
        dense_logits = self.densenet.predict_logits(x)
        resnet_logits = self.resnet.predict_logits(x)
        
        # convert raw logits into probability percentages
        dense_probs = torch.softmax(dense_logits, dim=2)
        resnet_probs = torch.softmax(resnet_logits, dim=2)
        # extract top predictions and their confidences
        dense_conf, dense_idx = torch.max(dense_probs, dim=2)
        res_conf, res_idx = torch.max(resnet_probs, dim=2)
        vote_counts: Counter[int] = Counter()
        confidence_sums: defaultdict[int, float] = defaultdict(float)
        
        # give extra voting weight to the first three densenet models
        dense_vote_weights = [2 if i < 3 else 1 for i in range(len(self.densenet.models))]
        resnet_vote_weights = [1 for _ in range(len(self.resnet.models))]
        
        # count votes and sum confidences for densenet
        for dense_weight, idx_tensor, conf_tensor in zip(dense_vote_weights, dense_idx, dense_conf):
            pred_idx = int(idx_tensor.item())
            vote_counts[pred_idx] += dense_weight
            confidence_sums[pred_idx] += float(conf_tensor.item()) * dense_weight
            
        # count votes and sum confidences for resnet
        for resnet_weight, idx_tensor, conf_tensor in zip(resnet_vote_weights, res_idx, res_conf):
            pred_idx = int(idx_tensor.item())
            vote_counts[pred_idx] += resnet_weight
            confidence_sums[pred_idx] += float(conf_tensor.item()) * resnet_weight
            
        # pick the winning class based on vote count and confidence
        ens_idx = max(
            vote_counts,
            key=lambda idx: (vote_counts[idx], confidence_sums[idx], -idx),
        )
        total_votes = sum(vote_counts.values())
        # calculate the average confidence for the winning vote
        ens_conf = confidence_sums[ens_idx] / total_votes if total_votes else 0.0
        # find the most common prediction for each individual architecture
        dense_vote_idx, dense_vote_count = Counter(int(idx.item()) for idx in dense_idx).most_common(1)[0]
        res_vote_idx, res_vote_count = Counter(int(idx.item()) for idx in res_idx).most_common(1)[0]
        print("\n=== Ensemble Prediction ===")
        
        # display the voting breakdown for densenet
        for model_name, idx_tensor, conf_tensor in zip(
            self.densenet.model_names, dense_idx, dense_conf
        ):
            pred_idx = int(idx_tensor.item())
            print(
                f"[DenseNet] {model_name}: "
                f"{self.idx_to_class[pred_idx]} ({float(conf_tensor.item()):.4f}, vote_weight={dense_vote_weights[self.densenet.model_names.index(model_name)]})"
            )
            
        # display the voting breakdown for resnet
        for model_name, idx_tensor, conf_tensor in zip(
            self.resnet.model_names, res_idx, res_conf
        ):
            pred_idx = int(idx_tensor.item())
            print(
                f"[ResNet] {model_name}: "
                f"{self.idx_to_class[pred_idx]} ({float(conf_tensor.item()):.4f}, vote_weight={resnet_vote_weights[self.resnet.model_names.index(model_name)]})"
            )
        print("Vote totals:")
        
        # sort the final vote totals in descending order
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


# wrapper to filter out non-skin images before classification
class SkinFilterWrapper:
    
    # initialize the clip model and define expected image types
    def __init__(self, disease_ensemble: EnsembleDiseaseClassifier, threshold: float = 0.7):
        self.disease_ensemble = disease_ensemble
        self.threshold = threshold
        self.device = disease_ensemble.device
        print("Loading CLIP model for skin verification...")
        
        # load the pretrained clip visual model
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_model.eval()
        # set up text prompts to distinguish skin from random objects
        self.labels = [
            "a close-up photo of human skin or a skin lesion", 
            "a photo of an everyday object, furniture, or background"
        ]

    # check if the image is skin and only run the ensemble if it is
    def smart_predict(self, image: Image.Image) -> Dict[str, Any]:
        # strip alpha channels or grayscale conversions
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        # tokenize and prepare text/image inputs for clip
        inputs = self.clip_processor(
            text=self.labels, 
            images=image, 
            return_tensors="pt", 
            padding=True
        )
        # push inputs to the appropriate hardware
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # get similarity scores between the image and our text prompts
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
            
        # isolate the probability that the image matches the skin prompt
        skin_prob = probs[0][0].item()
        
        # reject the image if the skin probability falls below the threshold
        if skin_prob < self.threshold:
            return {
                "is_skin": False,
                "prediction": "Unknown Object / Not Skin",
                "confidence": float(1.0 - skin_prob),
                "message": "Please provide a clear, close-up image of the affected skin area."
            }
            
        # run the heavy ensemble since the image passed the filter
        ensemble_result = self.disease_ensemble.predict(image)
        ensemble_result["is_skin"] = True
        return ensemble_result
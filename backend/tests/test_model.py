import sys
import math
from unittest.mock import MagicMock

import pytest
import torch
from torch import nn
from PIL import Image

# Patch config before any app imports so pydantic-settings never reads a real .env file
_mock_settings = MagicMock()
_mock_settings.ENSEMBLE_WEIGHT_DENSENET = 0.5
_mock_settings.ENSEMBLE_WEIGHT_RESNET = 0.5
_mock_settings.SKIN_FILTER_THRESHOLD = 0.7
_mock_config_module = MagicMock()
_mock_config_module.settings = _mock_settings
sys.modules["app.core.config"] = _mock_config_module

from app.models.ml.model import (
    DenseNetDiseaseClassifier,
    ResNetDiseaseClassifier,
    EnsembleDiseaseClassifier,
    SkinFilterWrapper,
    load_checkpoint,
    get_state_dict,
    build_idx_to_class,
)
from app.services.model_service import ModelService

# Shared class list used across all model tests
CLASSES = ["acne", "eczema", "melanoma"]
CLASS_TO_IDX = {"acne": 0, "eczema": 1, "melanoma": 2}
NUM_CLASSES = len(CLASSES)


# --- Fake model that always predicts a specific class with high confidence ---
def make_fake_model(num_classes, predicted_class_idx, confidence_logit=100.0):
    model = MagicMock(spec=nn.Module)
    def _forward(x):
        batch = x.shape[0]
        logits = torch.full((batch, num_classes), -confidence_logit)
        logits[:, predicted_class_idx] = confidence_logit
        return logits
    model.side_effect = _forward
    return model


# --- Fake checkpoint that mimics the structure saved during training ---
def make_fake_checkpoint(class_to_idx=None, norm_mean=None, norm_std=None):
    if class_to_idx is None:
        class_to_idx = CLASS_TO_IDX
    ckpt = {"class_to_idx": class_to_idx}
    if norm_mean is not None:
        ckpt["norm_mean"] = norm_mean
    if norm_std is not None:
        ckpt["norm_std"] = norm_std
    return ckpt


# --- Fake CLIP outputs that produce the requested skin probability via softmax ---
def make_clip_outputs(skin_prob):
    logit = -1e6 if skin_prob <= 0.0 else (1e6 if skin_prob >= 1.0 else math.log(skin_prob / (1.0 - skin_prob)))
    outputs = MagicMock()
    outputs.logits_per_image = torch.tensor([[logit, 0.0]])
    return outputs


# --- Standard RGB and grayscale test images ---
@pytest.fixture
def rgb_image():
    return Image.new("RGB", (300, 300), color=(128, 64, 32))


@pytest.fixture
def grayscale_image():
    return Image.new("L", (300, 300), color=100)


# --- Pre-loaded DenseNet with a controlled fake model swapped in ---
@pytest.fixture
def loaded_densenet(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=make_fake_checkpoint())
    mock_arch = MagicMock()
    mock_arch.classifier.in_features = 1024
    mocker.patch("torchvision.models.densenet121", return_value=mock_arch)
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake/densenet.pth")
    clf.models[0] = make_fake_model(NUM_CLASSES, predicted_class_idx=0)
    return clf


# --- Pre-loaded ResNet with a controlled fake model swapped in ---
@pytest.fixture
def loaded_resnet(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=make_fake_checkpoint())
    mock_arch = MagicMock()
    mock_arch.fc.in_features = 2048
    mocker.patch("torchvision.models.resnet50", return_value=mock_arch)
    clf = ResNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake/resnet.pth")
    clf.models[0] = make_fake_model(NUM_CLASSES, predicted_class_idx=0)
    return clf


# --- Ensemble with both sub-classifiers pre-wired, skipping real checkpoint loading ---
@pytest.fixture
def loaded_ensemble(loaded_densenet, loaded_resnet):
    ens = EnsembleDiseaseClassifier(config={"device": "cpu"})
    ens.densenet = loaded_densenet
    ens.resnet = loaded_resnet
    ens.idx_to_class = list(CLASSES)
    return ens


# --- SkinFilterWrapper with CLIP model and processor fully mocked ---
@pytest.fixture
def skin_filter(mocker, loaded_ensemble):
    proc = MagicMock()
    proc.return_value = {"input_ids": torch.zeros(1, 10), "pixel_values": torch.zeros(1, 3, 224, 224)}
    mocker.patch("app.models.ml.model.CLIPModel.from_pretrained", return_value=MagicMock())
    mocker.patch("app.models.ml.model.CLIPProcessor.from_pretrained", return_value=proc)
    return SkinFilterWrapper(disease_ensemble=loaded_ensemble, threshold=0.7)


# --- Clears the ModelService singleton before and after each test that needs it ---
@pytest.fixture
def reset_singleton():
    ModelService._instance = None
    yield
    ModelService._instance = None


# =============================================================================
# Helper functions: load_checkpoint, get_state_dict, build_idx_to_class
# =============================================================================

# load_checkpoint raises when the file does not exist on disk
def test_load_checkpoint_file_not_found(mocker):
    mocker.patch("pathlib.Path.exists", return_value=False)
    with pytest.raises(FileNotFoundError):
        load_checkpoint("missing.pth", torch.device("cpu"))

# load_checkpoint passes map_location so tensors land on the intended device
def test_load_checkpoint_passes_device(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mock_load = mocker.patch("torch.load", return_value={"class_to_idx": {}})
    load_checkpoint("fake.pth", torch.device("cpu"))
    _, kwargs = mock_load.call_args
    assert kwargs.get("map_location") == torch.device("cpu")

# load_checkpoint rejects checkpoints that are not dicts, e.g. a bare list
def test_load_checkpoint_non_dict_raises(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=[1, 2, 3])
    with pytest.raises(ValueError):
        load_checkpoint("fake.pth", torch.device("cpu"))

# get_state_dict unwraps the nested model_state key when present
def test_get_state_dict_extracts_model_state():
    inner = {"w": torch.tensor([1.0])}
    assert get_state_dict({"model_state": inner}) is inner

# get_state_dict returns the whole checkpoint as-is when there is no model_state key
def test_get_state_dict_passthrough():
    ckpt = {"w": torch.tensor([1.0])}
    assert get_state_dict(ckpt) is ckpt

# build_idx_to_class converts {name: index} to a list ordered by index value
def test_build_idx_to_class_sorted():
    assert build_idx_to_class({"b": 1, "a": 0, "c": 2}) == ["a", "b", "c"]


# =============================================================================
# DenseNet classifier
# =============================================================================

# Starts clean with no models, no transform, and no class mapping
def test_densenet_initial_state_empty():
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    assert clf.models == [] and clf.transform is None

# A valid checkpoint loads one model and sets the class list correctly
def test_densenet_load_happy_path(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=make_fake_checkpoint())
    mock_arch = MagicMock()
    mock_arch.classifier.in_features = 1024
    mocker.patch("torchvision.models.densenet121", return_value=mock_arch)
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake.pth")
    assert len(clf.models) == 1 and clf.idx_to_class == CLASSES

# A checkpoint without class_to_idx is invalid and must raise
def test_densenet_load_missing_class_to_idx_raises(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value={})
    mocker.patch("torchvision.models.densenet121", return_value=MagicMock())
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    with pytest.raises(ValueError):
        clf.load_from_checkpoint("fake.pth")

# Loading two checkpoints appends models rather than replacing the first
def test_densenet_multiple_loads_append(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=make_fake_checkpoint())
    mock_arch = MagicMock()
    mock_arch.classifier.in_features = 1024
    mocker.patch("torchvision.models.densenet121", return_value=mock_arch)
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake1.pth")
    clf.load_from_checkpoint("fake2.pth")
    assert len(clf.models) == 2

# preprocess_image raises with a clear message before any checkpoint is loaded
def test_densenet_preprocess_before_load_raises(rgb_image):
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    with pytest.raises(RuntimeError):
        clf.preprocess_image(rgb_image)

# Grayscale images are auto-converted to RGB so the model always sees 3 channels
def test_densenet_preprocess_grayscale_converted(loaded_densenet, grayscale_image):
    assert loaded_densenet.preprocess_image(grayscale_image).shape == (1, 3, 224, 224)

# predict_logits returns shape (num_models, batch_size, num_classes)
def test_densenet_predict_logits_shape(loaded_densenet):
    assert loaded_densenet.predict_logits(torch.zeros(1, 3, 224, 224)).shape == (1, 1, NUM_CLASSES)

# predict_logits raises if called before any model has been loaded
def test_densenet_predict_logits_no_models_raises():
    clf = DenseNetDiseaseClassifier(config={"device": "cpu"})
    with pytest.raises(RuntimeError):
        clf.predict_logits(torch.zeros(1, 3, 224, 224))


# =============================================================================
# ResNet classifier
# =============================================================================

# A valid checkpoint loads one model and derives the class list from class_to_idx
def test_resnet_load_happy_path(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value=make_fake_checkpoint())
    mock_arch = MagicMock()
    mock_arch.fc.in_features = 2048
    mocker.patch("torchvision.models.resnet50", return_value=mock_arch)
    clf = ResNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake.pth")
    assert len(clf.models) == 1 and clf.idx_to_class == CLASSES

# When a checkpoint has no class_to_idx, the provided fallback list is used instead
def test_resnet_fallback_class_mapping(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value={})
    mock_arch = MagicMock()
    mock_arch.fc.in_features = 2048
    mocker.patch("torchvision.models.resnet50", return_value=mock_arch)
    clf = ResNetDiseaseClassifier(config={"device": "cpu"})
    clf.load_from_checkpoint("fake.pth", fallback_idx_to_class=CLASSES)
    assert clf.idx_to_class == CLASSES

# Missing class_to_idx with no fallback must raise rather than silently produce None
def test_resnet_no_class_to_idx_no_fallback_raises(mocker):
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("torch.load", return_value={})
    mocker.patch("torchvision.models.resnet50", return_value=MagicMock())
    clf = ResNetDiseaseClassifier(config={"device": "cpu"})
    with pytest.raises(ValueError):
        clf.load_from_checkpoint("fake.pth")

# predict_logits returns shape (num_models, batch_size, num_classes)
def test_resnet_predict_logits_shape(loaded_resnet):
    assert loaded_resnet.predict_logits(torch.zeros(1, 3, 224, 224)).shape == (1, 1, NUM_CLASSES)


# =============================================================================
# Ensemble classifier
# =============================================================================

# When all models agree, the ensemble returns that unanimous prediction
def test_ensemble_unanimous_vote(loaded_ensemble, rgb_image):
    loaded_ensemble.densenet.models[0] = make_fake_model(NUM_CLASSES, 0)
    loaded_ensemble.resnet.models[0] = make_fake_model(NUM_CLASSES, 0)
    assert loaded_ensemble.predict(rgb_image)["prediction"] == "acne"

# DenseNet models (indices 0-2) carry weight 2 each, so one DenseNet beats one ResNet
def test_ensemble_densenet_weight_beats_resnet(loaded_ensemble, rgb_image):
    loaded_ensemble.densenet.models[0] = make_fake_model(NUM_CLASSES, 0)  # acne, weight 2
    loaded_ensemble.resnet.models[0] = make_fake_model(NUM_CLASSES, 1)    # eczema, weight 1
    assert loaded_ensemble.predict(rgb_image)["prediction"] == "acne"

# Three ResNets (3 × weight 1) can outvote a single DenseNet (weight 2)
def test_ensemble_three_resnets_outvote_one_densenet(loaded_ensemble, rgb_image):
    loaded_ensemble.densenet.models[0] = make_fake_model(NUM_CLASSES, 0)
    loaded_ensemble.densenet.model_names = ["d1.pth"]
    loaded_ensemble.resnet.models = [make_fake_model(NUM_CLASSES, 1) for _ in range(3)]
    loaded_ensemble.resnet.model_names = ["r1.pth", "r2.pth", "r3.pth"]
    assert loaded_ensemble.predict(rgb_image)["prediction"] == "eczema"

# The result dict must contain exactly these four keys
def test_ensemble_result_keys(loaded_ensemble, rgb_image):
    assert set(loaded_ensemble.predict(rgb_image).keys()) == {"prediction", "confidence", "votes", "model_outputs"}

# Confidence must always be a float in [0, 1]
def test_ensemble_confidence_range(loaded_ensemble, rgb_image):
    conf = loaded_ensemble.predict(rgb_image)["confidence"]
    assert 0.0 <= conf <= 1.0

# is_skin is not the ensemble's responsibility, it is added by SkinFilterWrapper
def test_ensemble_does_not_include_is_skin(loaded_ensemble, rgb_image):
    assert "is_skin" not in loaded_ensemble.predict(rgb_image)

# Calling predict before any checkpoint is loaded must raise immediately
def test_ensemble_predict_before_load_raises(rgb_image):
    ens = EnsembleDiseaseClassifier(config={"device": "cpu"})
    with pytest.raises(RuntimeError):
        ens.predict(rgb_image)


# =============================================================================
# SkinFilterWrapper
# =============================================================================

# Default threshold is 0.7 when none is explicitly provided
def test_skin_filter_default_threshold(mocker, loaded_ensemble):
    mocker.patch("app.models.ml.model.CLIPModel.from_pretrained", return_value=MagicMock())
    mocker.patch("app.models.ml.model.CLIPProcessor.from_pretrained", return_value=MagicMock())
    assert SkinFilterWrapper(disease_ensemble=loaded_ensemble).threshold == 0.7

# Images below the skin threshold are rejected without ever running the disease model
def test_skin_filter_rejects_non_skin(skin_filter, rgb_image, mocker):
    skin_filter.clip_model.return_value = make_clip_outputs(0.3)
    mock_predict = mocker.patch.object(skin_filter.disease_ensemble, "predict")
    result = skin_filter.smart_predict(rgb_image)
    assert result["is_skin"] is False
    mock_predict.assert_not_called()

# Rejection response has exactly the right keys and a descriptive prediction label
def test_skin_filter_rejection_response_structure(skin_filter, rgb_image):
    skin_filter.clip_model.return_value = make_clip_outputs(0.3)
    result = skin_filter.smart_predict(rgb_image)
    assert set(result.keys()) == {"is_skin", "prediction", "confidence", "message"}
    assert result["prediction"] == "Unknown Object / Not Skin"

# Images at or above threshold pass straight through to the disease ensemble
def test_skin_filter_passes_through_at_threshold(skin_filter, rgb_image, mocker):
    skin_filter.threshold = 0.5
    skin_filter.clip_model.return_value = make_clip_outputs(0.5)
    mocker.patch.object(skin_filter.disease_ensemble, "predict",
                        return_value={"prediction": "acne", "confidence": 0.9, "votes": {}, "model_outputs": {}})
    assert skin_filter.smart_predict(rgb_image)["is_skin"] is True

# Grayscale images should be converted to RGB before being sent to CLIP
def test_skin_filter_grayscale_converted(skin_filter, grayscale_image, mocker):
    skin_filter.clip_model.return_value = make_clip_outputs(0.9)
    mocker.patch.object(skin_filter.disease_ensemble, "predict",
                        return_value={"prediction": "acne", "confidence": 0.9, "votes": {}, "model_outputs": {}})
    assert skin_filter.smart_predict(grayscale_image)["is_skin"] is True


# =============================================================================
# ModelService
# =============================================================================

FAKE_RESULT = {"is_skin": True, "prediction": "acne", "confidence": 0.91, "votes": {}, "model_outputs": {}}


# ModelService always returns the same instance no matter how many times it is created
def test_model_service_singleton(mocker, reset_singleton):
    mock = MagicMock(spec=SkinFilterWrapper)
    mock.smart_predict.return_value = dict(FAKE_RESULT)
    mocker.patch.object(ModelService, "_load_model_pipeline", return_value=mock)
    assert ModelService() is ModelService()

# The pipeline is only constructed once even when ModelService() is called many times
def test_model_service_pipeline_loaded_once(mocker, reset_singleton):
    mock = MagicMock(spec=SkinFilterWrapper)
    mock.smart_predict.return_value = dict(FAKE_RESULT)
    mocker.patch.object(ModelService, "_load_model_pipeline", return_value=mock)
    for _ in range(3):
        ModelService()
    ModelService._load_model_pipeline.assert_called_once()

# smart_predict returns exactly what the pipeline returns, without modification
def test_model_service_smart_predict_delegates(mocker, reset_singleton):
    mock = MagicMock(spec=SkinFilterWrapper)
    mock.smart_predict.return_value = dict(FAKE_RESULT)
    mocker.patch.object(ModelService, "_load_model_pipeline", return_value=mock)
    result = ModelService().smart_predict(Image.new("RGB", (100, 100)))
    assert result == FAKE_RESULT

# smart_predict raises immediately when the pipeline was never loaded
def test_model_service_raises_if_pipeline_none(mocker, reset_singleton):
    mocker.patch.object(ModelService, "_load_model_pipeline", return_value=MagicMock(spec=SkinFilterWrapper))
    svc = ModelService()
    svc.classifier_pipeline = None
    with pytest.raises(RuntimeError):
        svc.smart_predict(Image.new("RGB", (100, 100)))

# _load_model_pipeline must request exactly 5 DenseNet and 5 ResNet checkpoint paths
def test_model_service_loads_five_checkpoints_each(mocker, reset_singleton):
    mock_ensemble = MagicMock()
    mocker.patch("app.services.model_service.EnsembleDiseaseClassifier", return_value=mock_ensemble)
    mocker.patch("app.services.model_service.SkinFilterWrapper", return_value=MagicMock(spec=SkinFilterWrapper))
    ModelService._load_model_pipeline()
    dn_paths, rn_paths = mock_ensemble.load_from_checkpoints.call_args[0]
    assert len(dn_paths) == 5 and len(rn_paths) == 5

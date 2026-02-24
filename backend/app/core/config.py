from typing import Set
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Basic project info
    PROJECT_NAME: str = "NexDerm"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./nexderm.db"

    # Auth
    SECRET_KEY: str = "your-secret-key-here"  # TODO: move to .env before production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # ML model paths
    MODEL_PATH_DENSENET: str = "app/models/ml/artifacts/densenet_skin_best.pth"
    MODEL_PATH_RESNET: str = "app/models/ml/artifacts/resnet50_skin_best.pth"

    # Ensemble weights
    ENSEMBLE_WEIGHT_DENSENET: float = 0.5
    ENSEMBLE_WEIGHT_RESNET: float = 0.5

    # Upload settings
    UPLOAD_FOLDER: str = "uploads"
    ALLOWED_EXTENSIONS: Set[str] = {"png", "jpg", "jpeg"}

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()

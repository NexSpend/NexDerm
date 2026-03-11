from typing import Set
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Basic project info
    PROJECT_NAME: str = "NexDerm"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DB_HOST: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_PORT: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_PUBLIC_KEY: str
    SUPABASE_JWT_SECRET: str

    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str
    AWS_S3_BUCKET_NAME: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8


    # ML Model settings
    MODEL_PATH: str = "app/models/ml/artifacts/densenet_skin_best.pth"
    
    # Other settings

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

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"



settings = Settings()

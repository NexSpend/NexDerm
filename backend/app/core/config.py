from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NexDerm"
    API_V1_STR: str = "/api/v1"
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./nexderm.db"
    
    # JWT settings
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # ML Model settings
    MODEL_PATH: str = "app/models/ml/skin_disease_model.h5"
    
    # Other settings
    UPLOAD_FOLDER: str = "uploads"
    ALLOWED_EXTENSIONS: set = {"png", "jpg", "jpeg"}

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
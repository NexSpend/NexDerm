from pydantic_settings import BaseSettings

class Settings(BaseSettings):
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

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8


    # ML Model settings
    MODEL_PATH: str = "app/models/ml/artifacts/densenet_skin_best.pth"
    
    # Other settings
    UPLOAD_FOLDER: str = "uploads"
    ALLOWED_EXTENSIONS: set = {"png", "jpg", "jpeg"}

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"


settings = Settings()
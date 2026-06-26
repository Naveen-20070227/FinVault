import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinVault"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./finvault.db"
    
    # Security
    # JWT secret key. In production, this must be a strong random string.
    SECRET_KEY: str = "SUPERSECRET_FINVAULT_JWT_KEY_2026_CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 5
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    
    # CORS
    # Can be a comma-separated list of origins
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000,https://fin-vault-ten.vercel.app"
    
    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v:
                return []
            return [i.strip() for i in v.split(",")]
        return v

settings = Settings()

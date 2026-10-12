from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os
from pathlib import Path


class Settings(BaseSettings):
    APP_ENV: str = "development"
    PROJECT_NAME: str = "InsightFlow Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./insightflow.db"

    # Supabase Auth / Services
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Adaption Labs
    ADAPTION_API_KEY: str = ""

    # Uploads & Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://frontend-bay-ten-95.vercel.app",
        "https://frontend-rmj4w8w3m-tanukusais-projects.vercel.app",
    ]

    # Storage paths
    DATA_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "data")
    REPORTS_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "reports")

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins = []
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            origins = json.loads(v)
        elif isinstance(v, list):
            origins = v
        else:
            origins = []

        # Remove dangerous wildcard origins when allow_credentials is used
        cleaned = [o for o in origins if o != "*"]
        return cleaned if cleaned else [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)

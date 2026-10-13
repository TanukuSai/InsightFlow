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
    PUBLIC_DEMO_WORKSPACE_ID: str = "ws-production-eval"
    CANONICAL_DATASET_ID: str = "ds-796d15b9a096"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{(Path(__file__).resolve().parent.parent.parent / 'insightflow.db').as_posix()}"

    # Authentication & JWT
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    INSIGHTFLOW_BFF_SHARED_SECRET: str = ""
    SEED_DEMO_DATA_ON_STARTUP: bool = False

    # Supabase Auth / Services
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Adaption Labs & Cloud Kill Switch
    ADAPTION_API_KEY: str = ""
    ENABLE_PUBLIC_ADAPTION_OPERATIONS: bool = False
    ADAPTION_MAX_ROWS: int = 1000
    ADAPTION_DAILY_ESTIMATE_LIMIT: int = 10
    ADAPTION_DAILY_RUN_LIMIT: int = 3

    # Uploads & Resource Bounds
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_CSV_ROWS: int = 20000
    ADMIN_SECRET_KEY: str = ""

    # Bounded Public Rate Limits
    RATE_LIMIT_IMPORTS_PER_HOUR: int = 5
    RATE_LIMIT_ANALYSIS_PER_10MIN: int = 5
    RATE_LIMIT_REPORTS_PER_HOUR: int = 10
    RATE_LIMIT_FEEDBACK_PER_HOUR: int = 30
    RATE_LIMIT_ADAPTION_PER_HOUR: int = 5
    RATE_LIMIT_BURST_PER_MINUTE: int = 120

    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
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

    @field_validator("JWT_SECRET_KEY", mode="after")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v:
            app_env = os.environ.get("APP_ENV", "development").lower()
            if app_env == "production":
                raise ValueError("JWT_SECRET_KEY must be configured in production environment.")
            return "ephemeral-insightflow-dev-secret-key-at-least-32-chars-long"
        return v

    @field_validator("INSIGHTFLOW_BFF_SHARED_SECRET", mode="after")
    @classmethod
    def validate_bff_secret(cls, v: str) -> str:
        if not v:
            app_env = os.environ.get("APP_ENV", "development").lower()
            if app_env == "production":
                raise ValueError("INSIGHTFLOW_BFF_SHARED_SECRET must be configured in production environment.")
            return "dev-bff-secret-insightflow-entropy-min-32-chars"
        return v

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)

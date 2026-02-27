"""
Spec10x Backend — Application Configuration
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_env: str = "development"
    app_secret_key: str = "change-me-in-production"
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+asyncpg://spec10x:spec10x_local@localhost:5432/spec10x"
    database_url_sync: str = "postgresql://spec10x:spec10x_local@localhost:5432/spec10x"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Storage (MinIO for local, GCS for prod)
    storage_backend: str = "minio"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "spec10x-uploads"
    minio_use_ssl: bool = False

    # Firebase Auth
    firebase_project_id: str = ""
    firebase_service_account_path: str = "./firebase-service-account.json"

    # Google AI / Vertex AI
    google_api_key: str = ""  # API key from AI Studio (local dev) or empty for ADC (production)
    gemini_model: str = "gemini-2.0-flash"  # Model for analysis + Q&A
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"
    use_mock_ai: bool = True  # Set to False when Gemini API key is configured

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

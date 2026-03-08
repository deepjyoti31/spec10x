"""
Spec10x Backend — Application Configuration
"""

import os
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

    # GCP / Vertex AI
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"
    gemini_model: str = "gemini-3.1-flash-lite-preview"  # Model for analysis + Q&A
    google_application_credentials: str = ""  # Path to GCP service account JSON

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Push GOOGLE_APPLICATION_CREDENTIALS into the OS environment so that
    # google-auth / google-genai can discover it via Application Default
    # Credentials (ADC). pydantic-settings reads .env but does NOT export
    # values as real environment variables.
    if settings.google_application_credentials and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        creds_path = os.path.abspath(settings.google_application_credentials)
        if os.path.isfile(creds_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    return settings


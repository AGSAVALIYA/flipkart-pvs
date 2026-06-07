"""Application configuration using Pydantic Settings.

Centralizes all environment-driven configuration with validation
and sensible defaults for local development.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application-wide settings loaded from environment variables.

    Attributes:
        app_name: Display name of the application.
        app_version: Semantic version string.
        debug: Enable debug mode with verbose logging.
        database_url: Async PostgreSQL connection string.
        redis_url: Redis connection string for caching.
        jwt_secret_key: Secret key used for signing JWT tokens.
        jwt_algorithm: Algorithm used for JWT encoding/decoding.
        access_token_expire_minutes: Lifetime of access tokens in minutes.
        refresh_token_expire_minutes: Lifetime of refresh tokens in minutes.
        file_storage_path: Local filesystem path for uploaded files.
        max_upload_size_mb: Maximum allowed upload file size in megabytes.
        ai_provider_api_key: API key for the AI/VLM provider.
        ai_provider_base_url: Base URL for the AI/VLM provider API.
        cors_origins: Comma-separated list of allowed CORS origins.
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR).
    """

    app_name: str = "Flipkart Product Verification System"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/flipkart_pvs",
        description="Async PostgreSQL connection string.",
    )
    db_pool_size: int = Field(
        default=20,
        description="SQLAlchemy connection pool size.",
    )
    db_max_overflow: int = Field(
        default=10,
        description="Maximum connection overflow for database.",
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection string for caching.",
    )

    # JWT
    jwt_secret_key: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32",
        description="Secret key for JWT token signing.",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080  # 7 days

    # File Storage
    file_storage_path: str = "./storage"
    max_upload_size_mb: int = 600

    # AI Provider
    ai_provider_api_key: str | None = None
    ai_provider_base_url: str | None = None

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Logging
    log_level: str = "INFO"

    # Extra settings from .env
    database_url_sync: str | None = None
    upload_dir: str = "./storage/uploads"
    image_dir: str = "./storage/images"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    ai_provider: str = "gemini"
    ai_timeout_seconds: int = 30
    enable_rbac: bool = True
    enable_vision_ai: bool = False
    logfire_service_name: str = "flipkart-pvs"
    logfire_environment: str = "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated or JSON list of CORS origins."""
        import json
        val = self.cors_origins.strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                return [str(origin).strip() for origin in json.loads(val)]
            except Exception:
                pass
        return [origin.strip() for origin in val.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Load and cache the application settings singleton."""
    return Settings()

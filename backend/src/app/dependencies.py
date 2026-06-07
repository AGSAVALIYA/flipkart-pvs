"""FastAPI dependencies providing DB sessions, cache, storage, repositories, and services.
"""

from __future__ import annotations

import logging

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.config import Settings, get_settings
from src.auth.repository import UserRepository
from src.auth.service import AuthService
from src.domain.interfaces.ai_provider import IAIProvider
from src.domain.interfaces.cache import ICacheProvider
from src.domain.interfaces.storage import IFileStorage
from src.infrastructure.ai.factory import AIProviderFactory
from src.infrastructure.bulk_loader import PostgresBulkLoader
from src.infrastructure.database import get_db_session, get_engine
from src.infrastructure.redis import RedisCacheProvider, RedisClient
from src.infrastructure.storage.local import LocalFileStorage
from src.products.ingestion_repository import IngestionJobRepository
from src.products.repository import ProductRepository
from src.products.service import ProductService
from src.reports.service import ReportService
from src.settings.repository import SystemSettingRepository
from src.settings.service import SettingsService
from src.validation.ai_processing_service import AIProcessingService
from src.validation.repository import ValidationLogRepository
from src.validation.service import ValidationService

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Global infrastructure singletons
# ──────────────────────────────────────────────────────────────────────
_redis_client: RedisClient | None = None
_file_storage: LocalFileStorage | None = None
_bulk_loader: PostgresBulkLoader | None = None
_ai_provider_factory = AIProviderFactory()


def get_redis_client(settings: Settings = Depends(get_settings)) -> RedisClient:
    """Retrieve or build the global Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        logger.info("Initializing global RedisClient with URL: %s", settings.redis_url)
        _redis_client = RedisClient(settings.redis_url)
    return _redis_client


def get_cache_provider(
    redis_client: RedisClient = Depends(get_redis_client),
    settings: Settings = Depends(get_settings),
) -> ICacheProvider:
    """FastAPI dependency yielding the cache provider implementation."""
    # We use a standard TTL from settings (e.g. redis_default_ttl) or default to 300
    ttl = getattr(settings, "redis_default_ttl", 300)
    return RedisCacheProvider(redis_client, default_ttl=ttl)


def get_file_storage(settings: Settings = Depends(get_settings)) -> IFileStorage:
    """Retrieve or build the global filesystem storage provider."""
    global _file_storage
    if _file_storage is None:
        # In settings we named it file_storage_path. We maps uploads to storage_path/uploads
        # and images to storage_path/images
        base_path = settings.file_storage_path
        upload_dir = f"{base_path}/uploads"
        image_dir = f"{base_path}/images"
        logger.info("Initializing LocalFileStorage. Uploads: %s, Images: %s", upload_dir, image_dir)
        _file_storage = LocalFileStorage(upload_dir, image_dir)
    return _file_storage


def get_ai_provider(settings: Settings = Depends(get_settings)) -> IAIProvider | None:
    """FastAPI dependency yielding the configured Vision-AI provider."""
    provider = _ai_provider_factory.create(settings)
    if provider is None and settings.enable_vision_ai:
        logger.warning("Vision AI provider is unavailable. Background AI processing is disabled.")
    return provider


def get_bulk_loader() -> PostgresBulkLoader:
    """Retrieve the high-performance parallel PostgreSQL COPY bulk loader."""
    return PostgresBulkLoader(get_engine())


# ──────────────────────────────────────────────────────────────────────
# Repositories
# ──────────────────────────────────────────────────────────────────────
def get_product_repository(db: AsyncSession = Depends(get_db_session)) -> ProductRepository:
    """FastAPI dependency yielding the Product repository."""
    return ProductRepository(db)


def get_ingestion_job_repository(db: AsyncSession = Depends(get_db_session)) -> IngestionJobRepository:
    """FastAPI dependency yielding the IngestionJob repository."""
    return IngestionJobRepository(db)


def get_validation_repository(db: AsyncSession = Depends(get_db_session)) -> ValidationLogRepository:
    """FastAPI dependency yielding the ValidationLog repository."""
    return ValidationLogRepository(db)


def get_user_repository(db: AsyncSession = Depends(get_db_session)) -> UserRepository:
    """FastAPI dependency yielding the User repository."""
    return UserRepository(db)


def get_system_setting_repository(
    db: AsyncSession = Depends(get_db_session),
) -> SystemSettingRepository:
    """FastAPI dependency yielding the system settings repository."""
    return SystemSettingRepository(db)


# ──────────────────────────────────────────────────────────────────────
# Services
# ──────────────────────────────────────────────────────────────────────
def get_product_service(
    product_repo: ProductRepository = Depends(get_product_repository),
    file_storage: IFileStorage = Depends(get_file_storage),
    cache_provider: ICacheProvider = Depends(get_cache_provider),
    ingestion_repo: IngestionJobRepository = Depends(get_ingestion_job_repository),
    bulk_loader: PostgresBulkLoader = Depends(get_bulk_loader),
) -> ProductService:
    """FastAPI dependency yielding the Product coordination service."""
    return ProductService(
        product_repository=product_repo,
        file_storage=file_storage,
        cache_provider=cache_provider,
        ingestion_repository=ingestion_repo,
        bulk_loader=bulk_loader,
    )


def get_validation_service(
    validation_repo: ValidationLogRepository = Depends(get_validation_repository),
    product_repo: ProductRepository = Depends(get_product_repository),
    file_storage: IFileStorage = Depends(get_file_storage),
    cache_provider: ICacheProvider = Depends(get_cache_provider),
) -> ValidationService:
    """FastAPI dependency yielding the Validation service."""
    return ValidationService(
        validation_repository=validation_repo,
        product_repository=product_repo,
        file_storage=file_storage,
        cache_provider=cache_provider,
    )


def get_settings_service(
    settings_repo: SystemSettingRepository = Depends(get_system_setting_repository),
    settings: Settings = Depends(get_settings),
) -> SettingsService:
    """FastAPI dependency yielding the settings service."""
    return SettingsService(settings_repository=settings_repo, settings=settings)


def get_ai_processing_service(
    validation_repo: ValidationLogRepository = Depends(get_validation_repository),
    product_repo: ProductRepository = Depends(get_product_repository),
    file_storage: IFileStorage = Depends(get_file_storage),
    ai_provider: IAIProvider | None = Depends(get_ai_provider),
    settings: Settings = Depends(get_settings),
) -> AIProcessingService:
    """FastAPI dependency yielding the background AI processing service."""
    return AIProcessingService(
        validation_repository=validation_repo,
        product_repository=product_repo,
        file_storage=file_storage,
        ai_provider=ai_provider,
        provider_name=settings.ai_provider if ai_provider else None,
    )


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    settings: Settings = Depends(get_settings),
) -> AuthService:
    """FastAPI dependency yielding the User session authentication service."""
    return AuthService(user_repository=user_repo, settings=settings)


def get_report_service(
    validation_repo: ValidationLogRepository = Depends(get_validation_repository),
    product_repo: ProductRepository = Depends(get_product_repository),
) -> ReportService:
    """FastAPI dependency yielding the QA Audit reports service."""
    return ReportService(
        validation_repository=validation_repo,
        product_repository=product_repo,
    )

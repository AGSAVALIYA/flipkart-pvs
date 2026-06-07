"""Shared test fixtures for the Flipkart PVS test suite."""
from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.app.config import Settings
from src.auth.permissions import Role
from src.domain.interfaces.ai_provider import IAIProvider, LabelExtractionResult
from src.domain.interfaces.cache import ICacheProvider
from src.domain.interfaces.repositories import (
    IIngestionJobRepository,
    IProductRepository,
    IUserRepository,
    IValidationLogRepository,
)
from src.domain.interfaces.storage import IFileStorage


# ── Settings Override ─────────────────────────────────────────────────
@pytest.fixture
def test_settings() -> Settings:
    """Settings configured for testing."""
    return Settings(
        database_url="postgresql+asyncpg://test:test@localhost:5432/test_db",
        redis_url="redis://localhost:6379/1",
        jwt_secret_key="test-secret-key-for-testing-only",
        upload_dir="/tmp/test_uploads",
        image_dir="/tmp/test_images",
        enable_rbac=True,
        enable_vision_ai=False,
        cors_origins=["http://localhost:3000"],
    )


# ── Mock Repositories ────────────────────────────────────────────────
@pytest.fixture
def mock_product_repo() -> IProductRepository:
    """Mock product repository."""
    repo = AsyncMock(spec=IProductRepository)
    repo.get_by_wid = AsyncMock(return_value=None)
    repo.count = AsyncMock(return_value=0)
    repo.exists = AsyncMock(return_value=False)
    return repo


@pytest.fixture
def mock_validation_repo() -> IValidationLogRepository:
    """Mock validation log repository."""
    repo = AsyncMock(spec=IValidationLogRepository)
    repo.create = AsyncMock()
    repo.get_by_date_range = AsyncMock(return_value=[])
    repo.count_by_date_range = AsyncMock(return_value=0)
    repo.get_by_wid = AsyncMock(return_value=[])
    return repo


@pytest.fixture
def mock_user_repo() -> IUserRepository:
    """Mock user repository."""
    repo = AsyncMock(spec=IUserRepository)
    repo.get_by_username = AsyncMock(return_value=None)
    repo.get_by_id = AsyncMock(return_value=None)
    repo.list_all = AsyncMock(return_value=[])
    return repo


@pytest.fixture
def mock_ingestion_repo() -> IIngestionJobRepository:
    """Mock ingestion job repository."""
    repo = AsyncMock(spec=IIngestionJobRepository)
    repo.create = AsyncMock()
    repo.update_status = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_recent = AsyncMock(return_value=[])
    return repo


# ── Mock Infrastructure ──────────────────────────────────────────────
@pytest.fixture
def mock_file_storage() -> IFileStorage:
    """Mock file storage."""
    storage = AsyncMock(spec=IFileStorage)
    storage.save_upload = AsyncMock(return_value="uploads/test.csv")
    storage.save_image = AsyncMock(return_value="images/test.jpg")
    storage.get_file_path = MagicMock(return_value="/tmp/test_uploads/test.csv")
    storage.delete = AsyncMock()
    return storage


@pytest.fixture
def mock_cache() -> ICacheProvider:
    """Mock cache provider."""
    cache = AsyncMock(spec=ICacheProvider)
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    cache.delete = AsyncMock()
    cache.exists = AsyncMock(return_value=False)
    return cache


@pytest.fixture
def mock_ai_provider() -> IAIProvider:
    """Mock AI provider."""
    provider = AsyncMock(spec=IAIProvider)
    provider.extract_label_text = AsyncMock(
        return_value=LabelExtractionResult(
            ean="1234567890123",
            manufacturing_date="2024-01-01",
            expiry_date="2025-01-01",
            confidence=0.95,
            raw_text="EAN: 1234567890123\nMFG: 2024-01-01\nEXP: 2025-01-01",
        )
    )
    return provider


# ── Sample Data ───────────────────────────────────────────────────────
@pytest.fixture
def sample_product_data() -> dict:
    """Sample product data for testing."""
    return {
        "wid": "TEST-WID-001",
        "ean": "1234567890123",
        "manufacturing_date": date(2024, 1, 15),
        "expiry_date": date(2025, 6, 15),
    }


@pytest.fixture
def sample_user_data() -> dict:
    """Sample user data for testing."""
    return {
        "id": uuid.uuid4(),
        "username": "test_operator",
        "role": Role.OPERATOR,
        "is_active": True,
        "created_at": datetime.now(UTC),
    }

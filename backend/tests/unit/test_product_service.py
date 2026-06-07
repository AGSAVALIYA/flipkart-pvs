"""Unit tests for the ProductService."""
from __future__ import annotations

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.domain.exceptions import ProductNotFoundError
from src.products.service import ProductService


@pytest.fixture
def product_service(
    mock_product_repo,
    mock_file_storage,
    mock_cache,
    mock_ingestion_repo,
) -> ProductService:
    """Create ProductService with mock dependencies."""
    bulk_loader = AsyncMock()
    return ProductService(
        product_repository=mock_product_repo,
        file_storage=mock_file_storage,
        cache_provider=mock_cache,
        ingestion_repository=mock_ingestion_repo,
        bulk_loader=bulk_loader,
    )


class TestGetProduct:
    """Tests for ProductService.get_product."""

    async def test_returns_product_from_cache(
        self, product_service: ProductService, mock_cache
    ):
        """Should return cached product when available."""
        cached_data = '{"wid": "W001", "ean": "123", "manufacturing_date": "2024-01-01", "expiry_date": "2025-01-01"}'
        mock_cache.get.return_value = cached_data

        result = await product_service.get_product("W001")

        mock_cache.get.assert_awaited_once_with("product:W001")
        assert result is not None

    async def test_fetches_from_db_on_cache_miss(
        self, product_service: ProductService, mock_cache, mock_product_repo
    ):
        """Should query DB when cache misses and cache the result."""
        mock_cache.get.return_value = None

        mock_product = MagicMock()
        mock_product.wid = "W001"
        mock_product.ean = "1234567890123"
        mock_product.manufacturing_date = date(2024, 1, 1)
        mock_product.expiry_date = date(2025, 1, 1)
        mock_product_repo.get_by_wid.return_value = mock_product

        result = await product_service.get_product("W001")

        mock_product_repo.get_by_wid.assert_awaited_once_with("W001")
        assert result is not None

    async def test_raises_not_found_for_missing_product(
        self, product_service: ProductService, mock_cache, mock_product_repo
    ):
        """Should raise ProductNotFoundError when product doesn't exist."""
        mock_cache.get.return_value = None
        mock_product_repo.get_by_wid.return_value = None

        with pytest.raises(ProductNotFoundError):
            await product_service.get_product("NONEXISTENT")


class TestUploadCsv:
    """Tests for ProductService.upload_csv."""

    async def test_creates_ingestion_job(
        self, product_service: ProductService, mock_file_storage, mock_ingestion_repo
    ):
        """Should save file and create an ingestion job record."""
        mock_file_storage.save_upload.return_value = "uploads/test.csv"
        mock_ingestion_repo.create.return_value = MagicMock(
            id=uuid.uuid4(), status="pending"
        )

        result = await product_service.upload_csv(
            file_content=b"WID,EAN,Manufacturing_Date,Expiry_Date\n",
            filename="test.csv",
            created_by="admin-1",
        )

        mock_file_storage.save_upload.assert_awaited_once()
        mock_ingestion_repo.create.assert_awaited_once()
        assert result is not None

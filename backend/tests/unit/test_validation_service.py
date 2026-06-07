"""Unit tests for the ValidationService."""
from __future__ import annotations

from datetime import UTC, date, datetime
from unittest.mock import MagicMock

import pytest

from src.domain.exceptions import ProductNotFoundError
from src.shared.pagination import PaginationParams
from src.validation.service import ValidationService


@pytest.fixture
def validation_service(
    mock_validation_repo,
    mock_product_repo,
    mock_file_storage,
    mock_cache,
) -> ValidationService:
    """Create ValidationService with mock dependencies."""
    return ValidationService(
        validation_repository=mock_validation_repo,
        product_repository=mock_product_repo,
        file_storage=mock_file_storage,
        cache_provider=mock_cache,
    )


class TestVerifyProduct:
    """Tests for ValidationService.verify_product."""

    async def test_raises_error_for_unknown_wid(
        self, validation_service: ValidationService, mock_product_repo
    ):
        """Should raise ProductNotFoundError if WID doesn't exist."""
        mock_product_repo.get_by_wid.return_value = None

        with pytest.raises(ProductNotFoundError):
            await validation_service.verify_product(
                wid="NONEXISTENT",
                validation_status="VERIFIED",
                image_data=b"fake-image",
                image_filename="photo.jpg",
                verified_by="operator-1",
                notes=None,
            )

    async def test_creates_validation_log_on_success(
        self,
        validation_service: ValidationService,
        mock_product_repo,
        mock_file_storage,
        mock_validation_repo,
    ):
        """Should save image and create validation log for valid WID."""
        mock_product = MagicMock()
        mock_product.wid = "W001"
        mock_product.ean = "1234567890123"
        mock_product.manufacturing_date = date(2024, 1, 1)
        mock_product.expiry_date = date(2025, 1, 1)
        mock_product_repo.get_by_wid.return_value = mock_product
        mock_file_storage.save_image.return_value = "images/test-uuid.jpg"

        mock_log = MagicMock()
        mock_log.id = 1
        mock_log.wid = "W001"
        mock_log.captured_image_url = "images/test-uuid.jpg"
        mock_log.validation_status = "VERIFIED"
        mock_log.verified_by = "operator-1"
        mock_log.verified_at = datetime.now(UTC)
        mock_log.ai_extraction = None
        mock_log.ai_match_result = None
        mock_log.ai_processing_mode = None
        mock_log.ai_processing_status = None
        mock_log.ai_provider_name = None
        mock_log.ai_error_message = None
        mock_log.ai_processed_at = None
        mock_log.notes = "Looks good"
        mock_validation_repo.create.return_value = mock_log

        result = await validation_service.verify_product(
            wid="W001",
            validation_status="VERIFIED",
            image_data=b"fake-image",
            image_filename="photo.jpg",
            verified_by="operator-1",
            notes="Looks good",
        )

        mock_file_storage.save_image.assert_awaited_once()
        mock_validation_repo.create.assert_awaited_once()


class TestGetLogsByDateRange:
    """Tests for ValidationService.get_logs_by_date_range."""

    async def test_returns_paginated_logs(
        self, validation_service: ValidationService, mock_validation_repo
    ):
        """Should return paginated results for date range."""
        mock_validation_repo.get_by_date_range.return_value = []
        mock_validation_repo.count_by_date_range.return_value = 0

        result = await validation_service.get_logs_by_date_range(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            pagination=PaginationParams(page=1, page_size=20),
        )

        mock_validation_repo.get_by_date_range.assert_awaited_once()
        mock_validation_repo.count_by_date_range.assert_awaited_once()

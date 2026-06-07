"""ValidationService handles physical package inspections and Vision-AI checks.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import datetime

from src.domain.exceptions import DomainError, ErrorCode, ProductNotFoundError
from src.domain.interfaces.cache import ICacheProvider
from src.domain.interfaces.repositories import (
    IProductRepository,
    IValidationLogRepository,
)
from src.domain.interfaces.storage import IFileStorage
from src.products.schemas import ProductResponse
from src.shared.datetime_utils import utc_now
from src.shared.pagination import PaginationParams
from src.validation.models import ValidationLog
from src.validation.schemas import ValidationResponse, ValidationWithProductResponse

logger = logging.getLogger(__name__)


class ValidationService:
    """Business logic for verifying product packages and queuing AI checks."""

    def __init__(
        self,
        validation_repository: IValidationLogRepository,
        product_repository: IProductRepository,
        file_storage: IFileStorage,
        cache_provider: ICacheProvider,
    ) -> None:
        self._repo = validation_repository
        self._product_repo = product_repository
        self._storage = file_storage
        self._cache = cache_provider

    async def verify_product(
        self,
        wid: str,
        validation_status: str,
        image_data: bytes,
        image_filename: str,
        verified_by: str,
        notes: str | None = None,
        ai_processing_mode: str | None = None,
        ai_processing_status: str | None = None,
        ai_provider_name: str | None = None,
        ai_error_message: str | None = None,
    ) -> ValidationWithProductResponse:
        """Process operator package inspection and create a validation log.

        Args:
            wid: The product warehouse identifier.
            validation_status: Status submitted by operator (VERIFIED, MISMATCH).
            image_data: Captured image bytes.
            image_filename: Filename of the captured image.
            verified_by: Username of the operator.
            notes: Optional text notes.

        Returns:
            ValidationWithProductResponse detailing database and extraction results.
        """
        # Look up product from DB (raises 404 if not found)
        product = await self._product_repo.get_by_wid(wid)
        if not product:
            raise ProductNotFoundError(wid)

        # Save verification photo to local storage (auto-sanitized)
        saved_path = await self._storage.save_image(image_data, image_filename)

        # Persist validation log
        log_record = {
            "wid": wid,
            "captured_image_url": saved_path,
            "validation_status": validation_status,
            "verified_by": verified_by,
            "verified_at": utc_now(),
            "ai_extraction": None,
            "ai_match_result": None,
            "ai_processing_mode": ai_processing_mode,
            "ai_processing_status": ai_processing_status,
            "ai_provider_name": ai_provider_name,
            "ai_error_message": ai_error_message,
            "ai_processed_at": None,
            "notes": notes,
        }
        log = await self._repo.create(log_record)

        # Evict product cache to force refresh of last verification dates/counts if applicable
        await self._cache.delete(f"product:{wid}")

        return ValidationWithProductResponse(
            validation=ValidationResponse.model_validate(log),
            product=ProductResponse.model_validate(product),
        )

    async def get_logs_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        pagination: PaginationParams,
    ) -> tuple[Sequence[ValidationLog], int]:
        """Query validation logs within a date range."""
        offset = (pagination.page - 1) * pagination.page_size
        logs = await self._repo.get_by_date_range(
            start=start_date,
            end=end_date,
            offset=offset,
            limit=pagination.page_size,
        )
        total = await self._repo.count_by_date_range(start_date, end_date)
        return logs, total

    async def get_product_validation_history(self, wid: str) -> list[ValidationResponse]:
        """Fetch all validation history for a WID."""
        logs = await self._repo.get_by_wid(wid)
        return [ValidationResponse.model_validate(log) for log in logs]

    async def get_validation_log(self, log_id: int) -> ValidationResponse:
        """Fetch a single validation log for detail dialogs."""
        log = await self._repo.get_by_id(log_id)
        if not log:
            raise DomainError(
                code=ErrorCode.NOT_FOUND,
                message=f"Validation log not found: {log_id}",
                status_code=404,
            )
        return ValidationResponse.model_validate(log)

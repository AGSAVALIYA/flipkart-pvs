"""Background AI processing orchestration for validation logs."""

from __future__ import annotations

import logging

from src.domain.exceptions import DomainError, ErrorCode, ValidationError
from src.domain.interfaces.ai_provider import IAIProvider
from src.domain.interfaces.repositories import (
    IProductRepository,
    IValidationLogRepository,
)
from src.domain.interfaces.storage import IFileStorage
from src.shared.datetime_utils import utc_now
from src.validation.ai_utils import build_ai_extraction_payload, cross_validate_product
from src.validation.models import ValidationLog

logger = logging.getLogger(__name__)


class AIProcessingService:
    """Queues and executes provider-backed AI analysis for validation logs."""

    def __init__(
        self,
        validation_repository: IValidationLogRepository,
        product_repository: IProductRepository,
        file_storage: IFileStorage,
        ai_provider: IAIProvider | None,
        provider_name: str | None,
    ) -> None:
        self._repo = validation_repository
        self._product_repo = product_repository
        self._storage = file_storage
        self._ai = ai_provider
        self._provider_name = provider_name if ai_provider else None

    @property
    def is_available(self) -> bool:
        """Return whether a provider is configured for background processing."""
        return self._ai is not None

    @property
    def provider_name(self) -> str | None:
        """Return the configured provider name when available."""
        return self._provider_name

    async def request_processing(self, log_id: int) -> ValidationLog:
        """Mark a validation log as queued for background AI processing."""
        log = await self._repo.get_by_id(log_id)
        if not log:
            raise DomainError(
                code=ErrorCode.NOT_FOUND,
                message=f"Validation log not found: {log_id}",
                status_code=404,
            )

        if log.ai_processing_mode == "not_allowed":
            raise ValidationError("AI processing is not allowed for this validation record.")

        if log.ai_processing_status in {"queued", "processing"}:
            raise DomainError(
                code=ErrorCode.CONFLICT,
                message="AI processing is already in progress for this validation log.",
                status_code=409,
            )

        if not self._ai:
            raise ValidationError("AI provider is not configured.")

        updated = await self._repo.update(
            log_id,
            {
                "ai_processing_status": "queued",
                "ai_provider_name": self.provider_name,
                "ai_error_message": None,
                "ai_extraction": None,
                "ai_match_result": None,
                "ai_processed_at": None,
            },
        )
        if not updated:
            raise DomainError(
                code=ErrorCode.NOT_FOUND,
                message=f"Validation log not found: {log_id}",
                status_code=404,
            )
        return updated

    async def process_log(self, log_id: int) -> None:
        """Execute provider-backed AI processing for a queued validation log."""
        log = await self._repo.get_by_id(log_id)
        if not log:
            logger.warning("Skipping AI processing for missing validation log %s", log_id)
            return

        if not self._ai:
            await self._repo.update(
                log_id,
                {
                    "ai_processing_status": "failed",
                    "ai_error_message": "AI provider is not configured.",
                    "ai_processed_at": utc_now(),
                },
            )
            return

        product = await self._product_repo.get_by_wid(log.wid)
        if not product:
            await self._repo.update(
                log_id,
                {
                    "ai_processing_status": "failed",
                    "ai_error_message": f"Product not found for WID {log.wid}.",
                    "ai_processed_at": utc_now(),
                },
            )
            return

        await self._repo.update(
            log_id,
            {
                "ai_processing_status": "processing",
                "ai_provider_name": self.provider_name,
                "ai_error_message": None,
            },
        )

        image_path = str(self._storage.get_file_path(log.captured_image_url))

        try:
            ai_result = await self._ai.extract_label_text(image_path)
            ai_extraction = build_ai_extraction_payload(ai_result)
            ai_match_result = cross_validate_product(product, ai_result)

            await self._repo.update(
                log_id,
                {
                    "ai_extraction": ai_extraction,
                    "ai_match_result": ai_match_result,
                    "ai_processing_status": "completed",
                    "ai_provider_name": self.provider_name,
                    "ai_error_message": None,
                    "ai_processed_at": utc_now(),
                },
            )
        except Exception as exc:
            logger.exception("Background AI processing failed for validation log %s", log_id)
            await self._repo.update(
                log_id,
                {
                    "ai_extraction": {"error": str(exc)},
                    "ai_match_result": "INCONCLUSIVE",
                    "ai_processing_status": "failed",
                    "ai_provider_name": self.provider_name,
                    "ai_error_message": str(exc),
                    "ai_processed_at": utc_now(),
                },
            )

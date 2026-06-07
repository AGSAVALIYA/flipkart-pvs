"""ReportService compiles audit statistics and paginated compliance logs.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, time

from src.domain.interfaces.repositories import (
    IProductRepository,
    IValidationLogRepository,
)
from src.reports.schemas import ReportResponse, ReportRow, ReportSummary
from src.shared.pagination import PaginationParams, paginate

logger = logging.getLogger(__name__)


class ReportService:
    """Business logic for generating warehouse QA audit reports."""

    def __init__(
        self,
        validation_repository: IValidationLogRepository,
        product_repository: IProductRepository,
    ) -> None:
        self._validation_repo = validation_repository
        self._product_repo = product_repository

    async def generate_report(
        self,
        start_date: date,
        end_date: date,
        pagination: PaginationParams,
    ) -> ReportResponse:
        """Compile aggregate counts and retrieve a paginated page of audit logs.

        Args:
            start_date: Lower date bound.
            end_date: Upper date bound.
            pagination: Offset pagination parameters.

        Returns:
            ReportResponse containing statistical summaries and detail logs.
        """
        # Convert date objects to timezone-aware UTC datetime bounds
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=UTC)
        end_dt = datetime.combine(end_date, time.max).replace(tzinfo=UTC)

        # 1. Fetch status aggregate counts in a single efficient query
        status_counts = await self._validation_repo.get_status_counts(start_dt, end_dt)
        verified_count = status_counts.get("VERIFIED", 0)
        mismatch_count = status_counts.get("MISMATCH", 0)
        pending_count = status_counts.get("PENDING", 0)
        total_verifications = verified_count + mismatch_count + pending_count

        summary = ReportSummary(
            total_verifications=total_verifications,
            verified_count=verified_count,
            mismatch_count=mismatch_count,
            pending_count=pending_count,
            date_range_start=start_dt,
            date_range_end=end_dt,
        )

        # 2. Fetch the paginated log records for the current page
        offset = (pagination.page - 1) * pagination.page_size
        logs = await self._validation_repo.get_by_date_range(
            start=start_dt,
            end=end_dt,
            offset=offset,
            limit=pagination.page_size,
        )

        # 3. Transform logs into ReportRow models
        rows: list[ReportRow] = []
        for log in logs:
            # Safely fetch EAN from foreign key product relation
            ean_val = log.product.ean if log.product else "—"
            rows.append(
                ReportRow(
                    id=log.id,
                    wid=log.wid,
                    ean=ean_val,
                    validation_status=log.validation_status,
                    verified_by=log.verified_by,
                    verified_at=log.verified_at,
                    ai_match_result=log.ai_match_result,
                    ai_processing_status=log.ai_processing_status,
                )
            )

        # 4. Paginate report table rows
        paginated_logs = paginate(rows, total_verifications, pagination)

        return ReportResponse(summary=summary, logs=paginated_logs)

    async def get_report_summary(self, start_date: date, end_date: date) -> ReportSummary:
        """Fetch report statistics only (without log detail rows).

        Args:
            start_date: Lower date bound.
            end_date: Upper date bound.

        Returns:
            ReportSummary structure.
        """
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=UTC)
        end_dt = datetime.combine(end_date, time.max).replace(tzinfo=UTC)

        status_counts = await self._validation_repo.get_status_counts(start_dt, end_dt)
        verified_count = status_counts.get("VERIFIED", 0)
        mismatch_count = status_counts.get("MISMATCH", 0)
        pending_count = status_counts.get("PENDING", 0)
        total_verifications = verified_count + mismatch_count + pending_count

        return ReportSummary(
            total_verifications=total_verifications,
            verified_count=verified_count,
            mismatch_count=mismatch_count,
            pending_count=pending_count,
            date_range_start=start_dt,
            date_range_end=end_dt,
        )

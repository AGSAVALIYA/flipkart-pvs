"""SQLAlchemy implementation of IValidationLogRepository.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.interfaces.repositories import IValidationLogRepository
from src.shared.datetime_utils import utc_now
from src.validation.models import ValidationLog


class ValidationLogRepository(IValidationLogRepository):
    """Handles persistence and retrieval of ValidationLog records."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, record: dict[str, Any]) -> ValidationLog:
        """Persist a new validation log entry.

        Args:
            record: Dict of validation log fields.

        Returns:
            The created ValidationLog instance.
        """
        log = ValidationLog(**record)
        log.verified_at = record.get("verified_at") or utc_now()
        self._db.add(log)
        await self._db.commit()
        await self._db.refresh(log)

        # Eagerly load the product relationship
        stmt = (
            select(ValidationLog)
            .where(ValidationLog.id == log.id)
            .options(selectinload(ValidationLog.product))
        )
        res = await self._db.execute(stmt)
        return res.scalar_one()

    async def get_by_date_range(
        self,
        start: datetime,
        end: datetime,
        offset: int = 0,
        limit: int = 20,
    ) -> Sequence[ValidationLog]:
        """Fetch logs within a date range with offset pagination.

        Args:
            start: Start timestamp (timezone aware).
            end: End timestamp (timezone aware).
            offset: Query offset.
            limit: Query page size.

        Returns:
            Sequence of matching ValidationLog objects.
        """
        stmt = (
            select(ValidationLog)
            .where(ValidationLog.verified_at >= start, ValidationLog.verified_at <= end)
            .options(selectinload(ValidationLog.product))
            .order_by(desc(ValidationLog.verified_at))
            .offset(offset)
            .limit(limit)
        )
        result = await self._db.execute(stmt)
        return result.scalars().all()

    async def count_by_date_range(self, start: datetime, end: datetime) -> int:
        """Count the total number of validation logs in a date range.

        Args:
            start: Start timestamp.
            end: End timestamp.

        Returns:
            The total count.
        """
        stmt = (
            select(func.count())
            .select_from(ValidationLog)
            .where(ValidationLog.verified_at >= start, ValidationLog.verified_at <= end)
        )
        result = await self._db.execute(stmt)
        return result.scalar() or 0

    async def get_by_wid(self, wid: str) -> Sequence[ValidationLog]:
        """Fetch all validation logs associated with a WID.

        Args:
            wid: The product warehouse identifier.

        Returns:
            Sequence of ValidationLog records.
        """
        stmt = (
            select(ValidationLog)
            .where(ValidationLog.wid == wid)
            .options(selectinload(ValidationLog.product))
            .order_by(desc(ValidationLog.verified_at))
        )
        result = await self._db.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, log_id: int) -> ValidationLog | None:
        """Fetch a single validation log by primary key."""
        stmt = (
            select(ValidationLog)
            .where(ValidationLog.id == log_id)
            .options(selectinload(ValidationLog.product))
        )
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, log_id: int, updates: dict[str, Any]) -> ValidationLog | None:
        """Update a validation log and return the refreshed record."""
        log = await self.get_by_id(log_id)
        if not log:
            return None

        for key, value in updates.items():
            if hasattr(log, key):
                setattr(log, key, value)

        await self._db.commit()
        await self._db.refresh(log)

        stmt = (
            select(ValidationLog)
            .where(ValidationLog.id == log_id)
            .options(selectinload(ValidationLog.product))
        )
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_status_counts(self, start: datetime, end: datetime) -> dict[str, int]:
        """Aggregate validation counts grouped by validation status in a date range.

        Args:
            start: Inclusive start datetime (UTC).
            end: Inclusive end datetime (UTC).

        Returns:
            Dictionary mapping status string to count.
        """
        stmt = (
            select(ValidationLog.validation_status, func.count())
            .where(ValidationLog.verified_at >= start, ValidationLog.verified_at <= end)
            .group_by(ValidationLog.validation_status)
        )
        result = await self._db.execute(stmt)
        return {status: count for status, count in result.all()}


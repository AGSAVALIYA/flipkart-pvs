"""SQLAlchemy implementation of IIngestionJobRepository.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import case, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.interfaces.repositories import IIngestionJobRepository
from src.products.ingestion_models import IngestionJob
from src.shared.datetime_utils import utc_now


class IngestionJobRepository(IIngestionJobRepository):
    """Handles persistence and updates of IngestionJob tasks."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, record: dict[str, Any]) -> IngestionJob:
        """Persist a new ingestion job entry.

        Args:
            record: Dict of job fields.

        Returns:
            The created IngestionJob instance.
        """
        job = IngestionJob(**record)
        job.created_at = utc_now()
        self._db.add(job)
        await self._db.commit()
        await self._db.refresh(job)
        return job

    async def update_status(
        self,
        job_id: uuid.UUID,
        status: str,
        *,
        result: dict[str, Any] | None = None,
    ) -> IngestionJob | None:
        """Update job status and progress details.

        Args:
            job_id: UUID identifying the job.
            status: The new status string.
            result: Optional dictionary containing success/error details.

        Returns:
            The updated IngestionJob or None if not found.
        """
        now = utc_now()
        update_values: dict[str, Any] = {
            "status": status,
        }
        if status == "processing":
            update_values["started_at"] = case(
                (IngestionJob.started_at.is_(None), now),
                else_=IngestionJob.started_at,
            )
        elif status in ("completed", "failed"):
            update_values["completed_at"] = now

        if result:
            if "total_rows" in result:
                update_values["total_rows"] = result["total_rows"]
            if "processed_rows" in result:
                update_values["processed_rows"] = result["processed_rows"]
            if "error_count" in result:
                update_values["error_count"] = result["error_count"]
            if "errors" in result:
                update_values["error_details"] = result["errors"]

        stmt = (
            update(IngestionJob)
            .where(IngestionJob.id == job_id)
            .values(**update_values)
            .returning(IngestionJob)
        )
        res = await self._db.execute(stmt)
        job = res.scalar_one_or_none()
        if job is None:
            await self._db.rollback()
            return None

        await self._db.commit()
        return job

    async def get_by_id(self, job_id: uuid.UUID) -> IngestionJob | None:
        """Find an ingestion job by ID.

        Args:
            job_id: UUID identifying the job.

        Returns:
            The IngestionJob instance or None if not found.
        """
        stmt = select(IngestionJob).where(IngestionJob.id == job_id)
        res = await self._db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_recent(
        self,
        *,
        offset: int = 0,
        limit: int = 10,
    ) -> tuple[Sequence[IngestionJob], int]:
        """Fetch the most recent ingestion jobs.

        Args:
            offset: Number of jobs to skip.
            limit: Maximum number of jobs to return.

        Returns:
            Tuple of (jobs, total count) with active jobs first, then newest first.
        """
        active_first = case(
            (IngestionJob.status.in_(("pending", "processing")), 0),
            else_=1,
        )
        stmt = (
            select(IngestionJob)
            .order_by(active_first, desc(IngestionJob.created_at))
            .offset(offset)
            .limit(limit)
        )
        total_stmt = select(func.count()).select_from(IngestionJob)

        rows_res = await self._db.execute(stmt)
        total_res = await self._db.execute(total_stmt)
        return rows_res.scalars().all(), int(total_res.scalar_one())

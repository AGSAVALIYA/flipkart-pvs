"""Repository protocol definitions for the domain layer.

All repository contracts are expressed as ``typing.Protocol`` so that the domain
layer has zero imports from infrastructure.  Concrete implementations live in
each vertical slice's ``repository.py``.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Protocol


class IProductRepository(Protocol):
    """Contract for product persistence operations."""

    async def get_by_wid(self, wid: str) -> Any | None:
        """Retrieve a single product by its Warehouse ID (WID).

        Args:
            wid: The warehouse identifier string.

        Returns:
            The product record, or ``None`` if not found.
        """
        ...

    async def bulk_insert(self, records: Sequence[dict[str, Any]]) -> int:
        """Insert multiple product records in a single batch.

        Args:
            records: Sequence of dicts, each representing a product row.

        Returns:
            Number of records successfully inserted.
        """
        ...

    async def count(self) -> int:
        """Return the total number of products in the store."""
        ...

    async def exists(self, wid: str) -> bool:
        """Check whether a product with the given WID exists.

        Args:
            wid: The warehouse identifier to look up.

        Returns:
            ``True`` if the product exists, ``False`` otherwise.
        """
        ...


class IValidationLogRepository(Protocol):
    """Contract for validation-log persistence operations."""

    async def create(self, record: dict[str, Any]) -> Any:
        """Persist a new validation log entry.

        Args:
            record: Dict of validation log fields.

        Returns:
            The created validation log record.
        """
        ...

    async def get_by_date_range(
        self,
        start: datetime,
        end: datetime,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> Sequence[Any]:
        """Retrieve validation logs within a date range.

        Args:
            start: Inclusive start datetime (UTC).
            end: Inclusive end datetime (UTC).
            offset: Number of records to skip (pagination).
            limit: Maximum records to return.

        Returns:
            Sequence of validation log records.
        """
        ...

    async def count_by_date_range(self, start: datetime, end: datetime) -> int:
        """Count validation logs within a date range.

        Args:
            start: Inclusive start datetime (UTC).
            end: Inclusive end datetime (UTC).

        Returns:
            Total count of matching records.
        """
        ...

    async def get_status_counts(self, start: datetime, end: datetime) -> dict[str, int]:
        """Aggregate validation counts grouped by validation status in a date range.

        Args:
            start: Inclusive start datetime (UTC).
            end: Inclusive end datetime (UTC).

        Returns:
            Dictionary mapping status string to count.
        """
        ...

    async def get_by_wid(self, wid: str) -> Sequence[Any]:
        """Retrieve all validation logs for a specific WID.

        Args:
            wid: The warehouse identifier.

        Returns:
            Sequence of validation log records for the given WID.
        """
        ...

    async def get_by_id(self, log_id: int) -> Any | None:
        """Retrieve a single validation log by primary key.

        Args:
            log_id: Validation log primary key.

        Returns:
            The validation log record, or ``None`` if not found.
        """
        ...

    async def update(self, log_id: int, updates: dict[str, Any]) -> Any | None:
        """Update an existing validation log.

        Args:
            log_id: Validation log primary key.
            updates: Dictionary of fields to update.

        Returns:
            The updated validation log record, or ``None`` if not found.
        """
        ...


class IUserRepository(Protocol):
    """Contract for user persistence operations."""

    async def create(self, record: dict[str, Any]) -> Any:
        """Persist a new user record.

        Args:
            record: Dict of user fields (username, hashed_password, role, etc.).

        Returns:
            The created user record.
        """
        ...

    async def get_by_username(self, username: str) -> Any | None:
        """Look up a user by username.

        Args:
            username: The unique username.

        Returns:
            The user record, or ``None`` if not found.
        """
        ...

    async def get_by_id(self, user_id: uuid.UUID) -> Any | None:
        """Look up a user by primary key.

        Args:
            user_id: The user's UUID primary key.

        Returns:
            The user record, or ``None`` if not found.
        """
        ...

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Any], int]:
        """List all users with pagination.

        Args:
            offset: Number of records to skip.
            limit: Maximum records to return.

        Returns:
            Tuple of (user records, total count).
        """
        ...

    async def update(self, user_id: uuid.UUID, data: dict[str, Any]) -> Any | None:
        """Update an existing user.

        Args:
            user_id: The user's UUID primary key.
            data: Dict of fields to update.

        Returns:
            The updated user record, or ``None`` if not found.
        """
        ...

    async def delete(self, user_id: uuid.UUID) -> bool:
        """Delete a user by primary key.

        Args:
            user_id: The user's UUID primary key.

        Returns:
            ``True`` if the user was deleted, ``False`` if not found.
        """
        ...


class IIngestionJobRepository(Protocol):
    """Contract for ingestion job tracking."""

    async def create(self, record: dict[str, Any]) -> Any:
        """Persist a new ingestion job record.

        Args:
            record: Dict of job fields (filename, status, etc.).

        Returns:
            The created job record.
        """
        ...

    async def update_status(
        self,
        job_id: uuid.UUID,
        status: str,
        *,
        result: dict[str, Any] | None = None,
    ) -> Any | None:
        """Update the status (and optional result) of an ingestion job.

        Args:
            job_id: The job's UUID primary key.
            status: New status value (e.g. "processing", "completed", "failed").
            result: Optional result payload to store.

        Returns:
            The updated job record, or ``None`` if not found.
        """
        ...

    async def get_by_id(self, job_id: uuid.UUID) -> Any | None:
        """Retrieve a single ingestion job by ID.

        Args:
            job_id: The job's UUID primary key.

        Returns:
            The job record, or ``None`` if not found.
        """
        ...

    async def get_recent(
        self,
        *,
        offset: int = 0,
        limit: int = 10,
    ) -> tuple[Sequence[Any], int]:
        """Retrieve the most recent ingestion jobs.

        Args:
            offset: Number of jobs to skip.
            limit: Maximum number of jobs to return.

        Returns:
            Tuple of (job records, total count), most recent first.
        """
        ...

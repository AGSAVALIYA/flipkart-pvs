"""SQLAlchemy model for tracking bulk CSV ingestion jobs.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database import Base


class IngestionJob(Base):
    """SQLAlchemy model tracking background ingestion jobs."""

    __tablename__ = "ingestion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",  # pending, processing, completed, failed
    )
    total_rows: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    processed_rows: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    error_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    error_details: Mapped[dict | list | None] = mapped_column(
        JSON,
        nullable=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
    created_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

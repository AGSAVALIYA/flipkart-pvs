"""SQLAlchemy model for product validation logs.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database import Base


class ValidationLog(Base):
    """SQLAlchemy model logging physical verification checks."""

    __tablename__ = "validation_logs"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    wid: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("products.wid", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    captured_image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    validation_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,  # VERIFIED, MISMATCH, PENDING
    )
    verified_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,  # B-Tree index for fast date-range queries
    )
    ai_extraction: Mapped[dict | list | None] = mapped_column(
        JSON,
        nullable=True,
    )
    ai_match_result: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,  # MATCH, MISMATCH, INCONCLUSIVE
    )
    ai_processing_mode: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    ai_processing_status: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        index=True,
    )
    ai_provider_name: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    ai_error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    ai_processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationship back to the Product reference
    product: Mapped[Product] = relationship(
        "Product",
        foreign_keys=[wid],
    )

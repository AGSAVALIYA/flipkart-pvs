"""SQLAlchemy model for product records.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database import Base, TimestampMixin


class Product(Base, TimestampMixin):
    """SQLAlchemy model representing a product reference in the inventory."""

    __tablename__ = "products"

    wid: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        index=True,
    )
    ean: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    manufacturing_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    expiry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

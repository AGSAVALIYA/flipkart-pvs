"""SQLAlchemy User model for authentication and RBAC.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database import Base, TimestampMixin


class User(Base, TimestampMixin):
    """SQLAlchemy model representing a system user."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="operator",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Self-referencing relationship for user creation audit logs
    creator: Mapped[User | None] = relationship(
        "User",
        remote_side=[id],
        back_populates="created_users",
    )
    created_users: Mapped[list[User]] = relationship(
        "User",
        back_populates="creator",
    )

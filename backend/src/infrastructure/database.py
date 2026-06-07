"""Async SQLAlchemy engine, session factory, and base model configuration.

Uses ``asyncpg`` as the async PostgreSQL driver. All models inherit from
``Base`` which enforces a consistent naming convention for constraints.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime

from sqlalchemy import MetaData, func
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TIMESTAMP

from src.app.config import get_settings

# ──────────────────────────────────────────────────────────────────────
# Naming convention ensures deterministic constraint names for Alembic
# ──────────────────────────────────────────────────────────────────────
NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(AsyncAttrs, DeclarativeBase):
    """Declarative base for all ORM models.

    Uses a custom ``MetaData`` with a naming convention dict so that
    Alembic autogenerate can produce deterministic constraint names.
    """

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    """Mixin that adds ``created_at`` and ``updated_at`` columns.

    Both columns are ``TIMESTAMP WITH TIME ZONE`` and default to the
    database server's ``now()`` function.  ``updated_at`` is also
    refreshed automatically on every ``UPDATE``.
    """

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ──────────────────────────────────────────────────────────────────────
# Engine & session factory  (lazy-initialised on first import)
# ──────────────────────────────────────────────────────────────────────
def _build_engine():
    """Build the async engine from current settings."""
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        echo=False,
    )


def _build_session_factory(engine):
    """Build an async session factory bound to *engine*."""
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


# Singletons – initialised lazily by ``get_db_session``.
_engine = None
_session_factory = None


def get_engine():
    """Return the global async engine, creating it on first call."""
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def get_session_factory():
    """Return the global session factory, creating it on first call."""
    global _session_factory
    if _session_factory is None:
        _session_factory = _build_session_factory(get_engine())
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession]:
    """FastAPI dependency that yields an ``AsyncSession``.

    The session is automatically closed after the request finishes.

    Yields:
        An ``AsyncSession`` instance scoped to the current request.
    """
    factory = get_session_factory()
    async with factory() as session:
        yield session

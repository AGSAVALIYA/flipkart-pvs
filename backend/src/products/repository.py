"""SQLAlchemy implementation of IProductRepository.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.interfaces.repositories import IProductRepository
from src.products.models import Product


class ProductRepository(IProductRepository):
    """Handles persistence and retrieval of Product records."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_wid(self, wid: str) -> Product | None:
        """Find a product by its Warehouse ID (WID).

        Args:
            wid: Unique warehouse identifier.

        Returns:
            The Product model instance or None if not found.
        """
        stmt = select(Product).where(Product.wid == wid)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def bulk_insert(self, records: Sequence[dict[str, Any]]) -> int:
        """Insert a list of products in bulk.

        In production, this is delegated to the PostgresBulkLoader,
        but we implement a fallback or schema mock insertion here if called.

        Args:
            records: List of dictionaries of product details.

        Returns:
            The count of inserted records.
        """
        objects = [Product(**rec) for rec in records]
        self._db.add_all(objects)
        await self._db.commit()
        return len(objects)

    async def count(self) -> int:
        """Count the total number of products in inventory."""
        # For small-to-medium tables (<20M), we run an exact count for accuracy.
        # For massive tables (20M+), we query the pg_class table statistics for a sub-millisecond estimate.
        from sqlalchemy import text
        try:
            stmt = text("SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'products'")
            result = await self._db.execute(stmt)
            row = result.fetchone()
            if row and row[0] is not None:
                val = row[0]
                if val >= 20_000_000:
                    return val
        except Exception:
            pass
        # Fallback to exact count for smaller tables or if estimate is unavailable
        fallback_stmt = select(func.count()).select_from(Product)
        fallback_res = await self._db.execute(fallback_stmt)
        return fallback_res.scalar() or 0

    async def exists(self, wid: str) -> bool:
        """Check if a product with the given WID exists in the DB."""
        stmt = select(select(Product.wid).where(Product.wid == wid).exists())
        result = await self._db.execute(stmt)
        return bool(result.scalar())

"""Repository for persisted application settings."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.settings.models import SystemSetting


class SystemSettingRepository:
    """Persistence helpers for JSON-backed system settings."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get(self, key: str) -> SystemSetting | None:
        """Fetch a settings record by key."""
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, key: str, value: dict[str, Any]) -> SystemSetting:
        """Create or update a settings record."""
        record = await self.get(key)
        if record is None:
            record = SystemSetting(key=key, value=value)
            self._db.add(record)
        else:
            record.value = value

        await self._db.commit()
        await self._db.refresh(record)
        return record

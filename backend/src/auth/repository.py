"""SQLAlchemy implementation of IUserRepository.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.domain.interfaces.repositories import IUserRepository


class UserRepository(IUserRepository):
    """Handles persistence and retrieval of User records."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, record: dict[str, Any]) -> User:
        """Create and save a new user record.

        Args:
            record: Dictionary of user attributes.

        Returns:
            The created User instance.
        """
        user = User(**record)
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def get_by_username(self, username: str) -> User | None:
        """Find a user by username.

        Args:
            username: Username query.

        Returns:
            The User instance or None if not found.
        """
        stmt = select(User).where(User.username == username, User.is_active == True)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Find an active user by ID.

        Args:
            user_id: UUID of the user.

        Returns:
            The User instance or None if not found or inactive.
        """
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> Sequence[User]:
        """List all active users.

        Returns:
            List of active User objects.
        """
        stmt = select(User).where(User.is_active == True).order_by(User.username)
        result = await self._db.execute(stmt)
        return result.scalars().all()

    async def update(self, user_id: uuid.UUID, updates: dict[str, Any]) -> User | None:
        """Update an existing user record.

        Args:
            user_id: UUID of the user.
            updates: Dictionary of fields and new values.

        Returns:
            The updated User instance or None if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return None

        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)

        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def delete(self, user_id: uuid.UUID) -> bool:
        """Deactivate a user (soft-delete).

        Args:
            user_id: UUID of the user.

        Returns:
            True if the user was deactivated, False if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False

        user.is_active = False
        await self._db.commit()
        return True

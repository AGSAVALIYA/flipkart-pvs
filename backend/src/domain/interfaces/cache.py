"""Cache provider protocol definition.

Abstracts the caching layer so services can cache without depending on
Redis, Memcached, or any other concrete implementation.
"""

from __future__ import annotations

from typing import Protocol


class ICacheProvider(Protocol):
    """Contract for key-value cache operations."""

    async def get(self, key: str) -> str | None:
        """Retrieve a value from the cache.

        Args:
            key: The cache key.

        Returns:
            The cached string value, or ``None`` if the key doesn't exist
            or has expired.
        """
        ...

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        """Store a value in the cache.

        Args:
            key: The cache key.
            value: The string value to store.
            ttl_seconds: Optional time-to-live in seconds. ``None`` means
                the entry never expires (provider default may apply).
        """
        ...

    async def delete(self, key: str) -> None:
        """Remove a key from the cache.

        Args:
            key: The cache key to remove.
        """
        ...

    async def exists(self, key: str) -> bool:
        """Check whether a key exists in the cache.

        Args:
            key: The cache key to check.

        Returns:
            ``True`` if the key exists and hasn't expired, ``False`` otherwise.
        """
        ...

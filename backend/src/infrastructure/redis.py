"""Redis client wrapper and cache provider implementation.

Provides a thin ``RedisClient`` wrapper around ``redis.asyncio.Redis``
and a ``RedisCacheProvider`` that implements ``ICacheProvider`` for DI.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from src.app.config import get_settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Thin wrapper around ``redis.asyncio.Redis``.

    Centralises connection configuration and provides a clean interface
    for the rest of the application.
    """

    def __init__(self, url: str) -> None:
        self._url = url
        self._client: aioredis.Redis | None = None

    @property
    def client(self) -> aioredis.Redis:
        """Return the underlying ``redis.asyncio.Redis`` instance.

        Creates the connection pool lazily on first access.
        """
        if self._client is None:
            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying Redis connection pool."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


class RedisCacheProvider:
    """``ICacheProvider`` implementation backed by Redis.

    Stores complex values as JSON strings and deserialises on read.
    Simple string values are stored as-is.
    """

    def __init__(self, redis_client: RedisClient, default_ttl: int = 300) -> None:
        self._redis = redis_client
        self._default_ttl = default_ttl

    async def get(self, key: str) -> str | None:
        """Retrieve a value from Redis.

        Args:
            key: The cache key.

        Returns:
            The cached string value, or ``None`` if the key doesn't exist.
        """
        value = await self._redis.client.get(key)
        if value is None:
            return None
        return str(value)

    async def set(
        self,
        key: str,
        value: str,
        ttl_seconds: int | None = None,
    ) -> None:
        """Store a value in Redis with an optional TTL.

        Args:
            key: The cache key.
            value: The string value to store.
            ttl_seconds: Time-to-live in seconds. Falls back to the
                provider's ``default_ttl`` if ``None``.
        """
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        await self._redis.client.setex(key, ttl, value)

    async def delete(self, key: str) -> None:
        """Remove a key from Redis.

        Args:
            key: The cache key to delete.
        """
        await self._redis.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis.

        Args:
            key: The cache key.

        Returns:
            ``True`` if the key exists, ``False`` otherwise.
        """
        result = await self._redis.client.exists(key)
        return bool(result)

    # ── JSON convenience methods ──────────────────────────────────────

    async def get_json(self, key: str) -> Any | None:
        """Retrieve and JSON-decode a cached value.

        Args:
            key: The cache key.

        Returns:
            The deserialised Python object, or ``None``.
        """
        raw = await self.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set_json(
        self,
        key: str,
        value: Any,
        ttl_seconds: int | None = None,
    ) -> None:
        """JSON-encode and store a value in Redis.

        Args:
            key: The cache key.
            value: Any JSON-serialisable Python object.
            ttl_seconds: Optional time-to-live in seconds.
        """
        await self.set(key, json.dumps(value, default=str), ttl_seconds)


# ──────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────
_redis_client: RedisClient | None = None


def get_redis_client() -> RedisClient:
    """Return the global ``RedisClient`` singleton.

    Creates the client on first call using settings from the environment.
    """
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = RedisClient(url=settings.redis_url)
    return _redis_client

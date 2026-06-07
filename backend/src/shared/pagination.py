"""Pagination schemas and helpers for API responses.

Provides standard parameters and a generic response wrapper for paginated queries.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for pagination."""

    page: int = Field(default=1, ge=1, description="Page number, 1-indexed.")
    page_size: int = Field(
        default=20, ge=1, le=100, description="Number of items per page."
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic envelope for paginated results."""

    items: Sequence[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate(
    items: Sequence[T],
    total: int,
    params: PaginationParams,
) -> PaginatedResponse[T]:
    """Helper to construct a PaginatedResponse.

    Args:
        items: List of serialized items for the current page.
        total: Total number of matching items in the database.
        params: The pagination parameters applied.

    Returns:
        A PaginatedResponse instance.
    """
    total_pages = math.ceil(total / params.page_size) if total > 0 else 0
    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )

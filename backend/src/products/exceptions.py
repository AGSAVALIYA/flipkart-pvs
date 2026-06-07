"""Re-exports product-related domain exceptions.
"""

from __future__ import annotations

from src.domain.exceptions import (
    DuplicateWIDError,
    IngestionError,
    ProductNotFoundError,
)

__all__ = [
    "DuplicateWIDError",
    "IngestionError",
    "ProductNotFoundError",
]

"""Domain interface exports.

Re-exports all protocol definitions so consumers can import from
``src.domain.interfaces`` directly.
"""

from __future__ import annotations

from src.domain.interfaces.ai_provider import IAIProvider, LabelExtractionResult
from src.domain.interfaces.cache import ICacheProvider
from src.domain.interfaces.repositories import (
    IIngestionJobRepository,
    IProductRepository,
    IUserRepository,
    IValidationLogRepository,
)
from src.domain.interfaces.storage import IFileStorage

__all__ = [
    "IAIProvider",
    "ICacheProvider",
    "IFileStorage",
    "IIngestionJobRepository",
    "IProductRepository",
    "IUserRepository",
    "IValidationLogRepository",
    "LabelExtractionResult",
]

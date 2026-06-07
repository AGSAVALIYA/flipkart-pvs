"""Validation-specific domain exceptions.
"""

from __future__ import annotations

from src.domain.exceptions import DomainError, ErrorCode


class ValidationDomainError(DomainError):
    """Raised when validation operations fail business logic checks."""

    def __init__(self, message: str) -> None:
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=422,
        )

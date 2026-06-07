"""Domain exception hierarchy for the Flipkart Product Verification System.

Follows the "let it crash" philosophy: exceptions are raised in domain/service
layers and caught by global handlers at the app boundary. No try/except in routers.
"""

from __future__ import annotations

from enum import StrEnum


class ErrorCode(StrEnum):
    """Machine-readable error codes for all domain errors."""

    PRODUCT_NOT_FOUND = "product_not_found"
    DUPLICATE_WID = "duplicate_wid"
    INGESTION_ERROR = "ingestion_error"
    VALIDATION_ERROR = "validation_error"
    AUTHENTICATION_ERROR = "authentication_error"
    AUTHORIZATION_ERROR = "authorization_error"
    AI_PROVIDER_ERROR = "ai_provider_error"
    RATE_LIMITED = "rate_limited"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    EXTERNAL_SERVICE_ERROR = "external_service_error"


class DomainError(Exception):
    """Base exception for all domain errors.

    Attributes:
        code: Machine-readable error code from ``ErrorCode``.
        message: Human-readable error description.
        status_code: Corresponding HTTP status code for the global handler.
    """

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 400,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ProductNotFoundError(DomainError):
    """Raised when a product lookup yields no results."""

    def __init__(self, identifier: str) -> None:
        super().__init__(
            code=ErrorCode.PRODUCT_NOT_FOUND,
            message=f"Product not found: {identifier}",
            status_code=404,
        )


class DuplicateWIDError(DomainError):
    """Raised when a WID already exists in the database."""

    def __init__(self, wid: str) -> None:
        super().__init__(
            code=ErrorCode.DUPLICATE_WID,
            message=f"Duplicate WID: {wid}",
            status_code=409,
        )


class IngestionError(DomainError):
    """Raised when bulk CSV ingestion fails."""

    def __init__(self, message: str) -> None:
        super().__init__(
            code=ErrorCode.INGESTION_ERROR,
            message=message,
            status_code=400,
        )


class ValidationError(DomainError):
    """Domain-level validation error (not Pydantic's ``ValidationError``)."""

    def __init__(self, message: str) -> None:
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=422,
        )


class AuthenticationError(DomainError):
    """Raised when authentication credentials are invalid or missing."""

    def __init__(self, message: str = "Invalid authentication credentials") -> None:
        super().__init__(
            code=ErrorCode.AUTHENTICATION_ERROR,
            message=message,
            status_code=401,
        )


class AuthorizationError(DomainError):
    """Raised when the authenticated user lacks required permissions."""

    def __init__(self, message: str = "Insufficient permissions") -> None:
        super().__init__(
            code=ErrorCode.AUTHORIZATION_ERROR,
            message=message,
            status_code=403,
        )


class AIProviderError(DomainError):
    """Raised when the AI vision provider fails or returns an unusable result."""

    def __init__(self, message: str, original: Exception | None = None) -> None:
        super().__init__(
            code=ErrorCode.AI_PROVIDER_ERROR,
            message=message,
            status_code=502,
        )
        if original is not None:
            self.__cause__ = original

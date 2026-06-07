"""Re-exports authentication-related domain exceptions.
"""

from __future__ import annotations

from src.domain.exceptions import AuthenticationError, AuthorizationError

__all__ = [
    "AuthenticationError",
    "AuthorizationError",
]

"""FastAPI dependencies for user authentication and authorization checks.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from src.app.config import Settings, get_settings
from src.auth.exceptions import AuthenticationError, AuthorizationError
from src.auth.permissions import Permission, Role, has_permission
from src.auth.schemas import TokenPayload

logger = logging.getLogger(__name__)

# Configures OAuth2 flow pointing to our login router endpoint
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,  # We raise custom DomainError status 401 instead of default Starlette error
)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
) -> TokenPayload:
    """Validate JWT access token and return the parsed payload.

    Args:
        token: The OAuth2 bearer token.
        settings: Application settings.

    Returns:
        The token payload.

    Raises:
        AuthenticationError: If token is invalid or missing.
    """
    if not token:
        raise AuthenticationError("Not authenticated. Please log in.")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        token_type = payload.get("type")
        if token_type != "access":
            raise AuthenticationError("Invalid token type. Access token expected.")

        user_id = payload.get("sub")
        username = payload.get("username")
        role = payload.get("role")

        if not user_id or not username or not role:
            raise AuthenticationError("Token payload is incomplete.")

        return TokenPayload(
            sub=user_id,
            username=username,
            role=Role(role),
            exp=payload["exp"],
            iat=payload["iat"],
            type=token_type,
        )

    except (JWTError, ValueError) as e:
        logger.warning("JWT validation failed: %s", e)
        raise AuthenticationError("Invalid or expired session token.") from e


def require_permissions(*permissions: Permission) -> Callable[[TokenPayload], TokenPayload]:
    """Dependency factory enforcing that the current user has ALL specified permissions.

    Args:
        *permissions: The granular permissions required for the route.

    Returns:
        A dependency callable.
    """

    def dependency(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        for perm in permissions:
            if not has_permission(current_user.role, perm):
                raise AuthorizationError(
                    f"Action forbidden. Requires permission: {perm}"
                )
        return current_user

    return dependency


def require_any_permission(*permissions: Permission) -> Callable[[TokenPayload], TokenPayload]:
    """Dependency factory enforcing that the current user has ANY of the specified permissions.

    Args:
        *permissions: Granular permissions of which at least one is required.

    Returns:
        A dependency callable.
    """

    def dependency(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        has_any = any(has_permission(current_user.role, perm) for perm in permissions)
        if not has_any:
            perms_str = ", ".join(permissions)
            raise AuthorizationError(
                f"Action forbidden. Requires one of permissions: {perms_str}"
            )
        return current_user

    return dependency

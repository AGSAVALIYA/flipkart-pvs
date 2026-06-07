"""FastAPI router for authentication and user management.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from src.app.dependencies import get_auth_service
from src.auth.dependencies import get_current_user, require_permissions
from src.auth.permissions import ROLE_PERMISSIONS, Permission, Role
from src.auth.schemas import (
    PermissionSet,
    TokenPayload,
    TokenResponse,
    UserCreate,
    UserResponse,
)
from src.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and return access/refresh tokens.",
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """OAuth2 password flow login."""
    return await auth_service.login(form_data.username, form_data.password)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a refresh token for a new set of tokens.",
)
async def refresh(
    refresh_token: str,
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Exchange refresh token."""
    return await auth_service.refresh_token(refresh_token)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new system user.",
    dependencies=[Depends(require_permissions(Permission.USERS_CREATE))],
)
async def register(
    user_create: UserCreate,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Register user. Requires USERS_CREATE permission."""
    creator_id = uuid.UUID(current_user.sub)
    return await auth_service.register(user_create, created_by=creator_id)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user details.",
)
async def get_me(
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Return logged-in user profile details."""
    user_id = uuid.UUID(current_user.sub)
    return await auth_service.get_user(user_id)


@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="List all active users.",
    dependencies=[Depends(require_permissions(Permission.USERS_VIEW))],
)
async def list_users(
    auth_service: AuthService = Depends(get_auth_service),
) -> list[UserResponse]:
    """Retrieve list of active users. Requires USERS_VIEW permission."""
    return await auth_service.list_users()


@router.patch(
    "/users/{user_id}/role",
    response_model=UserResponse,
    summary="Update a user's role designation.",
    dependencies=[Depends(require_permissions(Permission.USERS_UPDATE))],
)
async def update_role(
    user_id: uuid.UUID,
    role: Role,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Change a user's system role. Requires USERS_UPDATE permission."""
    updater_id = uuid.UUID(current_user.sub)
    return await auth_service.update_user_role(user_id, role, updated_by=updater_id)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a user account.",
    dependencies=[Depends(require_permissions(Permission.USERS_DELETE))],
)
async def delete_user(
    user_id: uuid.UUID,
    auth_service: AuthService = Depends(get_auth_service),
) -> None:
    """Soft-deactivate a user. Requires USERS_DELETE permission."""
    await auth_service.deactivate_user(user_id)


@router.get(
    "/permissions",
    response_model=list[PermissionSet],
    summary="Get roles and their assigned permissions.",
    dependencies=[Depends(require_permissions(Permission.USERS_VIEW))],
)
async def get_role_permissions_metadata() -> list[PermissionSet]:
    """Return map of all roles and permissions for UI rendering."""
    return [
        PermissionSet(role=role, permissions=[p.value for p in perms])
        for role, perms in ROLE_PERMISSIONS.items()
    ]

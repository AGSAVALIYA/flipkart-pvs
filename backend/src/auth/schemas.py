"""Pydantic schemas for user registration, authentication, and responses.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.auth.permissions import Role


class UserCreate(BaseModel):
    """Payload to register a new user."""

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Alphanumeric and underscores only.",
    )
    password: str = Field(..., min_length=8, description="Minimum 8 characters.")
    role: Role = Field(default=Role.OPERATOR, description="System permission level.")


class UserResponse(BaseModel):
    """Serialized user details returned to clients."""

    id: uuid.UUID
    username: str
    role: Role
    is_active: bool
    created_at: datetime
    created_by: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Payload to log in."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Authentication tokens returned on successful login or refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseModel):
    """Decoded contents of an access or refresh JWT."""

    sub: str  # User ID as string
    username: str
    role: Role
    exp: int
    iat: int
    type: str  # "access" or "refresh"


class PermissionSet(BaseModel):
    """Details of a role and its corresponding granular permissions."""

    role: Role
    permissions: list[str]

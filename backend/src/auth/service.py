"""AuthService handles registration, login, JWT token generation, and user lifecycle.
"""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta

import bcrypt
from jose import JWTError, jwt

from src.app.config import Settings
from src.auth.exceptions import AuthenticationError
from src.auth.permissions import Role
from src.auth.schemas import TokenResponse, UserCreate, UserResponse
from src.domain.exceptions import DomainError, ErrorCode
from src.domain.interfaces.repositories import IUserRepository
from src.shared.datetime_utils import utc_now

logger = logging.getLogger(__name__)


class PasswordHasher:
    """Helper class to hash and verify passwords using bcrypt directly."""

    @staticmethod
    def hash(password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        """Verify a password using bcrypt."""
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False


pwd_context = PasswordHasher()


class AuthService:
    """Business logic for user registration, sessions, and roles."""

    def __init__(self, user_repository: IUserRepository, settings: Settings) -> None:
        self._repo = user_repository
        self._settings = settings

    def hash_password(self, password: str) -> str:
        """Hash a plain text password."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hashed value."""
        return pwd_context.verify(plain_password, hashed_password)

    def create_token(
        self,
        user_id: uuid.UUID,
        username: str,
        role: Role,
        token_type: str = "access",
    ) -> tuple[str, int]:
        """Generate a signed JWT for the user.

        Args:
            user_id: The user's ID.
            username: The username.
            role: The role enum.
            token_type: Either "access" or "refresh".

        Returns:
            A tuple of (signed_jwt_string, expires_in_seconds).
        """
        now = utc_now()
        if token_type == "access":
            expires_delta = timedelta(minutes=self._settings.access_token_expire_minutes)
        else:
            # Refresh token expires in refresh_token_expire_minutes (loaded from config)
            # Default to 7 days if not defined
            expire_mins = getattr(self._settings, "refresh_token_expire_minutes", 10080)
            expires_delta = timedelta(minutes=expire_mins)

        expire = now + expires_delta
        expires_in = int(expires_delta.total_seconds())

        payload = {
            "sub": str(user_id),
            "username": username,
            "role": role,
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "type": token_type,
        }

        token = jwt.encode(
            payload,
            self._settings.jwt_secret_key,
            algorithm=self._settings.jwt_algorithm,
        )
        return token, expires_in

    async def register(
        self,
        user_create: UserCreate,
        created_by: uuid.UUID | None = None,
    ) -> UserResponse:
        """Register a new user.

        Args:
            user_create: Schema containing registration details.
            created_by: ID of the admin creator.

        Returns:
            The registered User details.

        Raises:
            DomainError: If username is already taken.
        """
        existing = await self._repo.get_by_username(user_create.username)
        if existing:
            raise DomainError(
                code=ErrorCode.CONFLICT,
                message=f"Username '{user_create.username}' is already registered.",
                status_code=409,
            )

        hashed_pw = self.hash_password(user_create.password)
        record = {
            "username": user_create.username,
            "hashed_password": hashed_pw,
            "role": user_create.role.value,
            "is_active": True,
            "created_by": created_by,
        }
        user = await self._repo.create(record)
        return UserResponse.model_validate(user)

    async def login(self, username: str, password: str) -> TokenResponse:
        """Authenticate a user and return session tokens.

        Args:
            username: User's login name.
            password: User's cleartext password.

        Returns:
            TokenResponse containing token details and user info.

        Raises:
            AuthenticationError: On bad credentials.
        """
        user = await self._repo.get_by_username(username)
        if not user or not self.verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid username or password.")

        role_enum = Role(user.role)
        access_token, expires_in = self.create_token(
            user.id, user.username, role_enum, "access"
        )
        refresh_token, _ = self.create_token(
            user.id, user.username, role_enum, "refresh"
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
        )

    async def refresh_token(self, refresh_token_str: str) -> TokenResponse:
        """Exchange a valid refresh token for a new access/refresh token pair.

        Args:
            refresh_token_str: Decryptable refresh token.

        Returns:
            New TokenResponse payload.

        Raises:
            AuthenticationError: On invalid token.
        """
        try:
            payload = jwt.decode(
                refresh_token_str,
                self._settings.jwt_secret_key,
                algorithms=[self._settings.jwt_algorithm],
            )
            token_type = payload.get("type")
            if token_type != "refresh":
                raise AuthenticationError("Not a valid refresh token.")

            user_id_str = payload.get("sub")
            if not user_id_str:
                raise AuthenticationError("Invalid token payload.")
            user_id = uuid.UUID(user_id_str)
        except (JWTError, ValueError) as e:
            raise AuthenticationError("Invalid or expired refresh token.") from e

        user = await self._repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User is no longer active.")

        role_enum = Role(user.role)
        access_token, expires_in = self.create_token(
            user.id, user.username, role_enum, "access"
        )
        new_refresh_token, _ = self.create_token(
            user.id, user.username, role_enum, "refresh"
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
        )

    async def get_user(self, user_id: uuid.UUID) -> UserResponse:
        """Retrieve details for a specific user ID."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found.")
        return UserResponse.model_validate(user)

    async def list_users(self) -> list[UserResponse]:
        """List all active users."""
        users = await self._repo.list_all()
        return [UserResponse.model_validate(u) for u in users]

    async def update_user_role(
        self,
        user_id: uuid.UUID,
        new_role: Role,
        updated_by: uuid.UUID | None = None,
    ) -> UserResponse:
        """Update a user's role assignment."""
        updates = {"role": new_role.value}
        user = await self._repo.update(user_id, updates)
        if not user:
            raise AuthenticationError("User not found.")
        return UserResponse.model_validate(user)

    async def deactivate_user(self, user_id: uuid.UUID) -> None:
        """Disable a user account (soft delete)."""
        deleted = await self._repo.delete(user_id)
        if not deleted:
            raise AuthenticationError("User not found.")

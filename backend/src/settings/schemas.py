"""Schemas for admin-configurable AI processing settings."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from src.auth.permissions import Role


class AIProcessingMode(StrEnum):
    """Available AI processing policies per role."""

    AUTOMATIC = "automatic"
    MANUAL = "manual"
    NOT_ALLOWED = "not_allowed"


def build_default_role_modes() -> dict[str, AIProcessingMode]:
    """Return the default AI mode for every role."""
    return {
        Role.SUPER_ADMIN.value: AIProcessingMode.AUTOMATIC,
        Role.ADMIN.value: AIProcessingMode.AUTOMATIC,
        Role.OPERATOR.value: AIProcessingMode.AUTOMATIC,
        Role.VIEWER.value: AIProcessingMode.NOT_ALLOWED,
        Role.QA_MANAGER.value: AIProcessingMode.NOT_ALLOWED,
    }



class AIProcessingSettingsResponse(BaseModel):
    """Serialized AI role policy returned to the admin UI."""

    provider_name: str | None = None
    provider_available: bool = False
    role_modes: dict[str, AIProcessingMode]
    updated_at: datetime | None = None


class AIProcessingSettingsUpdate(BaseModel):
    """Admin payload used to update role-based AI modes."""

    role_modes: dict[str, AIProcessingMode]

"""FastAPI router for admin-managed application settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from src.app.dependencies import get_settings_service
from src.auth.dependencies import require_permissions
from src.auth.permissions import Permission
from src.settings.schemas import (
    AIProcessingSettingsResponse,
    AIProcessingSettingsUpdate,
)
from src.settings.service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "/ai-processing",
    response_model=AIProcessingSettingsResponse,
    summary="Get the role-based AI processing policy.",
    dependencies=[Depends(require_permissions(Permission.USERS_VIEW))],
)
async def get_ai_processing_settings(
    settings_service: SettingsService = Depends(get_settings_service),
) -> AIProcessingSettingsResponse:
    """Return AI role policy and provider availability for the admin UI."""
    return await settings_service.get_ai_processing_settings()


@router.put(
    "/ai-processing",
    response_model=AIProcessingSettingsResponse,
    summary="Update the role-based AI processing policy.",
    dependencies=[Depends(require_permissions(Permission.USERS_UPDATE))],
)
async def update_ai_processing_settings(
    payload: AIProcessingSettingsUpdate,
    settings_service: SettingsService = Depends(get_settings_service),
) -> AIProcessingSettingsResponse:
    """Persist the AI role policy configured by an admin."""
    return await settings_service.update_ai_processing_settings(payload)

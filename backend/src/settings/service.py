"""Business logic for persisted application settings."""

from __future__ import annotations

from src.app.config import Settings
from src.auth.permissions import Role
from src.settings.repository import SystemSettingRepository
from src.settings.schemas import (
    AIProcessingMode,
    AIProcessingSettingsResponse,
    AIProcessingSettingsUpdate,
    build_default_role_modes,
)

_AI_PROCESSING_SETTINGS_KEY = "ai_processing_policy"


class SettingsService:
    """Coordinates retrieval and updates for admin-managed settings."""

    def __init__(
        self,
        settings_repository: SystemSettingRepository,
        settings: Settings,
    ) -> None:
        self._repo = settings_repository
        self._settings = settings

    async def get_ai_processing_settings(self) -> AIProcessingSettingsResponse:
        """Return the persisted AI role policy plus provider availability."""
        record = await self._repo.get(_AI_PROCESSING_SETTINGS_KEY)
        role_modes = self._normalize_role_modes(record.value if record else None)
        return AIProcessingSettingsResponse(
            provider_name=self._settings.ai_provider,
            provider_available=self.provider_available,
            role_modes=role_modes,
            updated_at=record.updated_at if record else None,
        )

    async def update_ai_processing_settings(
        self,
        payload: AIProcessingSettingsUpdate,
    ) -> AIProcessingSettingsResponse:
        """Persist a new AI role policy and return the updated state."""
        role_modes = self._normalize_role_modes(payload.role_modes)
        record = await self._repo.upsert(
            _AI_PROCESSING_SETTINGS_KEY,
            {role: mode.value for role, mode in role_modes.items()},
        )
        return AIProcessingSettingsResponse(
            provider_name=self._settings.ai_provider,
            provider_available=self.provider_available,
            role_modes=role_modes,
            updated_at=record.updated_at,
        )

    async def get_mode_for_role(self, role: Role | str) -> AIProcessingMode:
        """Resolve the configured AI mode for a single role."""
        role_key = role.value if isinstance(role, Role) else str(role)
        settings = await self.get_ai_processing_settings()
        defaults = build_default_role_modes()
        return settings.role_modes.get(role_key, defaults[role_key])

    @property
    def provider_available(self) -> bool:
        """Return whether the configured AI provider can currently be used."""
        return bool(self._settings.enable_vision_ai and self._settings.ai_provider_api_key)

    @staticmethod
    def _normalize_role_modes(
        raw_role_modes: dict[str, str] | dict[str, AIProcessingMode] | None,
    ) -> dict[str, AIProcessingMode]:
        """Merge persisted settings onto the default role policy."""
        defaults = build_default_role_modes()
        if not raw_role_modes:
            return defaults

        normalized = defaults.copy()
        for role_key, raw_mode in raw_role_modes.items():
            if role_key not in normalized:
                continue

            try:
                normalized[role_key] = AIProcessingMode(str(raw_mode))
            except ValueError:
                continue

        return normalized

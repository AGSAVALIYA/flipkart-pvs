"""Factory for instantiating the configured AI provider implementation."""

from __future__ import annotations

import logging

from src.app.config import Settings
from src.domain.interfaces.ai_provider import IAIProvider
from src.infrastructure.ai.gemini import GeminiVisionProvider

logger = logging.getLogger(__name__)


class AIProviderFactory:
    """Build an AI provider from runtime configuration."""

    def create(self, settings: Settings) -> IAIProvider | None:
        """Return the configured AI provider, or ``None`` when unavailable."""
        if not settings.enable_vision_ai or not settings.ai_provider_api_key:
            return None

        provider_name = settings.ai_provider.strip().lower()
        if provider_name == "gemini":
            return GeminiVisionProvider(
                api_key=settings.ai_provider_api_key,
                timeout=settings.ai_timeout_seconds,
            )

        logger.warning("Unsupported AI provider configured: %s", settings.ai_provider)
        return None

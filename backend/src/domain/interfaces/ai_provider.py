"""AI vision provider protocol definition.

Abstracts the AI/ML provider so the domain layer doesn't depend on any
specific vision API (Gemini, GPT-4V, etc.).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class LabelExtractionResult:
    """Structured result of an AI label-text extraction.

    Attributes:
        ean: Extracted EAN/barcode, or ``None`` if not found.
        manufacturing_date: Manufacturing date string, or ``None``.
        expiry_date: Expiry date string, or ``None``.
        confidence: Model confidence score in the range ``[0.0, 1.0]``.
        raw_text: Full raw text extracted from the label image.
    """

    ean: str | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    confidence: float = 0.0
    raw_text: str = ""


class IAIProvider(Protocol):
    """Contract for AI-powered label extraction."""

    async def extract_label_text(self, image_path: str) -> LabelExtractionResult:
        """Extract structured label information from a product image.

        Args:
            image_path: Absolute or relative path to the product label image.

        Returns:
            ``LabelExtractionResult`` with parsed fields and confidence.

        Raises:
            AIProviderError: If the AI provider call fails.
        """
        ...

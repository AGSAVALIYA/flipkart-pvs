"""Pydantic schemas for physical verification submissions and responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from src.products.schemas import ProductResponse


class ValidationResponse(BaseModel):
    """Details of a recorded validation check."""

    id: int
    wid: str
    captured_image_url: str
    validation_status: str
    verified_by: str
    verified_at: datetime
    ai_extraction: Any | None = None
    ai_match_result: str | None = None
    ai_processing_mode: str | None = None
    ai_processing_status: str | None = None
    ai_provider_name: str | None = None
    ai_error_message: str | None = None
    ai_processed_at: datetime | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ValidationWithProductResponse(BaseModel):
    """Combined model containing validation results and product reference info."""

    validation: ValidationResponse
    product: ProductResponse


class AIExtractionResult(BaseModel):
    """Structured response detailing cognitive OCR matches."""

    ean: str | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    confidence: float = 0.0
    raw_text: str = ""
    match_status: str | None = None  # MATCH, MISMATCH, INCONCLUSIVE

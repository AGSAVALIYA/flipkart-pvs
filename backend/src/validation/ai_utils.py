"""Shared helpers for AI extraction payloads and cross-validation."""

from __future__ import annotations

from typing import Any

from src.domain.interfaces.ai_provider import LabelExtractionResult
from src.shared.datetime_utils import parse_date


def build_ai_extraction_payload(ai_result: LabelExtractionResult) -> dict[str, Any]:
    """Convert provider output into a JSON-serializable payload."""
    return {
        "ean": ai_result.ean,
        "manufacturing_date": ai_result.manufacturing_date,
        "expiry_date": ai_result.expiry_date,
        "confidence": ai_result.confidence,
        "raw_text": ai_result.raw_text,
    }


def cross_validate_product(product: Any, ai_result: LabelExtractionResult) -> str:
    """Compare extracted AI values against the stored product reference."""
    extracted_ean = ai_result.ean.strip() if ai_result.ean else None
    extracted_mfg = parse_date(ai_result.manufacturing_date)
    extracted_exp = parse_date(ai_result.expiry_date)

    if not extracted_ean and not extracted_mfg and not extracted_exp:
        return "INCONCLUSIVE"

    if extracted_ean and extracted_ean != product.ean.strip():
        return "MISMATCH"
    if extracted_mfg and extracted_mfg != product.manufacturing_date:
        return "MISMATCH"
    if extracted_exp and extracted_exp != product.expiry_date:
        return "MISMATCH"

    return "MATCH"

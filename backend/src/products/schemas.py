"""Pydantic schemas for product lookup and ingestion tasks.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ProductResponse(BaseModel):
    """Details of a verified product reference."""

    wid: str = Field(..., description="Warehouse ID.")
    ean: str = Field(..., description="European Article Number / Barcode.")
    manufacturing_date: date = Field(..., description="Manufacturing date (YYYY-MM-DD).")
    expiry_date: date = Field(..., description="Expiry date (YYYY-MM-DD).")

    model_config = ConfigDict(from_attributes=True)


class ProductLookupResponse(BaseModel):
    """Result of querying a warehouse identifier (WID)."""

    found: bool = True
    product: ProductResponse | None = None


class UploadResponse(BaseModel):
    """Session info returned when a CSV file upload starts."""

    job_id: uuid.UUID
    status: str = "pending"
    message: str = "Ingestion task queued successfully."


class IngestionJobResponse(BaseModel):
    """Detailed record of a background ingestion job."""

    id: uuid.UUID
    filename: str
    status: str
    total_rows: int | None = None
    processed_rows: int = 0
    error_count: int = 0
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_details: Any = Field(default=None, exclude=True)

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def error_message(self) -> str | None:
        """Extract primary error message from error_details list/dictionary."""
        if not self.error_details:
            return None
        if isinstance(self.error_details, list) and len(self.error_details) > 0:
            first_err = self.error_details[0]
            if isinstance(first_err, dict):
                return first_err.get("msg") or first_err.get("message")
        elif isinstance(self.error_details, dict):
            return self.error_details.get("msg") or self.error_details.get("message")
        return None


class IngestionStatusResponse(BaseModel):
    """Live status updates including calculate progress percentage."""

    job: IngestionJobResponse
    progress_percentage: float = 0.0
    current_rows_per_second: float | None = None
    elapsed_seconds: float | None = None
    estimated_remaining_seconds: float | None = None
    estimated_completion_at: datetime | None = None
    errors: list[dict[str, Any]] = Field(default_factory=list)
